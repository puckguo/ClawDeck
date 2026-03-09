import { useNavigate, useLocation } from 'react-router-dom'
import { Menu } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  TeamOutlined,
  DashboardOutlined,
  SettingOutlined,
  PlusOutlined
} from '@ant-design/icons'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const menuItems = [
    {
      key: '/agents',
      icon: <TeamOutlined />,
      label: t('nav.agentManagement')
    },
    {
      key: '/agents/create',
      icon: <PlusOutlined />,
      label: t('nav.createAgent')
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
  const selectedKey = menuItems.find(item =>
    location.pathname.startsWith(item.key)
  )?.key || '/agents'

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
