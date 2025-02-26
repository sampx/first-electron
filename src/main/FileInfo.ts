import { FileInfoParams } from '../shared/types';

class FileInfo {
    fileId: string;
    name: string;
    client_path: string | null;
    server_path: string | null;
    content: string | Buffer | null;
    mimeType: string | null;

    constructor({ fileId, name, client_path, server_path, content, mimeType }: FileInfoParams) {
        this.fileId = fileId;
        this.name = name;
        this.client_path = client_path || null;
        this.server_path = server_path || null;
        this.content = content || null;
        this.mimeType = mimeType || null;
    }

    static create(fileData: FileInfoParams): FileInfo {
        return new FileInfo({
            fileId: fileData.fileId,
            name: fileData.name,
            client_path: fileData.client_path || null,
            content: fileData.content || null,
        });
    }

    toObject(): FileInfoParams {
        return {
            fileId: this.fileId,
            name: this.name,
            client_path: this.client_path,
            content: this.content,
            mimeType: this.mimeType,
            server_path: this.server_path
        };
    }
}

export default FileInfo;