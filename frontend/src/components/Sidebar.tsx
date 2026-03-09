import { useNavigate, useLocation } from 'react-router-dom'
import { Menu } from 'antd'
import {
  TeamOutlined,
  DashboardOutlined,
  SettingOutlined,
  PlusOutlined
} from '@ant-design/icons'

const menuItems = [
  {
    key: '/agents',
    icon: <TeamOutlined />,
    label: 'Agent 管理'
  },
  {
    key: '/agents/create',
    icon: <PlusOutlined />,
    label: '创建 Agent'
  },
  {
    key: '/monitoring',
    icon: <DashboardOutlined />,
    label: '实时监控'
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '系统设置'
  }
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()

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
