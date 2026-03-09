/**
 * Agent 管理服务
 * 负责管理 openclaw.json 配置文件的读写和 Agent 进程控制
 */

import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { glob } from 'glob';
import { v4 as uuidv4 } from 'uuid';
import type {
  OpenClawConfig,
  AgentViewModel,
  AgentStatus,
  CreateAgentRequest,
  UpdateAgentRequest,
  ConfigVersion
} from '../types';

const execAsync = promisify(exec);

// OpenClaw 根目录
const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || '/Users/godspeed/.openclaw';
const AGENTS_DIR = path.join(OPENCLAW_ROOT, 'agents');
const WORKSPACES_DIR = path.join(OPENCLAW_ROOT, 'workspaces');
const VERSIONS_DIR = path.join(OPENCLAW_ROOT, '.config-versions');

export class AgentService {
  private static instance: AgentService;
  private agentCache: Map<string, AgentViewModel> = new Map();
  private lastScanTime = 0;
  private scanInterval = 5000; // 5秒缓存

  private constructor() {
    this.ensureDirectories();
  }

  static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  private ensureDirectories() {
    fs.ensureDirSync(AGENTS_DIR);
    fs.ensureDirSync(WORKSPACES_DIR);
    fs.ensureDirSync(VERSIONS_DIR);
  }

  /**
   * 获取所有 Agent 列表
   */
  async getAllAgents(): Promise<AgentViewModel[]> {
    const now = Date.now();
    if (now - this.lastScanTime > this.scanInterval) {
      await this.scanAgents();
      this.lastScanTime = now;
    }
    return Array.from(this.agentCache.values());
  }

  /**
   * 扫描所有 Agent
   */
  private async scanAgents(): Promise<void> {
    try {
      // 使用 fs.readdir 替代 glob
      const entries = await fs.readdir(AGENTS_DIR, { withFileTypes: true });
      const agentDirs = entries.filter(e => e.isDirectory()).map(e => e.name);
      const currentIds = new Set<string>();

      for (const agentId of agentDirs) {
        currentIds.add(agentId);
        const agentPath = path.join(AGENTS_DIR, agentId);
        const configPath = path.join(agentPath, 'openclaw.json');

        if (await fs.pathExists(configPath)) {
          const viewModel = await this.loadAgentViewModel(agentId, configPath);
          this.agentCache.set(agentId, viewModel);
        }
      }

      // 清理不存在的 Agent
      for (const [id] of this.agentCache) {
        if (!currentIds.has(id)) {
          this.agentCache.delete(id);
        }
      }
    } catch (error) {
      console.error('Failed to scan agents:', error);
    }
  }

  /**
   * 加载 Agent ViewModel
   */
  private async loadAgentViewModel(agentId: string, configPath: string): Promise<AgentViewModel> {
    const config: OpenClawConfig = await fs.readJson(configPath);
    const agentInfo = config.agents.list[0];
    const status = await this.getAgentStatus(agentId, config.gateway.port);
    const runtimeInfo = status === 'running' ? await this.getRuntimeInfo(agentId, config.gateway.port) : {};

    return {
      id: agentId,
      name: agentInfo?.name || agentId,
      displayName: config.channels['open-clawchat']?.agentName || agentInfo?.name || agentId,
      emoji: '🐕', // 默认形象
      role: '',
      status,
      port: config.gateway.port,
      channels: {
        feishu: config.channels?.feishu?.enabled || false,
        openClawChat: config.channels?.['open-clawchat']?.enabled || false
      },
      currentRooms: config.channels?.['open-clawchat']?.rooms?.map(roomId => ({
        roomId,
        joinedAt: new Date().toISOString(),
        duration: 30,
        remainingTime: 30,
        isOwner: false
      })) || [],
      runtimeInfo,
      skills: [], // 从 agent 目录读取
      createdAt: config.meta?.lastTouchedAt || new Date().toISOString(),
      lastModifiedAt: config.meta?.lastTouchedAt || new Date().toISOString(),
      configPath
    };
  }

  /**
   * 获取单个 Agent
   */
  async getAgent(agentId: string): Promise<AgentViewModel | null> {
    const agents = await this.getAllAgents();
    return agents.find(a => a.id === agentId) || null;
  }

