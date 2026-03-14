/**
 * 数据迁移脚本
 * 将文件系统中的宠物数据迁移到 SQLite 数据库
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { petDatabaseService } from '../services/petDatabaseService';
import { imageDatabaseService } from '../services/imageDatabaseService';
import { PetData } from '../../../shared/types';

const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || path.join(os.homedir(), '.openclaw');
const PETS_DIR = path.join(OPENCLAW_ROOT, 'pets');
const IMAGES_DIR = path.join(OPENCLAW_ROOT, 'images');

async function migratePets(): Promise<void> {
  console.log('[Migrate] Starting pet data migration...');

  if (!await fs.pathExists(PETS_DIR)) {
    console.log('[Migrate] No pets directory found, skipping.');
    return;
  }

  const entries = await fs.readdir(PETS_DIR, { withFileTypes: true });
  const petDirs = entries.filter(e => e.isDirectory()).map(e => e.name);

  console.log(`[Migrate] Found ${petDirs.length} pets to migrate.`);

  for (const agentId of petDirs) {
    try {
      const dataPath = path.join(PETS_DIR, agentId, 'pet-data.json');
      if (!await fs.pathExists(dataPath)) {
        console.log(`[Migrate] No data file for ${agentId}, skipping.`);
        continue;
      }

      const petData: PetData = await fs.readJson(dataPath);

      // 保存到数据库
      petDatabaseService.savePetStatus(agentId, petData.status);

      // 迁移互动记录
      if (petData.interactions?.length > 0) {
        for (const interaction of petData.interactions.slice(-50)) { // 只迁移最近50条
          petDatabaseService.addInteraction(agentId, interaction);
        }
      }

      // 迁移聊天记录
      if (petData.conversation?.messages?.length > 0) {
        for (const message of petData.conversation.messages.slice(-50)) {
          petDatabaseService.addChatMessage(agentId, message);
        }
      }

      console.log(`[Migrate] ✓ Migrated ${agentId}`);
    } catch (error) {
      console.error(`[Migrate] ✗ Failed to migrate ${agentId}:`, error);
    }
  }

  console.log('[Migrate] Pet data migration completed.');
}

async function migrateImages(): Promise<void> {
  console.log('[Migrate] Starting image migration...');

  const workspacesImagesDir = path.join(OPENCLAW_ROOT, 'workspaces');
  if (!await fs.pathExists(workspacesImagesDir)) {
    console.log('[Migrate] No workspaces images directory found, skipping.');
    return;
  }

  const agentDirs = await fs.readdir(workspacesImagesDir, { withFileTypes: true });

  for (const agentDir of agentDirs.filter(d => d.isDirectory())) {
    const agentId = agentDir.name;
    const imagesDir = path.join(workspacesImagesDir, agentId, 'images');

    if (!await fs.pathExists(imagesDir)) continue;

    const files = await fs.readdir(imagesDir);
    const pngFiles = files.filter(f => f.endsWith('.png'));

    for (const file of pngFiles) {
      try {
        const filePath = path.join(imagesDir, file);
        const stat = await fs.stat(filePath);

        // 解析文件名获取类型
        const imageType = file.startsWith('avatar') ? 'avatar' : 'status';

        // 检查是否有元数据文件
        const metadataPath = path.join(imagesDir, `${file}.json`);
        let metadata: any = {};
        if (await fs.pathExists(metadataPath)) {
          metadata = await fs.readJson(metadataPath);
        }

        // 移动图片到新的位置
        const newAgentDir = path.join(IMAGES_DIR, agentId);
        await fs.ensureDir(newAgentDir);
        const newFileName = `${imageType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
        const newPath = path.join(newAgentDir, newFileName);
        await fs.copy(filePath, newPath);

        // 保存到数据库
        imageDatabaseService.saveImageRecord({
          agentId,
          imageType,
          prompt: metadata.prompt || `Migrated ${imageType} image`,
          localPath: path.join(agentId, newFileName),
          url: metadata.url || '',
          fileSize: stat.size,
          width: 1024,
          height: 1024,
          isActive: true
        });

        console.log(`[Migrate] ✓ Migrated image ${file} for ${agentId}`);
      } catch (error) {
        console.error(`[Migrate] ✗ Failed to migrate image ${file}:`, error);
      }
    }
  }

  console.log('[Migrate] Image migration completed.');
}

export async function runMigration(): Promise<void> {
  console.log('[Migrate] Starting data migration to SQLite...');
  await migratePets();
  await migrateImages();
  console.log('[Migrate] Migration completed successfully!');
}

// 如果直接运行此脚本
if (require.main === module) {
  runMigration().catch(console.error);
}
