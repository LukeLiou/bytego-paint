import type { ImageSize, ModelId } from './types'

export const MODEL_OPTIONS: ReadonlyArray<{ id: ModelId; label: string }> = [
  { id: 'gpt-image-2', label: 'GPT-Image-2' },
  { id: 'gpt-image-2.5-flare', label: 'GPT Image 2.5 Flare' },
  { id: 'gpt-image-2.5-sunburst', label: 'GPT Image 2.5 Sunburst' },
  { id: 'gpt-image-2.6', label: 'GPT Image 2.6' },
  { id: 'gpt-image-2.6-flare', label: 'GPT Image 2.6 Flare' },
  { id: 'gpt-image-2.6-sunburst', label: 'GPT Image 2.6 Sunburst' }
]

export const SIZE_OPTIONS: ReadonlyArray<{ id: ImageSize; label: string }> = [
  { id: '1024x1024', label: '1:1 · 1024' },
  { id: '1536x1024', label: '3:2 · 横图' },
  { id: '1024x1536', label: '2:3 · 竖图' }
]

export const DEFAULT_MODEL: ModelId = 'gpt-image-2'
export const DEFAULT_SIZE: ImageSize = '1024x1024'