  /**
   * 获取 Agent 配置
   */
  async getAgentConfig(agentId: string): Promise<OpenClawConfig | null> {
    const configPath = path.join(AGENTS_DIR, agentId, 'openclaw.json');
    if (!await fs.pathExists(configPath)) {
      return null;
    }
    return fs.readJson(configPath);
  }

  /**
   * 获取 Agent 运行状态
   * 通过检查端口监听状态来判断，因为 openclaw 进程名不包含 agentId
   */
  private async getAgentStatus(agentId: string, port: number): Promise<AgentStatus> {
    try {
      // 检查端口是否被监听
      const { stdout: portCheck } = await execAsync(`lsof -i :${port} | grep LISTEN || true`);
      if (!portCheck.trim()) {
        return 'stopped';
      }

      // 端口正在监听，说明 agent 在运行
      return 'running';
    } catch {
      return 'stopped';
    }
  }

  /**
   * 获取运行时信息
   */
  private async getRuntimeInfo(agentId: string, port: number): Promise<AgentViewModel['runtimeInfo']> {
    try {
      const { stdout } = await execAsync(`pgrep -f "openclaw.*${agentId}" | head -1`);
      const pid = parseInt(stdout.trim());

      if (pid) {
        // 获取进程信息
        const { stdout: psInfo } = await execAsync(`ps -p ${pid} -o pid,pcpu,pmem,etime | tail -1`);
        const parts = psInfo.trim().split(/\s+/);

        return {
          pid,
          cpu: parseFloat(parts[1]) || 0,
          memory: parseFloat(parts[2]) || 0,
          uptime: this.parseUptime(parts[3] || '')
        };
      }
    } catch (error) {
      console.error(`Failed to get runtime info for ${agentId}:`, error);
    }
    return {};
  }

