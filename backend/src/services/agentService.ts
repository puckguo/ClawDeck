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
import net from 'net';
import os from 'os';
import pidusage from 'pidusage';
import type {
  OpenClawConfig,
  AgentViewModel,
  AgentStatus,
  CreateAgentRequest,
  UpdateAgentRequest,
  ConfigVersion
} from '../types';

const execAsync = promisify(exec);
const isWindows = process.platform === 'win32';

// OpenClaw 根目录 - 使用环境变量或默认路径（支持跨平台）
const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || path.join(os.homedir(), '.openclaw');
const AGENTS_DIR = path.join(OPENCLAW_ROOT, 'agents');
const WORKSPACES_DIR = path.join(OPENCLAW_ROOT, 'workspaces');
const VERSIONS_DIR = path.join(OPENCLAW_ROOT, '.config-versions');
const LOGS_DIR = process.env.LOGS_DIR || (isWindows ? path.join(os.tmpdir(), 'agent-config-ui') : '/tmp/agent-config-ui');

// AI Provider API Key 环境变量映射（与 OpenClaw 保持一致）
const PROVIDER_API_KEY_ENV_VARS: Record<string, string[]> = {
  openai: ['OPENAI_API_KEY'],
  anthropic: ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN'],
  google: ['GEMINI_API_KEY'],
  minimax: ['MINIMAX_API_KEY'],
  moonshot: ['MOONSHOT_API_KEY'],
  'kimi-coding': ['KIMI_API_KEY', 'KIMICODE_API_KEY', 'ANTHROPIC_AUTH_TOKEN'],
  deepseek: ['DEEPSEEK_API_KEY'],
  synthetic: ['SYNTHETIC_API_KEY'],
  openrouter: ['OPENROUTER_API_KEY'],
  together: ['TOGETHER_API_KEY'],
  huggingface: ['HUGGINGFACE_HUB_TOKEN', 'HF_TOKEN'],
  xai: ['XAI_API_KEY'],
  mistral: ['MISTRAL_API_KEY'],
  kilocode: ['KILOCODE_API_KEY'],
  volcengine: ['VOLCANO_ENGINE_API_KEY'],
};

