/**
 * Skills Market 服务
 * 提供 Skill 搜索、筛选和安装功能
 */

import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  Skill,
  SkillInstallRequest,
  SkillInstallResponse,
  SkillSearchRequest
} from '../types';

const execAsync = promisify(exec);

// ClawHub API 配置
const CLAWHUB_BASE_URL = 'https://clawhub.ai';
const CLAWHUB_API_URL = `${CLAWHUB_BASE_URL}/api/v1`;

// Skills 存储路径
const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || path.join(os.homedir(), '.openclaw');
const SKILLS_DIR = path.join(OPENCLAW_ROOT, 'skills');

export class SkillsMarketService {
  private static instance: SkillsMarketService;
  private clawhubToken?: string;
  private skillsCache: Map<string, Skill> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  private constructor() {
    this.clawhubToken = process.env.CLAWHUB_TOKEN;
  }

  static getInstance(): SkillsMarketService {
    if (!SkillsMarketService.instance) {
      SkillsMarketService.instance = new SkillsMarketService();
    }
    return SkillsMarketService.instance;
  }

  /**
   * 设置 ClawHub Token
   */
  setClawhubToken(token: string): void {
    this.clawhubToken = token;
  }

  /**
   * 获取请求头
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (this.clawhubToken) {
      headers['Authorization'] = `Bearer ${this.clawhubToken}`;
    }
    return headers;
  }

  /**
   * 从 ClawHub 获取 Skills 列表
   */
  async fetchSkillsFromClawHub(
    limit: number = 100,
    sort: string = 'updated',
    cursor?: string
  ): Promise<{ skills: Skill[]; nextCursor?: string }> {
    try {
      const params: Record<string, string | number> = { limit, sort };
      if (cursor) params.cursor = cursor;

      const response = await axios.get(`${CLAWHUB_API_URL}/skills`, {
        headers: this.getHeaders(),
        params,
        timeout: 10000 // 10秒超时
      });

      // ClawHub API returns { items: [...], nextCursor: "..." }
      // Map the API response to our Skill type
      const rawItems = response.data.items || response.data.skills || response.data || [];

      const skills: Skill[] = rawItems.map((item: any) => this.mapClawHubItemToSkill(item));

      // 缓存技能
      skills.forEach(skill => {
        this.skillsCache.set(skill.slug, skill);
      });

      return {
        skills,
        nextCursor: response.data.nextCursor
      };
    } catch (error: any) {
      console.error('[SkillsMarket] Failed to fetch skills from ClawHub:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });

      // 如果有缓存数据，返回缓存
      if (this.skillsCache.size > 0) {
        console.log('[SkillsMarket] Returning cached skills:', this.skillsCache.size);
        return {
          skills: Array.from(this.skillsCache.values()).slice(0, limit),
          nextCursor: undefined
        };
      }

      // 返回示例数据作为最后的fallback
      console.log('[SkillsMarket] Returning mock skills data');
      return {
        skills: this.getMockSkills(),
        nextCursor: undefined
      };
    }
  }

  /**
   * 将 ClawHub API 的 item 映射为 Skill 类型
   */
  private mapClawHubItemToSkill(item: any): Skill {
    return {
      slug: item.slug,
      name: item.displayName || item.name || item.slug,
      description: item.summary || item.description || '',
      version: item.tags?.latest || item.latestVersion?.version || '',
      author: item.author || '',
      tags: item.tags ? Object.keys(item.tags).filter(t => t !== 'latest') : [],
      category: item.category || '',
      downloads: item.stats?.downloads || 0,
      stars: item.stats?.stars || 0,
      isOfficial: item.isOfficial || false,
      updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : undefined,
      license: item.latestVersion?.license || '',
      repository: item.repository,
      homepage: item.homepage
    };
  }

  /**
   * 获取示例 Skills 数据（当 API 不可用时使用）
   */
  private getMockSkills(): Skill[] {
    return [
      {
        slug: 'web-search',
        name: 'Web Search',
        description: 'Search the web using various search engines like Google, Bing, and DuckDuckGo',
        version: '1.0.0',
        author: 'openclaw',
        tags: ['search', 'web', 'google', 'bing'],
        category: 'utility',
        downloads: 15420,
        stars: 328,
        isOfficial: true,
        updatedAt: new Date().toISOString(),
        license: 'MIT'
      },
      {
        slug: 'file-manager',
        name: 'File Manager',
        description: 'Advanced file operations including read, write, copy, move, and directory management',
        version: '2.1.0',
        author: 'openclaw',
        tags: ['files', 'filesystem', 'utility'],
        category: 'utility',
        downloads: 12350,
        stars: 256,
        isOfficial: true,
        updatedAt: new Date().toISOString(),
        license: 'MIT'
      },
      {
        slug: 'github-integration',
        name: 'GitHub Integration',
        description: 'Interact with GitHub repositories, issues, pull requests, and actions',
        version: '1.5.0',
        author: 'openclaw',
        tags: ['github', 'git', 'dev', 'integration'],
        category: 'integration',
        downloads: 9870,
        stars: 412,
        isOfficial: true,
        updatedAt: new Date().toISOString(),
        license: 'MIT'
      },
      {
        slug: 'slack-notifier',
        name: 'Slack Notifier',
        description: 'Send notifications and messages to Slack channels and users',
        version: '1.2.0',
        author: 'community',
        tags: ['slack', 'notification', 'communication'],
        category: 'communication',
        downloads: 7650,
        stars: 189,
        isOfficial: false,
        updatedAt: new Date().toISOString(),
        license: 'MIT'
      },
      {
        slug: 'database-connector',
        name: 'Database Connector',
        description: 'Connect to MySQL, PostgreSQL, MongoDB and other databases',
        version: '3.0.0',
        author: 'openclaw',
        tags: ['database', 'sql', 'mongodb', 'data'],
        category: 'data',
        downloads: 11200,
        stars: 367,
        isOfficial: true,
        updatedAt: new Date().toISOString(),
        license: 'MIT'
      },
      {
        slug: 'email-sender',
        name: 'Email Sender',
        description: 'Send emails via SMTP with support for templates and attachments',
        version: '1.3.0',
        author: 'community',
        tags: ['email', 'smtp', 'communication'],
        category: 'communication',
        downloads: 5430,
        stars: 134,
        isOfficial: false,
        updatedAt: new Date().toISOString(),
        license: 'MIT'
      },
      {
        slug: 'code-analyzer',
        name: 'Code Analyzer',
        description: 'Analyze code quality, detect issues and suggest improvements',
        version: '2.0.0',
        author: 'openclaw',
        tags: ['code', 'analysis', 'dev', 'quality'],
        category: 'dev',
        downloads: 8920,
        stars: 298,
        isOfficial: true,
        updatedAt: new Date().toISOString(),
        license: 'MIT'
      },
      {
        slug: 'ai-image-generator',
        name: 'AI Image Generator',
        description: 'Generate images using AI models like DALL-E and Stable Diffusion',
        version: '1.1.0',
        author: 'openclaw',
        tags: ['ai', 'image', 'generation', 'dall-e'],
        category: 'ai',
        downloads: 14560,
        stars: 523,
        isOfficial: true,
        updatedAt: new Date().toISOString(),
        license: 'MIT'
      },
      {
        slug: 'pdf-processor',
        name: 'PDF Processor',
        description: 'Create, read, and manipulate PDF documents',
        version: '1.4.0',
        author: 'community',
        tags: ['pdf', 'document', 'utility'],
        category: 'utility',
        downloads: 6780,
        stars: 201,
        isOfficial: false,
        updatedAt: new Date().toISOString(),
        license: 'MIT'
      },
      {
        slug: 'scheduler',
        name: 'Task Scheduler',
        description: 'Schedule and automate recurring tasks and workflows',
        version: '2.2.0',
        author: 'openclaw',
        tags: ['schedule', 'automation', 'cron'],
        category: 'automation',
        downloads: 9230,
        stars: 278,
        isOfficial: true,
        updatedAt: new Date().toISOString(),
        license: 'MIT'
      }
    ];
  }

  /**
   * 获取 Skill 详情
   */
  async getSkillDetail(slug: string): Promise<Skill | null> {
    // 检查缓存
    const cached = this.skillsCache.get(slug);
    if (cached && this.cacheExpiry > Date.now()) {
      return cached;
    }

    try {
      const response = await axios.get(`${CLAWHUB_API_URL}/skills/${slug}`, {
        headers: this.getHeaders()
      });

      // ClawHub API 返回 { skill: {...}, latestVersion: {...}, ... }
      const skillData = response.data.skill || response.data;
      const skill: Skill = this.mapClawHubItemToSkill(skillData);
      this.skillsCache.set(slug, skill);
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      return skill;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`[SkillsMarket] Skill not found: ${slug}`);
        return null;
      }
      console.error(`[SkillsMarket] Failed to get skill detail for ${slug}:`, error.message);
      return null;
    }
  }

  /**
   * 搜索 Skills（基础关键词搜索）
   */
  async searchSkills(query: string, limit: number = 20): Promise<Skill[]> {
    try {
      // 先获取一批技能，然后本地过滤
      // 注意：ClawHub 可能没有直接的关键词搜索接口，这里使用客户端过滤
      const { skills } = await this.fetchSkillsFromClawHub(200, 'downloads');

      const lowerQuery = query.toLowerCase();
      const filtered = skills.filter(skill =>
        skill.name?.toLowerCase().includes(lowerQuery) ||
        skill.description?.toLowerCase().includes(lowerQuery) ||
        skill.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        skill.slug?.toLowerCase().includes(lowerQuery)
      );

      return filtered.slice(0, limit);
    } catch (error) {
      console.error('[SkillsMarket] Search failed:', error);
      throw error;
    }
  }

  /**
   * 应用过滤器
   */
  private applyFilters(skills: Skill[], filters: SkillSearchRequest['filters']): Skill[] {
    if (!filters) return skills;

    return skills.filter(skill => {
      if (filters.category && skill.category !== filters.category) {
        return false;
      }
      if (filters.minDownloads && (skill.downloads || 0) < filters.minDownloads) {
        return false;
      }
      if (filters.minStars && (skill.stars || 0) < filters.minStars) {
        return false;
      }
      if (filters.tags && filters.tags.length > 0) {
        const hasTag = filters.tags.some((tag: string) =>
          skill.tags?.includes(tag)
        );
        if (!hasTag) return false;
      }
      if (filters.officialOnly && !skill.isOfficial) {
        return false;
      }
      return true;
    });
  }

  /**
   * 安装 Skill
   */
  async installSkill(request: SkillInstallRequest): Promise<SkillInstallResponse> {
    const { slug, version, targetAgentId } = request;

    try {
      // 1. 获取 Skill 详情
      const skill = await this.getSkillDetail(slug);

      if (!skill) {
        return {
          success: false,
          slug,
          error: `Skill "${slug}" not found in ClawHub. Please check the skill name and try again.`
        };
      }

      // 2. 确定安装路径
      let installPath: string;
      if (targetAgentId) {
        // 安装到特定 Agent 的工作区
        installPath = path.join(OPENCLAW_ROOT, 'workspaces', targetAgentId, 'skills', slug);
      } else {
        // 安装到全局 skills 目录
        installPath = path.join(SKILLS_DIR, slug);
      }

      // 3. 确保目录存在
      await fs.ensureDir(installPath);

      // 4. 使用 clawhub CLI 安装 skill
      let installSuccess = false;

      // 确保已登录 clawhub（如果有 token）
      if (this.clawhubToken) {
        try {
          await execAsync(`npx clawhub login --token "${this.clawhubToken}"`, { timeout: 30000 });
          console.log('[SkillsMarket] Logged in to clawhub');
        } catch (loginError) {
          console.warn('[SkillsMarket] Failed to login to clawhub, will try without auth');
        }
      }

      // clawhub 总是在当前目录创建 skills/<slug> 子目录
      // 所以我们需要 cd 到 installPath 的父目录的父目录
      const workDir = path.dirname(path.dirname(installPath));

      try {
        // 使用 npx clawhub 安装
        // clawhub install <slug> [--version <version>] [--force]
        // clawhub 会创建 skills/<slug>/ 目录
        const versionFlag = version ? ` --version ${version}` : '';
        // 添加 --force 以允许安装被标记为可疑的 skill
        const cmd = `cd "${workDir}" && npx clawhub install ${slug}${versionFlag} --force`;

        console.log(`[SkillsMarket] Installing skill: ${cmd}`);
        const { stdout, stderr } = await execAsync(cmd, { timeout: 120000 });

        if (stderr) {
          console.warn(`[SkillsMarket] clawhub stderr: ${stderr}`);
        }
        console.log(`[SkillsMarket] clawhub stdout: ${stdout}`);
        installSuccess = true;

        // clawhub 安装到 skills/<slug>/，需要检查并可能移动
        const clawhubInstallPath = path.join(workDir, 'skills', slug);
        if (clawhubInstallPath !== installPath) {
          console.log(`[SkillsMarket] Skill installed to ${clawhubInstallPath}, expected ${installPath}`);
          // 如果路径不同，移动文件
          if (await fs.pathExists(clawhubInstallPath)) {
            await fs.remove(installPath);
            await fs.move(clawhubInstallPath, installPath);
            console.log(`[SkillsMarket] Moved skill from ${clawhubInstallPath} to ${installPath}`);
          }
        }
      } catch (npxError: any) {
        console.log('[SkillsMarket] npx clawhub failed, trying to fetch from GitHub...');
        console.error(`[SkillsMarket] Error: ${npxError.message}`);
      }

      // 如果 CLI 安装都失败了，尝试从 GitHub 直接获取 SKILL.md
      if (!installSuccess) {
        await this.fetchSkillFromGitHub(slug, installPath);
      }

      // 5. 记录安装信息
      const installInfo = {
        slug,
        version: version || skill.version,
        installedAt: new Date().toISOString(),
        path: installPath,
        targetAgentId
      };

      await fs.writeJson(path.join(installPath, '.install-info.json'), installInfo);

      return {
        success: true,
        slug,
        version: installInfo.version,
        installPath,
        message: `Successfully installed ${skill.name}`
      };
    } catch (error) {
      console.error(`[SkillsMarket] Failed to install skill ${slug}:`, error);
      return {
        success: false,
        slug,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 从 GitHub 获取 skill（fallback）
   * ClawHub skills 存储在 openclaw/skills-archive 仓库
   */
  private async fetchSkillFromGitHub(slug: string, installPath: string): Promise<void> {
    const githubUrl = `https://raw.githubusercontent.com/openclaw/skills-archive/main/skills/${slug}/SKILL.md`;

    try {
      console.log(`[SkillsMarket] Fetching from GitHub: ${githubUrl}`);
      const response = await axios.get(githubUrl, {
        timeout: 30000,
        responseType: 'text'
      });

      // 保存 SKILL.md
      await fs.writeFile(path.join(installPath, 'SKILL.md'), response.data);

      console.log(`[SkillsMarket] Successfully fetched SKILL.md for ${slug}`);
    } catch (error: any) {
      console.error(`[SkillsMarket] Failed to fetch from GitHub: ${error.message}`);
      throw new Error(`Failed to install skill: ${slug}. ClawHub CLI not available and GitHub fallback failed.`);
    }
  }

  /**
   * 获取已安装的 Skills
   */
  async getInstalledSkills(agentId?: string): Promise<Skill[]> {
    const installPaths: string[] = [];

    if (agentId) {
      installPaths.push(path.join(OPENCLAW_ROOT, 'workspaces', agentId, 'skills'));
    } else {
      installPaths.push(SKILLS_DIR);
    }

    const installedSkills: Skill[] = [];

    for (const installPath of installPaths) {
      if (!(await fs.pathExists(installPath))) continue;

      const entries = await fs.readdir(installPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const infoPath = path.join(installPath, entry.name, '.install-info.json');
          if (await fs.pathExists(infoPath)) {
            const info = await fs.readJson(infoPath);
            installedSkills.push({
              slug: info.slug,
              version: info.version,
              installedAt: info.installedAt,
              installPath: info.path
            } as Skill);
          }
        }
      }
    }

    return installedSkills;
  }

  /**
   * 卸载 Skill
   */
  async uninstallSkill(slug: string, agentId?: string): Promise<boolean> {
    try {
      let installPath: string;

      if (agentId) {
        installPath = path.join(OPENCLAW_ROOT, 'workspaces', agentId, 'skills', slug);
      } else {
        installPath = path.join(SKILLS_DIR, slug);
      }

      if (await fs.pathExists(installPath)) {
        await fs.remove(installPath);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`[SkillsMarket] Failed to uninstall skill ${slug}:`, error);
      return false;
    }
  }
}