  /**
   * 解析运行时间
   */
  private parseUptime(etime: string): number {
    // 解析 ps 输出的 etime 格式
    let seconds = 0;
    const parts = etime.split(/[-:]/);
    if (parts.length === 4) {
      // 天-时:分:秒
      seconds = parseInt(parts[0]) * 86400 + parseInt(parts[1]) * 3600 + parseInt(parts[2]) * 60 + parseInt(parts[3]);
    } else if (parts.length === 3) {
      // 时:分:秒
      seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    } else if (parts.length === 2) {
      // 分:秒
      seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return seconds;
  }

  /**
   * 创建新 Agent
   */
  async createAgent(request: CreateAgentRequest): Promise<AgentViewModel> {
    const agentId = request.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const agentDir = path.join(AGENTS_DIR, agentId);
    const workspaceDir = path.join(WORKSPACES_DIR, agentId);

    // 检查是否已存在
    if (await fs.pathExists(agentDir)) {
      throw new Error(`Agent ${agentId} already exists`);
    }

    // 创建目录
    await fs.ensureDir(agentDir);
    await fs.ensureDir(workspaceDir);
    await fs.ensureDir(path.join(agentDir, 'agent'));

    // 生成端口
    const port = await this.findAvailablePort();

    // 生成配置
    const config: OpenClawConfig = {
      meta: {
        lastTouchedVersion: '2026.2.26',
        lastTouchedAt: new Date().toISOString()
      },
      auth: {
        profiles: {
          'kimi-coding:default': {
            provider: 'kimi-coding',
            mode: 'api_key'
          }
        }
      },
      models: {
        mode: 'merge',
        providers: {
          'kimi-coding': {
            baseUrl: 'https://api.kimi.com/coding/',
            api: 'anthropic-messages',
            models: [{
              id: 'k2p5',
              name: 'Kimi for Coding',
              reasoning: false,
              input: ['text', 'image'],
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
              contextWindow: 262144,
              maxTokens: 32768
            }]
          }
        }
      },
      agents: {
        defaults: {
          model: { primary: 'kimi-coding/k2p5' },
          workspace: workspaceDir,
          contextPruning: { mode: 'cache-ttl', ttl: '24h' },
          compaction: { mode: 'safeguard' }
        },
        list: [{
          id: agentId,
          name: request.name,
          workspace: workspaceDir,
          agentDir: path.join(agentDir, 'agent')
        }]
      },
      session: {
        dmScope: 'per-channel-peer'
      },
      channels: {
        feishu: {
          enabled: request.feishu?.enabled || false,
          appId: request.feishu?.appId || '',
          appSecret: request.feishu?.appSecret || '',
          encryptKey: '',
          verificationToken: '',
          domain: 'feishu',
          connectionMode: 'websocket',
          dmPolicy: 'open',
          groupPolicy: 'allowlist',
          requireMention: false,
          allowFrom: ['*']
        },
        'open-clawchat': {
          enabled: request.openClawChat?.enabled || false,
          serverUrl: request.openClawChat?.serverUrl || 'http://47.97.86.239:3002',
          agentId: agentId,
          agentName: request.displayName || request.name,
          rooms: [],
          dmPolicy: 'open',
          allowFrom: ['*'],
          requireMention: false
        }
      },
      gateway: {
        port,
        mode: 'local',
        bind: 'loopback',
        auth: {
          mode: 'token',
          token: `${agentId}-agent-token-${Date.now()}`
        }
      },
      plugins: {
        allow: ['feishu', 'open-clawchat'],
        entries: {
          feishu: { enabled: request.feishu?.enabled || false },
          'open-clawchat': { enabled: request.openClawChat?.enabled || false }
        }
      }
    };

    // 保存配置
    await fs.writeJson(path.join(agentDir, 'openclaw.json'), config, { spaces: 2 });

    // 创建 .env 文件
    const envContent = this.generateEnvFile(config, agentId);
    await fs.writeFile(path.join(agentDir, '.env'), envContent);

    // 重新扫描
    await this.scanAgents();

    const agent = this.agentCache.get(agentId);
    if (!agent) {
      throw new Error('Failed to create agent');
    }

    return agent;
  }

  /**
   * 查找可用端口
   */
  private async findAvailablePort(): Promise<number> {
    const basePort = 18790;
    const agents = await this.getAllAgents();
    const usedPorts = new Set(agents.map(a => a.port));

    for (let i = 0; i < 1000; i++) {
      const port = basePort + i;
      if (!usedPorts.has(port)) {
        return port;
      }
    }
    throw new Error('No available port found');
  }

  /**
   * 生成 .env 文件
   */
  private generateEnvFile(config: OpenClawConfig, agentId: string): string {
    const feishu = config.channels.feishu;
    return `# Agent Environment Configuration
AGENT_ID=${agentId}
AGENT_NAME=${config.agents.list[0].name}
WORKSPACE=${config.agents.list[0].workspace}
AGENT_DIR=${config.agents.list[0].agentDir}

# Gateway
GATEWAY_PORT=${config.gateway.port}
GATEWAY_TOKEN=${config.gateway.auth.token}

# Feishu
FEISHU_ENABLED=${feishu.enabled}
FEISHU_APP_ID=${feishu.appId}
FEISHU_APP_SECRET=${feishu.appSecret}
FEISHU_ENCRYPT_KEY=${feishu.encryptKey}
FEISHU_VERIFICATION_TOKEN=${feishu.verificationToken}

# Open-ClawChat
OPEN_CLAWCHAT_ENABLED=${config.channels['open-clawchat'].enabled}
OPEN_CLAWCHAT_SERVER_URL=${config.channels['open-clawchat'].serverUrl}
`;
  }

  /**
   * 更新 Agent 基础信息
   */
  async updateAgent(agentId: string, request: UpdateAgentRequest): Promise<AgentViewModel> {
    const config = await this.getAgentConfig(agentId);
    if (!config) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // 保存版本备份
    await this.saveVersion(agentId, config);

    // 更新配置
    if (request.name) {
      config.agents.list[0].name = request.name;
    }
    if (request.displayName) {
      config.channels['open-clawchat'].agentName = request.displayName;
    }

    config.meta.lastTouchedAt = new Date().toISOString();

    // 保存
    const configPath = path.join(AGENTS_DIR, agentId, 'openclaw.json');
    await fs.writeJson(configPath, config, { spaces: 2 });

    // 刷新缓存
    await this.scanAgents();

    return this.agentCache.get(agentId)!;
  }

  /**
   * 启动 Agent
   */
  async startAgent(agentId: string): Promise<void> {
    const agentDir = path.join(AGENTS_DIR, agentId);
    if (!await fs.pathExists(agentDir)) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const startScript = '/tmp/start-agent-py.py';
    if (!await fs.pathExists(startScript)) {
      throw new Error('Start script not found');
    }

    try {
      // 使用 pm2 或 nohup 启动
      const cmd = `cd ${agentDir} && python3 ${startScript} ${agentId} > /tmp/${agentId}.log 2>&1 &`;
      await execAsync(cmd);

      // 等待启动
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 刷新缓存
      await this.scanAgents();
    } catch (error) {
      throw new Error(`Failed to start agent: ${error}`);
    }
  }

  /**
   * 停止 Agent
   */
  async stopAgent(agentId: string): Promise<void> {
    try {
      const { stdout } = await execAsync(`pgrep -f "openclaw.*${agentId}" || true`);
      const pids = stdout.trim().split('\n').filter(Boolean);

      for (const pid of pids) {
        await execAsync(`kill -TERM ${pid} || true`);
      }

      // 等待停止
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 刷新缓存
      await this.scanAgents();
    } catch (error) {
      throw new Error(`Failed to stop agent: ${error}`);
    }
  }

  /**
   * 重启 Agent
   */
  async restartAgent(agentId: string): Promise<void> {
    await this.stopAgent(agentId);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.startAgent(agentId);
  }

  /**
   * 删除 Agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    // 先停止
    await this.stopAgent(agentId);

    const agentDir = path.join(AGENTS_DIR, agentId);
    const workspaceDir = path.join(WORKSPACES_DIR, agentId);

    // 备份配置
    const config = await this.getAgentConfig(agentId);
    if (config) {
      await this.saveVersion(agentId, config, true);
    }

    // 删除目录
    await fs.remove(agentDir);
    await fs.remove(workspaceDir);

    // 刷新缓存
    this.agentCache.delete(agentId);
  }

  /**
   * 保存配置版本
   */
  private async saveVersion(agentId: string, config: OpenClawConfig, isDeleted = false): Promise<void> {
    const versionDir = path.join(VERSIONS_DIR, agentId);
    await fs.ensureDir(versionDir);

    const version: ConfigVersion = {
      version: uuidv4(),
      agentId,
      timestamp: new Date().toISOString(),
      modifiedBy: 'system',
      changes: [],
      configSnapshot: config
    };

    const suffix = isDeleted ? 'deleted' : version.version;
    await fs.writeJson(path.join(versionDir, `${suffix}.json`), version, { spaces: 2 });
  }

  /**
   * 获取配置版本历史
   */
  async getVersionHistory(agentId: string): Promise<ConfigVersion[]> {
    const versionDir = path.join(VERSIONS_DIR, agentId);
    if (!await fs.pathExists(versionDir)) {
      return [];
    }

    const files = await glob('*.json', { cwd: versionDir });
    const versions: ConfigVersion[] = [];

    for (const file of files.sort().reverse()) {
      const version = await fs.readJson(path.join(versionDir, file));
      versions.push(version);
    }

    return versions;
  }

  /**
   * 恢复配置版本
   */
  async restoreVersion(agentId: string, versionId: string): Promise<void> {
    const versionPath = path.join(VERSIONS_DIR, agentId, `${versionId}.json`);
    if (!await fs.pathExists(versionPath)) {
      throw new Error(`Version ${versionId} not found`);
    }

    const version: ConfigVersion = await fs.readJson(versionPath);
    const configPath = path.join(AGENTS_DIR, agentId, 'openclaw.json');

    await fs.writeJson(configPath, version.configSnapshot, { spaces: 2 });

    // 刷新缓存
    await this.scanAgents();
  }

  /**
   * 批量操作
   */
  async batchOperation(agentIds: string[], operation: 'start' | 'stop' | 'restart'): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const agentId of agentIds) {
      try {
        switch (operation) {
          case 'start':
            await this.startAgent(agentId);
            break;
          case 'stop':
            await this.stopAgent(agentId);
            break;
          case 'restart':
            await this.restartAgent(agentId);
            break;
        }
        results[agentId] = true;
      } catch (error) {
        console.error(`Failed to ${operation} ${agentId}:`, error);
        results[agentId] = false;
      }
    }

    return results;
  }
}
