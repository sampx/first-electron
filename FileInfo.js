/**
 * 文件信息类，用于管理文件的相关属性
 */
class FileInfo {
    /**
     * @param {Object} params - 文件信息参数
     * @param {string} params.fileId - 文件唯一标识符
     * @param {string} params.name - 文件名
     * @param {string} params.path - 文件路径
     * @param {string} params.content - 文件内容
     */
    constructor({ fileId, name, path, content }) {
        this.fileId = fileId
        this.name = name
        this.path = path
        this.content = content
    }

    /**
     * 创建 FileInfo 实例
     * @param {Object} fileData - 文件数据
     * @returns {FileInfo} 新的 FileInfo 实例
     */
    static create(fileData) {
        return new FileInfo({
            fileId: fileData.fileId || fileData.id, // 兼容现有的 id 字段
            name: fileData.name,
            path: fileData.path,
            content: fileData.content
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
            path: this.path,
            content: this.content
        }
    }
}

module.exports = FileInfo