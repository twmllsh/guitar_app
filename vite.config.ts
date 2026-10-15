import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const adminId = env.ADMIN_USER || env.ADMIN_ID || env.SUPER_USER_ID || env.VITE_ADMIN_USER || env.VITE_ADMIN_ID || 'admin'
  const adminPassword = env.ADMIN_PASSWORD || env.SUPER_USER_PASSWORD || env.VITE_ADMIN_PASSWORD || 'admin'
  const geminiApiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''

  return {
    plugins: [react()],
    define: {
      __APP_ENV__: JSON.stringify({
        ADMIN_ID: adminId,
        ADMIN_PASSWORD: adminPassword,
        GEMINI_API_KEY: geminiApiKey,
      }),
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
  }
})
