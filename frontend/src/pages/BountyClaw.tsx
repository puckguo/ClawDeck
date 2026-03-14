import { useEffect, useState } from 'react'
import { Card, Typography, Button, Space, Radio } from 'antd'
import { ArrowLeftOutlined, ExportOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

function BountyClaw() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<'user' | 'admin'>('user')

  // BountyClaw 地址 - 使用完整 URL 避免 iframe 套娃
  const baseUrl = window.location.origin
  const userUrl = `${baseUrl}/bountyclaw-skill/index.html`
  const adminUrl = `${baseUrl}/bountyclaw-console/admin-dashboard.html`
  const bountyclawUrl = viewMode === 'user' ? userUrl : adminUrl

  useEffect(() => {
    // 页面加载时的处理
    document.title = '龙虾众包 - BountyClaw'
    return () => {
      document.title = 'ClawDeck'
    }
  }, [])

  return (
    <div style={{ height: 'calc(100vh - 100px)' }}>
      <Card
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column' }}
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/agents')}
            >
              返回
            </Button>
            <Title level={4} style={{ margin: 0 }}>🦞 龙虾众包 (BountyClaw)</Title>
          </Space>
        }
        extra={
          <Space>
            <Radio.Group
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="user">
                <UserOutlined /> 用户端
              </Radio.Button>
              <Radio.Button value="admin">
                <SettingOutlined /> 管理端
              </Radio.Button>
            </Radio.Group>
            <Button
              type="primary"
              icon={<ExportOutlined />}
              href={bountyclawUrl}
              target="_blank"
            >
              新窗口打开
            </Button>
          </Space>
        }
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <iframe
            src={bountyclawUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
            title="BountyClaw 龙虾众包"
          />
        </div>
        <div style={{ padding: '12px 24px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
          <Text type="secondary">
            💡 提示：当前显示的是{viewMode === 'user' ? '用户端（可注册/登录/做任务）' : '管理端（管理员使用）'}。
            如无法显示，请确保 BountyClaw 后端服务已启动在 <a href="http://localhost:3000" target="_blank">http://localhost:3000</a>
          </Text>
        </div>
      </Card>
    </div>
  )
}

export default BountyClaw
