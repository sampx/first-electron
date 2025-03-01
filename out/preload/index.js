"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  getSystemInfo: () => electron.ipcRenderer.invoke("system:info"),
  handleFileSelected: (fileinfo) => electron.ipcRenderer.invoke("file:selected", fileinfo),
  openFileDialog: () => electron.ipcRenderer.invoke("dialog:openFile"),
  readFile: (path) => electron.ipcRenderer.invoke("file:read", path),
  removeFile: (fileInfo) => electron.ipcRenderer.invoke("file:removed", fileInfo),
  getFiles: () => electron.ipcRenderer.invoke("file:getAll"),
  showNotification: (options) => electron.ipcRenderer.invoke("notification:show", options)
});
