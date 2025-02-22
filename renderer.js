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
        
        // 创建文件信息对象
        const fileInfo = {
            fileId: fileId,
            name: file.name,
            content: null
        }
        
        fileList.push({ id: fileId, name: file.name })
        
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
        
        // AI 以下这部分的逻辑不正确，请修改
        // 如果是从文件系统选择的文件，则读取文件内容
        // 区分拖放文件和通过对话框选择文件的情况
        if (file instanceof File) {
            const reader = new FileReader()
            reader.onload = function(e) {
                fileInfo.content = e.target.result
                window.electronAPI.handleFileDrop(fileInfo)
            }
            
            // 根据文件MIME类型选择合适的读取方法
            const mimeType = file.type || 'application/octet-stream'
            if (mimeType.startsWith('text/') || 
                mimeType === 'application/json' || 
                mimeType === 'application/javascript' || 
                mimeType === 'application/xml') {
                reader.readAsText(file)
            } else if (mimeType.startsWith('image/')) {
                reader.readAsDataURL(file)
            } else {
                reader.readAsArrayBuffer(file)
            }
        } else {
            // 通过对话框选择的文件，直接发送文件路径信息
            window.electronAPI.handleFileDrop(fileInfo)
        }
        // 请修改上述代码的逻辑和注释 AI!
    }
})
