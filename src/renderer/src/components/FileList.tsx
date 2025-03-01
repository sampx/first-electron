import React from 'react';
import { FileInfoType } from '../../../shared/types'; // 导入 FileInfoParams 类型

interface FileListProps {
  files: FileInfoType[];
  onFileDeleted?: (file: FileInfoType) => void;
}

export const FileList: React.FC<FileListProps> = ({ files, onFileDeleted }) => {
  const handleDelete = async (file: FileInfoType) => {
    const isDeleted = await window.electronAPI.removeFile(file);
    if (isDeleted) {
      onFileDeleted?.(file);
    }
  };

  return (
    files.length > 0 ? (
      <div className='file-list-container'>
        <h3>File List</h3>
        <ul id="file-list" className='file-list'>
          {files.map((file) => (
            <li key={file.fileId} className="file-item" data-id={file.fileId}>
              <div className="file-name-container">
                <span className="file-name">{file.name}</span>
              </div>
              <button className="delete-btn" onClick={() => handleDelete(file)}>×</button>
            </li>
          ))}
        </ul>
      </div>
    ) : null
  );
};