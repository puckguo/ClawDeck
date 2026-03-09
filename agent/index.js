/**
 * 配置管理 Agent
 * 用于 IM 对话方式管理 Agent 配置
 *
 * 支持的命令：
 * - 查看所有助手
 * - 查看 [助手名称] 配置
 * - 启动 [助手名称]
 * - 停止 [助手名称]
 * - 重启 [助手名称]
 * - 修改 [助手名称] 显示名称为 [新名称]
 * - 让 [助手名称] 加入 [房间名] 聊 [时长] 分钟
 * - 让 [助手名称] 退出 [房间名]
 * - 创建新助手
 */

const axios = require('axios');

const API_BASE_URL = process.env.CONFIG_API_URL || 'http://localhost:18888/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
});

// 命令处理器
const commandHandlers = {
  // 查看所有助手
  async listAgents() {
    const response = await api.get('/agents');
    const agents = response.data.data || [];

    if (agents.length === 0) {
      return '📭 暂无 Agent，发送「创建新助手」开始创建';
    }

    const lines = ['📊 你的 AI 助手列表：\n'];
    agents.forEach((agent, index) => {
      const status = agent.status === 'running' ? '🟢' :
                    agent.status === 'stopped' ? '🔴' : '🟠';
      lines.push(`${index + 1}. ${agent.emoji} ${agent.name}（${agent.displayName}）`);
      lines.push(`   状态：${status} ${agent.status} | 端口：${agent.port}`);
      lines.push(`   渠道：${agent.channels.feishu ? '飞书✅' : '飞书❌'} ${agent.channels.openClawChat ? 'Chat✅' : 'Chat❌'}`);
      if (agent.currentRooms.length > 0) {
        lines.push(`   房间：${agent.currentRooms.map(r => r.roomId).join(', ')}`);
      }
      lines.push('');
    });

    lines.push('💡 发送「查看 [助手名称] 配置」查看详细信息');
    return lines.join('\n');
  },

  // 查看配置
  async getAgentStatus(agentName) {
    const response = await api.get('/agents');
    const agents = response.data.data || [];
    const agent = agents.find(a =>
      a.id === agentName ||
      a.name === agentName ||
      a.displayName === agentName
    );

    if (!agent) {
      return `❌ 未找到名为「${agentName}」的助手`;
    }

    const lines = [
      `📋 ${agent.emoji} ${agent.name}（${agent.displayName}）的配置信息：\n`,
      `├─ 基础信息`,
      `│   ├─ 助手ID: ${agent.id}`,
      `│   ├─ 内部名称: ${agent.name}`,
      `│   ├─ 显示名称: ${agent.displayName}`,
      `│   └─ 形象: ${agent.emoji}`,
      ``,
      `├─ 运行状态: ${agent.status === 'running' ? '🟢 运行中' : '🔴 已停止'}`,
    ];

    if (agent.runtimeInfo?.pid) {
      lines.push(`│   ├─ PID: ${agent.runtimeInfo.pid}`);
    }
    if (agent.runtimeInfo?.cpu !== undefined) {
      lines.push(`│   ├─ CPU: ${agent.runtimeInfo.cpu.toFixed(1)}%`);
    }
    if (agent.runtimeInfo?.memory !== undefined) {
      lines.push(`│   ├─ 内存: ${agent.runtimeInfo.memory.toFixed(1)}%`);
    }

    lines.push(
      ``,
      `├─ 消息渠道`,
      `│   ├─ 飞书: ${agent.channels.feishu ? '✅ 已启用' : '❌ 未启用'}`,
      `│   └─ Open-ClawChat: ${agent.channels.openClawChat ? '✅ 已启用' : '❌ 未启用'}`,
      ``,
      `└─ 当前房间: ${agent.currentRooms.length > 0 ? agent.currentRooms.map(r => r.roomId).join(', ') : '未加入任何房间'}`
    );

    lines.push(`\n💡 操作：[启动] [停止] [重启] [修改配置]`);
    return lines.join('\n');
  },

  // 启动 Agent
  async startAgent(agentName) {
    const response = await api.get('/agents');
    const agents = response.data.data || [];
    const agent = agents.find(a =>
      a.id === agentName ||
      a.name === agentName ||
      a.displayName === agentName
    );

    if (!agent) {
      return `❌ 未找到名为「${agentName}」的助手`;
    }

    await api.post(`/agents/${agent.id}/start`);
    return `✅ ${agent.emoji} ${agent.name} 已启动`;
  },

  // 停止 Agent
  async stopAgent(agentName) {
    const response = await api.get('/agents');
    const agents = response.data.data || [];
    const agent = agents.find(a =>
      a.id === agentName ||
      a.name === agentName ||
      a.displayName === agentName
    );

    if (!agent) {
      return `❌ 未找到名为「${agentName}」的助手`;
    }

    await api.post(`/agents/${agent.id}/stop`);
    return `✅ ${agent.emoji} ${agent.name} 已停止`;
  },

  // 重启 Agent
  async restartAgent(agentName) {
    const response = await api.get('/agents');
    const agents = response.data.data || [];
    const agent = agents.find(a =>
      a.id === agentName ||
      a.name === agentName ||
      a.displayName === agentName
    );

    if (!agent) {
      return `❌ 未找到名为「${agentName}」的助手`;
    }

    await api.post(`/agents/${agent.id}/restart`);
    return `✅ ${agent.emoji} ${agent.name} 已重启`;
  },

  // 修改显示名称
  async updateDisplayName(agentName, newName) {
    const response = await api.get('/agents');
    const agents = response.data.data || [];
    const agent = agents.find(a =>
      a.id === agentName ||
      a.name === agentName ||
      a.displayName === agentName
    );

    if (!agent) {
      return `❌ 未找到名为「${agentName}」的助手`;
    }

    await api.patch(`/agents/${agent.id}`, { displayName: newName });
    return `✅ ${agent.emoji} ${agent.name} 的显示名称已修改为「${newName}」\n💡 此修改需要重启才能生效`;
  },

  // 加入房间
  async joinRoom(agentName, roomId, duration = 30) {
    const response = await api.get('/agents');
    const agents = response.data.data || [];
    const agent = agents.find(a =>
      a.id === agentName ||
      a.name === agentName ||
      a.displayName === agentName
    );

    if (!agent) {
      return `❌ 未找到名为「${agentName}」的助手`;
    }

    await api.post(`/rooms/${agent.id}/join`, { roomId, duration });
    return `✅ ${agent.emoji} ${agent.name} 已加入 ${roomId}\n⏱️ 将在 ${duration} 分钟后自动退出`;
  },

  // 退出房间
  async leaveRoom(agentName, roomId) {
    const response = await api.get('/agents');
    const agents = response.data.data || [];
    const agent = agents.find(a =>
      a.id === agentName ||
      a.name === agentName ||
      a.displayName === agentName
    );

    if (!agent) {
      return `❌ 未找到名为「${agentName}」的助手`;
    }

    await api.post(`/rooms/${agent.id}/leave`, { roomId });
    return `✅ ${agent.emoji} ${agent.name} 已退出 ${roomId}`;
  },

  // 创建房间
  async createRoom(agentName, roomName) {
    const response = await api.get('/agents');
    const agents = response.data.data || [];
    const agent = agents.find(a =>
      a.id === agentName ||
      a.name === agentName ||
      a.displayName === agentName
    );

    if (!agent) {
      return `❌ 未找到名为「${agentName}」的助手`;
    }

    const result = await api.post(`/rooms/${agent.id}/create`, { roomName });
    const { roomId, question, password } = result.data.data;

    return `✅ ${agent.emoji} ${agent.name} 已创建房间 ${roomId}\n❓ 验证问题：${question}\n🔑 房间密码：${password}`;
  }
};

