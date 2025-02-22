document.addEventListener('DOMContentLoaded', () => {
    const infoElement = document.getElementById('system-info')
    const dropZone = document.getElementById('drop-zone')

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
        const files = e.dataTransfer.files
        if (files.length > 0) {
            window.electronAPI.handleFileDrop(files[0].path)
        }
    }
})
