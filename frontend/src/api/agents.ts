import { apiClient } from './client'
import type {
  AgentViewModel,
  CreateAgentRequest,
  UpdateAgentRequest,
  OpenClawConfig,
  ConfigVersion,
  ApiResponse
} from '../../../shared/types'

export const agentsApi = {
  // 获取默认 AI 配置
  getDefaultAI(): Promise<ApiResponse<{ provider: string; model: string; baseUrl?: string; apiKey?: string }>> {
    return apiClient.get('/agents/defaults/ai')
  },

  // 获取所有 Agent
  getAll(): Promise<ApiResponse<AgentViewModel[]>> {
    return apiClient.get('/agents')
  },

  // 获取单个 Agent
  getById(id: string): Promise<ApiResponse<AgentViewModel>> {
    return apiClient.get(`/agents/${id}`)
  },

  // 创建 Agent
  create(data: CreateAgentRequest): Promise<ApiResponse<AgentViewModel>> {
    return apiClient.post('/agents', data)
  },

  // 更新 Agent
  update(id: string, data: UpdateAgentRequest): Promise<ApiResponse<AgentViewModel>> {
    return apiClient.patch(`/agents/${id}`, data)
  },

  // 删除 Agent
  delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/agents/${id}`)
  },

  // 启动 Agent
  start(id: string): Promise<ApiResponse<void>> {
    return apiClient.post(`/agents/${id}/start`)
  },

  // 停止 Agent
  stop(id: string): Promise<ApiResponse<void>> {
    return apiClient.post(`/agents/${id}/stop`)
  },

  // 重启 Agent
  restart(id: string): Promise<ApiResponse<void>> {
    return apiClient.post(`/agents/${id}/restart`)
  },

  // 批量操作
  batch(agentIds: string[], operation: 'start' | 'stop' | 'restart'): Promise<ApiResponse<Record<string, boolean>>> {
    return apiClient.post('/agents/batch', { agentIds, operation })
  },

  // 获取配置
  getConfig(id: string): Promise<ApiResponse<OpenClawConfig>> {
    return apiClient.get(`/config/${id}`)
  },

  // 更新配置
  updateConfig(id: string, config: OpenClawConfig): Promise<ApiResponse<void>> {
    return apiClient.put(`/config/${id}`, config)
  },

  // 获取版本历史
  getVersions(id: string): Promise<ApiResponse<ConfigVersion[]>> {
    return apiClient.get(`/agents/${id}/versions`)
  },

  // 恢复版本
  restoreVersion(id: string, versionId: string): Promise<ApiResponse<void>> {
    return apiClient.post(`/agents/${id}/versions/${versionId}/restore`)
  }
}
