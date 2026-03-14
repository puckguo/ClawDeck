/**
 * Agent 配置管理后端服务
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import path from 'path';

import { agentRoutes } from './routes/agents';
import { configRoutes } from './routes/config';
import { roomRoutes } from './routes/rooms';
import { skillRoutes } from './routes/skills';
import { logRoutes } from './routes/logs';
import { monitoringRoutes } from './routes/monitoring';
import { feishuRoutes } from './routes/feishu';
import { fileRoutes } from './routes/files';
import skillsMarketRoutes from './routes/skillsMarket';
import { petRoutes } from './routes/pets';
import { errorHandler } from './middleware/errorHandler';
import { AgentMonitor } from './services/agentMonitor';
import { dailyEvaluationJob } from './jobs/dailyEvaluationJob';
import { petHeartbeatJob } from './jobs/petHeartbeatJob';
import { memoryAnalysisService } from './services/memoryAnalysisService';
import os from 'os';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// OpenClaw 根目录
const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || path.join(os.homedir(), '.openclaw');

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件服务（前端构建产物）
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// BountyClaw 众包平台静态文件 - 使用绝对路径
const projectRoot = path.resolve(__dirname, '../../..');
app.use('/bountyclaw-console', express.static(path.join(projectRoot, 'Claw众包', 'clawdeck-console')));
app.use('/bountyclaw-skill', express.static(path.join(projectRoot, 'Claw众包', 'skill-frontend')));

// 宠物图片静态文件服务 - 指向新的图片目录
const IMAGES_DIR = path.join(OPENCLAW_ROOT, 'images');
app.use('/pet-images', express.static(IMAGES_DIR));

// TTS 音频静态文件服务
const TTS_DIR = path.join(OPENCLAW_ROOT, 'tts');
app.use('/tts-audio', express.static(TTS_DIR));

// 初始化数据库
import { databaseService } from './services/databaseService';
console.log('[Database] SQLite database initialized at:', path.join(OPENCLAW_ROOT, 'database', 'openclaw.db'));

// API 路由
app.use('/api/agents', agentRoutes);
app.use('/api/config', configRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/feishu', feishuRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/skills-market', skillsMarketRoutes);
app.use('/api/pets', petRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

// 每日评估任务 - 手动触发
app.post('/api/pets/evaluate/all', async (req, res) => {
  try {
    const result = await dailyEvaluationJob.triggerManualEvaluation();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Evaluation failed: ${error}`
    });
  }
});

// 单个宠物评估
app.post('/api/pets/:agentId/evaluate', async (req, res) => {
  try {
    const result = await dailyEvaluationJob.triggerManualEvaluation(req.params.agentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Evaluation failed: ${error}`
    });
  }
});

// 获取宠物记忆活跃度统计
app.get('/api/pets/:agentId/memory-stats', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const stats = await memoryAnalysisService.getHistoryStats(req.params.agentId, days);

    if (!stats) {
      res.status(404).json({
        success: false,
        message: 'No memory stats found'
      });
      return;
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to get stats: ${error}`
    });
  }
});

// 定时任务状态
app.get('/api/jobs/daily-evaluation/status', (req, res) => {
  res.json({
    success: true,
    data: dailyEvaluationJob.getStatus()
  });
});

// 更新定时任务配置
app.post('/api/jobs/daily-evaluation/config', (req, res) => {
  const { enabled, scheduleTime } = req.body;
  dailyEvaluationJob.updateConfig({ enabled, scheduleTime });
  res.json({
    success: true,
    message: 'Config updated',
    data: dailyEvaluationJob.getStatus()
  });
});

// 数据迁移 API - 将文件系统数据迁移到 SQLite
app.post('/api/migrate/sqlite', async (req, res) => {
  try {
    const { runMigration } = await import('./scripts/migrateToSQLite');
    await runMigration();
    res.json({
      success: true,
      message: 'Data migration completed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Migration failed: ${error}`
    });
  }
});

// 前端路由兜底
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

// 错误处理
app.use(errorHandler);

// 启动监控服务
const monitor = AgentMonitor.getInstance();
monitor.start();

// 启动每日评估定时任务
dailyEvaluationJob.start();

// 启动宠物心跳定时任务
petHeartbeatJob.start();

// 启动服务器
server.listen(PORT, () => {
  console.log(`🚀 Agent Config Backend running on port ${PORT}`);
  console.log(`📊 API documentation: http://localhost:${PORT}/api/health`);
  console.log(`🐾 Daily pet evaluation job scheduled at 03:00`);
  console.log(`💓 Pet heartbeat job started (30min interval)`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  monitor.stop();
  dailyEvaluationJob.stop();
  petHeartbeatJob.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  monitor.stop();
  dailyEvaluationJob.stop();
  petHeartbeatJob.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
