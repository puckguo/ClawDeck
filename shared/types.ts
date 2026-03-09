/**
 * Agent 配置管理系统 - 共享类型定义
 */

// ============ Agent 基础类型 ============

export interface AgentMeta {
  lastTouchedVersion: string;
  lastTouchedAt: string;
}

export interface AgentAuthProfile {
  provider: string;
  mode: string;
}

export interface AgentAuth {
  profiles: Record<string, AgentAuthProfile>;
}

export interface AgentModelConfig {
  mode: string;
  providers: Record<string, AgentProviderConfig>;
}

export interface AgentProviderConfig {
  baseUrl: string;
  api: string;
  models: AgentModel[];
}

export interface AgentModel {
  id: string;
  name: string;
  reasoning: boolean;
  input: string[];
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
  contextWindow: number;
  maxTokens: number;
}

export interface AgentDefaults {
  model: {
    primary: string;
  };
  workspace: string;
  contextPruning: {
    mode: string;
    ttl: string;
  };
  compaction: {
    mode: string;
  };
}

export interface AgentInfo {
  id: string;
  name: string;
  workspace: string;
  agentDir: string;
  displayName?: string;
  emoji?: string;
  role?: string;
}

export interface AgentAgents {
  defaults: AgentDefaults;
  list: AgentInfo[];
}

export interface AgentSession {
  dmScope: string;
}

export interface FeishuChannel {
  enabled: boolean;
  appId: string;
  appSecret: string;
  encryptKey: string;
  verificationToken: string;
  domain: string;
  connectionMode: string;
  dmPolicy: string;
  groupPolicy: string;
  requireMention: boolean;
  allowFrom: string[];
}

export interface OpenClawChatChannel {
  enabled: boolean;
  serverUrl: string;
  agentId: string;
  agentName: string;
  rooms: string[];
  dmPolicy: string;
  allowFrom: string[];
  requireMention: boolean;
}

export interface AgentChannels {
  feishu: FeishuChannel;
  'open-clawchat': OpenClawChatChannel;
}

export interface AgentGateway {
  port: number;
  mode: string;
  bind: string;
  auth: {
    mode: string;
    token: string;
  };
}

export interface AgentPlugins {
  allow: string[];
  entries: Record<string, { enabled: boolean }>;
}

// 完整的 openclaw.json 配置结构
export interface OpenClawConfig {
  meta: AgentMeta;
  auth: AgentAuth;
  models: AgentModelConfig;
  agents: AgentAgents;
  session: AgentSession;
  channels: AgentChannels;
  gateway: AgentGateway;
  plugins: AgentPlugins;
}

// ============ 运行时状态类型 ============

export type AgentStatus = 'running' | 'stopped' | 'error' | 'configuring';

export interface AgentRuntimeInfo {
  pid?: number;
  cpu?: number;
  memory?: number;
  uptime?: number;
  lastMessageAt?: string;
  lastError?: string;
}

export interface AgentRoomActivity {
  roomId: string;
  joinedAt: string;
  duration: number;
  remainingTime: number;
  isOwner: boolean;
}

// 前端展示的 Agent 完整信息
export interface AgentViewModel {
  id: string;
  name: string;
  displayName: string;
  emoji: string;
  role?: string;
  status: AgentStatus;
  port: number;
  channels: {
    feishu: boolean;
    openClawChat: boolean;
  };
  currentRooms: AgentRoomActivity[];
  runtimeInfo: AgentRuntimeInfo;
  skills: string[];
  createdAt: string;
  lastModifiedAt: string;
  configPath: string;
}

// ============ API 请求/响应类型 ============

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateAgentRequest {
  name: string;
  displayName: string;
  emoji: string;
  role?: string;
  ai?: {
    provider: string;
    model: string;
    apiKey?: string;
    baseUrl?: string;
  };
  feishu?: {
    enabled: boolean;
    appId: string;
    appSecret: string;
  };
  openClawChat?: {
    enabled: boolean;
    serverUrl: string;
  };
  skills?: string[];
}

export interface UpdateAgentRequest {
  name?: string;
  displayName?: string;
  emoji?: string;
  role?: string;
}

export interface UpdateChannelRequest {
  feishu?: Partial<FeishuChannel>;
  openClawChat?: Partial<OpenClawChatChannel>;
}

export interface JoinRoomRequest {
  roomId: string;
  answer?: string;
  duration?: number;
}

export interface UpdateSkillRequest {
  skillId: string;
  action: 'install' | 'uninstall' | 'update';
}

// ============ 日志类型 ============

export type LogType = 'system' | 'chat' | 'error' | 'all';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AgentLog {
  id: string;
  agentId: string;
  type: LogType;
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ============ 配置版本类型 ============

export interface ConfigVersion {
  version: string;
  agentId: string;
  timestamp: string;
  modifiedBy: string;
  changes: string[];
  configSnapshot: OpenClawConfig;
}

// ============ 实时监控类型 ============

export interface MonitoringMetrics {
  agentId: string;
  timestamp: string;
  cpu: number;
  memory: number;
  memoryLimit?: number;
  eventLoopLag?: number;
  activeConnections?: number;
}

// ============ 飞书集成类型 ============

export interface FeishuTableRecord {
  recordId: string;
  fields: {
    助手ID: string;
    助手名称: string;
    显示名称: string;
    形象: string;
    状态: string;
    端口: number;
    飞书: boolean;
    OpenClawChat: boolean;
    当前房间: string;
    最后修改: string;
  };
}

// ============ IM 对话配置类型 ============

export interface IMCommandContext {
  userId: string;
  sessionId: string;
  platform: 'feishu' | 'open-clawchat';
  message: string;
}

export interface IMCommandResult {
  success: boolean;
  message: string;
  actions?: Array<{
    label: string;
    value: string;
  }>;
  data?: unknown;
}

export interface ConversationStep {
  step: number;
  totalSteps: number;
  question: string;
  field: string;
  options?: string[];
  validation?: (input: string) => boolean | string;
}
