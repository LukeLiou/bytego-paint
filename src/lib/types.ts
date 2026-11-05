export type ModelId =
  | 'gpt-image-2'
  | 'gpt-image-2.5-flare'
  | 'gpt-image-2.5-sunburst'
  | 'gpt-image-2.6'
  | 'gpt-image-2.6-flare'
  | 'gpt-image-2.6-sunburst'

export type ImageSize = '1024x1024' | '1536x1024' | '1024x1536'

export interface ReferenceImage {
  id: string
  name: string
  mimeType: string
  dataUrl: string
}

export interface PaintingRecord {
  id: string
  prompt: string
  model: ModelId
  size: ImageSize
  imageDataUrl?: string
  referenceImages?: ReferenceImage[]
  createdAt: number
  updatedAt: number
  persistedAt?: number
}

export interface TemplatePreset {
  id: string
  label: string
  prompt: string
  imageUrl: string
}

export const MAX_REFERENCE_IMAGES = 4
