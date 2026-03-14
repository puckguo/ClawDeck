# OpenClaw Skills 来源与同步指南

## 一、OpenClaw Skills 来源

OpenClaw 的 Skills 主要有以下几个来源：

### 1. 官方 ClawHub 注册表

ClawHub 是 OpenClaw 的官方公共 Skills 注册表，是最大的 Skills 来源，截至 2026 年 3 月，已收录超过 13000 个 Skills。

- 地址：[https://clawhub.ai](https://clawhub.ai)（或[https://clawhub.com](https://clawhub.com)）

- 特点：包含官方和社区贡献的 Skills，支持搜索、安装、更新和同步。

### 2. 官方内置 Skills

随 OpenClaw 安装包（npm 包或 OpenClaw.app）一起发布的基础 Skills，提供核心功能。

- 位置：安装目录的内置 skills 文件夹，优先级最低。

### 3. 本地 / 托管 Skills

用户自行安装或托管的 Skills，位于`~/.openclaw/skills`路径，对同一机器上的所有智能体可见。

### 4. 工作区 Skills

用户工作区中的 Skills，位于`<workspace>/skills`路径，优先级最高，仅对当前工作区的智能体可见。

### 5. 第三方开源 Skills 仓库

社区整理的精选 Skills 仓库，包含筛选后的高质量 Skills：

- **VoltAgent/awesome-openclaw-skills**：[https://github.com/VoltAgent/awesome-openclaw-skills](https://github.com/VoltAgent/awesome-openclaw-skills)，筛选了 ClawHub 中的 5494 个 Skills，已获得 31.8K stars。

- **BankrBot/openclaw-skills**：[https://github.com/BankrBot/openclaw-skills](https://github.com/BankrBot/openclaw-skills)，专注于 crypto 相关的 Skills，支持 DeFi 操作、token launch 等。

- **Jovanbeats/awesome-openclaw-Skills**：[https://github.com/Jovanbeats/awesome-openclaw-Skills](https://github.com/Jovanbeats/awesome-openclaw-Skills)，包含 700 + 社区构建的 Skills。

- **paperwave/awesome-openclaw**：[https://github.com/paperwave/awesome-openclaw](https://github.com/paperwave/awesome-openclaw)，包含 Skills、plugins、工具等资源的整理列表。

## 二、获取 Skills 的方法

### 1. 通过 ClawHub API 获取

ClawHub 提供公开的 HTTP API，可以获取 Skills 列表和详细信息：

- **Base URL**：[https://clawhub.ai](https://clawhub.ai)

- **OpenAPI 文档**：[https://clawhub.ai/api/v1/openapi.json](https://clawhub.ai/api/v1/openapi.json)

- 主要接口：

    - `GET /api/v1/skills`：获取 Skills 列表，支持分页（`limit`参数，1-200）和排序（`sort`参数，可选`updated`、`downloads`、`stars`、`trending`等）。
    示例请求：`https://clawhub.ai/api/v1/skills?limit=200&sort=updated`

    - `GET /api/v1/skills/{slug}`：获取指定 Skill 的详细信息，包括版本、元数据、所有者等。

    - `GET /api/v1/skills/{slug}/download`：下载指定 Skill 的最新版本（zip 格式）。

- **认证**：

    - 匿名请求：速率限制为 120 次 / 分钟（按 IP）。

    - 认证请求：使用 Bearer token（从 ClawHub 的`https://clawhub.ai/settings`页面创建），速率限制为 600 次 / 分钟（按用户）。
    示例请求头：`Authorization: Bearer clh_...`

### 2. 通过 ClawHub CLI 获取

ClawHub 提供 CLI 工具，可以方便地安装、更新和同步 Skills：

- 安装 CLI：随 OpenClaw 安装包一起安装，或单独安装。

- 常用命令：

    - 安装 Skill：`clawhub install <skill-slug>`

    - 更新所有已安装的 Skills：`clawhub update --all`

    - 同步 Skills（扫描本地 Skills 并发布更新）：`clawhub sync --all`

    - 搜索 Skills：`clawhub search <query>`

### 3. 通过第三方仓库获取

可以通过 Git 克隆第三方仓库，获取其中的 Skills：
示例命令：`git clone https://github.com/VoltAgent/awesome-openclaw-skills.git`
克隆后，仓库中的 Skills 文件夹包含所有筛选后的 Skills，可以直接复制到 OpenClaw 的 Skills 目录使用。

## 三、同步 Skills 到 Market Place 的步骤

### 1. 定时拉取 ClawHub 的 Skills 列表

- **步骤 1**：获取 ClawHub API 的 token（可选，用于提高速率限制），从`https://clawhub.ai/settings`页面创建。

- **步骤 2**：编写脚本，定时调用`GET /api/v1/skills`接口，获取所有 Skills 的列表，处理分页（使用`nextCursor`参数）。

- **步骤 3**：对于每个 Skill，调用`GET /api/v1/skills/{slug}`获取详细信息，包括版本、描述、元数据等。

- **步骤 4**：调用`GET /api/v1/skills/{slug}/download`下载每个 Skill 的最新版本，存储到 Market Place 的本地目录。

- **步骤 5**：记录每个 Skill 的更新时间，下次同步时仅拉取更新时间晚于上次同步时间的 Skill，提高效率。

### 2. 同步第三方仓库的 Skills

- **步骤 1**：定时克隆或拉取第三方仓库的最新代码：
示例命令：`git -C /path/to/awesome-openclaw-skills pull`

- **步骤 2**：提取仓库中的 Skills 文件夹，遍历每个 Skill，将其复制到 Market Place 的本地目录，或提取 Skill 的信息（名称、描述、版本等）到 Market Place 的数据库中。

- **步骤 3**：对比本地存储的 Skill 版本，仅更新有变化的 Skill。

### 3. 处理内置 Skills 的同步

- **步骤 1**：从 OpenClaw 的安装目录中提取内置 Skills 的文件夹。

- **步骤 2**：将内置 Skills 的信息同步到 Market Place，标记为 "官方内置"。

- **步骤 3**：定期检查 OpenClaw 的更新，同步内置 Skills 的新版本。

### 4. 数据存储与更新

- **存储结构**：使用数据库（如 SQLite、PostgreSQL）存储 Skill 的信息，包括 slug、名称、描述、版本、更新时间、来源、下载地址等。

- **更新频率**：建议每天同步一次，或根据需求调整频率（如每 6 小时一次）。

- **增量更新**：每次同步时，仅拉取上次同步后更新的 Skill，减少请求量和存储开销。

## 四、注意事项

### 1. 速率限制

- ClawHub API 对匿名请求有速率限制（120 次 / 分钟），认证请求速率更高（600 次 / 分钟），如果需要大量拉取数据，建议使用认证 token。

- 使用分页和增量更新，避免一次性发送大量请求，触发速率限制。

### 2. 认证问题

- 如果需要访问需要认证的接口（如发布 Skill、管理用户），需要使用有效的 Bearer token，token 可以从 ClawHub 的设置页面创建。

- 定期更新 token，避免 token 过期导致同步失败。

### 3. 安全注意事项

- 第三方 Skills 可能包含不受信任的代码，同步前建议扫描 Skill 的代码，检测恶意行为、可疑网络请求等。

- 可以使用`clawsec`等安全 Skill 来扫描第三方 Skills，确保安全性。

- 对于高风险的 Skills，建议在沙箱环境中运行，避免影响主机系统。

### 4. 版本控制

- 记录每个 Skill 的版本信息，同步时对比版本号，仅更新有新版本的 Skill。

- 保留历史版本，方便回滚。

## 五、Market Place 搭建建议

1. **前端展示**：使用网页界面展示所有 Skills，支持搜索、分类、筛选（按类型、更新时间、下载量等）。

2. **后端服务**：编写后端服务，定时同步 Skills 数据，提供 API 供前端调用。

3. **存储方案**：使用文件存储 Skill 的压缩包，使用数据库存储 Skill 的元数据。

4. **更新通知**：当有新的 Skill 更新时，通知用户，或提供订阅功能。

5. **用户反馈**：允许用户对 Skill 进行评分、评论，帮助其他用户选择高质量的 Skill。
> （注：文档部分内容可能由 AI 生成）