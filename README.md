# ClawDeck - OpenClaw Agent 配置管理系统

人性化管理 OpenClaw Agent 的 Web 界面，支持查看和修改已有 Agent 配置、创建向导、批量操作、实时监控等功能。

## 功能特性

### 核心功能
- ✅ **Agent 列表管理** - 卡片式/列表式展示，状态实时监控
- ✅ **已有 Agent 编辑** - 7个标签页完整配置管理（概览/基础/渠道/聊天室/技能/日志/高级）
- ✅ **创建向导** - 4步流程，表单验证，一键启动
- ✅ **批量操作** - 批量启动/停止/重启
- ✅ **配置版本管理** - 自动备份，历史记录，一键回滚

### 监控功能
- 📊 **实时监控面板** - CPU/内存/状态
- 📈 **资源使用统计** - 趋势图表
- 🔔 **状态变更通知** - 自动刷新

### 集成功能
- 💬 **IM 对话配置** - 飞书机器人命令
- 📋 **多维表格** - 飞书表格同步
- 🔌 **扩展 API** - RESTful API

## 技术栈

- **前端**: React 18 + TypeScript + Ant Design + Vite
- **后端**: Node.js + Express + TypeScript
- **共享**: TypeScript 类型定义

## 快速开始

### AI 自动部署（推荐）

让 OpenClaw 或 Claude Code 读取部署指南并自动执行：

```
请读取 {PROJECT_ROOT}/DEPLOY.md 并按步骤部署 ClawDeck
```

AI 将自动完成：环境检查 → 安装依赖 → 构建项目 → 启动服务 → 验证部署

### 手动部署

如果无法使用 AI 部署，可手动执行：

```bash
cd {PROJECT_ROOT}
./start.sh
```

脚本会自动完成：安装依赖 → 构建项目 → 启动服务 → 运行测试

访问 http://localhost:18888 查看 ClawDeck

### 脚本命令

```bash
./start.sh all      # 完整流程（默认）
./start.sh install  # 仅安装依赖
./start.sh build    # 仅构建项目
./start.sh test     # 仅运行测试
./start.sh start    # 仅启动服务
```

### 手动操作

#### 1. 安装依赖

```bash
cd /Users/godspeed/.openclaw/agent-config-ui
npm run install:all
```

#### 2. 开发模式

```bash
npm run dev
```

- 前端: http://localhost:3000
- 后端 API: http://localhost:18888

#### 3. 生产构建

```bash
npm run build
npm start
```

## 项目结构

```
agent-config-ui/
├── shared/               # 共享类型定义
│   └── types.ts         # TypeScript 类型
├── backend/             # 后端服务
│   ├── src/
│   │   ├── routes/      # API 路由
│   │   ├── services/    # 业务逻辑
│   │   ├── middleware/  # 中间件
│   │   └── index.ts     # 入口
│   └── package.json
├── frontend/            # 前端应用
│   ├── src/
│   │   ├── components/  # 组件
│   │   ├── pages/       # 页面
│   │   ├── api/         # API 调用
│   │   └── App.tsx      # 主应用
│   └── package.json
├── agent/               # 配置管理 Agent（IM 对话）
├── DEPLOY.md            # AI 部署指南
└── README.md
```

## API 接口

### Agent 管理
- `GET /api/agents` - 获取所有 Agent
- `POST /api/agents` - 创建 Agent
- `GET /api/agents/:id` - 获取单个 Agent
- `PATCH /api/agents/:id` - 更新 Agent
- `DELETE /api/agents/:id` - 删除 Agent
- `POST /api/agents/:id/start` - 启动 Agent
- `POST /api/agents/:id/stop` - 停止 Agent
- `POST /api/agents/:id/restart` - 重启 Agent
- `POST /api/agents/batch` - 批量操作

### 配置管理
- `GET /api/config/:agentId` - 获取配置
- `PUT /api/config/:agentId` - 更新配置
- `POST /api/config/:agentId/validate` - 验证配置

### 聊天室
- `GET /api/rooms/:agentId` - 获取房间列表
- `POST /api/rooms/:agentId/join` - 加入房间
- `POST /api/rooms/:agentId/leave` - 离开房间
- `POST /api/rooms/:agentId/create` - 创建房间

### 监控
- `GET /api/monitoring/status` - 状态摘要
- `GET /api/monitoring/:agentId/metrics` - 监控指标
- `GET /api/monitoring/:agentId/realtime` - 实时状态

## 术语映射

| 技术术语 | 用户友好名称 |
|---------|-------------|
| Agent | 智能助手 / AI 员工 |
| openclaw.json | 助手档案 |
| Gateway | 服务端口 |
| Workspace | 工作空间 |
| SKILL.md | 技能说明书 |
| SOUL.md | 性格设定 |
| Channel | 消息渠道 |
| Room | 聊天室 |
| Heartbeat | 在线时长 |

## 开发计划

- [x] 基础架构搭建
- [x] Agent 列表与 CRUD
- [x] 多标签配置编辑
- [ ] 技能管理
- [ ] 配置版本管理
- [ ] 日志查看
- [ ] 飞书集成
- [ ] 多维表格同步

## License

MIT
