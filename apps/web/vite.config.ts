import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const githubPagesBase = '/market-pnl-treemap-mvp/'
const base = process.env.VITE_BASE_PATH ?? (process.env.GITHUB_ACTIONS ? githubPagesBase : '/')

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173
  }
})
