import { useEffect, useState } from 'react';
// import { SystemInfoPanel } from './components/SystemInfoPanel';
import { FileList } from './components/FileList';
import { DropZone } from './components/DropZone';
import { FileInfoType } from '../../shared/types';

export default function App() {
  // const [systemInfo, setSystemInfo] = useState<{ platform: string; cpu: number; mem: number } | null>(null); 
  const [files, setFiles] = useState<FileInfoType[]>([]);

    useEffect(() => {
      // const updateSystemInfo = async () => {
      //   try {
      //     const data = await window.electronAPI.getSystemInfo();
      //     setSystemInfo(data);
      //   } catch (error) {
      //     console.error('Failed to get system info:', error);
      //     setSystemInfo(null);
      //   }
      // };
  
      // updateSystemInfo();      
      // const interval = setInterval(updateSystemInfo, 5000);

      const loadSavedFiles = async () => {
        try {
          const savedFiles = await window.electronAPI.getFiles();
          setFiles(savedFiles);
        } catch (error) {
          console.error('加载已保存的文件失败:', error);
        }
      };
      loadSavedFiles();
      // return () => clearInterval(interval);
    }, []);

    const handleFilesSelected = async (fileList: FileInfoType[]) => {
    
      for (const fileInfo of fileList) {
        if (await window.electronAPI.handleFileSelected(fileInfo)){
          setFiles((prevFiles) => [...prevFiles, fileInfo]);
        }
      }
    };

    const handleFileDeleted = (deletedFile: FileInfoType) => {
      setFiles((prevFiles) => prevFiles.filter(file => file.fileId !== deletedFile.fileId));
    };

    return (
      <div className="container">
        <h1 className="app-title">Electron File Manager</h1>
        {/* <SystemInfoPanel info={systemInfo ?? { platform: 'Loading...', cpu: 0, mem: 0 }} /> */}
        <DropZone onFilesSelected={handleFilesSelected}></DropZone>       
        <FileList files={files} onFileDeleted={handleFileDeleted} /> 
      </div>
    );
  }
