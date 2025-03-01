import React, { useCallback } from 'react';
import { FileInfoType } from '../../../shared/types';

interface DropZoneProps {
  onFilesSelected: (fileInfos: FileInfoType[]) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected }) => {

  const handleFileSelectFromDialog = async (filePaths: string[]) => {
    const files: FileInfoType[] = [];
    for (const filePath of filePaths) {
      const fileName = filePath.split('/').pop() || '';
      const fileInfo: FileInfoType = createFileInfo(fileName, filePath); 
      try {
        const content = await window.electronAPI.readFile(filePath);
        fileInfo.content = content;
        files.push(fileInfo);
      } catch (error) {
        window.electronAPI.showNotification({
          title: '文件读取错误',
          body: `无法读取文件 ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
          type: 'error'
        });
      }
    }
    onFilesSelected(files);
  };

  const handleDroppedFile = useCallback(async (file: File): Promise<void> => {
    try {
      const fileInfo = createFileInfo(file.name);
      const content = await readFileContent(file);
      fileInfo.content = content;
      onFilesSelected([fileInfo]); 
    } catch (error) {
      console.error('处理拖放文件失败:', error); // Error message in Chinese - translate to English if needed
      alert('文件处理失败: ' + (error instanceof Error ? error.message : String(error))); // Alert message in Chinese - translate to English if needed
    }
  }, [onFilesSelected]);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (event) => {
    event.preventDefault();
    event.stopPropagation();
  
    const files = event.dataTransfer?.files as FileList;
    console.log('Files dropped:', files ? Array.from(files).map(f => ({ name: f.name, type: f.type, size: f.size })) : 'No files');
    
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (file) {
          console.log(`Processing file ${i + 1}/${files.length}:`, { name: file.name, type: file.type, size: file.size });
          try {
            await handleDroppedFile(file);
            console.log(`Successfully processed file: ${file.name}`);
          } catch (error) {
            console.error(`Failed to process file ${file.name}:`, error);
          }
        }
      }
    }
  }, [handleDroppedFile]); 

  const handleClick = useCallback(async () => {
    try {
      const filePaths = await window.electronAPI.openFileDialog(); 
      if (filePaths && filePaths.length > 0) {
        handleFileSelectFromDialog(filePaths);
      }
    } catch (error) {
      console.error('Error opening file dialog:', error);
    }
  }, [handleFileSelectFromDialog]); 


  return (
    <div 
      id="drop-zone" //  保持 id="drop-zone" 与原有代码 CSS 样式兼容
      className="drop-zone" //  添加 className，方便 CSS styling
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick} //  添加 onClick 事件处理
    >
      <div className="drop-content">
        <svg className="drop-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <p className="drop-text">拖放文件到这里或点击选择</p>
      </div>
    </div>
  );
};

function createFileInfo(fileName: string, filePath: string | null = null): FileInfoType {
  const timestamp = Date.now();
  const fileId = `${fileName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;
  return {
    fileId,
    name: fileName,
    client_path: filePath
  };
}

function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function(e: ProgressEvent<FileReader>) {
      if (e.target?.result instanceof ArrayBuffer) {
        try {
          const arrayBuffer = e.target.result;
          const array = new Uint8Array(arrayBuffer);
          // 使用分块处理来避免大文件导致的问题
          const chunkSize = 32768; // 32KB chunks
          let content = '';
          for (let i = 0; i < array.length; i += chunkSize) {
            const chunk = array.slice(i, i + chunkSize);
            content += String.fromCharCode.apply(null, Array.from(chunk));
          }
          const base64Content = btoa(content);
          console.log(`Successfully encoded ${file.name} to base64`);
          resolve(base64Content);
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          reject(error);
        }
      } else {
        console.error(`Invalid file content for ${file.name}`);
        reject(new Error('Invalid file content'));
      }
    };

    reader.onerror = () => reject(new Error('文件读取失败')); // Error message in Chinese - translate to English if needed
    reader.readAsArrayBuffer(file); // Always read as ArrayBuffer
  });
}