import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, type Plugin } from 'vite'

const BYTEGO_GENERATIONS = 'https://www.bytego.team/v1/images/generations'
const BYTEGO_EDITS = 'https://www.bytego.team/v1/images/edits'
const rootDir = path.dirname(fileURLToPath(import.meta.url))

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function proxyRoute(route: string, upstreamUrl: string): Plugin {
  return {
    name: `bytego-dev-proxy:${route}`,
    configureServer(server) {
      server.middlewares.use(route, (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => {
        void (async () => {
          if (req.method !== 'POST') {
            next()
            return
          }

          try {
            const body = await readBody(req)
            const authorization = req.headers.authorization
            if (!authorization) {
              res.statusCode = 401
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: '缺少 API Key' }))
              return
            }

            const headers: Record<string, string> = {
              Authorization: authorization
            }
            const contentType = req.headers['content-type']
            if (typeof contentType === 'string') headers['Content-Type'] = contentType

            const upstream = await fetch(upstreamUrl, {
              method: 'POST',
              headers,
              body
            })

            const text = await upstream.text()
            const upstreamType = upstream.headers.get('content-type') || ''
            const looksHtml =
              upstreamType.includes('text/html') ||
              text.trimStart().startsWith('<!DOCTYPE') ||
              text.trimStart().startsWith('<html') ||
              /Attention Required!\s*\|\s*Cloudflare/i.test(text)

            if (looksHtml) {
              res.statusCode = upstream.status || 502
              res.setHeader('Content-Type', 'application/json')
              const message =
                upstream.status === 403
                  ? '上游 ByteGo 被 Cloudflare 拦截（403），请稍后重试或更换网络'
                  : `上游返回了网页错误页（${upstream.status}），请稍后重试`
              res.end(JSON.stringify({ error: message }))
              return
            }

            res.statusCode = upstream.status
            res.setHeader('Content-Type', upstreamType || 'application/json')
            res.end(text)
          } catch (error) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : '代理失败' }))
          }
        })()
      })
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    proxyRoute('/api/images/generations', BYTEGO_GENERATIONS),
    proxyRoute('/api/images/edits', BYTEGO_EDITS)
  ],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src')
    }
  },
  server: {
    port: 8789
  }
})
