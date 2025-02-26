import { contextBridge, ipcRenderer } from 'electron';

import { SystemInfo, FileInfoParams } from '../shared/types';

console.log('预加载脚本开始执行');

contextBridge.exposeInMainWorld('electronAPI', {
    getSystemInfo: (): Promise<SystemInfo> => ipcRenderer.invoke('system:info'),
    handleFileSelected: (fileinfo: FileInfoParams): void => ipcRenderer.send('file:selected', fileinfo),
    openFileDialog: (): Promise<string[]> => ipcRenderer.invoke('dialog:openFile'),
    readFile: (path: string): Promise<string | null> => {
        console.log('渲染进程请求读取文件:', path);
        return ipcRenderer.invoke('file:read', path)
            .then(result => {
                console.log('文件读取成功');
                return result;
            })
            .catch(error => {
                console.error('文件读取失败:', error);
                throw error;
            });
    },
    removeFile: (fileInfo: FileInfoParams): void => ipcRenderer.send('file:removed', fileInfo)
});

console.log('预加载脚本执行完成');

