import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';
import yaml from 'yaml';
import { AppConfigType, DEFAULT_CONFIG_YAML } from './AppConfig';
import { AppStateManager } from './AppState';

export class AppContext {
    private static instance: AppContext;
    private config: AppConfigType;
    private configPath: string;
    private statePath: string;
    public stateManager: AppStateManager;   

    private constructor() {
        log.info('初始化 AppContext 实例');
        
        // 根据环境选择配置文件路径
        this.configPath = AppContext.isDevelopment()
            ? path.join(process.cwd(), 'app_config.dev.yaml')
            : path.join(app.getPath('userData'), 'app_config.yaml');
        
        this.statePath = AppContext.isDevelopment()
            ? path.join(process.cwd(), 'app_state.dev.json')
            : path.join(app.getPath('userData'), 'app_state.json');
        
        log.info('配置文件路径:', this.configPath);
        log.debug('当前运行环境:', AppContext.isDevelopment() ? 'development' : 'production');
        
        // 如果配置文件不存在，创建默认配置文件
        if (!fs.existsSync(this.configPath)) {
            log.info('配置文件不存在，创建默认配置文件');
            fs.writeFileSync(this.configPath, DEFAULT_CONFIG_YAML);
            log.debug('默认配置内容:', yaml.parse(DEFAULT_CONFIG_YAML));
        }
        this.stateManager = AppStateManager.getInstance(this.statePath);
        this.config = this.loadConfig();
    }

    public static getInstance(): AppContext {
        if (!AppContext.instance) {
            AppContext.instance = new AppContext();
        }
        return AppContext.instance;
    }

    private loadConfig(): AppConfigType {
        try {
            if (fs.existsSync(this.configPath)) {
                log.info('正在加载配置文件');
                const configData = fs.readFileSync(this.configPath, 'utf-8');
                const yamlConfig = yaml.parse(configData);
                log.debug('加载的配置内容:', yamlConfig);
                return yamlConfig;
            }
        } catch (error) {
            log.error('加载配置文件失败:', error);
        }
        const defaultConfig = yaml.parse(DEFAULT_CONFIG_YAML);
        log.info('使用默认配置');
        return defaultConfig;
    }

    public saveConfig(): void {
        try {
            log.info('正在保存配置文件');
            fs.writeFileSync(this.configPath, yaml.stringify(this.config));
            log.debug('保存的配置内容:', this.config);
            log.info('配置文件已保存');
        } catch (error) {
            log.error('保存配置文件失败:', error);
        }
    }

    public updateConfig(newConfig: Partial<AppConfigType>): void {
        log.info('更新配置');
        log.debug('更新前的配置:', this.config);
        log.debug('更新的配置项:', newConfig);
        this.config = { ...this.config, ...newConfig };
        log.debug('更新后的配置:', this.config);
        this.saveConfig();
    }

    private resolvePath(configPath: string | undefined, defaultSubPath: string): string {
        if (!configPath) {
            const defaultPath = path.join(app.getPath('userData'), defaultSubPath);
            log.debug(`使用默认路径: ${defaultPath}`);
            return defaultPath;
        }

        // 如果是绝对路径，直接使用
        if (path.isAbsolute(configPath)) {
            log.debug(`使用绝对路径: ${configPath}`);
            return configPath;
        }

        // 根据环境选择基础路径
        const basePath = AppContext.isDevelopment() ? process.cwd() : app.getPath('userData');
        const resolvedPath = path.join(basePath, configPath);
        log.debug(`解析相对路径: ${configPath} -> ${resolvedPath}`);
        return resolvedPath;
    }

    public getKBFileStoreDir(): string {
        return this.resolvePath(this.config.app.knowledge_base?.file_store_path, 'files');
    }

    public getKBDatabaseDir(): string {
        let db_path = this.resolvePath(this.config.app.knowledge_base?.db_path, 'db');
        if (AppContext.isDevelopment()){
            db_path = path.join(db_path, 'app.dev.db');
        }else{
            db_path = path.join(db_path, 'app.db');
        }
        return db_path;
    }

    public static isDevelopment(): boolean {
        return !app.isPackaged;
    }
}