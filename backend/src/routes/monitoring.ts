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
 * GET /api/monitoring/:agentId/metrics
 * 获取 Agent 监控指标
 */
router.get('/:agentId/metrics', async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { duration = '3600' } = req.query;

    const metrics = monitor.getMetricsHistory(agentId, parseInt(duration as string, 10));

    res.json({
      success: true,
      data: metrics,
      count: metrics.length
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

    // 获取最新指标
    const recentMetrics = monitor.getMetricsHistory(agentId, 300); // 最近5分钟
    const latestMetric = recentMetrics[recentMetrics.length - 1];

    res.json({
      success: true,
      data: {
        agentId,
        status: agent.status,
        runtime: agent.runtimeInfo,
        currentMetric: latestMetric || null,
        recentMetrics,
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

    // 资源使用统计
    const totalMemory = runningAgents.reduce((sum, a) => sum + (a.runtimeInfo?.memory || 0), 0);
    const avgCpu = runningAgents.length > 0
      ? runningAgents.reduce((sum, a) => sum + (a.runtimeInfo?.cpu || 0), 0) / runningAgents.length
      : 0;

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
          totalMemory: Math.round(totalMemory * 100) / 100,
          avgCpu: Math.round(avgCpu * 100) / 100,
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
