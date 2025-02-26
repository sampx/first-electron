document.addEventListener("DOMContentLoaded", () => {
  const infoElement = document.getElementById("system-info");
  const dropZone = document.getElementById("drop-zone");
  let fileList = [];
  const statsContainer = infoElement.querySelector(".stats-container");
  async function updateSystemInfo() {
    try {
      const data = await window.electronAPI.getSystemInfo();
      statsContainer.innerHTML = `
                Platform: ${data.platform}<br>
                CPU Usage: ${data.cpu.toFixed(2)}%<br>
                Memory: ${(data.mem / 1024 / 1024).toFixed(2)} MB
            `;
    } catch (error) {
      console.error("获取系统信息失败:", error);
      statsContainer.innerHTML = `获取系统信息失败: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  updateSystemInfo();
  setInterval(updateSystemInfo, 5e3);
  dropZone.ondragover = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.style.backgroundColor = "#f0f0f0";
  };
  function createFileInfo(fileName, filePath = null) {
    const timestamp = Date.now();
    const fileId = `${fileName.replace(/[^a-zA-Z0-9]/g, "_")}_${timestamp}`;
    return {
      fileId,
      name: fileName,
      client_path: filePath,
      mimeType: null,
      content: null
    };
  }
  function readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        if (e.target?.result instanceof ArrayBuffer) {
          const arrayBuffer = e.target.result;
          const array = new Uint8Array(arrayBuffer);
          const content = btoa(String.fromCharCode.apply(null, Array.from(array)));
          resolve(content);
        } else {
          reject(new Error("Invalid file content"));
        }
      };
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsArrayBuffer(file);
    });
  }
  function displayFileItem(fileInfo) {
    const existingFileIndex = fileList.findIndex((f) => f.fileId === fileInfo.fileId);
    if (existingFileIndex !== -1) {
      return;
    }
    const fileListElement = document.getElementById("file-list");
    if (!fileListElement) {
      console.error("文件列表容器不存在");
      return;
    }
    const fileItem = document.createElement("div");
    fileItem.className = "file-item";
    fileItem.dataset.id = fileInfo.fileId;
    fileItem.innerHTML = `
            <div class="file-name-container">
                <span class="file-name">${fileInfo.name}</span>
            </div>
            <button class="delete-btn">×</button>
        `;
    const deleteBtn = fileItem.querySelector(".delete-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const targetId = fileItem.dataset.id;
        const targetFile = fileList.find((f) => f.fileId === targetId);
        if (targetFile) {
          window.electronAPI.removeFile({
            fileId: targetFile.fileId,
            name: targetFile.name
          });
          fileList = fileList.filter((f) => f.fileId !== targetId);
          fileItem.remove();
        }
      });
    }
    fileListElement.appendChild(fileItem);
    fileList.push(fileInfo);
    console.log("文件已添加到列表:", fileInfo.name);
  }
  async function handleDroppedFile(file) {
    try {
      const fileInfo = createFileInfo(file.name);
      const content = await readFileContent(file);
      fileInfo.content = content;
      window.electronAPI.handleFileSelected(fileInfo);
      displayFileItem(fileInfo);
    } catch (error) {
      console.error("处理拖放文件失败:", error);
      alert("文件处理失败: " + (error instanceof Error ? error.message : String(error)));
    }
  }
  async function handleSelectedFile(filePaths) {
    try {
      for (const filePath of filePaths) {
        const fileName = filePath.split("/").pop() || "";
        const fileInfo = createFileInfo(fileName, filePath);
        const content = await window.electronAPI.readFile(filePath);
        if (content !== null) {
          fileInfo.content = content;
          window.electronAPI.handleFileSelected(fileInfo);
          displayFileItem(fileInfo);
        } else {
          throw new Error("无法读取文件内容");
        }
      }
    } catch (error) {
      console.error("处理选择文件失败:", error);
      alert("文件处理失败: " + (error instanceof Error ? error.message : String(error)));
    }
  }
  dropZone.addEventListener("click", async () => {
    console.log("点击了文件选择区域，准备调用 openFileDialog");
    try {
      const filePaths = await window.electronAPI.openFileDialog();
      console.log("openFileDialog 调用结果:", filePaths);
      if (filePaths && filePaths.length > 0) {
        console.log("获取到文件路径:", filePaths);
        await handleSelectedFile(filePaths);
      } else {
        console.log("未选择任何文件或获取文件路径失败");
      }
    } catch (error) {
      console.error("调用 openFileDialog 时发生错误:", error);
    }
  });
  dropZone.ondrop = async (e) => {
    e.preventDefault();
    dropZone.style.backgroundColor = "";
    const file = e.dataTransfer?.files[0];
    if (file) {
      await handleDroppedFile(file);
    }
  };
});
