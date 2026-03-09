import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from 'antd'
import Sidebar from './components/Sidebar'
import AgentList from './pages/AgentList'
import AgentDetail from './pages/AgentDetail'
import AgentCreate from './pages/AgentCreate'
import Monitoring from './pages/Monitoring'
import Settings from './pages/Settings'

const { Content, Sider, Header } = Layout

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>🐾 ClawDeck</h1>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Sidebar />
        </Sider>
        <Content style={{ padding: '24px', overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/agents" replace />} />
            <Route path="/agents" element={<AgentList />} />
            <Route path="/agents/create" element={<AgentCreate />} />
            <Route path="/agents/:id" element={<AgentDetail />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
