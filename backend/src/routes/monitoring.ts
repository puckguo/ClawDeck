/**
 * 监控数据路由
 */

import { Router } from 'express';
import { AgentMonitor } from '../services/agentMonitor';
import { AgentService } from '../services/agentService';

const router = Router();
const monitor = AgentMonitor.getInstance();
const agentService = AgentService.getInstance();

/**
 * GET /api/monitoring/status
 * 获取所有 Agent 状态摘要
 */
router.get('/status', async (req, res, next) => {
  try {
    const summary = await monitor.getStatusSummary();

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/monitoring/:agentId/realtime
 * 获取 Agent 实时状态
 */
router.get('/:agentId/realtime', async (req, res, next) => {
  try {
    const { agentId } = req.params;

    const agent = await agentService.getAgent(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`
      });
    }

    res.json({
      success: true,
      data: {
        agentId,
        status: agent.status,
        runtime: agent.runtimeInfo,
        channels: agent.channels,
        rooms: agent.currentRooms,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/monitoring/overview
 * 获取监控概览（用于仪表盘）
 */
router.get('/overview', async (req, res, next) => {
  try {
    const agents = await agentService.getAllAgents();
    const summary = await monitor.getStatusSummary();

    // 计算统计数据
    const totalAgents = agents.length;
    const runningAgents = agents.filter(a => a.status === 'running');

    // 渠道统计
    const feishuConnected = agents.filter(a => a.channels.feishu).length;
    const openClawChatConnected = agents.filter(a => a.channels.openClawChat).length;

    // 房间统计
    const totalRooms = agents.reduce((sum, a) => sum + a.currentRooms.length, 0);

    res.json({
      success: true,
      data: {
        agents: {
          total: totalAgents,
          running: summary.running,
          stopped: summary.stopped,
          error: summary.error
        },
        resources: {
          totalRooms
        },
        channels: {
          feishu: feishuConnected,
          openClawChat: openClawChatConnected
        },
        recentAlerts: [], // 可以从日志中提取
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as monitoringRoutes };
