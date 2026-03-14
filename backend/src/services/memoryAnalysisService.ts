/**
 * Agent记忆文件分析服务
 * 分析agent工作区的记忆文件变化，评估活跃度并奖励宠物
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { petService } from './petService';

const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || path.join(os.homedir(), '.openclaw');
const WORKSPACES_DIR = path.join(OPENCLAW_ROOT, 'workspaces');
const PETS_DIR = path.join(OPENCLAW_ROOT, 'pets');

// 记忆文件追踪数据
interface MemoryFileTracker {
  lastContent: string;
  lastSize: number;
  lastModified: string;
  dailyStats: Record<string, {
    additions: number;      // 新增字符数
    deletions: number;      // 删除字符数
    modifications: number;  // 修改次数
    newMemories: number;    // 新增记忆条目数
  }>;
}

// 记忆文件分析结果
interface MemoryAnalysisResult {
  agentId: string;
  date: string;
  filesAnalyzed: string[];
  totalNewContent: number;     // 总新增内容（字符）
  totalNewMemories: number;    // 总新增记忆条目
  interactionCount: number;    // 互动次数（估算）
  activityScore: number;       // 活跃度评分 (0-100)
  rewards: {
    affection: number;         // 好感度奖励
    experience: number;        // 经验值奖励
    happiness: number;         // 心情奖励
  };
  details: {
    fileChanges: Array<{
      filename: string;
      sizeDelta: number;
      newEntries: number;
    }>;
    highlights: string[];      // 亮点摘要
  };
}

// 记忆文件路径配置
const MEMORY_FILES = [
  'MEMORY.md',           // 工作记忆
  'memory.md',           // 长期记忆
  'conversations.md',    // 对话记录
  'context.md',          // 上下文记忆
  'user-profile.md',     // 用户画像
  'interactions.md',     // 互动记录
];

export class MemoryAnalysisService {
  private static instance: MemoryAnalysisService;
  private fileTrackers: Map<string, MemoryFileTracker> = new Map();

  private constructor() {}

  static getInstance(): MemoryAnalysisService {
    if (!MemoryAnalysisService.instance) {
      MemoryAnalysisService.instance = new MemoryAnalysisService();
    }
    return MemoryAnalysisService.instance;
  }

  /**
   * 获取追踪文件路径
   */
  private getTrackerPath(agentId: string): string {
    return path.join(PETS_DIR, agentId, 'memory-tracker.json');
  }

  /**
   * 加载追踪数据
   */
  private async loadTracker(agentId: string): Promise<MemoryFileTracker | null> {
    try {
      const trackerPath = this.getTrackerPath(agentId);
      if (await fs.pathExists(trackerPath)) {
        return await fs.readJson(trackerPath);
      }
    } catch (error) {
      console.error(`Failed to load tracker for ${agentId}:`, error);
    }
    return null;
  }

  /**
   * 保存追踪数据
   */
  private async saveTracker(agentId: string, tracker: MemoryFileTracker): Promise<void> {
    try {
      const trackerPath = this.getTrackerPath(agentId);
      await fs.writeJson(trackerPath, tracker, { spaces: 2 });
    } catch (error) {
      console.error(`Failed to save tracker for ${agentId}:`, error);
    }
  }

  /**
   * 分析agent的记忆文件变化
   */
  async analyzeAgentMemory(agentId: string): Promise<MemoryAnalysisResult | null> {
    const workspaceDir = path.join(WORKSPACES_DIR, agentId);

    // 检查工作区是否存在
    if (!await fs.pathExists(workspaceDir)) {
      console.log(`Workspace not found for agent ${agentId}`);
      return null;
    }

    const today = new Date().toISOString().split('T')[0];
    const tracker = await this.loadTracker(agentId) || {
      lastContent: '',
      lastSize: 0,
      lastModified: new Date(0).toISOString(),
      dailyStats: {}
    };

    // 初始化今日统计
    if (!tracker.dailyStats[today]) {
      tracker.dailyStats[today] = {
        additions: 0,
        deletions: 0,
        modifications: 0,
        newMemories: 0
      };
    }

    const todayStats = tracker.dailyStats[today];
    const fileChanges: Array<{ filename: string; sizeDelta: number; newEntries: number }> = [];
    const highlights: string[] = [];

    // 分析每个记忆文件
    for (const filename of MEMORY_FILES) {
      const filePath = path.join(workspaceDir, filename);

      if (!await fs.pathExists(filePath)) {
        continue;
      }

      try {
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const currentSize = content.length;
        const lastModified = stats.mtime.toISOString();

        // 如果文件被修改过
        if (lastModified > tracker.lastModified) {
          const sizeDelta = currentSize - tracker.lastSize;

          // 统计新增记忆条目（通过检测特定模式）
          const newEntries = this.countNewMemories(content, tracker.lastContent);

          todayStats.additions += Math.max(0, sizeDelta);
          todayStats.deletions += Math.max(0, -sizeDelta);
          todayStats.modifications++;
          todayStats.newMemories += newEntries;

          fileChanges.push({
            filename,
            sizeDelta,
            newEntries
          });

          // 生成亮点
          if (newEntries > 0) {
            highlights.push(`在 ${filename} 中记录了 ${newEntries} 条新记忆`);
          }

          // 更新追踪器
          tracker.lastContent = content;
          tracker.lastSize = currentSize;
          tracker.lastModified = lastModified;
        }
      } catch (error) {
        console.error(`Failed to analyze ${filename} for ${agentId}:`, error);
      }
    }

    // 保存追踪数据
    await this.saveTracker(agentId, tracker);

    // 计算活跃度评分
    const activityScore = this.calculateActivityScore(todayStats);

    // 计算奖励
    const rewards = this.calculateRewards(todayStats, activityScore);

    return {
      agentId,
      date: today,
      filesAnalyzed: fileChanges.map(f => f.filename),
      totalNewContent: todayStats.additions,
      totalNewMemories: todayStats.newMemories,
      interactionCount: this.estimateInteractions(todayStats),
      activityScore,
      rewards,
      details: {
        fileChanges,
        highlights: highlights.length > 0 ? highlights : ['今天没有新的记忆产生']
      }
    };
  }

  /**
   * 统计新增记忆条目数
   * 通过检测时间戳或分隔符来识别新的记忆条目
   */
  private countNewMemories(currentContent: string, lastContent: string): number {
    if (!lastContent) {
      // 首次分析，估算记忆条目数
      return this.estimateMemoryEntries(currentContent);
    }

    // 计算内容差异
    const currentLines = currentContent.split('\n');
    const lastLines = lastContent.split('\n');

    // 统计新增行数中包含记忆标记的行
    let newEntries = 0;
    const memoryPatterns = [
      /^\d{4}[-/]\d{2}[-/]\d{2}/,  // 日期格式 2024-01-01
      /^\[\d{4}/,                    // [2024-01-01]
      /^##?\s/,                      // Markdown标题
      /^- \*\*/,                     // 列表项加粗
      /^记忆\d+[:：]/,               // 记忆1:
      /^用户[:：]/,                  // 用户:
      /^AI[:：]/,                    // AI:
      /^助手[:：]/,                  // 助手:
    ];

    // 获取新增的内容行
    const addedLines = currentLines.slice(lastLines.length);

    for (const line of addedLines) {
      if (memoryPatterns.some(pattern => pattern.test(line))) {
        newEntries++;
      }
    }

    return newEntries;
  }

  /**
   * 估算记忆条目数（用于首次分析）
   */
  private estimateMemoryEntries(content: string): number {
    const lines = content.split('\n');
    let entries = 0;

    const memoryPatterns = [
      /^\d{4}[-/]\d{2}[-/]\d{2}/,
      /^\[\d{4}/,
      /^##?\s/,
      /^- \*\*/,
      /^记忆\d+[:：]/,
      /^用户[:：]/,
      /^AI[:：]/,
      /^助手[:：]/,
    ];

    for (const line of lines) {
      if (memoryPatterns.some(pattern => pattern.test(line))) {
        entries++;
      }
    }

    return entries;
  }

  /**
   * 估算互动次数
   */
  private estimateInteractions(stats: MemoryFileTracker['dailyStats'][string]): number {
    // 基于新增内容量估算互动次数
    // 假设平均每次互动产生 200-500 字符
    const avgInteractionLength = 350;
    const estimated = Math.floor(stats.additions / avgInteractionLength);
    return Math.max(1, estimated); // 至少1次
  }

  /**
   * 计算活跃度评分
   */
  private calculateActivityScore(stats: MemoryFileTracker['dailyStats'][string]): number {
    let score = 0;

    // 基于新增内容评分 (0-40分)
    const contentScore = Math.min(40, (stats.additions / 1000) * 10);
    score += contentScore;

    // 基于新增记忆条目评分 (0-30分)
    const memoryScore = Math.min(30, stats.newMemories * 3);
    score += memoryScore;

    // 基于修改频率评分 (0-20分)
    const modificationScore = Math.min(20, stats.modifications * 2);
    score += modificationScore;

    // 基础活跃度 (10分)
    if (stats.additions > 0) {
      score += 10;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * 计算奖励
   */
  private calculateRewards(
    stats: MemoryFileTracker['dailyStats'][string],
    activityScore: number
  ): MemoryAnalysisResult['rewards'] {
    // 基础奖励
    let affection = Math.floor(activityScore / 10);  // 活跃度每10分=1点好感度
    let experience = Math.floor(activityScore / 5);   // 活跃度每5分=1点经验
    let happiness = Math.floor(activityScore / 15);   // 活跃度每15分=1点心情

    // 额外奖励
    if (stats.newMemories > 0) {
      affection += stats.newMemories;  // 每条新记忆+1好感
      experience += stats.newMemories * 2;  // 每条新记忆+2经验
    }

    // 活跃度加成
    if (activityScore >= 80) {
      affection += 10;
      experience += 20;
      happiness += 5;
    } else if (activityScore >= 60) {
      affection += 5;
      experience += 10;
      happiness += 3;
    } else if (activityScore >= 40) {
      affection += 3;
      experience += 5;
      happiness += 2;
    }

    return {
      affection: Math.min(20, affection),  // 上限20点
      experience: Math.min(100, experience),  // 上限100点
      happiness: Math.min(10, happiness)   // 上限10点
    };
  }

  /**
   * 执行每日评估并奖励宠物
   */
  async performDailyEvaluation(agentId: string): Promise<{
    success: boolean;
    analysis: MemoryAnalysisResult | null;
    message: string;
  }> {
    try {
      // 1. 分析记忆文件
      const analysis = await this.analyzeAgentMemory(agentId);

      if (!analysis) {
        return {
          success: false,
          analysis: null,
          message: '无法分析该agent的记忆文件'
        };
      }

      // 2. 获取宠物数据
      const petData = await petService.getPetData(agentId);
      if (!petData) {
        return {
          success: false,
          analysis,
          message: '未找到关联的宠物'
        };
      }

      // 3. 应用奖励
      const { rewards } = analysis;

      // 增加好感度
      petData.status.affection = Math.min(100, petData.status.affection + rewards.affection);

      // 增加经验值
      petData.status.experience += rewards.experience;

      // 增加心情
      petData.status.happiness = Math.min(100, petData.status.happiness + rewards.happiness);

      // 记录互动
      petData.interactions.unshift({
        id: crypto.randomUUID(),
        type: 'chat',  // 归类为聊天互动
        timestamp: new Date().toISOString(),
        data: {
          source: 'daily_evaluation',
          activityScore: analysis.activityScore,
          newMemories: analysis.totalNewMemories
        },
        effects: [
          { attribute: 'affection', delta: rewards.affection, reason: '每日陪伴奖励' },
          { attribute: 'experience', delta: rewards.experience, reason: '共同成长' },
          { attribute: 'happiness', delta: rewards.happiness, reason: '美好回忆' }
        ],
        note: `记忆活跃度: ${analysis.activityScore}分`
      });

      // 限制互动记录数量
      if (petData.interactions.length > 100) {
        petData.interactions = petData.interactions.slice(0, 100);
      }

      // 保存宠物数据
      const petDataPath = path.join(PETS_DIR, agentId, 'pet-data.json');
      await fs.writeJson(petDataPath, petData, { spaces: 2 });

      // 4. 生成消息
      let message = `今日评估完成！活跃度评分: ${analysis.activityScore}分\n`;
      message += `获得奖励: 好感+${rewards.affection}, 经验+${rewards.experience}, 心情+${rewards.happiness}\n`;

      if (analysis.details.highlights.length > 0) {
        message += `亮点: ${analysis.details.highlights.join('; ')}`;
      }

      return {
        success: true,
        analysis,
        message
      };

    } catch (error) {
      console.error(`Daily evaluation failed for ${agentId}:`, error);
      return {
        success: false,
        analysis: null,
        message: `评估失败: ${error}`
      };
    }
  }

  /**
   * 获取历史统计
   */
  async getHistoryStats(agentId: string, days: number = 7): Promise<{
    dates: string[];
    activityScores: number[];
    totalAffectionEarned: number;
    totalExperienceEarned: number;
    averageScore: number;
  } | null> {
    const tracker = await this.loadTracker(agentId);
    if (!tracker) {
      // 返回默认空数据
      const dates: string[] = [];
      const activityScores: number[] = [];
      const today = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
        activityScores.push(0);
      }
      return {
        dates,
        activityScores,
        totalAffectionEarned: 0,
        totalExperienceEarned: 0,
        averageScore: 0
      };
    }

    const dates: string[] = [];
    const activityScores: number[] = [];
    let totalAffection = 0;
    let totalExperience = 0;

    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      dates.push(dateStr);

      const stats = tracker.dailyStats[dateStr];
      if (stats) {
        const score = this.calculateActivityScore(stats);
        activityScores.push(score);

        const rewards = this.calculateRewards(stats, score);
        totalAffection += rewards.affection;
        totalExperience += rewards.experience;
      } else {
        activityScores.push(0);
      }
    }

    const averageScore = activityScores.length > 0
      ? Math.round(activityScores.reduce((a, b) => a + b, 0) / activityScores.length)
      : 0;

    return {
      dates,
      activityScores,
      totalAffectionEarned: totalAffection,
      totalExperienceEarned: totalExperience,
      averageScore
    };
  }

  /**
   * 批量评估所有宠物
   */
  async evaluateAllPets(): Promise<{
    total: number;
    success: number;
    failed: number;
    results: Array<{ agentId: string; success: boolean; message: string }>;
  }> {
    const results: Array<{ agentId: string; success: boolean; message: string }> = [];

    try {
      // 获取所有宠物
      const petSummaries = await petService.getPetSummaries();

      for (const pet of petSummaries) {
        const result = await this.performDailyEvaluation(pet.agentId);
        results.push({
          agentId: pet.agentId,
          success: result.success,
          message: result.message
        });
      }

      return {
        total: results.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };

    } catch (error) {
      console.error('Batch evaluation failed:', error);
      return {
        total: 0,
        success: 0,
        failed: 0,
        results
      };
    }
  }
}

// 导出单例
export const memoryAnalysisService = MemoryAnalysisService.getInstance();
