import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import {
  Card, Tabs, Descriptions, Tag, Space, Button, message,
  Form, Input, Select, Switch, Popconfirm, Divider, Typography,
  List, Modal, Badge, Spin, Empty,
  Row, Col, Statistic, Timeline, Alert, Progress
} from 'antd'
import {
  ArrowLeftOutlined, PlayCircleOutlined, PauseCircleOutlined,
  ReloadOutlined, DeleteOutlined, SaveOutlined, EditOutlined,
  PlusOutlined,
  DeleteOutlined as DeleteIconOutlined, DownloadOutlined,
  ClearOutlined, SearchOutlined, FileMarkdownOutlined,
  HistoryOutlined, QuestionCircleOutlined
} from '@ant-design/icons'
import { agentsApi } from '../api/agents'
import { filesApi, type MdFile, getFileInfo } from '../api/files'
import { logsApi, type AgentLog } from '../api/logs'
import ReactMarkdown from 'react-markdown'
import GuideTour from '../components/GuideTour'
import FileUseCases from '../components/FileUseCases'

const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs
const { TextArea } = Input

const categoryColors: Record<string, string> = {
  'core': 'blue',
  'other': 'default',
  // Legacy categories for compatibility
  'skills': 'blue',
  'personality': 'purple',
  'identity': 'cyan',
  'memory': 'gold',
  'bootstrap': 'green',
  'agents': 'orange',
  'tools': 'magenta',
  'user': 'lime',
  'heartbeat': 'red',
  // Chinese keys for compatibility
  '核心文件': 'blue',
  '其他文件': 'default',
  '技能': 'blue',
  '性格': 'purple',
  '身份': 'cyan',
  '记忆': 'gold',
  '启动': 'green',
  '代理': 'orange',
  '工具': 'magenta',
  '用户': 'lime',
  '心跳': 'red',
  '其他': 'default'
}

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('overview')
  const [form] = Form.useForm()

  // MD 文件编辑状态
  const [selectedFile, setSelectedFile] = useState<MdFile | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [isEditingFile, setIsEditingFile] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [createFileModalVisible, setCreateFileModalVisible] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [newFileCategory, setNewFileCategory] = useState('skills')
  const [newFileSource, setNewFileSource] = useState<'agent' | 'workspace'>('agent')

  // Guide Tour 状态
  const [guideVisible, setGuideVisible] = useState(false)

  // 处理从向导选择的文件
  const handleGuideFileSelect = (fileName: string, source: 'agent' | 'workspace') => {
    setGuideVisible(false)
    setActiveTab('files')
    // 查找并选中对应的文件
    if (files?.files) {
      const targetFile = files.files.find(f => f.name === fileName && f.source === source)
      if (targetFile) {
        handleFileSelect(targetFile)
      }
    }
  }

  // 日志状态
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsPagination, setLogsPagination] = useState({ total: 0, offset: 0, limit: 100, hasMore: false })
  const [logSearch, setLogSearch] = useState('')
  const [logLevel, setLogLevel] = useState<'all' | 'debug' | 'info' | 'warn' | 'error'>('all')
  const [logType, setLogType] = useState<'all' | 'system' | 'chat' | 'error' | 'audit'>('all')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: agentData, isLoading } = useQuery(
    ['agent', id],
    () => agentsApi.getById(id!),
    { enabled: !!id, refetchInterval: 5000 }
  )

  const { data: configData } = useQuery(
    ['config', id],
    () => agentsApi.getConfig(id!),
    { enabled: !!id }
  )

  const { data: filesData, refetch: refetchFiles } = useQuery(
    ['files', id],
    () => filesApi.getAll(id!),
    { enabled: !!id }
  )

  const agent = agentData?.data
  const config = configData?.data
  const files = filesData?.data

  // 加载日志
  const loadLogs = async (offset = 0, append = false) => {
    if (!id) return
    setLogsLoading(true)
    try {
      const response = await logsApi.getLogs(id, {
        type: logType,
        level: logLevel,
        limit: 100,
        offset,
        search: logSearch || undefined
      })
      if (response.success && response.data) {
        if (append) {
          setLogs(prev => [...prev, ...response.data!])
        } else {
          setLogs(response.data)
        }
        // @ts-ignore - pagination is added by backend
        setLogsPagination(response.pagination || { total: 0, offset, limit: 100, hasMore: false })
      }
    } catch (error) {
      message.error(t('agentDetail.messages.loadFileError'))
    } finally {
      setLogsLoading(false)
    }
  }

  // 自动刷新日志
  useEffect(() => {
    if (autoRefresh && activeTab === 'logs') {
      refreshTimerRef.current = setInterval(() => {
        loadLogs(0, false)
      }, 5000)
    } else if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
    }
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    }
  }, [autoRefresh, activeTab, logType, logLevel, logSearch])

  // 标签切换时加载数据
  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs(0, false)
    }
  }, [activeTab])

  const updateMutation = useMutation(
    (values: any) => agentsApi.update(id!, values),
    {
      onSuccess: () => {
        message.success(t('agentDetail.messages.saveSuccess'))
        queryClient.invalidateQueries(['agent', id])
      },
      onError: (error: Error) => { message.error(error.message) }
    }
  )

  const startMutation = useMutation(() => agentsApi.start(id!), {
    onSuccess: () => {
      message.success(t('agentList.messages.startSuccess'))
      queryClient.invalidateQueries(['agent', id])
    }
  })

  const stopMutation = useMutation(() => agentsApi.stop(id!), {
    onSuccess: () => {
      message.success(t('agentList.messages.stopSuccess'))
      queryClient.invalidateQueries(['agent', id])
    }
  })

  const restartMutation = useMutation(() => agentsApi.restart(id!), {
    onSuccess: () => {
      message.success(t('agentList.messages.restartSuccess'))
      queryClient.invalidateQueries(['agent', id])
    }
  })

  const deleteMutation = useMutation(() => agentsApi.delete(id!), {
    onSuccess: () => {
      message.success(t('agentList.messages.deleteSuccess'))
      navigate('/agents')
    }
  })

  const saveFileMutation = useMutation(
    () => filesApi.updateContent(id!, selectedFile!.relativePath, editContent, selectedFile!.source, true),
    {
      onSuccess: (data) => {
        message.success(data.data?.backupCreated ? t('agentDetail.messages.saveFileSuccess') : t('agentDetail.messages.saveSuccess'))
        setFileContent(editContent)
        setIsEditingFile(false)
        refetchFiles()
      },
      onError: () => {
        message.error(t('agentDetail.messages.saveFileError'))
      }
    }
  )

  const createFileMutation = useMutation(
    () => {
      const fullPath = `${newFileCategory}/${newFileName}.md`
      return filesApi.create(id!, fullPath, newFileSource, `# ${newFileName}\n\n`)
    },
    {
      onSuccess: () => {
        message.success(t('agentDetail.messages.createFileSuccess'))
        setCreateFileModalVisible(false)
        setNewFileName('')
        refetchFiles()
      },
      onError: () => {
        message.error(t('agentDetail.messages.createFileError'))
      }
    }
  )

  const deleteFileMutation = useMutation(
    ({ filePath, source }: { filePath: string; source: 'agent' | 'workspace' }) =>
      filesApi.delete(id!, filePath, source),
    {
      onSuccess: () => {
        message.success(t('agentDetail.messages.deleteFileSuccess'))
        setSelectedFile(null)
        refetchFiles()
      },
      onError: () => {
        message.error(t('agentDetail.messages.deleteFileError'))
      }
    }
  )

  const handleFileSelect = async (file: MdFile) => {
    setSelectedFile(file)
    try {
      const response = await filesApi.getContent(id!, file.relativePath, file.source)
      if (response.success && response.data) {
        setFileContent(response.data.content)
        setEditContent(response.data.content)
      }
    } catch (error) {
      message.error(t('agentDetail.messages.loadFileError'))
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'red'
      case 'warn': return 'orange'
      case 'info': return 'blue'
      case 'debug': return 'gray'
      default: return 'default'
    }
  }

  const getStatusConfig = (status: string) => {
    const config: Record<string, { color: string; text: string }> = {
      running: { color: 'success', text: t('status.running') },
      stopped: { color: 'error', text: t('status.stopped') },
      error: { color: 'warning', text: t('status.error') },
      configuring: { color: 'processing', text: t('status.configuring') }
    }
    return config[status] || { color: 'default', text: status }
  }

  if (isLoading) return <Card loading />
  if (!agent) return <div>Agent not found</div>

  const status = getStatusConfig(agent.status)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/agents')}>
            {t('common.back')}
          </Button>
          <span style={{ fontSize: '24px' }}>{agent.emoji}</span>
          <Title level={3} style={{ margin: 0 }}>
            {agent.name} ({agent.displayName})
          </Title>
          <Tag color={status.color}>{status.text}</Tag>
          {agent.runtimeInfo?.pid && (
            <Tag color="blue">PID: {agent.runtimeInfo.pid}</Tag>
          )}
        </Space>

        <Space>
          <Button
            icon={<QuestionCircleOutlined />}
            onClick={() => setGuideVisible(true)}
          >
            {t('nav.guide')}
          </Button>
          {agent.status === 'running' ? (
            <>
              <Button icon={<PauseCircleOutlined />} onClick={() => stopMutation.mutate()}>
                {t('common.stop')}
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => restartMutation.mutate()}>
                {t('common.restart')}
              </Button>
            </>
          ) : (
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => startMutation.mutate()}>
              {t('common.start')}
            </Button>
          )}
          <Popconfirm
            title={t('agentDetail.confirmations.deleteTitle')}
            description={t('agentDetail.confirmations.deleteMessage')}
            onConfirm={() => deleteMutation.mutate()}
            okText={t('common.delete')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>{t('common.delete')}</Button>
          </Popconfirm>
        </Space>
      </div>

      {/* Tabs */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* Overview Tab */}
        <TabPane tab={t('agentDetail.tabs.overview')} key="overview">
          <Row gutter={16}>
            <Col span={16}>
              <Card>
                <Descriptions title={t('agentDetail.sections.basicInfo')} bordered column={2}>
                  <Descriptions.Item label={t('agentDetail.labels.agentId')}>{agent.id}</Descriptions.Item>
                  <Descriptions.Item label={t('agentDetail.labels.internalName')}>{agent.name}</Descriptions.Item>
                  <Descriptions.Item label={t('agentDetail.labels.displayName')}>{agent.displayName}</Descriptions.Item>
                  <Descriptions.Item label={t('agentDetail.labels.avatar')}>{agent.emoji}</Descriptions.Item>
                  <Descriptions.Item label={t('agentDetail.labels.servicePort')}>{agent.port}</Descriptions.Item>
                  <Descriptions.Item label={t('agentDetail.labels.configFile')}>{agent.configPath}</Descriptions.Item>
                </Descriptions>

                <Divider />

                <Descriptions title={t('agentDetail.sections.runtimeStatus')} bordered column={2}>
                  <Descriptions.Item label={t('agentDetail.labels.currentStatus')}>
                    <Tag color={status.color}>{status.text}</Tag>
                  </Descriptions.Item>
                  {agent.runtimeInfo?.cpu !== undefined && (
                    <Descriptions.Item label={t('agentDetail.labels.cpuUsage')}>
                      <Progress percent={agent.runtimeInfo.cpu} size="small" />
                    </Descriptions.Item>
                  )}
                  {agent.runtimeInfo?.memory !== undefined && (
                    <Descriptions.Item label={t('agentDetail.labels.memoryUsage')}>
                      <Progress percent={agent.runtimeInfo.memory} size="small" status="active" />
                    </Descriptions.Item>
                  )}
                  {agent.runtimeInfo?.uptime !== undefined && (
                    <Descriptions.Item label={t('agentDetail.labels.uptime')}>
                      {Math.floor(agent.runtimeInfo.uptime / 60)} {t('time.minutes')}
                    </Descriptions.Item>
                  )}
                </Descriptions>

                <Divider />

                <Descriptions title={t('agentDetail.sections.channelConfig')} bordered column={2}>
                  <Descriptions.Item label={t('channels.feishu')}>
                    {agent.channels.feishu ? <Tag color="success">{t('common.enabled')}</Tag> : <Tag>{t('common.disabled')}</Tag>}
                  </Descriptions.Item>
                  <Descriptions.Item label="Open-ClawChat">
                    {agent.channels.openClawChat ? <Tag color="success">{t('common.enabled')}</Tag> : <Tag>{t('common.disabled')}</Tag>}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
            <Col span={8}>
              <Card title={t('agentDetail.sections.statistics')}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic title={t('agentDetail.labels.installedSkills')} value={agent.skills.length} />
                  </Col>
                  <Col span={12}>
                    <Statistic title={t('agentDetail.labels.roomCount')} value={agent.currentRooms.length} />
                  </Col>
                </Row>
                <Divider />
                <Statistic
                  title={t('agentDetail.labels.configFile')}
                  value={files?.total || 0}
                  suffix={t('agentDetail.labels.mdFiles')}
                />
              </Card>

              {agent.currentRooms.length > 0 && (
                <Card title={t('agentDetail.sections.currentRooms')} style={{ marginTop: '16px' }}>
                  <List
                    size="small"
                    dataSource={agent.currentRooms}
                    renderItem={room => (
                      <List.Item>
                        <Tag color="purple">{room.roomId}</Tag>
                        <span>{t('agentDetail.labels.minutesLeft', { time: room.remainingTime })}</span>
                      </List.Item>
                    )}
                  />
                </Card>
              )}
            </Col>
          </Row>
        </TabPane>

        {/* Basic Config Tab */}
        <TabPane tab={t('agentDetail.tabs.basic')} key="basic">
          <Card>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                name: agent.name,
                displayName: agent.displayName,
                emoji: agent.emoji
              }}
              onFinish={(values) => updateMutation.mutate(values)}
            >
              <Form.Item label={t('agentDetail.labels.agentId')}>
                <Input value={agent.id} disabled />
                <Text type="secondary">{t('agentDetail.labels.cannotModify')}</Text>
              </Form.Item>

              <Form.Item name="name" label={t('agentDetail.labels.agentName')} rules={[{ required: true }]}>
                <Input />
              </Form.Item>

              <Form.Item name="displayName" label={t('agentDetail.labels.displayName')} rules={[{ required: true }]}>
                <Input placeholder={t('agentDetail.labels.nameInChat')} />
              </Form.Item>

              <Form.Item name="emoji" label={t('agentDetail.labels.selectAvatar')}>
                <Select placeholder={t('agentDetail.labels.selectAvatar')}>
                  {['🐕', '🐱', '🦊', '🐼', '🦁', '🐰', '🐯', '🐨'].map(e => (
                    <Select.Option key={e} value={e}>{e}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={updateMutation.isLoading}>
                  {t('agentDetail.labels.saveChanges')}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        {/* Channels Tab */}
        <TabPane tab={t('agentDetail.tabs.channels')} key="channels">
          <Card title={t('agentDetail.labels.feishuConfig')}>
            {config && (
              <Form layout="vertical">
                <Form.Item label={t('agentDetail.labels.enableFeishu')}>
                  <Switch defaultChecked={config.channels.feishu.enabled} />
                </Form.Item>
                <Form.Item label="AppID">
                  <Input defaultValue={config.channels.feishu.appId} />
                </Form.Item>
                <Form.Item label="AppSecret">
                  <Input.Password defaultValue={config.channels.feishu.appSecret} />
                </Form.Item>
                <Button type="primary" icon={<SaveOutlined />}>{t('agentDetail.labels.saveConfig')}</Button>
              </Form>
            )}
          </Card>
        </TabPane>

        {/* Rooms Tab */}
        <TabPane tab={t('agentDetail.tabs.rooms')} key="rooms">
          <Card>
            {agent.currentRooms.length === 0 ? (
              <Empty description={t('agentDetail.labels.noRooms')} />
            ) : (
              <List
                grid={{ gutter: 16, column: 3 }}
                dataSource={agent.currentRooms}
                renderItem={room => (
                  <List.Item>
                    <Card title={room.roomId} size="small">
                      <p>{t('agentDetail.labels.joinTime')}: {new Date(room.joinedAt).toLocaleString()}</p>
                      <p>{t('agentDetail.labels.remainingTime')}: {room.remainingTime} {t('time.minutes')}</p>
                      <Tag color={room.isOwner ? 'gold' : 'default'}>
                        {room.isOwner ? t('agentDetail.labels.owner') : t('agentDetail.labels.member')}
                      </Tag>
                    </Card>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </TabPane>

        {/* Skills Tab */}
        <TabPane tab={t('agentDetail.tabs.skills')} key="skills">
          <Card>
            {agent.skills.length === 0 ? (
              <Empty description={t('agentDetail.labels.noSkills')} />
            ) : (
              <List
                dataSource={agent.skills}
                renderItem={skill => (
                  <List.Item actions={[<Button size="small">{t('common.configure')}</Button>]}>
                    <List.Item.Meta
                      title={skill}
                      description={t('agentDetail.labels.skillDesc')}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </TabPane>

        {/* Files Tab */}
        <TabPane tab={<span><FileMarkdownOutlined />{t('agentDetail.tabs.configFiles')}</span>} key="files">
          <Row gutter={16}>
            <Col span={8}>
              <Card
                title={
                  <Space>
                    <span>{t('agentDetail.labels.fileList')}</span>
                    <Badge count={files?.total || 0} />
                  </Space>
                }
                extra={
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateFileModalVisible(true)}
                  >
                    {t('agentDetail.labels.newFile')}
                  </Button>
                }
              >
                {files?.grouped && Object.entries(files.grouped)
                  .sort(([a], [b]) => {
                    // 核心文件排在最前面
                    if (a === '核心文件' || a === 'Core Files') return -1;
                    if (b === '核心文件' || b === 'Core Files') return 1;
                    return a.localeCompare(b);
                  })
                  .map(([category, categoryFiles]) => (
                  <div key={category} style={{ marginBottom: '16px' }}>
                    <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                      <Tag color={categoryColors[category] || 'default'}>{t(`fileCategories.${category}`, { defaultValue: category })}</Tag>
                      <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
                        {categoryFiles.length} {t('agentDetail.labels.file', { defaultValue: 'files' })}
                      </Text>
                    </Text>
                    <List
                      size="small"
                      dataSource={categoryFiles}
                      renderItem={file => {
                        const fileInfo = getFileInfo(file.name, file.category)
                        return (
                          <List.Item
                            style={{
                              cursor: 'pointer',
                              backgroundColor: selectedFile?.path === file.path ? '#f0f0f0' : 'transparent',
                              padding: '8px'
                            }}
                            onClick={() => handleFileSelect(file)}
                            actions={[
                              <Popconfirm
                                key="delete"
                                title={t('agentDetail.confirmations.deleteTitle')}
                                onConfirm={(e) => {
                                  e?.stopPropagation()
                                  deleteFileMutation.mutate({ filePath: file.relativePath, source: file.source })
                                }}
                              >
                                <DeleteIconOutlined
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ color: '#ff4d4f' }}
                                />
                              </Popconfirm>
                            ]}
                          >
                            <div style={{ width: '100%' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text strong>{fileInfo.displayName}</Text>
                                <Tag color={file.source === 'workspace' ? 'blue' : 'green'}>
                                  {file.source}
                                </Tag>
                              </div>
                              <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                                {fileInfo.description}
                              </Text>
                              <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: 2 }}>
                                {t('agentDetail.labels.file')}: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                              </Text>
                              <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: 2, color: '#999' }}>
                                {t('agentDetail.labels.filePath')}: {file.displayPath}
                              </Text>
                            </div>
                          </List.Item>
                        )
                      }}
                    />
                  </div>
                ))}
              </Card>
            </Col>
            <Col span={16}>
              {selectedFile && (
                <FileUseCases
                  fileName={selectedFile.name}
                  onApply={(content) => {
                    setEditContent(content);
                    setIsEditingFile(true);
                  }}
                />
              )}
              <Card
                title={
                  selectedFile ? (
                    <div>
                      <Space>
                        <span style={{ fontWeight: 'bold' }}>
                          {(() => {
                            const info = getFileInfo(selectedFile.name, selectedFile.category);
                            return `${info.displayName} (${selectedFile.name})`;
                          })()}
                        </span>
                        <Tag color={categoryColors[selectedFile.category] || 'default'}>
                          {selectedFile.category}
                        </Tag>
                        <Tag color={selectedFile.source === 'workspace' ? 'blue' : 'green'}>
                          {selectedFile.source}
                        </Tag>
                      </Space>
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {(() => {
                            const info = getFileInfo(selectedFile.name, selectedFile.category);
                            return info.description;
                          })()}
                        </Text>
                      </div>
                      <div style={{ marginTop: 2 }}>
                        <Text type="secondary" style={{ fontSize: '11px', color: '#999' }}>
                          {t('agentDetail.labels.filePath')}: {selectedFile.displayPath}
                        </Text>
                      </div>
                    </div>
                  ) : t('agentDetail.labels.fileContent')
                }
                extra={
                  selectedFile && (
                    <Space>
                      <Button
                        type={isEditingFile ? 'default' : 'primary'}
                        icon={<EditOutlined />}
                        onClick={() => {
                          if (isEditingFile) {
                            setEditContent(fileContent)
                          }
                          setIsEditingFile(!isEditingFile)
                        }}
                      >
                        {isEditingFile ? t('common.cancel') : t('common.edit')}
                      </Button>
                      {isEditingFile && (
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          loading={saveFileMutation.isLoading}
                          onClick={() => saveFileMutation.mutate()}
                        >
                          {t('common.save')}
                        </Button>
                      )}
                    </Space>
                  )
                }
              >
                {selectedFile ? (
                  isEditingFile ? (
                    <TextArea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={30}
                      style={{ fontFamily: 'monospace' }}
                    />
                  ) : (
                    <div style={{ maxHeight: '600px', overflow: 'auto', padding: '16px', backgroundColor: '#fafafa' }}>
                      <ReactMarkdown>{fileContent}</ReactMarkdown>
                    </div>
                  )
                ) : (
                  <Empty description={t('agentDetail.labels.selectFileToView')} />
                )}
              </Card>
            </Col>
          </Row>

          {/* Create File Modal */}
          <Modal
            title={t('agentDetail.labels.newFile') + ' MD'}
            open={createFileModalVisible}
            onOk={() => createFileMutation.mutate()}
            onCancel={() => {
              setCreateFileModalVisible(false)
              setNewFileName('')
            }}
            confirmLoading={createFileMutation.isLoading}
          >
            <Form layout="vertical">
              <Form.Item label={t('agentDetail.labels.storageLocation')}>
                <Select value={newFileSource} onChange={setNewFileSource}>
                  <Select.Option value="agent">{t('agentDetail.labels.agentDir')}</Select.Option>
                  <Select.Option value="workspace">{t('agentDetail.labels.workspaceDir')}</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item label={t('agentDetail.labels.fileCategory')}>
                <Select value={newFileCategory} onChange={setNewFileCategory}>
                  <Select.Option value="skills">{t('fileCategories.skills')}</Select.Option>
                  <Select.Option value="workspaces">{t('fileCategories.memory')}</Select.Option>
                  <Select.Option value="agent">{t('fileCategories.agents')}</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item label={t('agentDetail.labels.fileName')}>
                <Input
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder={t('agentDetail.labels.enterFilename')}
                  addonAfter=".md"
                />
              </Form.Item>
            </Form>
          </Modal>
        </TabPane>

        {/* Logs Tab */}
        <TabPane tab={<span><HistoryOutlined />{t('agentDetail.tabs.logs')}</span>} key="logs">
          <Card>
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={6}>
                <Input
                  placeholder={t('agentDetail.labels.searchLogs')}
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  prefix={<SearchOutlined />}
                  allowClear
                />
              </Col>
              <Col span={4}>
                <Select value={logType} onChange={setLogType} style={{ width: '100%' }}>
                  <Select.Option value="all">{t('agentDetail.labels.allTypes')}</Select.Option>
                  <Select.Option value="system">{t('agentDetail.labels.system')}</Select.Option>
                  <Select.Option value="chat">{t('agentDetail.labels.chat')}</Select.Option>
                  <Select.Option value="error">{t('common.error')}</Select.Option>
                  <Select.Option value="audit">{t('agentDetail.labels.audit')}</Select.Option>
                </Select>
              </Col>
              <Col span={4}>
                <Select value={logLevel} onChange={setLogLevel} style={{ width: '100%' }}>
                  <Select.Option value="all">{t('agentDetail.labels.allLevels')}</Select.Option>
                  <Select.Option value="debug">{t('agentDetail.labels.debug')}</Select.Option>
                  <Select.Option value="info">{t('common.info')}</Select.Option>
                  <Select.Option value="warn">{t('agentDetail.labels.warn')}</Select.Option>
                  <Select.Option value="error">{t('common.error')}</Select.Option>
                </Select>
              </Col>
              <Col span={10}>
                <Space>
                  <Button icon={<SearchOutlined />} onClick={() => loadLogs(0, false)}>
                    {t('common.search')}
                  </Button>
                  <Button
                    type={autoRefresh ? 'primary' : 'default'}
                    onClick={() => setAutoRefresh(!autoRefresh)}
                  >
                    {autoRefresh ? t('agentDetail.labels.stopRefresh') : t('agentDetail.labels.autoRefresh')}
                  </Button>
                  <Popconfirm
                    title={t('agentDetail.confirmations.clearLogsTitle')}
                    description={t('agentDetail.confirmations.clearLogsMessage')}
                    onConfirm={() => {
                      logsApi.clearLogs(id!).then(() => {
                        message.success(t('agentDetail.messages.clearLogsSuccess'))
                        loadLogs(0, false)
                      })
                    }}
                  >
                    <Button icon={<ClearOutlined />}>{t('agentDetail.labels.clear')}</Button>
                  </Popconfirm>
                  <Button icon={<DownloadOutlined />} onClick={() => logsApi.exportLogs(id!)}>
                    {t('agentDetail.labels.export')}
                  </Button>
                </Space>
              </Col>
            </Row>

            <div style={{ maxHeight: '600px', overflow: 'auto' }}>
              {logsLoading && logs.length === 0 ? (
                <Spin tip={t('common.loading')} />
              ) : logs.length === 0 ? (
                <Empty description={t('agentDetail.labels.noLogs')} />
              ) : (
                <Timeline mode="left">
                  {logs.map((log, index) => (
                    <Timeline.Item
                      key={log.id || index}
                      color={getLevelColor(log.level)}
                      label={new Date(log.timestamp).toLocaleString()}
                    >
                      <div>
                        <Space>
                          <Tag color={getLevelColor(log.level)}>{log.level.toUpperCase()}</Tag>
                          <Tag>{log.type}</Tag>
                        </Space>
                        <Paragraph style={{ marginTop: '8px', marginBottom: 0 }}>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {log.message}
                          </pre>
                        </Paragraph>
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              )}

              {logsPagination.hasMore && (
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <Button onClick={() => loadLogs(logsPagination.offset + logsPagination.limit, true)}>
                    {t('agentDetail.labels.loadMore')}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </TabPane>

        {/* Advanced Tab */}
        <TabPane tab={t('agentDetail.tabs.advanced')} key="advanced">
          <Card title={t('agentDetail.labels.versionManagement')}>
            <Alert
              message={t('agentDetail.labels.autoBackup')}
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            <Button icon={<HistoryOutlined />}>{t('agentDetail.labels.viewHistory')}</Button>
          </Card>

          <Card title={t('agentDetail.labels.dangerZone')} style={{ marginTop: '16px' }}>
            <Popconfirm
              title={t('agentDetail.confirmations.resetTitle')}
              description={t('agentDetail.confirmations.resetWarning')}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
            >
              <Button danger>{t('agentDetail.labels.resetConfig')}</Button>
            </Popconfirm>
          </Card>
        </TabPane>
      </Tabs>

      {/* Guide Tour */}
      <GuideTour
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
        onFileSelect={handleGuideFileSelect}
      />
    </div>
  )
}
