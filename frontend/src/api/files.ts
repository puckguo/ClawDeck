import { apiClient } from './client'
import type { ApiResponse } from '../../../shared/types'

export interface MdFile {
  path: string
  name: string
  relativePath: string
  displayPath: string
  category: string
  size: number
  modifiedAt: string
  source: 'agent' | 'workspace'
}

export interface FileContent {
  path: string
  fullPath: string
  content: string
  size: number
  modifiedAt: string
  source: 'agent' | 'workspace'
}

export interface BackupInfo {
  name: string
  path: string
  size: number
  createdAt: string
}

// 文件描述映射
export const fileDescriptions: Record<string, { name: string; description: string }> = {
  'SOUL.md': {
    name: '性格设定',
    description: '定义 Agent 的性格、语气、行为风格等核心特质'
  },
  'IDENTITY.md': {
    name: '身份信息',
    description: 'Agent 的名称、身份、背景故事等基本信息'
  },
  'AGENTS.md': {
    name: '代理配置',
    description: '子代理定义和分工配置'
  },
  'TOOLS.md': {
    name: '工具配置',
    description: '可用工具的定义和参数配置'
  },
  'USER.md': {
    name: '用户定义',
    description: '用户信息和使用偏好设置'
  },
  'BOOTSTRAP.md': {
    name: '启动配置',
    description: 'Agent 启动时的初始化配置和指令'
  },
  'HEARTBEAT.md': {
    name: '心跳配置',
    description: '定时任务和状态报告配置'
  },
  'CRON.md': {
    name: '定时任务',
    description: '周期性执行的任务配置'
  },
  'memory.md': {
    name: '长期记忆',
    description: 'Agent 的长期记忆存储（agents 目录）'
  },
  'MEMORY.md': {
    name: '工作记忆',
    description: 'Agent 的工作记忆和上下文信息（workspaces 目录）'
  },
  'SKILL.md': {
    name: '技能说明',
    description: '特定技能的详细说明和使用方法'
  }
}

// 获取文件的友好名称和描述
export function getFileInfo(fileName: string, category: string) {
  const info = fileDescriptions[fileName]
  if (info) {
    return {
      displayName: info.name,
      description: info.description
    }
  }

  // 默认返回
  return {
    displayName: category,
    description: '配置文件'
  }
}

export const filesApi = {
  // 获取 Agent 的所有 MD 文件
  getAll(agentId: string): Promise<ApiResponse<{
    files: MdFile[]
    grouped: Record<string, MdFile[]>
    total: number
    agentDir: string
    workspaceDir: string
  }>> {
    return apiClient.get(`/files/${agentId}`)
  },

  // 获取文件内容
  getContent(agentId: string, filePath: string, source: 'agent' | 'workspace'): Promise<ApiResponse<FileContent>> {
    return apiClient.get(`/files/${agentId}/content?filePath=${encodeURIComponent(filePath)}&source=${source}`)
  },

  // 更新文件内容（自动备份）
  updateContent(
    agentId: string,
    filePath: string,
    content: string,
    source: 'agent' | 'workspace',
    backup = true
  ): Promise<ApiResponse<{ backupCreated: boolean }>> {
    return apiClient.put(`/files/${agentId}/content`, { filePath, content, source, backup })
  },

  // 创建新文件
  create(agentId: string, filePath: string, source: 'agent' | 'workspace', content = ''): Promise<ApiResponse<void>> {
    return apiClient.post(`/files/${agentId}/create`, { filePath, content, source })
  },

  // 删除文件
  delete(agentId: string, filePath: string, source: 'agent' | 'workspace'): Promise<ApiResponse<void>> {
    return apiClient.delete(`/files/${agentId}?filePath=${encodeURIComponent(filePath)}&source=${source}`)
  },

  // 获取备份列表
  getBackups(agentId: string, filePath?: string, source?: 'agent' | 'workspace'): Promise<ApiResponse<{ backups: BackupInfo[] }>> {
    let url = `/files/${agentId}/backups`
    const params: string[] = []
    if (filePath) params.push(`filePath=${encodeURIComponent(filePath)}`)
    if (source) params.push(`source=${source}`)
    if (params.length > 0) url += '?' + params.join('&')
    return apiClient.get(url)
  },

  // 从备份恢复
  restore(agentId: string, filePath: string, backupName: string, source: 'agent' | 'workspace'): Promise<ApiResponse<void>> {
    return apiClient.post(`/files/${agentId}/restore`, { filePath, backupName, source })
  }
}
