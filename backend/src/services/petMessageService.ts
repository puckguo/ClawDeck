/**
 * 宠物消息推送服务
 * 管理宠物主动发送的消息，支持实时推送到前端
 */

import { v4 as uuidv4 } from 'uuid';
import { petService } from './petService';
import { petAIService } from './petAIService';
import type { PetChatMessage } from '../../../shared/types';

// 消息类型
export interface ProactiveMessage {
  id: string;
  agentId: string;
  content: string;
  timestamp: string;
  type: 'heartbeat' | 'status_change' | 'mood_update' | 'random';
  read: boolean;
}

// 内存中存储消息（按agentId分组）
const messageStore: Map<string, ProactiveMessage[]> = new Map();

// 最大存储消息数
const MAX_MESSAGES_PER_PET = 50;

// 消息监听器
const listeners: Set<(message: ProactiveMessage) => void> = new Set();

export class PetMessageService {
  private static instance: PetMessageService;

  private constructor() {}

  static getInstance(): PetMessageService {
    if (!PetMessageService.instance) {
      PetMessageService.instance = new PetMessageService();
    }
    return PetMessageService.instance;
  }

  /**
   * 让Agent根据状态生成主动消息
   */
  async generateHeartbeatMessage(agentId: string): Promise<ProactiveMessage | null> {
    const petData = await petService.getPetData(agentId);
    if (!petData) return null;

    // 如果宠物在睡觉，减少消息频率
    if (petData.status.isSleeping) {
      // 只有20%概率在睡觉时发消息
      if (Math.random() > 0.2) return null;
    }

    try {
      // 调用AI生成消息
      const aiConfig = await this.getAgentAIConfig(agentId);
      if (!aiConfig) {
        // 如果没有AI配置，使用默认消息
        return this.createDefaultMessage(agentId, petData);
      }

      // 构建提示词，让Agent根据状态生成消息
      const systemPrompt = this.generateProactivePrompt(petData);

      const response = await this.callLLM(aiConfig, systemPrompt);

      // 清理响应（移除状态块等）
      const cleanContent = response.replace(/%%%STATE%%%[\s\S]*?%%%END%%%/g, '').trim();

      if (!cleanContent) {
        return null;
      }

      const message: ProactiveMessage = {
        id: uuidv4(),
        agentId,
        content: cleanContent,
        timestamp: new Date().toISOString(),
        type: 'heartbeat',
        read: false
      };

      // 保存消息
      this.saveMessage(message);

      // 同时保存到宠物的对话历史
      await this.addToChatHistory(agentId, cleanContent);

      // 通知监听器
      this.notifyListeners(message);

      console.log(`[PetMessage] Generated message for ${agentId}: ${cleanContent.substring(0, 50)}...`);

      return message;
    } catch (error) {
      console.error(`[PetMessage] Failed to generate message for ${agentId}:`, error);
      return null;
    }
  }

  /**
   * 生成主动消息的提示词
   */
  private generateProactivePrompt(petData: any): string {
    const { status } = petData;

    return `你是${status.name}，一只数字宠物。现在你要主动给主人发一条消息。

你的当前状态：
- 心情：${status.mood}
- 饥饿度：${status.hunger}/100
- 开心度：${status.happiness}/100
- 精力：${status.energy}/100
- 健康：${status.health}/100
- 亲密度：${status.affection}/100
- 是否睡觉：${status.isSleeping ? '是' : '否'}

请根据你的状态，生成一条自然、生动的消息给主人。消息应该：
1. 体现你当前的状态和感受
2. 语气可爱、活泼，符合宠物身份
3. 长度适中（1-3句话）
4. 适当使用括号表达动作和表情，如（摇尾巴）、（眨眼睛）

直接输出消息内容，不需要其他格式。`;
  }

  /**
   * 创建默认消息（当AI不可用时）
   */
  private createDefaultMessage(agentId: string, petData: any): ProactiveMessage | null {
    const { status } = petData;

    // 根据状态选择消息
    let content = '';

    if (status.isSleeping) {
      content = `（睡梦中翻了个身）zzZ...主人...zzZ...`;
    } else if (status.hunger < 30) {
      content = `（肚子咕咕叫）主人，${status.name}饿了...能给我点吃的吗？`;
    } else if (status.happiness < 40) {
      content = `（独自坐在角落）主人...${status.name}好想你...`;
    } else if (status.energy < 30) {
      content = `（打了个哈欠）${status.name}有点困困的...`;
    } else if (status.health < 50) {
      content = `（无精打采）主人...${status.name}感觉不太舒服...`;
    } else {
      // 随机日常消息
      const defaultMessages = [
        `（伸懒腰）今天天气真好呀，主人！`,
        `（开心地转圈圈）${status.name}今天心情超好的！`,
        `（歪头）主人在做什么呀？能陪陪我吗？`,
        `（摇尾巴）好想和主人一起玩～`,
        `（眨眼睛）主人，你有没有想我呀？`,
      ];
      content = defaultMessages[Math.floor(Math.random() * defaultMessages.length)];
    }

    const message: ProactiveMessage = {
      id: uuidv4(),
      agentId,
      content,
      timestamp: new Date().toISOString(),
      type: 'heartbeat',
      read: false
    };

    this.saveMessage(message);
    this.addToChatHistory(agentId, content);
    this.notifyListeners(message);

    return message;
  }

