import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import {
  Card,
  Input,
  Button,
  List,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Select,
  Modal,
  Descriptions,
  message,
  Spin,
  Empty,
  Badge,
  Tooltip,
  Divider,
  Tabs
} from 'antd'
import {
  DownloadOutlined,
  StarOutlined,
  UserOutlined,
  TagOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  ShoppingOutlined
} from '@ant-design/icons'
import { skillsApi } from '../api/skills'
import { agentsApi } from '../api/agents'
import type { Skill } from '../../../shared/types'

const { Title, Text, Paragraph } = Typography
const { Search } = Input
const { Option } = Select
const { TabPane } = Tabs

export default function SkillsMarket() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory] = useState<string>('all')
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false)
  const [targetAgentId, setTargetAgentId] = useState<string>('')

  // 获取 Skills 列表
  const { data: skillsData, isLoading: isLoadingSkills } = useQuery(
    ['skills', selectedCategory],
    () => skillsApi.getAll(100, 'downloads'),
    { refetchInterval: 60000 }
  )

  // 获取已安装的 Skills
  const { data: installedData } = useQuery(
    'installedSkills',
    () => skillsApi.getInstalled(),
    { refetchInterval: 10000 }
  )

  // 获取分类列表
  useQuery(
    'skillCategories',
    () => skillsApi.getCategories()
  )

  // 获取 Agent 列表（用于选择安装目标）
  const { data: agentsData } = useQuery(
    'agents',
    () => agentsApi.getAll()
  )

  // 基础搜索
  const searchMutation = useMutation(
    (query: string) => skillsApi.search(query, 50),
    {
      onSuccess: (data) => {
        if (data.success && data.data) {
          setFilteredSkills(data.data)
        }
      },
      onError: (error: Error) => {
        message.error(error.message)
      }
    }
  )

  // 安装 Skill
  const installMutation = useMutation(
    ({ slug, agentId }: { slug: string; agentId?: string }) =>
      skillsApi.install({ slug, targetAgentId: agentId }),
    {
      onSuccess: (data) => {
        if (data.success && data.data?.success) {
          message.success(data.data.message || t('skills.installSuccess'))
          queryClient.invalidateQueries('installedSkills')
          setIsInstallModalOpen(false)
        } else {
          message.error(data.data?.error || t('skills.installFailed'))
        }
      },
      onError: (error: Error) => {
        message.error(error.message)
      }
    }
  )

  // 卸载 Skill
  const uninstallMutation = useMutation(
    (slug: string) => skillsApi.uninstall(slug),
    {
      onSuccess: () => {
        message.success(t('skills.uninstallSuccess'))
        queryClient.invalidateQueries('installedSkills')
      },
      onError: (error: Error) => {
        message.error(error.message)
      }
    }
  )

  const [filteredSkills, setFilteredSkills] = useState<Skill[]>([])

  // 初始化 filteredSkills
  useState(() => {
    if (skillsData?.success && skillsData.data) {
      setFilteredSkills(skillsData.data)
    }
  })

  // 当 skillsData 更新时更新 filteredSkills
  useState(() => {
    if (skillsData?.success && skillsData.data && !searchQuery) {
      setFilteredSkills(skillsData.data)
    }
  })

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      if (skillsData?.success && skillsData.data) {
        setFilteredSkills(skillsData.data)
      }
      return
    }

    searchMutation.mutate(searchQuery)
  }

  const handleSkillClick = (skill: Skill) => {
    setSelectedSkill(skill)
    setIsDetailModalOpen(true)
  }

  const handleInstall = (skill: Skill) => {
    setSelectedSkill(skill)
    setIsInstallModalOpen(true)
  }

  const confirmInstall = () => {
    if (selectedSkill) {
      installMutation.mutate({
        slug: selectedSkill.slug,
        agentId: targetAgentId || undefined
      })
    }
  }

  const isInstalled = (slug: string) => {
    return installedData?.data?.some(s => s.slug === slug) ?? false
  }

  const renderSkillCard = (skill: Skill) => {
    const installed = isInstalled(skill.slug)

    return (
      <Card
        key={skill.slug}
        className="skill-card"
        hoverable
        style={{ marginBottom: 16, position: 'relative' }}
        onClick={() => handleSkillClick(skill)}
        actions={[
          <Tooltip title={t('skills.viewDetails')}>
            <Button type="link" icon={<InfoCircleOutlined />}>
              {t('skills.details')}
            </Button>
          </Tooltip>,
          installed ? (
            <Tooltip title={t('skills.alreadyInstalled')}>
              <Button type="link" icon={<CheckCircleOutlined />} disabled>
                {t('skills.installed')}
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title={t('skills.install')}>
              <Button
                type="link"
                icon={<DownloadOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  handleInstall(skill)
                }}
              >
                {t('skills.install')}
              </Button>
            </Tooltip>
          )
        ]}
      >
        {skill.isOfficial && (
          <Badge.Ribbon text={t('skills.official')} color="blue" />
        )}
        <div style={{ paddingTop: skill.isOfficial ? 20 : 0 }}>
          <Row justify="space-between" align="top">
            <Col flex="auto">
              <Title level={5} style={{ marginBottom: 8 }}>
                {skill.name}
              </Title>
            </Col>
          </Row>

          <Paragraph ellipsis={{ rows: 2 }} type="secondary" style={{ minHeight: 44 }}>
            {skill.description || t('skills.noDescription')}
          </Paragraph>

          <Space wrap size="small" style={{ marginTop: 8 }}>
            {skill.category && (
              <Tag icon={<AppstoreOutlined />} color="blue">
                {skill.category}
              </Tag>
            )}
            {skill.tags?.slice(0, 3).map(tag => (
              <Tag key={tag} icon={<TagOutlined />}>
                {tag}
              </Tag>
            ))}
            {skill.tags && skill.tags.length > 3 && (
              <Tag>+{skill.tags.length - 3}</Tag>
            )}
          </Space>

          <Divider style={{ margin: '12px 0' }} />

          <Row justify="space-between">
            <Col>
              <Space size="small">
                {skill.author && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <UserOutlined /> {skill.author}
                  </Text>
                )}
              </Space>
            </Col>
            <Col>
              <Space size="small">
                {skill.stars !== undefined && skill.stars > 0 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <StarOutlined /> {skill.stars}
                  </Text>
                )}
                {skill.downloads !== undefined && skill.downloads > 0 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <DownloadOutlined /> {skill.downloads}
                  </Text>
                )}
              </Space>
            </Col>
          </Row>

          {skill.version && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              v{skill.version}
            </Text>
          )}
        </div>
      </Card>
    )
  }

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3}>
            <ShoppingOutlined style={{ marginRight: 8 }} />
            {t('skills.marketTitle')}
          </Title>
        </Col>
      </Row>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Search
              placeholder={t('skills.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSearch={handleSearch}
              enterButton
              style={{ width: '100%' }}
              loading={searchMutation.isLoading}
            />
          </Col>
        </Row>
      </Card>

      <Tabs defaultActiveKey="market">
        <TabPane tab={t('skills.tabMarket')} key="market">
          {isLoadingSkills || searchMutation.isLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
            </div>
          ) : filteredSkills.length === 0 ? (
            <Empty description={t('skills.noSkillsFound')} />
          ) : (
            <List
              grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 4 }}
              dataSource={filteredSkills}
              renderItem={(skill) => <List.Item>{renderSkillCard(skill)}</List.Item>}
            />
          )}
        </TabPane>

        <TabPane
          tab={
            <Badge count={installedData?.data?.length || 0} offset={[10, 0]}>
              {t('skills.tabInstalled')}
            </Badge>
          }
          key="installed"
        >
          {!installedData?.data || installedData.data.length === 0 ? (
            <Empty description={t('skills.noInstalledSkills')} />
          ) : (
            <List
              grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 4 }}
              dataSource={installedData.data}
              renderItem={(skill) => (
                <List.Item>
                  <Card
                    key={skill.slug}
                    style={{ marginBottom: 16 }}
                    actions={[
                      <Button
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => uninstallMutation.mutate(skill.slug)}
                      >
                        {t('skills.uninstall')}
                      </Button>
                    ]}
                  >
                    <Title level={5}>{skill.name || skill.slug}</Title>
                    <Text type="secondary">{skill.slug}</Text>
                    {skill.version && (
                      <div>
                        <Tag>v{skill.version}</Tag>
                      </div>
                    )}
                    {skill.installedAt && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {t('skills.installedAt')}: {new Date(skill.installedAt).toLocaleDateString()}
                      </Text>
                    )}
                  </Card>
                </List.Item>
              )}
            />
          )}
        </TabPane>
      </Tabs>

      {/* Skill 详情 Modal */}
      <Modal
        title={t('skills.skillDetails')}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            {t('common.close')}
          </Button>,
          selectedSkill && !isInstalled(selectedSkill.slug) && (
            <Button
              key="install"
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => {
                setIsDetailModalOpen(false)
                handleInstall(selectedSkill)
              }}
            >
              {t('skills.install')}
            </Button>
          )
        ]}
        width={700}
      >
        {selectedSkill && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label={t('skills.name')}>
              {selectedSkill.name}
            </Descriptions.Item>
            <Descriptions.Item label={t('skills.slug')}>
              {selectedSkill.slug}
            </Descriptions.Item>
            {selectedSkill.description && (
              <Descriptions.Item label={t('skills.description')}>
                {selectedSkill.description}
              </Descriptions.Item>
            )}
            {selectedSkill.version && (
              <Descriptions.Item label={t('skills.version')}>
                {selectedSkill.version}
              </Descriptions.Item>
            )}
            {selectedSkill.author && (
              <Descriptions.Item label={t('skills.author')}>
                {selectedSkill.author}
              </Descriptions.Item>
            )}
            {selectedSkill.category && (
              <Descriptions.Item label={t('skills.category')}>
                <Tag color="blue">{selectedSkill.category}</Tag>
              </Descriptions.Item>
            )}
            {selectedSkill.tags && selectedSkill.tags.length > 0 && (
              <Descriptions.Item label={t('skills.tags')}>
                <Space wrap>
                  {selectedSkill.tags.map(tag => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            )}
            {selectedSkill.license && (
              <Descriptions.Item label={t('skills.license')}>
                {selectedSkill.license}
              </Descriptions.Item>
            )}
            {(selectedSkill.downloads !== undefined || selectedSkill.stars !== undefined) && (
              <Descriptions.Item label={t('skills.stats')}>
                <Space>
                  {selectedSkill.downloads !== undefined && (
                    <Text><DownloadOutlined /> {selectedSkill.downloads} {t('skills.downloads')}</Text>
                  )}
                  {selectedSkill.stars !== undefined && (
                    <Text><StarOutlined /> {selectedSkill.stars} {t('skills.stars')}</Text>
                  )}
                </Space>
              </Descriptions.Item>
            )}
            {selectedSkill.repository && (
              <Descriptions.Item label={t('skills.repository')}>
                <a href={selectedSkill.repository} target="_blank" rel="noopener noreferrer">
                  {selectedSkill.repository}
                </a>
              </Descriptions.Item>
            )}
            {selectedSkill.homepage && (
              <Descriptions.Item label={t('skills.homepage')}>
                <a href={selectedSkill.homepage} target="_blank" rel="noopener noreferrer">
                  {selectedSkill.homepage}
                </a>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* 安装 Modal */}
      <Modal
        title={t('skills.installSkill')}
        open={isInstallModalOpen}
        onCancel={() => setIsInstallModalOpen(false)}
        onOk={confirmInstall}
        confirmLoading={installMutation.isLoading}
        okText={t('skills.install')}
      >
        {selectedSkill && (
          <div>
            <p>{t('skills.installConfirm', { name: selectedSkill.name || selectedSkill.slug })}</p>

            <div style={{ marginTop: 16 }}>
              <label>{t('skills.targetAgent')} ({t('skills.optional')}):</label>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                placeholder={t('skills.selectAgent')}
                value={targetAgentId}
                onChange={setTargetAgentId}
                allowClear
              >
                {agentsData?.data?.map(agent => (
                  <Option key={agent.id} value={agent.id}>
                    {agent.emoji} {agent.displayName} ({agent.name})
                  </Option>
                ))}
              </Select>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('skills.targetAgentHint')}
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
