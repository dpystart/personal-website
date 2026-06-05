import { useState, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Switch, theme } from 'antd'
import {
  FileImageOutlined,
  ToolOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons'

const { Sider, Header, Content } = Layout

interface AppLayoutProps {
  children: ReactNode
  isDark: boolean
  onThemeChange: (dark: boolean) => void
}

const menuItems = [
  { key: '/text-tools', icon: <ToolOutlined />, label: '文本工具' },
  { key: '/ocr', icon: <FileImageOutlined />, label: '图片转文字' },
  { key: '/crontab', icon: <ClockCircleOutlined />, label: 'Crontab' },
  { key: '/scripts', icon: <CodeOutlined />, label: '脚本管理' },
]

export default function AppLayout({ children, isDark, onThemeChange }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = theme.useToken()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 深色侧边栏 - 始终深色，不随主题变 */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={220}
        breakpoint="lg"
        collapsedWidth={60}
        onBreakpoint={(broken) => setCollapsed(broken)}
        style={{
          background: 'linear-gradient(195deg, #1e293b 0%, #0f172a 100%)',
          overflow: 'auto',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
        }}
      >
        <div style={{
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 24px',
        }}>
          <div style={{
            fontSize: collapsed ? 20 : 22,
            fontWeight: 800,
            letterSpacing: '-0.5px',
            background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {collapsed ? '⚡' : '⚡ DevPilot'}
          </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '8px 12px',
          }}
          theme="dark"
        />
      </Sider>

      <Layout style={{
        background: isDark
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
          : 'linear-gradient(135deg, #e8eaf6 0%, #e3f2fd 50%, #ede7f6 100%)',
        minHeight: '100vh',
      }}>
        <Header style={{
          background: isDark ? 'rgba(15, 20, 35, 0.6)' : 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'saturate(180%) blur(16px)',
          WebkitBackdropFilter: 'saturate(180%) blur(16px)',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 48,
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: 17,
              cursor: 'pointer',
              color: token.colorText,
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 14px',
            borderRadius: 22,
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          }}>
            <SunOutlined style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#f59e0b', fontSize: 15 }} />
            <Switch
              checked={isDark}
              onChange={onThemeChange}
              size="small"
            />
            <MoonOutlined style={{ color: isDark ? '#818cf8' : 'rgba(0,0,0,0.25)', fontSize: 15 }} />
          </div>
        </Header>
        <Content style={{
          margin: '12px 16px 12px 12px',
          padding: 16,
          background: isDark ? 'rgba(15, 20, 35, 0.7)' : 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderRadius: 16,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)'}`,
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)'
            : '0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
          overflow: 'auto',
          height: 'calc(100vh - 72px)',
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
