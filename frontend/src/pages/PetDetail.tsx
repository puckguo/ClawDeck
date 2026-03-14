/**
 * 宠物详情页
 */
import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Tabs,
  Button,
  Progress,
  Statistic,
  Row,
  Col,
  List,
  Tag,
  notification,
  Spin,
  Input,
  Tooltip,
  Timeline,
  Empty
} from 'antd'
import {
  HeartFilled,
  FireFilled,
  SmileFilled,
  MedicineBoxFilled,
  StarFilled,
  ArrowLeftOutlined,
  SendOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  RiseOutlined,
  FileTextFilled
} from '@ant-design/icons'
import { petsApi } from '../api/pets'
import type { PetData, PetChatMessage, Interaction } from '../../../shared/types'

const { TabPane } = Tabs
const { TextArea } = Input

// 心情配置
const MOOD_CONFIG: Record<string, { icon: string; color: string; text: string }> = {
  ecstatic: { icon: '🤩', color: '#ff6b9d', text: ' ecstatic' },
  happy: { icon: '😊', color: '#52c41a', text: '开心' },
  content: { icon: '😌', color: '#95de64', text: '满足' },
  neutral: { icon: '😐', color: '#bfbfbf', text: '平静' },
  sad: { icon: '😢', color: '#69b1ff', text: '难过' },
  angry: { icon: '😠', color: '#ff4d4f', text: '生气' },
  sick: { icon: '🤒', color: '#ff7875', text: '生病' },
  sleepy: { icon: '😴', color: '#9254de', text: '困倦' },
  sleeping: { icon: '💤', color: '#722ed1', text: '睡觉中' }
}

// 阶段名称
const STAGE_NAMES: Record<string, string> = {
  egg: '🥚 蛋蛋',
  baby: '👶 婴儿',
  child: '🧒 儿童',
  teen: '🧑 少年',
  adult: '🧔 成年',
  special: '✨ 特殊形态'
}

// 互动类型名称
const INTERACTION_NAMES: Record<string, { name: string; icon: string }> = {
  feed: { name: '喂食', icon: '🍖' },
  play: { name: '玩耍', icon: '🎾' },
  train: { name: '训练', icon: '📚' },
  sleep: { name: '睡觉', icon: '😴' },
  chat: { name: '聊天', icon: '💬' },
  pet: { name: '抚摸', icon: '✋' },
  clean: { name: '清洁', icon: '🛁' },
  gift: { name: '送礼', icon: '🎁' },
  adventure: { name: '探险', icon: '🗺️' },
  treat: { name: '治疗', icon: '💊' }
}

