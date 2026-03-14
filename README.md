# ClawDeck - OpenClaw Pet 数字宠物养成系统

[![中文](https://img.shields.io/badge/语言-中文-blue)](README.md)
[![English](https://img.shields.io/badge/Language-English-blue)](README_EN.md)

基于 OpenClaw Agent 的数字宠物养成系统。每个 Agent 都是一个有生命的 AI 伙伴，拥有独立的性格、情绪和成长轨迹。通过自然对话与宠物互动，看着它从婴儿成长为独特的个体。

## ✨ 核心特性

### 🤖 AI 驱动的生命体
- **真实个性** - Agent 基于 SOUL.md 和 IDENTITY.md 形成独特性格
- **自然对话** - 像和真实宠物一样聊天，AI 实时生成反应和情绪
- **自主状态** - 饥饿、心情、精力等状态由 AI 自主管理并输出
- **成长进化** - 通过互动积累经验，解锁新的性格特征和能力

### 🎮 互动方式
- **自然语言** - 无需点击按钮，直接打字和宠物聊天
- **语音对话** - 集成阿里云 TTS，宠物可以开口说话
- **形象生成** - 集成阿里云文生图，根据状态生成宠物形象
- **主动消息** - 宠物会主动找你聊天，分享心情和想法

### 📊 可视化界面
- **宠物首页** - 展示当前状态和最新形象
- **聊天界面** - 实时对话，查看历史消息
- **相册系统** - 保存和查看宠物形象进化历程
- **状态面板** - 实时监控宠物状态变化

## 🚀 快速开始

### 环境要求
- Node.js 18+
- SQLite（内置，无需额外安装）
- 阿里云 DashScope API Key（用于 TTS 和文生图）

### 启动服务

```bash
# 启动后端（端口 3001）
cd backend
npm install
npm run build
npm start

# 启动前端（端口 5174）
cd frontend
npm install
npm run dev
```

访问 http://localhost:5174 开始你的数字宠物之旅。

### 配置阿里云 API（可选）

在 `backend/src/services/ttsService.ts` 和 `a2uiService.ts` 中配置你的阿里云 API Key：

```typescript
const ALIYUN_API_KEY = 'your-api-key-here';
```

## 🏗️ 项目结构

```
ClawDeck/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── services/       # 业务逻辑
│   │   │   ├── petAIService.ts      # AI 对话服务
│   │   │   ├── petService.ts        # 宠物状态管理
│   │   │   ├── ttsService.ts        # 阿里云 TTS
│   │   │   ├── a2uiService.ts       # 阿里云文生图
│   │   │   └── petMessageService.ts # 主动消息推送
│   │   ├── routes/         # API 路由
│   │   └── jobs/           # 定时任务
│   └── package.json
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── pages/          # 页面
│   │   │   ├── PetHome.tsx     # 宠物首页
│   │   │   ├── PetA2UIPage.tsx # 宠物详情页
│   │   │   └── PetDetail.tsx   # 宠物详情
│   │   └── api/            # API 调用
├── shared/                 # 共享类型
│   └── types.ts
└── README.md
```

## 🎮 使用指南

### 创建宠物
1. 进入 Agent 管理页面
2. 创建新的 Agent（即宠物）
3. 配置宠物的性格和能力（SOUL.md / IDENTITY.md）
4. 宠物会自动创建并开始生长

### 与宠物互动
1. 点击宠物卡片进入详情页
2. 在聊天框输入消息与宠物对话
3. 宠物会根据你的消息和当前状态做出反应
4. 状态变化会实时显示在界面上

### 宠物形象
- 点击"拍照"按钮生成当前状态的形象图
- 形象图会根据宠物的心情、健康状态变化
- 所有生成的图片保存在相册中

### 语音功能
- 点击"朗读"按钮播放宠物当前想法
- 在聊天中，宠物回复会自动播放语音
- 支持切换音色（樱桃、赛琳娜、伊森、切尔茜）

## 🔌 API 接口

### 宠物管理
- `GET /api/pets` - 获取所有宠物列表
- `GET /api/pets/:agentId` - 获取单个宠物详情
- `POST /api/pets/:agentId/interact` - 与宠物互动

### 聊天对话
- `POST /api/pets/:agentId/chat` - 发送消息
- `GET /api/pets/:agentId/chat/history` - 获取聊天历史

### 消息推送
- `GET /api/pets/:agentId/messages` - 获取主动消息
- `GET /api/pets/:agentId/messages/unread` - 获取未读消息
- `POST /api/pets/:agentId/messages/read` - 标记已读

### 图片管理
- `POST /api/pets/:agentId/images` - 生成形象图
- `GET /api/pets/:agentId/images` - 获取图片列表
- `GET /api/pets/:agentId/images/file/:filename` - 获取图片文件

### TTS 语音
- `POST /api/pets/:agentId/tts` - 文字转语音
- `GET /api/pets/:agentId/tts/voices` - 获取音色列表

## 🧠 技术实现

### AI 架构
- **状态管理** - 宠物状态由 AI 自主决定，通过 STATE 块输出
- **对话系统** - 直接调用 Agent 的 LLM API，保持人格一致性
- **心跳机制** - 每 5 分钟触发 AI 更新状态，生成主动消息

### 数据存储
- **SQLite** - 宠物状态、聊天记录、图片元数据
- **本地文件** - 生成的图片、TTS 音频文件
- **OpenClaw** - 复用 Agent 的工作空间和配置文件

### 第三方服务
- **阿里云 TTS** - qwen-tts 模型，提供 4 种音色
- **阿里云文生图** - Qwen-Image 模型，生成宠物形象

## 📝 配置说明

### 宠物性格设定

在 `~/.openclaw/agents/{agentId}/SOUL.md` 中定义宠物的核心性格：

```markdown
# 灵魂档案

## 核心特质
- 活泼好动，喜欢运动
- 对主人忠诚，粘人
- 有点贪吃

## 说话风格
- 使用"汪汪"等拟声词
- 喜欢用括号表达动作（摇尾巴）、（眨眼睛）
- 语气可爱，充满能量
```

### 定时任务配置

在 `backend/src/jobs/petHeartbeatJob.ts` 中调整心跳间隔：

```typescript
const DEFAULT_CONFIG: HeartbeatConfig = {
  enabled: true,
  intervalMinutes: 5  // 每 5 分钟执行一次
};
```

## 🛠️ 开发计划

- [x] 基础宠物状态管理
- [x] AI 驱动的对话系统
- [x] 阿里云 TTS 集成
- [x] 阿里云文生图集成
- [x] 主动消息推送
- [x] 相册系统
- [ ] 宠物进化分支
- [ ] 多人互动（宠物社交）
- [ ] 物品/道具系统
- [ ] 成就系统

## 📄 License

MIT

---

**注意**：这是一个实验性项目，展示了如何将 OpenClaw Agent 转变为有生命的数字宠物。实际生产使用需要更多测试和优化。
