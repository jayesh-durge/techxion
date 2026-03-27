import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const ollamaTarget = env.VITE_OLLAMA_URL || 'http://localhost:11434'
  console.log(`\n🤖 Ollama proxy → ${ollamaTarget}\n`)

  return {
    plugins: [react()],
    server: {
      port: 3002,
      host: true,
      proxy: {
        '/api': { target: 'http://localhost:8000', changeOrigin: true },
        '/ollama': {
          target: ollamaTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/ollama/, ''),
          configure: (proxy) => {
            proxy.on('error', (e) => console.error('[Ollama]', e.message))
            proxy.on('proxyReq', (_, req) =>
              console.log(`[Ollama] → ${req.method} ${req.url.replace('/ollama', '')}`)
            )
          },
        },
      },
    },
  }
})
