import { useNavigate, useLocation } from 'react-router-dom'
import { Menu } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  TeamOutlined,
  DashboardOutlined,
  SettingOutlined,
  PlusOutlined,
  ShoppingOutlined,
  HeartFilled
} from '@ant-design/icons'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const menuItems = [
    {
      key: '/pets',
      icon: <HeartFilled style={{ color: '#ff4d4f' }} />,
      label: '🐾 我的宠物'
    },
    {
      key: '/skills',
      icon: <ShoppingOutlined />,
      label: t('nav.skillsMarket')
    },
    // {
    //   key: '/bountyclaw',
    //   icon: <DollarOutlined />,
    //   label: '🦞 龙虾众包'
    // },
    {
      key: '/agents',
      icon: <TeamOutlined />,
      label: '高级: Agent管理'
    },
    {
      key: '/agents/create',
      icon: <PlusOutlined />,
      label: '高级: 创建Agent'
    },
    {
      key: '/monitoring',
      icon: <DashboardOutlined />,
      label: t('nav.monitoring')
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: t('nav.systemSettings')
    }
  ]

  // 处理子路由匹配
  const selectedKey = menuItems
    .find(item => item.key && location.pathname.startsWith(item.key)
  )?.key || '/pets'

  return (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      style={{ height: '100%', borderRight: 0 }}
      items={menuItems}
      onClick={({ key }) => navigate(key)}
    />
  )
}
