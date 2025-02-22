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

    dropZone.ondrop = (e) => {
        e.preventDefault()
        dropZone.style.backgroundColor = ''
        const file = e.dataTransfer.files[0]
        
        // 生成唯一ID
        const fileId = Date.now() 
        fileList.push({ id: fileId, path: file.path, name: file.name })
        
        // 创建文件项
        const fileItem = document.createElement('div')
        fileItem.className = 'file-item'
        fileItem.dataset.id = fileId
        
        // 添加Base64文件图标
        const fileIcon = `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM3ODg2OTMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj4KICA8cGF0aCBkPSJNMTMgMnY2aDZNMTMgMkg5YTIgMiAwIDAgMC0yIDJ2MTZhMiAyIDAgMCAwIDIgMmg2YTIgMiAwIDAgMCAyLTJWN0wxMyAyeiIvPgo8L3N2Zz4=" class="file-preview">`
        
        fileItem.innerHTML = `
            ${fileIcon}
            <div style="font-size: 12px; word-break: break-all">${file.name}</div>
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
