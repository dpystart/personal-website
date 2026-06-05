import { useState, useRef } from 'react'
import { Space, Button, Upload, Segmented, Select, theme } from 'antd'
import { SwapOutlined, UploadOutlined, ClearOutlined, BgColorsOutlined } from '@ant-design/icons'
import { DiffEditor, type Monaco } from '@monaco-editor/react'

const editorThemes = [
  {
    key: 'soft-light',
    label: '柔光',
    base: 'vs' as const,
    colors: {
      'editor.background': '#f8f9fc',
      'diffEditor.insertedTextBackground': '#d4edda80',
      'diffEditor.removedTextBackground': '#f8d7da80',
      'editorLineNumber.foreground': '#adb5bd',
      'editorGutter.background': '#f0f2f5',
    },
  },
  {
    key: 'github-light',
    label: 'GitHub',
    base: 'vs' as const,
    colors: {
      'editor.background': '#ffffff',
      'diffEditor.insertedTextBackground': '#e6ffec90',
      'diffEditor.removedTextBackground': '#ffebe990',
      'editorLineNumber.foreground': '#8c959f',
      'editorGutter.background': '#f6f8fa',
      'editor.lineHighlightBackground': '#f6f8fa',
    },
  },
  {
    key: 'warm-paper',
    label: '暖纸',
    base: 'vs' as const,
    colors: {
      'editor.background': '#faf8f5',
      'diffEditor.insertedTextBackground': '#dcedc880',
      'diffEditor.removedTextBackground': '#ffccbc80',
      'editorLineNumber.foreground': '#c0b9a8',
      'editorGutter.background': '#f5f2ed',
    },
  },
  {
    key: 'ocean-breeze',
    label: '海风',
    base: 'vs' as const,
    colors: {
      'editor.background': '#f0f7ff',
      'diffEditor.insertedTextBackground': '#b2dfdb70',
      'diffEditor.removedTextBackground': '#f8bbd070',
      'editorLineNumber.foreground': '#90a4ae',
      'editorGutter.background': '#e8f4fd',
    },
  },
  {
    key: 'soft-dark',
    label: '深邃',
    base: 'vs-dark' as const,
    colors: {
      'editor.background': '#1e2433',
      'diffEditor.insertedTextBackground': '#1a4d2e60',
      'diffEditor.removedTextBackground': '#4d1a1a60',
      'editorLineNumber.foreground': '#4a5568',
      'editorGutter.background': '#1a1f2e',
    },
  },
  {
    key: 'nord-night',
    label: '极夜',
    base: 'vs-dark' as const,
    colors: {
      'editor.background': '#2e3440',
      'diffEditor.insertedTextBackground': '#a3be8c30',
      'diffEditor.removedTextBackground': '#bf616a30',
      'editorLineNumber.foreground': '#4c566a',
      'editorGutter.background': '#292e39',
      'editor.foreground': '#d8dee9',
    },
  },
  {
    key: 'dracula',
    label: 'Dracula',
    base: 'vs-dark' as const,
    colors: {
      'editor.background': '#282a36',
      'diffEditor.insertedTextBackground': '#50fa7b25',
      'diffEditor.removedTextBackground': '#ff555530',
      'editorLineNumber.foreground': '#6272a4',
      'editorGutter.background': '#21222c',
      'editor.foreground': '#f8f8f2',
    },
  },
  {
    key: 'monokai',
    label: 'Monokai',
    base: 'vs-dark' as const,
    colors: {
      'editor.background': '#272822',
      'diffEditor.insertedTextBackground': '#a6e22e20',
      'diffEditor.removedTextBackground': '#f9267220',
      'editorLineNumber.foreground': '#90908a',
      'editorGutter.background': '#222218',
      'editor.foreground': '#f8f8f2',
    },
  },
]

function defineAllThemes(monaco: Monaco) {
  for (const t of editorThemes) {
    monaco.editor.defineTheme(t.key, {
      base: t.base,
      inherit: true,
      rules: [],
      colors: t.colors,
    })
  }
}

export default function TextDiffTab() {
  const { token } = theme.useToken()
  const isDark = token.colorBgContainer !== '#ffffff'
  const [original, setOriginal] = useState('')
  const [modified, setModified] = useState('')
  const [renderSideBySide, setRenderSideBySide] = useState(true)
  const [editorTheme, setEditorTheme] = useState('ocean-breeze')
  const themesDefined = useRef(false)

  const handleFileUpload = (file: File, side: 'left' | 'right') => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (side === 'left') setOriginal(text)
      else setModified(text)
    }
    reader.readAsText(file)
    return false
  }

  const handleSwap = () => {
    setOriginal(modified)
    setModified(original)
  }

  const handleClear = () => {
    setOriginal('')
    setModified('')
  }

  const lightThemes = editorThemes.filter(t => t.base === 'vs')
  const darkThemes = editorThemes.filter(t => t.base === 'vs-dark')

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
        <Space wrap size="small">
          <Select
            value={editorTheme}
            onChange={setEditorTheme}
            style={{ width: 110 }}
            size="small"
            suffixIcon={<BgColorsOutlined />}
            options={[
              { label: '—— 亮色 ——', options: lightThemes.map(t => ({ value: t.key, label: t.label })) },
              { label: '—— 暗色 ——', options: darkThemes.map(t => ({ value: t.key, label: t.label })) },
            ]}
          />
          <Segmented
            size="small"
            options={[
              { label: '并排', value: 'side' },
              { label: '内联', value: 'inline' },
            ]}
            value={renderSideBySide ? 'side' : 'inline'}
            onChange={(v) => setRenderSideBySide(v === 'side')}
          />
          <Upload beforeUpload={(f) => handleFileUpload(f, 'left')} showUploadList={false} accept=".txt,.json,.xml,.yaml,.yml,.md,.js,.ts,.py,.sh,.sql,.css,.html">
            <Button size="small" icon={<UploadOutlined />}>原始文件</Button>
          </Upload>
          <Upload beforeUpload={(f) => handleFileUpload(f, 'right')} showUploadList={false} accept=".txt,.json,.xml,.yaml,.yml,.md,.js,.ts,.py,.sh,.sql,.css,.html">
            <Button size="small" icon={<UploadOutlined />}>修改文件</Button>
          </Upload>
          <Button size="small" icon={<SwapOutlined />} onClick={handleSwap}>交换</Button>
          <Button size="small" icon={<ClearOutlined />} onClick={handleClear}>清空</Button>
        </Space>
      </div>
      <div style={{ flex: 1, minHeight: 0, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 12, overflow: 'hidden' }}>
        <DiffEditor
          original={original}
          modified={modified}
          language="text"
          theme={editorTheme}
          beforeMount={(monaco) => {
            if (!themesDefined.current) {
              defineAllThemes(monaco)
              themesDefined.current = true
            }
          }}
          options={{
            renderSideBySide,
            originalEditable: true,
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            padding: { top: 12, bottom: 12 },
            lineNumbersMinChars: 3,
            renderLineHighlight: 'none',
          }}
          onMount={(editor) => {
            const originalEditor = editor.getOriginalEditor()
            const modifiedEditor = editor.getModifiedEditor()
            originalEditor.onDidChangeModelContent(() => {
              setOriginal(originalEditor.getValue())
            })
            modifiedEditor.onDidChangeModelContent(() => {
              setModified(modifiedEditor.getValue())
            })
          }}
        />
      </div>
    </div>
  )
}
