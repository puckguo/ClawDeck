import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
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

const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs
const { TextArea } = Input

const statusConfig = {
  running: { color: 'success', text: '运行中' },
  stopped: { color: 'error', text: '已停止' },
  error: { color: 'warning', text: '异常' },
  configuring: { color: 'processing', text: '配置中' }
}

const categoryColors: Record<string, string> = {
  '核心文件': 'blue',
  '其他文件': 'default',
  // 保留旧分类兼容
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
      message.error('加载日志失败')
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
        message.success('保存成功')
        queryClient.invalidateQueries(['agent', id])
      },
      onError: (error: Error) => { message.error(error.message) }
    }
  )

  const startMutation = useMutation(() => agentsApi.start(id!), {
    onSuccess: () => {
      message.success('启动成功')
      queryClient.invalidateQueries(['agent', id])
    }
  })

  const stopMutation = useMutation(() => agentsApi.stop(id!), {
    onSuccess: () => {
      message.success('停止成功')
      queryClient.invalidateQueries(['agent', id])
    }
  })

  const restartMutation = useMutation(() => agentsApi.restart(id!), {
    onSuccess: () => {
      message.success('重启成功')
      queryClient.invalidateQueries(['agent', id])
    }
  })

  const deleteMutation = useMutation(() => agentsApi.delete(id!), {
    onSuccess: () => {
      message.success('删除成功')
      navigate('/agents')
    }
  })

  const saveFileMutation = useMutation(
    () => filesApi.updateContent(id!, selectedFile!.relativePath, editContent, selectedFile!.source, true),
    {
      onSuccess: (data) => {
        message.success(`文件保存成功${data.data?.backupCreated ? '（已备份原文件）' : ''}`)
        setFileContent(editContent)
        setIsEditingFile(false)
        refetchFiles()
      },
      onError: () => {
        message.error('保存失败')
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
        message.success('文件创建成功')
        setCreateFileModalVisible(false)
        setNewFileName('')
        refetchFiles()
      },
      onError: () => {
        message.error('创建失败')
      }
    }
  )

  const deleteFileMutation = useMutation(
    ({ filePath, source }: { filePath: string; source: 'agent' | 'workspace' }) =>
      filesApi.delete(id!, filePath, source),
    {
      onSuccess: () => {
        message.success('文件已删除')
        setSelectedFile(null)
        refetchFiles()
      },
      onError: () => {
        message.error('删除失败')
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
      message.error('读取文件失败')
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

  if (isLoading) return <Card loading />
  if (!agent) return <div>Agent not found</div>

  const status = statusConfig[agent.status]

  return (
    <div>
      {/* 头部 */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/agents')}>
            返回
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
            使用向导
          </Button>
          {agent.status === 'running' ? (
            <>
              <Button icon={<PauseCircleOutlined />} onClick={() => stopMutation.mutate()}>
                停止
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => restartMutation.mutate()}>
                重启
              </Button>
            </>
          ) : (
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => startMutation.mutate()}>
              启动
            </Button>
          )}
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，确定要删除吗？"
            onConfirm={() => deleteMutation.mutate()}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      </div>

      {/* 标签页 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* 概览标签 */}
        <TabPane tab="概览" key="overview">
          <Row gutter={16}>
            <Col span={16}>
              <Card>
                <Descriptions title="基本信息" bordered column={2}>
                  <Descriptions.Item label="助手ID">{agent.id}</Descriptions.Item>
                  <Descriptions.Item label="内部名称">{agent.name}</Descriptions.Item>
                  <Descriptions.Item label="显示名称">{agent.displayName}</Descriptions.Item>
                  <Descriptions.Item label="形象">{agent.emoji}</Descriptions.Item>
                  <Descriptions.Item label="服务端口">{agent.port}</Descriptions.Item>
                  <Descriptions.Item label="配置文件">{agent.configPath}</Descriptions.Item>
                </Descriptions>

                <Divider />

                <Descriptions title="运行状态" bordered column={2}>
                  <Descriptions.Item label="当前状态">
                    <Tag color={status.color}>{status.text}</Tag>
                  </Descriptions.Item>
                  {agent.runtimeInfo?.cpu !== undefined && (
                    <Descriptions.Item label="CPU使用率">
                      <Progress percent={agent.runtimeInfo.cpu} size="small" />
                    </Descriptions.Item>
                  )}
                  {agent.runtimeInfo?.memory !== undefined && (
                    <Descriptions.Item label="内存使用率">
                      <Progress percent={agent.runtimeInfo.memory} size="small" status="active" />
                    </Descriptions.Item>
                  )}
                  {agent.runtimeInfo?.uptime !== undefined && (
                    <Descriptions.Item label="运行时长">
                      {Math.floor(agent.runtimeInfo.uptime / 60)} 分钟
                    </Descriptions.Item>
                  )}
                </Descriptions>

                <Divider />

                <Descriptions title="渠道配置" bordered column={2}>
                  <Descriptions.Item label="飞书">
                    {agent.channels.feishu ? <Tag color="success">已启用</Tag> : <Tag>未启用</Tag>}
                  </Descriptions.Item>
                  <Descriptions.Item label="Open-ClawChat">
                    {agent.channels.openClawChat ? <Tag color="success">已启用</Tag> : <Tag>未启用</Tag>}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
            <Col span={8}>
              <Card title="统计信息">
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic title="已安装技能" value={agent.skills.length} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="当前房间数" value={agent.currentRooms.length} />
                  </Col>
                </Row>
                <Divider />
                <Statistic
                  title="配置文件"
                  value={files?.total || 0}
                  suffix="个MD文件"
                />
              </Card>

              {agent.currentRooms.length > 0 && (
                <Card title="当前房间" style={{ marginTop: '16px' }}>
                  <List
                    size="small"
                    dataSource={agent.currentRooms}
                    renderItem={room => (
                      <List.Item>
                        <Tag color="purple">{room.roomId}</Tag>
                        <span>剩余 {room.remainingTime} 分钟</span>
                      </List.Item>
                    )}
                  />
                </Card>
              )}
            </Col>
          </Row>
        </TabPane>

        {/* 基础配置标签 */}
        <TabPane tab="基础配置" key="basic">
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
              <Form.Item label="助手ID">
                <Input value={agent.id} disabled />
                <Text type="secondary">助手ID不可修改</Text>
              </Form.Item>

              <Form.Item name="name" label="助手名称" rules={[{ required: true }]}>
                <Input />
              </Form.Item>

              <Form.Item name="displayName" label="显示名称" rules={[{ required: true }]}>
                <Input placeholder="在聊天室中显示的名字" />
              </Form.Item>

              <Form.Item name="emoji" label="形象标识">
                <Select placeholder="选择形象">
                  {['🐕', '🐱', '🦊', '🐼', '🦁', '🐰', '🐯', '🐨'].map(e => (
                    <Select.Option key={e} value={e}>{e}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={updateMutation.isLoading}>
                  保存修改
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        {/* 渠道配置标签 */}
        <TabPane tab="渠道配置" key="channels">
          <Card title="飞书配置">
            {config && (
              <Form layout="vertical">
                <Form.Item label="启用飞书">
                  <Switch defaultChecked={config.channels.feishu.enabled} />
                </Form.Item>
                <Form.Item label="AppID">
                  <Input defaultValue={config.channels.feishu.appId} />
                </Form.Item>
                <Form.Item label="AppSecret">
                  <Input.Password defaultValue={config.channels.feishu.appSecret} />
                </Form.Item>
                <Button type="primary" icon={<SaveOutlined />}>保存配置</Button>
              </Form>
            )}
          </Card>
        </TabPane>

        {/* 聊天室标签 */}
        <TabPane tab="聊天室" key="rooms">
          <Card>
            {agent.currentRooms.length === 0 ? (
              <Empty description="未加入任何房间" />
            ) : (
              <List
                grid={{ gutter: 16, column: 3 }}
                dataSource={agent.currentRooms}
                renderItem={room => (
                  <List.Item>
                    <Card title={room.roomId} size="small">
                      <p>加入时间: {new Date(room.joinedAt).toLocaleString()}</p>
                      <p>剩余时间: {room.remainingTime} 分钟</p>
                      <Tag color={room.isOwner ? 'gold' : 'default'}>
                        {room.isOwner ? '房主' : '成员'}
                      </Tag>
                    </Card>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </TabPane>

        {/* 技能标签 */}
        <TabPane tab="技能" key="skills">
          <Card>
            {agent.skills.length === 0 ? (
              <Empty description="暂无技能" />
            ) : (
              <List
                dataSource={agent.skills}
                renderItem={skill => (
                  <List.Item actions={[<Button size="small">配置</Button>]}>
                    <List.Item.Meta
                      title={skill}
                      description="技能描述"
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </TabPane>

        {/* 文件管理标签 */}
        <TabPane tab={<span><FileMarkdownOutlined />配置文件</span>} key="files">
          <Row gutter={16}>
            <Col span={8}>
              <Card
                title={
                  <Space>
                    <span>MD 文件列表</span>
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
                    新建
                  </Button>
                }
              >
                {files?.grouped && Object.entries(files.grouped).map(([category, categoryFiles]) => (
                  <div key={category} style={{ marginBottom: '16px' }}>
                    <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                      <Tag color={categoryColors[category] || 'default'}>{category}</Tag>
                      <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
                        {categoryFiles.length} 个文件
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
                                title="确认删除"
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
                                文件: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                              </Text>
                              <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: 2, color: '#999' }}>
                                路径: {file.displayPath}
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
                          路径: {selectedFile.displayPath}
                        </Text>
                      </div>
                    </div>
                  ) : '文件内容'
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
                        {isEditingFile ? '取消' : '编辑'}
                      </Button>
                      {isEditingFile && (
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          loading={saveFileMutation.isLoading}
                          onClick={() => saveFileMutation.mutate()}
                        >
                          保存
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
                  <Empty description="选择一个文件查看内容" />
                )}
              </Card>
            </Col>
          </Row>

          {/* 创建文件模态框 */}
          <Modal
            title="新建 MD 文件"
            open={createFileModalVisible}
            onOk={() => createFileMutation.mutate()}
            onCancel={() => {
              setCreateFileModalVisible(false)
              setNewFileName('')
            }}
            confirmLoading={createFileMutation.isLoading}
          >
            <Form layout="vertical">
              <Form.Item label="存储位置">
                <Select value={newFileSource} onChange={setNewFileSource}>
                  <Select.Option value="agent">agents 目录（配置相关）</Select.Option>
                  <Select.Option value="workspace">workspaces 目录（核心设定）</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item label="文件类别">
                <Select value={newFileCategory} onChange={setNewFileCategory}>
                  <Select.Option value="skills">技能</Select.Option>
                  <Select.Option value="workspaces">工作空间</Select.Option>
                  <Select.Option value="agent">代理配置</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item label="文件名称">
                <Input
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="输入文件名（不含扩展名）"
                  addonAfter=".md"
                />
              </Form.Item>
            </Form>
          </Modal>
        </TabPane>

        {/* 日志标签 */}
        <TabPane tab={<span><HistoryOutlined />运行日志</span>} key="logs">
          <Card>
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={6}>
                <Input
                  placeholder="搜索日志..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  prefix={<SearchOutlined />}
                  allowClear
                />
              </Col>
              <Col span={4}>
                <Select value={logType} onChange={setLogType} style={{ width: '100%' }}>
                  <Select.Option value="all">所有类型</Select.Option>
                  <Select.Option value="system">系统</Select.Option>
                  <Select.Option value="chat">聊天</Select.Option>
                  <Select.Option value="error">错误</Select.Option>
                  <Select.Option value="audit">审计</Select.Option>
                </Select>
              </Col>
              <Col span={4}>
                <Select value={logLevel} onChange={setLogLevel} style={{ width: '100%' }}>
                  <Select.Option value="all">所有级别</Select.Option>
                  <Select.Option value="debug">调试</Select.Option>
                  <Select.Option value="info">信息</Select.Option>
                  <Select.Option value="warn">警告</Select.Option>
                  <Select.Option value="error">错误</Select.Option>
                </Select>
              </Col>
              <Col span={10}>
                <Space>
                  <Button icon={<SearchOutlined />} onClick={() => loadLogs(0, false)}>
                    搜索
                  </Button>
                  <Button
                    type={autoRefresh ? 'primary' : 'default'}
                    onClick={() => setAutoRefresh(!autoRefresh)}
                  >
                    {autoRefresh ? '停止刷新' : '自动刷新'}
                  </Button>
                  <Popconfirm
                    title="确认清空"
                    description="确定要清空所有日志吗？"
                    onConfirm={() => {
                      logsApi.clearLogs(id!).then(() => {
                        message.success('日志已清空')
                        loadLogs(0, false)
                      })
                    }}
                  >
                    <Button icon={<ClearOutlined />}>清空</Button>
                  </Popconfirm>
                  <Button icon={<DownloadOutlined />} onClick={() => logsApi.exportLogs(id!)}>
                    导出
                  </Button>
                </Space>
              </Col>
            </Row>

            <div style={{ maxHeight: '600px', overflow: 'auto' }}>
              {logsLoading && logs.length === 0 ? (
                <Spin tip="加载中..." />
              ) : logs.length === 0 ? (
                <Empty description="暂无日志" />
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
                    加载更多
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </TabPane>

        {/* 高级标签 */}
        <TabPane tab="高级" key="advanced">
          <Card title="配置版本管理">
            <Alert
              message="每次保存配置时，系统会自动创建版本备份"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            <Button icon={<HistoryOutlined />}>查看版本历史</Button>
          </Card>

          <Card title="危险区域" style={{ marginTop: '16px' }}>
            <Popconfirm
              title="确认重置"
              description="重置将恢复到默认配置，确定吗？"
              okText="重置"
              cancelText="取消"
            >
              <Button danger>重置配置</Button>
            </Popconfirm>
          </Card>
        </TabPane>
      </Tabs>

      {/* 使用向导 */}
      <GuideTour
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
        onFileSelect={handleGuideFileSelect}
      />
    </div>
  )
}
