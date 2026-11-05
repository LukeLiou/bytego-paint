/** Strip paste junk that often sneaks into API keys. */
export function sanitizeApiKey(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[\u2018\u2019\u201C\u201D]/g, '')
    .replace(/^Bearer\s+/i, '')
    .trim()
}

/** HTTP header values must be ISO-8859-1 (ByteString). */
export function isHttpHeaderSafe(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) > 0xff) return false
  }
  return true
}

export function normalizeApiKey(raw: string): string {
  const sanitized = sanitizeApiKey(raw)
  if (!sanitized) {
    throw new Error('请填写 API Key')
  }
  if (!isHttpHeaderSafe(sanitized)) {
    throw new Error('API Key 含有中文或特殊字符，请重新粘贴纯英文/数字的 Key（不要带说明文字）')
  }
  return sanitized
}
