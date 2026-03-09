import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from 'react-query'
import {
  Card, Steps, Form, Input, Button, message,
  Space, Typography, Radio, Alert, Descriptions, Tag, Checkbox
} from 'antd'
import {
  ArrowLeftOutlined, CheckCircleOutlined, RocketOutlined,
  SettingOutlined, ToolOutlined, UserOutlined
} from '@ant-design/icons'
import { agentsApi } from '../api/agents'

const { Title, Text, Paragraph } = Typography
const { Step } = Steps

const emojis = ['🐕', '🐱', '🦊', '🐼', '🦁', '🐰', '🐯', '🐨', '🐷', '🐸']

const aiProviders = [
  { value: 'deepseek', label: 'DeepSeek', defaultModel: 'deepseek-chat', baseUrl: 'https://api.deepseek.com/v1' },
  { value: 'openai', label: 'OpenAI', defaultModel: 'gpt-4', baseUrl: 'https://api.openai.com/v1' },
  { value: 'anthropic', label: 'Anthropic', defaultModel: 'claude-3-opus-20240229', baseUrl: 'https://api.anthropic.com' },
  { value: 'kimi-coding', label: 'Kimi (Coding)', defaultModel: 'k2p5', baseUrl: 'https://api.kimi.com/coding/' },
  { value: 'google', label: 'Google (Gemini)', defaultModel: 'gemini-pro', baseUrl: 'https://generativelanguage.googleapis.com' },
  { value: 'moonshot', label: 'Moonshot', defaultModel: 'moonshot-v1-8k', baseUrl: 'https://api.moonshot.cn/v1' },
]

