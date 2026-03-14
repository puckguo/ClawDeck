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
  webhookPort?: number;
  webhookPath?: string;
  webhookHost?: string;
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
    encryptKey?: string;
    verificationToken?: string;
    connectionMode?: 'websocket' | 'webhook';
    webhookPort?: number;
    webhookPath?: string;
    webhookHost?: string;
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

// ============ Skills Market 类型 ============

export interface Skill {
  slug: string;
  name: string;
  description?: string;
  version?: string;
  author?: string;
  tags?: string[];
  category?: string;
  downloads?: number;
  stars?: number;
  isOfficial?: boolean;
  installPath?: string;
  installedAt?: string;
  updatedAt?: string;
  repository?: string;
  homepage?: string;
  license?: string;
}

export interface SkillSearchRequest {
  query: string;
  filters?: {
    category?: string;
    minDownloads?: number;
    minStars?: number;
    tags?: string[];
    officialOnly?: boolean;
  };
  limit?: number;
}

export interface SkillSearchResponse {
  query: string;
  skills: Skill[];
  total: number;
  aiInterpretation?: string;
  suggestedQueries?: string[];
}

export interface SkillInstallRequest {
  slug: string;
  version?: string;
  targetAgentId?: string;
}

export interface SkillInstallResponse {
  success: boolean;
  slug: string;
  version?: string;
  installPath?: string;
  message?: string;
  error?: string;
}

export interface SkillCategory {
  id: string;
  name: string;
  description: string;
}

export interface AIProviderConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
}

// ============ 宠物养成系统类型 ============

/** 宠物生命阶段 */
export type PetStage = 'egg' | 'baby' | 'child' | 'teen' | 'adult' | 'special';

/** 宠物性格类型 */
export type PersonalityType = 'cheerful' | 'calm' | 'curious' | 'stubborn' | 'gentle' | 'mysterious';

/** 宠物情绪状态 */
export type PetMood = 'ecstatic' | 'happy' | 'content' | 'neutral' | 'sad' | 'angry' | 'sick' | 'sleepy' | 'sleeping';

/** 互动类型 */
export type InteractionType =
  | 'feed'           // 喂食
  | 'play'           // 玩耍
  | 'train'          // 训练
  | 'sleep'          // 睡觉
  | 'chat'           // 聊天
  | 'pet'            // 抚摸
  | 'clean'          // 清洁
  | 'gift'           // 赠送礼物
  | 'adventure'      // 探险
  | 'treat'          // 治疗
  | 'login';         // 登录（内部使用）

/** 性格特质 */
export interface PersonalityTraits {
  sociability: number;     // 社交性 0-100
  curiosity: number;       // 好奇心 0-100
  independence: number;    // 独立性 0-100
  playfulness: number;     // 活泼度 0-100
  stubbornness: number;    // 固执度 0-100
}

/** 宠物性格 */
export interface PetPersonality {
  type: PersonalityType;
  traits: PersonalityTraits;
  description?: string;    // 性格描述
}

/** 宠物核心状态 */
export interface PetStatus {
  agentId: string;         // 关联的Agent ID
  name: string;            // 宠物名字
  avatar: string;          // 宠物形象标识
  stage: PetStage;         // 生命阶段
  level: number;           // 等级 1-100
  experience: number;      // 当前经验值
  experienceToNext: number; // 升级所需经验

  // 基础属性 (0-100)
  hunger: number;          // 饥饿度
  happiness: number;       // 心情值
  energy: number;          // 精力值
  health: number;          // 健康值
  cleanliness: number;     // 清洁度

  // 成长属性
  intelligence: number;    // 智力 (影响AI对话)
  affection: number;       // 亲密度 (核心情感指标)
  strength: number;        // 力量
  agility: number;         // 敏捷

  // 性格
  personality: PetPersonality;

  // 状态
  mood: PetMood;
  isSleeping: boolean;
  isSick: boolean;
  evolutionPoints: number; // 进化点数
  thought?: string;        // 内心想法 (AI生成)

  // 时间戳
  bornAt: string;          // 出生时间
  lastFedAt: string;       // 最后喂食
  lastPlayedAt: string;    // 最后玩耍
  lastTrainedAt: string;   // 最后训练
  lastSleptAt: string;     // 最后睡觉
  lastInteractionAt: string; // 最后互动
  totalPlayTime: number;   // 累计陪伴时间(分钟)
  consecutiveLoginDays: number; // 连续登录天数
}

/** 宠物外观 */
export interface PetAppearance {
  baseForm: string;        // 基础形态
  color: string;           // 颜色主题
  accessories: PetAccessory[]; // 装饰品
  unlockedForms: string[]; // 已解锁形态
  currentSkin?: string;    // 当前皮肤
}

