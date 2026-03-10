import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from 'react-query'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      // Use default config
      message.warning(t('agentCreate.messages.defaultAIError'))
    }
  })

  const createMutation = useMutation(
    (values: any) => agentsApi.create(values),
    {
      onSuccess: (data) => {
        message.success(t('agentCreate.messages.createSuccess', { name: data.data?.name }))
        navigate('/agents')
      },
      onError: (error: Error) => { message.error(error.message) }
    }
  )

  const steps = [
    {
      title: t('agentCreate.steps.basic'),
      icon: <UserOutlined />,
      content: (
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(_, values) => setFormData({ ...formData, ...values })}
        >
          <Form.Item
            name="name"
            label={t('agentCreate.labels.agentName')}
            rules={[{ required: true, message: t('agentCreate.labels.enterName') }]}
            tooltip={t('agentCreate.labels.nameHint')}
          >
            <Input placeholder={t('agentCreate.labels.nameHint')} />
          </Form.Item>

          <Form.Item
            name="displayName"
            label={t('agentCreate.labels.displayName')}
            rules={[{ required: true, message: t('agentCreate.labels.enterDisplayName') }]}
            tooltip={t('agentCreate.labels.nameInChat')}
          >
            <Input placeholder={t('agentCreate.labels.nameInChat')} />
          </Form.Item>

          <Form.Item name="emoji" label={t('agentCreate.labels.selectAvatar')} initialValue="🐕">
            <Radio.Group optionType="button" buttonStyle="solid">
              {emojis.map(emoji => (
                <Radio.Button key={emoji} value={emoji} style={{ fontSize: '20px' }}>
                  {emoji}
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>

          <Form.Item name="role" label={t('agentCreate.labels.roleDesc')}>
            <Input.TextArea
              rows={3}
              placeholder={t('agentCreate.labels.descHint')}
            />
          </Form.Item>

          <Card title="🤖 AI Configuration" style={{ marginTop: '16px' }} loading={defaultAIQuery.isLoading}>
            <Alert
              message="Auto-loaded openclaw config"
              description={defaultAIQuery.data?.data ? (
                <span>Using <Tag color="blue">{defaultAIQuery.data.data.provider}</Tag> {defaultAIQuery.data.data.model}</span>
              ) : 'Using default config'}
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
              label="Model"
            >
              <Input placeholder="e.g.: deepseek-chat, gpt-4, claude-3-opus" />
            </Form.Item>

            <Form.Item
              name={['ai', 'apiKey']}
              label="API Key"
              rules={[{ required: true, message: 'Please enter API Key' }]}
            >
              <Input.Password placeholder="sk-xxxxxxxxxxxxxxxx" />
            </Form.Item>

            <Form.Item
              name={['ai', 'baseUrl']}
              label="Base URL (Optional)"
            >
              <Input placeholder="https://api.deepseek.com/v1" />
            </Form.Item>

            <Alert
              message="Configuration Help"
              description={
                <div>
                  <p>💡 <strong>Kimi Users:</strong> Use kimi-coding as Provider, model: k2p5</p>
                  <p>📖 See CONFIG_GUIDE.md in project root for details</p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />

            <Alert
              message="API Key Security"
              description="API Key will be saved in Agent directory .env file"
              type="warning"
              showIcon
            />
          </Card>
        </Form>
      )
    },
    {
      title: t('agentCreate.steps.channels'),
      icon: <SettingOutlined />,
      content: (
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(_, values) => setFormData({ ...formData, ...values })}
        >
          <Card title={`💬 ${t('agentCreate.labels.feishu')}`} style={{ marginBottom: '16px' }}>
            <Form.Item name={['feishu', 'enabled']} valuePropName="checked">
              <Checkbox>{t('agentCreate.labels.enableFeishu')}</Checkbox>
            </Form.Item>

            <Form.Item name={['feishu', 'appId']} label={t('agentCreate.labels.appId')}>
              <Input placeholder={t('agentCreate.labels.appIdPlaceholder')} />
            </Form.Item>

            <Form.Item name={['feishu', 'appSecret']} label={t('agentCreate.labels.appSecret')}>
              <Input.Password />
            </Form.Item>

            <Alert
              message={t('agentCreate.labels.feishuGuide')}
              description={
                <div>
                  <p>1. {t('agentCreate.labels.feishuStep1')}</p>
                  <p>2. <strong>{t('common.important')}:</strong> {t('agentCreate.labels.feishuStep2')}</p>
                  <p>3. {t('agentCreate.labels.feishuStep3')}</p>
                  <p>4. {t('agentCreate.labels.feishuStep4')}</p>
                </div>
              }
              type="info"
              showIcon
            />
          </Card>

          <Card title="💬 Open-ClawChat">
            <Form.Item name={['openClawChat', 'enabled']} valuePropName="checked" initialValue={true}>
              <Checkbox>{t('agentCreate.labels.enableChat')}</Checkbox>
            </Form.Item>

            <Form.Item
              name={['openClawChat', 'serverUrl']}
              label={t('agentCreate.labels.serverUrl')}
              initialValue="http://47.97.86.239:3002"
            >
              <Input />
            </Form.Item>
          </Card>
        </Form>
      )
    },
    {
      title: t('agentCreate.steps.skills'),
      icon: <ToolOutlined />,
      content: (
        <div>
          <Paragraph>{t('agentCreate.labels.selectSkills')}</Paragraph>

          <Card
            size="small"
            title={<Space><CheckCircleOutlined /> <span>{t('agentCreate.skills.roomManager')}</span></Space>}
            style={{ marginBottom: '8px' }}
          >
            <Text type="secondary">{t('agentCreate.skills.roomManagerDesc')}</Text>
          </Card>

          <Card
            size="small"
            title={<Space><CheckCircleOutlined /> <span>{t('agentCreate.skills.smartCommands')}</span></Space>}
            style={{ marginBottom: '8px' }}
          >
            <Text type="secondary">{t('agentCreate.skills.smartCommandsDesc')}</Text>
          </Card>

          <Card
            size="small"
            title={<Space><CheckCircleOutlined /> <span>{t('agentCreate.skills.heartbeat')}</span></Space>}
          >
            <Text type="secondary">{t('agentCreate.skills.heartbeatDesc')}</Text>
          </Card>

          <Alert
            style={{ marginTop: '16px' }}
            message={t('agentCreate.labels.coreSkillsNote')}
            type="info"
            showIcon
          />
        </div>
      )
    },
    {
      title: t('agentCreate.steps.confirm'),
      icon: <RocketOutlined />,
      content: (
        <div>
          <Title level={4}>📋 {t('agentCreate.labels.summary')}</Title>

          <Descriptions bordered column={1}>
            <Descriptions.Item label={t('agentCreate.labels.agentName')}>{formData.name}</Descriptions.Item>
            <Descriptions.Item label={t('agentCreate.labels.displayName')}>{formData.displayName}</Descriptions.Item>
            <Descriptions.Item label={t('agentCreate.labels.selectAvatar')}>{formData.emoji}</Descriptions.Item>
            <Descriptions.Item label="AI Provider">
              {formData.ai?.provider ? <Tag color="blue">{formData.ai.provider}</Tag> : <Tag color="blue">deepseek</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label={t('agentCreate.labels.model')}>{formData.ai?.model || 'deepseek-chat'}</Descriptions.Item>
            <Descriptions.Item label={t('agentCreate.labels.feishuStatus')}>
              {formData.feishu?.enabled ? <Tag color="green">{t('common.enabled')}</Tag> : <Tag>{t('common.disabled')}</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Open-ClawChat">
              {formData.openClawChat?.enabled !== false ? <Tag color="green">{t('common.enabled')}</Tag> : <Tag>{t('common.disabled')}</Tag>}
            </Descriptions.Item>
          </Descriptions>

          <Alert
            style={{ marginTop: '16px' }}
            message={t('agentCreate.labels.autoConfig')}
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
        // Validation failed
      }
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const prev = () => {
    setCurrentStep(currentStep - 1)
  }

  const submit = () => {
    // Use formData state (accumulated via onValuesChange from all steps)
    // instead of form.getFieldsValue() (only returns currently rendered fields)
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
      autoStart: true  // Auto-start after creation
    }
    createMutation.mutate(values)
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/agents')}>
          {t('common.back')}
        </Button>
      </div>

      <Title level={2} style={{ marginBottom: '24px' }}>{t('agentCreate.title')}</Title>

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
          {t('common.prev')}
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button type="primary" onClick={next}>
            {t('common.next')}
          </Button>
        ) : (
          <Button
            type="primary"
            icon={<RocketOutlined />}
            onClick={submit}
            loading={createMutation.isLoading}
          >
            {t('agentCreate.buttons.createAndStart')}
          </Button>
        )}
      </div>
    </div>
  )
}