export default function AgentCreate() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [form] = Form.useForm()
  const [formData, setFormData] = useState<any>({})

  // 获取默认 AI 配置
  const defaultAIQuery = useQuery('defaultAI', () => agentsApi.getDefaultAI(), {
    onSuccess: (data) => {
      const ai = data.data
      if (ai) {
        setFormData((prev: any) => ({
          ...prev,
          ai: {
            provider: ai.provider,
            model: ai.model,
            apiKey: ai.apiKey || '',
            baseUrl: ai.baseUrl || ''
          }
        }))
        // 设置表单字段值
        form.setFieldsValue({
          ai: {
            provider: ai.provider,
            model: ai.model,
            apiKey: ai.apiKey || '',
            baseUrl: ai.baseUrl || ''
          }
        })
      }
    },
    onError: () => {
      // 使用默认配置
      message.warning('无法读取默认 AI 配置，使用内置默认值')
    }
  })

  const createMutation = useMutation(
    (values: any) => agentsApi.create(values),
    {
      onSuccess: (data) => {
        message.success(`Agent ${data.data?.name} 创建成功`)
        navigate('/agents')
      },
      onError: (error: Error) => { message.error(error.message) }
    }
  )

  const steps = [
    {
      title: '基础信息',
      icon: <UserOutlined />,
      content: (
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(_, values) => setFormData({ ...formData, ...values })}
        >
          <Form.Item
            name="name"
            label="助手名称"
            rules={[{ required: true, message: '请输入助手名称' }]}
            tooltip="用于内部标识，建议使用英文"
          >
            <Input placeholder="例如：客服助手、销售专家" />
          </Form.Item>

          <Form.Item
            name="displayName"
            label="显示名称"
            rules={[{ required: true, message: '请输入显示名称' }]}
            tooltip="在聊天室中显示的名字"
          >
            <Input placeholder="例如：小明、王经理" />
          </Form.Item>

          <Form.Item name="emoji" label="选择形象" initialValue="🐕">
            <Radio.Group optionType="button" buttonStyle="solid">
              {emojis.map(emoji => (
                <Radio.Button key={emoji} value={emoji} style={{ fontSize: '20px' }}>
                  {emoji}
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>

          <Form.Item name="role" label="角色描述">
            <Input.TextArea
              rows={3}
              placeholder="描述这个助手的职责和特点..."
            />
          </Form.Item>

          <Card title="🤖 AI 模型配置" style={{ marginTop: '16px' }} loading={defaultAIQuery.isLoading}>
            <Alert
              message="已自动读取 openclaw 项目配置"
              description={defaultAIQuery.data?.data ? (
                <span>使用 <Tag color="blue">{defaultAIQuery.data.data.provider}</Tag> {defaultAIQuery.data.data.model}</span>
              ) : '使用默认配置'}
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />

            <Form.Item
              name={['ai', 'provider']}
              label="AI Provider"
            >
              <Radio.Group optionType="button" buttonStyle="solid">
                {aiProviders.map(p => (
                  <Radio.Button key={p.value} value={p.value}>{p.label}</Radio.Button>
                ))}
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name={['ai', 'model']}
              label="模型"
            >
              <Input placeholder="例如：deepseek-chat, gpt-4, claude-3-opus" />
            </Form.Item>

            <Form.Item
              name={['ai', 'apiKey']}
              label="API Key"
              rules={[{ required: true, message: '请输入 API Key' }]}
            >
              <Input.Password placeholder="sk-xxxxxxxxxxxxxxxx" />
            </Form.Item>

            <Form.Item
              name={['ai', 'baseUrl']}
              label="Base URL (可选)"
            >
              <Input placeholder="https://api.deepseek.com/v1" />
            </Form.Item>

            <Alert
              message="API Key 安全提示"
              description="API Key 将保存在 Agent 目录的 .env 文件中，请妥善保管"
              type="info"
              showIcon
            />
          </Card>
        </Form>
      )
    },
    {
      title: '消息渠道',
      icon: <SettingOutlined />,
      content: (
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(_, values) => setFormData({ ...formData, ...values })}
        >
          <Card title="💬 飞书（Lark）" style={{ marginBottom: '16px' }}>
            <Form.Item name={['feishu', 'enabled']} valuePropName="checked">
              <Checkbox>启用飞书连接</Checkbox>
            </Form.Item>

            <Form.Item name={['feishu', 'appId']} label="应用ID">
              <Input placeholder="cli_xxxxxxxxxxxxxxxx" />
            </Form.Item>

            <Form.Item name={['feishu', 'appSecret']} label="应用密钥">
              <Input.Password />
            </Form.Item>

            <Alert
              message="如何获取飞书凭证？"
              description="在飞书开放平台创建应用，获取 AppID 和 AppSecret"
              type="info"
              showIcon
            />
          </Card>

          <Card title="💬 Open-ClawChat">
            <Form.Item name={['openClawChat', 'enabled']} valuePropName="checked" initialValue={true}>
              <Checkbox>启用聊天室功能</Checkbox>
            </Form.Item>

            <Form.Item
              name={['openClawChat', 'serverUrl']}
              label="服务器地址"
              initialValue="http://47.97.86.239:3002"
            >
              <Input />
            </Form.Item>
          </Card>
        </Form>
      )
    },
    {
      title: '配置技能',
      icon: <ToolOutlined />,
      content: (
        <div>
          <Paragraph>选择要安装的技能：</Paragraph>

          <Card
            size="small"
            title={<Space><CheckCircleOutlined /> <span>房间管理</span></Space>}
            style={{ marginBottom: '8px' }}
          >
            <Text type="secondary">创建/加入/退出聊天室，支持 Owner 身份创建问题和密码</Text>
          </Card>

          <Card
            size="small"
            title={<Space><CheckCircleOutlined /> <span>智能命令</span></Space>}
            style={{ marginBottom: '8px' }}
          >
            <Text type="secondary">自然语言解析和执行命令</Text>
          </Card>

          <Card
            size="small"
            title={<Space><CheckCircleOutlined /> <span>心跳检测</span></Space>}
          >
            <Text type="secondary">自动管理在线时长，超时自动退出</Text>
          </Card>

          <Alert
            style={{ marginTop: '16px' }}
            message="默认已安装核心技能，创建后可以在配置页面管理更多技能"
            type="info"
            showIcon
          />
        </div>
      )
    },
    {
      title: '确认启动',
      icon: <RocketOutlined />,
      content: (
        <div>
          <Title level={4}>📋 配置摘要</Title>

          <Descriptions bordered column={1}>
            <Descriptions.Item label="助手名称">{formData.name}</Descriptions.Item>
            <Descriptions.Item label="显示名称">{formData.displayName}</Descriptions.Item>
            <Descriptions.Item label="形象">{formData.emoji}</Descriptions.Item>
            <Descriptions.Item label="AI Provider">
              {formData.ai?.provider ? <Tag color="blue">{formData.ai.provider}</Tag> : <Tag color="blue">deepseek</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="模型">{formData.ai?.model || 'deepseek-chat'}</Descriptions.Item>
            <Descriptions.Item label="飞书连接">
              {formData.feishu?.enabled ? <Tag color="green">已启用</Tag> : <Tag>未启用</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Open-ClawChat">
              {formData.openClawChat?.enabled !== false ? <Tag color="green">已启用</Tag> : <Tag>未启用</Tag>}
            </Descriptions.Item>
          </Descriptions>

          <Alert
            style={{ marginTop: '16px' }}
            message="创建后将自动生成配置文件并分配服务端口"
            type="warning"
            showIcon
          />
        </div>
      )
    }
  ]

  const next = async () => {
    if (currentStep === 0) {
      try {
        await form.validateFields(['name', 'displayName'])
        setCurrentStep(currentStep + 1)
      } catch {
        // 验证失败
      }
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const prev = () => {
    setCurrentStep(currentStep - 1)
  }

  const submit = () => {
    // 使用 formData 状态（包含了所有步骤通过 onValuesChange 累积的数据）
    // 而不是 form.getFieldsValue()（只返回当前渲染的字段）
    const values = {
      name: formData.name,
      displayName: formData.displayName,
      emoji: formData.emoji || '🐕',
      role: formData.role,
      ai: formData.ai || defaultAIQuery.data?.data || {
        provider: 'deepseek',
        model: 'deepseek-chat',
        apiKey: '',
        baseUrl: 'https://api.deepseek.com/v1'
      },
      feishu: formData.feishu,
      openClawChat: formData.openClawChat,
      skills: formData.skills,
      autoStart: true  // 创建后自动启动
    }
    createMutation.mutate(values)
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/agents')}>
          返回
        </Button>
      </div>

      <Title level={2} style={{ marginBottom: '24px' }}>创建你的 AI 助手</Title>

      <Steps current={currentStep} style={{ marginBottom: '32px' }}>
        {steps.map(step => (
          <Step key={step.title} title={step.title} icon={step.icon} />
        ))}
      </Steps>

      <Card style={{ minHeight: '400px' }}>
        {steps[currentStep].content}
      </Card>

      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
        <Button disabled={currentStep === 0} onClick={prev}>
          上一步
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button type="primary" onClick={next}>
            下一步
          </Button>
        ) : (
          <Button
            type="primary"
            icon={<RocketOutlined />}
            onClick={submit}
            loading={createMutation.isLoading}
          >
            创建并启动
          </Button>
        )}
      </div>
    </div>
  )
}
