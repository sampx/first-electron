"use strict";
const electron = require("electron");
console.log("预加载脚本开始执行");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  getSystemInfo: () => electron.ipcRenderer.invoke("system:info"),
  handleFileSelected: (fileinfo) => electron.ipcRenderer.send("file:selected", fileinfo),
  openFileDialog: () => electron.ipcRenderer.invoke("dialog:openFile"),
  readFile: (path) => {
    console.log("渲染进程请求读取文件:", path);
    return electron.ipcRenderer.invoke("file:read", path).then((result) => {
      console.log("文件读取成功");
      return result;
    }).catch((error) => {
      console.error("文件读取失败:", error);
      throw error;
    });
  },
  removeFile: (fileInfo) => electron.ipcRenderer.send("file:removed", fileInfo)
});
console.log("预加载脚本执行完成");
