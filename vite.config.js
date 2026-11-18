import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Proxy /api and /uploads to the backend origin in VITE_API_URL (falls back to a local backend)
  const target = env.VITE_API_URL ? new URL(env.VITE_API_URL).origin : 'http://localhost:3000'
  const proxyOptions = { target, changeOrigin: true, secure: true }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      port: 5174,
      proxy: {
        '/api': proxyOptions,
        '/uploads': proxyOptions,
      },
    },
  }
})
