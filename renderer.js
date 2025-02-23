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

    // 创建文件信息对象
    function createFileInfo(fileName, filePath = null) {
        const timestamp = Date.now()
        const fileId = `${fileName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`
        return {
            fileId,
            name: fileName,
            path: filePath,
            type: null,
            content: null
        }
    }

    // 读取文件内容
    function readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            
            reader.onload = function(e) {
                const arrayBuffer = e.target.result;
                const array = new Uint8Array(arrayBuffer);
                const content = btoa(String.fromCharCode.apply(null, array)); // Convert ArrayBuffer to Base64
                resolve(content);
            }

            reader.onerror = () => reject(new Error('文件读取失败'))
            reader.readAsArrayBuffer(file) // Always read as ArrayBuffer
        })
    }

    // 显示文件项
    function displayFileItem(fileInfo) {
        const fileItem = document.createElement('div')
        fileItem.className = 'file-item'
        fileItem.dataset.id = fileInfo.fileId

        fileItem.innerHTML = `
            <div class="file-name-container">
                <span class="file-name">${fileInfo.name}</span>
                ${fileInfo.path ? `<span class="file-path">${fileInfo.path}</span>` : ''}
                ${fileInfo.type ? `<span class="file-type">${fileInfo.type}</span>` : ''}
            </div>
            <button class="delete-btn">×</button>
        `

        fileItem.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation()
            const targetId = fileItem.dataset.id
            const targetFile = fileList.find(f => f.id === targetId)
            if (targetFile) {
                window.electronAPI.removeFile({
                    fileId: targetFile.id,
                    name: targetFile.name
                })
                
                fileList = fileList.filter(f => {
                    if(f.id === targetId) {
                        if(f.previewUrl) URL.revokeObjectURL(f.previewUrl)
                        return false
                    }
                    return true
                })
                fileItem.remove()
            }
        })

        const existingFileIndex = fileList.findIndex(f => f.name === fileInfo.name && f.path === fileInfo.path);
        if (existingFileIndex === -1) {
            document.getElementById('file-list').appendChild(fileItem)
            fileList.push({ id: fileInfo.fileId, fileId: fileInfo.fileId, name: fileInfo.name, path: fileInfo.path })
        }
    }

    // 处理拖放文件
    async function handleDroppedFile(file) {
        try {
            const fileInfo = createFileInfo(file.name)            
            const content = await readFileContent(file)
            fileInfo.content = content
            window.electronAPI.handleFileSelected(fileInfo)
            displayFileItem(fileInfo)
        } catch (error) {
            console.error('处理拖放文件失败:', error)
            alert('文件处理失败: ' + error.message)
        }
    }

    // 处理选择的文件
    async function handleSelectedFile(filePath) {
        try {
            const fileName = filePath.split('/').pop()
            const fileInfo = createFileInfo(fileName, filePath)
            
            const content = await window.electronAPI.readFile(filePath)
            if (content !== null) {
                fileInfo.content = content
                window.electronAPI.handleFileSelected(fileInfo)
                displayFileItem(fileInfo)
            } else {
                throw new Error('无法读取文件内容')
            }
        } catch (error) {
            console.error('处理选择文件失败:', error)
            alert('文件处理失败: ' + error.message)
        }
    }

    // 点击处理
    dropZone.addEventListener('click', async () => {
        const filePath = await window.electronAPI.openFileDialog()
        if (filePath) {
            await handleSelectedFile(filePath)
        }
    })

    // 拖放处理
    dropZone.ondrop = async (e) => {
        e.preventDefault()
        dropZone.style.backgroundColor = ''
        const file = e.dataTransfer.files[0]
        if (file) {
            await handleDroppedFile(file)
        }
    }
})
