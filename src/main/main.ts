import { app, BrowserWindow, ipcMain, dialog, Notification } from "electron";
import { autoUpdater } from "electron-updater";
import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from "@tomjs/electron-devtools-installer";
import log from "electron-log";
import os from "os";
import path from "path";
import fs from "fs";
import mime from "mime-types";

import FileInfo from "./FileInfo";
import { FileInfoType } from "../shared/types";
import { DatabaseManager } from "./DatabaseManager";
import { AppContext } from "./AppContext";

const appContext = AppContext.getInstance();
const dbManager = DatabaseManager.getInstance();

// 针对 macOS 平台做特殊处理
if (process.platform === 'darwin') {
  // 开启允许局域网访问的命令行开关，确保在 macOS 上可以正常访问本地网络资源
  app.commandLine.appendSwitch('enable-local-network-access')
}

// 当Electron完成初始化时创建主窗口
app.whenReady().then(() => {
  installExtension(REACT_DEVELOPER_TOOLS)
    .then((extension) => log.debug(`已添加扩展：${extension.name}`))
    .catch((err) => log.debug("发生错误：", err));
  // 创建主窗口实例
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false, // 禁用Node.js集成，提高安全性
      contextIsolation: true, // 启用上下文隔离
      preload: path.join(__dirname, "../preload/index.js"), // 指定预加载脚本
    },
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    // setTimeout(() => {
    //   mainWindow.webContents.openDevTools();
    // }, 2000);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  // 处理文件选择事件
  ipcMain.handle(
    "file:selected",
    async (_event, fileInfo: FileInfoType): Promise<boolean> => {
      const file = await handleFile(fileInfo);
      if (!file) {
        log.error("处理文件失败");
        return false;
      }
      return true;
    },
  );

  // 处理文件删除事件
  ipcMain.handle("file:removed", async (_event, fileInfo): Promise<boolean> => {
    try {
      // 从数据库获取文件信息
      const fileToDelete = dbManager.getFile(fileInfo.fileId);
      if (!fileToDelete) {
        log.warn(`要删除的文件不存在: ${fileInfo.fileId}`);
        return true;
      }

      if (fileToDelete.server_path) {
        // 删除服务器上的文件
        await fs.promises.unlink(fileToDelete.server_path);
        log.info(`文件已删除: ${fileToDelete.server_path}`);
      }

      // 从数据库中删除文件记录
      try {
        dbManager.deleteFile(fileInfo.fileId);
        log.info(`文件记录已从数据库删除: ${fileInfo.fileId}`);
      } catch (error) {
        log.error(`从数据库删除文件记录失败 ${fileInfo.fileId}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      log.error("删除文件失败:", error);
      return false;
    }
  });

  ipcMain.handle("dialog:openFile", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile", "multiSelections"],
    });
    return result.filePaths;
  });

  // 处理系统通知事件
  ipcMain.handle("notification:show", async (_event, options) => {
    const notification = new Notification({
      title: options.title,
      body: options.body,
      // icon: options.type === 'error' ? path.join(__dirname, '../renderer/assets/error.png') :
      //       options.type === 'warning' ? path.join(__dirname, '../renderer/assets/warning.png') :
      //       options.type === 'success' ? path.join(__dirname, '../renderer/assets/success.png') :
      //       path.join(__dirname, '../renderer/assets/info.png')
    });
    notification.show();
  });

  /**
   * 读取文件内容并转换为 base64 格式
   * @param {string} filePath - 文件路径
   * @returns {Promise<string>} base64 编码的文件内容
   */
  async function readFileToBase64(filePath: string): Promise<string> {
    try {
      if (!filePath) {
        throw new Error("文件路径不能为空");
      }
      if (!fs.existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }
      const stats = await fs.promises.stat(filePath);
      if (!stats.isFile()) {
        throw new Error(`不是有效的文件: ${filePath}`);
      }

      log.info(`开始读取文件: ${filePath}`);
      const fileHandle = await fs.promises.open(filePath, "r");
      const chunkSize = 32768; // 32KB chunks
      const chunks: Buffer[] = [];
      let bytesRead = 0;

      try {
        while (true) {
          const chunk = Buffer.alloc(chunkSize);
          const result = await fileHandle.read(chunk, 0, chunkSize, bytesRead);
          if (result.bytesRead === 0) break;
          chunks.push(chunk.slice(0, result.bytesRead));
          bytesRead += result.bytesRead;
        }
      } finally {
        await fileHandle.close();
      }

      const content = Buffer.concat(chunks);
      const base64Content = content.toString("base64");
      log.info(`文件读取成功: ${filePath}, 大小: ${content.length} 字节`);
      return base64Content;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      log.error(
        `读取文件失败: ${filePath}\n错误详情: ${errorMessage}\n${error instanceof Error ? error.stack : ""}`,
      );
      throw error instanceof Error
        ? error
        : new Error(`读取文件失败: ${errorMessage}`);
    }
  }

  // 处理文件读取请求
  ipcMain.handle("file:read", async (_event, filePath) => {
    try {
      return await readFileToBase64(filePath);
    } catch (error) {
      throw error;
    }
  });

  // 处理获取文件列表请求
  ipcMain.handle("file:getAll", async () => {
    try {
      // 从数据库获取所有文件记录
      const fileRecords = dbManager.getAllFiles();

      // 转换为FileInfo对象并加载文件内容
      const fileInfoPromises = fileRecords.map(async (record) => {
        if (!record.server_path) {
          log.warn(`文件记录缺少服务器路径: ${record.fileId}`);
          return null;
        }

        try {
          // 确认文件存在
          if (!fs.existsSync(record.server_path)) {
            log.warn(`文件不存在于服务器路径: ${record.server_path}`);
            return null;
          }

          // 读取文件内容
          const base64Content = await readFileToBase64(record.server_path);

          // 创建FileInfo对象
          const fileInfo = FileInfo.create({
            fileId: record.fileId,
            name: record.name,
            client_path: record.client_path,
            content: base64Content,
          });

          fileInfo.server_path = record.server_path;
          fileInfo.mimeType =
            record.mimeType ||
            mime.lookup(record.server_path) ||
            "application/octet-stream";

          return fileInfo;
        } catch (error) {
          log.error(`处理文件时出错 ${record.fileId}:`, error);
          return null;
        }
      });

      const loadedFiles = await Promise.all(fileInfoPromises);
      return loadedFiles.filter((file) => file !== null);
    } catch (error) {
      log.error("加载文件列表失败:", error);
      return [];
    }
  });

  // 处理系统信息请求
  ipcMain.handle("system:info", () => {
    return {
      platform: os.platform(),
      cpu: os.loadavg()[0],
      mem: os.totalmem() - os.freemem(),
    };
  });
});

app.on("before-quit", () => {
  log.info("应用即将退出，关闭数据库连接");
  dbManager.close();
});

// 当所有窗口都被关闭时退出应用
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// 当应用被激活时，如果没有窗口则创建一个新窗口
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    app.whenReady().then(() => {
      const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, "../preload/preload.js"),
        },
      });
      win.loadFile(path.join(__dirname, "../renderer/index.html"));
    });
  }
});

/**
 * 打印文件列表和内容的详细信息
 */
function logFiles(): void {
  log.info("=== 当前文件列表 ===");
  const fileRecords = dbManager.getAllFiles();

  if (fileRecords.length === 0) {
    log.info("暂无文件");
    return;
  }

  fileRecords.forEach((file, index) => {
    log.info(`\n[${index + 1}] 文件信息:`);
    log.info(`  - 文件ID: ${file.fileId}`);
    log.info(`  - 文件名: ${file.name}`);
    log.info(`  - MIME类型: ${file.mimeType || "未知"}`);
    log.info(`  - 客户端路径: ${file.client_path || "无"}`);
    log.info(`  - 服务器路径: ${file.server_path || "无"}`);
    log.info(`  - 创建时间: ${file.created_at}`);
    log.info(`  - 更新时间: ${file.updated_at}`);
  });
  log.info("\n=== 文件列表结束 ===");
}

/**
 * 验证文件信息的有效性
 * @param {Partial<FileInfo>} fileInfo - 文件信息对象
 * @returns {boolean} 是否有效
 */
function validateFileInfo(fileInfo: Partial<FileInfo>): boolean {
  if (!fileInfo || !fileInfo.fileId || !fileInfo.name) {
    log.error("文件信息无效");
    return false;
  }
  if (!fileInfo.content) {
    log.error("缺失文件内容");
    return false;
  }
  return true;
}

/**
 * 处理拖放的文件
 * @param {FileInfoType} fileInfo - 拖放文件的信息
 * @returns {Promise<FileInfo|null>} 处理后的文件信息对象
 */
async function handleFile(fileInfo: FileInfoType): Promise<FileInfo | null> {
  if (!validateFileInfo(fileInfo)) return null;

  try {
    // 创建文件信息对象
    const processedFile = FileInfo.create(fileInfo);
    log.info(`接收到文件: ${processedFile.name}`);

    // 从配置管理器获取文件存储目录
    const filesDir = path.resolve(appContext.getKBFileStoreDir());
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }
    log.info("文件存储目录:", filesDir);

    // 将文件保存到files目录，使用绝对路径
    const targetPath = path.join(filesDir, processedFile.name);
    // 解码 base64 内容为原始数据
    const fileContent = processedFile.content
      ? Buffer.from(processedFile.content, "base64")
      : Buffer.from("");
    await fs.promises.writeFile(targetPath, fileContent);

    // 更新文件路径信息，确保使用绝对路径
    processedFile.server_path = targetPath;
    processedFile.mimeType =
      mime.lookup(targetPath) || "application/octet-stream";

    // 将文件信息存储到数据库
    try {
      dbManager.addFile({
        fileId: processedFile.fileId,
        name: processedFile.name,
        client_path: processedFile.client_path,
        server_path: processedFile.server_path,
        mimeType: processedFile.mimeType,
      });
      log.info(`文件记录已添加到数据库: ${processedFile.fileId}`);
    } catch (error) {
      log.error(`添加文件记录到数据库失败 ${processedFile.fileId}:`, error);
      return null;
    }

    // 打印更新后的文件列表
    logFiles();

    return processedFile;
  } catch (error) {
    console.error(`处理文件 ${fileInfo.name} 时出错:`, error);
    return null;
  }
}


// 检查并通知应用程序更新
autoUpdater.checkForUpdatesAndNotify();
