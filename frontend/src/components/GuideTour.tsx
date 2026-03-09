import { useState } from 'react'
import { Modal, Button, Steps, Typography, Space, Tag } from 'antd'
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

// 可点击的文件列表
const configFiles: FileItem[] = [
  { name: 'SOUL.md', displayName: '性格设定', description: '定义性格、语气、行为风格', source: 'workspace', color: 'purple' },
  { name: 'IDENTITY.md', displayName: '身份信息', description: '名称、身份、背景故事', source: 'workspace', color: 'cyan' },
  { name: 'AGENTS.md', displayName: '代理配置', description: '子代理定义和分工', source: 'workspace', color: 'orange' },
  { name: 'TOOLS.md', displayName: '工具配置', description: '可用工具定义', source: 'workspace', color: 'magenta' },
  { name: 'memory.md', displayName: '长期记忆', description: '持久化记忆存储', source: 'agent', color: 'gold' },
]

export default function GuideTour({ visible, onClose, onFileSelect }: GuideTourProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const handleFileClick = (file: FileItem) => {
    if (onFileSelect) {
      onFileSelect(file.name, file.source)
    }
  }

  const getGuideSteps = (): GuideStep[] => [
    {
      title: '欢迎使用 Agent 配置管理',
      icon: <RocketOutlined />,
      content: (
        <div>
          <Paragraph>
            这是一个用于管理 OpenClaw Agent 的 Web 界面。您可以在这里：
          </Paragraph>
          <ul>
            <li>查看和管理所有 Agent 的状态</li>
            <li>编辑 Agent 的核心配置文件（SOUL.md、IDENTITY.md 等）</li>
            <li>配置渠道（飞书、Open-ClawChat）</li>
            <li>查看运行日志</li>
            <li>管理技能和工作空间</li>
          </ul>
          <Paragraph type="secondary">
            点击"下一步"开始了解各个功能模块。
          </Paragraph>
        </div>
      )
    },
    {
      title: '概览面板',
      icon: <UserOutlined />,
      content: (
        <div>
          <Paragraph>
            <strong>概览面板</strong>显示 Agent 的核心信息：
          </Paragraph>
          <ul>
            <li><Tag color="blue">基本信息</Tag>：助手ID、名称、服务端口等</li>
            <li><Tag color="green">运行状态</Tag>：实时显示 CPU/内存使用率、运行时长</li>
            <li><Tag color="purple">渠道配置</Tag>：飞书、Open-ClawChat 启用状态</li>
            <li><Tag color="orange">统计信息</Tag>：已安装技能数、当前房间数、配置文件数</li>
          </ul>
          <Paragraph type="secondary">
            状态每 5 秒自动刷新，确保您看到最新的运行数据。
          </Paragraph>
        </div>
      )
    },
    {
      title: '基础配置',
      icon: <SettingOutlined />,
      content: (
        <div>
          <Paragraph>
            <strong>基础配置</strong>用于设置 Agent 的基本属性：
          </Paragraph>
          <ul>
            <li><strong>助手名称</strong>：内部使用的标识名称</li>
            <li><strong>显示名称</strong>：在聊天室中对外展示的名字</li>
            <li><strong>形象标识</strong>：选择emoji作为头像（🐕 🐱 🦊 等）</li>
          </ul>
          <Paragraph type="secondary">
            注意：助手ID创建后不可修改，这是 Agent 的唯一标识。
          </Paragraph>
        </div>
      )
    },
    {
      title: '渠道配置',
      icon: <MessageOutlined />,
      content: (
        <div>
          <Paragraph>
            <strong>渠道配置</strong>管理 Agent 与外界的通信方式：
          </Paragraph>
          <ul>
            <li>
              <Tag color="blue">飞书</Tag>
              <ul>
                <li>配置 AppID 和 AppSecret</li>
                <li>启用/禁用飞书机器人</li>
                <li>支持群聊和私聊</li>
              </ul>
            </li>
            <li>
              <Tag color="purple">Open-ClawChat</Tag>
              <ul>
                <li>配置服务器地址</li>
                <li>设置 Agent 显示名称</li>
                <li>管理加入的聊天室</li>
              </ul>
            </li>
          </ul>
        </div>
      )
    },
    {
      title: '配置文件管理',
      icon: <FileMarkdownOutlined />,
      content: (
        <div>
          <Paragraph>
            <strong>配置文件</strong>是 Agent 的核心，点击下列文件可直接编辑：
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
            <strong>自动备份</strong>：每次修改文件时，系统会自动创建备份到 .backups/ 目录。
          </Paragraph>
        </div>
      )
    },
    {
      title: '运行日志',
      icon: <HistoryOutlined />,
      content: (
        <div>
          <Paragraph>
            <strong>运行日志</strong>帮助您监控 Agent 的运行状况：
          </Paragraph>
          <ul>
            <li><strong>日志级别</strong>：调试 / 信息 / 警告 / 错误</li>
            <li><strong>日志类型</strong>：系统 / 聊天 / 错误 / 审计</li>
            <li><strong>搜索过滤</strong>：快速定位感兴趣的日志</li>
            <li><strong>自动刷新</strong>：实时查看最新日志</li>
            <li><strong>导出功能</strong>：导出日志用于分析</li>
          </ul>
          <Paragraph type="secondary">
            日志以时间线形式展示，最新的日志在最上方。
          </Paragraph>
        </div>
      )
    },
    {
      title: '快速操作',
      icon: <ToolOutlined />,
      content: (
        <div>
          <Paragraph>
            <strong>常用操作按钮</strong>：
          </Paragraph>
          <ul>
            <li><Tag color="success">启动</Tag>：启动 Agent 服务</li>
            <li><Tag color="error">停止</Tag>：停止 Agent 服务</li>
            <li><Tag color="warning">重启</Tag>：重启 Agent 服务</li>
            <li><Tag color="default">删除</Tag>：删除 Agent（会移动到回收站）</li>
          </ul>
          <Paragraph type="secondary">
            危险操作（删除）会有二次确认，避免误操作。
          </Paragraph>
        </div>
      )
    },
    {
      title: '开始使用',
      icon: <QuestionCircleOutlined />,
      content: (
        <div>
          <Title level={4}>🎉 恭喜！</Title>
          <Paragraph>
            您已经了解了 Agent 配置管理系统的核心功能。
          </Paragraph>
          <Paragraph>
            <strong>接下来您可以：</strong>
          </Paragraph>
          <ul>
            <li>查看概览了解 Agent 当前状态</li>
            <li>编辑 SOUL.md 定制 Agent 性格</li>
            <li>配置渠道让 Agent 接入聊天平台</li>
            <li>查看日志监控运行状况</li>
          </ul>
          <Paragraph type="secondary">
            如需再次查看此向导，点击右上角的"使用向导"按钮。
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
      width={700}
      footer={null}
      closable={true}
      maskClosable={true}
    >
      <div style={{ padding: '20px 0' }}>
        <Steps
          current={currentStep}
          items={guideSteps.map(s => ({
            title: s.title,
            icon: s.icon
          }))}
          size="small"
          direction="horizontal"
          style={{ marginBottom: '30px', overflowX: 'auto' }}
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
                步骤 {currentStep + 1} / {guideSteps.length}
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
            上一步
          </Button>

          <Space>
            {currentStep < guideSteps.length - 1 ? (
              <Button onClick={handleClose} size="large">
                跳过向导
              </Button>
            ) : null}
            <Button
              type="primary"
              onClick={handleNext}
              size="large"
            >
              {currentStep === guideSteps.length - 1 ? '完成' : '下一步'}
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  )
}
