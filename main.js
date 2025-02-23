// 导入所需的Electron模块和Node.js内置模块
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { autoUpdater } = require('electron-updater') // 用于应用程序自动更新
const log = require('electron-log')
const os = require('os')      // 操作系统相关功能
const path = require('path')  // 路径处理
const fs = require('fs')      // 文件系统操作
const mime = require('mime-types') 

const FileInfo = require('./FileInfo')  // 导入文件信息类


// 用于在内存中存储已处理的文件列表
let fileList = []

/**
 * 记录文件内容信息
 * @param {Object} file - 文件对象
 */
function logFileContent(file) {
    if (file.content) {
        if (typeof file.content === 'string') {
            log.info(`文件内容: ${file.content.substring(0, 100)}...`) // 只打印前100个字符
        } else {
            log.info('文件内容为二进制数据，长度:', file.content.length)
        }
    } else {
        log.info('文件内容为空')
    }
}

/**
 * 验证文件信息的有效性
 * @param {Object} fileInfo - 文件信息对象
 * @returns {boolean} 是否有效
 */
function validateFileInfo(fileInfo) {
    if (!fileInfo || !fileInfo.name) {
        console.error('文件信息无效')
        return false
    }
    return true
}

/**
 * 处理拖放的文件
 * @param {Object} fileInfo - 拖放文件的信息
 * @returns {Object|null} 处理后的文件信息对象
 */
async function handleFile(fileInfo) {
    if (!validateFileInfo(fileInfo)) return null

    try {
        // 创建文件信息对象
        const processedFile = FileInfo.create(fileInfo)
        log.info(`接收到文件: ${processedFile.name}`)
        logFileContent(processedFile)

        // 确保files目录存在
        let filesDir = path.join(__dirname, 'files')
        if (app.isPackaged){ // 使用 app.getPath('userData') 获取正确的数据存储路径
            filesDir = path.join(app.getPath('userData'), 'files')
        }
        if (!fs.existsSync(filesDir)) {
            fs.mkdirSync(filesDir, { recursive: true })
        }        
        log.info('文件存储目录:', filesDir)

        // 将文件保存到files目录
        const targetPath = path.join(filesDir, processedFile.name)
        await fs.promises.writeFile(targetPath, processedFile.content)
        
        // 更新文件路径信息
        processedFile.server_path = targetPath
        processedFile.mimeType = mime.lookup(targetPath) || 'application/octet-stream'
        
        return processedFile
    } catch (error) {
        console.error(`处理文件 ${fileInfo.name} 时出错:`, error)
        return null
    }
}

// 检查并通知应用程序更新
autoUpdater.checkForUpdatesAndNotify()

// 当Electron完成初始化时创建主窗口
app.whenReady().then(() => {
  // 创建主窗口实例
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,     // 禁用Node.js集成，提高安全性
      contextIsolation: true,     // 启用上下文隔离
      preload: path.join(__dirname, 'preload.js')  // 指定预加载脚本
    }
  })

  // 加载应用的HTML文件
  win.loadFile('index.html')
})

// 处理窗口关闭事件
app.on('window-all-closed', () => {
  // 在macOS以外的平台，当所有窗口关闭时退出应用
  if (process.platform !== 'darwin') app.quit()
})

// 处理获取系统信息的IPC请求
ipcMain.handle('system:info', () => ({
    platform: process.platform,           // 操作系统平台
    cpu: os.loadavg()[0].toFixed(1),     // CPU负载（1分钟平均值）
    mem: process.memoryUsage().rss       // 内存使用量（RSS）
}))

// 处理打开文件对话框的IPC请求
ipcMain.handle('dialog:openFile', async () => {
    // 显示文件选择对话框
    const { filePaths } = await dialog.showOpenDialog({
        properties: ['openFile']
    })
    return filePaths[0]  // 返回选中的文件路径
})

// 处理文件拖放的IPC事件
ipcMain.on('file:selected', async (event, fileInfo) => {
    // 处理拖放的文件
    const processedFile = await handleFile(fileInfo)
    if (processedFile) {
        fileList.push(processedFile)
        log.info('当前文件列表:\n');
        fileList.forEach(file => {
            log.info('文件信息:', {
                名称: file.name,
                ID: file.fileId,
                类型: file.mimeType,
                本地路径: file.client_path,
                服务器路径: file.server_path
            });
        });
    }
})

// 处理文件读取的IPC请求
ipcMain.handle('file:read', async (event, filePath) => {
    try {
        const content = await fs.promises.readFile(filePath, 'utf8')
        return content
    } catch (error) {
        console.error('读取文件失败:', error)
        return null
    }
})

// 处理文件删除的IPC事件
ipcMain.on('file:removed', async (event, fileInfo) => {
    // 从文件列表中找到要删除的文件
    const fileToDelete = fileList.find(f => f.fileId === fileInfo.fileId)
        
    if (fileToDelete && fileToDelete.server_path) {
        // 检查文件是否存在
        if (fs.existsSync(fileToDelete.server_path)) {
            // 删除文件
            await fs.promises.unlink(fileToDelete.server_path)
            log.info(`文件已从磁盘删除: ${fileToDelete.server_path}`)
        }
    }
    // 从文件列表中移除指定文件
    fileList = fileList.filter(f => f.fileId !== fileInfo.fileId)
    log.info('=== 文件删除信息 ===')
    log.info(`已删除文件: ${fileInfo.name} (ID: ${fileInfo.fileId})`)
    if (fileList.length === 0) {
        log.info('当前无文件')
    } else {
        log.info('当前文件列表:\n');
        fileList.forEach(file => {
            log.info('文件信息:', {
                名称: file.name,
                ID: file.fileId,
                类型: file.mimeType,
                本地路径: file.client_path,
                服务器路径: file.server_path
            });
        });
    }
    log.info('==================')
})