import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const ollamaTarget = env.VITE_OLLAMA_URL || 'http://localhost:11434'
  console.log(`\n🤖 Ollama proxy → ${ollamaTarget}\n`)

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true // Allows PWA testing in dev mode
        },
        manifest: {
          name: 'GramSathi AI App',
          short_name: 'GramSathi',
          description: 'A powerful AI voice assistant for rural India.',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: 'favicon.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: 'favicon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
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