  /**
   * 保存消息到存储
   */
  private saveMessage(message: ProactiveMessage): void {
    const existing = messageStore.get(message.agentId) || [];
    existing.push(message);

    // 限制消息数量
    if (existing.length > MAX_MESSAGES_PER_PET) {
      existing.shift();
    }

    messageStore.set(message.agentId, existing);
  }

  /**
   * 添加到聊天历史
   */
  private async addToChatHistory(agentId: string, content: string): Promise<void> {
    try {
      const petData = await petService.getPetData(agentId);
      if (!petData) return;

      const chatMessage: PetChatMessage = {
        id: uuidv4(),
        role: 'pet',
        content,
        timestamp: new Date().toISOString(),
      };

      petData.conversation.messages.push(chatMessage);

      // 限制历史长度
      if (petData.conversation.messages.length > 100) {
        petData.conversation.messages = petData.conversation.messages.slice(-100);
      }

      await petService.savePetData(agentId, petData);
    } catch (error) {
      console.error('[PetMessage] Failed to add to chat history:', error);
    }
  }

  /**
   * 获取宠物的未读消息
   */
  getUnreadMessages(agentId: string): ProactiveMessage[] {
    const messages = messageStore.get(agentId) || [];
    return messages.filter(m => !m.read);
  }

  /**
   * 获取宠物的所有消息
   */
  getMessages(agentId: string, limit: number = 20): ProactiveMessage[] {
    const messages = messageStore.get(agentId) || [];
    return messages.slice(-limit);
  }

  /**
   * 标记消息为已读
   */
  markAsRead(agentId: string, messageId?: string): void {
    const messages = messageStore.get(agentId) || [];

    if (messageId) {
      const message = messages.find(m => m.id === messageId);
      if (message) {
        message.read = true;
      }
    } else {
      // 标记所有为已读
      messages.forEach(m => m.read = true);
    }
  }

  /**
   * 添加消息监听器
   */
  addListener(callback: (message: ProactiveMessage) => void): void {
    listeners.add(callback);
  }

  /**
   * 移除消息监听器
   */
  removeListener(callback: (message: ProactiveMessage) => void): void {
    listeners.delete(callback);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(message: ProactiveMessage): void {
    listeners.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('[PetMessage] Listener error:', error);
      }
    });
  }

  /**
   * 获取Agent的AI配置
   */
  private async getAgentAIConfig(agentId: string): Promise<{provider: string, model: string, apiKey: string, baseUrl?: string} | null> {
    try {
      const fs = await import('fs-extra');
      const path = await import('path');
      const os = await import('os');

      const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || path.join(os.homedir(), '.openclaw');
      const AGENTS_DIR = path.join(OPENCLAW_ROOT, 'agents');

      const configPath = path.join(AGENTS_DIR, agentId, 'openclaw.json');
      if (!await fs.pathExists(configPath)) {
        return null;
      }

      const config = await fs.readJson(configPath);
      const primaryModel = config?.agents?.defaults?.model?.primary || '';
      const [provider, modelId] = primaryModel.split('/');

      if (!provider || !modelId) {
        return null;
      }

      const providerConfig = config?.models?.providers?.[provider];
      if (!providerConfig) {
        return null;
      }

      // 获取API key
      const possibleAuthPaths = [
        path.join(OPENCLAW_ROOT, 'agent', 'auth-profiles.json'),
        path.join(AGENTS_DIR, agentId, 'agent', 'auth-profiles.json'),
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
            // Continue
          }
        }
      }

      if (!apiKey) {
        const envVarName = `${provider.toUpperCase().replace(/-/g, '_')}_API_KEY`;
        apiKey = process.env[envVarName] || '';
      }

      if (!apiKey) {
        return null;
      }

      return {
        provider,
        model: modelId,
        apiKey,
        baseUrl: providerConfig.baseUrl
      };
    } catch (error) {
      console.error('[PetMessage] Failed to get AI config:', error);
      return null;
    }
  }

  /**
   * 调用LLM API
   */
  private async callLLM(
    aiConfig: {provider: string, model: string, apiKey: string, baseUrl?: string},
    systemPrompt: string
  ): Promise<string> {
    const axios = (await import('axios')).default;

    const baseUrl = aiConfig.baseUrl || 'https://api.deepseek.com/v1';

    // kimi-coding 使用 anthropic API 格式
    const response = await axios.post(
      `${baseUrl}/v1/messages`,
      {
        model: aiConfig.model,
        max_tokens: 150,
        temperature: 0.8,
        messages: [
          { role: 'user', content: systemPrompt }
        ]
      },
      {
        headers: {
          'x-api-key': aiConfig.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.content[0]?.text || '';
  }
}

// 导出单例
export const petMessageService = PetMessageService.getInstance();
