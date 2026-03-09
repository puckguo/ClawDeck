/**
 * 聊天室管理路由
 */

import { Router } from 'express';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AgentService } from '../services/agentService';
import { createError } from '../middleware/errorHandler';
import type { OpenClawConfig, JoinRoomRequest } from '../types';

const router = Router();
const agentService = AgentService.getInstance();
const execAsync = promisify(exec);

const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || path.join(os.homedir(), '.openclaw');
const AGENTS_DIR = path.join(OPENCLAW_ROOT, 'agents');

/**
 * GET /api/rooms/:agentId
 * 获取 Agent 的聊天室列表
 */
router.get('/:agentId', async (req, res, next) => {
  try {
    const config = await agentService.getAgentConfig(req.params.agentId);

    if (!config) {
      throw createError(`Agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    const rooms = config.channels?.['open-clawchat']?.rooms || [];

    res.json({
      success: true,
      data: rooms.map(roomId => ({
        roomId,
        joinedAt: null, // 可以从日志中获取
        isOwner: false  // 需要查询 rooms 文件
      })),
      count: rooms.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/rooms/:agentId/join
 * 加入聊天室
 */
router.post('/:agentId/join', async (req, res, next) => {
  try {
    const { roomId, answer, duration = 30 }: JoinRoomRequest = req.body;

    if (!roomId) {
      throw createError('Room ID is required', 400, 'VALIDATION_ERROR');
    }

    const config = await agentService.getAgentConfig(req.params.agentId);

    if (!config) {
      throw createError(`Agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    // 备份
    await agentService['saveVersion'](req.params.agentId, config);

    // 添加到房间列表
    const rooms = config.channels?.['open-clawchat']?.rooms || [];
    if (!rooms.includes(roomId)) {
      rooms.push(roomId);
      config.channels['open-clawchat'].rooms = rooms;

      const configPath = path.join(AGENTS_DIR, req.params.agentId, 'openclaw.json');
      await fs.writeJson(configPath, config, { spaces: 2 });
    }

    res.json({
      success: true,
      message: `Joined room ${roomId} successfully`,
      data: { roomId, duration }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/rooms/:agentId/leave
 * 退出聊天室
 */
router.post('/:agentId/leave', async (req, res, next) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      throw createError('Room ID is required', 400, 'VALIDATION_ERROR');
    }

    const config = await agentService.getAgentConfig(req.params.agentId);

    if (!config) {
      throw createError(`Agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    // 备份
    await agentService['saveVersion'](req.params.agentId, config);

    // 从房间列表移除
    const rooms = config.channels?.['open-clawchat']?.rooms || [];
    const index = rooms.indexOf(roomId);

    if (index > -1) {
      rooms.splice(index, 1);
      config.channels['open-clawchat'].rooms = rooms;

      const configPath = path.join(AGENTS_DIR, req.params.agentId, 'openclaw.json');
      await fs.writeJson(configPath, config, { spaces: 2 });
    }

    res.json({
      success: true,
      message: `Left room ${roomId} successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/rooms/:agentId/create
 * 创建新房间（作为 Owner）
 */
router.post('/:agentId/create', async (req, res, next) => {
  try {
    const { roomName } = req.body;

    const crypto = await import('crypto');

    // 生成随机房间名
    const generateRoomName = () => {
      const adjectives = ['快乐', '智慧', '勇敢', '温柔', '聪明', '活泼', '安静', '热情'];
      const nouns = ['小屋', '空间', '天地', '角落', '世界', '房间', '乐园', '基地'];
      const randomNum = Math.floor(Math.random() * 1000);
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      return `${adj}${noun}${randomNum}`;
    };

    const generatePassword = (length = 12) => {
      return crypto.randomBytes(length).toString('base64').slice(0, length);
    };

    const generateQuestion = () => {
      const questions = [
        '你最喜欢的一本书是什么？',
        '你童年最难忘的记忆是什么？',
        '如果你能拥有一种超能力，你希望是什么？',
        '你最想去旅行的地方是哪里？',
        '你最喜欢的季节是什么，为什么？',
        '你人生中最重要的教训是什么？',
        '你最喜欢的电影是哪一部？',
        '如果你可以和任何人共进晚餐，你会选择谁？'
      ];
      return questions[Math.floor(Math.random() * questions.length)];
    };

    const newRoomId = roomName || generateRoomName();
    const question = generateQuestion();
    const password = generatePassword();

    // 先加入房间
    const config = await agentService.getAgentConfig(req.params.agentId);
    if (!config) {
      throw createError(`Agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    const rooms = config.channels?.['open-clawchat']?.rooms || [];
    if (!rooms.includes(newRoomId)) {
      rooms.push(newRoomId);
      config.channels['open-clawchat'].rooms = rooms;

      const configPath = path.join(AGENTS_DIR, req.params.agentId, 'openclaw.json');
      await fs.writeJson(configPath, config, { spaces: 2 });
    }

    // 保存房间信息
    const roomsInfoPath = path.join(AGENTS_DIR, req.params.agentId, 'open-clawchat-rooms.json');
    let roomsInfo: Record<string, any> = {};
    if (await fs.pathExists(roomsInfoPath)) {
      roomsInfo = await fs.readJson(roomsInfoPath);
    }

    roomsInfo[newRoomId] = {
      roomId: newRoomId,
      question,
      password,
      isOwner: true,
      createdAt: new Date().toISOString()
    };

    await fs.writeJson(roomsInfoPath, roomsInfo, { spaces: 2 });

    res.json({
      success: true,
      message: `Room ${newRoomId} created successfully`,
      data: {
        roomId: newRoomId,
        question,
        password,
        isOwner: true
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as roomRoutes };
