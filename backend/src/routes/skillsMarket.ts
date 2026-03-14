/**
 * Skills Market 路由
 * 提供 Skill 搜索、安装和管理 API
 */

import { Router } from 'express';
import { SkillsMarketService } from '../services/skillsMarketService';
import type { SkillInstallRequest } from '../types';

const router = Router();
const skillsService = SkillsMarketService.getInstance();

/**
 * POST /api/skills-market/token
 * 设置 ClawHub Token
 */
router.post('/token', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    skillsService.setClawhubToken(token);

    res.json({
      success: true,
      message: 'ClawHub token updated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update token'
    });
  }
});

/**
 * GET /api/skills-market/skills
 * 获取 Skills 列表（从 ClawHub）
 */
router.get('/skills', async (req, res, next) => {
  try {
    const { limit = '50', sort = 'updated', cursor } = req.query;

    const result = await skillsService.fetchSkillsFromClawHub(
      parseInt(limit as string, 10),
      sort as string,
      cursor as string | undefined
    );

    res.json({
      success: true,
      data: result.skills,
      pagination: {
        nextCursor: result.nextCursor
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/skills-market/skills/:slug
 * 获取 Skill 详情
 */
router.get('/skills/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const skill = await skillsService.getSkillDetail(slug);

    res.json({
      success: true,
      data: skill
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/skills-market/search
 * 基础关键词搜索
 */
router.post('/search', async (req, res, next) => {
  try {
    const { query, limit = 20 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    const skills = await skillsService.searchSkills(query, limit);

    res.json({
      success: true,
      data: skills,
      total: skills.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/skills-market/install
 * 安装 Skill
 */
router.post('/install', async (req, res, next) => {
  try {
    const request: SkillInstallRequest = req.body;

    if (!request.slug) {
      return res.status(400).json({
        success: false,
        error: 'Skill slug is required'
      });
    }

    const result = await skillsService.installSkill(request);

    if (result.success) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/skills-market/install/batch
 * 批量安装 Skills
 */
router.post('/install/batch', async (req, res, next) => {
  try {
    const { slugs, targetAgentId }: { slugs: string[]; targetAgentId?: string } = req.body;

    if (!slugs || !Array.isArray(slugs) || slugs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Skill slugs array is required'
      });
    }

    const results = await Promise.all(
      slugs.map(slug =>
        skillsService.installSkill({ slug, targetAgentId })
      )
    );

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;

    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: slugs.length,
          success: successCount,
          failed: failedCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/skills-market/installed
 * 获取已安装的 Skills
 */
router.get('/installed', async (req, res, next) => {
  try {
    const { agentId } = req.query;
    const skills = await skillsService.getInstalledSkills(agentId as string | undefined);

    res.json({
      success: true,
      data: skills
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/skills-market/installed/:slug
 * 卸载 Skill
 */
router.delete('/installed/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { agentId } = req.query;

    const success = await skillsService.uninstallSkill(slug, agentId as string | undefined);

    if (success) {
      res.json({
        success: true,
        message: `Skill ${slug} uninstalled successfully`
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Skill ${slug} not found`
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/skills-market/categories
 * 获取 Skill 分类列表
 */
router.get('/categories', async (req, res) => {
  // 预定义的分类列表
  const categories = [
    { id: 'automation', name: '自动化', description: '任务自动化和流程处理' },
    { id: 'communication', name: '通讯', description: '消息、邮件、通知相关' },
    { id: 'data', name: '数据处理', description: '数据分析、转换、存储' },
    { id: 'integration', name: '集成', description: '第三方服务集成' },
    { id: 'utility', name: '工具', description: '实用工具和辅助功能' },
    { id: 'ai', name: 'AI', description: '人工智能相关功能' },
    { id: 'dev', name: '开发', description: '开发工具和环境' },
    { id: 'security', name: '安全', description: '安全和审计相关' }
  ];

  res.json({
    success: true,
    data: categories
  });
});

export default router;
