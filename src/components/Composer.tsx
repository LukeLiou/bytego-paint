import { ChevronDown, ChevronUp, ImagePlus, LoaderCircle, Settings2, Square, WandSparkles, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { MODEL_OPTIONS, SIZE_OPTIONS } from '@/lib/models'
import type { ImageSize, ModelId, PaintingRecord, ReferenceImage } from '@/lib/types'
import { MAX_REFERENCE_IMAGES } from '@/lib/types'

const SELECTOR_BUTTON =
  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 md:h-10 md:gap-2 md:px-3.5 md:text-base'

const ACCEPT_IMAGE = 'image/png,image/jpeg,image/jpg,image/webp,image/gif'
const MAX_FILE_BYTES = 10 * 1024 * 1024

interface ComposerProps {
  painting: PaintingRecord
  generating: boolean
  collapsed: boolean
  canCollapse: boolean
  onToggleCollapse: () => void
  onPromptChange: (prompt: string) => void
  onModelChange: (model: ModelId) => void
  onSizeChange: (size: ImageSize) => void
  onReferenceImagesChange: (images: ReferenceImage[]) => void
  onGenerate: () => void
  onCancel: () => void
}

function ModelMenu({
  value,
  onChange
}: {
  value: ModelId
  onChange: (model: ModelId) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = MODEL_OPTIONS.find((option) => option.id === value) ?? MODEL_OPTIONS[0]

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        className={`${SELECTOR_BUTTON} max-w-[9.5rem] md:max-w-[240px]`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}>
        <span className="truncate">{current.label}</span>
        <ChevronDown className="size-3.5 shrink-0 opacity-60 md:size-4.5" aria-hidden />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute bottom-[calc(100%+6px)] left-0 z-30 min-w-[min(240px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg md:min-w-[260px] md:p-1.5">
          {MODEL_OPTIONS.map((option) => {
            const selected = option.id === value
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition md:px-3.5 md:py-3 md:text-base ${
                  selected ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => {
                  onChange(option.id)
                  setOpen(false)
                }}>
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SizeSettingsButton({
  value,
  onChange
}: {
  value: ImageSize
  onChange: (size: ImageSize) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const summary = useMemo(
    () => SIZE_OPTIONS.find((option) => option.id === value)?.label ?? value,
    [value]
  )
  const shortSummary = useMemo(() => summary.split('·')[0]?.trim() || summary, [summary])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`${SELECTOR_BUTTON} text-slate-500`}
        aria-label={summary ? `设置: ${summary}` : '设置'}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}>
        <Settings2 className="size-4 md:size-5" />
        <span className="max-w-20 truncate md:max-w-64" title={summary}>
          <span className="md:hidden">{shortSummary}</span>
          <span className="hidden md:inline">{summary}</span>
        </span>
      </button>
      {open && (
        <div className="absolute bottom-[calc(100%+6px)] left-0 z-30 w-[min(300px,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-lg md:w-[min(340px,calc(100vw-2rem))] md:p-4">
          <div className="mb-2.5 text-sm font-medium text-slate-700 md:mb-3 md:text-base">尺寸</div>
          <div className="flex flex-wrap gap-2">
            {SIZE_OPTIONS.map((option) => {
              const selected = option.id === value
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`rounded-full px-3 py-2 text-sm transition md:px-4 md:py-2.5 md:text-base ${
                    selected
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    onChange(option.id)
                    setOpen(false)
                  }}>
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

async function filesToReferenceImages(files: FileList | File[]): Promise<ReferenceImage[]> {
  const list = Array.from(files).filter((file) => file.type.startsWith('image/'))
  const next: ReferenceImage[] = []
  for (const file of list) {
    if (file.size > MAX_FILE_BYTES) continue
    next.push({
      id: crypto.randomUUID(),
      name: file.name,
      mimeType: file.type || 'image/png',
      dataUrl: await readFileAsDataUrl(file)
    })
  }
  return next
}

export function Composer({
  painting,
  generating,
  collapsed,
  canCollapse,
  onToggleCollapse,
  onPromptChange,
  onModelChange,
  onSizeChange,
  onReferenceImagesChange,
  onGenerate,
  onCancel
}: ComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const references = painting.referenceImages ?? []
  const canAddMore = references.length < MAX_REFERENCE_IMAGES

  const addFiles = async (fileList: FileList | File[] | null) => {
    if (!fileList || fileList.length === 0 || !canAddMore) return
    const room = MAX_REFERENCE_IMAGES - references.length
    const incoming = await filesToReferenceImages(Array.from(fileList).slice(0, room))
    if (incoming.length === 0) return
    onReferenceImagesChange([...references, ...incoming])
  }

  const removeReference = (id: string) => {
    onReferenceImagesChange(references.filter((item) => item.id !== id))
  }

  if (collapsed) {
    const modelLabel = MODEL_OPTIONS.find((option) => option.id === painting.model)?.label ?? painting.model
    const sizeLabel = SIZE_OPTIONS.find((option) => option.id === painting.size)?.label ?? painting.size

    return (
      <div className="relative z-20 shrink-0 px-2 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-4 md:pb-4">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="mx-auto flex w-full max-w-7xl items-center gap-3 rounded-2xl border border-white/80 bg-white/75 px-3.5 py-2.5 text-left shadow-lg shadow-slate-900/5 backdrop-blur-xl transition hover:bg-white/90 md:rounded-3xl md:gap-4 md:px-5 md:py-3.5">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] font-medium text-slate-500 md:text-xs">
                {modelLabel}
              </span>
              <span className="rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] font-medium text-slate-500 md:text-xs">
                {sizeLabel}
              </span>
            </div>
            <p className="line-clamp-2 text-sm leading-5 text-slate-700 md:text-base md:leading-6">
              {painting.prompt.trim() || '展开后可继续编辑提示词'}
            </p>
          </div>
          <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 px-3 text-sm text-slate-600 md:h-10 md:px-3.5 md:text-base">
            <ChevronUp className="size-4 md:size-4.5" />
            编辑
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className="relative z-20 shrink-0 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:px-4 md:pt-2 md:pb-4">
      {canCollapse && (
        <div className="mx-auto mb-1.5 flex w-full max-w-7xl justify-center md:mb-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3.5 text-sm text-slate-500 shadow-sm backdrop-blur-xl hover:bg-slate-50 hover:text-slate-800 md:h-11 md:gap-2 md:px-4 md:text-base">
            <ChevronDown className="size-4 md:size-4.5" />
            收起提示词
          </button>
        </div>
      )}

      <div
        className="mx-auto w-full max-w-7xl overflow-hidden rounded-2xl border border-white/80 bg-white/80 shadow-lg shadow-slate-900/5 backdrop-blur-xl md:rounded-3xl"
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
        }}
        onDrop={(event) => {
          event.preventDefault()
          void addFiles(event.dataTransfer.files)
        }}>
        {references.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-3 pt-3 md:gap-2.5 md:px-5 md:pt-4">
            {references.map((item) => (
              <span
                key={item.id}
                className="group/tile relative inline-flex size-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 md:size-20 md:rounded-xl">
                <img src={item.dataUrl} alt={item.name} className="size-full object-cover" draggable={false} />
                <button
                  type="button"
                  aria-label="移除参考图"
                  title="移除"
                  disabled={generating}
                  onClick={() => removeReference(item.id)}
                  className="absolute top-0.5 right-0.5 inline-flex size-5 items-center justify-center rounded-full bg-black/55 text-white opacity-100 transition-opacity md:top-1 md:right-1 md:size-6 md:opacity-0 md:group-hover/tile:opacity-100 md:group-focus-within/tile:opacity-100 disabled:opacity-40">
                  <X className="size-3.5 md:size-4" aria-hidden />
                </button>
              </span>
            ))}
          </div>
        )}

        <textarea
          value={painting.prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          onPaste={(event) => {
            const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/'))
            if (files.length === 0) return
            event.preventDefault()
            void addFiles(files)
          }}
          placeholder="描述你想生成的画面，或上传参考图后改写…"
          rows={3}
          className="block max-h-[28vh] min-h-[4.5rem] w-full resize-none overflow-y-auto border-0 bg-transparent px-3.5 pt-3 pb-2 text-base leading-6 text-slate-800 outline-none placeholder:text-slate-400 md:max-h-none md:min-h-[10rem] md:px-5 md:pt-4 md:pb-3 md:text-lg md:leading-8"
        />

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-2.5 py-2 md:gap-3 md:px-4 md:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-2.5">
            <ModelMenu value={painting.model} onChange={onModelChange} />
            <SizeSettingsButton value={painting.size} onChange={onSizeChange} />
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_IMAGE}
              multiple
              className="hidden"
              onChange={(event) => {
                void addFiles(event.target.files)
                event.target.value = ''
              }}
            />
            <button
              type="button"
              aria-label="上传参考图"
              title={canAddMore ? '上传参考图' : `最多 ${MAX_REFERENCE_IMAGES} 张`}
              disabled={generating || !canAddMore}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 md:size-10">
              <ImagePlus className="size-4 md:size-5" aria-hidden />
            </button>
          </div>

          {generating ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 md:h-11 md:gap-2 md:px-5 md:text-base">
              <Square className="size-3.5 fill-current md:size-4.5" />
              取消
              <LoaderCircle className="size-3.5 animate-spin text-blue-600 md:size-4.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onGenerate}
              disabled={!painting.prompt.trim()}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-blue-600 px-3.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 md:h-11 md:gap-2 md:px-5 md:text-base">
              <WandSparkles className="size-3.5 md:size-4.5" />
              生成
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
