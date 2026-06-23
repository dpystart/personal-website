import { useState, useCallback, useEffect } from 'react'
import { Button, Input, Space, message, Spin, Card, Typography, Upload } from 'antd'
import { CopyOutlined, ClearOutlined, SettingOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import { copyToClipboard } from '../../utils/clipboard'

const { Text } = Typography
const { TextArea } = Input

const DEFAULT_OCR_URL = '/ocr/api/ocr'

interface OCRBlock {
  text: string
  box: number[][]
  score: number
  end: string
}

interface OCRResult {
  id: string
  imageUrl: string
  text: string
  table: string[][] | null
  loading: boolean
  time?: number
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function parseBlocks(blocks: OCRBlock[]): { text: string; table: string[][] | null } {
  if (!blocks || blocks.length === 0) return { text: '', table: null }

  const items = blocks.map(b => ({
    text: b.text,
    left: Math.min(b.box[0][0], b.box[3][0]),
    right: Math.max(b.box[1][0], b.box[2][0]),
    top: Math.min(b.box[0][1], b.box[1][1]),
    bottom: Math.max(b.box[2][1], b.box[3][1]),
    centerX: (b.box[0][0] + b.box[1][0]) / 2,
    centerY: (b.box[0][1] + b.box[3][1]) / 2,
    height: Math.abs(b.box[3][1] - b.box[0][1]),
  }))

  items.sort((a, b) => a.top - b.top)

  const yGaps: { afterIndex: number; gap: number }[] = []
  for (let i = 0; i < items.length - 1; i++) {
    const gap = items[i + 1].top - items[i].bottom
    yGaps.push({ afterIndex: i, gap })
  }

  const allGaps = yGaps.map(g => g.gap).filter(g => g > 0).sort((a, b) => a - b)

  let splitThreshold = 0
  if (allGaps.length >= 2) {
    const avgGap = allGaps.reduce((s, g) => s + g, 0) / allGaps.length
    const median = allGaps[Math.floor(allGaps.length / 2)]
    splitThreshold = Math.max(median * 2, avgGap * 1.5)
  }

  const cellRows: typeof items[] = []
  let currentGroup: typeof items = []

  for (let i = 0; i < items.length; i++) {
    currentGroup.push(items[i])
    const gapInfo = yGaps.find(g => g.afterIndex === i)
    if (gapInfo && gapInfo.gap > splitThreshold && splitThreshold > 0) {
      cellRows.push(currentGroup)
      currentGroup = []
    }
  }
  if (currentGroup.length > 0) cellRows.push(currentGroup)

  const columns = detectColumns(items)

  if (columns.length >= 2) {
    const tableData: string[][] = []
    for (const cellRow of cellRows) {
      const rowData: string[] = new Array(columns.length).fill('')
      cellRow.sort((a, b) => a.top - b.top || a.left - b.left)
      for (const item of cellRow) {
        const colIdx = findColumn(item.centerX, columns)
        if (rowData[colIdx]) {
          rowData[colIdx] += item.text
        } else {
          rowData[colIdx] = item.text
        }
      }
      tableData.push(rowData)
    }

    const text = tableData.map(row => row.join('\t')).join('\n')
    return { text, table: tableData }
  }

  const text = cellRows.map(group => {
    group.sort((a, b) => a.top - b.top || a.left - b.left)
    return group.map(i => i.text).join('')
  }).join('\n')
  return { text, table: null }
}

function detectColumns(items: { left: number; right: number; centerX: number }[]): { center: number; left: number; right: number }[] {
  if (items.length === 0) return []

  const lefts = items.map(i => i.left).sort((a, b) => a - b)

  const clusters: number[][] = []
  let cluster: number[] = [lefts[0]]

  for (let i = 1; i < lefts.length; i++) {
    if (lefts[i] - lefts[i - 1] < 30) {
      cluster.push(lefts[i])
    } else {
      clusters.push(cluster)
      cluster = [lefts[i]]
    }
  }
  clusters.push(cluster)

  const minCount = Math.max(2, items.length * 0.1)
  const validClusters = clusters.filter(c => c.length >= minCount)

  if (validClusters.length < 2) {
    const bigClusters: number[][] = []
    let bc: number[] = [lefts[0]]
    for (let i = 1; i < lefts.length; i++) {
      if (lefts[i] - lefts[i - 1] < 80) {
        bc.push(lefts[i])
      } else {
        bigClusters.push(bc)
        bc = [lefts[i]]
      }
    }
    bigClusters.push(bc)

    if (bigClusters.length >= 2) {
      return bigClusters.map(c => {
        const avg = c.reduce((s, v) => s + v, 0) / c.length
        return { center: avg, left: Math.min(...c), right: Math.max(...c) + 100 }
      })
    }
    return []
  }

  return validClusters.map(c => {
    const avg = c.reduce((s, v) => s + v, 0) / c.length
    return { center: avg, left: Math.min(...c), right: Math.max(...c) + 100 }
  })
}

function findColumn(centerX: number, columns: { center: number; left: number; right: number }[]): number {
  let minDist = Infinity
  let bestIdx = 0
  for (let i = 0; i < columns.length; i++) {
    const dist = Math.abs(centerX - columns[i].center)
    if (dist < minDist) {
      minDist = dist
      bestIdx = i
    }
  }
  return bestIdx
}

export default function OcrTool() {
  const [results, setResults] = useState<OCRResult[]>([])
  const [ocrUrl, setOcrUrl] = useState(DEFAULT_OCR_URL)
  const [showSettings, setShowSettings] = useState(false)

  const processImage = useCallback(async (file: File) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
    const imageUrl = URL.createObjectURL(file)

    setResults(prev => [{ id, imageUrl, text: '', table: null, loading: true }, ...prev])

    try {
      const base64 = await fileToBase64(file)

      const res = await fetch(ocrUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64,
          options: { 'data.format': 'dict', 'tbpu.parser': 'none' },
        }),
      })

      if (!res.ok) throw new Error(`OCR 服务返回 ${res.status}`)

      const data = await res.json()

      if (data.code === 100) {
        const { text, table } = parseBlocks(data.data)
        setResults(prev =>
          prev.map(r => r.id === id ? { ...r, text, table, loading: false, time: data.time } : r)
        )
      } else if (data.code === 101) {
        setResults(prev =>
          prev.map(r => r.id === id ? { ...r, text: '（未识别到文本）', loading: false } : r)
        )
      } else {
        throw new Error(data.data || 'OCR 识别失败')
      }
    } catch (err: any) {
      message.error(err.message || 'OCR 服务不可用，请确认 Umi-OCR 已启动')
      setResults(prev =>
        prev.map(r => r.id === id ? { ...r, text: '识别失败: ' + (err.message || '服务不可用'), loading: false } : r)
      )
    }
  }, [ocrUrl])

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) processImage(file)
        }
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [processImage])

  const copyText = (text: string) => {
    copyToClipboard(text)
    message.success('已复制')
  }

  const copyAll = () => {
    const allText = results.map(r => r.text).filter(Boolean).join('\n\n')
    if (allText) {
      copyToClipboard(allText)
      message.success('已复制全部')
    }
  }

  const removeResult = (id: string) => {
    setResults(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text type="secondary" style={{ fontSize: 13 }}>Ctrl+V 粘贴截图或上传图片识别</Text>
        <Space>
          <Upload
            multiple
            showUploadList={false}
            accept="image/*"
            beforeUpload={(file) => { processImage(file); return false }}
          >
            <Button size="small" icon={<UploadOutlined />}>上传图片</Button>
          </Upload>
          <Button size="small" type="text" icon={<SettingOutlined />} onClick={() => setShowSettings(!showSettings)} />
          {results.length > 0 && (
            <>
              <Button size="small" icon={<CopyOutlined />} onClick={copyAll}>复制全部</Button>
              <Button size="small" icon={<ClearOutlined />} onClick={() => setResults([])}>清空</Button>
            </>
          )}
        </Space>
      </div>

      {showSettings && (
        <Card size="small" style={{ marginBottom: 12 }}>
          <Space>
            <Text>OCR 服务地址：</Text>
            <Input value={ocrUrl} onChange={(e) => setOcrUrl(e.target.value)} style={{ width: 320 }} />
          </Space>
        </Card>
      )}

      {results.length === 0 ? (
        <Upload.Dragger
          multiple
          showUploadList={false}
          accept="image/*"
          beforeUpload={(file) => { processImage(file); return false }}
          style={{ flex: 1, borderRadius: 16, border: '2px dashed rgba(0,0,0,0.08)', background: 'transparent' }}
        >
          <div style={{ padding: '60px 0' }}>
            <p style={{ fontSize: 48, opacity: 0.15, marginBottom: 12 }}>📋</p>
            <p style={{ fontSize: 15, color: 'rgba(0,0,0,0.45)' }}>点击或拖拽图片到此区域上传</p>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.3)', marginTop: 8 }}>也支持 Ctrl+V 粘贴截图（需要 HTTPS）</p>
          </div>
        </Upload.Dragger>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {results.map((result) => (
            <div key={result.id} style={{
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.06)',
              overflow: 'hidden',
              background: 'rgba(0,0,0,0.01)',
            }}>
              <div style={{
                padding: 12,
                background: 'rgba(0,0,0,0.02)',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>截图预览</Text>
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeResult(result.id)} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', background: '#fafafa', borderRadius: 8, padding: 8 }}>
                  <img src={result.imageUrl} alt="screenshot" style={{ maxWidth: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 4 }} />
                </div>
              </div>

              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Space size={8}>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>识别结果</Text>
                    {result.time && <Text type="secondary" style={{ fontSize: 11 }}>({result.time.toFixed(2)}s)</Text>}
                  </Space>
                  {!result.loading && (
                    <Button size="small" icon={<CopyOutlined />} onClick={() => copyText(result.text)}>复制</Button>
                  )}
                </div>
                {result.loading ? (
                  <div style={{ padding: 24, textAlign: 'center' }}><Spin tip="识别中..." /></div>
                ) : result.table ? (
                  <div style={{ overflow: 'auto' }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 13,
                      fontFamily: 'inherit',
                    }}>
                      <tbody>
                        {result.table.map((row, ri) => (
                          <tr key={ri} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                            {row.map((cell, ci) => (
                              <td key={ci} style={{
                                padding: '6px 12px',
                                whiteSpace: 'pre-wrap',
                                verticalAlign: 'top',
                                borderRight: ci < row.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                              }}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <TextArea
                    value={result.text}
                    autoSize={{ minRows: 3, maxRows: 16 }}
                    readOnly
                    style={{ fontFamily: 'Consolas, Monaco, monospace', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre' }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
