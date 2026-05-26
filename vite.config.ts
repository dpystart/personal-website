import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://42.193.136.198:3001',
        changeOrigin: true,
      },
      '/ocr': {
        target: 'http://42.193.136.198:1224',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ocr/, ''),
      },
    },
  },
})
