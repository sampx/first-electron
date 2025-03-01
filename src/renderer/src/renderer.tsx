import { createRoot } from 'react-dom/client';
import App from './App';

document.addEventListener('DOMContentLoaded', () => {
    const appRoot = document.getElementById('app-root');
    if (appRoot) {
        const root = createRoot(appRoot);
        root.render(<App />);
    } else {
        console.error('找不到 #app-root 元素，无法渲染 React 应用');
    }    
});