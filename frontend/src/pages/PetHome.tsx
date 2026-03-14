/**
 * 宠物养成系统主页面
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Row,
  Col,
  Button,
  Badge,
  Progress,
  Tooltip,
  Empty,
  Spin,
  Tag,
  notification,
  Space
} from 'antd'
import {
  HeartFilled,
  AlertFilled,
  MessageFilled,
  RobotOutlined
} from '@ant-design/icons'
import { petsApi } from '../api/pets'
import type { PetSummary } from '../../../shared/types'

const { Meta } = Card

// 心情对应的表情和颜色
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

export default function PetHome() {
  const navigate = useNavigate()
  const [pets, setPets] = useState<PetSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [petImages, setPetImages] = useState<Record<string, string>>({})

  // 获取宠物列表
  const fetchPets = async () => {
    try {
      setLoading(true)
      const response = await petsApi.getAll()
      if (response.success && response.data) {
        setPets(response.data)
        // 加载每个宠物的图片
        response.data.forEach(async (pet) => {
          try {
            const imgResponse = await petsApi.getImages(pet.agentId)
            if (imgResponse.success && imgResponse.data && imgResponse.data.history && imgResponse.data.history.length > 0) {
              const latest = imgResponse.data.history[0]
              const filename = latest.localPath?.split(/[\\/]/).pop() || ''
              setPetImages(prev => ({
                ...prev,
                [pet.agentId]: petsApi.getImageFileUrl(pet.agentId, filename)
              }))
            }
          } catch (e) {
            console.log('Failed to load image for', pet.agentId)
          }
        })
      }
    } catch (error) {
      notification.error({
        message: '获取宠物列表失败',
        description: String(error)
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPets()
    // 每30秒刷新一次
    const interval = setInterval(fetchPets, 30000)
    return () => clearInterval(interval)
  }, [])

  // 快速互动
  const quickInteract = async (agentId: string, type: string) => {
    try {
      const response = await petsApi.interact(agentId, type)
      if (response.success && response.data) {
        const { messages } = response.data
        if (messages.length > 0) {
          notification.success({
            message: messages[0],
            description: messages.slice(1).join('，')
          })
        }
        fetchPets()
      }
    } catch (error) {
      notification.error({
        message: '互动失败',
        description: String(error)
      })
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>🐾 我的宠物</h2>
        <p style={{ color: '#666', margin: '8px 0 0 0' }}>
          照顾你的数字伙伴，与它建立深厚的情感连接
        </p>
      </div>

      {pets.length === 0 ? (
        <Empty
          description="还没有Agent宠物"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#666', marginBottom: 16 }}>
              每个Agent都会自动拥有一个数字宠物伙伴
            </p>
            <Button
              type="primary"
              icon={<RobotOutlined />}
              onClick={() => navigate('/agents')}
            >
              去创建Agent
            </Button>
          </div>
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {pets.map(pet => (
            <Col xs={24} sm={12} lg={8} xl={6} key={pet.agentId}>
              <Badge.Ribbon
                text={pet.needsAttention ? '需要关注' : undefined}
                color="red"
                style={{ display: pet.needsAttention ? 'block' : 'none' }}
              >
                <Card
                  hoverable
                  onClick={() => navigate(`/pets/${pet.agentId}/canvas`)}
                  cover={
                    <div
                      style={{
                        height: 180,
                        background: `linear-gradient(135deg, ${MOOD_CONFIG[pet.mood]?.color || '#ccc'}20, ${MOOD_CONFIG[pet.mood]?.color || '#ccc'}40)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 80,
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {petImages[pet.agentId] ? (
                        <img
                          src={petImages[pet.agentId]}
                          alt={pet.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        pet.isSleeping ? '💤' : MOOD_CONFIG[pet.mood]?.icon || '🐾'
                      )}
                      {pet.isSleeping && (
                        <div style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: '#722ed1',
                          color: '#fff',
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 12
                        }}>
                          睡觉中
                        </div>
                      )}
                    </div>
                  }
                  actions={[
                    <Tooltip title="喂食" key="feed">
                      <Button
                        type="text"
                        icon={<span style={{ fontSize: 20 }}>🍖</span>}
                        onClick={(e) => {
                          e.stopPropagation()
                          quickInteract(pet.agentId, 'feed')
                        }}
                      />
                    </Tooltip>,
                    <Tooltip title="玩耍" key="play">
                      <Button
                        type="text"
                        icon={<span style={{ fontSize: 20 }}>🎾</span>}
                        onClick={(e) => {
                          e.stopPropagation()
                          quickInteract(pet.agentId, 'play')
                        }}
                      />
                    </Tooltip>,
                    <Tooltip title="抚摸" key="pet">
                      <Button
                        type="text"
                        icon={<span style={{ fontSize: 20 }}>✋</span>}
                        onClick={(e) => {
                          e.stopPropagation()
                          quickInteract(pet.agentId, 'pet')
                        }}
                      />
                    </Tooltip>,
                    <Tooltip title="聊天" key="chat">
                      <Button
                        type="text"
                        icon={<MessageFilled style={{ color: '#1890ff' }} />}
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/pets/${pet.agentId}/canvas`)
                        }}
                      />
                    </Tooltip>
                  ]}
                >
                  <Meta
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{pet.name}</span>
                        <Tag color="blue">Lv.{pet.level}</Tag>
                      </div>
                    }
                    description={
                      <div>
                        <div style={{ marginBottom: 8 }}>
                          <Tag color={MOOD_CONFIG[pet.mood]?.color}>{STAGE_NAMES[pet.stage]}</Tag>
                          <Tag color={MOOD_CONFIG[pet.mood]?.color}>{MOOD_CONFIG[pet.mood]?.text}</Tag>
                        </div>

                        {/* 状态条 */}
                        <Space direction="vertical" style={{ width: '100%' }} size={4}>
                          <Tooltip title="亲密度">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <HeartFilled style={{ color: '#ff4d4f', fontSize: 14 }} />
                              <Progress
                                percent={pet.affection}
                                size="small"
                                strokeColor="#ff4d4f"
                                showInfo={false}
                                style={{ flex: 1 }}
                              />
                              <span style={{ fontSize: 12, color: '#666', minWidth: 30 }}>{pet.affection}</span>
                            </div>
                          </Tooltip>
                        </Space>

                        {/* 提示信息 */}
                        {pet.needsAttention && (
                          <div style={{ marginTop: 8, color: '#ff4d4f', fontSize: 12 }}>
                            <AlertFilled /> 需要主人的关爱
                          </div>
                        )}
                      </div>
                    }
                  />
                </Card>
              </Badge.Ribbon>
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}
