import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

export default function AgentList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])

  const statusConfig = {
    running: { color: 'success', text: t('status.running'), icon: '🟢' },
    stopped: { color: 'error', text: t('status.stopped'), icon: '🔴' },
    error: { color: 'warning', text: t('status.error'), icon: '🟠' },
    configuring: { color: 'processing', text: t('status.configuring'), icon: '🟡' }
  }

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
        message.success(t('agentList.messages.startSuccess'))
        queryClient.invalidateQueries('agents')
      },
      onError: (error: Error) => { message.error(error.message) }
    }
  )

  const stopMutation = useMutation(
    (id: string) => agentsApi.stop(id),
    {
      onSuccess: () => {
        message.success(t('agentList.messages.stopSuccess'))
        queryClient.invalidateQueries('agents')
      },
      onError: (error: Error) => { message.error(error.message) }
    }
  )

  const restartMutation = useMutation(
    (id: string) => agentsApi.restart(id),
    {
      onSuccess: () => {
        message.success(t('agentList.messages.restartSuccess'))
        queryClient.invalidateQueries('agents')
      },
      onError: (error: Error) => { message.error(error.message) }
    }
  )

  const deleteMutation = useMutation(
    (id: string) => agentsApi.delete(id),
    {
      onSuccess: () => {
        message.success(t('agentList.messages.deleteSuccess'))
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
        message.success(t('agentList.messages.batchSuccess'))
        setSelectedAgents([])
        queryClient.invalidateQueries('agents')
      },
      onError: (error: Error) => { message.error(error.message) }
    }
  )

  const handleBatchOperation = (operation: 'start' | 'stop' | 'restart') => {
    if (selectedAgents.length === 0) {
      message.warning(t('agentList.messages.selectFirst'))
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
        label: t('agentList.manageConfig'),
        onClick: () => navigate(`/agents/${agent.id}`)
      },
      agent.status === 'running' ? {
        key: 'restart',
        label: t('common.restart'),
        onClick: () => restartMutation.mutate(agent.id)
      } : null,
      {
        key: 'delete',
        label: <span style={{ color: '#ff4d4f' }}>{t('common.delete')}</span>,
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
              <Text type="secondary">{t('agentList.port')}</Text>
              <Tag>{agent.port}</Tag>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">{t('agentList.channels')}</Text>
              <Space size="small">
                {agent.channels.feishu && <Tag color="blue">{t('channels.feishu')}</Tag>}
                {agent.channels.openClawChat && <Tag color="green">{t('channels.chat')}</Tag>}
              </Space>
            </div>

            {agent.currentRooms.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('agentList.rooms')}</Text>
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
                  <Text type="secondary">{t('agentList.cpu')}</Text>
                  <Text>{agent.runtimeInfo.cpu?.toFixed(1)}%</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">{t('agentList.memory')}</Text>
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
                  {t('common.stop')}
                </Button>
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={(e) => { e.stopPropagation(); restartMutation.mutate(agent.id) }}
                  loading={restartMutation.isLoading}
                >
                  {t('common.restart')}
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
                {t('common.start')}
              </Button>
            )}
            <Button
              size="small"
              icon={<SettingOutlined />}
              onClick={(e) => { e.stopPropagation(); navigate(`/agents/${agent.id}`) }}
            >
              {t('agentList.configure')}
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
          <Title level={2} style={{ marginBottom: '8px' }}>{t('agentList.title')}</Title>
          <Text type="secondary">
            {agents.length} {t('monitoring.stats.totalAgents')}，
            <span style={{ color: '#52c41a' }}> {agents.filter(a => a.status === 'running').length} {t('status.running')}</span>
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/agents/create')}>
          {t('nav.createAgent')}
        </Button>
      </div>

      {/* 批量操作栏 */}
      {selectedAgents.length > 0 && (
        <Card style={{ marginBottom: '16px', backgroundColor: '#f6ffed' }}>
          <Space>
            <span>{t('agentList.selectedCount', { count: selectedAgents.length })}</span>
            <Button size="small" onClick={() => handleBatchOperation('start')}>{t('agentList.batchStart')}</Button>
            <Button size="small" onClick={() => handleBatchOperation('stop')}>{t('agentList.batchStop')}</Button>
            <Button size="small" onClick={() => handleBatchOperation('restart')}>{t('agentList.batchRestart')}</Button>
            <Button size="small" onClick={() => setSelectedAgents([])}>{t('agentList.cancelSelection')}</Button>
          </Space>
        </Card>
      )}

      {/* 搜索栏 */}
      <Card style={{ marginBottom: '24px' }}>
        <Input
          placeholder={t('agentList.searchPlaceholder')}
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
            {searchTerm ? t('agentList.noMatch') : t('agentList.noAgents')}
          </p>
          {!searchTerm && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/agents/create')}>
              {t('agentList.createFirst')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
