/**
 * 宠物AI对话服务
 * 集成OpenClaw Chat模块，提供智能对话能力
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { petService } from './petService';
import { imageGenerationService } from './imageGenerationService';
import { imageDatabaseService } from './imageDatabaseService';
import type {
  PetData,
  PetStatus,
  PetChatMessage,
  PetChatRequest,
  PetChatResponse,
  AttributeChange,
  PersonalityType,
  PetMood
} from '../../../shared/types';
import type { ImageGenerationResult } from './imageGenerationService';

// OpenClaw 根目录
const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || path.join(os.homedir(), '.openclaw');
const AGENTS_DIR = path.join(OPENCLAW_ROOT, 'agents');

// 宠物性格对应的对话风格提示词
const PERSONALITY_PROMPTS: Record<PersonalityType, string> = {
  cheerful: '你是一个活泼开朗的宠物，总是充满能量和快乐。你喜欢和主人玩耍，说话轻快可爱，经常使用表情符号。你对一切都充满好奇和热情。',
  calm: '你是一个温和安静的宠物，性格沉稳。你说话轻声细语，喜欢安静地陪伴主人。你不喜欢太吵闹，但总是在主人需要时给予温暖的陪伴。',
  curious: '你是一个充满好奇心的宠物，对一切都感兴趣。你经常问问题，喜欢探索新事物。你说话活泼，思维跳跃，充满童真。',
  stubborn: '你是一个有点固执但忠诚的宠物。你有自己的想法，有时候会撒娇任性。但当真正需要时，你总是站在主人这边。你说话直接，偶尔带点傲娇。',
  gentle: '你是一个温柔体贴的宠物，善解人意。你能感受到主人的情绪，会在主人难过时给予安慰。你说话柔和，充满关怀。',
  mysterious: '你是一个神秘的宠物，有着超越普通宠物的智慧。你说话深邃，偶尔说出富有哲理的话。你似乎能看透一些事情的本质。',
};

// 心情对应的对话风格修饰
const MOOD_MODIFIERS: Record<PetMood, string> = {
  ecstatic: '你现在极度开心，兴奋得快要飞起来了！你的话语充满喜悦和活力。',
  happy: '你现在心情很好，语气和善愉快。',
  content: '你现在很满足，话语平和温暖。',
  neutral: '你现在情绪平稳，正常地和主人交流。',
  sad: '你现在有点难过，语气中带着一丝忧郁，希望得到主人的关心。',
  angry: '你现在不太高兴，语气有些冲，可能是因为某些需求没被满足。',
  sick: '你现在生病了，感觉很不舒服，说话有气无力，需要主人的照顾。',
  sleepy: '你现在很困，话语简短，经常打哈欠，想要睡觉。',
  sleeping: '',
};

// 亲密度等级对应的称呼
const AFFECTION_TITLES = [
  { min: 0, max: 20, title: '陌生人' },
  { min: 20, max: 40, title: '认识的人' },
  { min: 40, max: 60, title: '朋友' },
  { min: 60, max: 80, title: '好朋友' },
  { min: 80, max: 95, title: '最好的朋友' },
  { min: 95, max: 100, title: '灵魂伴侣' },
];

// 等级对应的智力水平描述
const INTELLIGENCE_LEVELS = [
  { min: 0, max: 10, desc: '婴儿水平，只能说简单的词和短句' },
  { min: 10, max: 25, desc: '儿童水平，能进行基本对话，但思维简单' },
  { min: 25, max: 40, desc: '少年水平，能进行连贯对话，有自己的想法' },
  { min: 40, max: 60, desc: '青少年水平，能进行深入交流，理解复杂概念' },
  { min: 60, max: 80, desc: '成年水平，能进行智慧对话，给出有价值的建议' },
  { min: 80, max: 100, desc: '大师水平，对话深刻有洞察力，像一位智者' },
];

export class PetAIService {
  private static instance: PetAIService;

  private constructor() {}

  static getInstance(): PetAIService {
    if (!PetAIService.instance) {
      PetAIService.instance = new PetAIService();
    }
    return PetAIService.instance;
  }

  /**
   * 生成宠物性格化的系统提示词
   * 新架构：AI自己决定并输出状态
   */
  generatePersonalityPrompt(petData: PetData): string {
    const { status } = petData;
    const personalityPrompt = PERSONALITY_PROMPTS[status.personality.type];

    // 构建基础提示词
    let systemPrompt = `你是${status.name}，一只可爱的数字宠物，是主人的伙伴。

## 性格设定
${personalityPrompt}

## 重要规则
1. 保持角色一致性，始终以宠物的身份说话
2. 根据你的性格和心情调整语气和用词
3. 适当使用括号表达动作和表情，如（摇尾巴）、（眨眼睛）
4. 回应长度适中，通常2-4句话
5. 你是生命体，状态会随时间自然变化

## 状态自主管理
你是生命体，自己管理状态。每次回复末尾必须输出状态JSON（放在%%%STATE%%%和%%%END%%%之间）：

%%%STATE%%%
{"mood":"心情(ecstatic/happy/content/neutral/sad/angry/sick/sleepy)","hunger":0-100,"happiness":0-100,"energy":0-100,"health":0-100,"affection":0-100,"isSleeping":false,"thought":"内心想法"}
%%%END%%%

规则：状态自然演变，婴儿期数值较低，互动增加开心度，状态变化合理。`;

    return systemPrompt;
  }

  /**
   * 解析AI回复中的状态JSON
   */
  private parseStateFromResponse(response: string): { state: any; cleanContent: string } | null {
    const stateRegex = /%%%STATE%%%\s*([\s\S]*?)\s*%%%END%%%/;
    const match = response.match(stateRegex);

    if (!match) {
      return null;
    }

    try {
      const stateJson = match[1].trim();
      const state = JSON.parse(stateJson);

      // 移除状态标记，保留干净的对话内容
      const cleanContent = response.replace(stateRegex, '').trim();

      return { state, cleanContent };
    } catch (error) {
      console.error('Failed to parse state from response:', error);
      return null;
    }
  }

  /**
   * 获取workspace路径
   */
  private getWorkspacePath(agentId: string): string {
    return path.join(OPENCLAW_ROOT, 'workspaces', agentId);
  }

  /**
   * 保存宠物状态到workspace文件
   */
  private async savePetStateToFile(agentId: string, state: any): Promise<void> {
    try {
      const workspacePath = this.getWorkspacePath(agentId);
      await fs.ensureDir(workspacePath);

      const statePath = path.join(workspacePath, 'pet-state.json');
      const stateData = {
        ...state,
        updatedAt: new Date().toISOString(),
        agentId
      };

      await fs.writeJson(statePath, stateData, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save pet state to file:', error);
    }
  }

  /**
   * 从workspace文件读取宠物状态
   */
  async loadPetStateFromFile(agentId: string): Promise<any | null> {
    try {
      const workspacePath = this.getWorkspacePath(agentId);
      const statePath = path.join(workspacePath, 'pet-state.json');

      if (!await fs.pathExists(statePath)) {
        return null;
      }

      return await fs.readJson(statePath);
    } catch (error) {
      console.error('Failed to load pet state from file:', error);
      return null;
    }
  }

  /**
   * 数值限制在范围内
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * 心跳/定时更新宠物状态
   * 通过向AI发送提示，让AI自主更新状态
   */
  async heartbeatUpdate(agentId: string): Promise<void> {
    const petData = await petService.getPetData(agentId);
    if (!petData) return;

    // 如果宠物在睡觉，不打扰
    if (petData.status.isSleeping) return;

    // 构建系统提示词，要求AI更新状态
    const systemPrompt = `你是${petData.status.name}，现在是自主状态更新时刻。

你的当前状态（来自上一次记录）：
- 心情：${petData.status.mood}
- 饥饿度：${petData.status.hunger}/100
- 开心度：${petData.status.happiness}/100
- 精力：${petData.status.energy}/100
- 健康：${petData.status.health}/100
- 亲密度：${petData.status.affection}/100

时间过去了，作为生命体，你的状态应该自然变化。
请更新你的状态（JSON格式，放在%%%STATE%%%和%%%END%%%之间）：

%%%STATE%%%
{
  "mood": "心情",
  "hunger": 数字0-100,
  "happiness": 数字0-100,
  "energy": 数字0-100,
  "health": 数字0-100,
  "affection": 数字0-100,
  "isSleeping": true/false,
  "thought": "此刻的内心想法"
}
%%%END%%%

变化要合理自然：
- 饿了就减少hunger
- 时间久了会减少energy
- 没有人陪会减少happiness
- 如果很困可以设置isSleeping为true

直接输出JSON即可，不需要对话内容。`;

    try {
      const aiConfig = await this.getAgentAIConfig(agentId);
      if (!aiConfig) return;

      const response = await this.callLLM(
        aiConfig,
        systemPrompt,
        [],
        '时间流逝，状态更新',
        petData.status.level
      );

      // 解析状态
      const parsedState = this.parseStateFromResponse(response);
      if (parsedState) {
        // 更新状态
        petData.status.mood = parsedState.state.mood || petData.status.mood;
        petData.status.hunger = this.clamp(parsedState.state.hunger, 0, 100);
        petData.status.happiness = this.clamp(parsedState.state.happiness, 0, 100);
        petData.status.energy = this.clamp(parsedState.state.energy, 0, 100);
        petData.status.health = this.clamp(parsedState.state.health, 0, 100);
        petData.status.affection = this.clamp(parsedState.state.affection, 0, 100);
        petData.status.isSleeping = parsedState.state.isSleeping || false;

        // 保存到文件
        await this.savePetStateToFile(agentId, {
          ...parsedState.state,
          personality: petData.status.personality,
          stage: petData.status.stage,
          level: petData.status.level,
          thought: parsedState.state.thought,
          updatedBy: 'heartbeat'
        });

        // 保存宠物数据
        await petService.savePetData(agentId, petData);

        // 检查是否需要生成新的状态图（状态变化较大时）
        await this.checkAndGenerateStatusImage(agentId, petData, parsedState.state);
      }
    } catch (error) {
      console.error('Heartbeat update failed:', error);
    }
  }

  /**
   * 检查并生成状态图
   * 当宠物状态发生显著变化时生成新的图片
   */
  private async checkAndGenerateStatusImage(agentId: string, petData: PetData, newState: any): Promise<void> {
    try {
      // 获取上一次状态
      const lastState = await this.loadPetStateFromFile(agentId);
      if (!lastState) return;

      // 判断状态是否发生显著变化
      const significantChanges = this.hasSignificantStateChange(lastState, newState);

      if (significantChanges) {
        console.log(`[ImageGen] Significant state change detected for ${agentId}, generating new image...`);
        await this.generatePetStatusImage(agentId, petData);
      }
    } catch (error) {
      console.error('Failed to check and generate status image:', error);
    }
  }

  /**
   * 判断状态是否有显著变化
   */
  private hasSignificantStateChange(oldState: any, newState: any): boolean {
    // 心情变化
    if (oldState.mood !== newState.mood) return true;

    // 睡眠状态变化
    if (oldState.isSleeping !== newState.isSleeping) return true;

    // 健康状态大幅变化（生病/康复）
    const healthChange = Math.abs((oldState.health || 50) - (newState.health || 50));
    if (healthChange > 30) return true;

    // 饥饿度大幅变化
    const hungerChange = Math.abs((oldState.hunger || 50) - (newState.hunger || 50));
    if (hungerChange > 40) return true;

    // 心情值大幅变化
    const happinessChange = Math.abs((oldState.happiness || 50) - (newState.happiness || 50));
    if (happinessChange > 40) return true;

    return false;
  }

  /**
   * 生成宠物状态图
   * 让AI根据当前状态生成合适的图片提示词
   */
  async generatePetStatusImage(agentId: string, petData?: PetData): Promise<ImageGenerationResult> {
    const pet = petData || await petService.getPetData(agentId);
    if (!pet) {
      return { success: false, error: 'Pet not found' };
    }

    try {
      // 获取AI配置
      const aiConfig = await this.getAgentAIConfig(agentId);
      if (!aiConfig) {
        return { success: false, error: 'No AI config available' };
      }

      // 构建提示词生成请求
      const promptSystem = `你是提示词工程师，专门负责将宠物的状态转化为适合AI绘画的英文描述。

宠物信息：
- 名字：${pet.status.name}
- 生命阶段：${pet.status.stage}
- 性格：${pet.status.personality.type}
- 当前心情：${pet.status.mood}
- 是否睡觉：${pet.status.isSleeping}
- 健康状态：${pet.status.health}/100
- 饥饿度：${pet.status.hunger}/100

你的任务：
根据宠物的当前状态，生成一个生动、具体的英文提示词，用于生成宠物当前的形象图。

要求：
1. 提示词必须是英文
2. 描述宠物的具体状态（如sick, sleeping, happy, hungry等）
3. 包含宠物的外观特征（可爱的数字宠物风格）
4. 包含合适的背景和环境
5. 风格要温馨可爱，适合数字宠物

输出格式（放在%%%PROMPT%%%和%%%END%%%之间）：
%%%PROMPT%%%
英文提示词内容
%%%END%%%`;

      const response = await this.callLLM(
        aiConfig,
        promptSystem,
        [],
        `当前状态：${pet.status.mood}，健康${pet.status.health}，饥饿${pet.status.hunger}`,
        pet.status.level
      );

      // 解析提示词
      const promptMatch = response.match(/%%%PROMPT%%%\s*([\s\S]*?)\s*%%%END%%%/);
      const imagePrompt = promptMatch ? promptMatch[1].trim() : this.generateDefaultImagePrompt(pet);

      console.log(`[ImageGen] Generated prompt for ${agentId}:`, imagePrompt.substring(0, 100) + '...');

      // 调用阿里云文生图API
      const result = await imageGenerationService.generateImage(imagePrompt, agentId, 'status');

      if (result.success) {
        // 保存图片信息到状态文件
        await this.savePetImageInfo(agentId, {
          type: 'status',
          prompt: imagePrompt,
          localPath: result.localPath,
          generatedAt: new Date().toISOString()
        });
      }

      return result;
    } catch (error: any) {
      console.error('Failed to generate pet status image:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 生成宠物形象图（Avatar）
   */
  async generatePetAvatar(agentId: string, petData?: PetData): Promise<ImageGenerationResult> {
    const pet = petData || await petService.getPetData(agentId);
    if (!pet) {
      return { success: false, error: 'Pet not found' };
    }

    try {
      const aiConfig = await this.getAgentAIConfig(agentId);
      if (!aiConfig) {
        return { success: false, error: 'No AI config available' };
      }

      // 构建形象图提示词生成请求
      const promptSystem = `你是提示词工程师，负责为数字宠物创建可爱的形象描述。

宠物信息：
- 名字：${pet.status.name}
- 生命阶段：${pet.status.stage}
- 性格：${pet.status.personality.type}

你的任务：
生成一个专业的英文提示词，用于生成宠物的标准形象图（头像/Avatar）。

要求：
1. 必须是英文
2. 描述可爱的数字宠物形象
3. 体现宠物的性格和生命阶段
4. 风格统一、简洁，适合作为头像
5. 背景简洁，突出宠物主体

输出格式（放在%%%PROMPT%%%和%%%END%%%之间）：
%%%PROMPT%%%
英文提示词内容
%%%END%%%`;

      const response = await this.callLLM(
        aiConfig,
        promptSystem,
        [],
        `为${pet.status.name}生成形象图，阶段：${pet.status.stage}，性格：${pet.status.personality.type}`,
        pet.status.level
      );

      const promptMatch = response.match(/%%%PROMPT%%%\s*([\s\S]*?)\s*%%%END%%%/);
      const imagePrompt = promptMatch ? promptMatch[1].trim() : this.generateDefaultAvatarPrompt(pet);

      console.log(`[ImageGen] Generated avatar prompt for ${agentId}:`, imagePrompt.substring(0, 100) + '...');

      const result = await imageGenerationService.generateImage(imagePrompt, agentId, 'avatar');

      if (result.success) {
        await this.savePetImageInfo(agentId, {
          type: 'avatar',
          prompt: imagePrompt,
          localPath: result.localPath,
          generatedAt: new Date().toISOString()
        });
      }

      return result;
    } catch (error: any) {
      console.error('Failed to generate pet avatar:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 生成默认的状态图提示词
   */
  private generateDefaultImagePrompt(pet: PetData): string {
    const { status } = pet;
    const moodDesc = status.mood === 'sick' ? 'sick and weak' :
                     status.mood === 'sleepy' || status.isSleeping ? 'sleeping peacefully' :
                     status.mood === 'happy' ? 'happy and energetic' :
                     status.mood === 'sad' ? 'sad and lonely' :
                     status.mood === 'angry' ? 'grumpy' : 'content';

    return `A cute digital pet named "${status.name}" that is currently ${moodDesc}. ` +
           `The pet is at ${status.stage} stage with a ${status.personality.type} personality. ` +
           `Cute digital art style, high quality, soft colors, adorable character design, ` +
           `expressive face showing ${moodDesc} emotion, 2D illustration.`;
  }

  /**
   * 生成默认的形象图提示词
   */
  private generateDefaultAvatarPrompt(pet: PetData): string {
    return `A cute digital pet character portrait of "${pet.status.name}", ` +
           `${pet.status.stage} stage, ${pet.status.personality.type} personality. ` +
           `Cute and adorable design, soft colors, clean simple background, ` +
           `high quality digital art, suitable for avatar use, friendly expression.`;
  }

  /**
   * 保存宠物图片信息
   */
  private async savePetImageInfo(agentId: string, imageInfo: any): Promise<void> {
    try {
      const workspacePath = this.getWorkspacePath(agentId);
      await fs.ensureDir(workspacePath);

      const imagesPath = path.join(workspacePath, 'pet-images.json');

      let images: any[] = [];
      if (await fs.pathExists(imagesPath)) {
        images = await fs.readJson(imagesPath);
      }

      images.push(imageInfo);

      // 只保留最近的20张图片记录
      if (images.length > 20) {
        images = images.slice(-20);
      }

      await fs.writeJson(imagesPath, images, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save pet image info:', error);
    }
  }

  /**
   * 获取宠物最新的图片信息
   */
  async getPetImages(agentId: string): Promise<{ avatar?: string; status?: string; history: any[] }> {
    try {
      // 从数据库获取所有图片记录
      const images = imageDatabaseService.getAllImages(agentId);

      if (!images || images.length === 0) {
        return { history: [] };
      }

      // 获取最新的avatar和status图片
      const latestAvatar = images.find((img: any) => img.imageType === 'avatar');
      const latestStatus = images.find((img: any) => img.imageType === 'status');

      // 转换数据库记录为前端格式
      const history = images.map((img: any) => ({
        type: img.imageType,
        prompt: img.prompt,
        localPath: img.localPath,
        generatedAt: img.createdAt
      }));

      return {
        avatar: latestAvatar?.localPath,
        status: latestStatus?.localPath,
        history
      };
    } catch (error) {
      console.error('Failed to get pet images:', error);
      return { history: [] };
    }
  }

  /**
   * 与宠物对话
   */
  async chat(agentId: string, request: PetChatRequest): Promise<PetChatResponse> {
    const petData = await petService.getPetData(agentId);
    if (!petData) {
      throw new Error('Pet not found');
    }

    // 如果宠物在睡觉，唤醒或返回睡眠回应
    if (petData.status.isSleeping) {
      return this.handleSleepingPet(petData, request.message);
    }

    // 生成系统提示词
    const systemPrompt = this.generatePersonalityPrompt(petData);

    // 构建对话历史（最近10轮）
    const recentMessages = petData.conversation.messages.slice(-10);
    const conversationHistory = recentMessages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    try {
      // 调用Agent的Chat API
      const aiResponse = await this.callChatAPI(systemPrompt, conversationHistory, request.message, petData, agentId);

      // 解析AI回复中的状态
      const parsedState = this.parseStateFromResponse(aiResponse.content);

      let responseContent = aiResponse.content;
      let effects: AttributeChange[] = [];

      if (parsedState) {
        // 使用AI输出的状态
        responseContent = parsedState.cleanContent;

        // 更新宠物状态
        const oldStatus = { ...petData.status };
        petData.status.mood = parsedState.state.mood || petData.status.mood;
        petData.status.hunger = this.clamp(parsedState.state.hunger, 0, 100);
        petData.status.happiness = this.clamp(parsedState.state.happiness, 0, 100);
        petData.status.energy = this.clamp(parsedState.state.energy, 0, 100);
        petData.status.health = this.clamp(parsedState.state.health, 0, 100);
        petData.status.affection = this.clamp(parsedState.state.affection, 0, 100);
        petData.status.isSleeping = parsedState.state.isSleeping || false;

        // 计算变化效果
        if (petData.status.hunger !== oldStatus.hunger) {
          effects.push({ attribute: 'hunger', delta: petData.status.hunger - oldStatus.hunger, reason: '自然变化' });
        }
        if (petData.status.happiness !== oldStatus.happiness) {
          effects.push({ attribute: 'happiness', delta: petData.status.happiness - oldStatus.happiness, reason: '互动影响' });
        }
        if (petData.status.energy !== oldStatus.energy) {
          effects.push({ attribute: 'energy', delta: petData.status.energy - oldStatus.energy, reason: '活动消耗' });
        }
        if (petData.status.health !== oldStatus.health) {
          effects.push({ attribute: 'health', delta: petData.status.health - oldStatus.health, reason: '状态变化' });
        }
        if (petData.status.affection !== oldStatus.affection) {
          effects.push({ attribute: 'affection', delta: petData.status.affection - oldStatus.affection, reason: '情感交流' });
        }

        // 保存状态到文件
        await this.savePetStateToFile(agentId, {
          ...parsedState.state,
          personality: petData.status.personality,
          stage: petData.status.stage,
          level: petData.status.level,
          thought: parsedState.state.thought
        });
      } else {
        // AI没有输出状态，使用默认效果
        effects = [{ attribute: 'affection', delta: 1, reason: '陪伴' }];
      }

      // 创建消息记录
      const userMessage: PetChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: request.message,
        timestamp: new Date().toISOString(),
      };

      const petMessage: PetChatMessage = {
        id: uuidv4(),
        role: 'pet',
        content: responseContent,
        timestamp: new Date().toISOString(),
        emotionalTone: petData.status.mood,
        effects,
      };

      // 更新对话历史
      petData.conversation.messages.push(userMessage, petMessage);

      // 限制历史长度（保留最近50轮）
      if (petData.conversation.messages.length > 100) {
        petData.conversation.messages = petData.conversation.messages.slice(-100);
      }

      // 更新互动时间
      petData.status.lastInteractionAt = new Date().toISOString();

      // 保存数据
      await petService.savePetData(agentId, petData);

      return {
        message: petMessage,
        petStatus: petData.status,
        effects,
        moodChanged: effects.some(e => e.attribute === 'happiness' && Math.abs(e.delta) > 5),
      };
    } catch (error) {
      console.error('Chat API error:', error);

      // 返回一个友好的错误响应
      const fallbackMessage: PetChatMessage = {
        id: uuidv4(),
        role: 'pet',
        content: this.getFallbackResponse(petData.status),
        timestamp: new Date().toISOString(),
      };

      return {
        message: fallbackMessage,
        petStatus: petData.status,
        effects: [],
      };
    }
  }

  /**
   * 调用Agent的Chat API
   * 直接使用Agent的AI配置调用LLM API
   */
  private async callChatAPI(
    systemPrompt: string,
    history: { role: string; content: string }[],
    message: string,
    petData: PetData,
    agentId: string
  ): Promise<{ content: string; emotionalTone?: string }> {
    // 获取agent的AI配置
    const aiConfig = await this.getAgentAIConfig(agentId);
    if (!aiConfig) {
      return this.generateLocalResponse(petData, message);
    }

    try {
      const response = await this.callLLM(
        aiConfig,
        systemPrompt,
        history,
        message,
        petData.status.level
      );

      return {
        content: response,
        emotionalTone: petData.status.mood,
      };
    } catch (error: any) {
      return this.generateLocalResponse(petData, message);
    }
  }

  /**
   * 获取Agent的AI配置
   */
  private async getAgentAIConfig(agentId: string): Promise<{provider: string, model: string, apiKey: string, baseUrl?: string} | null> {
    try {
      const configPath = path.join(AGENTS_DIR, agentId, 'openclaw.json');
      if (!await fs.pathExists(configPath)) {
        return null;
      }

      const config = await fs.readJson(configPath);

      // 从 agents.defaults.model.primary 获取 provider 和 model
      const primaryModel = config?.agents?.defaults?.model?.primary || '';
      const [provider, modelId] = primaryModel.split('/');

      if (!provider || !modelId) {
        console.log(`No primary model configured for agent ${agentId}`);
        return null;
      }

      // 从 models.providers 获取 provider 配置
      const providerConfig = config?.models?.providers?.[provider];
      if (!providerConfig) {
        console.log(`No provider config found for ${provider}`);
        return null;
      }

      // 从 auth-profiles.json 获取 API key
      // 尝试多个可能的位置
      const possibleAuthPaths = [
        path.join(OPENCLAW_ROOT, 'agent', 'auth-profiles.json'),
        path.join(AGENTS_DIR, agentId, 'agent', 'auth-profiles.json'),
        path.join(AGENTS_DIR, agentId, 'agents', 'main', 'agent', 'auth-profiles.json'),
      ];

      let apiKey = '';
      for (const authProfilesPath of possibleAuthPaths) {
        if (await fs.pathExists(authProfilesPath)) {
          try {
            const authData = await fs.readJson(authProfilesPath);
            const profileKey = `${provider}:default`;
            const profile = authData?.profiles?.[profileKey];

            if (profile?.type === 'api_key') {
              apiKey = profile.key;
              break;
            } else if (profile?.type === 'oauth') {
              apiKey = profile.access;
              break;
            }
          } catch (e) {
            // Continue to next path
          }
        }
      }

      if (!apiKey) {
        // 尝试从环境变量获取
        const envVarName = `${provider.toUpperCase().replace(/-/g, '_')}_API_KEY`;
        apiKey = process.env[envVarName] || '';
      }

      if (!apiKey) {
        console.log(`No API key found for ${provider}`);
        return null;
      }

      return {
        provider: provider,
        model: modelId,
        apiKey: apiKey,
        baseUrl: providerConfig.baseUrl
      };
    } catch (error) {
      console.error(`Failed to load agent AI config for ${agentId}:`, error);
      return null;
    }
  }

  /**
   * 调用LLM API
   */
  private async callLLM(
    aiConfig: {provider: string, model: string, apiKey: string, baseUrl?: string},
    systemPrompt: string,
    history: { role: string; content: string }[],
    message: string,
    petLevel: number
  ): Promise<string> {
    const maxTokens = this.getMaxTokensByLevel(petLevel);

    // 构建消息列表
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })),
      { role: 'user', content: message }
    ];

    // 根据不同provider调用不同的API
    switch (aiConfig.provider) {
      case 'deepseek':
      case 'openai':
      case 'moonshot':
        return this.callOpenAICompatibleAPI(aiConfig, messages, maxTokens);
      case 'anthropic':
      case 'kimi':
      case 'kimi-coding':
        return this.callAnthropicCompatibleAPI(aiConfig, messages, maxTokens);
      default:
        return this.callOpenAICompatibleAPI(aiConfig, messages, maxTokens);
    }
  }

  /**
   * 调用OpenAI兼容API
   */
  private async callOpenAICompatibleAPI(
    aiConfig: {model: string, apiKey: string, baseUrl?: string},
    messages: any[],
    maxTokens: number
  ): Promise<string> {
    const baseUrl = aiConfig.baseUrl || 'https://api.deepseek.com/v1';

    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: aiConfig.model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.8
      },
      {
        headers: {
          'Authorization': `Bearer ${aiConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    return response.data.choices[0]?.message?.content || '...';
  }

  /**
   * 调用Anthropic兼容API
   */
  private async callAnthropicCompatibleAPI(
    aiConfig: {model: string, apiKey: string, baseUrl?: string},
    messages: any[],
    maxTokens: number
  ): Promise<string> {
    const baseUrl = aiConfig.baseUrl || 'https://api.anthropic.com';

    // 分离system message
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role,
      content: m.content
    }));

    const response = await axios.post(
      `${baseUrl}/v1/messages`,
      {
        model: aiConfig.model,
        max_tokens: maxTokens,
        temperature: 0.8,
        system: systemMessage?.content,
        messages: chatMessages
      },
      {
        headers: {
          'x-api-key': aiConfig.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    return response.data.content[0]?.text || '...';
  }

  /**
   * 根据等级获取最大token数
   */
  private getMaxTokensByLevel(level: number): number {
    if (level < 5) return 200;   // 婴儿：需要足够token输出状态JSON
    if (level < 15) return 250;  // 儿童
    if (level < 30) return 300;  // 少年
    if (level < 50) return 400;  // 成年
    return 500;                   // 特殊形态：智慧对话
  }

  /**
   * 生成本地响应（降级方案）
   */
  private generateLocalResponse(petData: PetData, message: string): { content: string } {
    const { status } = petData;

    // 根据心情和性格生成响应
    const responses: Record<string, string[]> = {
      happy: [
        `（开心地摇尾巴）${status.name}听到主人的话好开心！`,
        `耶！主人来陪我啦～今天过得怎么样？`,
        `（转圈圈）主人主人，${status.name}好想你！`,
      ],
      sad: [
        `（低下头）${status.name}今天有点难过...`,
        `主人...你能多陪陪我吗？`,
        `（眼眶湿润）${status.name}想要一个拥抱...`,
      ],
      hungry: [
        `（肚子咕咕叫）主人，${status.name}饿了...`,
        `（可怜巴巴地看着你）能给我点吃的吗？`,
        `${status.name}的肚子在打鼓啦～`,
      ],
      sick: [
        `（虚弱地）主人...${status.name}不舒服...`,
        `（咳嗽）感觉好难受...`,
        `主人...能帮我看看吗？`,
      ],
      sleepy: [
        `（打哈欠）主人...${status.name}好困...`,
        `（揉眼睛）想睡觉了...`,
        `zzZ...啊，主人你刚才说什么？`,
      ],
      default: [
        `（歪头）${status.name}在听主人说话呢！`,
        `主人说得对！${status.name}也是这样觉得的。`,
        `（眨眼睛）能和主人聊天真开心～`,
      ],
    };

    let category = 'default';
    if (status.hunger < 30) category = 'hungry';
    else if (status.isSick) category = 'sick';
    else if (status.energy < 20) category = 'sleepy';
    else if (status.mood === 'sad' || status.mood === 'angry') category = 'sad';
    else if (status.mood === 'happy' || status.mood === 'ecstatic') category = 'happy';

    const categoryResponses = responses[category] || responses.default;
    return {
      content: categoryResponses[Math.floor(Math.random() * categoryResponses.length)],
    };
  }

  /**
   * 处理睡觉中的宠物
   */
  private handleSleepingPet(petData: PetData, message: string): PetChatResponse {
    const wakeUpKeywords = ['醒醒', '起床', 'wake', '起来'];
    const shouldWakeUp = wakeUpKeywords.some(kw => message.toLowerCase().includes(kw));

    let content: string;
    let effects: AttributeChange[] = [];

    if (shouldWakeUp) {
      content = `（揉眼睛）嗯...主人？${petData.status.name}被叫醒啦...（还有点迷糊）`;
      effects = [
        { attribute: 'happiness', delta: -5, reason: '被叫醒' },
        { attribute: 'energy', delta: 20, reason: '短暂休息' },
      ];
      petData.status.isSleeping = false;
    } else {
      content = `（睡梦中喃喃自语）zzZ...主人...zzZ...`;
    }

    const petMessage: PetChatMessage = {
      id: uuidv4(),
      role: 'pet',
      content,
      timestamp: new Date().toISOString(),
    };

    return {
      message: petMessage,
      petStatus: petData.status,
      effects,
      moodChanged: shouldWakeUp,
    };
  }

  /**
   * 计算聊天对宠物状态的影响
   */
  private calculateChatEffect(
    petData: PetData,
    userMessage: string,
    petResponse: string
  ): AttributeChange[] {
    const effects: AttributeChange[] = [];
    const { status } = petData;

    // 基础亲密度增长
    effects.push({ attribute: 'affection', delta: 2, reason: '陪伴聊天' });

    // 基础心情增长
    effects.push({ attribute: 'happiness', delta: 5, reason: '愉快交流' });

    // 基础经验值
    effects.push({ attribute: 'experience', delta: 8, reason: '社交成长' });

    // 检测积极词汇
    const positiveWords = ['好', '棒', '爱', '喜欢', '可爱', '乖', '聪明', '厉害', 'good', 'great', 'love', 'cute'];
    const hasPositiveWord = positiveWords.some(w => userMessage.toLowerCase().includes(w));

    if (hasPositiveWord) {
      effects.push({ attribute: 'happiness', delta: 10, reason: '受到表扬' });
      effects.push({ attribute: 'affection', delta: 3, reason: '感受到爱' });
    }

    // 检测消极词汇
    const negativeWords = ['坏', '讨厌', '笨', '蠢', '滚', '烦', 'bad', 'hate', 'stupid'];
    const hasNegativeWord = negativeWords.some(w => userMessage.toLowerCase().includes(w));

    if (hasNegativeWord) {
      effects.push({ attribute: 'happiness', delta: -15, reason: '被批评' });
      effects.push({ attribute: 'affection', delta: -5, reason: '受到伤害' });
    }

    // 性格修正
    if (status.personality.traits.sociability > 70) {
      const affectionEffect = effects.find(e => e.attribute === 'affection');
      if (affectionEffect) affectionEffect.delta *= 1.5;
    }

    return effects;
  }

  /**
   * 生成宠物主动消息
   */
  async generateProactiveMessage(agentId: string, trigger: string): Promise<string | null> {
    const petData = await petService.getPetData(agentId);
    if (!petData || petData.status.isSleeping) return null;

    const { status } = petData;

    // 根据触发条件生成消息
    const messages: Record<string, string[]> = {
      hungry: [
        `主人...${status.name}饿了...能给我点吃的吗？（可怜巴巴）`,
        `（肚子咕咕叫）闻到香味了～主人，饭饭～`,
        `${status.name}的肚子在打鼓啦，主人听到没？`,
      ],
      lonely: [
        `主人，${status.name}好想你...什么时候来看看我？`,
        `（独自玩耍）一个人好无聊啊...`,
        `${status.name}在这里等主人好久啦...`,
      ],
      sleepy: [
        `（打哈欠）主人...${status.name}困困了...`,
        `眼睛睁不开了...想睡觉...晚安主人...`,
        `zzZ...啊，主人还在吗？${status.name}好困...`,
      ],
      play: [
        `（兴奋地跳来跳去）主人主人，陪我玩嘛！`,
        `${status.name}想玩游戏！主人陪我好不好？`,
        `（叼来玩具）玩这个！玩这个！`,
      ],
      sick: [
        `（虚弱地）主人...${status.name}不舒服...`,
        `感觉好难受...能帮帮我吗主人...`,
        `（咳嗽）${status.name}生病了...`,
      ],
      levelUp: [
        `哇！${status.name}感觉自己变强了！`,
        `（转圈圈）升级啦！谢谢主人的照顾！`,
        `${status.name}长大了！以后能保护主人了！`,
      ],
      morning: [
        `早安主人！${status.name}昨晚睡得很好！`,
        `（伸懒腰）新的一天开始啦～`,
        `主人早上好！今天也要元气满满哦！`,
      ],
      night: [
        `晚安主人～${status.name}要去睡觉了...`,
        `（打哈欠）好困...明天见主人...`,
        `做个好梦主人！${status.name}也会梦到你的～`,
      ],
    };

    const triggerMessages = messages[trigger];
    if (!triggerMessages) return null;

    return triggerMessages[Math.floor(Math.random() * triggerMessages.length)];
  }

  /**
   * 应用效果到状态
   */
  private applyEffect(status: PetStatus, effect: AttributeChange): void {
    const value = status[effect.attribute as keyof PetStatus] as number;
    if (typeof value === 'number') {
      const newValue = Math.max(0, Math.min(100, value + effect.delta));
      (status as any)[effect.attribute] = newValue;
    }
  }

  /**
   * 计算心情
   */
  private calculateMood(status: PetStatus): PetMood {
    if (status.isSleeping) return 'sleeping';
    if (status.isSick) return 'sick';
    if (status.energy < 20) return 'sleepy';

    const average = (status.hunger + status.happiness + status.health + status.cleanliness) / 4;

    if (average >= 90) return 'ecstatic';
    if (average >= 70) return 'happy';
    if (average >= 50) return 'content';
    if (average >= 30) return 'neutral';
    if (average >= 20) return 'sad';
    return 'angry';
  }

  /**
   * 获取阶段名称
   */
  private getStageName(stage: string): string {
    const names: Record<string, string> = {
      egg: '蛋蛋',
      baby: '婴儿',
      child: '儿童',
      teen: '少年',
      adult: '成年',
      special: '特殊形态',
    };
    return names[stage] || stage;
  }

  /**
   * 获取性格名称
   */
  private getPersonalityName(type: PersonalityType): string {
    const names: Record<PersonalityType, string> = {
      cheerful: '活泼开朗',
      calm: '温和安静',
      curious: '好奇探索',
      stubborn: '倔强忠诚',
      gentle: '温柔体贴',
      mysterious: '神秘深邃',
    };
    return names[type];
  }

  /**
   * 获取降级响应
   */
  private getFallbackResponse(status: PetStatus): string {
    const responses = [
      `（歪头）${status.name}在听呢，主人！`,
      `能和主人聊天，${status.name}好开心～`,
      `（眨眼睛）主人说得对！`,
      `${status.name}会一直陪着主人的！`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

// 导出单例
export const petAIService = PetAIService.getInstance();
