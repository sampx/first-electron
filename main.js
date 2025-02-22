const { app, BrowserWindow, ipcMain } = require('electron')
const { autoUpdater } = require('electron-updater')
const os = require('os')
const path = require('path')

// 自动更新检查
autoUpdater.checkForUpdatesAndNotify()

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('index.html')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('system:info', () => ({
    platform: process.platform,
    cpu: os.loadavg()[0].toFixed(1),
    mem: process.memoryUsage().rss
}))

ipcMain.on('file:dropped', (event, path) => {
    console.log('File dropped:', path)
})
