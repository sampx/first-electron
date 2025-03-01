export interface KnowledgeBaseConfigType {
    file_store_path?: string;
    db_path?: string;
}

export interface AppConfigType {
    app: {
        name: string;
        knowledge_base: KnowledgeBaseConfigType;
    };
    
}

export const DEFAULT_CONFIG_YAML = `
app:
  # 应用名称
  name: First_Electron
  # 知识库配置
  knowledge_base:
    # 以下目录配置如果是绝对路径, 则会直接使用该路径
    # 如果是相对路径,生产环境下默认根目录为 app.getPath('userData'), 开发环境下为项目根目录
    file_store_path: "kb/files"
    db_path: "kb/db"
`;

export class AppConfig {

    private constructor() {
        
    }
}