/** 装饰品 */
export interface PetAccessory {
  id: string;
  name: string;
  type: 'hat' | 'glasses' | 'necklace' | 'clothes' | 'background' | 'effect';
  equipped: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  obtainedAt: string;
}

/** 进化分支 */
export interface EvolutionBranch {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
  requiredPersonality?: Partial<PersonalityTraits>;
  requiredIntelligence?: number;
  requiredAffection?: number;
  specialConditions?: string[];
  appearance: string;
  specialAbility?: string;
  unlocked: boolean;
}

/** 互动记录 */
export interface Interaction {
  id: string;
  type: InteractionType;
  timestamp: string;
  data?: Record<string, unknown>;
  effects: AttributeChange[];
  note?: string;           // 备注(如"暴击!"、"完美时机!")
}

/** 属性变化 */
export interface AttributeChange {
  attribute: keyof PetStatus | 'experience' | 'evolutionPoints';
  delta: number;
  reason: string;
}

/** 聊天消息 */
export interface PetChatMessage {
  id: string;
  role: 'user' | 'pet' | 'system';
  content: string;
  timestamp: string;
  emotionalTone?: string;  // 情绪基调
  effects?: AttributeChange[]; // 对话产生的影响
}

/** 宠物对话历史 */
export interface PetConversation {
  messages: PetChatMessage[];
  contextSummary?: string; // AI上下文摘要
  lastContextWindow?: number; // 最后上下文窗口大小
}

/** 每日任务 */
export interface DailyTask {
  id: string;
  type: InteractionType | 'login' | 'consecutive_login';
  description: string;
  targetCount: number;
  currentCount: number;
  completed: boolean;
  reward: TaskReward;
}

/** 任务奖励 */
export interface TaskReward {
  experience?: number;
  affection?: number;
  items?: PetAccessory[];
  evolutionPoints?: number;
}

/** 成就 */
export interface PetAchievement {
  id: string;
  name: string;
  description: string;
  category: 'care' | 'growth' | 'interaction' | 'social' | 'special';
  unlockedAt?: string;
  progress: number;
  targetProgress: number;
  unlocked: boolean;
  reward?: TaskReward;
}

/** 宠物完整数据 */
export interface PetData {
  status: PetStatus;
  appearance: PetAppearance;
  evolutionBranches: EvolutionBranch[];
  currentBranch?: string;   // 当前进化分支ID
  interactions: Interaction[]; // 最近100条互动
  conversation: PetConversation;
  dailyTasks: DailyTask[];
  achievements: PetAchievement[];
  inventory: PetItem[];     // 物品栏
}

/** 宠物物品 */
export interface PetItem {
  id: string;
  name: string;
  type: 'food' | 'toy' | 'medicine' | 'gift' | 'material';
  description: string;
  quantity: number;
  effects?: AttributeChange[];
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

/** 随机事件 */
export interface RandomEvent {
  id: string;
  type: 'positive' | 'neutral' | 'negative';
  title: string;
  description: string;
  triggerCondition: string;
  choices?: {
    text: string;
    effects: AttributeChange[];
  }[];
  autoEffects?: AttributeChange[];
}

/** 前端展示的宠物摘要 */
export interface PetSummary {
  agentId: string;
  name: string;
  stage: PetStage;
  level: number;
  mood: PetMood;
  avatar: string;
  affection: number;
  lastInteractionAt: string;
  isSleeping: boolean;
  needsAttention: boolean;  // 是否需要关注(饥饿/生病等)
}

/** 创建宠物请求 */
export interface CreatePetRequest {
  agentId: string;
  name: string;
  eggType?: 'classic' | 'sparkle' | 'mystery' | 'golden';
}

/** 互动请求 */
export interface InteractRequest {
  type: InteractionType;
  data?: Record<string, unknown>;
}

/** 互动响应 */
export interface InteractResponse {
  success: boolean;
  interaction: Interaction;
  petStatus: PetStatus;
  evolutionTriggered?: EvolutionBranch;
  levelUp?: boolean;
  messages: string[];       // 反馈消息(如"它很开心!"、"升级了!")
}

/** 聊天请求 */
export interface PetChatRequest {
  message: string;
}

/** 聊天响应 */
export interface PetChatResponse {
  message: PetChatMessage;
  petStatus: PetStatus;
  effects: AttributeChange[];
  moodChanged?: boolean;
}

/** 宠物状态更新推送 */
export interface PetStatusUpdate {
  agentId: string;
  status: Partial<PetStatus>;
  trigger: 'decay' | 'interaction' | 'event' | 'time';
  timestamp: string;
}
