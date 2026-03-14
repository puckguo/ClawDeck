/**
 * 宠物心跳定时任务
 * 定期触发AI自主更新状态，类似于OpenClaw Agent的方式
 */

import { petAIService } from '../services/petAIService';
import { petService } from '../services/petService';

// 任务配置
interface HeartbeatConfig {
  enabled: boolean;
  intervalMinutes: number;  // 心跳间隔（分钟）
}

// 默认配置：每30分钟更新一次
const DEFAULT_CONFIG: HeartbeatConfig = {
  enabled: true,
  intervalMinutes: 30
};

export class PetHeartbeatJob {
  private static instance: PetHeartbeatJob;
  private intervalId: NodeJS.Timeout | null = null;
  private config: HeartbeatConfig = DEFAULT_CONFIG;
  private isRunning: boolean = false;
  private lastRunTime: Date | null = null;

  private constructor() {}

  static getInstance(): PetHeartbeatJob {
    if (!PetHeartbeatJob.instance) {
      PetHeartbeatJob.instance = new PetHeartbeatJob();
    }
    return PetHeartbeatJob.instance;
  }

  /**
   * 启动心跳任务
   */
  start(): void {
    if (this.intervalId) {
      console.log('[PetHeartbeat] Job already running');
      return;
    }

    if (!this.config.enabled) {
      console.log('[PetHeartbeat] Job is disabled');
      return;
    }

    console.log('[PetHeartbeat] Starting pet heartbeat job...');
    console.log(`[PetHeartbeat] Interval: ${this.config.intervalMinutes} minutes`);

    // 立即执行一次
    this.executeHeartbeat();

    // 设置定时器
    const intervalMs = this.config.intervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.executeHeartbeat();
    }, intervalMs);
  }

  /**
   * 停止心跳任务
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[PetHeartbeat] Job stopped');
    }
  }

  /**
   * 重新启动
   */
  restart(): void {
    this.stop();
    this.start();
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<HeartbeatConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[PetHeartbeat] Config updated:', this.config);
    this.restart();
  }

  /**
   * 获取配置
   */
  getConfig(): HeartbeatConfig {
    return { ...this.config };
  }

  /**
   * 执行心跳更新
   */
  private async executeHeartbeat(): Promise<void> {
    if (this.isRunning) {
      console.log('[PetHeartbeat] Previous heartbeat still running, skipping...');
      return;
    }

    this.isRunning = true;
    this.lastRunTime = new Date();

    console.log(`[PetHeartbeat] Executing heartbeat at ${this.lastRunTime.toISOString()}`);

    try {
      // 获取所有宠物
      const petSummaries = await petService.getPetSummaries();

      console.log(`[PetHeartbeat] Updating ${petSummaries.length} pets...`);

      for (const pet of petSummaries) {
        try {
          // 调用AI进行状态更新
          await petAIService.heartbeatUpdate(pet.agentId);
          console.log(`[PetHeartbeat] ✓ ${pet.agentId}: updated`);
        } catch (error) {
          console.error(`[PetHeartbeat] ✗ ${pet.agentId}: failed`, error);
        }

        // 添加小延迟，避免API限流
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`[PetHeartbeat] Heartbeat completed`);
    } catch (error) {
      console.error('[PetHeartbeat] Heartbeat execution failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 手动触发单个宠物的心跳更新
   */
  async triggerManualUpdate(agentId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    console.log(`[PetHeartbeat] Manual update triggered for ${agentId}`);

    try {
      await petAIService.heartbeatUpdate(agentId);
      return {
        success: true,
        message: '状态更新成功'
      };
    } catch (error) {
      return {
        success: false,
        message: `更新失败: ${error}`
      };
    }
  }

  /**
   * 获取任务状态
   */
  getStatus(): {
    isRunning: boolean;
    lastRunTime: string | null;
    config: HeartbeatConfig;
  } {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime?.toISOString() || null,
      config: this.config
    };
  }
}

// 导出单例
export const petHeartbeatJob = PetHeartbeatJob.getInstance();
