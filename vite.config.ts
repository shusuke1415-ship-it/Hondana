import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rakutenAllowedOrigin = env.VITE_RAKUTEN_ALLOWED_ORIGIN

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png'],
        manifest: {
          name: 'セレンディピティ書店',
          short_name: 'セレン書店',
          description: '本屋での偶然の出会いをスマホに。タップして裏返す、新しい立ち読み体験。',
          theme_color: '#d97706',
          background_color: '#fafaf9',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: 'icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
    server: {
      proxy: rakutenAllowedOrigin
        ? {
            '/rakuten-api': {
              target: 'https://openapi.rakuten.co.jp',
              changeOrigin: true,
              rewrite: (path: string) => path.replace(/^\/rakuten-api/, ''),
              configure: (proxy) => {
                // The Rakuten Books API enforces a registered-origin allowlist via
                // the Origin/Referer headers, which browsers won't let dev code
                // spoof from localhost. The dev proxy runs in Node, so it can set
                // these to the registered placeholder domain on our behalf.
                proxy.on('proxyReq', (proxyReq) => {
                  proxyReq.setHeader('Origin', rakutenAllowedOrigin)
                  proxyReq.setHeader('Referer', `${rakutenAllowedOrigin}/`)
                })
              },
            },
          }
        : undefined,
    },
  }
})
