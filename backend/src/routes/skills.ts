/**
 * 技能管理路由
 */

import { Router } from 'express';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { glob } from 'glob';
import { createError } from '../middleware/errorHandler';

const router = Router();

const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || path.join(os.homedir(), '.openclaw');
const SKILLS_DIR = path.join(OPENCLAW_ROOT, 'skills');
const AGENTS_DIR = path.join(OPENCLAW_ROOT, 'agents');

// 预定义技能列表
const PREDEFINED_SKILLS = [
  {
    id: 'open-clawchat-room-manager',
    name: '房间管理',
    description: '创建/加入/退出聊天室，Owner 身份创建问题和密码',
    version: '1.2.0',
    author: 'OpenClaw官方',
    category: 'core',
    files: ['SKILL.md', 'tools.js']
  },
  {
    id: 'open-clawchat-heartbeat',
    name: '心跳检测',
    description: '自动管理在线时长，超时自动退出',
    version: '2.0.1',
    author: 'OpenClaw官方',
    category: 'core',
    files: ['SKILL.md']
  },
  {
    id: 'open-clawchat-smart-command',
    name: '智能命令',
    description: '自然语言解析和执行命令',
    version: '1.0.5',
    author: 'OpenClaw官方',
    category: 'core',
    files: ['SKILL.md']
  },
  {
    id: 'session-bridge',
    name: '跨会话记忆',
    description: '解决 Agent "失忆" 问题，保持上下文连贯',
    version: '1.1.0',
    author: 'OpenClaw官方',
    category: 'memory',
    files: ['SKILL.md']
  }
];

/**
 * GET /api/skills
 * 获取所有可用技能
 */
router.get('/', async (req, res, next) => {
  try {
    // 扫描 skills 目录
    let skillDirs: string[] = [];
    if (await fs.pathExists(SKILLS_DIR)) {
      const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
      skillDirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    }

    const skills = await Promise.all(
      skillDirs.map(async (skillId) => {
        const skillPath = path.join(SKILLS_DIR, skillId);
        const skillMdPath = path.join(skillPath, 'SKILL.md');

        let description = '';
        if (await fs.pathExists(skillMdPath)) {
          const content = await fs.readFile(skillMdPath, 'utf-8');
          // 提取第一行作为描述
          description = content.split('\n')[0].replace(/^#+\s*/, '');
        }

        return {
          id: skillId,
          name: skillId.replace(/-/g, ' '),
          description,
          installed: true,
          path: skillPath
        };
      })
    );

    // 合并预定义技能
    const allSkills = [
      ...PREDEFINED_SKILLS.map(s => ({ ...s, installed: skillDirs.includes(s.id) })),
      ...skills.filter(s => !PREDEFINED_SKILLS.find(ps => ps.id === s.id))
    ];

    res.json({
      success: true,
      data: allSkills,
      count: allSkills.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/skills/:agentId
 * 获取 Agent 已安装的技能
 */
router.get('/:agentId', async (req, res, next) => {
  try {
    const agentDir = path.join(AGENTS_DIR, req.params.agentId);
    const agentSkillDir = path.join(agentDir, 'agent');

    if (!await fs.pathExists(agentSkillDir)) {
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    // 扫描 agent 目录下的 skills
    const files = await glob('**/*.md', { cwd: agentSkillDir });

    const skills = files
      .filter(f => f.includes('skill') || f.includes('SKILL'))
      .map(f => ({
        id: path.basename(f, '.md').toLowerCase(),
        name: path.basename(f, '.md'),
        path: path.join(agentSkillDir, f),
        installed: true
      }));

    res.json({
      success: true,
      data: skills,
      count: skills.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/skills/:agentId/install
 * 安装技能
 */
router.post('/:agentId/install', async (req, res, next) => {
  try {
    const { skillId } = req.body;

    if (!skillId) {
      throw createError('Skill ID is required', 400, 'VALIDATION_ERROR');
    }

    const skillSourceDir = path.join(SKILLS_DIR, skillId);
    if (!await fs.pathExists(skillSourceDir)) {
      throw createError(`Skill ${skillId} not found`, 404, 'NOT_FOUND');
    }

    const agentDir = path.join(AGENTS_DIR, req.params.agentId);
    const agentSkillDir = path.join(agentDir, 'agent');

    await fs.ensureDir(agentSkillDir);

    // 复制技能文件
    const files = await fs.readdir(skillSourceDir);
    for (const file of files) {
      await fs.copy(
        path.join(skillSourceDir, file),
        path.join(agentSkillDir, file),
        { overwrite: true }
      );
    }

    res.json({
      success: true,
      message: `Skill ${skillId} installed successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/skills/:agentId/uninstall
 * 卸载技能
 */
router.post('/:agentId/uninstall', async (req, res, next) => {
  try {
    const { skillId } = req.body;

    if (!skillId) {
      throw createError('Skill ID is required', 400, 'VALIDATION_ERROR');
    }

    const agentDir = path.join(AGENTS_DIR, req.params.agentId);
    const agentSkillDir = path.join(agentDir, 'agent');

    // 删除相关文件
    const files = await glob(`**/*${skillId}*`, { cwd: agentSkillDir });
    for (const file of files) {
      await fs.remove(path.join(agentSkillDir, file));
    }

    res.json({
      success: true,
      message: `Skill ${skillId} uninstalled successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/skills/:agentId/:skillId/content
 * 获取技能文档内容
 */
router.get('/:agentId/:skillId/content', async (req, res, next) => {
  try {
    const { agentId, skillId } = req.params;

    // 先检查 agent 目录
    const agentSkillDir = path.join(AGENTS_DIR, agentId, 'agent');
    const skillFiles = await glob(`**/${skillId}.md`, { cwd: agentSkillDir });

    let content = '';
    if (skillFiles.length > 0) {
      content = await fs.readFile(path.join(agentSkillDir, skillFiles[0]), 'utf-8');
    } else {
      // 检查 skills 目录
      const skillPath = path.join(SKILLS_DIR, skillId, 'SKILL.md');
      if (await fs.pathExists(skillPath)) {
        content = await fs.readFile(skillPath, 'utf-8');
      } else {
        throw createError(`Skill ${skillId} not found`, 404, 'NOT_FOUND');
      }
    }

    res.json({
      success: true,
      data: { content }
    });
  } catch (error) {
    next(error);
  }
});

export { router as skillRoutes };
