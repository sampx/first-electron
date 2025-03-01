import Database from "better-sqlite3";
import path from "path";
import log from "electron-log";
import fs from "fs";
import { AppContext } from "./AppContext";

export interface FileRecord {
  fileId: string;
  name: string;
  client_path: string | null;
  server_path: string | null;
  mimeType: string | null;
  created_at: string;
  updated_at: string;
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database.Database | null = null;
  private readonly dbPath: string;
  private initialized = false;

  private constructor() {
    // 使用 ConfigManager 获取数据库路径
    this.dbPath = AppContext.getInstance().getKBDatabaseDir();
    log.info(`数据库路径: ${this.dbPath}`);
    this.initialized = AppContext.getInstance().stateManager.isDatabaseReady();
    // 初始化数据库
    this.db = this.initialize();
    if (!this.db){
      this.db = new Database(this.dbPath, {
        verbose:
          process.env.NODE_ENV === "development" ? console.log : undefined,
      });
      
      this.db!.pragma("foreign_keys = ON"); // 启用外键约束
      this.db!.pragma("journal_mode = WAL"); // 使用WAL模式提高性能
      this.db!.pragma("synchronous = NORMAL"); // 在大多数场景下提供良好的性能和安全性平衡
    }
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private initialize(): Database.Database | null {
    if (this.initialized) {
      log.info("数据库已经初始化，跳过重复初始化");
      return null;
    }
    log.info(`初始化数据库: ${this.dbPath}`);
    try {
      // 确保数据库所在目录存在
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        log.info(`创建数据库目录: ${dbDir}`);
      }
      // 创建或打开数据库连接
      let db = new Database(this.dbPath, {
        verbose:
          process.env.NODE_ENV === "development" ? console.log : undefined,
      });

      // 启用外键约束
      db!.pragma("foreign_keys = ON");
      // 优化配置
      db!.pragma("journal_mode = WAL"); // 使用WAL模式提高性能
      db!.pragma("synchronous = NORMAL"); // 在大多数场景下提供良好的性能和安全性平衡

      // 创建表
      this.createTables(db);

      AppContext.getInstance().stateManager.setDatabaseReady();
      this.initialized = true;
      log.info("数据库初始化成功");
      return db;
    } catch (error) {
      log.error("数据库初始化失败:", error);
      throw error;
    }
  }

  /**
   * 确保数据库已初始化
   * @returns {boolean} 数据库是否已初始化
   */
  private ensureInitialized(): boolean {
    if (!this.initialized || !this.db) {
      log.warn("数据库未初始化，操作被跳过");
      return false;
    }
    return true;
  }

  private createTables(db): void {
    if (!db) throw new Error("数据库未初始化");

    // 创建文件表
    db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        fileId TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        client_path TEXT,
        server_path TEXT,
        mimeType TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    log.info("数据库表创建成功");
  }

  public addFile(file: Omit<FileRecord, "created_at" | "updated_at">): void {
    if (!this.ensureInitialized()) return;

    const now = new Date().toISOString();

    try {
      const stmt = this.db!.prepare(`
        INSERT INTO files (fileId, name, client_path, server_path, mimeType, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        file.fileId,
        file.name,
        file.client_path,
        file.server_path,
        file.mimeType,
        now,
        now,
      );

      log.info(`文件记录已添加: ${file.fileId}`);
    } catch (error) {
      log.error(`添加文件记录失败 ${file.fileId}:`, error);
      throw error;
    }
  }

  public updateFile(
    fileId: string,
    updates: Partial<Omit<FileRecord, "fileId" | "created_at" | "updated_at">>,
  ): void {
    if (!this.ensureInitialized()) return;

    const updateFields = Object.entries(updates)
      .filter(([_, value]) => value !== undefined)
      .map(([key, _]) => `${key} = ?`)
      .join(", ");

    if (!updateFields) return;

    const now = new Date().toISOString();
    const values = [
      ...Object.entries(updates)
        .filter(([_, value]) => value !== undefined)
        .map(([_, value]) => value),
      now,
      fileId,
    ];

    try {
      const stmt = this.db!.prepare(`
        UPDATE files SET ${updateFields}, updated_at = ? WHERE fileId = ?
      `);

      const result = stmt.run(...values);
      log.info(`文件记录已更新: ${fileId}, 影响行数: ${result.changes}`);
    } catch (error) {
      log.error(`更新文件记录失败 ${fileId}:`, error);
      throw error;
    }
  }

  public deleteFile(fileId: string): void {
    if (!this.ensureInitialized()) return;

    try {
      const stmt = this.db!.prepare("DELETE FROM files WHERE fileId = ?");
      const result = stmt.run(fileId);
      log.info(`文件记录已删除: ${fileId}, 影响行数: ${result.changes}`);
    } catch (error) {
      log.error(`删除文件记录失败 ${fileId}:`, error);
      throw error;
    }
  }

  public getFile(fileId: string): FileRecord | null {
    if (!this.ensureInitialized()) return null;

    try {
      const stmt = this.db!.prepare("SELECT * FROM files WHERE fileId = ?");
      return (stmt.get(fileId) as FileRecord) || null;
    } catch (error) {
      log.error(`获取文件记录失败 ${fileId}:`, error);
      throw error;
    }
  }

  public getAllFiles(): FileRecord[] {
    if (!this.ensureInitialized()) return [];

    try {
      const stmt = this.db!.prepare(
        "SELECT * FROM files ORDER BY created_at DESC",
      );
      return stmt.all() as FileRecord[];
    } catch (error) {
      log.error("获取所有文件记录失败:", error);
      throw error;
    }
  }

  public close(): void {
    if (this.db) {
      try {
        this.db.close();
        this.db = null;
        log.info("数据库连接已关闭");
      } catch (error) {
        log.error("关闭数据库连接失败:", error);
      }
    }
  }

  // 添加一个事务方法，用于批量操作
  public transaction<T>(cb: (db: Database.Database) => T): T | null {
    if (!this.ensureInitialized()) return null;

    return this.db!.transaction(cb)(this.db!);
  }

  /**
   * 备份数据库
   * @param {string} backupPath - 备份文件路径
   * @returns {boolean} 是否备份成功
   */
  public backup(backupPath?: string): boolean {
    if (!this.ensureInitialized()) return false;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const targetPath =
        backupPath ||
        path.join(path.dirname(this.dbPath), `backup-${timestamp}-app.db`);

      this.db!.backup(targetPath);
      log.info(`数据库已备份至: ${targetPath}`);
      return true;
    } catch (error) {
      log.error("数据库备份失败:", error);
      return false;
    }
  }
}
