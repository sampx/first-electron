/**
 * 系统信息接口
 */
export interface SystemInfo {
    platform: string;
    cpu: number;
    mem: number;
}

/**
 * 文件信息参数接口
 */
export interface FileInfoParams {
    fileId: string;
    name: string;
    client_path?: string | null;
    server_path?: string | null;
    content?: string | Buffer | null;
    mimeType?: string | null;
}

/**
 * Electron API 接口
 */
export interface ElectronAPI {
    getSystemInfo: () => Promise<SystemInfo>;
    openFileDialog: () => Promise<string[]>;
    handleFileSelected: (fileInfo: FileInfoParams) => void;
    readFile: (filePath: string) => Promise<string | null>;
    removeFile: (fileInfo: { fileId: string; name: string }) => void;
}

/**
 * 全局 Window 接口扩展
 */
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}