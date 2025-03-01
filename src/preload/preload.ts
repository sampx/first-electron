import { contextBridge, ipcRenderer } from 'electron';

import { SystemInfo, FileInfoType, NotificationOptions } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
    getSystemInfo: (): Promise<SystemInfo> => ipcRenderer.invoke('system:info'),
    handleFileSelected: (fileinfo: FileInfoType): Promise<boolean> => ipcRenderer.invoke('file:selected', fileinfo),
    openFileDialog: (): Promise<string[]> => ipcRenderer.invoke('dialog:openFile'),
    readFile: (path: string): Promise<string | null> => ipcRenderer.invoke('file:read', path),
    removeFile: (fileInfo: FileInfoType): Promise<boolean> => ipcRenderer.invoke('file:removed', fileInfo),
    getFiles: (): Promise<FileInfoType[]> => ipcRenderer.invoke('file:getAll'),
    showNotification: (options: NotificationOptions) => ipcRenderer.invoke('notification:show', options)
});

