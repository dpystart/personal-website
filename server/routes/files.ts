import { Router } from 'express'
import fs from 'fs'
import path from 'path'

interface ScriptFile {
  name: string
  category: string
  path: string
  size: number
  modifiedAt: string
}

export default function filesRouter(scriptsDir: string) {
  const router = Router()

  const CATEGORIES = ['shell', 'ansible']

  // 确保目录存在
  for (const cat of CATEGORIES) {
    const dir = path.join(scriptsDir, cat)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  // 获取所有脚本列表
  router.get('/', (req, res) => {
    try {
      const scripts: ScriptFile[] = []
      for (const cat of CATEGORIES) {
        const dir = path.join(scriptsDir, cat)
        if (!fs.existsSync(dir)) continue
        const files = fs.readdirSync(dir)
        for (const file of files) {
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)
          if (!stat.isFile()) continue
          scripts.push({
            name: file,
            category: cat,
            path: `${cat}/${file}`,
            size: stat.size,
            modifiedAt: stat.mtime.toISOString(),
          })
        }
      }
      scripts.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
      res.json({ categories: CATEGORIES, scripts })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  // 获取单个脚本内容
  router.get('/:category/:filename', (req, res) => {
    const { category, filename } = req.params
    if (!CATEGORIES.includes(category)) {
      res.status(400).json({ error: '无效的分类' })
      return
    }
    const filePath = path.join(scriptsDir, category, filename)
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: '文件不存在' })
      return
    }
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const stat = fs.statSync(filePath)
      res.json({ name: filename, category, content, size: stat.size, modifiedAt: stat.mtime.toISOString() })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  // 创建新脚本
  router.post('/:category', (req, res) => {
    const { category } = req.params
    const { filename, content } = req.body
    if (!CATEGORIES.includes(category)) {
      res.status(400).json({ error: '无效的分类' })
      return
    }
    if (!filename) {
      res.status(400).json({ error: '文件名不能为空' })
      return
    }
    const filePath = path.join(scriptsDir, category, filename)
    if (fs.existsSync(filePath)) {
      res.status(409).json({ error: '文件已存在' })
      return
    }
    try {
      fs.writeFileSync(filePath, content || '', 'utf-8')
      const stat = fs.statSync(filePath)
      res.status(201).json({ name: filename, category, size: stat.size, modifiedAt: stat.mtime.toISOString() })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  // 更新脚本内容
  router.put('/:category/:filename', (req, res) => {
    const { category, filename } = req.params
    const { content, newFilename } = req.body
    if (!CATEGORIES.includes(category)) {
      res.status(400).json({ error: '无效的分类' })
      return
    }
    const filePath = path.join(scriptsDir, category, filename)
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: '文件不存在' })
      return
    }
    try {
      // 如果有重命名
      let targetPath = filePath
      if (newFilename && newFilename !== filename) {
        targetPath = path.join(scriptsDir, category, newFilename)
        fs.renameSync(filePath, targetPath)
      }
      if (content !== undefined) {
        fs.writeFileSync(targetPath, content, 'utf-8')
      }
      const stat = fs.statSync(targetPath)
      res.json({ name: newFilename || filename, category, size: stat.size, modifiedAt: stat.mtime.toISOString() })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  // 删除脚本
  router.delete('/:category/:filename', (req, res) => {
    const { category, filename } = req.params
    if (!CATEGORIES.includes(category)) {
      res.status(400).json({ error: '无效的分类' })
      return
    }
    const filePath = path.join(scriptsDir, category, filename)
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: '文件不存在' })
      return
    }
    try {
      fs.unlinkSync(filePath)
      res.json({ success: true })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  return router
}
