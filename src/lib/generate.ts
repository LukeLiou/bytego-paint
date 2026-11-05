import { normalizeApiKey } from './apiKey'
import type { ImageSize, ModelId, ReferenceImage } from './types'

export interface GenerateInput {
  apiKey: string
  model: ModelId
  prompt: string
  size: ImageSize
  referenceImages?: ReferenceImage[]
  signal?: AbortSignal
}

export interface GenerateResult {
  imageDataUrl: string
}

interface UpstreamImageItem {
  b64_json?: string
  url?: string
}

interface UpstreamResponse {
  data?: UpstreamImageItem[]
  error?: { message?: string } | string
}

export async function generateImage(input: GenerateInput): Promise<GenerateResult> {
  const apiKey = normalizeApiKey(input.apiKey)
  const references = input.referenceImages ?? []

  const response =
    references.length > 0
      ? await fetch('/api/images/edits', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`
          },
          body: await buildEditFormData(input, references),
          signal: input.signal
        })
      : await fetch('/api/images/generations', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: input.model,
            prompt: input.prompt,
            n: 1,
            size: input.size
          }),
          signal: input.signal
        })

  return parseImageResponse(response, input.signal)
}

async function buildEditFormData(input: GenerateInput, references: ReferenceImage[]): Promise<FormData> {
  const form = new FormData()
  form.append('model', input.model)
  form.append('prompt', input.prompt)
  form.append('n', '1')
  form.append('size', input.size)

  for (const reference of references) {
    const blob = await dataUrlToBlob(reference.dataUrl)
    const fileName = reference.name || `${reference.id}.png`
    form.append('image', blob, fileName)
  }

  return form
}

async function parseImageResponse(response: Response, signal?: AbortSignal): Promise<GenerateResult> {
  const payload = (await response.json().catch(() => ({}))) as UpstreamResponse & { error?: unknown }
  if (!response.ok) {
    const rawError = payload.error
    const message =
      typeof rawError === 'string'
        ? rawError
        : rawError && typeof rawError === 'object' && 'message' in rawError && typeof rawError.message === 'string'
          ? rawError.message
          : `生成失败（${response.status}）`
    throw new Error(message)
  }

  const item = payload.data?.[0]
  if (!item) throw new Error('上游未返回图片')

  if (item.b64_json) {
    return { imageDataUrl: `data:image/png;base64,${item.b64_json}` }
  }

  if (item.url) {
    const imageResponse = await fetch(item.url, { signal })
    if (!imageResponse.ok) throw new Error('下载生成结果失败')
    const blob = await imageResponse.blob()
    return { imageDataUrl: await blobToDataUrl(blob) }
  }

  throw new Error('上游响应缺少 b64_json / url')
}

function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((response) => response.blob())
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'))
    reader.readAsDataURL(blob)
  })
}
