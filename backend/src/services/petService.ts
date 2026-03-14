/**
 * 宠物养成系统服务
 * 管理宠物的生命周期、属性、互动和成长
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import type {
  PetData,
  PetStatus,
  PetAppearance,
  PetPersonality,
  PersonalityType,
  PetStage,
  PetMood,
  Interaction,
  InteractionType,
  AttributeChange,
  InteractResponse,
  DailyTask,
  PetAchievement,
  PetItem,
  RandomEvent,
  EvolutionBranch,
  PetSummary
} from '../../../shared/types';
import { petDatabaseService } from './petDatabaseService';

const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || path.join(os.homedir(), '.openclaw');
const PETS_DIR = path.join(OPENCLAW_ROOT, 'pets');

// 游戏平衡配置
const GAME_CONFIG = {
  // 衰减率 (每15分钟)
  decay: {
    hunger: 3,        // 饥饿度下降
    happiness: 2,     // 心情下降
    energy: 1,        // 精力下降(醒着时)
    health: 1,        // 健康下降(忽视时)
    cleanliness: 2,   // 清洁度下降
  },
  // 离线衰减系数 (相对于在线)
  offlineDecayFactor: 0.3,
  // 健康阈值
  healthThresholds: {
    sick: 30,         // 低于此值生病
    warning: 50,      // 警告线
  },
  // 心情阈值
  moodThresholds: {
    ecstatic: 90,
    happy: 70,
    content: 50,
    neutral: 30,
    sad: 20,
    angry: 10,
  },
  // 升级经验公式: level * 100
  experienceFormula: (level: number) => level * 100,
  // 最大连续登录天数统计
  maxConsecutiveDays: 365,
};

// 互动效果配置
const INTERACTION_EFFECTS: Record<InteractionType, AttributeChange[]> = {
  feed: [
    { attribute: 'hunger', delta: 30, reason: '喂食' },
    { attribute: 'happiness', delta: 5, reason: '享用美食' },
    { attribute: 'energy', delta: 5, reason: '补充能量' },
    { attribute: 'experience', delta: 10, reason: '日常照顾' },
  ],
  play: [
    { attribute: 'happiness', delta: 20, reason: '玩耍时光' },
    { attribute: 'energy', delta: -10, reason: '消耗精力' },
    { attribute: 'hunger', delta: -5, reason: '运动消耗' },
    { attribute: 'experience', delta: 15, reason: '快乐成长' },
    { attribute: 'affection', delta: 3, reason: '陪伴' },
  ],
  train: [
    { attribute: 'intelligence', delta: 5, reason: '学习训练' },
    { attribute: 'energy', delta: -15, reason: '脑力消耗' },
    { attribute: 'happiness', delta: -5, reason: '训练辛苦' },
    { attribute: 'experience', delta: 25, reason: '技能提升' },
  ],
  sleep: [
    { attribute: 'energy', delta: 50, reason: '充足睡眠' },
    { attribute: 'health', delta: 10, reason: '身体恢复' },
    { attribute: 'happiness', delta: 5, reason: '精神饱满' },
  ],
  chat: [
    { attribute: 'happiness', delta: 10, reason: '愉快交流' },
    { attribute: 'affection', delta: 5, reason: '深度沟通' },
    { attribute: 'experience', delta: 10, reason: '社交成长' },
  ],
  pet: [
    { attribute: 'happiness', delta: 15, reason: '被抚摸' },
    { attribute: 'affection', delta: 8, reason: '亲密接触' },
    { attribute: 'experience', delta: 5, reason: '爱的互动' },
  ],
  clean: [
    { attribute: 'cleanliness', delta: 40, reason: '清洁身体' },
    { attribute: 'happiness', delta: 5, reason: '清爽舒适' },
    { attribute: 'health', delta: 5, reason: '卫生保障' },
    { attribute: 'experience', delta: 8, reason: '良好习惯' },
  ],
  gift: [
    { attribute: 'happiness', delta: 25, reason: '收到礼物' },
    { attribute: 'affection', delta: 10, reason: '心意相通' },
    { attribute: 'experience', delta: 15, reason: '惊喜时刻' },
  ],
  adventure: [
    { attribute: 'experience', delta: 50, reason: '探险收获' },
    { attribute: 'energy', delta: -25, reason: '长途跋涉' },
    { attribute: 'hunger', delta: -15, reason: '野外消耗' },
    { attribute: 'strength', delta: 3, reason: '锻炼体魄' },
    { attribute: 'agility', delta: 3, reason: '身手敏捷' },
  ],
  treat: [
    { attribute: 'health', delta: 30, reason: '治疗恢复' },
    { attribute: 'happiness', delta: -5, reason: '吃药苦涩' },
    { attribute: 'experience', delta: 10, reason: '康复成长' },
  ],
  login: [
    { attribute: 'happiness', delta: 5, reason: '见到主人' },
    { attribute: 'affection', delta: 2, reason: '每日陪伴' },
  ],
};

// 每日任务模板
const DAILY_TASK_TEMPLATES: Omit<DailyTask, 'currentCount' | 'completed'>[] = [
  { id: 'login', type: 'login', description: '每日登录', targetCount: 1, reward: { experience: 20, affection: 5 } },
  { id: 'feed3', type: 'feed', description: '喂食3次', targetCount: 3, reward: { experience: 30, affection: 10 } },
  { id: 'chat10', type: 'chat', description: '聊天10分钟', targetCount: 1, reward: { experience: 40, affection: 15 } },
  { id: 'play2', type: 'play', description: '玩耍2次', targetCount: 2, reward: { experience: 25 } },
  { id: 'train1', type: 'train', description: '训练1次', targetCount: 1, reward: { experience: 35, evolutionPoints: 1 } },
  { id: 'pet5', type: 'pet', description: '抚摸5次', targetCount: 5, reward: { affection: 20 } },
];

// 成就模板
const ACHIEVEMENT_TEMPLATES: Omit<PetAchievement, 'progress' | 'unlocked'>[] = [
  { id: 'first_feed', name: '初次喂食', description: '第一次给宠物喂食', category: 'care', targetProgress: 1, reward: { experience: 50 } },
  { id: 'care_7days', name: '一周照顾', description: '连续照顾宠物7天', category: 'care', targetProgress: 7, reward: { experience: 200, affection: 50 } },
  { id: 'care_30days', name: '月度陪伴', description: '连续照顾宠物30天', category: 'care', targetProgress: 30, reward: { experience: 1000, affection: 200 } },
  { id: 'level_10', name: '小小成长', description: '宠物达到10级', category: 'growth', targetProgress: 10, reward: { experience: 100 } },
  { id: 'level_25', name: '茁壮成长', description: '宠物达到25级', category: 'growth', targetProgress: 25, reward: { experience: 300 } },
  { id: 'level_50', name: '成年礼', description: '宠物达到50级', category: 'growth', targetProgress: 50, reward: { experience: 1000 } },
  { id: 'chat_100', name: '话痨主人', description: '与宠物聊天100句', category: 'interaction', targetProgress: 100, reward: { experience: 200 } },
  { id: 'chat_1000', name: '知心朋友', description: '与宠物聊天1000句', category: 'interaction', targetProgress: 1000, reward: { experience: 1000, affection: 100 } },
  { id: 'feed_100', name: '美食家', description: '累计喂食100次', category: 'interaction', targetProgress: 100, reward: { experience: 300 } },
  { id: 'first_evolution', name: '第一次进化', description: '完成第一次进化', category: 'growth', targetProgress: 1, reward: { experience: 500, evolutionPoints: 10 } },
];

// 进化分支配置
const EVOLUTION_BRANCHES: EvolutionBranch[] = [
  {
    id: 'wisdom',
    name: '智慧型',
    description: '专注于智力和学习的进化分支',
    requiredLevel: 15,
    requiredIntelligence: 50,
    requiredAffection: 40,
    appearance: 'scholar',
    specialAbility: '深度对话',
    unlocked: false,
  },
  {
    id: 'friendly',
    name: '亲和型',
    description: '专注于社交和情感的进化分支',
    requiredLevel: 15,
    requiredAffection: 80,
    appearance: 'healer',
    specialAbility: '情感治愈',
    unlocked: false,
  },
  {
    id: 'adventurer',
    name: '冒险型',
    description: '专注于力量和敏捷的进化分支',
    requiredLevel: 15,
    requiredPersonality: { curiosity: 70, playfulness: 70 },
    appearance: 'warrior',
    specialAbility: '探险家',
    unlocked: false,
  },
  {
    id: 'mystery',
    name: '神秘型',
    description: '稀有进化分支，需要特殊条件',
    requiredLevel: 30,
    specialConditions: ['高亲密度', '特定道具', '随机触发'],
    appearance: 'mystic',
    specialAbility: '预知能力',
    unlocked: false,
  },
];

export class PetService {
  private static instance: PetService;
  private petCache: Map<string, PetData> = new Map();

  private constructor() {
    this.ensureDirectories();
  }

  static getInstance(): PetService {
    if (!PetService.instance) {
      PetService.instance = new PetService();
    }
    return PetService.instance;
  }

  private ensureDirectories() {
    fs.ensureDirSync(PETS_DIR);
  }

  /**
   * 获取宠物数据文件路径
   */
  private getPetDataPath(agentId: string): string {
    return path.join(PETS_DIR, agentId, 'pet-data.json');
  }

  /**
   * 保存宠物数据（公共方法，供外部调用）
   * 使用 SQLite 数据库
   */
  async savePetData(agentId: string, petData: PetData): Promise<void> {
    // 保存到数据库
    petDatabaseService.savePetStatus(agentId, petData.status);
    // 更新缓存
    this.petCache.set(agentId, petData);
  }

  /**
   * 创建新宠物
   */
  async createPet(agentId: string, name: string, eggType: string = 'classic'): Promise<PetData> {
    const petDir = path.join(PETS_DIR, agentId);
    await fs.ensureDir(petDir);

    const now = new Date().toISOString();
    const personalityType = this.generateRandomPersonality();

    const petData: PetData = {
      status: {
        agentId,
        name,
        avatar: `egg_${eggType}`,
        stage: 'egg',
        level: 0,
        experience: 0,
        experienceToNext: GAME_CONFIG.experienceFormula(1),
        hunger: 80,
        happiness: 70,
        energy: 100,
        health: 100,
        cleanliness: 100,
        intelligence: 10,
        affection: 20,
        strength: 10,
        agility: 10,
        personality: {
          type: personalityType,
          traits: this.generatePersonalityTraits(personalityType),
        },
        mood: 'content',
        isSleeping: false,
        isSick: false,
        evolutionPoints: 0,
        bornAt: now,
        lastFedAt: now,
        lastPlayedAt: now,
        lastTrainedAt: now,
        lastSleptAt: now,
        lastInteractionAt: now,
        totalPlayTime: 0,
        consecutiveLoginDays: 0,
      },
      appearance: {
        baseForm: 'egg',
        color: this.getRandomColor(),
        accessories: [],
        unlockedForms: ['egg'],
      },
      evolutionBranches: JSON.parse(JSON.stringify(EVOLUTION_BRANCHES)),
      interactions: [],
      conversation: {
        messages: [],
      },
      dailyTasks: DAILY_TASK_TEMPLATES.map(t => ({ ...t, currentCount: 0, completed: false })),
      achievements: ACHIEVEMENT_TEMPLATES.map(a => ({ ...a, progress: 0, unlocked: false })),
      inventory: [
        { id: 'food_basic', name: '基础食物', type: 'food', description: '普通的宠物食物', quantity: 5, rarity: 'common' },
        { id: 'toy_ball', name: '玩具球', type: 'toy', description: '让宠物开心的玩具', quantity: 1, rarity: 'common' },
      ],
    };

    await this.savePetData(agentId, petData);
    this.petCache.set(agentId, petData);

    // 异步生成初始宠物形象图（不阻塞返回）
    setTimeout(async () => {
      try {
        const { petAIService } = await import('./petAIService');
        console.log(`[PetService] Generating initial images for ${agentId}...`);
        await petAIService.generatePetAvatar(agentId, petData);
        await petAIService.generatePetStatusImage(agentId, petData);
        console.log(`[PetService] Initial images generated for ${agentId}`);
      } catch (error) {
        console.error(`[PetService] Failed to generate initial images for ${agentId}:`, error);
      }
    }, 100);

    return petData;
  }

  /**
   * 生成随机性格
   */
  private generateRandomPersonality(): PersonalityType {
    const types: PersonalityType[] = ['cheerful', 'calm', 'curious', 'stubborn', 'gentle'];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * 根据性格类型生成特质
   */
  private generatePersonalityTraits(type: PersonalityType): PetPersonality['traits'] {
    const baseTraits = {
      sociability: 50,
      curiosity: 50,
      independence: 50,
      playfulness: 50,
      stubbornness: 50,
    };

    switch (type) {
      case 'cheerful':
        return { ...baseTraits, sociability: 80, playfulness: 80, stubbornness: 30 };
      case 'calm':
        return { ...baseTraits, playfulness: 30, stubbornness: 20, independence: 70 };
      case 'curious':
        return { ...baseTraits, curiosity: 90, playfulness: 70 };
      case 'stubborn':
        return { ...baseTraits, stubbornness: 80, independence: 80, sociability: 30 };
      case 'gentle':
        return { ...baseTraits, sociability: 70, playfulness: 40, stubbornness: 20 };
      default:
        return baseTraits;
    }
  }

  /**
   * 获取随机颜色主题
   */
  private getRandomColor(): string {
    const colors = ['blue', 'pink', 'green', 'yellow', 'purple', 'orange'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 加载宠物数据
   * 使用 SQLite 数据库
   */
  async getPetData(agentId: string): Promise<PetData | null> {
    // 先检查缓存
    if (this.petCache.has(agentId)) {
      return this.petCache.get(agentId)!;
    }

    // 从数据库查询
    try {
      const petData = petDatabaseService.getPetData(agentId);
      if (petData) {
        this.petCache.set(agentId, petData);
      }
      return petData;
    } catch (error) {
      console.error(`Failed to load pet data for ${agentId}:`, error);
      return null;
    }
  }

  /**
   * 获取宠物状态（应用离线衰减）
   */
  async getPetStatus(agentId: string): Promise<PetStatus | null> {
    const petData = await this.getPetData(agentId);
    if (!petData) return null;

    // 计算离线衰减
    const updatedStatus = await this.calculateStatusDecay(petData.status);

    // 如果状态有变化，保存
    if (JSON.stringify(updatedStatus) !== JSON.stringify(petData.status)) {
      petData.status = updatedStatus;
      await this.savePetData(agentId, petData);
    }

    return updatedStatus;
  }

  /**
   * 计算状态衰减
   */
  async calculateStatusDecay(status: PetStatus): Promise<PetStatus> {
    const now = new Date();
    const lastInteraction = new Date(status.lastInteractionAt);
    const minutesSinceLastInteraction = (now.getTime() - lastInteraction.getTime()) / (1000 * 60);

    if (minutesSinceLastInteraction < 15) {
      return status; // 不到15分钟，不衰减
    }

    const decayCycles = Math.floor(minutesSinceLastInteraction / 15);
    const decayFactor = status.isSleeping ? 0.1 : GAME_CONFIG.offlineDecayFactor;

    const newStatus = { ...status };

    // 应用衰减
    newStatus.hunger = Math.max(0, newStatus.hunger - GAME_CONFIG.decay.hunger * decayCycles * decayFactor);
    newStatus.happiness = Math.max(0, newStatus.happiness - GAME_CONFIG.decay.happiness * decayCycles * decayFactor);
    newStatus.cleanliness = Math.max(0, newStatus.cleanliness - GAME_CONFIG.decay.cleanliness * decayCycles * decayFactor);

    // 精力恢复（如果睡觉）或消耗
    if (newStatus.isSleeping) {
      newStatus.energy = Math.min(100, newStatus.energy + 10 * decayCycles);
    } else {
      newStatus.energy = Math.max(0, newStatus.energy - GAME_CONFIG.decay.energy * decayCycles);
    }

    // 健康下降（如果忽视）
    if (newStatus.hunger < 30 || newStatus.cleanliness < 30) {
      newStatus.health = Math.max(0, newStatus.health - GAME_CONFIG.decay.health * decayCycles);
    }

    // 检查生病
    newStatus.isSick = newStatus.health < GAME_CONFIG.healthThresholds.sick ||
                       (newStatus.cleanliness < 20 && Math.random() < 0.3);

    // 更新心情
    newStatus.mood = this.calculateMood(newStatus);

    return newStatus;
  }

  /**
   * 根据状态计算心情
   */
  private calculateMood(status: PetStatus): PetMood {
    if (status.isSleeping) return 'sleeping';
    if (status.isSick) return 'sick';
    if (status.energy < 20) return 'sleepy';

    const average = (status.hunger + status.happiness + status.health + status.cleanliness) / 4;

    if (average >= GAME_CONFIG.moodThresholds.ecstatic) return 'ecstatic';
    if (average >= GAME_CONFIG.moodThresholds.happy) return 'happy';
    if (average >= GAME_CONFIG.moodThresholds.content) return 'content';
    if (average >= GAME_CONFIG.moodThresholds.neutral) return 'neutral';
    if (average >= GAME_CONFIG.moodThresholds.sad) return 'sad';
    return 'angry';
  }

  /**
   * 处理互动
   */
  async interact(agentId: string, type: InteractionType, data?: Record<string, unknown>): Promise<InteractResponse> {
    const petData = await this.getPetData(agentId);
    if (!petData) {
      throw new Error(`Pet not found for agent ${agentId}`);
    }

    // 检查特殊条件
    if (type === 'treat' && !petData.status.isSick) {
      throw new Error('宠物没有生病，不需要治疗');
    }

    if (type === 'sleep' && petData.status.energy > 80) {
      throw new Error('宠物精力充沛，不想睡觉');
    }

    // 获取互动效果
    let effects = [...(INTERACTION_EFFECTS[type] || [])];

    // 应用性格修正
    effects = this.applyPersonalityModifiers(petData.status.personality, type, effects);

    // 随机暴击（20%概率双倍经验）
    const isCrit = Math.random() < 0.2;
    if (isCrit) {
      effects = effects.map(e =>
        e.attribute === 'experience' ? { ...e, delta: e.delta * 2 } : e
      );
    }

    // 应用效果
    const oldStatus = { ...petData.status };
    const messages: string[] = [];

    for (const effect of effects) {
      this.applyEffect(petData.status, effect);
    }

    // 更新状态时间戳
    const now = new Date().toISOString();
    petData.status.lastInteractionAt = now;

    if (type === 'feed') petData.status.lastFedAt = now;
    if (type === 'play') petData.status.lastPlayedAt = now;
    if (type === 'train') petData.status.lastTrainedAt = now;
    if (type === 'sleep') {
      petData.status.lastSleptAt = now;
      petData.status.isSleeping = true;
    }

    // 检查升级
    let levelUp = false;
    while (petData.status.experience >= petData.status.experienceToNext && petData.status.level < 100) {
      petData.status.level++;
      petData.status.experience -= petData.status.experienceToNext;
      petData.status.experienceToNext = GAME_CONFIG.experienceFormula(petData.status.level + 1);
      levelUp = true;
      messages.push(`升级了！现在是${petData.status.level}级！`);
    }

    // 阶段进化检查
    const stageEvolution = this.checkStageEvolution(petData.status);
    if (stageEvolution) {
      petData.status.stage = stageEvolution;
      messages.push(`进化到了${this.getStageName(stageEvolution)}阶段！`);
    }

    // 检查进化分支
    let evolutionTriggered: EvolutionBranch | undefined;
    const unlockedBranch = this.checkEvolutionBranch(petData);
    if (unlockedBranch && !petData.currentBranch) {
      evolutionTriggered = unlockedBranch;
      petData.currentBranch = unlockedBranch.id;
      petData.status.avatar = unlockedBranch.appearance;
      messages.push(`进化成了${unlockedBranch.name}！`);
    }

    // 更新心情
    petData.status.mood = this.calculateMood(petData.status);

    // 记录互动
    const interaction: Interaction = {
      id: uuidv4(),
      type,
      timestamp: now,
      data,
      effects,
      note: isCrit ? '暴击！' : undefined,
    };
    petData.interactions.unshift(interaction);
    if (petData.interactions.length > 100) {
      petData.interactions = petData.interactions.slice(0, 100);
    }

    // 保存互动记录到数据库
    petDatabaseService.addInteraction(agentId, interaction);

    // 更新成就进度
    this.updateAchievementProgress(petData, type);

    // 更新每日任务
    this.updateDailyTask(petData, type);

    // 保存数据
    await this.savePetData(agentId, petData);
    this.petCache.set(agentId, petData);

    return {
      success: true,
      interaction,
      petStatus: petData.status,
      evolutionTriggered,
      levelUp,
      messages,
    };
  }

  /**
   * 应用性格修正
   */
  private applyPersonalityModifiers(
    personality: PetPersonality,
    type: InteractionType,
    effects: AttributeChange[]
  ): AttributeChange[] {
    const modified = [...effects];
    const { traits } = personality;

    // 活泼型玩耍收益更高
    if (type === 'play' && traits.playfulness > 70) {
      const expEffect = modified.find(e => e.attribute === 'experience');
      if (expEffect) expEffect.delta *= 1.5;
    }

    // 好奇型训练收益更高
    if (type === 'train' && traits.curiosity > 70) {
      const intEffect = modified.find(e => e.attribute === 'intelligence');
      if (intEffect) intEffect.delta *= 1.5;
    }

    // 固执型互动可能减少心情
    if (traits.stubbornness > 70 && type !== 'play') {
      const happyEffect = modified.find(e => e.attribute === 'happiness');
      if (happyEffect) happyEffect.delta *= 0.8;
    }

    return modified;
  }

  /**
   * 应用属性变化
   */
  private applyEffect(status: PetStatus, effect: AttributeChange): void {
    const value = status[effect.attribute as keyof PetStatus] as number;
    if (typeof value === 'number') {
      const newValue = Math.max(0, Math.min(100, value + effect.delta));
      (status as any)[effect.attribute] = newValue;
    }
  }

  /**
   * 检查阶段进化
   */
  private checkStageEvolution(status: PetStatus): PetStage | null {
    const level = status.level;
    const currentStage = status.stage;

    if (currentStage === 'egg' && level >= 1) return 'baby';
    if (currentStage === 'baby' && level >= 5) return 'child';
    if (currentStage === 'child' && level >= 15) return 'teen';
    if (currentStage === 'teen' && level >= 30) return 'adult';
    if (currentStage === 'adult' && level >= 50 && status.affection >= 90) return 'special';

    return null;
  }

  /**
   * 获取阶段名称
   */
  private getStageName(stage: PetStage): string {
    const names: Record<PetStage, string> = {
      egg: '蛋蛋',
      baby: '婴儿',
      child: '儿童',
      teen: '少年',
      adult: '成年',
      special: '特殊形态',
    };
    return names[stage];
  }

  /**
   * 检查进化分支
   */
  private checkEvolutionBranch(petData: PetData): EvolutionBranch | null {
    for (const branch of petData.evolutionBranches) {
      if (branch.unlocked) continue;

      if (petData.status.level < branch.requiredLevel) continue;
      if (branch.requiredIntelligence && petData.status.intelligence < branch.requiredIntelligence) continue;
      if (branch.requiredAffection && petData.status.affection < branch.requiredAffection) continue;

      if (branch.requiredPersonality) {
        const traits = petData.status.personality.traits;
        let match = true;
        for (const [key, value] of Object.entries(branch.requiredPersonality)) {
          if ((traits as any)[key] < value) {
            match = false;
            break;
          }
        }
        if (!match) continue;
      }

      // 解锁分支
      branch.unlocked = true;
      return branch;
    }

    return null;
  }

  /**
   * 更新成就进度
   */
  private updateAchievementProgress(petData: PetData, type: InteractionType): void {
    for (const achievement of petData.achievements) {
      if (achievement.unlocked) continue;

      // 根据成就类型更新进度
      if (achievement.id === 'first_feed' && type === 'feed') {
        achievement.progress = 1;
      } else if (achievement.id.startsWith('care_') && type === 'login') {
        achievement.progress = petData.status.consecutiveLoginDays;
      } else if (achievement.id.startsWith('level_')) {
        achievement.progress = petData.status.level;
      } else if (achievement.id === 'chat_100' && type === 'chat') {
        achievement.progress = petData.conversation.messages.filter(m => m.role === 'user').length;
      } else if (achievement.id === 'feed_100' && type === 'feed') {
        achievement.progress = petData.interactions.filter(i => i.type === 'feed').length;
      }

      // 检查是否解锁
      if (achievement.progress >= achievement.targetProgress) {
        achievement.unlocked = true;
        achievement.unlockedAt = new Date().toISOString();
      }
    }
  }

  /**
   * 更新每日任务
   */
  private updateDailyTask(petData: PetData, type: InteractionType): void {
    for (const task of petData.dailyTasks) {
      if (task.completed) continue;

      if (task.type === type) {
        task.currentCount++;
        if (task.currentCount >= task.targetCount) {
          task.completed = true;
          // 发放奖励
          if (task.reward.experience) {
            petData.status.experience += task.reward.experience;
          }
          if (task.reward.affection) {
            petData.status.affection = Math.min(100, petData.status.affection + task.reward.affection);
          }
        }
      }
    }
  }

  /**
   * 唤醒宠物（结束睡眠）
   */
  async wakeUp(agentId: string): Promise<PetStatus | null> {
    const petData = await this.getPetData(agentId);
    if (!petData || !petData.status.isSleeping) return null;

    petData.status.isSleeping = false;
    petData.status.mood = this.calculateMood(petData.status);

    await this.savePetData(agentId, petData);
    return petData.status;
  }

  /**
   * 处理每日登录
   */
  async handleDailyLogin(agentId: string): Promise<PetData | null> {
    const petData = await this.getPetData(agentId);
    if (!petData) return null;

    const now = new Date();
    const lastLogin = new Date(petData.status.lastInteractionAt);
    const daysSinceLastLogin = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

    // 更新连续登录天数
    if (daysSinceLastLogin === 1) {
      petData.status.consecutiveLoginDays++;
    } else if (daysSinceLastLogin > 1) {
      petData.status.consecutiveLoginDays = 1; // 重置
    }

    // 重置每日任务
    petData.dailyTasks = DAILY_TASK_TEMPLATES.map(t => ({ ...t, currentCount: 0, completed: false }));

    // 触发登录任务
    this.updateDailyTask(petData, 'login');

    await this.savePetData(agentId, petData);
    return petData;
  }

  /**
   * 获取宠物摘要列表（用于主界面）
   * 使用 SQLite 数据库
   */
  async getPetSummaries(): Promise<PetSummary[]> {
    try {
      return petDatabaseService.getPetSummaries();
    } catch (error) {
      console.error('Failed to get pet summaries:', error);
      return [];
    }
  }

  /**
   * 生成随机事件
   */
  async generateRandomEvent(agentId: string): Promise<RandomEvent | null> {
    const petData = await this.getPetData(agentId);
    if (!petData) return null;

    // 10%概率生成事件
    if (Math.random() > 0.1) return null;

    const events: RandomEvent[] = [
      {
        id: 'found_treasure',
        type: 'positive',
        title: '发现宝藏',
        description: '宠物在角落里发现了一些好东西！',
        triggerCondition: 'random',
        autoEffects: [
          { attribute: 'experience', delta: 30, reason: '意外收获' },
          { attribute: 'happiness', delta: 10, reason: '发现惊喜' },
        ],
      },
      {
        id: 'bad_dream',
        type: 'neutral',
        title: '噩梦',
        description: '宠物做了一个噩梦，心情有点低落。',
        triggerCondition: 'sleeping',
        choices: [
          { text: '安慰它', effects: [{ attribute: 'affection', delta: 10, reason: '温暖安慰' }] },
          { text: '让它自己冷静', effects: [{ attribute: 'happiness', delta: -5, reason: '独自面对' }] },
        ],
      },
      {
        id: 'sudden_hunger',
        type: 'negative',
        title: '突然饿了',
        description: '宠物突然感到特别饿。',
        triggerCondition: 'hunger<50',
        autoEffects: [{ attribute: 'hunger', delta: -20, reason: '突然饥饿' }],
      },
    ];

    // 根据状态筛选合适的事件
    const eligibleEvents = events.filter(e => {
      if (e.triggerCondition === 'sleeping' && !petData.status.isSleeping) return false;
      if (e.triggerCondition === 'hunger<50' && petData.status.hunger >= 50) return false;
      return true;
    });

    if (eligibleEvents.length === 0) return null;

    const event = eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];

    // 应用自动效果
    if (event.autoEffects) {
      for (const effect of event.autoEffects) {
        this.applyEffect(petData.status, effect);
      }
      await this.savePetData(agentId, petData);
    }

    return event;
  }

  /**
   * 获取宠物统计信息
   */
  async getPetStats(agentId: string): Promise<{
    totalInteractions: number;
    favoriteInteraction: InteractionType | null;
    chatCount: number;
    playTimeHours: number;
    unlockedAchievements: number;
    totalAchievements: number;
  } | null> {
    const petData = await this.getPetData(agentId);
    if (!petData) return null;

    // 统计最喜欢的互动类型
    const interactionCounts: Record<string, number> = {};
    for (const interaction of petData.interactions) {
      interactionCounts[interaction.type] = (interactionCounts[interaction.type] || 0) + 1;
    }

    let favoriteInteraction: InteractionType | null = null;
    let maxCount = 0;
    for (const [type, count] of Object.entries(interactionCounts)) {
      if (count > maxCount) {
        maxCount = count;
        favoriteInteraction = type as InteractionType;
      }
    }

    return {
      totalInteractions: petData.interactions.length,
      favoriteInteraction,
      chatCount: petData.conversation.messages.filter(m => m.role === 'user').length,
      playTimeHours: Math.floor(petData.status.totalPlayTime / 60),
      unlockedAchievements: petData.achievements.filter(a => a.unlocked).length,
      totalAchievements: petData.achievements.length,
    };
  }
}

// 导出单例
export const petService = PetService.getInstance();
