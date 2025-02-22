document.addEventListener('DOMContentLoaded', () => {
    const infoElement = document.getElementById('system-info')
    const dropZone = document.getElementById('drop-zone')
    let fileList = []

    // 获取系统信息
    window.electronAPI.getSystemInfo()
        .then(data => {
            infoElement.innerHTML = `
                Platform: ${data.platform}<br>
                CPU Usage: ${data.cpu}%<br>
                Memory: ${(data.mem / 1024 / 1024).toFixed(2)} MB
            `
        })

    // 处理文件拖放
    dropZone.ondragover = (e) => {
        e.preventDefault()
        e.stopPropagation()
        dropZone.style.backgroundColor = '#f0f0f0'
    }

    // 点击处理
    dropZone.addEventListener('click', async () => {
        const filePath = await window.electronAPI.openFileDialog()
        if (!filePath) return
        
        handleFile({
            path: filePath,
            name: filePath.split('/').pop() // 使用浏览器API获取文件名
        })
    })

    // 拖放处理
    dropZone.ondrop = (e) => {
        e.preventDefault()
        dropZone.style.backgroundColor = ''
        const file = e.dataTransfer.files[0]
        handleFile(file)
    }

    // 通用文件处理函数
    function handleFile(file) {
        
        // 生成唯一ID
        const fileId = Date.now() 
        fileList.push({ id: fileId, path: file.path, name: file.name })
        
        // 创建文件项
        const fileItem = document.createElement('div')
        fileItem.className = 'file-item'
        fileItem.dataset.id = fileId
        
        fileItem.innerHTML = `
            <div class="file-name-container">
                <span class="file-name">${file.name}</span>
            </div>
            <button class="delete-btn">×</button>
        `
        
        // 添加删除事件
        fileItem.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation()
            const targetId = Number(fileItem.dataset.id)
            fileList = fileList.filter(f => {
                if(f.id === targetId) {
                    if(f.previewUrl) URL.revokeObjectURL(f.previewUrl)
                    return false
                }
                return true
            })
            fileItem.remove()
        })
        
        document.getElementById('file-list').appendChild(fileItem)
        
        // 发送文件路径到主进程
        window.electronAPI.handleFileDrop(file.path)
    }
})
