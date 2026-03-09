# ClawDeck - OpenClaw Agent Configuration Management System

[![English](https://img.shields.io/badge/Language-English-blue)](README_EN.md)
[![中文](https://img.shields.io/badge/Language-中文-blue)](README.md)

A user-friendly web interface for managing OpenClaw Agents, supporting viewing and modifying existing Agent configurations, creation wizard, batch operations, real-time monitoring, and more.

> **ClawDeck** = Claw + Deck, symbolizing the OpenClaw command and control center

## Features

### Core Features
- **Agent List Management** - Card/list view with real-time status monitoring
- **Existing Agent Editing** - 7-tab complete configuration management (Overview/Basic/Channels/Rooms/Skills/Logs/Advanced)
- **Creation Wizard** - 4-step process with form validation and one-click start
- **Batch Operations** - Batch start/stop/restart
- **Configuration Version Management** - Auto-backup, history, and one-click rollback
- **Internationalization** - Support for Chinese and English (switchable)

### Monitoring Features
- **Real-time Monitoring Panel** - CPU/memory/status
- **Resource Usage Statistics** - Trend charts
- **Status Change Notifications** - Auto refresh

### Integration Features
- **IM Conversation Configuration** - Feishu bot commands
- **Multi-dimensional Tables** - Feishu table sync
- **Extended API** - RESTful API

## Tech Stack

- **Frontend**: React 18 + TypeScript + Ant Design + Vite
- **Backend**: Node.js + Express + TypeScript
- **Shared**: TypeScript type definitions
- **i18n**: react-i18next + i18next

## Quick Start

### AI Auto Deployment (Recommended)

Let OpenClaw or Claude Code read the deployment guide and automatically execute:

```
Please read {PROJECT_ROOT}/DEPLOY.md and deploy ClawDeck step by step
```

The AI will automatically complete: Environment check → Install dependencies → Build project → Start service → Verify deployment

### Manual Deployment

If AI deployment is not available, execute manually:

```bash
cd {PROJECT_ROOT}
./start.sh
```

The script will automatically: Install dependencies → Build project → Start service → Run tests

Visit http://localhost:18888 to view ClawDeck

### Script Commands

```bash
./start.sh all      # Full process (default)
./start.sh install  # Install dependencies only
./start.sh build    # Build project only
./start.sh test     # Run tests only
./start.sh start    # Start service only
```

### Manual Operations

#### 1. Install Dependencies

```bash
cd /path/to/clawdeck
npm run install:all
```

#### 2. Development Mode

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:18888

#### 3. Production Build

```bash
npm run build
npm start
```

## Project Structure

```
agent-config-ui/
├── shared/               # Shared type definitions
│   └── types.ts         # TypeScript types
├── backend/             # Backend service
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   ├── middleware/  # Middleware
│   │   └── index.ts     # Entry
│   └── package.json
├── frontend/            # Frontend application
│   ├── src/
│   │   ├── components/  # Components
│   │   ├── pages/       # Pages
│   │   ├── api/         # API calls
│   │   ├── i18n/        # Internationalization
│   │   └── App.tsx      # Main app
│   └── package.json
├── agent/               # Config management Agent (IM conversation)
├── DEPLOY.md            # AI deployment guide
├── README.md            # Chinese documentation
└── README_EN.md         # English documentation
```

## Internationalization (i18n)

ClawDeck supports switching between Chinese and English. The language selector is located in the top-right corner of the page.

### Supported Languages
- **中文** (Chinese) - Default
- **English** (English)

### Translation Files

Translation files are located in `frontend/src/i18n/locales/`:
- `zh.json` - Chinese translations
- `en.json` - English translations

### Adding New Translations

1. Add new keys to both `zh.json` and `en.json`
2. Use `useTranslation` hook in components:

```typescript
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation()
  return <h1>{t('common.appName')}</h1>
}
```

## API Reference

### Agent Management
- `GET /api/agents` - Get all Agents
- `POST /api/agents` - Create Agent
- `GET /api/agents/:id` - Get single Agent
- `PATCH /api/agents/:id` - Update Agent
- `DELETE /api/agents/:id` - Delete Agent
- `POST /api/agents/:id/start` - Start Agent
- `POST /api/agents/:id/stop` - Stop Agent
- `POST /api/agents/:id/restart` - Restart Agent
- `POST /api/agents/batch` - Batch operations

### Configuration Management
- `GET /api/config/:agentId` - Get configuration
- `PUT /api/config/:agentId` - Update configuration
- `POST /api/config/:agentId/validate` - Validate configuration

### Chat Rooms
- `GET /api/rooms/:agentId` - Get room list
- `POST /api/rooms/:agentId/join` - Join room
- `POST /api/rooms/:agentId/leave` - Leave room
- `POST /api/rooms/:agentId/create` - Create room

### Monitoring
- `GET /api/monitoring/status` - Status summary
- `GET /api/monitoring/:agentId/metrics` - Monitoring metrics
- `GET /api/monitoring/:agentId/realtime` - Real-time status

## Terminology Mapping

| Technical Term | User-Friendly Name |
|----------------|-------------------|
| Agent | Assistant / AI Employee |
| openclaw.json | Assistant Profile |
| Gateway | Service Port |
| Workspace | Workspace |
| SKILL.md | Skill Documentation |
| SOUL.md | Personality Settings |
| Channel | Message Channel |
| Room | Chat Room |
| Heartbeat | Online Duration |

## Development Roadmap

- [x] Basic architecture setup
- [x] Agent list and CRUD
- [x] Multi-tab configuration editing
- [x] Internationalization (Chinese/English)
- [x] File management with auto-backup
- [x] Guide tour feature
- [ ] Skill management
- [ ] Configuration version management
- [ ] Log viewing
- [ ] Feishu integration
- [ ] Multi-dimensional table sync

## License

MIT

---

**Language**: [中文](README.md) | **English**
