/** Normalize upstream proxy failures (often Cloudflare HTML) into a readable message. */
export function messageFromUpstreamBody(status: number, body: string, contentType?: string | null): string {
  const trimmed = body.trim()
  const looksHtml =
    Boolean(contentType?.includes('text/html')) ||
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    /Attention Required!\s*\|\s*Cloudflare/i.test(trimmed) ||
    /Sorry, you have been blocked/i.test(trimmed)

  if (looksHtml) {
    if (status === 403) {
      return '上游 ByteGo 被 Cloudflare 拦截（403），请稍后重试或更换网络'
    }
    return `上游返回了网页错误页（${status}），请稍后重试`
  }

  try {
    const payload = JSON.parse(trimmed) as { error?: unknown; message?: unknown }
    const rawError = payload.error ?? payload.message
    if (typeof rawError === 'string' && rawError.trim()) return rawError
    if (rawError && typeof rawError === 'object' && 'message' in rawError) {
      const message = (rawError as { message?: unknown }).message
      if (typeof message === 'string' && message.trim()) return message
    }
  } catch {
    // not JSON
  }

  if (trimmed && trimmed.length < 200 && !trimmed.includes('<')) return trimmed
  return `生成失败（${status}）`
}
