/**
 * Agent 管理路由
 */

import { Router } from 'express';
import { AgentService } from '../services/agentService';
import { createError } from '../middleware/errorHandler';

const router = Router();
const agentService = AgentService.getInstance();

/**
 * GET /api/agents/defaults/ai
 * 获取默认 AI 配置
 */
router.get('/defaults/ai', async (req, res, next) => {
  try {
    const defaultAI = await agentService.getDefaultAIConfig();
    res.json({
      success: true,
      data: defaultAI || {
        provider: 'deepseek',
        model: 'deepseek-chat',
        baseUrl: 'https://api.deepseek.com/v1'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/agents
 * 获取所有 Agent 列表
 */
router.get('/', async (req, res, next) => {
  try {
    const agents = await agentService.getAllAgents();
    res.json({
      success: true,
      data: agents,
      count: agents.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/agents
 * 创建新 Agent
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, displayName, emoji, role, feishu, openClawChat, skills, autoStart, ai } = req.body;

    if (!name) {
      throw createError('Agent name is required', 400, 'VALIDATION_ERROR');
    }

    const agent = await agentService.createAgent({
      name,
      displayName: displayName || name,
      emoji: emoji || '🐕',
      role,
      feishu,
      openClawChat,
      skills,
      ai
    });

    // 如果请求了自动启动，则启动Agent
    if (autoStart) {
      try {
        await agentService.startAgent(agent.id);
        // 重新获取Agent状态
        const updatedAgent = await agentService.getAgent(agent.id);
        res.status(201).json({
          success: true,
          data: updatedAgent || agent,
          message: `Agent ${agent.name} created and started successfully`
        });
        return;
      } catch (startError: any) {
        // 启动失败，但创建成功，返回警告信息
        res.status(201).json({
          success: true,
          data: agent,
          warning: `Agent created but failed to start: ${startError.message}`,
          message: `Agent ${agent.name} created successfully but failed to start`
        });
        return;
      }
    }

    res.status(201).json({
      success: true,
      data: agent,
      message: `Agent ${agent.name} created successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/agents/:id
 * 获取单个 Agent 详情
 */
router.get('/:id', async (req, res, next) => {
  try {
    const agent = await agentService.getAgent(req.params.id);

    if (!agent) {
      throw createError(`Agent ${req.params.id} not found`, 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/agents/:id
 * 更新 Agent 基础信息
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, displayName, emoji, role } = req.body;

    const agent = await agentService.updateAgent(req.params.id, {
      name,
      displayName,
      emoji,
      role
    });

    res.json({
      success: true,
      data: agent,
      message: `Agent ${agent.name} updated successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/agents/:id
 * 删除 Agent
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await agentService.deleteAgent(req.params.id);

    res.json({
      success: true,
      message: `Agent ${req.params.id} deleted successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/agents/:id/start
 * 启动 Agent
 */
router.post('/:id/start', async (req, res, next) => {
  try {
    await agentService.startAgent(req.params.id);

    res.json({
      success: true,
      message: `Agent ${req.params.id} started successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/agents/:id/stop
 * 停止 Agent
 */
router.post('/:id/stop', async (req, res, next) => {
  try {
    await agentService.stopAgent(req.params.id);

    res.json({
      success: true,
      message: `Agent ${req.params.id} stopped successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/agents/:id/restart
 * 重启 Agent
 */
router.post('/:id/restart', async (req, res, next) => {
  try {
    await agentService.restartAgent(req.params.id);

    res.json({
      success: true,
      message: `Agent ${req.params.id} restarted successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/agents/batch
 * 批量操作
 */
router.post('/batch', async (req, res, next) => {
  try {
    const { agentIds, operation } = req.body;

    if (!Array.isArray(agentIds) || agentIds.length === 0) {
      throw createError('agentIds must be a non-empty array', 400, 'VALIDATION_ERROR');
    }

    if (!['start', 'stop', 'restart'].includes(operation)) {
      throw createError('operation must be start, stop, or restart', 400, 'VALIDATION_ERROR');
    }

    const results = await agentService.batchOperation(agentIds, operation);

    res.json({
      success: true,
      data: results,
      message: `Batch ${operation} completed`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/agents/:id/versions
 * 获取配置版本历史
 */
router.get('/:id/versions', async (req, res, next) => {
  try {
    const versions = await agentService.getVersionHistory(req.params.id);

    res.json({
      success: true,
      data: versions,
      count: versions.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/agents/:id/versions/:versionId/restore
 * 恢复配置版本
 */
router.post('/:id/versions/:versionId/restore', async (req, res, next) => {
  try {
    await agentService.restoreVersion(req.params.id, req.params.versionId);

    res.json({
      success: true,
      message: `Configuration restored to version ${req.params.versionId}`
    });
  } catch (error) {
    next(error);
  }
});

export { router as agentRoutes };
