import { Router } from 'express'
import multer from 'multer'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://localhost:8080/ocr'

router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请上传图片' })
      return
    }

    const formData = new FormData()
    formData.append('image', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname)

    const response = await fetch(OCR_SERVICE_URL, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`OCR service returned ${response.status}`)
    }

    const data = await response.json()
    res.json(data)
  } catch (error: any) {
    console.error('OCR error:', error.message)
    res.status(500).json({ error: 'OCR 服务不可用', detail: error.message })
  }
})

export default router
