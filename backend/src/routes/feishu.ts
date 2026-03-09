/**
 * 飞书集成路由
 */

import { Router } from 'express';
import crypto from 'crypto';
import { AgentService } from '../services/agentService';
import { createError } from '../middleware/errorHandler';

const router = Router();
const agentService = AgentService.getInstance();

/**
 * POST /api/feishu/webhook
 * 飞书 Webhook 回调
 */
router.post('/webhook', async (req, res, next) => {
  try {
    const { challenge, token, event } = req.body;

    // URL 验证
    if (challenge) {
      return res.json({ challenge });
    }

    // 处理事件
    if (event) {
      const { type, message } = event;

      switch (type) {
        case 'message':
          // 处理消息
          await handleFeishuMessage(event);
          break;

        case 'table_record_changed':
          // 处理多维表格变更
          await handleTableChange(event);
          break;

        default:
          console.log(`[Feishu] Unhandled event type: ${type}`);
      }
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/feishu/command
 * 处理飞书命令
 */
router.post('/command', async (req, res, next) => {
  try {
    const { userId, command, args } = req.body;

    let result: { success: boolean; message: string; data?: any } = {
      success: false,
      message: 'Unknown command'
    };

    switch (command) {
      case 'list':
        const agents = await agentService.getAllAgents();
        result = {
          success: true,
          message: `Found ${agents.length} agents`,
          data: agents.map(a => ({
            id: a.id,
            name: a.name,
            displayName: a.displayName,
            status: a.status,
            emoji: a.emoji
          }))
        };
        break;

      case 'status':
        const agent = await agentService.getAgent(args.agentId);
        if (agent) {
          result = {
            success: true,
            message: `${agent.displayName} is ${agent.status}`,
            data: agent
          };
        } else {
          result = {
            success: false,
            message: `Agent ${args.agentId} not found`
          };
        }
        break;

      case 'start':
        await agentService.startAgent(args.agentId);
        result = {
          success: true,
          message: `Agent ${args.agentId} started successfully`
        };
        break;

      case 'stop':
        await agentService.stopAgent(args.agentId);
        result = {
          success: true,
          message: `Agent ${args.agentId} stopped successfully`
        };
        break;

      case 'restart':
        await agentService.restartAgent(args.agentId);
        result = {
          success: true,
          message: `Agent ${args.agentId} restarted successfully`
        };
        break;

      case 'join':
        // 加入房间逻辑
        result = {
          success: true,
          message: `Agent ${args.agentId} joined room ${args.roomId}`
        };
        break;

      case 'leave':
        // 离开房间逻辑
        result = {
          success: true,
          message: `Agent ${args.agentId} left room ${args.roomId}`
        };
        break;

      default:
        result = {
          success: false,
          message: `Unknown command: ${command}\nAvailable commands: list, status, start, stop, restart, join, leave`
        };
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/feishu/table-schema
 * 获取飞书多维表格结构
 */
router.get('/table-schema', async (req, res, next) => {
  try {
    const schema = {
      fields: [
        { fieldName: '助手ID', type: 'text', required: true },
        { fieldName: '助手名称', type: 'text', required: true },
        { fieldName: '显示名称', type: 'text', required: true },
        { fieldName: '形象', type: 'text' },
        { fieldName: '状态', type: 'singleSelect', options: ['运行中', '已停止', '异常', '配置中'] },
        { fieldName: '端口', type: 'number' },
        { fieldName: '飞书', type: 'checkbox' },
        { fieldName: 'Open-ClawChat', type: 'checkbox' },
        { fieldName: '当前房间', type: 'text' },
        { fieldName: '操作', type: 'button', actions: ['管理', '启动', '停止'] },
        { fieldName: '最后修改', type: 'datetime' }
      ]
    };

    res.json({
      success: true,
      data: schema
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/feishu/sync-to-table
 * 同步 Agent 数据到飞书表格
 */
router.post('/sync-to-table', async (req, res, next) => {
  try {
    const agents = await agentService.getAllAgents();

    // 转换为表格记录格式
    const records = agents.map(agent => ({
      fields: {
        '助手ID': agent.id,
        '助手名称': agent.name,
        '显示名称': agent.displayName,
        '形象': agent.emoji,
        '状态': agent.status === 'running' ? '运行中' :
               agent.status === 'stopped' ? '已停止' :
               agent.status === 'error' ? '异常' : '配置中',
        '端口': agent.port,
        '飞书': agent.channels.feishu,
        'Open-ClawChat': agent.channels.openClawChat,
        '当前房间': agent.currentRooms.map(r => r.roomId).join(', ') || '-',
        '最后修改': agent.lastModifiedAt
      }
    }));

    res.json({
      success: true,
      data: records,
      count: records.length
    });
  } catch (error) {
    next(error);
  }
});

// 辅助函数
async function handleFeishuMessage(event: any) {
  const { user_id, content } = event;
  const text = content?.text || '';

  console.log(`[Feishu] Message from ${user_id}: ${text}`);

  // 解析自然语言命令
  // 例如: "查看所有助手" -> list
  // "启动大汪" -> start dawang
  // "让二汪加入 test-room" -> join erwang test-room
}

async function handleTableChange(event: any) {
  const { record_id, changes } = event;

  console.log(`[Feishu] Table record ${record_id} changed:`, changes);

  // 处理表格变更
  // 例如: 状态从"已停止"改为"运行中" -> 启动 Agent
}

export { router as feishuRoutes };
