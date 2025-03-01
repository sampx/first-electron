import React from 'react';

interface SystemInfoPanelProps {
  info: {
    platform: string;
    cpu: number;
    mem: number;
  };
}

export const SystemInfoPanel: React.FC<SystemInfoPanelProps> = ({ info }) => {
  return (
    <div className="system-info-panel">
      <h3>System Information</h3>
      <div className="stats-container"> {/* Add .stats-container to keep consistent with original HTML structure */}
        Platform: {info.platform}<br />
        CPU Usage: {info.cpu.toFixed(2)}%<br />
        Memory: {(info.mem / 1024 / 1024).toFixed(2)} MB
      </div>
    </div>
  );
};