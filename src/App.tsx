import { useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, theme, Spin } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import AppLayout from './components/Layout'

const OCR = lazy(() => import('./pages/OCR'))
const TextTools = lazy(() => import('./pages/TextTools'))
const Scripts = lazy(() => import('./pages/Scripts'))

function App() {
  const [isDark, setIsDark] = useState(false)

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#4f6ef7',
          borderRadius: 10,
          colorBgContainer: isDark ? 'rgba(20, 25, 40, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          colorBgElevated: isDark ? '#1c2237' : '#ffffff',
          colorBorderSecondary: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        },
        components: {
          Menu: {
            itemBorderRadius: 10,
            itemMarginInline: 4,
            itemHeight: 44,
            darkItemBg: 'transparent',
            darkItemSelectedBg: 'rgba(96, 165, 250, 0.15)',
            darkItemHoverBg: 'rgba(255, 255, 255, 0.06)',
          },
          Card: {
            borderRadiusLG: 14,
          },
          Button: {
            borderRadius: 8,
          },
          Input: {
            borderRadius: 8,
          },
        },
      }}
    >
      <AppLayout isDark={isDark} onThemeChange={setIsDark}>
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/text-tools" replace />} />
            <Route path="/text-diff" element={<Navigate to="/text-tools" replace />} />
            <Route path="/ocr" element={<OCR />} />
            <Route path="/text-tools" element={<TextTools />} />
            <Route path="/crontab" element={<Navigate to="/text-tools" replace />} />
            <Route path="/scripts" element={<Scripts />} />
          </Routes>
        </Suspense>
      </AppLayout>
    </ConfigProvider>
  )
}

export default App
