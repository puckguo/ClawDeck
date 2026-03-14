import { apiClient } from './client'
import type {
  PetData,
  PetStatus,
  PetSummary,
  InteractResponse,
  PetChatResponse,
  PetChatMessage,
  Interaction,
  DailyTask,
  PetAchievement,
  PetItem,
  EvolutionBranch,
  RandomEvent,
  ApiResponse,
  CreatePetRequest
} from '../../../shared/types'

export interface PetStats {
  totalInteractions: number
  favoriteInteraction: string | null
  chatCount: number
  playTimeHours: number
  unlockedAchievements: number
  totalAchievements: number
}

export const petsApi = {
  // 获取所有宠物摘要
  getAll(): Promise<ApiResponse<PetSummary[]>> {
    return apiClient.get('/pets')
  },

  // 创建新宠物
  create(data: CreatePetRequest): Promise<ApiResponse<PetData>> {
    return apiClient.post('/pets', data)
  },

  // 获取宠物完整数据
  getById(agentId: string): Promise<ApiResponse<PetData>> {
    return apiClient.get(`/pets/${agentId}`)
  },

  // 获取宠物状态（含离线衰减计算）
  getStatus(agentId: string): Promise<ApiResponse<PetStatus>> {
    return apiClient.get(`/pets/${agentId}/status`)
  },

  // 与宠物互动
  interact(agentId: string, type: string, data?: Record<string, unknown>): Promise<ApiResponse<InteractResponse>> {
    return apiClient.post(`/pets/${agentId}/interact`, { type, data })
  },

  // 唤醒宠物
  wakeUp(agentId: string): Promise<ApiResponse<PetStatus>> {
    return apiClient.post(`/pets/${agentId}/wake`)
  },

  // 与宠物对话
  chat(agentId: string, message: string): Promise<ApiResponse<PetChatResponse>> {
    return apiClient.post(`/pets/${agentId}/chat`, { message })
  },

  // 获取对话历史
  getChatHistory(agentId: string, limit?: number): Promise<ApiResponse<PetChatMessage[]>> {
    return apiClient.get(`/pets/${agentId}/chat/history`, { params: { limit } })
  },

  // 获取互动历史
  getInteractions(agentId: string, limit?: number): Promise<ApiResponse<Interaction[]>> {
    return apiClient.get(`/pets/${agentId}/interactions`, { params: { limit } })
  },

  // 获取每日任务
  getTasks(agentId: string): Promise<ApiResponse<DailyTask[]>> {
    return apiClient.get(`/pets/${agentId}/tasks`)
  },

  // 处理每日登录
  login(agentId: string): Promise<ApiResponse<{ pet: PetData; consecutiveDays: number; message: string }>> {
    return apiClient.post(`/pets/${agentId}/login`)
  },

  // 获取成就列表
  getAchievements(agentId: string): Promise<ApiResponse<PetAchievement[]>> {
    return apiClient.get(`/pets/${agentId}/achievements`)
  },

  // 获取物品栏
  getInventory(agentId: string): Promise<ApiResponse<PetItem[]>> {
    return apiClient.get(`/pets/${agentId}/inventory`)
  },

  // 获取进化信息
  getEvolution(agentId: string): Promise<ApiResponse<{
    currentStage: string
    currentBranch?: string
    evolutionPoints: number
    branches: EvolutionBranch[]
    appearance: { baseForm: string; color: string; accessories: unknown[] }
  }>> {
    return apiClient.get(`/pets/${agentId}/evolution`)
  },

  // 获取宠物统计
  getStats(agentId: string): Promise<ApiResponse<PetStats>> {
    return apiClient.get(`/pets/${agentId}/stats`)
  },

  // 获取随机事件
  getEvent(agentId: string): Promise<ApiResponse<RandomEvent | null>> {
    return apiClient.get(`/pets/${agentId}/event`)
  },

  // 删除宠物
  delete(agentId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/pets/${agentId}`)
  },

  // 手动触发评估
  evaluate(agentId?: string): Promise<ApiResponse<{
    success: boolean;
    message: string;
    details?: unknown;
  }>> {
    if (agentId) {
      return apiClient.post(`/pets/${agentId}/evaluate`)
    }
    return apiClient.post('/pets/evaluate/all')
  },

  // 获取记忆活跃度统计
  getMemoryStats(agentId: string, days?: number): Promise<ApiResponse<{
    dates: string[];
    activityScores: number[];
    totalAffectionEarned: number;
    totalExperienceEarned: number;
    averageScore: number;
  }>> {
    return apiClient.get(`/pets/${agentId}/memory-stats`, { params: { days } })
  },

  // 获取定时任务状态
  getJobStatus(): Promise<ApiResponse<{
    isRunning: boolean;
    lastRunDate: string | null;
    nextRunTime: string | null;
    config: {
      enabled: boolean;
      scheduleTime: string;
      timezone: string;
    };
  }>> {
    return apiClient.get('/jobs/daily-evaluation/status')
  },

  // 生成宠物图片
  generateImage(agentId: string, type: 'avatar' | 'status'): Promise<ApiResponse<{
    success: boolean;
    imageUrl?: string;
    localPath?: string;
    prompt?: string;
    error?: string;
  }>> {
    return apiClient.post(`/pets/${agentId}/images/generate`, { type })
  },

  // 获取宠物图片列表
  getImages(agentId: string): Promise<ApiResponse<{
    avatar?: string;
    status?: string;
    history: Array<{
      type: string;
      prompt: string;
      localPath: string;
      generatedAt: string;
    }>;
  }>> {
    return apiClient.get(`/pets/${agentId}/images`)
  },

  // 获取最新状态图片URL
  getLatestImageUrl(agentId: string): string {
    return `/api/pets/${agentId}/images/latest`
  },

  // 获取指定图片文件URL
  getImageFileUrl(agentId: string, filename: string): string {
    return `/api/pets/${agentId}/images/file/${filename}`
  },

  // TTS 语音合成
  textToSpeech(agentId: string, text: string, voice?: string): Promise<ApiResponse<{
    success: boolean;
    audioUrl?: string;
    localPath?: string;
    voice?: string;
    error?: string;
  }>> {
    return apiClient.post(`/pets/${agentId}/tts`, { text, voice })
  },

  // 获取可用的TTS音色列表
  getTTSVoices(agentId: string): Promise<ApiResponse<{
    voices: Array<{
      id: string;
      name: string;
      description: string;
      language: string;
    }>;
    defaultVoice: string;
    currentVoice: string;
  }>> {
    return apiClient.get(`/pets/${agentId}/tts/voices`)
  },

  // 获取最新TTS音频URL
  getLatestTTSUrl(agentId: string): string {
    return `/api/pets/${agentId}/tts/latest`
  },

  // 获取主动消息
  getMessages(agentId: string, limit?: number): Promise<ApiResponse<Array<{
    id: string;
    agentId: string;
    content: string;
    timestamp: string;
    type: string;
    read: boolean;
  }>>> {
    return apiClient.get(`/pets/${agentId}/messages`, { params: { limit } })
  },

  // 获取未读消息
  getUnreadMessages(agentId: string): Promise<ApiResponse<Array<{
    id: string;
    agentId: string;
    content: string;
    timestamp: string;
    type: string;
    read: boolean;
  }>>> {
    return apiClient.get(`/pets/${agentId}/messages/unread`)
  },

  // 标记消息为已读
  markMessagesAsRead(agentId: string, messageId?: string): Promise<ApiResponse<void>> {
    return apiClient.post(`/pets/${agentId}/messages/read`, { messageId })
  }
}
