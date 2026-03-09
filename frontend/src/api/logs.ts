import axios from 'axios'
import { apiClient } from './client'
import type { ApiResponse } from '../../../shared/types'

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api'

export interface AgentLog {
  id: string
  agentId: string
  type: 'system' | 'chat' | 'error' | 'audit'
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface LogsPagination {
  total: number
  offset: number
  limit: number
  hasMore: boolean
}

export const logsApi = {
  // 获取日志列表
  getLogs(
    agentId: string,
    params?: {
      type?: 'system' | 'chat' | 'error' | 'audit' | 'all'
      level?: 'debug' | 'info' | 'warn' | 'error' | 'all'
      limit?: number
      offset?: number
      startTime?: string
      endTime?: string
      search?: string
    }
  ): Promise<ApiResponse<AgentLog[]>> {
    const queryParams = new URLSearchParams()
    if (params?.type) queryParams.append('type', params.type)
    if (params?.level) queryParams.append('level', params.level)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    if (params?.startTime) queryParams.append('startTime', params.startTime)
    if (params?.endTime) queryParams.append('endTime', params.endTime)
    if (params?.search) queryParams.append('search', params.search)

    return apiClient.get(`/logs/${agentId}?${queryParams.toString()}`)
  },

  // 添加日志
  addLog(agentId: string, log: Omit<AgentLog, 'id' | 'agentId'>): Promise<ApiResponse<{ id: string }>> {
    return apiClient.post(`/logs/${agentId}`, log)
  },

  // 清空日志
  clearLogs(agentId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/logs/${agentId}`)
  },

  // 导出日志
  async exportLogs(agentId: string, startTime?: string, endTime?: string): Promise<Blob> {
    const response = await axios.post(
      `${API_BASE_URL}/logs/${agentId}/export`,
      { startTime, endTime },
      { responseType: 'blob' }
    )
    const blob = new Blob([response.data], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${agentId}-logs.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    return blob
  },

  // 创建日志流（SSE）
  createLogStream(agentId: string, onLog: (log: AgentLog) => void, onError?: (error: Error) => void): EventSource {
    const eventSource = new EventSource(`/api/logs/${agentId}/stream`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'log' && data.data) {
          onLog(data.data)
        }
      } catch (err) {
        console.error('Failed to parse log stream:', err)
      }
    }

    eventSource.onerror = (error) => {
      console.error('Log stream error:', error)
      if (onError) {
        onError(new Error('Log stream connection error'))
      }
    }

    return eventSource
  }
}
