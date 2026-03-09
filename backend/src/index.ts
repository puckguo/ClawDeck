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
import { errorHandler } from './middleware/errorHandler';
import { AgentMonitor } from './services/agentMonitor';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 18888;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件服务（前端构建产物）
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// API 路由
app.use('/api/agents', agentRoutes);
app.use('/api/config', configRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/feishu', feishuRoutes);
app.use('/api/files', fileRoutes);

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

// 前端路由兜底
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

// 错误处理
app.use(errorHandler);

// 启动监控服务
const monitor = AgentMonitor.getInstance();
monitor.start();

// 启动服务器
server.listen(PORT, () => {
  console.log(`🚀 Agent Config Backend running on port ${PORT}`);
  console.log(`📊 API documentation: http://localhost:${PORT}/api/health`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  monitor.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  monitor.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
