
class FileInfo {
    /**
     * @param {Object} params - 文件信息参数
     * @param {string} params.fileId - 文件唯一标识符
     * @param {string} params.name - 文件名
     * @param {string} params.client_path - 文件原始路径
     * @param {string} params.server_path - 文件服务器路径
     * @param {string} params.content - 文件内容
     * @param {string} params.mimeType - 文件mime类型
     */
    constructor({ fileId, name, client_path, server_path, content, mimeType }) {
        this.fileId = fileId
        this.name = name
        this.client_path = client_path
        this.server_path = server_path
        this.content = content
        this.mimeType = mimeType
    }

    /**
     * 创建 FileInfo 实例
     * @param {Object} fileData - 文件数据
     * @returns {FileInfo} 新的 FileInfo 实例
     */
    static create(fileData) {
        return new FileInfo({
            fileId: fileData.fileId,
            name: fileData.name,
            client_path: fileData.path ? fileData.path : null,
            content: fileData.content,
        })
    }

    /**
     * 转换为普通对象
     * @returns {Object} 包含文件信息的普通对象
     */
    toObject() {
        return {
            fileId: this.fileId,
            name: this.name,
            client_path: this.client_path,
            content: this.content,
            client_path: this.client_path,
            mimeType: this.mimeType,
            server_path: this.server_path
        }
    }
}

module.exports = FileInfo