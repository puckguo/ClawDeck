/**
 * 日志管理路由
 */

import { Router } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { createError } from '../middleware/errorHandler';
import type { AgentLog, LogType, LogLevel } from '../types';

const router = Router();

const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || '/Users/godspeed/.openclaw';
const LOGS_DIR = path.join(OPENCLAW_ROOT, 'logs');

// 内存日志存储（用于实时日志）
const memoryLogs: AgentLog[] = [];
const MAX_MEMORY_LOGS = 10000;

/**
 * GET /api/logs/:agentId
 * 获取 Agent 日志
 */
router.get('/:agentId', async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const {
      type = 'all',
      level = 'all',
      limit = '100',
      offset = '0',
      startTime,
      endTime,
      search
    } = req.query;

    const logType = type as LogType | 'all';
    const logLevel = level as LogLevel | 'all';
    const logLimit = parseInt(limit as string, 10);
    const logOffset = parseInt(offset as string, 10);

    // 获取日志
    let logs: AgentLog[] = [];

    // 1. 从文件读取系统日志
    const logFilePath = path.join('/tmp', `${agentId}.log`);
    if (await fs.pathExists(logFilePath)) {
      const content = await fs.readFile(logFilePath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);

      const fileLogs = lines.map((line, index) => {
        // 尝试解析日志格式
        const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
        const levelMatch = line.match(/\[(INFO|WARN|ERROR|DEBUG)\]/i);

        return {
          id: `file-${index}`,
          agentId,
          type: 'system' as LogType,
          level: (levelMatch?.[1].toLowerCase() || 'info') as LogLevel,
          message: line,
          timestamp: timestampMatch?.[1] || new Date().toISOString()
        };
      });

      logs.push(...fileLogs);
    }

    // 2. 添加内存日志
    logs.push(...memoryLogs.filter(log => log.agentId === agentId));

    // 3. 过滤
    if (logType !== 'all') {
      logs = logs.filter(log => log.type === logType);
    }

    if (logLevel !== 'all') {
      const levelOrder: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
      const minLevel = levelOrder[logLevel];
      logs = logs.filter(log => levelOrder[log.level] >= minLevel);
    }

    if (startTime) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(startTime as string));
    }

    if (endTime) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(endTime as string));
    }

    if (search) {
      const searchTerm = (search as string).toLowerCase();
      logs = logs.filter(log => log.message.toLowerCase().includes(searchTerm));
    }

    // 4. 排序（最新的在前）
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 5. 分页
    const total = logs.length;
    const paginatedLogs = logs.slice(logOffset, logOffset + logLimit);

    res.json({
      success: true,
      data: paginatedLogs,
      pagination: {
        total,
        offset: logOffset,
        limit: logLimit,
        hasMore: logOffset + logLimit < total
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/logs/:agentId
 * 添加日志（用于 Agent 上报）
 */
router.post('/:agentId', async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { type, level, message, metadata } = req.body;

    const log: AgentLog = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      type: type || 'system',
      level: level || 'info',
      message,
      timestamp: new Date().toISOString(),
      metadata
    };

    memoryLogs.push(log);

    // 限制内存日志数量
    if (memoryLogs.length > MAX_MEMORY_LOGS) {
      memoryLogs.shift();
    }

    res.json({
      success: true,
      data: { id: log.id }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/logs/:agentId/stream
 * 实时日志流（SSE）
 */
router.get('/:agentId/stream', async (req, res, next) => {
  try {
    const { agentId } = req.params;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 发送初始连接成功消息
    res.write(`data: ${JSON.stringify({ type: 'connected', agentId })}\n\n`);

    // 定期发送心跳
    const heartbeat = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
    }, 30000);

    // 监听新日志
    const checkNewLogs = setInterval(() => {
      const newLogs = memoryLogs.filter(log =>
        log.agentId === agentId &&
        new Date(log.timestamp).getTime() > Date.now() - 5000
      );

      for (const log of newLogs) {
        res.write(`data: ${JSON.stringify({ type: 'log', data: log })}\n\n`);
      }
    }, 1000);

    // 客户端断开时清理
    req.on('close', () => {
      clearInterval(heartbeat);
      clearInterval(checkNewLogs);
    });

  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/logs/:agentId
 * 清空日志
 */
router.delete('/:agentId', async (req, res, next) => {
  try {
    const { agentId } = req.params;

    // 清空内存日志
    const index = memoryLogs.findIndex(log => log.agentId === agentId);
    if (index > -1) {
      memoryLogs.splice(index, 1);
    }

    // 清空文件日志
    const logFilePath = path.join('/tmp', `${agentId}.log`);
    if (await fs.pathExists(logFilePath)) {
      await fs.writeFile(logFilePath, '');
    }

    res.json({
      success: true,
      message: 'Logs cleared successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/logs/:agentId/export
 * 导出日志
 */
router.post('/:agentId/export', async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { startTime, endTime } = req.body;

    // 获取所有日志
    let logs: AgentLog[] = [...memoryLogs.filter(log => log.agentId === agentId)];

    const logFilePath = path.join('/tmp', `${agentId}.log`);
    if (await fs.pathExists(logFilePath)) {
      const content = await fs.readFile(logFilePath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);

      const fileLogs = lines.map((line, index) => ({
        id: `file-${index}`,
        agentId,
        type: 'system' as LogType,
        level: 'info' as LogLevel,
        message: line,
        timestamp: new Date().toISOString()
      }));

      logs.push(...fileLogs);
    }

    // 时间过滤
    if (startTime) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(startTime));
    }

    if (endTime) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(endTime));
    }

    // 排序
    logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // 生成导出内容
    const exportContent = logs.map(log =>
      `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');

    res.setHeader('Content-Disposition', `attachment; filename="${agentId}-logs.txt"`);
    res.setHeader('Content-Type', 'text/plain');
    res.send(exportContent);
  } catch (error) {
    next(error);
  }
});

export { router as logRoutes };
