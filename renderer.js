const FileInfo = require('./FileInfo')

// 当DOM完全加载后执行初始化
document.addEventListener('DOMContentLoaded', () => {
    // 获取页面上的关键DOM元素
    const infoElement = document.getElementById('system-info')  // 系统信息显示区域
    const dropZone = document.getElementById('drop-zone')      // 文件拖放区域
    let fileList = []  // 存储已添加文件的数组

    // 更新文件列表显示
    function updateFileListDisplay() {
        const fileListElement = document.getElementById('file-list')
        if (fileList.length === 0) {
            fileListElement.innerHTML = '<div class="no-files">当前无文件</div>'
            return
        }
        
        // 清空现有列表
        fileListElement.innerHTML = ''
        
        // 添加所有文件项
        fileList.forEach(file => {
            const fileItem = document.createElement('div')
            fileItem.className = 'file-item'
            fileItem.dataset.id = file.fileId
            
            fileItem.innerHTML = `
                <div class="file-name-container">
                    <span class="file-name">${file.name}</span>
                    <span class="file-type">(${file.mimeType})</span>
                </div>
                <button class="delete-btn">×</button>
            `
            
            // 为删除按钮添加点击事件处理
            fileItem.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation()  // 防止事件冒泡
                const targetId = file.fileId
                fileList = fileList.filter(f => {
                    if(f.fileId === targetId) {
                        // 如果存在预览URL，释放它
                        if(f.previewUrl) URL.revokeObjectURL(f.previewUrl)
                        // 通知主进程删除文件
                        window.electronAPI.handleFileRemove(f)
                        return false  // 从列表中移除
                    }
                    return true
                })
                fileItem.remove()  // 从DOM中移除元素
                // 更新文件列表显示
                updateFileListDisplay()
            })
            
            fileListElement.appendChild(fileItem)
        })
    }

    // 初始化时显示空文件列表提示
    updateFileListDisplay()

    // 通过IPC通信获取并显示系统信息
    window.electronAPI.getSystemInfo()
        .then(data => {
            // 获取stats容器并清空内容
            const statsContainer = infoElement.querySelector('.stats-container')
            statsContainer.innerHTML = ''  // 确保清空容器
            
            // 创建并添加统计项
            const createStatItem = (label, value) => {
                const div = document.createElement('div')
                div.className = 'stat-item'
                div.innerHTML = `
                    <span class="stat-label">${label}</span>
                    <span class="stat-value">${value}</span>
                `
                return div
            }
            
            // 添加各个统计信息（增加空值检查）
            if (data.platform) {
                statsContainer.appendChild(createStatItem('平台', data.platform))
            }
            if (data.cpu) {
                statsContainer.appendChild(createStatItem('CPU负载', `${data.cpu}%`))
            }
            if (data.mem) {
                statsContainer.appendChild(createStatItem('内存使用', `${Math.round(data.mem / 1024 / 1024)} MB`))
            }
        })
        .catch(error => {
            console.error('获取系统信息失败:', error)
            const statsContainer = infoElement.querySelector('.stats-container')
            statsContainer.innerHTML = `<div class="error">无法获取系统信息</div>`
        })

    // 处理拖拽文件时的悬停效果
    dropZone.ondragover = (e) => {
        e.preventDefault()  // 阻止默认行为
        e.stopPropagation() // 阻止事件冒泡
        dropZone.classList.add('dragover')  // 添加悬停样式
    }

    // 处理拖拽离开
    dropZone.ondragleave = (e) => {
        e.preventDefault()
        e.stopPropagation()
        dropZone.classList.remove('dragover')  // 移除悬停样式
    }

    // 处理点击选择文件
    dropZone.addEventListener('click', async () => {
        // 调用主进程打开文件选择对话框
        const filePath = await window.electronAPI.openFileDialog()
        if (!filePath) return  // 用户取消选择时直接返回
        
        // 使用FileInfo创建标准的文件对象
        const fileData = {
            fileId: Date.now().toString(),
            path: filePath,
            name: filePath.split('/').pop(),
            mimeType: 'application/octet-stream'
        }
        const fileInfo = FileInfo.create(fileData)
        
        // 读取文件内容
        const content = await window.electronAPI.readFile(filePath)
        if (content) {
            handleFile({ ...fileInfo.toObject(), content })
        }
    })

    // 处理文件拖放
    dropZone.ondrop = async (e) => {
        e.preventDefault()
        dropZone.classList.remove('dragover')  // 移除拖放样式
        const file = e.dataTransfer.files[0]  // 获取拖放的第一个文件
        if (!file) return
        
        // 使用FileInfo创建标准的文件对象
        const fileData = {
            fileId: Date.now().toString(),
            path: file.path,
            name: file.name,
            mimeType: file.type || 'application/octet-stream'
        }
        const fileInfo = FileInfo.create(fileData)
        
        // 读取文件内容
        const content = await window.electronAPI.readFile(file.path)
        if (content) {
            handleFile({ ...fileInfo.toObject(), content })
        }
    }

    /**
     * 处理文件的通用函数
     * @param {Object} file - 包含文件信息的对象
     */
    function handleFile(file) {
        // 使用FileInfo创建标准的文件对象
        const fileInfo = FileInfo.create(file)
        fileList.push(fileInfo.toObject())
        
        // 更新文件列表显示
        updateFileListDisplay()
        
        // 通过IPC通信发送文件信息到主进程
        window.electronAPI.handleFileDrop(fileInfo.toObject())
    }
})
