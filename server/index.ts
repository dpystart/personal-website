import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import ocrRouter from './routes/ocr'
import filesRouter from './routes/files'

const app = express()
const PORT = process.env.PORT || 3001
const SCRIPTS_DIR = process.env.SCRIPTS_DIR || path.resolve('scripts-data')

app.use(cors())
app.use(express.json({ limit: '50mb' }))

app.use('/api/ocr', ocrRouter)
app.use('/api/scripts', filesRouter(SCRIPTS_DIR))

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Scripts directory: ${SCRIPTS_DIR}`)
})
