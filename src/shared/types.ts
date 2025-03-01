
export interface AppStateType {
    db_initialized?: boolean;
    window_size?: {
        width: number;
        height: number;
    };
}

export interface SystemInfo {
    platform: string;
    cpu: number;
    mem: number;
}

/**
 * 文件信息参数接口
 */
export interface FileInfoType {
    fileId: string;
    name: string;
    client_path?: string | null;
    server_path?: string | null;
    content?: string | null;
    mimeType?: string | null;
}

export interface NotificationOptions {
    title: string;
    body: string;
    type: 'error' | 'info' | 'warning' | 'success';
}

/**
 * Electron API 接口
 */
export interface ElectronAPI {
    getSystemInfo: () => Promise<SystemInfo>;
    openFileDialog: () => Promise<string[]>;
    handleFileSelected: (fileInfo: FileInfoType) => Promise<boolean>;
    readFile: (filePath: string) => Promise<string | null>;
    removeFile: (fileInfo: { fileId: string; name: string }) => Promise<boolean>;
    getFiles: () => Promise<FileInfoType[]>;
    showNotification: (options: NotificationOptions) => Promise<void>;
}

/**
 * 全局 Window 接口扩展
 */
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}