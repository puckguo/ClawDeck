import { useState } from 'react'
import { Card, Form, Input, Button, message, Switch, Alert, Typography } from 'antd'
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons'

const { Title, Paragraph } = Typography

export default function Settings() {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const handleSave = async (values: any) => {
    setSaving(true)
    try {
      // 保存设置到 localStorage
      localStorage.setItem('agent-config-settings', JSON.stringify(values))
      message.success('设置已保存')
    } catch (error) {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>系统设置</Title>

      <Card title="基本设置" style={{ marginBottom: '24px' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            openclawRoot: '/Users/godspeed/.openclaw',
            autoRefresh: true,
            refreshInterval: 5
          }}
        >
          <Form.Item
            name="openclawRoot"
            label="OpenClaw 根目录"
            rules={[{ required: true, message: '请输入根目录路径' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="autoRefresh" valuePropName="checked" label="自动刷新">
            <Switch />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
              保存设置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="关于" style={{ marginBottom: '24px' }}>
        <Paragraph>
          <strong>ClawDeck</strong> - OpenClaw Agent 配置管理
        </Paragraph>
        <Paragraph>
          版本: 1.0.0
        </Paragraph>
        <Paragraph>
          用于管理 OpenClaw 多 Agent 系统的 Web 界面，支持：
        </Paragraph>
        <ul>
          <li>Agent 创建、编辑、删除</li>
          <li>配置版本管理</li>
          <li>批量操作</li>
          <li>实时监控</li>
          <li>飞书集成</li>
        </ul>
      </Card>

      <Alert
        message="危险区域"
        description="以下操作可能影响系统正常运行，请谨慎操作。"
        type="warning"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <Card title="数据管理">
        <Button danger style={{ marginRight: '8px' }}>
          清除所有缓存
        </Button>
        <Button icon={<ReloadOutlined />}>
          重新扫描 Agent
        </Button>
      </Card>
    </div>
  )
}
