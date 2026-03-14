/**
 * 每日评估定时任务
 * 每天自动分析agent记忆文件变化并奖励宠物
 */

import { memoryAnalysisService } from '../services/memoryAnalysisService';
import { petAIService } from '../services/petAIService';

// 任务配置
interface JobConfig {
  enabled: boolean;
  scheduleTime: string;  // 24小时制，格式: "HH:mm"
  timezone: string;
}

// 默认配置：每天凌晨3点执行
const DEFAULT_CONFIG: JobConfig = {
  enabled: true,
  scheduleTime: "03:00",
  timezone: "Asia/Shanghai"
};

export class DailyEvaluationJob {
  private static instance: DailyEvaluationJob;
  private timeoutId: NodeJS.Timeout | null = null;
  private config: JobConfig = DEFAULT_CONFIG;
  private isRunning: boolean = false;
  private lastRunDate: string | null = null;

  private constructor() {}

  static getInstance(): DailyEvaluationJob {
    if (!DailyEvaluationJob.instance) {
      DailyEvaluationJob.instance = new DailyEvaluationJob();
    }
    return DailyEvaluationJob.instance;
  }

  /**
   * 启动定时任务
   */
  start(): void {
    if (this.timeoutId) {
      console.log('[DailyEvaluationJob] Job already scheduled');
      return;
    }

    if (!this.config.enabled) {
      console.log('[DailyEvaluationJob] Job is disabled');
      return;
    }

    console.log('[DailyEvaluationJob] Starting daily evaluation job...');
    console.log(`[DailyEvaluationJob] Scheduled time: ${this.config.scheduleTime}`);

    this.scheduleNextRun();
  }

  /**
   * 停止定时任务
   */
  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      console.log('[DailyEvaluationJob] Job stopped');
    }
  }

  /**
   * 重新启动（配置更新后）
   */
  restart(): void {
    this.stop();
    this.start();
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<JobConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[DailyEvaluationJob] Config updated:', this.config);
    this.restart();
  }

  /**
   * 获取配置
   */
  getConfig(): JobConfig {
    return { ...this.config };
  }

  /**
   * 计算下次运行时间
   */
  private getNextRunTime(): Date {
    const now = new Date();
    const [hours, minutes] = this.config.scheduleTime.split(':').map(Number);

    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    // 如果今天的时间已过，设置为明天
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun;
  }

  /**
   * 安排下次执行
   */
  private scheduleNextRun(): void {
    const nextRun = this.getNextRunTime();
    const delay = nextRun.getTime() - Date.now();

    console.log(`[DailyEvaluationJob] Next run scheduled at: ${nextRun.toISOString()}`);
    console.log(`[DailyEvaluationJob] Delay: ${Math.round(delay / 1000 / 60)} minutes`);

    this.timeoutId = setTimeout(() => {
      this.executeJob();
    }, delay);
  }

  /**
   * 执行评估任务
   */
  private async executeJob(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // 防止重复执行
    if (this.lastRunDate === today) {
      console.log('[DailyEvaluationJob] Already ran today, skipping...');
      this.scheduleNextRun();
      return;
    }

    if (this.isRunning) {
      console.log('[DailyEvaluationJob] Job is already running, skipping...');
      return;
    }

    this.isRunning = true;
    this.lastRunDate = today;

    console.log(`[DailyEvaluationJob] Starting daily evaluation at ${new Date().toISOString()}`);

    try {
      // 执行批量评估
      const result = await memoryAnalysisService.evaluateAllPets();

      console.log(`[DailyEvaluationJob] Evaluation completed:`);
      console.log(`  - Total pets: ${result.total}`);
      console.log(`  - Success: ${result.success}`);
      console.log(`  - Failed: ${result.failed}`);

      // 打印详细信息
      for (const item of result.results) {
        if (item.success) {
          console.log(`  ✓ ${item.agentId}: ${item.message}`);
        } else {
          console.log(`  ✗ ${item.agentId}: ${item.message}`);
        }
      }

      // 尝试向高活跃度宠物发送消息
      await this.sendDailySummary(result);

    } catch (error) {
      console.error('[DailyEvaluationJob] Job execution failed:', error);
    } finally {
      this.isRunning = false;
      this.scheduleNextRun();
    }
  }

  /**
   * 发送每日总结消息
   */
  private async sendDailySummary(result: {
    total: number;
    success: number;
    failed: number;
    results: Array<{ agentId: string; success: boolean; message: string }>;
  }): Promise<void> {
    for (const item of result.results) {
      if (item.success) {
        try {
          // 解析消息中的活跃度评分
          const scoreMatch = item.message.match(/活跃度评分: (\d+)分/);
          const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

          // 只有活跃度较高的宠物才发送消息
          if (score >= 60) {
            let message = '';
            if (score >= 90) {
              message = `主人！今天我们一起工作了好多呢！我的活跃度评分是${score}分，是最棒的一天！谢谢你一直陪着我！❤️`;
            } else if (score >= 80) {
              message = `今天和主人一起度过了很充实的一天呢！活跃度评分${score}分，我很开心！`;
            } else {
              message = `今天也和主人一起努力了呢！活跃度评分${score}分，明天也要一起加油哦！`;
            }

            // 可选：保存为系统消息（实际实现中可以通过推送通知）
            console.log(`[DailyEvaluationJob] Would send to ${item.agentId}: ${message}`);
          }
        } catch (error) {
          // 忽略消息发送错误
        }
      }
    }
  }

  /**
   * 手动触发评估（用于测试或API调用）
   */
  async triggerManualEvaluation(agentId?: string): Promise<{
    success: boolean;
    message: string;
    details?: unknown;
  }> {
    console.log(`[DailyEvaluationJob] Manual evaluation triggered for ${agentId || 'all pets'}`);

    try {
      if (agentId) {
        // 评估单个宠物
        const result = await memoryAnalysisService.performDailyEvaluation(agentId);
        return {
          success: result.success,
          message: result.message,
          details: result.analysis
        };
      } else {
        // 评估所有宠物
        const result = await memoryAnalysisService.evaluateAllPets();
        return {
          success: true,
          message: `评估完成: ${result.success}/${result.total} 成功`,
          details: result
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `评估失败: ${error}`
      };
    }
  }

  /**
   * 获取任务状态
   */
  getStatus(): {
    isRunning: boolean;
    lastRunDate: string | null;
    nextRunTime: string | null;
    config: JobConfig;
  } {
    const nextRun = this.timeoutId ? this.getNextRunTime().toISOString() : null;

    return {
      isRunning: this.isRunning,
      lastRunDate: this.lastRunDate,
      nextRunTime: nextRun,
      config: this.config
    };
  }
}

// 导出单例
export const dailyEvaluationJob = DailyEvaluationJob.getInstance();
