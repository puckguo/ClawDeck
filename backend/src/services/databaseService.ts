/**
 * SQLite 数据库服务
 * 管理宠物状态和图片的持久化存储
 */

import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';

const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || path.join(os.homedir(), '.openclaw');
const DB_DIR = path.join(OPENCLAW_ROOT, 'database');
const DB_PATH = path.join(DB_DIR, 'openclaw.db');

// 确保数据库目录存在
fs.ensureDirSync(DB_DIR);

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database.Database;

  private constructor() {
    this.db = new Database(DB_PATH);
    this.initTables();
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  getDb(): Database.Database {
    return this.db;
  }

  /**
   * 初始化数据库表
   */
  private initTables(): void {
    // 宠物状态表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pet_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT DEFAULT '',
        stage TEXT DEFAULT 'egg',
        level INTEGER DEFAULT 0,
        experience INTEGER DEFAULT 0,
        experience_to_next INTEGER DEFAULT 100,
        hunger INTEGER DEFAULT 80,
        happiness INTEGER DEFAULT 70,
        energy INTEGER DEFAULT 100,
        health INTEGER DEFAULT 100,
        cleanliness INTEGER DEFAULT 100,
        intelligence INTEGER DEFAULT 10,
        affection INTEGER DEFAULT 20,
        strength INTEGER DEFAULT 10,
        agility INTEGER DEFAULT 10,
        personality_type TEXT DEFAULT 'cheerful',
        personality_traits TEXT DEFAULT '{}',
        mood TEXT DEFAULT 'content',
        is_sleeping INTEGER DEFAULT 0,
        is_sick INTEGER DEFAULT 0,
        evolution_points INTEGER DEFAULT 0,
        thought TEXT DEFAULT '',
        born_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_fed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_played_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_trained_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_slept_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_interaction_at TEXT DEFAULT CURRENT_TIMESTAMP,
        total_play_time INTEGER DEFAULT 0,
        consecutive_login_days INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 宠物外观表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pet_appearance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT UNIQUE NOT NULL,
        base_form TEXT DEFAULT 'egg',
        color TEXT DEFAULT '#FFD700',
        unlocked_forms TEXT DEFAULT '["egg"]',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES pet_status(agent_id) ON DELETE CASCADE
      );
    `);

    // 互动记录表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pet_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        interaction_type TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        data TEXT DEFAULT '{}',
        effects TEXT DEFAULT '[]',
        note TEXT DEFAULT '',
        FOREIGN KEY (agent_id) REFERENCES pet_status(agent_id) ON DELETE CASCADE
      );
    `);

    // 聊天记录表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pet_chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        emotional_tone TEXT DEFAULT '',
        effects TEXT DEFAULT '[]',
        FOREIGN KEY (agent_id) REFERENCES pet_status(agent_id) ON DELETE CASCADE
      );
    `);

    // 图片表 - 存储生成的图片信息
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pet_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        image_type TEXT NOT NULL,
        prompt TEXT NOT NULL,
        local_path TEXT NOT NULL,
        url TEXT DEFAULT '',
        file_size INTEGER DEFAULT 0,
        width INTEGER DEFAULT 0,
        height INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES pet_status(agent_id) ON DELETE CASCADE
      );
    `);

    // 每日任务表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pet_daily_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        task_type TEXT NOT NULL,
        description TEXT NOT NULL,
        target_count INTEGER DEFAULT 1,
        current_count INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        reward TEXT DEFAULT '{}',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES pet_status(agent_id) ON DELETE CASCADE
      );
    `);

    // 成就表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pet_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        achievement_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        target_progress INTEGER DEFAULT 100,
        unlocked INTEGER DEFAULT 0,
        unlocked_at TEXT,
        reward TEXT DEFAULT '{}',
        FOREIGN KEY (agent_id) REFERENCES pet_status(agent_id) ON DELETE CASCADE
      );
    `);

    // 物品栏表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pet_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT DEFAULT '',
        quantity INTEGER DEFAULT 0,
        rarity TEXT DEFAULT 'common',
        effects TEXT DEFAULT '[]',
        FOREIGN KEY (agent_id) REFERENCES pet_status(agent_id) ON DELETE CASCADE
      );
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_pet_interactions_agent_id ON pet_interactions(agent_id);
      CREATE INDEX IF NOT EXISTS idx_pet_chat_messages_agent_id ON pet_chat_messages(agent_id);
      CREATE INDEX IF NOT EXISTS idx_pet_images_agent_id ON pet_images(agent_id);
      CREATE INDEX IF NOT EXISTS idx_pet_images_type ON pet_images(agent_id, image_type);
    `);

    console.log('[Database] Tables initialized successfully');
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.db.close();
  }
}

// 导出单例
export const databaseService = DatabaseService.getInstance();
export const db: Database.Database = databaseService.getDb();
