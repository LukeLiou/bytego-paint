const BYTEGO_UPSTREAM = 'https://www.bytego.team/v1/images/generations'

interface PagesContext {
  request: Request
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const authorization = context.request.headers.get('Authorization')
  if (!authorization) {
    return Response.json({ error: '缺少 API Key' }, { status: 401 })
  }

  let body: string
  try {
    body = await context.request.text()
  } catch {
    return Response.json({ error: '无法读取请求体' }, { status: 400 })
  }

  try {
    const upstream = await fetch(BYTEGO_UPSTREAM, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json'
      },
      body
    })

    const text = await upstream.text()
    const upstreamType = upstream.headers.get('Content-Type') || ''
    const looksHtml =
      upstreamType.includes('text/html') ||
      text.trimStart().startsWith('<!DOCTYPE') ||
      text.trimStart().startsWith('<html') ||
      /Attention Required!\s*\|\s*Cloudflare/i.test(text)

    if (looksHtml) {
      const message =
        upstream.status === 403
          ? '上游 ByteGo 被 Cloudflare 拦截（403），请稍后重试或更换网络'
          : `上游返回了网页错误页（${upstream.status}），请稍后重试`
      return Response.json({ error: message }, { status: upstream.status || 502 })
    }

    return new Response(text, {
      status: upstream.status,
      headers: {
        'Content-Type': upstreamType || 'application/json'
      }
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '上游请求失败' },
      { status: 502 }
    )
  }
}
