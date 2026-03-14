/**
 * Agent 配置管理系统 - 共享类型定义
 */
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
    entries: Record<string, {
        enabled: boolean;
    }>;
}
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
export interface ConfigVersion {
    version: string;
    agentId: string;
    timestamp: string;
    modifiedBy: string;
    changes: string[];
    configSnapshot: OpenClawConfig;
}
export interface MonitoringMetrics {
    agentId: string;
    timestamp: string;
    cpu: number;
    memory: number;
    memoryLimit?: number;
    eventLoopLag?: number;
    activeConnections?: number;
}
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
/** 宠物生命阶段 */
export type PetStage = 'egg' | 'baby' | 'child' | 'teen' | 'adult' | 'special';
/** 宠物性格类型 */
export type PersonalityType = 'cheerful' | 'calm' | 'curious' | 'stubborn' | 'gentle' | 'mysterious';
/** 宠物情绪状态 */
export type PetMood = 'ecstatic' | 'happy' | 'content' | 'neutral' | 'sad' | 'angry' | 'sick' | 'sleepy' | 'sleeping';
/** 互动类型 */
export type InteractionType = 'feed' | 'play' | 'train' | 'sleep' | 'chat' | 'pet' | 'clean' | 'gift' | 'adventure' | 'treat' | 'login';
/** 性格特质 */
export interface PersonalityTraits {
    sociability: number;
    curiosity: number;
    independence: number;
    playfulness: number;
    stubbornness: number;
}
/** 宠物性格 */
export interface PetPersonality {
    type: PersonalityType;
    traits: PersonalityTraits;
    description?: string;
}
/** 宠物核心状态 */
export interface PetStatus {
    agentId: string;
    name: string;
    avatar: string;
    stage: PetStage;
    level: number;
    experience: number;
    experienceToNext: number;
    hunger: number;
    happiness: number;
    energy: number;
    health: number;
    cleanliness: number;
    intelligence: number;
    affection: number;
    strength: number;
    agility: number;
    personality: PetPersonality;
    mood: PetMood;
    isSleeping: boolean;
    isSick: boolean;
    evolutionPoints: number;
    bornAt: string;
    lastFedAt: string;
    lastPlayedAt: string;
    lastTrainedAt: string;
    lastSleptAt: string;
    lastInteractionAt: string;
    totalPlayTime: number;
    consecutiveLoginDays: number;
}
/** 宠物外观 */
export interface PetAppearance {
    baseForm: string;
    color: string;
    accessories: PetAccessory[];
    unlockedForms: string[];
    currentSkin?: string;
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
    note?: string;
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
    emotionalTone?: string;
    effects?: AttributeChange[];
}
/** 宠物对话历史 */
export interface PetConversation {
    messages: PetChatMessage[];
    contextSummary?: string;
    lastContextWindow?: number;
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
    currentBranch?: string;
    interactions: Interaction[];
    conversation: PetConversation;
    dailyTasks: DailyTask[];
    achievements: PetAchievement[];
    inventory: PetItem[];
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
    needsAttention: boolean;
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
    messages: string[];
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
//# sourceMappingURL=types.d.ts.map