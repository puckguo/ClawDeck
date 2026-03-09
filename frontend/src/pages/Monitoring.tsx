import { useQuery } from 'react-query'
import { Card, Row, Col, Statistic, Table, Tag, Progress, Typography } from 'antd'
import {
  TeamOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ExclamationCircleOutlined, DashboardOutlined
} from '@ant-design/icons'
import { agentsApi } from '../api/agents'

const { Title } = Typography

export default function Monitoring() {
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

  const columns = [
    {
      title: 'Agent',
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
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          running: { color: 'success', text: '运行中' },
          stopped: { color: 'error', text: '已停止' },
          error: { color: 'warning', text: '异常' }
        }
        const c = config[status] || { color: 'default', text: status }
        return <Tag color={c.color}>{c.text}</Tag>
      }
    },
    {
      title: '端口',
      dataIndex: 'port',
      render: (port: number) => <Tag>{port}</Tag>
    },
    {
      title: 'CPU',
      dataIndex: ['runtimeInfo', 'cpu'],
      render: (cpu: number) => cpu !== undefined ? (
        <Progress percent={Number(cpu.toFixed(1))} size="small" />
      ) : '-'
    },
    {
      title: '内存',
      dataIndex: ['runtimeInfo', 'memory'],
      render: (mem: number) => mem !== undefined ? (
        <Progress percent={Number(mem.toFixed(1))} size="small" status="active" />
      ) : '-'
    },
    {
      title: '房间数',
      dataIndex: 'currentRooms',
      render: (rooms: any[]) => rooms.length
    },
    {
      title: '渠道',
      dataIndex: 'channels',
      render: (channels: any) => (
        <div>
          {channels.feishu && <Tag>飞书</Tag>}
          {channels.openClawChat && <Tag>Chat</Tag>}
        </div>
      )
    }
  ]

  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>
        <DashboardOutlined /> 实时监控
      </Title>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="总 Agent 数"
              value={agents.length}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="运行中"
              value={runningCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="已停止"
              value={stoppedCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="总内存占用"
              value={totalMemory.toFixed(1)}
              suffix="%"
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 详细列表 */}
      <Card title="Agent 状态详情" loading={isLoading}>
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
