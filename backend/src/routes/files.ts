/**
 * 文件管理路由 - 用于管理 MD 配置文件
 * 支持从 agents/{agentId} 和 workspaces/{agentId} 两个目录读取
 */

import { Router } from 'express';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { createError } from '../middleware/errorHandler';

const router = Router();

const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || path.join(os.homedir(), '.openclaw');
const AGENTS_DIR = path.join(OPENCLAW_ROOT, 'agents');
const WORKSPACES_DIR = path.join(OPENCLAW_ROOT, 'workspaces');

interface MdFileInfo {
  path: string;
  name: string;
  relativePath: string;
  displayPath: string;
  category: string;
  size: number;
  modifiedAt: string;
  source: 'agent' | 'workspace';
}

/**
 * GET /api/files/:agentId
 * 获取 Agent 的所有 MD 文件列表（从 agents 和 workspaces 两个目录）
 */
router.get('/:agentId', async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const agentDir = path.join(AGENTS_DIR, agentId);
    const workspaceDir = path.join(WORKSPACES_DIR, agentId);

    if (!await fs.pathExists(agentDir)) {
      throw createError(`Agent ${agentId} not found`, 404, 'NOT_FOUND');
    }

    // 递归查找所有 MD 文件
    const findMdFiles = async (
      dir: string,
      baseDir: string,
      source: 'agent' | 'workspace'
    ): Promise<MdFileInfo[]> => {
      const files: MdFileInfo[] = [];

      if (!await fs.pathExists(dir)) {
        return files;
      }

      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);

        // 跳过隐藏目录和备份目录
        if (entry.isDirectory() && (
          entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === '.backups' ||
          entry.name === '.trash'
        )) {
          continue;
        }

        if (entry.isDirectory()) {
          files.push(...await findMdFiles(fullPath, baseDir, source));
        } else if (entry.name.endsWith('.md')) {
          const stats = await fs.stat(fullPath);
          const category = getFileCategory(entry.name, relativePath, source);

          // 构建显示路径
          const displayPath = source === 'workspace'
            ? `workspaces/${agentId}/${relativePath}`
            : `agents/${agentId}/${relativePath}`;

          files.push({
            path: fullPath,
            name: entry.name,
            relativePath,
            displayPath,
            category,
            size: stats.size,
            modifiedAt: stats.mtime.toISOString(),
            source
          });
        }
      }

      return files;
    };

    // 从两个目录查找文件
    const agentFiles = await findMdFiles(agentDir, agentDir, 'agent');
    const workspaceFiles = await findMdFiles(workspaceDir, workspaceDir, 'workspace');

    // 合并文件列表
    const allFiles = [...agentFiles, ...workspaceFiles];

    // 按类别分组
    const grouped = allFiles.reduce((acc, file) => {
      if (!acc[file.category]) {
        acc[file.category] = [];
      }
      acc[file.category].push(file);
      return acc;
    }, {} as Record<string, MdFileInfo[]>);

    // 对每个分组内的文件按优先级排序
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => {
        // 核心文件按 PRIORITY_FILES 顺序排序
        if (category === '核心文件') {
          const aIndex = PRIORITY_FILES.indexOf(a.name);
          const bIndex = PRIORITY_FILES.indexOf(b.name);
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
        }
        // 其他按名称排序
        return a.name.localeCompare(b.name);
      });
    });

    res.json({
      success: true,
      data: {
        files: allFiles,
        grouped,
        total: allFiles.length,
        agentDir: `agents/${agentId}`,
        workspaceDir: `workspaces/${agentId}`
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/files/:agentId/content
 * 获取 MD 文件内容
 */
router.get('/:agentId/content', async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { filePath, source } = req.query;

    if (!filePath) {
      throw createError('File path is required', 400, 'BAD_REQUEST');
    }

    // 确定文件所在目录
    let baseDir: string;
    if (source === 'workspace') {
      baseDir = path.join(WORKSPACES_DIR, agentId);
    } else {
      baseDir = path.join(AGENTS_DIR, agentId);
    }

    const fullPath = path.join(baseDir, filePath as string);

    // 安全检查：确保文件在指定目录内
    if (!fullPath.startsWith(baseDir)) {
      throw createError('Invalid file path', 403, 'FORBIDDEN');
    }

    if (!await fs.pathExists(fullPath)) {
      throw createError('File not found', 404, 'NOT_FOUND');
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    const stats = await fs.stat(fullPath);

    res.json({
      success: true,
      data: {
        path: filePath,
        fullPath: fullPath.replace(OPENCLAW_ROOT, '~/.openclaw'),
        content,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        source: source || 'agent'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/files/:agentId/content
 * 更新 MD 文件内容（自动备份）
 */
router.put('/:agentId/content', async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { filePath, content, backup = true, source = 'agent' } = req.body;

    if (!filePath || content === undefined) {
      throw createError('File path and content are required', 400, 'BAD_REQUEST');
    }

    // 确定文件所在目录
    let baseDir: string;
    let backupBaseDir: string;
    if (source === 'workspace') {
      baseDir = path.join(WORKSPACES_DIR, agentId);
      backupBaseDir = path.join(WORKSPACES_DIR, agentId, '.backups');
    } else {
      baseDir = path.join(AGENTS_DIR, agentId);
      backupBaseDir = path.join(AGENTS_DIR, agentId, '.backups');
    }

    const fullPath = path.join(baseDir, filePath as string);

    // 安全检查
    if (!fullPath.startsWith(baseDir)) {
      throw createError('Invalid file path', 403, 'FORBIDDEN');
    }

    // 确保目录存在
    await fs.ensureDir(path.dirname(fullPath));

    // 备份原文件
    if (backup && await fs.pathExists(fullPath)) {
      await fs.ensureDir(backupBaseDir);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${path.basename(filePath)}.${timestamp}.bak`;
      const backupPath = path.join(backupBaseDir, backupFileName);
      await fs.copy(fullPath, backupPath);

      console.log(`[Files] Backed up ${filePath} to ${backupPath}`);
    }

    // 写入新内容
    await fs.writeFile(fullPath, content, 'utf-8');

    // 更新 openclaw.json 的 lastTouchedAt
    const configPath = path.join(AGENTS_DIR, agentId, 'openclaw.json');
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJson(configPath);
      config.meta = config.meta || {};
      config.meta.lastTouchedAt = new Date().toISOString();
      await fs.writeJson(configPath, config, { spaces: 2 });
    }

    res.json({
      success: true,
      message: 'File saved successfully',
      backupCreated: backup && await fs.pathExists(fullPath)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/files/:agentId/create
 * 创建新的 MD 文件
 */
router.post('/:agentId/create', async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { filePath, content = '', source = 'agent' } = req.body;

    if (!filePath) {
      throw createError('File path is required', 400, 'BAD_REQUEST');
    }

    // 确定文件所在目录
    let baseDir: string;
    if (source === 'workspace') {
      baseDir = path.join(WORKSPACES_DIR, agentId);
    } else {
      baseDir = path.join(AGENTS_DIR, agentId);
    }

    const fullPath = path.join(baseDir, filePath as string);

    // 安全检查
    if (!fullPath.startsWith(baseDir)) {
      throw createError('Invalid file path', 403, 'FORBIDDEN');
    }

    // 检查文件是否已存在
    if (await fs.pathExists(fullPath)) {
      throw createError('File already exists', 409, 'CONFLICT');
    }

    // 确保是 MD 文件
    if (!filePath.endsWith('.md')) {
      throw createError('Only .md files are allowed', 400, 'BAD_REQUEST');
    }

    // 确保目录存在
    await fs.ensureDir(path.dirname(fullPath));

    // 写入内容
    await fs.writeFile(fullPath, content, 'utf-8');

    res.json({
      success: true,
      message: 'File created successfully',
      data: {
        path: filePath,
        fullPath: fullPath.replace(OPENCLAW_ROOT, '~/.openclaw'),
        source
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/files/:agentId
 * 删除 MD 文件（移动到回收站）
 */
router.delete('/:agentId', async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { filePath, source = 'agent' } = req.query;

    if (!filePath) {
      throw createError('File path is required', 400, 'BAD_REQUEST');
    }

    // 确定文件所在目录
    let baseDir: string;
    let trashBaseDir: string;
    if (source === 'workspace') {
      baseDir = path.join(WORKSPACES_DIR, agentId);
      trashBaseDir = path.join(WORKSPACES_DIR, agentId, '.trash');
    } else {
      baseDir = path.join(AGENTS_DIR, agentId);
      trashBaseDir = path.join(AGENTS_DIR, agentId, '.trash');
    }

    const fullPath = path.join(baseDir, filePath as string);

    // 安全检查
    if (!fullPath.startsWith(baseDir)) {
      throw createError('Invalid file path', 403, 'FORBIDDEN');
    }

    if (!await fs.pathExists(fullPath)) {
      throw createError('File not found', 404, 'NOT_FOUND');
    }

    // 备份到回收站
    await fs.ensureDir(trashBaseDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const trashFileName = `${path.basename(filePath as string)}.${timestamp}`;
    const trashPath = path.join(trashBaseDir, trashFileName);
    await fs.move(fullPath, trashPath);

    res.json({
      success: true,
      message: 'File moved to trash',
      data: {
        trashPath: trashPath.replace(OPENCLAW_ROOT, '~/.openclaw')
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/files/:agentId/backups
 * 获取文件的备份列表
 */
router.get('/:agentId/backups', async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { filePath, source = 'agent' } = req.query;

    let backupDir: string;
    if (source === 'workspace') {
      backupDir = path.join(WORKSPACES_DIR, agentId, '.backups');
    } else {
      backupDir = path.join(AGENTS_DIR, agentId, '.backups');
    }

    if (!await fs.pathExists(backupDir)) {
      return res.json({
        success: true,
        data: { backups: [] }
      });
    }

    // 如果指定了文件路径，只返回该文件的备份
    let backupFiles: string[] = [];
    const allFiles = await fs.readdir(backupDir);

    if (filePath) {
      const baseName = path.basename(filePath as string);
      backupFiles = allFiles.filter(f => f.startsWith(baseName + '.'));
    } else {
      backupFiles = allFiles;
    }

    const backups = await Promise.all(
      backupFiles.map(async (fileName) => {
        const filePath = path.join(backupDir, fileName);
        const stats = await fs.stat(filePath);
        return {
          name: fileName,
          path: filePath.replace(OPENCLAW_ROOT, '~/.openclaw'),
          size: stats.size,
          createdAt: stats.birthtime.toISOString()
        };
      })
    );

    // 按创建时间倒序
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      data: { backups }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/files/:agentId/restore
 * 从备份恢复文件
 */
router.post('/:agentId/restore', async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { filePath, backupName, source = 'agent' } = req.body;

    if (!filePath || !backupName) {
      throw createError('File path and backup name are required', 400, 'BAD_REQUEST');
    }

    let baseDir: string;
    let backupDir: string;
    if (source === 'workspace') {
      baseDir = path.join(WORKSPACES_DIR, agentId);
      backupDir = path.join(WORKSPACES_DIR, agentId, '.backups');
    } else {
      baseDir = path.join(AGENTS_DIR, agentId);
      backupDir = path.join(AGENTS_DIR, agentId, '.backups');
    }

    const fullPath = path.join(baseDir, filePath as string);
    const backupPath = path.join(backupDir, backupName as string);

    // 安全检查
    if (!fullPath.startsWith(baseDir) || !backupPath.startsWith(backupDir)) {
      throw createError('Invalid file path', 403, 'FORBIDDEN');
    }

    if (!await fs.pathExists(backupPath)) {
      throw createError('Backup not found', 404, 'NOT_FOUND');
    }

    // 备份当前文件
    if (await fs.pathExists(fullPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const currentBackupPath = path.join(backupDir, `${path.basename(filePath)}.${timestamp}.bak`);
      await fs.copy(fullPath, currentBackupPath);
    }

    // 恢复备份
    await fs.copy(backupPath, fullPath);

    res.json({
      success: true,
      message: 'File restored successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 核心 MD 文件列表（优先级排序）
 */
const PRIORITY_FILES = [
  'SOUL.md',
  'IDENTITY.md',
  'AGENTS.md',
  'TOOLS.md',
  'USER.md',
  'BOOTSTRAP.md',
  'HEARTBEAT.md',
  'CRON.md',
  'MEMORY.md',
  'memory.md'
];

/**
 * 检查文件是否为核心配置文件
 */
export function isPriorityFile(fileName: string): boolean {
  return PRIORITY_FILES.includes(fileName);
}

/**
 * 获取文件类别
 */
function getFileCategory(fileName: string, relativePath: string, source: string): string {
  const lowerName = fileName.toLowerCase();
  const lowerPath = relativePath.toLowerCase();

  // 核心配置文件（在 workspaces 中）
  if (source === 'workspace') {
    if (lowerName === 'soul.md') return '核心文件';
    if (lowerName === 'identity.md') return '核心文件';
    if (lowerName === 'agents.md') return '核心文件';
    if (lowerName === 'tools.md') return '核心文件';
    if (lowerName === 'user.md') return '核心文件';
    if (lowerName === 'bootstrap.md') return '核心文件';
    if (lowerName === 'heartbeat.md') return '核心文件';
    if (lowerName === 'cron.md') return '核心文件';
    if (lowerName === 'memory.md') return '核心文件';
  }

  // agents 目录下的文件
  if (lowerName === 'memory.md') return '核心文件';
  if (lowerPath.includes('skill')) return '其他文件';
  if (lowerPath.includes('tools')) return '其他文件';

  return '其他文件';
}

export { router as fileRoutes };