// 需要从父进程传递的其他环境变量
const ADDITIONAL_ENV_VARS = [
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'OPENAI_BASE_URL',
  'KIMI_BASE_URL',
  'DEEPSEEK_BASE_URL',
  'DEEPSEEK_API_KEY',
];

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
      const isListening = await this.checkPortListening(port);
      return isListening ? 'running' : 'stopped';
    } catch {
      return 'stopped';
    }
  }

  /**
   * 检查端口是否被监听（跨平台）
   */
  private async checkPortListening(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        resolve(false);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, '127.0.0.1');
    });
  }

  /**
   * 查找占用端口的 PID（跨平台）
   */
  private async findPidByPort(port: number): Promise<number | null> {
    try {
      if (isWindows) {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        const lines = stdout.trim().split('\n').filter(line => line.includes('LISTENING'));
        if (lines.length > 0) {
          const parts = lines[0].trim().split(/\s+/);
          const pid = parseInt(parts[parts.length - 1]);
          return isNaN(pid) ? null : pid;
        }
      } else {
        const { stdout } = await execAsync(`lsof -i :${port} -t 2>/dev/null || true`);
        const pid = parseInt(stdout.trim());
        return isNaN(pid) ? null : pid;
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * 查找进程 PID 通过名称（跨平台）
   */
  private async findPidByName(name: string): Promise<number | null> {
    try {
      if (isWindows) {
        const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq openclaw.exe" /FO CSV /NH`);
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          if (line.toLowerCase().includes(name.toLowerCase())) {
            const parts = line.replace(/"/g, '').split(',');
            const pid = parseInt(parts[1]);
            if (!isNaN(pid)) return pid;
          }
        }
      } else {
        // macOS/Linux: 使用 ps + grep 替代 pgrep（macOS 默认没有 pgrep）
        const { stdout } = await execAsync(`ps aux | grep -i "openclaw.*${name}" | grep -v grep | awk '{print $2}' | head -1`);
        const pid = parseInt(stdout.trim());
        return isNaN(pid) ? null : pid;
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * 获取运行时信息
   */
  private async getRuntimeInfo(agentId: string, port: number): Promise<AgentViewModel['runtimeInfo']> {
    try {
      // 先通过端口查找 PID
      let pid = await this.findPidByPort(port);

      // 如果找不到，尝试通过进程名查找
      if (!pid) {
        pid = await this.findPidByName(agentId);
      }

      if (pid) {
        const info = await this.getProcessInfo(pid);
        return { pid, ...info };
      }
    } catch (error) {
      console.error(`Failed to get runtime info for ${agentId}:`, error);
    }
    return {};
  }

  /**
   * 获取进程信息（跨平台）
   * 使用 pidusage 库获取准确的 CPU 和内存使用率
   */
  private async getProcessInfo(pid: number): Promise<{ cpu: number; memory: number; uptime: number }> {
    try {
      const stats = await pidusage(pid);

      // pidusage 返回的 memory 是字节数，需要转换为百分比
      const totalMem = os.totalmem();
      const memoryPercent = (stats.memory / totalMem) * 100;

      return {
        cpu: parseFloat(stats.cpu.toFixed(1)),
        memory: parseFloat(memoryPercent.toFixed(1)),
        uptime: Math.floor(stats.elapsed / 1000) // 转换为秒
      };
    } catch {
      return { cpu: 0, memory: 0, uptime: 0 };
    }
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

    // 确定 AI Provider 配置
    const aiProvider = request.ai?.provider || 'deepseek';
    const aiModel = request.ai?.model || 'deepseek-chat';
    const aiApiKey = request.ai?.apiKey;
    const aiBaseUrl = request.ai?.baseUrl;

    // 将 kimi 映射为 kimi-coding (OpenClaw 标准名称)
    const normalizedProvider = aiProvider === 'kimi' ? 'kimi-coding' : aiProvider;

    // 生成配置
    const config: OpenClawConfig = {
      meta: {
        lastTouchedVersion: '2026.2.26',
        lastTouchedAt: new Date().toISOString()
      },
      auth: {
        profiles: {
          [`${normalizedProvider}:default`]: {
            provider: normalizedProvider,
            mode: 'api_key'
          }
        }
      },
      models: {
        mode: 'merge',
        providers: this.buildModelProvider(normalizedProvider, aiModel, aiBaseUrl)
      },
      agents: {
        defaults: {
          model: { primary: `${aiProvider}/${aiModel}` },
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
          encryptKey: request.feishu?.encryptKey || '',
          verificationToken: request.feishu?.verificationToken || '',
          domain: 'feishu',
          connectionMode: request.feishu?.connectionMode || 'websocket',
          webhookPort: request.feishu?.webhookPort,
          webhookPath: request.feishu?.webhookPath || '/feishu/events',
          webhookHost: request.feishu?.webhookHost || '0.0.0.0',
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
    const envContent = this.generateEnvFile(config, agentId, request);
    await fs.writeFile(path.join(agentDir, '.env'), envContent);

    // 创建 auth-profiles.json 在 agent 子目录下
    const agentSubDir = path.join(agentDir, 'agent');
    if (aiApiKey) {
      const authProfiles: Record<string, any> = {
        version: 1,
        profiles: {
          [`${normalizedProvider}:default`]: {
            type: 'api_key',
            provider: normalizedProvider,
            key: aiApiKey
          }
        }
      };
      await fs.writeJson(path.join(agentSubDir, 'auth-profiles.json'), authProfiles, { spaces: 2 });
    }

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
   * 收集 API Key 环境变量
   */
  private collectApiKeyEnvVars(request?: CreateAgentRequest): string {
    const envVars: string[] = [];
    const provider = request?.ai?.provider || 'deepseek';
    const apiKey = request?.ai?.apiKey;

    // 将 kimi 映射为 kimi-coding
    const normalizedProvider = provider === 'kimi' ? 'kimi-coding' : provider;

    // 如果用户提供了 API key，优先使用
    if (apiKey) {
      const envVarName = this.getApiKeyEnvVarName(normalizedProvider);
      envVars.push(`${envVarName}=${apiKey}`);
    } else {
      // 从系统环境变量收集 API key
      for (const [p, varNames] of Object.entries(PROVIDER_API_KEY_ENV_VARS)) {
        for (const varName of varNames) {
          const value = process.env[varName];
          if (value) {
            envVars.push(`${varName}=${value}`);
            break;
          }
        }
      }
    }

    // 添加 baseUrl（如果用户提供了）
    if (request?.ai?.baseUrl) {
      const baseUrlVarName = this.getBaseUrlEnvVarName(normalizedProvider);
      envVars.push(`${baseUrlVarName}=${request.ai.baseUrl}`);
    }

    // 收集其他需要传递的环境变量
    for (const varName of ADDITIONAL_ENV_VARS) {
      const value = process.env[varName];
      if (value) {
        envVars.push(`${varName}=${value}`);
      }
    }

    return envVars.join('\n');
  }

  /**
   * 获取 API key 环境变量名
   */
  private getApiKeyEnvVarName(provider: string): string {
    const envVars: Record<string, string> = {
      deepseek: 'DEEPSEEK_API_KEY',
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      'kimi-coding': 'ANTHROPIC_AUTH_TOKEN',
      google: 'GEMINI_API_KEY',
      moonshot: 'MOONSHOT_API_KEY',
    };
    return envVars[provider] || `${provider.toUpperCase()}_API_KEY`;
  }

  /**
   * 获取 Base URL 环境变量名
   */
  private getBaseUrlEnvVarName(provider: string): string {
    const envVars: Record<string, string> = {
      deepseek: 'DEEPSEEK_BASE_URL',
      openai: 'OPENAI_BASE_URL',
      anthropic: 'ANTHROPIC_BASE_URL',
      'kimi-coding': 'ANTHROPIC_BASE_URL',
    };
    return envVars[provider] || `${provider.toUpperCase()}_BASE_URL`;
  }

  /**
   * 生成 .env 文件
   */
  private generateEnvFile(config: OpenClawConfig, agentId: string, request?: CreateAgentRequest): string {
    const feishu = config.channels.feishu;
    const apiKeyEnvVars = this.collectApiKeyEnvVars(request);

    return `# Agent Environment Configuration
AGENT_ID=${agentId}
AGENT_NAME=${config.agents.list[0].name}
WORKSPACE=${config.agents.list[0].workspace}
AGENT_DIR=${config.agents.list[0].agentDir}

# Gateway
GATEWAY_PORT=${config.gateway.port}
GATEWAY_TOKEN=${config.gateway.auth.token}

# AI API Keys (auto-imported from parent environment)
${apiKeyEnvVars || '# No API keys found in parent environment'}

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

    const configPath = path.join(agentDir, 'openclaw.json');
    if (!await fs.pathExists(configPath)) {
      throw new Error(`Agent configuration not found for ${agentId}`);
    }

    // 读取配置获取端口
    const config = await fs.readJson(configPath);
    const port = config.gateway?.port;
    if (!port) {
      throw new Error(`Gateway port not configured for agent ${agentId}`);
    }

    try {
      // 检查端口是否已被占用
      const isPortInUse = await this.checkPortListening(port);
      if (isPortInUse) {
        throw new Error(`Port ${port} is already in use`);
      }

      // 使用 openclaw gateway 启动，指定配置文件和环境变量
      const logFile = path.join(LOGS_DIR, `${agentId}.log`);

      // 确保日志目录存在
      await fs.ensureDir(LOGS_DIR);

      // 构建环境变量（只包含必要的环境变量）
      const envVars = {
        OPENCLAW_CONFIG_PATH: configPath,
        OPENCLAW_STATE_DIR: agentDir,
        PATH: process.env.PATH
      };

      if (isWindows) {
        // Windows: 创建临时批处理文件来启动，避免复杂的转义问题
        const batchFile = path.join(LOGS_DIR, `${agentId}-start.bat`);
        const envFile = path.join(agentDir, '.env');

        // 从 agent 的 .env 文件读取环境变量
        const apiKeyLines: string[] = [];
        if (await fs.pathExists(envFile)) {
          const envContent = await fs.readFile(envFile, 'utf-8');
          const envLines = envContent.split('\n');
          for (const line of envLines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
              apiKeyLines.push(`set ${trimmed}`);
            }
          }
        }

        // 如果 .env 文件中没有 API key，从系统环境变量补充
        if (apiKeyLines.length === 0) {
          for (const [provider, varNames] of Object.entries(PROVIDER_API_KEY_ENV_VARS)) {
            for (const varName of varNames) {
              const value = process.env[varName];
              if (value) {
                apiKeyLines.push(`set ${varName}=${value}`);
                break;
              }
            }
          }
          for (const varName of ADDITIONAL_ENV_VARS) {
            const value = process.env[varName];
            if (value) {
              apiKeyLines.push(`set ${varName}=${value}`);
            }
          }
        }

        const batchContent = `@echo off
set OPENCLAW_CONFIG_PATH=${configPath}
set OPENCLAW_STATE_DIR=${agentDir}
${apiKeyLines.join('\n')}
start /B openclaw gateway --port ${port} > "${logFile}" 2>&1
`;
        await fs.writeFile(batchFile, batchContent);

        // 执行批处理文件
        await execAsync(`cmd /c "${batchFile}"`);

        // 清理批处理文件
        setTimeout(() => fs.remove(batchFile).catch(() => {}), 5000);
      } else {
        // macOS/Linux: 使用 nohup 后台启动
        const envLines: string[] = [];

        // 收集 API key 环境变量
        for (const [provider, varNames] of Object.entries(PROVIDER_API_KEY_ENV_VARS)) {
          for (const varName of varNames) {
            const value = process.env[varName];
            if (value) {
              envLines.push(`export ${varName}="${value}"`);
              break;
            }
          }
        }
        // 添加其他环境变量
        for (const varName of ADDITIONAL_ENV_VARS) {
          const value = process.env[varName];
          if (value) {
            envLines.push(`export ${varName}="${value}"`);
          }
        }

        const baseEnvStr = Object.entries(envVars)
          .map(([k, v]) => `export ${k}="${v}"`)
          .join(' && ');
        const apiKeyEnvStr = envLines.join(' && ');
        const envStr = apiKeyEnvStr ? `${baseEnvStr} && ${apiKeyEnvStr}` : baseEnvStr;
        const cmd = `${envStr} && nohup openclaw gateway --port ${port} > "${logFile}" 2>&1 &`;
        await execAsync(cmd);
      }

      // 等待启动并验证
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 检查端口是否已监听
      const isRunning = await this.checkPortListening(port);
      if (!isRunning) {
        // 读取日志获取错误信息
        let logContent = '';
        try {
          logContent = await fs.readFile(logFile, 'utf-8');
        } catch {
          // ignore
        }
        throw new Error(`Agent failed to start. Check logs at ${logFile}. ${logContent.slice(-500)}`);
      }

      // 刷新缓存
      await this.scanAgents();
    } catch (error: any) {
      if (error.message?.includes('already in use')) {
        throw error;
      }
      throw new Error(`Failed to start agent: ${error.message || error}`);
    }
  }

  /**
   * 停止 Agent
   */
  async stopAgent(agentId: string): Promise<void> {
    try {
      // 获取 Agent 配置以查找端口
      const config = await this.getAgentConfig(agentId);
      const port = config?.gateway?.port;

      // 先尝试通过端口查找 PID 并停止
      if (port) {
        const pid = await this.findPidByPort(port);
        if (pid) {
          await this.killProcess(pid);
        }
      }

      // 再通过进程名查找并停止
      const pid = await this.findPidByName(agentId);
      if (pid) {
        await this.killProcess(pid);
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
   * 终止进程（跨平台）
   */
  private async killProcess(pid: number): Promise<void> {
    try {
      if (isWindows) {
        await execAsync(`taskkill /PID ${pid} /F /T`);
      } else {
        await execAsync(`kill -TERM ${pid} 2>/dev/null || kill -9 ${pid} 2>/dev/null || true`);
      }
    } catch {
      // ignore errors when killing process
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
   * 获取默认 AI 配置（从 openclaw 项目配置文件中读取）
   */
  async getDefaultAIConfig(): Promise<{ provider: string; model: string; baseUrl?: string; apiKey?: string } | null> {
    try {
      const configPath = path.join(OPENCLAW_ROOT, 'config.json');
      if (!await fs.pathExists(configPath)) {
        return null;
      }

      const config = await fs.readJson(configPath);
      const ai = config?.multiChat?.ai;

      if (!ai || !ai.enabled) {
        return null;
      }

      return {
        provider: ai.provider || 'deepseek',
        model: ai.model || 'deepseek-chat',
        baseUrl: ai.baseUrl,
        apiKey: ai.apiKey
      };
    } catch {
      return null;
    }
  }

  /**
   * 构建模型提供商配置
   */
  private buildModelProvider(provider: string, model: string, baseUrl?: string): Record<string, any> {
    const providers: Record<string, any> = {
      deepseek: {
        baseUrl: baseUrl || 'https://api.deepseek.com/v1',
        api: 'openai-completions',
        models: [{
          id: model,
          name: 'DeepSeek Chat',
          reasoning: false,
          input: ['text'],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 65536,
          maxTokens: 8192
        }]
      },
      'kimi-coding': {
        baseUrl: baseUrl || 'https://api.kimi.com/coding/',
        api: 'anthropic-messages',
        models: [{
          id: model === 'kimi-k2.5' ? 'k2p5' : model,
          name: 'Kimi for Coding',
          reasoning: true,
          input: ['text', 'image'],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 262144,
          maxTokens: 32768
        }]
      },
      kimi: {
        baseUrl: baseUrl || 'https://api.kimi.com/coding/',
        api: 'anthropic-messages',
        models: [{
          id: model === 'kimi-k2.5' ? 'k2p5' : model,
          name: 'Kimi for Coding',
          reasoning: true,
          input: ['text', 'image'],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 262144,
          maxTokens: 32768
        }]
      },
      openai: {
        baseUrl: baseUrl || 'https://api.openai.com/v1',
        api: 'openai-completions',
        models: [{
          id: model,
          name: 'OpenAI Model',
          reasoning: false,
          input: ['text'],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 128000,
          maxTokens: 4096
        }]
      },
      anthropic: {
        baseUrl: baseUrl || 'https://api.anthropic.com',
        api: 'anthropic-messages',
        models: [{
          id: model,
          name: 'Anthropic Model',
          reasoning: false,
          input: ['text'],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 200000,
          maxTokens: 8192
        }]
      },
      google: {
        baseUrl: baseUrl || 'https://generativelanguage.googleapis.com',
        api: 'google-generative-ai',
        models: [{
          id: model,
          name: 'Google Gemini',
          reasoning: false,
          input: ['text', 'image'],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 1048576,
          maxTokens: 8192
        }]
      },
      moonshot: {
        baseUrl: baseUrl || 'https://api.moonshot.cn/v1',
        api: 'openai-completions',
        models: [{
          id: model,
          name: 'Moonshot',
          reasoning: false,
          input: ['text'],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 128000,
          maxTokens: 4096
        }]
      }
    };

    return { [provider]: providers[provider] || providers.deepseek };
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
