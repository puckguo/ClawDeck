import { useQuery } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Card, Row, Col, Statistic, Table, Tag, Progress, Typography } from 'antd'
import {
  TeamOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ExclamationCircleOutlined, DashboardOutlined
} from '@ant-design/icons'
import { agentsApi } from '../api/agents'

const { Title } = Typography

export default function Monitoring() {
  const { t } = useTranslation()
  const { data: agentsData, isLoading } = useQuery(
    'agents',
    () => agentsApi.getAll(),
    { refetchInterval: 3000 }
  )

  const agents = agentsData?.data || []

  const runningCount = agents.filter(a => a.status === 'running').length
  const stoppedCount = agents.filter(a => a.status === 'stopped').length

  const totalMemory = agents
    .filter(a => a.status === 'running')
    .reduce((sum, a) => sum + (a.runtimeInfo?.memory || 0), 0)

  const statusConfig: Record<string, { color: string; text: string }> = {
    running: { color: 'success', text: t('status.running') },
    stopped: { color: 'error', text: t('status.stopped') },
    error: { color: 'warning', text: t('status.error') }
  }

  const columns = [
    {
      title: t('monitoring.table.agent'),
      dataIndex: 'name',
      render: (_: string, record: any) => (
        <div>
          <span style={{ fontSize: '20px', marginRight: '8px' }}>{record.emoji}</span>
          <span>{record.name}</span>
          <div style={{ fontSize: '12px', color: '#999' }}>{record.displayName}</div>
        </div>
      )
    },
    {
      title: t('monitoring.table.status'),
      dataIndex: 'status',
      render: (status: string) => {
        const c = statusConfig[status] || { color: 'default', text: status }
        return <Tag color={c.color}>{c.text}</Tag>
      }
    },
    {
      title: t('monitoring.table.port'),
      dataIndex: 'port',
      render: (port: number) => <Tag>{port}</Tag>
    },
    {
      title: t('monitoring.table.cpu'),
      dataIndex: ['runtimeInfo', 'cpu'],
      render: (cpu: number) => cpu !== undefined ? (
        <Progress percent={Number(cpu.toFixed(1))} size="small" />
      ) : '-'
    },
    {
      title: t('monitoring.table.memory'),
      dataIndex: ['runtimeInfo', 'memory'],
      render: (mem: number) => mem !== undefined ? (
        <Progress percent={Number(mem.toFixed(1))} size="small" status="active" />
      ) : '-'
    },
    {
      title: t('monitoring.table.roomCount'),
      dataIndex: 'currentRooms',
      render: (rooms: any[]) => rooms.length
    },
    {
      title: t('monitoring.table.channels'),
      dataIndex: 'channels',
      render: (channels: any) => (
        <div>
          {channels.feishu && <Tag>{t('channels.feishu')}</Tag>}
          {channels.openClawChat && <Tag>{t('channels.chat')}</Tag>}
        </div>
      )
    }
  ]

  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>
        <DashboardOutlined /> {t('monitoring.title')}
      </Title>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title={t('monitoring.stats.totalAgents')}
              value={agents.length}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title={t('monitoring.stats.running')}
              value={runningCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title={t('monitoring.stats.stopped')}
              value={stoppedCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title={t('monitoring.stats.totalMemory')}
              value={totalMemory.toFixed(1)}
              suffix="%"
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 详细列表 */}
      <Card title={t('monitoring.section.agentStatus')} loading={isLoading}>
        <Table
          dataSource={agents}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  )
}
