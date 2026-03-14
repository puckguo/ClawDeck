import { apiClient } from './client'
import type {
  Skill,
  SkillInstallRequest,
  SkillInstallResponse,
  SkillCategory,
  ApiResponse
} from '../../../shared/types'

export const skillsApi = {
  // 获取 Skills 列表（从 ClawHub）
  getAll(limit: number = 50, sort: string = 'updated', cursor?: string): Promise<ApiResponse<Skill[]>> {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    params.append('sort', sort)
    if (cursor) params.append('cursor', cursor)
    return apiClient.get(`/skills-market/skills?${params.toString()}`)
  },

  // 获取 Skill 详情
  getBySlug(slug: string): Promise<ApiResponse<Skill>> {
    return apiClient.get(`/skills-market/skills/${slug}`)
  },

  // 基础关键词搜索
  search(query: string, limit: number = 20): Promise<ApiResponse<Skill[]>> {
    return apiClient.post('/skills-market/search', { query, limit })
  },

  // 安装 Skill
  install(request: SkillInstallRequest): Promise<ApiResponse<SkillInstallResponse>> {
    return apiClient.post('/skills-market/install', request)
  },

  // 批量安装 Skills
  installBatch(slugs: string[], targetAgentId?: string): Promise<ApiResponse<{ results: SkillInstallResponse[]; summary: { total: number; success: number; failed: number } }>> {
    return apiClient.post('/skills-market/install/batch', { slugs, targetAgentId })
  },

  // 获取已安装的 Skills
  getInstalled(agentId?: string): Promise<ApiResponse<Skill[]>> {
    const params = agentId ? `?agentId=${agentId}` : ''
    return apiClient.get(`/skills-market/installed${params}`)
  },

  // 卸载 Skill
  uninstall(slug: string, agentId?: string): Promise<ApiResponse<void>> {
    const params = agentId ? `?agentId=${agentId}` : ''
    return apiClient.delete(`/skills-market/installed/${slug}${params}`)
  },

  // 获取分类列表
  getCategories(): Promise<ApiResponse<SkillCategory[]>> {
    return apiClient.get('/skills-market/categories')
  }
}
