const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    getSystemInfo: () => ipcRenderer.invoke('system:info'),
    handleFileDrop: (path) => ipcRenderer.send('file:dropped', path)
})
