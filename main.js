// 导入所需的Electron模块和Node.js内置模块
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { autoUpdater } = require('electron-updater') // 用于应用程序自动更新
const os = require('os')      // 操作系统相关功能
const path = require('path')  // 路径处理
const fs = require('fs')      // 文件系统操作
const FileInfo = require('./FileInfo')  // 导入文件信息类

// 用于在内存中存储已处理的文件列表
let fileList = []

/**
 * 处理接收到的文件信息
 * @param {Object} fileInfo - 包含文件信息的对象
 * @param {string} fileInfo.name - 文件名
 * @param {string} fileInfo.path - 文件路径
 * @param {string} fileInfo.content - 文件内容
 * @returns {Object|null} 处理后的文件信息对象，失败则返回null
 */
async function handleFile(fileInfo) {
    // 验证文件信息的有效性
    if (!fileInfo || !fileInfo.name) {
        console.error('文件信息无效')
        return null
    }

    try {
        // 创建 FileInfo 实例
        const processedFile = FileInfo.create(fileInfo)
        
        // 记录文件处理日志
        console.log(`接收到文件: ${processedFile.name}`)
        console.log(`文件内容: ${processedFile.content.substring(0, 100)}...`) // 只打印前100个字符
        
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
ipcMain.on('file:dropped', async (event, fileInfo) => {
    // 处理拖放的文件
    const processedFile = await handleFile(fileInfo)
    if (processedFile) {
        fileList.push(processedFile)
        console.log('当前文件列表:', fileList.map(f => f.name).join(', '))
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
ipcMain.on('file:removed', (event, fileInfo) => {
    // 从文件列表中移除指定文件
    fileList = fileList.filter(f => f.fileId !== fileInfo.fileId)
    console.log('=== 文件删除信息 ===')
    console.log(`已删除文件: ${fileInfo.name} (ID: ${fileInfo.fileId})`)
    console.log('=== 当前文件列表 ===')
    if (fileList.length === 0) {
        console.log('当前无文件')
    } else {
        fileList.forEach(file => {
            console.log(`- ${file.name} (ID: ${file.fileId})`)
        })
    }
    console.log('==================')
})
