import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 注意：public 文件夹会被复制到 dist
  // 但运行时优先从 public 加载（见 index.js 中间件配置）
})
