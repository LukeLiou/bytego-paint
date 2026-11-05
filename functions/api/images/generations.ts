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
    return new Response(text, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json'
      }
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '上游请求失败' },
      { status: 502 }
    )
  }
}
