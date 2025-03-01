import { AppStateType } from "../shared/types";
import fs from "fs";
import log from "electron-log";

export class AppStateManager {
    private static instance: AppStateManager;
    private filePath: string;
    private state: AppStateType = {
        db_initialized: false
    };

    private constructor(stateFilePath: string) {
        log.info('初始化 AppStateManager 实例');
        this.filePath = stateFilePath;
        const st = this.loadState(this.filePath);
        if (st) {
            this.state = st;
        } else {
            log.error('加载状态文件失败，使用默认状态');
        }
    }

    public static getInstance(stateFilePath: string): AppStateManager {
        if (!AppStateManager.instance) {
            AppStateManager.instance = new AppStateManager(stateFilePath);
        }
        return AppStateManager.instance;
    }

    private initialize(stateFilePath: string): AppStateType {
        this.state = {
            db_initialized: false
        };
        fs.writeFileSync(stateFilePath, JSON.stringify(this.state, null, 2), 'utf8');
        return this.state;
    }

    private loadState(stateFilePath: string): AppStateType | null {
        try {
            if (fs.existsSync(stateFilePath)) {
                log.info('正在加载状态文件');
                const stateData = fs.readFileSync(stateFilePath, 'utf-8');
                const jsonState = JSON.parse(stateData);
                log.debug('加载的状态内容:', jsonState);
                return jsonState;
            } else {
                log.info('状态文件不存在，创建空状态文件');
                return this.initialize(stateFilePath)                 
            }
        } catch (error) {
            log.error('加载状态文件失败:', error);
        }
        return null;
    }

    private async saveState(): Promise<void> {
        log.debug('保存的状态内容:', this.state);
        return fs.promises.writeFile(this.filePath, JSON.stringify(this.state, null, 2), 'utf8');
    }

    private saveStateSync(): void {
        log.debug('保存的状态内容:', this.state);
        fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf8');
    }

    public async updateState(newState: Partial<AppStateType>): Promise<void> {
        log.info('更新状态');
        log.debug('更新前的状态:', this.state);
        log.debug('更新的状态项:', newState);
        this.state = { ...this.state, ...newState };
        log.debug('更新后的状态:', this.state);
        return this.saveState();
    }

    public isDatabaseReady(): boolean {
        return this.state.db_initialized === true;
    }

    public setDatabaseReady(): void {
        this.state.db_initialized = true;
        this.saveStateSync();
    }

    public async setWindowSize(width: number, height: number): Promise<void> {
        this.state.window_size = { width, height };
        return this.saveState();
    }

   
}