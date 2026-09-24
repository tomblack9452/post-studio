import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// Serves the Vercel-style functions in /api during local dev.
// Each file exports Web-standard handlers (`export async function GET(request)`),
// which Vercel runs as-is in production.
function localApi() {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        const match = url.pathname.match(/^\/api\/([a-z0-9-]+)\/?$/i)
        if (!match) return next()

        let mod
        try {
          mod = await server.ssrLoadModule(`/api/${match[1]}.js`)
        } catch {
          res.statusCode = 404
          return res.end(JSON.stringify({ error: 'Not found' }))
        }

        try {
          const handler = mod[req.method]
          if (!handler) {
            res.statusCode = 405
            return res.end(JSON.stringify({ error: 'Method not allowed' }))
          }
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) {
            if (typeof v === 'string') headers.set(k, v)
          }
          const hasBody = !['GET', 'HEAD'].includes(req.method)
          const request = new Request(new URL(req.url, `http://${req.headers.host}`), {
            method: req.method,
            headers,
            body: hasBody ? await readBody(req) : undefined,
          })
          const response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (e) {
          server.config.logger.error(`[api/${match[1]}] ${e.stack || e}`)
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: e.message || 'Server error' }))
        }
      })
    },
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default defineConfig(({ mode }) => {
  // Make .env values (ANTHROPIC_API_KEY, NASA_API_KEY...) available to /api handlers.
  // They are not VITE_-prefixed, so they are never bundled into the browser code.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [vue(), localApi()],
  }
})
