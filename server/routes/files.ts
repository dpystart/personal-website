import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'

interface TreeNode {
  key: string
  title: string
  isLeaf: boolean
  children?: TreeNode[]
  size?: number
  modifiedAt?: string
  description?: string
}

function safePath(scriptsDir: string, category: string, relativePath: string): string | null {
  const resolved = path.resolve(scriptsDir, category, relativePath)
  const categoryRoot = path.resolve(scriptsDir, category)
  if (!resolved.startsWith(categoryRoot + path.sep) && resolved !== categoryRoot) {
    return null
  }
  return resolved
}

function extractDescription(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    const descLines: string[] = []
    for (let i = 0; i < lines.length && i < 10; i++) {
      const line = lines[i].trim()
      if (i === 0 && line.startsWith('#!')) continue
      if (descLines.length === 0 && line === '') continue
      if (line.startsWith('#') || line.startsWith('//')) {
        descLines.push(line.replace(/^[#/]+\s*/, ''))
      } else if (line.startsWith('---')) {
        continue
      } else if (line.startsWith('- name:')) {
        descLines.push(line.replace(/^- name:\s*/, ''))
        break
      } else {
        break
      }
    }
    return descLines.join(' ').trim()
  } catch {
    return ''
  }
}

function scanDirectory(dirPath: string, relativePath: string = ''): TreeNode[] {
  if (!fs.existsSync(dirPath)) return []
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  const nodes: TreeNode[] = []

  const sorted = entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1
    if (!a.isDirectory() && b.isDirectory()) return 1
    return a.name.localeCompare(b.name)
  })

  for (const entry of sorted) {
    const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      nodes.push({
        key: entryRelPath,
        title: entry.name,
        isLeaf: false,
        children: scanDirectory(fullPath, entryRelPath),
      })
    } else {
      const stat = fs.statSync(fullPath)
      const desc = extractDescription(fullPath)
      nodes.push({
        key: entryRelPath,
        title: entry.name,
        isLeaf: true,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        description: desc || undefined,
      })
    }
  }
  return nodes
}

export default function filesRouter(scriptsDir: string) {
  const router = Router()

  const CATEGORIES = ['shell', 'ansible', 'python']

  for (const cat of CATEGORIES) {
    const dir = path.join(scriptsDir, cat)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  // 获取目录树
  router.get('/', (_req: Request, res: Response) => {
    try {
      const trees: Record<string, TreeNode[]> = {}
      for (const cat of CATEGORIES) {
        const dir = path.join(scriptsDir, cat)
        trees[cat] = scanDirectory(dir)
      }
      res.json({ categories: CATEGORIES, trees })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  // 创建子目录
  router.post('/:category/mkdir', (req: Request, res: Response) => {
    const { category } = req.params
    const { dirpath } = req.body
    if (!CATEGORIES.includes(category)) {
      res.status(400).json({ error: '无效的分类' })
      return
    }
    if (!dirpath) {
      res.status(400).json({ error: '目录路径不能为空' })
      return
    }
    const resolved = safePath(scriptsDir, category, dirpath)
    if (!resolved) {
      res.status(400).json({ error: '无效的路径' })
      return
    }
    if (fs.existsSync(resolved)) {
      res.status(409).json({ error: '目录已存在' })
      return
    }
    try {
      fs.mkdirSync(resolved, { recursive: true })
      res.status(201).json({ success: true, path: dirpath })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  // 创建新脚本
  router.post('/:category', (req: Request, res: Response) => {
    const { category } = req.params
    const { filepath, filename, content } = req.body
    const filePath = filepath || filename
    if (!CATEGORIES.includes(category)) {
      res.status(400).json({ error: '无效的分类' })
      return
    }
    if (!filePath) {
      res.status(400).json({ error: '文件路径不能为空' })
      return
    }
    const resolved = safePath(scriptsDir, category, filePath)
    if (!resolved) {
      res.status(400).json({ error: '无效的路径' })
      return
    }
    if (fs.existsSync(resolved)) {
      res.status(409).json({ error: '文件已存在' })
      return
    }
    try {
      const parentDir = path.dirname(resolved)
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true })
      }
      fs.writeFileSync(resolved, content || '', 'utf-8')
      const stat = fs.statSync(resolved)
      res.status(201).json({ name: path.basename(filePath), category, size: stat.size, modifiedAt: stat.mtime.toISOString() })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  // 获取单个脚本内容（支持嵌套路径）
  router.get('/:category/{*filepath}', (req: Request, res: Response) => {
    const { category } = req.params
    const raw = (req.params as any).filepath
    const filepath = Array.isArray(raw) ? raw.join('/') : raw
    if (!CATEGORIES.includes(category)) {
      res.status(400).json({ error: '无效的分类' })
      return
    }
    const resolved = safePath(scriptsDir, category, filepath)
    if (!resolved) {
      res.status(400).json({ error: '无效的路径' })
      return
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      res.status(404).json({ error: '文件不存在' })
      return
    }
    try {
      const content = fs.readFileSync(resolved, 'utf-8')
      const stat = fs.statSync(resolved)
      res.json({ name: path.basename(filepath), category, content, size: stat.size, modifiedAt: stat.mtime.toISOString() })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  // 删除脚本（支持嵌套路径）
  router.delete('/:category/{*filepath}', (req: Request, res: Response) => {
    const { category } = req.params
    const raw = (req.params as any).filepath
    const filepath = Array.isArray(raw) ? raw.join('/') : raw
    if (!CATEGORIES.includes(category)) {
      res.status(400).json({ error: '无效的分类' })
      return
    }
    const resolved = safePath(scriptsDir, category, filepath)
    if (!resolved) {
      res.status(400).json({ error: '无效的路径' })
      return
    }
    if (!fs.existsSync(resolved)) {
      res.status(404).json({ error: '文件不存在' })
      return
    }
    try {
      const stat = fs.statSync(resolved)
      if (stat.isDirectory()) {
        fs.rmSync(resolved, { recursive: true })
      } else {
        fs.unlinkSync(resolved)
      }
      res.json({ success: true })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  return router
}
