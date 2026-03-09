/**
 * 配置管理路由
 */

import { Router } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { AgentService } from '../services/agentService';
import { createError } from '../middleware/errorHandler';
import type { OpenClawConfig } from '../types';

const router = Router();
const agentService = AgentService.getInstance();

const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || '/Users/godspeed/.openclaw';
const AGENTS_DIR = path.join(OPENCLAW_ROOT, 'agents');

/**
 * GET /api/config/:agentId
 * 获取 Agent 完整配置
 */
router.get('/:agentId', async (req, res, next) => {
  try {
    const config = await agentService.getAgentConfig(req.params.agentId);

    if (!config) {
      throw createError(`Agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/config/:agentId
 * 更新 Agent 完整配置
 */
router.put('/:agentId', async (req, res, next) => {
  try {
    const configPath = path.join(AGENTS_DIR, req.params.agentId, 'openclaw.json');

    if (!await fs.pathExists(configPath)) {
      throw createError(`Agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    // 备份当前配置
    const currentConfig = await fs.readJson(configPath);
    await agentService['saveVersion'](req.params.agentId, currentConfig);

    // 更新配置
    const newConfig: OpenClawConfig = {
      ...req.body,
      meta: {
        ...req.body.meta,
        lastTouchedAt: new Date().toISOString()
      }
    };

    await fs.writeJson(configPath, newConfig, { spaces: 2 });

    res.json({
      success: true,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/config/:agentId/channels
 * 更新渠道配置
 */
router.patch('/:agentId/channels', async (req, res, next) => {
  try {
    const config = await agentService.getAgentConfig(req.params.agentId);

    if (!config) {
      throw createError(`Agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    // 备份
    await agentService['saveVersion'](req.params.agentId, config);

    // 更新渠道配置
    const { feishu, openClawChat } = req.body;

    if (feishu) {
      config.channels.feishu = { ...config.channels.feishu, ...feishu };
    }

    if (openClawChat) {
      config.channels['open-clawchat'] = { ...config.channels['open-clawchat'], ...openClawChat };
    }

    config.meta.lastTouchedAt = new Date().toISOString();

    const configPath = path.join(AGENTS_DIR, req.params.agentId, 'openclaw.json');
    await fs.writeJson(configPath, config, { spaces: 2 });

    res.json({
      success: true,
      message: 'Channel configuration updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/config/:agentId/gateway
 * 更新 Gateway 配置
 */
router.patch('/:agentId/gateway', async (req, res, next) => {
  try {
    const config = await agentService.getAgentConfig(req.params.agentId);

    if (!config) {
      throw createError(`Agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    // 备份
    await agentService['saveVersion'](req.params.agentId, config);

    // 更新 gateway 配置
    config.gateway = { ...config.gateway, ...req.body };
    config.meta.lastTouchedAt = new Date().toISOString();

    const configPath = path.join(AGENTS_DIR, req.params.agentId, 'openclaw.json');
    await fs.writeJson(configPath, config, { spaces: 2 });

    res.json({
      success: true,
      message: 'Gateway configuration updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/config/:agentId/validate
 * 验证配置
 */
router.post('/:agentId/validate', async (req, res, next) => {
  try {
    const config: OpenClawConfig = req.body;
    const errors: string[] = [];

    // 基础验证
    if (!config.agents?.list?.[0]) {
      errors.push('Missing agent information');
    }

    if (!config.gateway?.port) {
      errors.push('Missing gateway port');
    }

    if (!config.channels?.feishu && !config.channels?.['open-clawchat']) {
      errors.push('At least one channel must be configured');
    }

    // 端口范围验证
    if (config.gateway?.port) {
      const port = config.gateway.port;
      if (port < 1024 || port > 65535) {
        errors.push('Gateway port must be between 1024 and 65535');
      }
    }

    res.json({
      success: errors.length === 0,
      data: {
        valid: errors.length === 0,
        errors
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/config/:agentId/export
 * 导出配置
 */
router.post('/:agentId/export', async (req, res, next) => {
  try {
    const config = await agentService.getAgentConfig(req.params.agentId);

    if (!config) {
      throw createError(`Agent ${req.params.agentId} not found`, 404, 'NOT_FOUND');
    }

    const exportData = {
      agentId: req.params.agentId,
      exportedAt: new Date().toISOString(),
      version: config.meta.lastTouchedVersion,
      config
    };

    res.setHeader('Content-Disposition', `attachment; filename="${req.params.agentId}-config.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    next(error);
  }
});

export { router as configRoutes };
