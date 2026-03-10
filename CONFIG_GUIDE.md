# ClawDeck 配置指南

本文档详细介绍如何在 ClawDeck 中正确配置 Agent，包括 AI 模型、飞书集成等关键配置。

## 目录

- [AI 模型配置](#ai-模型配置)
- [飞书集成配置](#飞书集成配置)
- [常见问题排查](#常见问题排查)

---

## AI 模型配置

### 支持的 AI 提供商

ClawDeck 支持以下 AI 提供商：

| 提供商 | Provider ID | API 类型 | 默认 Base URL |
|--------|-------------|----------|---------------|
| DeepSeek | `deepseek` | openai-completions | https://api.deepseek.com/v1 |
| Kimi (Moonshot) | `kimi-coding` | anthropic-messages | https://api.kimi.com/coding/ |
| OpenAI | `openai` | openai-completions | https://api.openai.com/v1 |
| Anthropic | `anthropic` | anthropic-messages | https://api.anthropic.com |
| Google Gemini | `google` | google-generative-ai | https://generativelanguage.googleapis.com |

### Kimi 配置（推荐）

**⚠️ 重要说明**：
- Kimi 在 OpenClaw 中的标准名称为 `kimi-coding`
- 模型 ID 使用 `k2p5`（不是 `kimi-k2.5`）
- API 类型为 `anthropic-messages`（兼容 Claude API 格式）

**配置示例**：

```json
{
  "ai": {
    "provider": "kimi-coding",
    "model": "k2p5",
    "apiKey": "your-kimi-api-key"
  }
}
```

**环境变量**：
```bash
ANTHROPIC_AUTH_TOKEN=your-kimi-api-key
ANTHROPIC_BASE_URL=https://api.kimi.com/coding/
```

### DeepSeek 配置

**配置示例**：

```json
{
  "ai": {
    "provider": "deepseek",
    "model": "deepseek-chat",
    "apiKey": "your-deepseek-api-key"
  }
}
```

**环境变量**：
```bash
DEEPSEEK_API_KEY=your-deepseek-api-key
```

### 自定义 Base URL

如果需要使用代理或私有部署，可以指定自定义 Base URL：

```json
{
  "ai": {
    "provider": "deepseek",
    "model": "deepseek-chat",
    "apiKey": "your-api-key",
    "baseUrl": "https://your-custom-api.com/v1"
  }
}
```

---

## 飞书集成配置

### 飞书开放平台设置

1. 登录 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 记录 **App ID** 和 **App Secret**

### 权限配置

在飞书开放平台中，为应用添加以下权限：

- `im:chat:readonly` - 读取群组信息
- `im:message.group_msg` - 发送群组消息
- `im:message.p2p_msg` - 发送单聊消息
- `im:message:send` - 发送消息

### 事件订阅配置

**连接方式**：选择 **长连接（WebSocket）**

在**事件与回调** → **订阅方式**中选择：
- ✅ 使用长连接接收事件

**订阅事件**：
- `im.message.receive_v1` - 接收消息
- `im.chat.member.bot.added_v1` - 机器人被添加到群聊
- `im.chat.member.bot.deleted_v1` - 机器人被移除群聊

### ClawDeck 飞书配置

**配置示例**：

```json
{
  "feishu": {
    "enabled": true,
    "appId": "cli_xxxxxxxxxxxxxxxx",
    "appSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "connectionMode": "websocket",
    "dmPolicy": "open",
    "groupPolicy": "allowlist",
    "requireMention": false,
    "allowFrom": ["*"]
  }
}
```

**配置字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `enabled` | boolean | 是 | 是否启用飞书渠道 |
| `appId` | string | 是 | 飞书应用 App ID |
| `appSecret` | string | 是 | 飞书应用 App Secret |
| `connectionMode` | string | 否 | 连接方式：`websocket` 或 `webhook`（默认：websocket） |
| `dmPolicy` | string | 否 | 私聊策略：`open`、`pairing`、`allowlist` |
| `groupPolicy` | string | 否 | 群聊策略：`open`、`allowlist`、`disabled` |
| `requireMention` | boolean | 否 | 群聊中是否需要 @机器人 |
| `allowFrom` | array | 否 | 允许的用户列表，`["*"]` 表示允许所有人 |

### Webhook 模式（可选）

如果需要使用 Webhook 模式（适用于有公网 IP 的服务器）：

```json
{
  "feishu": {
    "enabled": true,
    "appId": "cli_xxxxxxxxxxxxxxxx",
    "appSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "connectionMode": "webhook",
    "webhookPort": 3001,
    "webhookPath": "/feishu/events",
    "webhookHost": "0.0.0.0",
    "verificationToken": "your-verification-token",
    "encryptKey": "your-encrypt-key"
  }
}
```

**Webhook 配置说明**：
- 在飞书开放平台中设置回调 URL：`http://your-server:3001/feishu/events`
- `verificationToken` 用于验证飞书请求的真实性
- `encryptKey` 用于解密飞书加密消息（可选）

---

## 常见问题排查

### 问题 1：飞书发消息返回 HTTP 404

**现象**：飞书发送消息后，回复 "HTTP 404: The requested resource was not found"

**原因**：AI 模型配置错误，不是飞书配置问题

**排查步骤**：

1. 检查 Agent 日志：
   ```bash
   cat ~/.openclaw/agents/{agentId}/agent.log
   ```

2. 确认模型配置正确：
   - `kimi-coding` 的 `api` 必须是 `anthropic-messages`
   - 模型 ID 必须是 `k2p5`（不是 `kimi-k2.5`）

3. 检查 auth-profiles.json：
   ```json
   {
     "profiles": {
       "kimi-coding:default": {
         "type": "api_key",
         "provider": "kimi-coding",
         "key": "your-api-key"
       }
     }
   }
   ```

**解决方案**：
- 如果是 Kimi，确保使用 `kimi-coding` 作为 provider，模型 ID 使用 `k2p5`
- 重新创建 Agent 或手动修改配置文件

### 问题 2：飞书无法连接到 Agent

**现象**：飞书发送消息后没有回复，日志中没有收到消息记录

**排查步骤**：

1. 检查飞书事件订阅配置：
   - 确认连接方式为"长连接（WebSocket）"
   - 确认已订阅 `im.message.receive_v1` 事件

2. 检查 Agent 日志中飞书连接状态：
   ```
   [feishu] feishu[default]: starting WebSocket connection...
   [feishu] feishu[default]: WebSocket client started
   ```

3. 检查 App ID 和 App Secret 是否正确

### 问题 3：AI 回复很慢或超时

**可能原因**：
- 网络连接不稳定
- AI 模型响应慢
- 上下文过长

**解决方案**：
- 检查网络连接
- 在配置中调整 `contextPruning` 设置，缩短上下文保留时间
- 考虑使用更快的模型或更短的 `maxTokens`

### 问题 4：API Key 无效

**现象**：日志显示 API 返回 401/403 错误

**排查步骤**：

1. 验证 API Key 是否有效：
   ```bash
   curl -H "Authorization: Bearer your-api-key" \
        https://api.kimi.com/coding/v1/models
   ```

2. 检查环境变量是否正确设置

3. 检查 auth-profiles.json 中的 API key 是否正确

---

## 配置文件示例

### 完整的 Agent 配置

```json
{
  "meta": {
    "lastTouchedVersion": "2026.2.26",
    "lastTouchedAt": "2026-03-10T12:00:00.000Z"
  },
  "auth": {
    "profiles": {
      "kimi-coding:default": {
        "provider": "kimi-coding",
        "mode": "api_key"
      }
    }
  },
  "models": {
    "mode": "merge",
    "providers": {
      "kimi-coding": {
        "baseUrl": "https://api.kimi.com/coding/",
        "api": "anthropic-messages",
        "models": [
          {
            "id": "k2p5",
            "name": "Kimi for Coding",
            "reasoning": true,
            "input": ["text", "image"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 262144,
            "maxTokens": 32768
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": { "primary": "kimi-coding/k2p5" },
      "workspace": "/path/to/workspace",
      "contextPruning": { "mode": "cache-ttl", "ttl": "24h" },
      "compaction": { "mode": "safeguard" }
    },
    "list": [
      {
        "id": "my-agent",
        "name": "my-agent",
        "workspace": "/path/to/workspace",
        "agentDir": "/path/to/agent/agent"
      }
    ]
  },
  "channels": {
    "feishu": {
      "enabled": true,
      "appId": "cli_xxxxxxxxxxxxxxxx",
      "appSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "domain": "feishu",
      "connectionMode": "websocket",
      "dmPolicy": "open",
      "groupPolicy": "allowlist",
      "requireMention": false,
      "allowFrom": ["*"]
    }
  },
  "gateway": {
    "port": 18790,
    "mode": "local",
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "your-token"
    }
  },
  "plugins": {
    "allow": ["feishu"],
    "entries": {
      "feishu": { "enabled": true }
    }
  }
}
```

---

## 相关文档

- [README.md](README.md) - 项目介绍和快速开始
- [DEPLOY.md](DEPLOY.md) - 部署指南
- [飞书开放平台文档](https://open.feishu.cn/document/home/index)
- [Kimi API 文档](https://platform.moonshot.cn/docs/api/overview)