export default function PetDetail() {
  const { id: agentId } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [pet, setPet] = useState<PetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'interact')
  const [chatMessage, setChatMessage] = useState('')
  const [chatting, setChatting] = useState(false)
  const [interacting, setInteracting] = useState(false)

  // 记忆活跃度统计
  const [memoryStats, setMemoryStats] = useState<{
    dates: string[];
    activityScores: number[];
    totalAffectionEarned: number;
    totalExperienceEarned: number;
    averageScore: number;
  } | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [evaluating, setEvaluating] = useState(false)

  // 获取宠物数据
  const fetchPet = async () => {
    if (!agentId) return
    try {
      setLoading(true)
      const response = await petsApi.getById(agentId)
      if (response.success && response.data) {
        setPet(response.data)
      }
    } catch (error) {
      notification.error({
        message: '获取宠物信息失败',
        description: String(error)
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPet()
    fetchMemoryStats()
    // 每10秒刷新一次
    const interval = setInterval(fetchPet, 10000)
    return () => clearInterval(interval)
  }, [agentId])

  // 获取记忆活跃度统计
  const fetchMemoryStats = async () => {
    if (!agentId) return
    try {
      setLoadingStats(true)
      const response = await petsApi.getMemoryStats(agentId, 7)
      if (response.success && response.data) {
        setMemoryStats(response.data)
      }
    } catch (error) {
      console.error('Failed to load memory stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  // 手动触发评估
  const handleEvaluate = async () => {
    if (!agentId || evaluating) return
    try {
      setEvaluating(true)
      const response = await petsApi.evaluate(agentId)
      if (response.success) {
        notification.success({
          message: '评估完成',
          description: response.message
        })
        fetchPet()
        fetchMemoryStats()
      } else {
        notification.warning({
          message: '评估未完成',
          description: response.message
        })
      }
    } catch (error) {
      notification.error({
        message: '评估失败',
        description: String(error)
      })
    } finally {
      setEvaluating(false)
    }
  }

  // 滚动到聊天底部
  useEffect(() => {
    if (activeTab === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [pet?.conversation.messages, activeTab])

  // 处理互动
  const handleInteract = async (type: string) => {
    if (!agentId || interacting) return
    try {
      setInteracting(true)
      const response = await petsApi.interact(agentId, type)
      if (response.success && response.data) {
        const { messages, petStatus } = response.data
        if (messages.length > 0) {
          notification.success({
            message: messages[0],
            description: messages.slice(1).join('，')
          })
        }
        setPet(prev => prev ? { ...prev, status: petStatus } : null)
      }
    } catch (error) {
      notification.error({
        message: '互动失败',
        description: String(error)
      })
    } finally {
      setInteracting(false)
    }
  }

  // 处理聊天
  const handleChat = async () => {
    if (!agentId || !chatMessage.trim() || chatting) return
    try {
      setChatting(true)
      const response = await petsApi.chat(agentId, chatMessage.trim())
      if (response.success && response.data) {
        const { petStatus, message } = response.data
        setChatMessage('')
        setPet(prev => prev ? {
          ...prev,
          status: petStatus,
          conversation: {
            ...prev.conversation,
            messages: [...prev.conversation.messages, message]
          }
        } : null)
      }
    } catch (error) {
      notification.error({
        message: '发送失败',
        description: String(error)
      })
    } finally {
      setChatting(false)
    }
  }

  // 处理唤醒
  const handleWakeUp = async () => {
    if (!agentId) return
    try {
      const response = await petsApi.wakeUp(agentId)
      if (response.success && response.data) {
        const newStatus = response.data
        notification.info({
          message: '宠物醒来了',
          description: '它揉揉眼睛，还有点迷糊...'
        })
        setPet(prev => prev ? { ...prev, status: newStatus } : null)
      }
    } catch (error) {
      notification.error({
        message: '唤醒失败',
        description: String(error)
      })
    }
  }

  if (loading || !pet) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  const { status, interactions, dailyTasks, achievements } = pet

  return (
    <div>
      {/* 头部 */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/pets')}>
          返回
        </Button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>
            {MOOD_CONFIG[status.mood]?.icon || '🐾'} {status.name}
          </h2>
          <div style={{ color: '#666', marginTop: 4 }}>
            <Tag color="blue">Lv.{status.level}</Tag>
            <Tag>{STAGE_NAMES[status.stage]}</Tag>
            <Tag color={MOOD_CONFIG[status.mood]?.color}>{MOOD_CONFIG[status.mood]?.text}</Tag>
            {status.isSleeping && (
              <Button size="small" type="primary" onClick={handleWakeUp}>
                叫醒它
              </Button>
            )}
          </div>
        </div>
        <Statistic
          title="亲密度"
          value={status.affection}
          suffix="/100"
          prefix={<HeartFilled style={{ color: '#ff4d4f' }} />}
        />
      </div>

      {/* 宠物形象区域 */}
      <Card style={{ marginBottom: 24, textAlign: 'center' }}>
        <div
          style={{
            fontSize: 150,
            padding: '40px 0',
            background: `linear-gradient(135deg, ${MOOD_CONFIG[status.mood]?.color || '#ccc'}10, ${MOOD_CONFIG[status.mood]?.color || '#ccc'}30)`,
            borderRadius: 16
          }}
        >
          {status.isSleeping ? '💤' : MOOD_CONFIG[status.mood]?.icon || '🐾'}
        </div>
        {status.isSleeping && (
          <div style={{ marginTop: 16, color: '#666' }}>
            😴 {status.name}正在睡觉，不要打扰它哦～
          </div>
        )}
      </Card>

      {/* 状态面板 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Tooltip title="饥饿度">
              <div>
                <div style={{ marginBottom: 8 }}>
                  <FireFilled style={{ color: '#faad14' }} /> 饥饿度
                </div>
                <Progress
                  percent={status.hunger}
                  strokeColor={status.hunger < 30 ? '#ff4d4f' : '#faad14'}
                  status={status.hunger < 30 ? 'exception' : 'active'}
                />
              </div>
            </Tooltip>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Tooltip title="心情值">
              <div>
                <div style={{ marginBottom: 8 }}>
                  <SmileFilled style={{ color: '#52c41a' }} /> 心情值
                </div>
                <Progress
                  percent={status.happiness}
                  strokeColor="#52c41a"
                />
              </div>
            </Tooltip>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Tooltip title="精力值">
              <div>
                <div style={{ marginBottom: 8 }}>
                  <StarFilled style={{ color: '#722ed1' }} /> 精力值
                </div>
                <Progress
                  percent={status.energy}
                  strokeColor="#722ed1"
                />
              </div>
            </Tooltip>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Tooltip title="健康值">
              <div>
                <div style={{ marginBottom: 8 }}>
                  <MedicineBoxFilled style={{ color: status.health < 50 ? '#ff4d4f' : '#13c2c2' }} /> 健康值
                </div>
                <Progress
                  percent={status.health}
                  strokeColor={status.health < 50 ? '#ff4d4f' : '#13c2c2'}
                  status={status.health < 50 ? 'exception' : 'active'}
                />
              </div>
            </Tooltip>
          </Card>
        </Col>
      </Row>

      {/* 标签页 */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key)
          setSearchParams({ tab: key })
        }}
      >
        {/* 互动 */}
        <TabPane tab="🎮 互动" key="interact">
          <Row gutter={[16, 16]}>
            {['feed', 'play', 'train', 'pet', 'clean', 'sleep'].map((type) => {
              const config = INTERACTION_NAMES[type]
              const disabled = status.isSleeping && type !== 'sleep'
              return (
                <Col xs={12} sm={8} md={6} lg={4} key={type}>
                  <Card
                    hoverable={!disabled}
                    onClick={() => !disabled && handleInteract(type)}
                    style={{
                      textAlign: 'center',
                      opacity: disabled ? 0.5 : 1,
                      cursor: disabled ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <div style={{ fontSize: 40, marginBottom: 8 }}>{config.icon}</div>
                    <div>{config.name}</div>
                  </Card>
                </Col>
              )
            })}
          </Row>

          {/* 每日任务 */}
          <Card title="📋 每日任务" style={{ marginTop: 24 }}>
            <List
              dataSource={dailyTasks}
              renderItem={task => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{task.description}</span>
                        {task.completed ? (
                          <Tag color="success">已完成</Tag>
                        ) : (
                          <Tag>{task.currentCount}/{task.targetCount}</Tag>
                        )}
                      </div>
                    }
                    description={
                      <Progress
                        percent={(task.currentCount / task.targetCount) * 100}
                        size="small"
                        showInfo={false}
                      />
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </TabPane>

        {/* 聊天 */}
        <TabPane tab="💬 聊天" key="chat">
          <Card>
            <div
              style={{
                height: 400,
                overflowY: 'auto',
                padding: 16,
                background: '#f5f5f5',
                borderRadius: 8,
                marginBottom: 16
              }}
            >
              {pet.conversation.messages.length === 0 ? (
                <Empty description="开始和宠物聊天吧！" />
              ) : (
                <List
                  dataSource={pet.conversation.messages}
                  renderItem={(msg: PetChatMessage) => (
                    <List.Item
                      style={{
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        borderBottom: 'none'
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '70%',
                          padding: '8px 16px',
                          borderRadius: 16,
                          background: msg.role === 'user' ? '#1890ff' : '#fff',
                          color: msg.role === 'user' ? '#fff' : '#333',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                      >
                        {msg.content}
                      </div>
                    </List.Item>
                  )}
                />
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <TextArea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="和宠物说点什么..."
                autoSize={{ minRows: 2, maxRows: 4 }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault()
                    handleChat()
                  }
                }}
                disabled={status.isSleeping}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleChat}
                loading={chatting}
                disabled={!chatMessage.trim() || status.isSleeping}
              >
                发送
              </Button>
            </div>
          </Card>
        </TabPane>

        {/* 成长 */}
        <TabPane tab="📈 成长" key="growth">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card title="基础属性">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic title="等级" value={status.level} suffix={`/100`} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="经验值" value={status.experience} suffix={`/${status.experienceToNext}`} />
                  </Col>
                </Row>
                <Progress
                  percent={(status.experience / status.experienceToNext) * 100}
                  status="active"
                  style={{ marginTop: 16 }}
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="能力值">
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Statistic title="智力" value={status.intelligence} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="力量" value={status.strength} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="敏捷" value={status.agility} />
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          <Card title="性格" style={{ marginTop: 16 }}>
            <div>
              <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>
                {status.personality.type === 'cheerful' && '☀️ 活泼开朗'}
                {status.personality.type === 'calm' && '🌊 温和安静'}
                {status.personality.type === 'curious' && '🔍 好奇探索'}
                {status.personality.type === 'stubborn' && '💪 倔强忠诚'}
                {status.personality.type === 'gentle' && '🌸 温柔体贴'}
              </Tag>
            </div>
            <div style={{ marginTop: 16 }}>
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <div>社交性: <Progress percent={status.personality.traits.sociability} size="small" /></div>
                </Col>
                <Col span={12}>
                  <div>好奇心: <Progress percent={status.personality.traits.curiosity} size="small" /></div>
                </Col>
                <Col span={12}>
                  <div>独立性: <Progress percent={status.personality.traits.independence} size="small" /></div>
                </Col>
                <Col span={12}>
                  <div>活泼度: <Progress percent={status.personality.traits.playfulness} size="small" /></div>
                </Col>
              </Row>
            </div>
          </Card>
        </TabPane>

        {/* 成就 */}
        <TabPane tab="🏆 成就" key="achievements">
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
            dataSource={achievements}
            renderItem={achievement => (
              <List.Item>
                <Card
                  style={{
                    opacity: achievement.unlocked ? 1 : 0.6,
                    background: achievement.unlocked ? '#f6ffed' : '#fafafa'
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>
                      {achievement.unlocked ? '🏆' : '🔒'}
                    </div>
                    <div style={{ fontWeight: 'bold' }}>{achievement.name}</div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                      {achievement.description}
                    </div>
                    {achievement.unlocked ? (
                      <Tag color="success" style={{ marginTop: 8 }}>
                        已解锁 {achievement.unlockedAt && new Date(achievement.unlockedAt).toLocaleDateString()}
                      </Tag>
                    ) : (
                      <div style={{ marginTop: 8 }}>
                        <Progress
                          percent={(achievement.progress / achievement.targetProgress) * 100}
                          size="small"
                          format={() => `${achievement.progress}/${achievement.targetProgress}`}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              </List.Item>
            )}
          />
        </TabPane>

        {/* 记忆活跃度 */}
        <TabPane tab="📊 工作记录" key="work">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card>
                <Statistic
                  title="7日平均活跃度"
                  value={memoryStats?.averageScore || 0}
                  suffix="分"
                  prefix={<RiseOutlined />}
                  valueStyle={{ color: (memoryStats?.averageScore || 0) >= 60 ? '#52c41a' : '#faad14' }}
                />
                <Progress
                  percent={memoryStats?.averageScore || 0}
                  status={(memoryStats?.averageScore || 0) >= 60 ? 'success' : 'active'}
                  style={{ marginTop: 16 }}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card>
                <Statistic
                  title="累计获得好感度"
                  value={memoryStats?.totalAffectionEarned || 0}
                  prefix={<HeartFilled style={{ color: '#ff4d4f' }} />}
                />
                <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                  通过工作记忆自动获得
                </div>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card>
                <Statistic
                  title="累计获得经验值"
                  value={memoryStats?.totalExperienceEarned || 0}
                  prefix={<StarFilled style={{ color: '#722ed1' }} />}
                />
                <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                  共同成长的时间
                </div>
              </Card>
            </Col>
          </Row>

          <Card
            title="📈 近7天活跃度趋势"
            style={{ marginTop: 16 }}
            extra={
              <Button
                icon={<SyncOutlined spin={evaluating} />}
                onClick={handleEvaluate}
                loading={evaluating}
              >
                立即评估
              </Button>
            }
          >
            {loadingStats ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin />
              </div>
            ) : memoryStats && memoryStats.dates.length > 0 ? (
              <div>
                <Row gutter={[16, 16]}>
                  {memoryStats.dates.map((date, index) => {
                    const score = memoryStats.activityScores[index] || 0;
                    return (
                      <Col span={24} key={date}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{ width: 100, color: '#666' }}>
                            {new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                          </div>
                          <div style={{ flex: 1 }}>
                            <Progress
                              percent={score}
                              strokeColor={score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f'}
                              format={() => `${score}分`}
                            />
                          </div>
                          <div style={{ width: 60, textAlign: 'right' }}>
                            {score >= 80 && <Tag color="success">优秀</Tag>}
                            {score >= 60 && score < 80 && <Tag color="warning">良好</Tag>}
                            {score > 0 && score < 60 && <Tag>一般</Tag>}
                            {score === 0 && <Tag color="default">无记录</Tag>}
                          </div>
                        </div>
                      </Col>
                    )
                  })}
                </Row>

                <div style={{ marginTop: 24, padding: 16, background: '#f6ffed', borderRadius: 8 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                    <FileTextFilled /> 评估说明
                  </div>
                  <ul style={{ color: '#666', paddingLeft: 20 }}>
                    <li>系统每天自动分析agent的记忆文件变化</li>
                    <li>根据新增内容量、记忆条目数、修改频率计算活跃度</li>
                    <li>活跃度越高，宠物获得的好感度和经验值奖励越多</li>
                    <li>评分 ≥80分：优秀 | ≥60分：良好 | {'<'}60分：一般</li>
                  </ul>
                </div>
              </div>
            ) : (
              <Empty
                description="暂无记忆统计数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" onClick={handleEvaluate}>
                  开始首次评估
                </Button>
              </Empty>
            )}
          </Card>
        </TabPane>

        {/* 回忆 */}
        <TabPane tab="📖 回忆" key="memory">
          <Timeline mode="left">
            {interactions.slice(0, 20).map((interaction: Interaction) => (
              <Timeline.Item
                key={interaction.id}
                label={new Date(interaction.timestamp).toLocaleString()}
                dot={<ClockCircleOutlined />}
              >
                <div>
                  <span style={{ fontSize: 20, marginRight: 8 }}>
                    {INTERACTION_NAMES[interaction.type]?.icon}
                  </span>
                  {INTERACTION_NAMES[interaction.type]?.name}
                  {interaction.note && (
                    <Tag color="gold" style={{ marginLeft: 8 }}>{interaction.note}</Tag>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  {interaction.effects.map(e => `${e.reason} +${e.delta}`).join('，')}
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        </TabPane>
      </Tabs>
    </div>
  )
}
