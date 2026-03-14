/**
 * A2UI 宠物页面
 * 使用Canvas渲染宠物界面
 */
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, notification, Spin, Drawer, List, Tag, Select } from 'antd'
import { ArrowLeftOutlined, MessageOutlined, HistoryOutlined, CameraOutlined, SoundOutlined, PictureOutlined } from '@ant-design/icons'
import { petsApi } from '../api/pets'
import { a2uiService } from '../services/a2uiService'
import type { PetChatMessage } from '../../../shared/types'

export default function PetA2UIPage() {
  const { id: agentId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasInitializedRef = useRef(false)

  const [pet, setPet] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [chatDrawerVisible, setChatDrawerVisible] = useState(false)
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [chatting, setChatting] = useState(false)
  const [messages, setMessages] = useState<PetChatMessage[]>([])
  const [generatingImage, setGeneratingImage] = useState(false)
  const [ttsVoices, setTTSVoices] = useState<Array<{ id: string; name: string; description: string }>>([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [playingAudio, setPlayingAudio] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [imagesDrawerVisible, setImagesDrawerVisible] = useState(false)
  const [images, setImages] = useState<Array<{ type: string; prompt: string; localPath: string; generatedAt: string }>>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // 加载宠物数据
  const loadPet = async (showLoading = true) => {
    if (!agentId) return

    try {
      if (showLoading) setLoading(true)
      const response = await petsApi.getById(agentId)
      if (response.success && response.data) {
        setPet(response.data)
        // 更新A2UI服务的状态
        a2uiService.updatePetState(response.data.status)
      }
    } catch (error) {
      notification.error({
        message: '获取宠物信息失败',
        description: String(error)
      })
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  // 加载聊天历史
  const loadChatHistory = async () => {
    if (!agentId) return

    try {
      const response = await petsApi.getChatHistory(agentId)
      if (response.success && response.data) {
        setMessages(response.data)
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }

  // 加载TTS音色列表
  const loadTTSVoices = async () => {
    if (!agentId) return
    try {
      const response = await petsApi.getTTSVoices(agentId)
      if (response.success && response.data) {
        setTTSVoices(response.data.voices)
        setSelectedVoice(response.data.currentVoice)
      }
    } catch (error) {
      console.error('Failed to load TTS voices:', error)
    }
  }

  // 播放宠物语音
  const playPetVoice = async (text: string) => {
    if (!agentId || !text) return
    try {
      setPlayingAudio(true)
      const response = await petsApi.textToSpeech(agentId, text, selectedVoice)
      if (response.success && response.data?.audioUrl) {
        if (audioRef.current) {
          audioRef.current.pause()
        }
        audioRef.current = new Audio(response.data.audioUrl)
        audioRef.current.onended = () => setPlayingAudio(false)
        audioRef.current.onerror = () => setPlayingAudio(false)
        await audioRef.current.play()
      }
    } catch (error) {
      console.error('Failed to play TTS:', error)
      setPlayingAudio(false)
    }
  }

  // 加载图片历史
  const loadImages = async () => {
    if (!agentId) return
    try {
      const response = await petsApi.getImages(agentId)
      if (response.success && response.data) {
        setImages(response.data.history || [])
      }
    } catch (error) {
      console.error('Failed to load images:', error)
    }
  }

  // 初始加载
  useEffect(() => {
    loadPet()
    loadChatHistory()
    loadTTSVoices()

    // 定时刷新状态（不显示loading）
    const interval = setInterval(() => {
      loadPet(false)
    }, 5000)

    return () => {
      clearInterval(interval)
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [agentId])

  // 初始化 Canvas（只执行一次）
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas && !canvasInitializedRef.current) {
      canvasInitializedRef.current = true
      a2uiService.initCanvas(canvas)
    }
  }, [])

  // 当 agentId 可用时加载图片
  useEffect(() => {
    if (agentId) {
      a2uiService.setAgentId(agentId)
    }
  }, [agentId])

  // 处理Canvas点击
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const action = a2uiService.handleClick(x, y)
      if (action) {
        handleInteraction(action)
      }
    }

    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [pet])

  // 处理互动
  const handleInteraction = async (type: string) => {
    if (!agentId || !pet) return

    try {
      const response = await petsApi.interact(agentId, type)
      if (response.success && response.data) {
        const { messages: responseMessages } = response.data

        if (responseMessages.length > 0) {
          notification.success({
            message: responseMessages[0],
            description: responseMessages.slice(1).join('，')
          })
        }

        // 刷新状态
        await loadPet()
      }
    } catch (error) {
      notification.error({
        message: '互动失败',
        description: String(error)
      })
    }
  }

  // 处理聊天
  const handleChat = async () => {
    if (!agentId || !chatMessage.trim()) return

    try {
      setChatting(true)
      const response = await petsApi.chat(agentId, chatMessage)

      if (response.success && response.data) {
        setChatMessage('')
        await loadChatHistory()
        await loadPet()
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

  // 生成宠物图片
  const handleGenerateImage = async () => {
    if (!agentId) return

    try {
      setGeneratingImage(true)
      const response = await petsApi.generateImage(agentId, 'status')

      if (response.success && response.data?.success) {
        notification.success({
          message: '图片生成成功',
          description: '宠物形象已更新'
        })
        // 刷新图片
        a2uiService.refreshPetImage()
      } else {
        notification.error({
          message: '图片生成失败',
          description: response.data?.error || '请稍后重试'
        })
      }
    } catch (error) {
      notification.error({
        message: '图片生成失败',
        description: String(error)
      })
    } finally {
      setGeneratingImage(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!pet) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <p>宠物不存在</p>
        <Button onClick={() => navigate('/pets')}>返回</Button>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 120px)', overflow: 'hidden', background: '#f5f5f5' }}>
      {/* Canvas 层 */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: 'pointer'
        }}
      />

      {/* 顶部工具栏 */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          right: 20,
          display: 'flex',
          justifyContent: 'space-between',
          zIndex: 10
        }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/pets')}
          style={{ background: 'rgba(255,255,255,0.9)' }}
        >
          返回
        </Button>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {ttsVoices.length > 0 && (
            <Select
              size="small"
              value={selectedVoice}
              onChange={setSelectedVoice}
              style={{ width: 100 }}
              options={ttsVoices.map(v => ({ value: v.id, label: v.name }))}
              title="选择音色"
            />
          )}
          <Button
            icon={<SoundOutlined />}
            onClick={() => pet?.status?.thought && playPetVoice(pet.status.thought)}
            loading={playingAudio}
            disabled={!pet?.status?.thought}
            style={{ background: 'rgba(255,255,255,0.9)' }}
            title="播放宠物当前想法"
          >
            朗读
          </Button>
          <Button
            icon={<CameraOutlined />}
            onClick={handleGenerateImage}
            loading={generatingImage}
            style={{ background: 'rgba(255,255,255,0.9)' }}
            title="生成当前状态图片"
          >
            拍照
          </Button>
          <Button
            icon={<MessageOutlined />}
            onClick={() => setChatDrawerVisible(true)}
            style={{ background: 'rgba(255,255,255,0.9)' }}
          >
            聊天
          </Button>
          <Button
            icon={<HistoryOutlined />}
            onClick={() => setHistoryDrawerVisible(true)}
            style={{ background: 'rgba(255,255,255,0.9)' }}
          >
            历史
          </Button>
          <Button
            icon={<PictureOutlined />}
            onClick={() => {
              loadImages()
              setImagesDrawerVisible(true)
            }}
            style={{ background: 'rgba(255,255,255,0.9)' }}
          >
            相册
          </Button>
        </div>
      </div>

      {/* 状态面板 */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 20,
          background: 'rgba(255,255,255,0.9)',
          padding: 15,
          borderRadius: 10,
          minWidth: 200
        }}
      >
        <h3 style={{ margin: '0 0 10px 0' }}>{pet.status.name}</h3>
        <Tag color="blue">{pet.status.stage}</Tag>
        <Tag color={pet.status.isSleeping ? 'purple' : 'green'}>
          {pet.status.isSleeping ? '睡觉中' : pet.status.mood}
        </Tag>
        {pet.status.thought && (
          <p style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
            💭 {pet.status.thought}
          </p>
        )}
      </div>

      {/* 互动按钮 */}
      <div
        style={{
          position: 'absolute',
          bottom: 30,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 15,
          zIndex: 10
        }}
      >
        {[
          { type: 'feed', icon: '🍖', label: '喂食', color: '#ff9f43' },
          { type: 'play', icon: '🎾', label: '玩耍', color: '#54a0ff' },
          { type: 'pet', icon: '✋', label: '抚摸', color: '#ff6b6b' },
          { type: 'sleep', icon: '😴', label: '睡觉', color: '#5f27cd' }
        ].map(btn => (
          <Button
            key={btn.type}
            size="large"
            style={{
              background: btn.color,
              color: '#fff',
              border: 'none',
              borderRadius: 25,
              height: 50,
              padding: '0 25px'
            }}
            onClick={() => handleInteraction(btn.type)}
          >
            {btn.icon} {btn.label}
          </Button>
        ))}
      </div>

      {/* 聊天抽屉 */}
      <Drawer
        title="与宠物聊天"
        placement="right"
        width={400}
        onClose={() => setChatDrawerVisible(false)}
        open={chatDrawerVisible}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, overflow: 'auto', marginBottom: 20 }}>
            {messages.slice(-10).map((msg, idx) => (
              <div
                key={idx}
                style={{
                  textAlign: msg.role === 'user' ? 'right' : 'left',
                  marginBottom: 10
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    padding: '8px 12px',
                    borderRadius: 12,
                    background: msg.role === 'user' ? '#1890ff' : '#f0f0f0',
                    color: msg.role === 'user' ? '#fff' : '#333',
                    maxWidth: '80%'
                  }}
                >
                  {msg.content}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleChat()}
              placeholder="输入消息..."
              style={{
                flex: 1,
                padding: '10px 15px',
                borderRadius: 20,
                border: '1px solid #d9d9d9'
              }}
            />
            <Button
              type="primary"
              onClick={handleChat}
              loading={chatting}
            >
              发送
            </Button>
          </div>
        </div>
      </Drawer>

      {/* 历史记录抽屉 */}
      <Drawer
        title="互动历史"
        placement="right"
        width={400}
        onClose={() => setHistoryDrawerVisible(false)}
        open={historyDrawerVisible}
      >
        <List
          dataSource={pet.interactions?.slice(-20).reverse() || []}
          renderItem={(item: any) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <span>
                    {item.type} {new Date(item.timestamp).toLocaleString()}
                  </span>
                }
                description={
                  <div>
                    {item.effects?.map((effect: any, idx: number) => (
                      <Tag key={idx} color={effect.delta > 0 ? 'green' : 'red'}>
                        {effect.attribute}: {effect.delta > 0 ? '+' : ''}{effect.delta}
                      </Tag>
                    ))}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Drawer>

      {/* 图片历史抽屉 */}
      <Drawer
        title="相册"
        placement="right"
        width={600}
        onClose={() => {
          setImagesDrawerVisible(false)
          setSelectedImage(null)
        }}
        open={imagesDrawerVisible}
      >
        {selectedImage ? (
          <div>
            <Button
              onClick={() => setSelectedImage(null)}
              style={{ marginBottom: 16 }}
            >
              ← 返回列表
            </Button>
            <img
              src={selectedImage}
              alt="宠物图片"
              style={{ width: '100%', borderRadius: 8 }}
            />
          </div>
        ) : (
          <List
            grid={{ gutter: 16, column: 2 }}
            dataSource={images}
            renderItem={(item: any) => {
              const filename = item.localPath?.split(/[\\/]/).pop() || ''
              const imageUrl = petsApi.getImageFileUrl(agentId!, filename)
              return (
                <List.Item>
                  <div
                    style={{
                      cursor: 'pointer',
                      borderRadius: 8,
                      overflow: 'hidden',
                      border: '1px solid #eee'
                    }}
                    onClick={() => setSelectedImage(imageUrl)}
                  >
                    <img
                      src={imageUrl}
                      alt={item.prompt || '宠物图片'}
                      style={{
                        width: '100%',
                        height: 150,
                        objectFit: 'cover'
                      }}
                    />
                    <div style={{ padding: 8, fontSize: 12 }}>
                      <Tag color={item.type === 'avatar' ? 'blue' : 'green'}>
                        {item.type === 'avatar' ? '形象' : '状态'}
                      </Tag>
                      <div style={{ marginTop: 4, color: '#666' }}>
                        {item.generatedAt ? new Date(item.generatedAt.replace(' ', 'T')).toLocaleString() : ''}
                      </div>
                    </div>
                  </div>
                </List.Item>
              )
            }}
          />
        )}
      </Drawer>
    </div>
  )
}
