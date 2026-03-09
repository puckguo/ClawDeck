/**
 * Agent 监控服务
 * 定期监控所有 Agent 的状态和资源使用情况
 */

import { EventEmitter } from 'events';
import cron from 'node-cron';
import { AgentService } from './agentService';
import type { MonitoringMetrics, AgentStatus } from '../types';

export class AgentMonitor extends EventEmitter {
  private static instance: AgentMonitor;
  private agentService: AgentService;
  private monitorTask?: cron.ScheduledTask;
  private metricsHistory: Map<string, MonitoringMetrics[]> = new Map();
  private readonly maxHistorySize = 100;

  private constructor() {
    super();
    this.agentService = AgentService.getInstance();
  }

  static getInstance(): AgentMonitor {
    if (!AgentMonitor.instance) {
      AgentMonitor.instance = new AgentMonitor();
    }
    return AgentMonitor.instance;
  }

  /**
   * 启动监控
   */
  start(): void {
    // 每 5 秒监控一次
    this.monitorTask = cron.schedule('*/5 * * * * *', async () => {
      await this.checkAllAgents();
    });

    console.log('[Monitor] Agent monitoring started');
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (this.monitorTask) {
      this.monitorTask.stop();
      this.monitorTask = undefined;
    }
    console.log('[Monitor] Agent monitoring stopped');
  }

  /**
   * 检查所有 Agent
   */
  private async checkAllAgents(): Promise<void> {
    try {
      const agents = await this.agentService.getAllAgents();

      for (const agent of agents) {
        const previousStatus = agent.status;

        // 刷新状态
        const refreshedAgent = await this.agentService.getAgent(agent.id);
        if (!refreshedAgent) continue;

        // 状态变更检测
        if (previousStatus !== refreshedAgent.status) {
          this.emit('statusChange', {
            agentId: agent.id,
            from: previousStatus,
            to: refreshedAgent.status,
            timestamp: new Date().toISOString()
          });
        }

        // 收集指标
        if (refreshedAgent.status === 'running' && refreshedAgent.runtimeInfo) {
          const metrics: MonitoringMetrics = {
            agentId: agent.id,
            timestamp: new Date().toISOString(),
            cpu: refreshedAgent.runtimeInfo.cpu || 0,
            memory: refreshedAgent.runtimeInfo.memory || 0
          };

          this.addMetrics(agent.id, metrics);
        }
      }
    } catch (error) {
      console.error('[Monitor] Failed to check agents:', error);
    }
  }

  /**
   * 添加指标到历史
   */
  private addMetrics(agentId: string, metrics: MonitoringMetrics): void {
    if (!this.metricsHistory.has(agentId)) {
      this.metricsHistory.set(agentId, []);
    }

    const history = this.metricsHistory.get(agentId)!;
    history.push(metrics);

    // 限制历史大小
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  /**
   * 获取指标历史
   */
  getMetricsHistory(agentId: string, duration: number = 3600): MonitoringMetrics[] {
    const history = this.metricsHistory.get(agentId) || [];
    const cutoff = Date.now() - duration * 1000;

    return history.filter(m => new Date(m.timestamp).getTime() > cutoff);
  }

  /**
   * 获取所有 Agent 的当前状态摘要
   */
  async getStatusSummary(): Promise<{
    total: number;
    running: number;
    stopped: number;
    error: number;
    configuring: number;
  }> {
    const agents = await this.agentService.getAllAgents();

    return {
      total: agents.length,
      running: agents.filter(a => a.status === 'running').length,
      stopped: agents.filter(a => a.status === 'stopped').length,
      error: agents.filter(a => a.status === 'error').length,
      configuring: agents.filter(a => a.status === 'configuring').length
    };
  }
}
