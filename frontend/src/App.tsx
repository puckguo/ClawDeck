import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout, Select, Space, ConfigProvider, App } from 'antd'
import { useTranslation } from 'react-i18next'
import { GlobalOutlined } from '@ant-design/icons'
import Sidebar from './components/Sidebar'
import AgentList from './pages/AgentList'
import AgentDetail from './pages/AgentDetail'
import AgentCreate from './pages/AgentCreate'
import Monitoring from './pages/Monitoring'
import Settings from './pages/Settings'
import SkillsMarket from './pages/SkillsMarket'
import BountyClaw from './pages/BountyClaw'
import PetHome from './pages/PetHome'
import PetDetail from './pages/PetDetail'
import PetA2UIPage from './pages/PetA2UIPage'

const { Content, Sider, Header } = Layout

function App() {
  const { i18n } = useTranslation()

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value)
  }

  return (
    <ConfigProvider>
      <App>
        <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>🐾 OpenClaw Pet - 数字宠物养成</h1>
        <Space>
          {/* <Link to="/bountyclaw">
            <Button type="primary" icon={<ShoppingOutlined />} style={{ marginRight: 16 }}>
              🦞 龙虾众包
            </Button>
          </Link> */}
          <GlobalOutlined />
          <Select
            value={i18n.language}
            onChange={handleLanguageChange}
            style={{ width: 120 }}
            options={[
              { value: 'zh', label: '中文' },
              { value: 'en', label: 'English' }
            ]}
          />
        </Space>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Sidebar />
        </Sider>
        <Content style={{ padding: '24px', overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/pets" replace />} />
            {/* 宠物养成系统路由 */}
            <Route path="/pets" element={<PetHome />} />
            <Route path="/pets/:id" element={<PetDetail />} />
            <Route path="/pets/:id/canvas" element={<PetA2UIPage />} />
            {/* 原有Agent管理路由（保留作为高级功能） */}
            <Route path="/agents" element={<AgentList />} />
            <Route path="/agents/create" element={<AgentCreate />} />
            <Route path="/agents/:id" element={<AgentDetail />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/skills" element={<SkillsMarket />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/bountyclaw" element={<BountyClaw />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
      </App>
    </ConfigProvider>
  )
}

export default App
