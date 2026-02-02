import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  // 禁用 public 目录的复制，因为 public 是通过 alias link 到本地的
  // 运行时通过 Express 服务器从实际的 public 目录提供（见 index.js 中间件配置）
  publicDir: false,
})
