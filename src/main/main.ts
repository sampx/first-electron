import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import os from 'os';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';

import FileInfo from './FileInfo';
import { FileInfoParams } from '../shared/types';

// 用于在内存中存储已处理的文件列表
let fileList: FileInfo[] = [];

/**
 * 打印文件列表和内容的详细信息
 */
function logFiles(): void {
    log.info('=== 当前文件列表 ===');
    if (fileList.length === 0) {
        log.info('暂无文件');
        return;
    }

    fileList.forEach((file, index) => {
        log.info(`\n[${index + 1}] 文件信息:`);
        log.info(`  - 文件ID: ${file.fileId}`);
        log.info(`  - 文件名: ${file.name}`);
        log.info(`  - MIME类型: ${file.mimeType}`);
        log.info(`  - 服务器路径: ${file.server_path}`);
        
        // 打印文件内容信息
        if (file.content) {
            if (typeof file.content === 'string') {
                log.info(`  - 文件内容: ${file.content.substring(0, 50)}...`);
            } else if (Buffer.isBuffer(file.content)) {
                log.info(`  - 文件大小: ${file.content.length} 字节`);
            } else {
                log.info('  - 文件内容: 格式未知');
            }
        } else {
            log.info('  - 文件内容: 空');
        }
    });
    log.info('\n=== 文件列表结束 ===');
}


/**
 * 验证文件信息的有效性
 * @param {Partial<FileInfo>} fileInfo - 文件信息对象
 * @returns {boolean} 是否有效
 */
function validateFileInfo(fileInfo: Partial<FileInfo>): boolean {
    if (!fileInfo || !fileInfo.name) {
        console.error('文件信息无效');
        return false;
    }
    return true;
}

/**
 * 处理拖放的文件
 * @param {FileInfoParams} fileInfo - 拖放文件的信息
 * @returns {Promise<FileInfo|null>} 处理后的文件信息对象
 */
async function handleFile(fileInfo: FileInfoParams): Promise<FileInfo|null> {
    if (!validateFileInfo(fileInfo)) return null;

    try {
        // 创建文件信息对象
        const processedFile = FileInfo.create(fileInfo);
        log.info(`接收到文件: ${processedFile.name}`);

        // 确保files目录存在
        let filesDir = path.join(__dirname, 'files');
        if (app.isPackaged) {
            filesDir = path.join(app.getPath('userData'), 'files');
        }
        if (!fs.existsSync(filesDir)) {
            fs.mkdirSync(filesDir, { recursive: true });
        }
        log.info('文件存储目录:', filesDir);

        // 将文件保存到files目录
        const targetPath = path.join(filesDir, processedFile.name);
        await fs.promises.writeFile(targetPath, processedFile.content || '');
        
        // 更新文件路径信息
        processedFile.server_path = targetPath;
        processedFile.mimeType = mime.lookup(targetPath) || 'application/octet-stream';
        
        // 将文件添加到文件列表
        fileList.push(processedFile);
        
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

// 当Electron完成初始化时创建主窗口
app.whenReady().then(() => {
    // 创建主窗口实例
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,     // 禁用Node.js集成，提高安全性
            contextIsolation: true,     // 启用上下文隔离
            preload: path.join(__dirname, '../preload/index.js')  // 指定预加载脚本
        }
    });

    win.loadFile(path.join(__dirname, '../renderer/index.html'));

    // 处理文件选择事件
    ipcMain.on('file:selected', async (_event, fileInfo:FileInfoParams) => {
        await handleFile(fileInfo); 
    });

    // 处理文件删除事件
    ipcMain.on('file:removed', async (_event, fileInfo) => {
        try {
            // 查找要删除的文件
            const fileToDelete = fileList.find(file => file.fileId === fileInfo.fileId);
            if (fileToDelete && fileToDelete.server_path) {
                // 删除文件系统中的文件
                await fs.promises.unlink(fileToDelete.server_path);
                log.info(`文件已删除: ${fileToDelete.server_path}`);
            }
            // 从内存列表中移除文件记录
            fileList = fileList.filter(file => file.fileId !== fileInfo.fileId);
            // 打印更新后的文件列表
            logFiles();
        } catch (error) {
            log.error('删除文件失败:', error);
        }
    });

    // 处理打开文件对话框事件
    ipcMain.handle('dialog:openFile', async () => {
        const result = await dialog.showOpenDialog(win, {
            properties: ['openFile', 'multiSelections']
        });
        return result.filePaths;
    });

    // 处理文件读取事件
    ipcMain.handle('file:read', async (_event, filePath) => {
        try {
            if (!filePath) {
                log.error('文件路径为空');
                throw new Error('文件路径不能为空');
            }

            if (!fs.existsSync(filePath)) {
                log.error(`文件不存在: ${filePath}`);
                throw new Error(`文件不存在: ${filePath}`);
            }

            const stats = await fs.promises.stat(filePath);
            if (!stats.isFile()) {
                log.error(`不是有效的文件: ${filePath}`);
                throw new Error(`不是有效的文件: ${filePath}`);
            }

            log.info(`开始读取文件: ${filePath}`);
            const content = await fs.promises.readFile(filePath);
            log.info(`文件读取成功: ${filePath}, 大小: ${content.length} 字节`);
            return content;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            log.error(`读取文件失败: ${filePath}\n错误详情: ${errorMessage}\n${error instanceof Error ? error.stack : ''}`);
            throw error instanceof Error ? error : new Error(`读取文件失败: ${errorMessage}`);
        }
    });

    // 处理系统信息请求
    ipcMain.handle('system:info', () => {
        return {
            platform: os.platform(),
            cpu: os.loadavg()[0],
            mem: os.totalmem() - os.freemem()
        };
    });
});

// 当所有窗口都被关闭时退出应用
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 当应用被激活时，如果没有窗口则创建一个新窗口
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        app.whenReady().then(() => {
            const win = new BrowserWindow({
                width: 800,
                height: 600,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    preload: path.join(__dirname, '../preload/preload.js')
                }
            });
            win.loadFile(path.join(__dirname, '../renderer/index.html'));
        });
    }
})