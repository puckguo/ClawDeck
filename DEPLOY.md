# ClawDeck - AI 部署指南

本文档供 OpenClaw 或 Claude Code 读取并执行安装部署。

## 部署目标

在当前项目的 `clawdeck` 目录部署 ClawDeck 系统，并启动服务。

## 配置准备

在部署之前，请先阅读 **[CONFIG_GUIDE.md](CONFIG_GUIDE.md)** 了解：
- 如何配置 AI 模型（Kimi、DeepSeek 等）
- 如何配置飞书集成
- 常见问题排查方法

### 快速配置检查清单

部署 Agent 前，请确认以下配置：

**AI 模型配置**：
- [ ] 如果使用 Kimi，provider 应为 `kimi-coding`，模型应为 `k2p5`
- [ ] 如果使用 DeepSeek，provider 为 `deepseek`，模型为 `deepseek-chat`
- [ ] API Key 已正确设置

**飞书配置**（可选）：
- [ ] 飞书开放平台已创建应用并获取 App ID 和 App Secret
- [ ] 事件订阅方式设置为"长连接（WebSocket）"
- [ ] 已订阅 `im.message.receive_v1` 事件

**项目路径**: `{OPENCLAW_ROOT}/agent-config-ui`

（`{OPENCLAW_ROOT}` 为 OpenClaw 安装根目录，默认为 `~/.openclaw`）

## 部署步骤

### 第 1 步：环境检查

检查 Node.js 版本（需要 >= 18）：
```bash
node --version
```

检查端口 18888 是否可用：
```bash
lsof -i :18888
```

### 第 2 步：安装依赖

进入项目目录：
```bash
cd {PROJECT_ROOT}
```

安装后端依赖：
```bash
cd {PROJECT_ROOT}/backend && npm install
```

安装前端依赖：
```bash
cd {PROJECT_ROOT}/frontend && npm install
```

### 第 3 步：构建项目

编译后端 TypeScript：
```bash
cd {PROJECT_ROOT}/backend && npm run build
```

构建前端：
```bash
cd {PROJECT_ROOT}/frontend && npm run build
```

复制前端产物到后端：
```bash
cp -r {PROJECT_ROOT}/frontend/dist {PROJECT_ROOT}/backend/
```

### 第 4 步：启动服务

停止已有服务（如果存在）：
```bash
lsof -ti:18888 | xargs kill -9 2>/dev/null || true
```

启动后端服务：
```bash
cd {PROJECT_ROOT}/backend && nohup node dist/index.js > /tmp/agent-config-ui/backend.log 2>&1 &
```

### 第 5 步：验证部署

等待 3 秒后检查健康状态：
```bash
sleep 3 && curl -s http://localhost:18888/api/health
```

应返回：
```json
{"success":true,"data":{"status":"ok","version":"1.0.0"}}
```

## 部署验证清单

- [ ] Node.js 版本 >= 18
- [ ] 后端依赖安装完成（backend/node_modules 存在）
- [ ] 前端依赖安装完成（frontend/node_modules 存在）
- [ ] 后端编译成功（backend/dist/index.js 存在）
- [ ] 前端构建成功（backend/dist/index.html 存在）
- [ ] 服务运行在端口 18888
- [ ] 健康检查 API 返回成功

## 访问信息

部署完成后，可通过以下地址访问：

- **Web 管理台**: http://localhost:18888
- **API 文档**: http://localhost:18888/api/health

## 常见问题处理

### 端口被占用

如果 18888 端口被占用，执行：
```bash
lsof -ti:18888 | xargs kill -9
```

### 构建失败

清理后重新构建：
```bash
rm -rf backend/dist frontend/dist
rm -rf backend/node_modules frontend/node_modules
```

然后重新执行第 2-4 步。

### 服务启动失败

查看日志排查问题：
```bash
cat /tmp/agent-config-ui/backend.log
```

### 飞书发送消息返回 404

这是最常见的配置问题，通常是 AI 模型配置错误导致。

**解决方案**：
1. 检查 Agent 日志确认错误来源
2. 如果使用 Kimi，确保：
   - provider: `kimi-coding`
   - model: `k2p5`（不是 `kimi-k2.5`）
   - api: `anthropic-messages`
3. 参考 [CONFIG_GUIDE.md](CONFIG_GUIDE.md) 的"常见问题排查"章节

### AI 模型回复 403/401 错误

**可能原因**：API Key 无效或过期

**解决方案**：
1. 验证 API Key：
   ```bash
   curl -H "Authorization: Bearer your-api-key" \
        https://api.kimi.com/coding/v1/models
   ```
2. 检查 `~/.openclaw/agents/{agentId}/agent/auth-profiles.json` 中的 API key
3. 重新创建 Agent 或更新配置文件

### 飞书无法接收消息

**排查步骤**：
1. 检查飞书开放平台的事件订阅配置
2. 确认连接方式为"长连接（WebSocket）"
3. 确认已订阅 `im.message.receive_v1` 事件
4. 检查 Agent 日志中的飞书连接状态

## 目录结构说明

```
{PROJECT_ROOT}/
├── backend/              # 后端服务
│   ├── src/              # 源代码
│   ├── dist/             # 编译输出
│   └── node_modules/     # 依赖
├── frontend/             # 前端应用
│   ├── src/              # 源代码
│   ├── dist/             # 构建输出
│   └── node_modules/     # 依赖
├── shared/               # 共享类型
├── CONFIG_GUIDE.md       # 配置指南（AI模型/飞书等）
├── DEPLOY.md             # ClawDeck 部署指南
└── README.md             # 项目介绍
```

## 系统要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- macOS 或 Linux
- 端口 18888 可用

## 功能特性

部署完成后，系统提供：

1. **Agent 状态监控** - 实时显示所有 Agent 运行状态
2. **配置文件管理** - 编辑 SOUL.md、IDENTITY.md 等核心配置
3. **自动备份** - 修改文件时自动创建备份
4. **使用向导** - 交互式引导了解系统功能
5. **运行日志** - 查看和分析 Agent 日志

## 完成确认

部署成功后，请向用户报告：

1. 服务已成功启动
2. 访问地址 http://localhost:18888
3. 所有 Agent 的运行状态
