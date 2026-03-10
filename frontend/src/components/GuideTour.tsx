import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Button, Steps, Typography, Space, Tag, Tooltip } from 'antd'
import {
  UserOutlined,
  SettingOutlined,
  MessageOutlined,
  ToolOutlined,
  FileMarkdownOutlined,
  HistoryOutlined,
  RocketOutlined,
  QuestionCircleOutlined,
  EditOutlined
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

interface FileItem {
  name: string
  displayName: string
  description: string
  source: 'agent' | 'workspace'
  color: string
}

interface GuideStep {
  title: string
  icon: React.ReactNode
  content: React.ReactNode
}

interface GuideTourProps {
  visible: boolean
  onClose: () => void
  onFileSelect?: (fileName: string, source: 'agent' | 'workspace') => void
}

// Clickable file list
const configFiles: FileItem[] = [
  { name: 'SOUL.md', displayName: '性格设定', description: '定义性格、语气、行为风格', source: 'workspace', color: 'purple' },
  { name: 'IDENTITY.md', displayName: '身份信息', description: '名称、身份、背景故事', source: 'workspace', color: 'cyan' },
  { name: 'AGENTS.md', displayName: '代理配置', description: '子代理定义和分工', source: 'workspace', color: 'orange' },
  { name: 'TOOLS.md', displayName: '工具配置', description: '可用工具定义', source: 'workspace', color: 'magenta' },
  { name: 'memory.md', displayName: '长期记忆', description: '持久化记忆存储', source: 'agent', color: 'gold' },
]

export default function GuideTour({ visible, onClose, onFileSelect }: GuideTourProps) {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)

  const handleFileClick = (file: FileItem) => {
    if (onFileSelect) {
      onFileSelect(file.name, file.source)
    }
  }

  const getGuideSteps = (): GuideStep[] => [
    {
      title: t('guideTour.welcome.title'),
      icon: <RocketOutlined />,
      content: (
        <div>
          <Paragraph>
            {t('guideTour.welcome.description')}
          </Paragraph>
          <ul>
            {(t('guideTour.welcome.features', { returnObjects: true }) as string[]).map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
          <Paragraph type="secondary">
            {t('guideTour.welcome.hint')}
          </Paragraph>
        </div>
      )
    },
    {
      title: t('guideTour.steps.overview.title'),
      icon: <UserOutlined />,
      content: (
        <div>
          <Paragraph>
            <strong>{t('guideTour.steps.overview.title')}</strong>{t('guideTour.steps.overview.description')}
          </Paragraph>
          <ul>
            {(t('guideTour.steps.overview.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <Paragraph type="secondary">
            {t('guideTour.steps.overview.hint')}
          </Paragraph>
        </div>
      )
    },
    {
      title: t('guideTour.steps.basic.title'),
      icon: <SettingOutlined />,
      content: (
        <div>
          <Paragraph>
            <strong>{t('guideTour.steps.basic.title')}</strong>{t('guideTour.steps.basic.description')}
          </Paragraph>
          <ul>
            {(t('guideTour.steps.basic.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <Paragraph type="secondary">
            {t('guideTour.steps.basic.hint')}
          </Paragraph>
        </div>
      )
    },
    {
      title: t('guideTour.steps.channels.title'),
      icon: <MessageOutlined />,
      content: (
        <div>
          <Paragraph>
            <strong>{t('guideTour.steps.channels.title')}</strong>{t('guideTour.steps.channels.description')}
          </Paragraph>
          <ul>
            <li>
              <Tag color="blue">{t('channels.feishu')}</Tag>
              <ul>
                {(t('guideTour.steps.channels.feishu.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </li>
            <li>
              <Tag color="purple">Open-ClawChat</Tag>
              <ul>
                {(t('guideTour.steps.channels.chat.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </li>
          </ul>
        </div>
      )
    },
    {
      title: t('guideTour.steps.files.title'),
      icon: <FileMarkdownOutlined />,
      content: (
        <div>
          <Paragraph>
            <strong>{t('guideTour.steps.files.title')}</strong>{t('guideTour.steps.files.description')}
          </Paragraph>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {configFiles.map(file => (
              <div
                key={file.name}
                onClick={() => handleFileClick(file)}
                style={{
                  padding: '12px',
                  background: '#fff',
                  border: '1px solid #d9d9d9',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#1890ff'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(24,144,255,0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d9d9d9'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <Space>
                  <EditOutlined style={{ color: '#1890ff' }} />
                  <div>
                    <div>
                      <Tag color={file.color}>{file.displayName}</Tag>
                      <Text type="secondary" style={{ fontSize: '12px', marginLeft: '4px' }}>
                        {file.name}
                      </Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {file.description}
                    </Text>
                    <div>
                      <Tag style={{ fontSize: '10px', padding: '0 4px', height: 'auto', lineHeight: '16px' }}>
                        {file.source}
                      </Tag>
                    </div>
                  </div>
                </Space>
              </div>
            ))}
          </div>
          <Paragraph type="secondary">
            <strong>{t('guideTour.steps.files.backup')}</strong>
          </Paragraph>
        </div>
      )
    },
    {
      title: t('guideTour.steps.logs.title'),
      icon: <HistoryOutlined />,
      content: (
        <div>
          <Paragraph>
            <strong>{t('guideTour.steps.logs.title')}</strong>{t('guideTour.steps.logs.description')}
          </Paragraph>
          <ul>
            {(t('guideTour.steps.logs.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <Paragraph type="secondary">
            {t('guideTour.steps.logs.hint')}
          </Paragraph>
        </div>
      )
    },
    {
      title: t('guideTour.steps.actions.title'),
      icon: <ToolOutlined />,
      content: (
        <div>
          <Paragraph>
            <strong>{t('guideTour.steps.actions.title')}</strong>{t('guideTour.steps.actions.description')}
          </Paragraph>
          <ul>
            {(t('guideTour.steps.actions.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <Paragraph type="secondary">
            {t('guideTour.steps.actions.hint')}
          </Paragraph>
        </div>
      )
    },
    {
      title: t('guideTour.steps.finish.title'),
      icon: <QuestionCircleOutlined />,
      content: (
        <div>
          <Title level={4}>🎉 {t('guideTour.steps.finish.congrats')}</Title>
          <Paragraph>
            {t('guideTour.steps.finish.description')}
          </Paragraph>
          <Paragraph>
            <strong>{t('guideTour.steps.finish.nextStepsTitle')}</strong>
          </Paragraph>
          <ul>
            {(t('guideTour.steps.finish.nextSteps', { returnObjects: true }) as string[]).map((item: string, index: number) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <Paragraph type="secondary">
            {t('guideTour.steps.finish.hint')}
          </Paragraph>
        </div>
      )
    }
  ]

  const guideSteps = getGuideSteps()

  const handleNext = () => {
    if (currentStep < guideSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleClose = () => {
    setCurrentStep(0)
    onClose()
  }

  const step = guideSteps[currentStep]

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={handleClose}
      width={900}
      footer={null}
      closable={true}
      maskClosable={true}
      style={{ maxWidth: '95vw' }}
    >
      <div style={{ padding: '20px 0' }}>
        <Steps
          current={currentStep}
          onChange={setCurrentStep}
          items={guideSteps.map(s => ({
            title: (
              <Tooltip title={s.title}>
                <span style={{
                  display: 'inline-block',
                  maxWidth: '80px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {s.title}
                </span>
              </Tooltip>
            ),
            icon: s.icon
          }))}
          size="small"
          direction="horizontal"
          style={{
            marginBottom: '30px',
            overflowX: 'auto',
            overflowY: 'hidden',
            paddingBottom: '10px'
          }}
        />

        <div style={{ minHeight: '300px', padding: '0 10px' }}>
          <Space align="start" size="middle" style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '48px',
              color: '#1890ff',
              background: '#f0f5ff',
              padding: '20px',
              borderRadius: '12px'
            }}>
              {step.icon}
            </div>
            <div>
              <Title level={3} style={{ margin: '0 0 8px 0' }}>
                {step.title}
              </Title>
              <Text type="secondary">
                {t('guideTour.buttons.step')} {currentStep + 1} / {guideSteps.length}
              </Text>
            </div>
          </Space>

          <div style={{
            background: '#fafafa',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #f0f0f0'
          }}>
            {step.content}
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '1px solid #f0f0f0'
        }}>
          <Button
            onClick={handlePrev}
            disabled={currentStep === 0}
            size="large"
          >
            {t('common.prev')}
          </Button>

          <Space>
            {currentStep < guideSteps.length - 1 ? (
              <Button onClick={handleClose} size="large">
                {t('guideTour.buttons.skip')}
              </Button>
            ) : null}
            <Button
              type="primary"
              onClick={handleNext}
              size="large"
            >
              {currentStep === guideSteps.length - 1 ? t('guideTour.buttons.finish') : t('common.next')}
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  )
}
