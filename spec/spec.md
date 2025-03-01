## Core Technologies

- **Primary Stack**: Electron 34.x, React 18.x, TypeScript, Node.js
- **Build System**: electron-vite, Vite, electron-builder, Yarn 4.x workspaces
- **State Management**: Redux with @reduxjs/toolkit and redux-persist
- **UI Framework**: Ant Design 5.x with styled-components for custom styling
- **Database**: Dexie (IndexedDB wrapper), electron-store for config, libsql for SQL database

## Application Architecture

Respect the Electron multi-process architecture:
- **Main Process**: Node.js environment for system-level operations, file access, and window management
- **Renderer Process**: React application with strict CSP
- **Preload Scripts**: Bridge between main and renderer using contextBridge
- **IPC Communication**: Use secure IPC patterns for main-renderer communication

Follow this directory structure:
```
├── main/           # Electron main process code
│   ├── services/   # Main process services
│   └── utils/      # Utility functions
├── preload/        # Preload scripts
└── renderer/       # React application
    └── src/
        ├── assets/     # Static assets
        ├── components/ # Reusable React components
        ├── pages/      # Application pages/routes
        ├── services/   # Renderer services
        ├── store/      # Redux store configuration
        ├── utils/      # Utility functions
        └── windows/    # Window-specific components
```

## Code Standards

1. **TypeScript**: Use strict type checking and proper interfaces/types
2. **React Patterns**:
   - Functional components with hooks
   - Custom hooks for reusable logic
   - Context API for component-local state when appropriate
3. **State Management**:
   - Redux for global application state
   - Use Redux Toolkit's createSlice for reducers
   - Persist critical state with redux-persist
4. **Styling**:
   - Ant Design components as primary UI elements
   - styled-components for custom styling
   - Consistent theme variables
5. **Error Handling**: Proper try/catch blocks, error boundaries, and logging
6. **Asynchronous Code**: Use async/await pattern with proper error handling

## Performance Considerations

- Minimize renderer process memory usage
- Avoid blocking the main process
- Use proper memory management for large datasets
- Implement virtualization for long lists with react-infinite-scroll-component
- Consider application startup time and lazy-loading

## Security Practices

- Follow Electron security best practices
- Implement proper CSP policies
- Use secure IPC patterns
- Sanitize user inputs and AI outputs
- Handle sensitive data (API keys, user data) securely

## Packaging and Distribution

- Support for multiple platforms (Windows, macOS, Linux)
- Implement auto-updates using electron-updater
- Proper code signing and notarization for production builds

## Development Workflow

- Use ESLint and Prettier for code quality
- Implement proper error logging with electron-log
- Write maintainable, well-documented code
- Follow semantic versioning for releases

When providing code examples or solutions, ensure they align with these specifications and explain your implementation choices, and provide clear and standardized English comments for the code block. 