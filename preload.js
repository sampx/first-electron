const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    getSystemInfo: () => ipcRenderer.invoke('system:info'),
    handleFileDrop: (path_or_fileinfo) => ipcRenderer.send('file:dropped', path_or_fileinfo),
    openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
    readFile: (path) => ipcRenderer.invoke('file:read', path),
    removeFile: (fileInfo) => ipcRenderer.send('file:removed', fileInfo)
})
