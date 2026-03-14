/**
 * 宠物养成系统路由
 */

import { Router } from 'express';
import { petService } from '../services/petService';
import { petAIService } from '../services/petAIService';
import { createError } from '../middleware/errorHandler';
import type { InteractionType, CreatePetRequest } from '../../../shared/types';

const router = Router();

/**
 * GET /api/pets
 * 获取所有宠物摘要列表
 */
router.get('/', async (req, res, next) => {
  try {
    const summaries = await petService.getPetSummaries();
    res.json({
      success: true,
      data: summaries,
      count: summaries.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/pets
 * 创建新宠物
 */
router.post('/', async (req, res, next) => {
  try {
    const { agentId, name, eggType } = req.body as CreatePetRequest;

    if (!agentId || !name) {
      throw createError('agentId and name are required', 400, 'VALIDATION_ERROR');
    }

    // 检查是否已存在
    const existingPet = await petService.getPetData(agentId);
    if (existingPet) {
      throw createError(`Pet for agent ${agentId} already exists`, 409, 'ALREADY_EXISTS');
    }

    const petData = await petService.createPet(agentId, name, eggType);

    res.status(201).json({
      success: true,
      data: petData,
      message: `Pet ${name} created successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pets/:agentId
 * 获取宠物完整数据
 */
router.get('/:agentId', async (req, res, next) => {
  try {
    const petData = await petService.getPetData(req.params.agentId);

    if (!petData) {
      throw createError(`Pet for agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: petData
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pets/:agentId/status
 * 获取宠物当前状态（含离线衰减计算）
 */
router.get('/:agentId/status', async (req, res, next) => {
  try {
    const status = await petService.getPetStatus(req.params.agentId);

    if (!status) {
      throw createError(`Pet for agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/pets/:agentId/interact
 * 与宠物互动
 */
router.post('/:agentId/interact', async (req, res, next) => {
  try {
    const { type, data } = req.body;

    if (!type) {
      throw createError('Interaction type is required', 400, 'VALIDATION_ERROR');
    }

    const validTypes: InteractionType[] = [
      'feed', 'play', 'train', 'sleep', 'chat', 'pet', 'clean', 'gift', 'adventure', 'treat'
    ];

    if (!validTypes.includes(type)) {
      throw createError(`Invalid interaction type: ${type}`, 400, 'VALIDATION_ERROR');
    }

    const result = await petService.interact(req.params.agentId, type, data);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/pets/:agentId/wake
 * 唤醒宠物
 */
router.post('/:agentId/wake', async (req, res, next) => {
  try {
    const status = await petService.wakeUp(req.params.agentId);

    if (!status) {
      throw createError(`Pet for agent ${req.params.agentId} not found or not sleeping`, 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: status,
      message: 'Pet woke up'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/pets/:agentId/chat
 * 与宠物对话
 */
router.post('/:agentId/chat', async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      throw createError('Message is required', 400, 'VALIDATION_ERROR');
    }

    const response = await petAIService.chat(req.params.agentId, { message });

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pets/:agentId/chat/history
 * 获取对话历史
 */
router.get('/:agentId/chat/history', async (req, res, next) => {
  try {
    const petData = await petService.getPetData(req.params.agentId);

    if (!petData) {
      throw createError(`Pet for agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const messages = petData.conversation.messages.slice(-limit);

    res.json({
      success: true,
      data: messages,
      count: messages.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pets/:agentId/interactions
 * 获取互动历史
 */
router.get('/:agentId/interactions', async (req, res, next) => {
  try {
    const petData = await petService.getPetData(req.params.agentId);

    if (!petData) {
      throw createError(`Pet for agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const interactions = petData.interactions.slice(0, limit);

    res.json({
      success: true,
      data: interactions,
      count: interactions.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pets/:agentId/tasks
 * 获取每日任务
 */
router.get('/:agentId/tasks', async (req, res, next) => {
  try {
    const petData = await petService.getPetData(req.params.agentId);

    if (!petData) {
      throw createError(`Pet for agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: petData.dailyTasks
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/pets/:agentId/login
 * 处理每日登录
 */
router.post('/:agentId/login', async (req, res, next) => {
  try {
    const petData = await petService.handleDailyLogin(req.params.agentId);

    if (!petData) {
      throw createError(`Pet for agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        pet: petData,
        consecutiveDays: petData.status.consecutiveLoginDays,
        message: `Welcome back! ${petData.status.consecutiveLoginDays} consecutive days!`
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pets/:agentId/achievements
 * 获取成就列表
 */
router.get('/:agentId/achievements', async (req, res, next) => {
  try {
    const petData = await petService.getPetData(req.params.agentId);

    if (!petData) {
      throw createError(`Pet for agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: petData.achievements
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pets/:agentId/inventory
 * 获取物品栏
 */
router.get('/:agentId/inventory', async (req, res, next) => {
  try {
    const petData = await petService.getPetData(req.params.agentId);

    if (!petData) {
      throw createError(`Pet for agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: petData.inventory
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pets/:agentId/evolution
 * 获取进化信息
 */
router.get('/:agentId/evolution', async (req, res, next) => {
  try {
    const petData = await petService.getPetData(req.params.agentId);

    if (!petData) {
      throw createError(`Pet for agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        currentStage: petData.status.stage,
        currentBranch: petData.currentBranch,
        evolutionPoints: petData.status.evolutionPoints,
        branches: petData.evolutionBranches,
        appearance: petData.appearance
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pets/:agentId/stats
 * 获取宠物统计信息
 */
router.get('/:agentId/stats', async (req, res, next) => {
  try {
    const stats = await petService.getPetStats(req.params.agentId);

    if (!stats) {
      throw createError(`Pet for agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pets/:agentId/event
 * 获取随机事件
 */
router.get('/:agentId/event', async (req, res, next) => {
  try {
    const event = await petService.generateRandomEvent(req.params.agentId);

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/pets/:agentId
 * 删除宠物
 */
router.delete('/:agentId', async (req, res, next) => {
  try {
    const fs = await import('fs-extra');
    const path = await import('path');
    const os = await import('os');

    const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || path.join(os.homedir(), '.openclaw');
    const PETS_DIR = path.join(OPENCLAW_ROOT, 'pets');
    const petDir = path.join(PETS_DIR, req.params.agentId);

    if (!(await fs.pathExists(petDir))) {
      throw createError(`Pet for agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    await fs.remove(petDir);

    res.json({
      success: true,
      message: `Pet for agent ${req.params.agentId} deleted successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/pets/:agentId/images/generate
 * 生成宠物图片（形象图或状态图）
 */
router.post('/:agentId/images/generate', async (req, res, next) => {
  try {
    const { type = 'status' } = req.body;

    if (!['avatar', 'status'].includes(type)) {
      throw createError('Type must be "avatar" or "status"', 400, 'VALIDATION_ERROR');
    }

    const petData = await petService.getPetData(req.params.agentId);
    if (!petData) {
      throw createError(`Pet for agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    let result;
    if (type === 'avatar') {
      result = await petAIService.generatePetAvatar(req.params.agentId, petData);
    } else {
      result = await petAIService.generatePetStatusImage(req.params.agentId, petData);
    }

    if (!result.success) {
      throw createError(result.error || 'Image generation failed', 500, 'GENERATION_ERROR');
    }

    res.json({
      success: true,
      data: result,
      message: `${type === 'avatar' ? 'Avatar' : 'Status'} image generated successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pets/:agentId/images
 * 获取宠物所有图片信息
 */
router.get('/:agentId/images', async (req, res, next) => {
  try {
    const images = await petAIService.getPetImages(req.params.agentId);

    res.json({
      success: true,
      data: images
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pets/:agentId/images/latest
 * 获取最新的状态图片
 */
router.get('/:agentId/images/latest', async (req, res, next) => {
  try {
    const { imageGenerationService } = await import('../services/imageGenerationService');
    const latestPath = await imageGenerationService.getLatestImage(req.params.agentId, 'status');

    if (!latestPath) {
      throw createError('No image found', 404, 'NOT_FOUND');
    }

    res.sendFile(latestPath);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pets/:agentId/images/file/:filename
 * 获取指定图片文件
 */
router.get('/:agentId/images/file/:filename', async (req, res, next) => {
  try {
    const path = await import('path');
    const os = await import('os');
    const fs = await import('fs-extra');

    const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || path.join(os.homedir(), '.openclaw');
    const IMAGES_DIR = path.join(OPENCLAW_ROOT, 'images');
    const filePath = path.join(IMAGES_DIR, req.params.agentId, req.params.filename);

    if (!await fs.pathExists(filePath)) {
      throw createError('Image file not found', 404, 'NOT_FOUND');
    }

    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/pets/:agentId/tts
 * 将宠物回复转换为语音
 */
router.post('/:agentId/tts', async (req, res, next) => {
  try {
    const { text, voice } = req.body;

    if (!text) {
      throw createError('Text is required', 400, 'VALIDATION_ERROR');
    }

    const petData = await petService.getPetData(req.params.agentId);
    if (!petData) {
      throw createError(`Pet for agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    // 使用传入的音色或根据性格选择默认音色
    const { ttsService } = await import('../services/ttsService');
    const personalityType = petData.status?.personality?.type || 'cheerful';
    const selectedVoice = voice || ttsService.getDefaultVoice(personalityType);

    const result = await ttsService.textToSpeech(
      text,
      req.params.agentId,
      selectedVoice
    );

    if (!result.success) {
      throw createError(result.error || 'TTS generation failed', 500, 'TTS_ERROR');
    }

    res.json({
      success: true,
      data: result,
      message: 'TTS generated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pets/:agentId/tts/voices
 * 获取可用的TTS音色列表
 */
router.get('/:agentId/tts/voices', async (req, res, next) => {
  try {
    const { ttsService } = await import('../services/ttsService');
    const petData = await petService.getPetData(req.params.agentId);

    const voices = ttsService.getVoices();
    const defaultVoice = petData
      ? ttsService.getDefaultVoice(petData.status.personality.type)
      : 'Cherry';

    res.json({
      success: true,
      data: {
        voices,
        defaultVoice,
        currentVoice: req.query.voice as string || defaultVoice
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pets/:agentId/tts/latest
 * 获取最新的TTS音频文件
 */
router.get('/:agentId/tts/latest', async (req, res, next) => {
  try {
    const { ttsService } = await import('../services/ttsService');
    const latestPath = await ttsService.getLatestAudio(req.params.agentId);

    if (!latestPath) {
      throw createError('No TTS audio found', 404, 'NOT_FOUND');
    }

    res.sendFile(latestPath);
  } catch (error) {
    next(error);
  }
});

export { router as petRoutes };
