import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Space,
  message,
  Input,
  Badge,
  Typography,
  Checkbox,
  Dropdown
} from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  PlusOutlined,
  SearchOutlined,
  MoreOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { agentsApi } from '../api/agents'
import type { AgentViewModel } from '../../../shared/types'

const { Text, Title } = Typography

const statusConfig = {
  running: { color: 'success', text: '运行中', icon: '🟢' },
  stopped: { color: 'error', text: '已停止', icon: '🔴' },
  error: { color: 'warning', text: '异常', icon: '🟠' },
  configuring: { color: 'processing', text: '配置中', icon: '🟡' }
}

export default function AgentList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])

  const { data: agentsData, isLoading } = useQuery(
    'agents',
    () => agentsApi.getAll(),
    { refetchInterval: 5000 }
  )

  const agents = agentsData?.data || []

  // 过滤
  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 操作 mutation
  const startMutation = useMutation(
    (id: string) => agentsApi.start(id),
    {
      onSuccess: () => {
        message.success('启动成功')
        queryClient.invalidateQueries('agents')
      },
      onError: (error: Error) => { message.error(error.message) }
    }
  )

  const stopMutation = useMutation(
    (id: string) => agentsApi.stop(id),
    {
      onSuccess: () => {
        message.success('停止成功')
        queryClient.invalidateQueries('agents')
      },
      onError: (error: Error) => { message.error(error.message) }
    }
  )

  const restartMutation = useMutation(
    (id: string) => agentsApi.restart(id),
    {
      onSuccess: () => {
        message.success('重启成功')
        queryClient.invalidateQueries('agents')
      },
      onError: (error: Error) => { message.error(error.message) }
    }
  )

  const deleteMutation = useMutation(
    (id: string) => agentsApi.delete(id),
    {
      onSuccess: () => {
        message.success('删除成功')
        queryClient.invalidateQueries('agents')
      },
      onError: (error: Error) => { message.error(error.message) }
    }
  )

  const batchMutation = useMutation(
    ({ ids, operation }: { ids: string[]; operation: 'start' | 'stop' | 'restart' }) =>
      agentsApi.batch(ids, operation),
    {
      onSuccess: () => {
        message.success('批量操作成功')
        setSelectedAgents([])
        queryClient.invalidateQueries('agents')
      },
      onError: (error: Error) => { message.error(error.message) }
    }
  )

  const handleBatchOperation = (operation: 'start' | 'stop' | 'restart') => {
    if (selectedAgents.length === 0) {
      message.warning('请先选择 Agent')
      return
    }
    batchMutation.mutate({ ids: selectedAgents, operation })
  }

  const renderAgentCard = (agent: AgentViewModel) => {
    const status = statusConfig[agent.status]
    const isSelected = selectedAgents.includes(agent.id)

    const menuItems = [
      {
        key: 'manage',
        label: '管理配置',
        onClick: () => navigate(`/agents/${agent.id}`)
      },
      agent.status === 'running' ? {
        key: 'restart',
        label: '重启',
        onClick: () => restartMutation.mutate(agent.id)
      } : null,
      {
        key: 'delete',
        label: <span style={{ color: '#ff4d4f' }}>删除</span>,
        onClick: () => deleteMutation.mutate(agent.id)
      }
    ].filter(Boolean)

    return (
      <Col xs={24} sm={12} lg={8} xl={6} key={agent.id}>
        <Card
          className="agent-card"
          hoverable
          loading={isLoading}
          title={
            <Space>
              <Checkbox
                checked={isSelected}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedAgents([...selectedAgents, agent.id])
                  } else {
                    setSelectedAgents(selectedAgents.filter(id => id !== agent.id))
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <span style={{ fontSize: '20px' }}>{agent.emoji}</span>
              <div>
                <div style={{ fontWeight: 'bold' }}>{agent.name}</div>
                <div style={{ fontSize: '12px', color: '#999' }}>{agent.displayName}</div>
              </div>
            </Space>
          }
          extra={
            <Dropdown menu={{ items: menuItems as any }} placement="bottomRight">
              <Button type="text" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
            </Dropdown>
          }
          onClick={() => navigate(`/agents/${agent.id}`)}
        >
          <div style={{ marginBottom: '16px' }}>
            <Badge status={status.color as any} text={`${status.icon} ${status.text}`} />
            {agent.runtimeInfo?.pid && (
              <Text type="secondary" style={{ marginLeft: '16px', fontSize: '12px' }}>
                PID: {agent.runtimeInfo.pid}
              </Text>
            )}
          </div>

          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">端口</Text>
              <Tag>{agent.port}</Tag>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">渠道</Text>
              <Space size="small">
                {agent.channels.feishu && <Tag color="blue">飞书</Tag>}
                {agent.channels.openClawChat && <Tag color="green">Chat</Tag>}
              </Space>
            </div>

            {agent.currentRooms.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">房间</Text>
                <Space size="small" wrap>
                  {agent.currentRooms.map(room => (
                    <Tag key={room.roomId} color="purple">{room.roomId}</Tag>
                  ))}
                </Space>
              </div>
            )}

            {agent.runtimeInfo && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">CPU</Text>
                  <Text>{agent.runtimeInfo.cpu?.toFixed(1)}%</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">内存</Text>
                  <Text>{agent.runtimeInfo.memory?.toFixed(1)}%</Text>
                </div>
              </>
            )}
          </Space>

          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            {agent.status === 'running' ? (
              <>
                <Button
                  size="small"
                  icon={<PauseCircleOutlined />}
                  onClick={(e) => { e.stopPropagation(); stopMutation.mutate(agent.id) }}
                  loading={stopMutation.isLoading}
                >
                  停止
                </Button>
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={(e) => { e.stopPropagation(); restartMutation.mutate(agent.id) }}
                  loading={restartMutation.isLoading}
                >
                  重启
                </Button>
              </>
            ) : (
              <Button
                type="primary"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={(e) => { e.stopPropagation(); startMutation.mutate(agent.id) }}
                loading={startMutation.isLoading}
              >
                启动
              </Button>
            )}
            <Button
              size="small"
              icon={<SettingOutlined />}
              onClick={(e) => { e.stopPropagation(); navigate(`/agents/${agent.id}`) }}
            >
              配置
            </Button>
          </div>
        </Card>
      </Col>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ marginBottom: '8px' }}>Agent 管理</Title>
          <Text type="secondary">
            共 {agents.length} 个 Agent，
            <span style={{ color: '#52c41a' }}> {agents.filter(a => a.status === 'running').length} 个运行中</span>
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/agents/create')}>
          创建 Agent
        </Button>
      </div>

      {/* 批量操作栏 */}
      {selectedAgents.length > 0 && (
        <Card style={{ marginBottom: '16px', backgroundColor: '#f6ffed' }}>
          <Space>
            <span>已选择 {selectedAgents.length} 个 Agent</span>
            <Button size="small" onClick={() => handleBatchOperation('start')}>批量启动</Button>
            <Button size="small" onClick={() => handleBatchOperation('stop')}>批量停止</Button>
            <Button size="small" onClick={() => handleBatchOperation('restart')}>批量重启</Button>
            <Button size="small" onClick={() => setSelectedAgents([])}>取消选择</Button>
          </Space>
        </Card>
      )}

      {/* 搜索栏 */}
      <Card style={{ marginBottom: '24px' }}>
        <Input
          placeholder="搜索 Agent 名称或显示名称"
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
      </Card>

      {/* Agent 列表 */}
      <Row gutter={[16, 16]}>
        {filteredAgents.map(renderAgentCard)}
      </Row>

      {filteredAgents.length === 0 && !isLoading && (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
          <p style={{ marginTop: '16px', color: '#999' }}>
            {searchTerm ? '没有找到匹配的 Agent' : '还没有创建任何 Agent'}
          </p>
          {!searchTerm && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/agents/create')}>
              创建第一个 Agent
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
