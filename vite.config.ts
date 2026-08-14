import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Serves /api/books from the Vite dev server using the same logic the
// production Vercel function runs, so `npm run dev` alone is enough to
// exercise the real backend — no separate `vercel dev` process needed.
function rakutenDevApiPlugin(): Plugin {
  return {
    name: 'rakuten-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/books', async (req, res) => {
        const { handleBooksRequest } = await import('./server/rakutenProxy.ts')
        const query = Object.fromEntries(
          new URL(req.url ?? '', 'http://localhost').searchParams,
        )
        const result = await handleBooksRequest(query)
        res.statusCode = result.status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(result.body))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Loads .env into process.env for this config file's own use (e.g. the
  // dev API plugin reading RAKUTEN_* below) — Vite doesn't do this
  // automatically outside of import.meta.env in client code.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [
      react(),
      tailwindcss(),
      rakutenDevApiPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png'],
        manifest: {
          name: 'セレンディピティ書店',
          short_name: 'セレン書店',
          description: '本屋での偶然の出会いをスマホに。タップして裏返す、新しい立ち読み体験。',
          theme_color: '#000000',
          background_color: '#000000',
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
  }
})
