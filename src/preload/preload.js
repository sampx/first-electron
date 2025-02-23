const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    getSystemInfo: () => ipcRenderer.invoke('system:info'),
    handleFileSelected: (fileinfo) => ipcRenderer.send('file:selected', fileinfo),
    openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
    readFile: (path) => ipcRenderer.invoke('file:read', path),
    removeFile: (fileInfo) => ipcRenderer.send('file:removed', fileInfo)
})
