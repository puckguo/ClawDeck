/**
 * 图片数据库服务
 * 管理宠物生成图片的元数据
 */

import { db } from './databaseService';

export interface ImageRecord {
  id: number;
  agentId: string;
  imageType: 'avatar' | 'status';
  prompt: string;
  localPath: string;
  url?: string;
  fileSize: number;
  width: number;
  height: number;
  isActive: boolean;
  createdAt: string;
}

export class ImageDatabaseService {
  private static instance: ImageDatabaseService;

  private constructor() {}

  static getInstance(): ImageDatabaseService {
    if (!ImageDatabaseService.instance) {
      ImageDatabaseService.instance = new ImageDatabaseService();
    }
    return ImageDatabaseService.instance;
  }

  /**
   * 保存图片记录
   */
  saveImageRecord(record: Omit<ImageRecord, 'id' | 'createdAt'>): number {
    const stmt = db.prepare(`
      INSERT INTO pet_images (agent_id, image_type, prompt, local_path, url, file_size, width, height, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      record.agentId,
      record.imageType,
      record.prompt,
      record.localPath,
      record.url || '',
      record.fileSize,
      record.width,
      record.height,
      record.isActive ? 1 : 0
    );

    return result.lastInsertRowid as number;
  }

  /**
   * 获取最新的图片
   */
  getLatestImage(agentId: string, imageType: 'avatar' | 'status'): ImageRecord | null {
    const stmt = db.prepare(`
      SELECT * FROM pet_images
      WHERE agent_id = ? AND image_type = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const row = stmt.get(agentId, imageType) as any;
    return row ? this.rowToRecord(row) : null;
  }

  /**
   * 获取所有图片
   */
  getAllImages(agentId: string): ImageRecord[] {
    const stmt = db.prepare(`
      SELECT * FROM pet_images
      WHERE agent_id = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(agentId) as any[];
    return rows.map(row => this.rowToRecord(row));
  }

  /**
   * 获取特定类型的所有图片
   */
  getImagesByType(agentId: string, imageType: 'avatar' | 'status'): ImageRecord[] {
    const stmt = db.prepare(`
      SELECT * FROM pet_images
      WHERE agent_id = ? AND image_type = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(agentId, imageType) as any[];
    return rows.map(row => this.rowToRecord(row));
  }

  /**
   * 设置图片为非活跃（保留历史但不用作显示）
   */
  deactivateImage(id: number): void {
    const stmt = db.prepare('UPDATE pet_images SET is_active = 0 WHERE id = ?');
    stmt.run(id);
  }

  /**
   * 删除图片记录
   */
  deleteImage(id: number): void {
    const stmt = db.prepare('DELETE FROM pet_images WHERE id = ?');
    stmt.run(id);
  }

  /**
   * 获取图片统计
   */
  getImageStats(agentId: string): { total: number; avatarCount: number; statusCount: number } {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN image_type = 'avatar' THEN 1 ELSE 0 END) as avatar_count,
        SUM(CASE WHEN image_type = 'status' THEN 1 ELSE 0 END) as status_count
      FROM pet_images
      WHERE agent_id = ?
    `);

    const result = stmt.get(agentId) as any;
    return {
      total: result.total || 0,
      avatarCount: result.avatar_count || 0,
      statusCount: result.status_count || 0
    };
  }

  /**
   * 行数据转换为记录对象
   */
  private rowToRecord(row: any): ImageRecord {
    return {
      id: row.id,
      agentId: row.agent_id,
      imageType: row.image_type,
      prompt: row.prompt,
      localPath: row.local_path,
      url: row.url,
      fileSize: row.file_size,
      width: row.width,
      height: row.height,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at
    };
  }
}

// 导出单例
export const imageDatabaseService = ImageDatabaseService.getInstance();