// 自然语言命令解析
async function parseCommand(message) {
  const text = message.trim().toLowerCase();

  // 查看所有助手
  if (/查看所有|所有助手|列表|list/.test(text)) {
    return commandHandlers.listAgents();
  }

  // 查看配置
  const statusMatch = text.match(/查看\s+(.+?)\s*(?:配置|状态)?$/);
  if (statusMatch) {
    return commandHandlers.getAgentStatus(statusMatch[1].trim());
  }

  // 启动
  const startMatch = text.match(/(?:启动|开始|start)\s+(.+)/);
  if (startMatch) {
    return commandHandlers.startAgent(startMatch[1].trim());
  }

  // 停止
  const stopMatch = text.match(/(?:停止|停止|stop)\s+(.+)/);
  if (stopMatch) {
    return commandHandlers.stopAgent(stopMatch[1].trim());
  }

  // 重启
  const restartMatch = text.match(/(?:重启|restart)\s+(.+)/);
  if (restartMatch) {
    return commandHandlers.restartAgent(restartMatch[1].trim());
  }

  // 修改显示名称
  const renameMatch = text.match(/(?:修改|重命名)\s+(.+?)\s*(?:的?显示名称|名字)\s*为?\s*(.+)/);
  if (renameMatch) {
    return commandHandlers.updateDisplayName(renameMatch[1].trim(), renameMatch[2].trim());
  }

  // 加入房间
  const joinMatch = text.match(/(?:让|使)\s*(.+?)\s*(?:加入|进入)\s*(.+?)(?:\s*聊?\s*(\d+)\s*分钟?)?/);
  if (joinMatch) {
    const duration = parseInt(joinMatch[3]) || 30;
    return commandHandlers.joinRoom(joinMatch[1].trim(), joinMatch[2].trim(), duration);
  }

  // 退出房间
  const leaveMatch = text.match(/(?:让|使)\s*(.+?)\s*(?:退出|离开)\s*(.+)/);
  if (leaveMatch) {
    return commandHandlers.leaveRoom(leaveMatch[1].trim(), leaveMatch[2].trim());
  }

  // 创建房间
  const createRoomMatch = text.match(/(?:让|使)\s*(.+?)\s*(?:创建|新建)\s*(?:房间)?\s*(.+)/);
  if (createRoomMatch) {
    return commandHandlers.createRoom(createRoomMatch[1].trim(), createRoomMatch[2].trim());
  }

  // 帮助
  if (/帮助|help|命令|说明/.test(text)) {
    return `🤖 配置管理助手支持的命令：

1. 查看所有助手
2. 查看 [助手名称] 配置
3. 启动 [助手名称]
4. 停止 [助手名称]
5. 重启 [助手名称]
6. 修改 [助手名称] 显示名称为 [新名称]
7. 让 [助手名称] 加入 [房间名] 聊 [时长] 分钟
8. 让 [助手名称] 退出 [房间名]
9. 让 [助手名称] 创建房间 [房间名]

💡 示例：「查看大汪配置」、「让大汪加入test-room聊30分钟」`;
  }

  return `❓ 不明白你的意思，发送「帮助」查看支持的命令`;
}

// 导出供外部调用
module.exports = {
  parseCommand,
  commandHandlers
};

// 如果直接运行
if (require.main === module) {
  // 测试
  const testMessage = process.argv[2] || '查看所有';
  parseCommand(testMessage).then(console.log).catch(console.error);
}
