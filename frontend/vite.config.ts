import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/stellarlog/' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    allowedHosts: ['roy-oc.tail0568ff.ts.net'],
    proxy: {
      '/api': {
        target: 'http://localhost:8002',
        changeOrigin: true,
      },
      '/photos': {
        target: 'http://localhost:8002',
        changeOrigin: true,
      },
    },
  },
}))
