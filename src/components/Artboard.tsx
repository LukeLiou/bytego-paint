import { Check, Copy, Download, Palette } from 'lucide-react'
import { type FC, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import PaintingImageSkeleton from './PaintingImageSkeleton'
import type { PaintingRecord } from '@/lib/types'

interface ArtboardProps {
  painting: PaintingRecord
  loading?: boolean
}

function sizeRatio(size: PaintingRecord['size']): number {
  const [width, height] = size.split('x').map(Number)
  if (!width || !height) return 1
  return width / height
}

function sizeLabel(size: PaintingRecord['size']): string {
  return size.replace('x', ' × ')
}

async function readNaturalSize(imageUrl: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        resolve({ width: image.naturalWidth, height: image.naturalHeight })
        return
      }
      resolve(null)
    }
    image.onerror = () => resolve(null)
    image.src = imageUrl
  })
}

type RevealState =
  | { status: 'awaiting' }
  | { status: 'pending'; imageUrl: string }
  | { status: 'ready'; imageUrl: string; naturalWidth: number; naturalHeight: number }

const ArtboardPromptBar: FC<{ prompt: string; size: PaintingRecord['size'] }> = ({ prompt, size }) => {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!expanded) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setExpanded(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [expanded])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timer)
  }, [copied])

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
    } catch {
      // ignore clipboard failures
    }
  }

  return (
    <div ref={rootRef} className="relative mb-2.5 w-full min-w-0">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full min-w-0 items-start gap-2 rounded-xl border border-white/70 bg-white/65 px-3 py-2 text-left shadow-sm backdrop-blur-md transition hover:bg-white/85 md:rounded-2xl md:px-3.5 md:py-2.5">
        <Palette className="mt-0.5 size-3.5 shrink-0 text-slate-400 md:size-4" aria-hidden />
        <span className="line-clamp-2 min-w-0 flex-1 text-xs leading-5 text-slate-600 md:text-sm md:leading-6">
          {prompt}
        </span>
        <span className="mt-0.5 shrink-0 rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-500 md:text-xs">
          {sizeLabel(size)}
        </span>
      </button>

      {expanded && (
        <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-30 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-900 p-3 text-xs leading-relaxed text-slate-50 shadow-xl md:rounded-2xl md:p-3.5 md:text-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium tracking-wide text-slate-400 uppercase md:text-xs">提示词</span>
            <button
              type="button"
              onClick={() => void onCopy()}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-slate-200 transition hover:bg-white/10 md:text-xs">
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <p className="max-h-48 overflow-y-auto break-words whitespace-pre-wrap select-text">{prompt}</p>
        </div>
      )}
    </div>
  )
}

export function Artboard({ painting, loading = false }: ArtboardProps) {
  const [revealState, setRevealState] = useState<RevealState | null>(null)
  const previousLoadingRef = useRef(loading)
  const paintingIdRef = useRef(painting.id)
  const awaitingRevealRef = useRef(false)
  const imageUrl = painting.imageDataUrl

  useLayoutEffect(() => {
    const paintingChanged = paintingIdRef.current !== painting.id
    const wasLoading = previousLoadingRef.current
    paintingIdRef.current = painting.id
    previousLoadingRef.current = loading

    if (paintingChanged) {
      awaitingRevealRef.current = false
      setRevealState(null)
    }

    // Generating: always show the blink grid; do not carry reveal state across.
    if (loading) {
      awaitingRevealRef.current = false
      setRevealState(null)
      return
    }

    // Switched to another finished painting: show it directly, no reveal.
    if (paintingChanged) {
      awaitingRevealRef.current = false
      setRevealState(null)
      return
    }

    const shouldStartReveal = wasLoading || awaitingRevealRef.current
    if (!shouldStartReveal) {
      setRevealState((state) =>
        state && state.status !== 'awaiting' && state.imageUrl !== imageUrl ? null : state
      )
      return
    }

    if (!imageUrl) {
      awaitingRevealRef.current = true
      setRevealState((state) => (state?.status === 'awaiting' ? state : { status: 'awaiting' }))
      return
    }

    let active = true
    awaitingRevealRef.current = false
    setRevealState({ status: 'pending', imageUrl })

    void readNaturalSize(imageUrl).then((result) => {
      if (!active) return
      if (!result) {
        setRevealState(null)
        return
      }
      setRevealState({
        status: 'ready',
        imageUrl,
        naturalWidth: result.width,
        naturalHeight: result.height
      })
    })

    return () => {
      active = false
    }
  }, [painting.id, imageUrl, loading])

  const activeReveal = (() => {
    if (loading || !revealState) return null
    if (revealState.status === 'awaiting') return revealState
    return imageUrl === revealState.imageUrl ? revealState : null
  })()

  const finishReveal = useCallback(() => setRevealState(null), [])

  const onDownload = () => {
    if (!painting.imageDataUrl) return
    const anchor = document.createElement('a')
    anchor.href = painting.imageDataUrl
    anchor.download = `bytego-${painting.id}.png`
    anchor.click()
  }

  const promptBar = painting.prompt ? (
    <ArtboardPromptBar prompt={painting.prompt} size={painting.size} />
  ) : undefined

  const showSkeleton = loading || Boolean(activeReveal)

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col p-2">
      <div className="[container-type:size] relative flex min-h-0 flex-1 flex-col items-center justify-center">
        {showSkeleton ? (
          <PaintingImageSkeleton
            imageUrl={activeReveal?.status === 'ready' ? activeReveal.imageUrl : undefined}
            naturalWidth={activeReveal?.status === 'ready' ? activeReveal.naturalWidth : undefined}
            naturalHeight={activeReveal?.status === 'ready' ? activeReveal.naturalHeight : undefined}
            onRevealReady={activeReveal?.status === 'ready' ? finishReveal : undefined}
            ratio={sizeRatio(painting.size)}
            topBar={promptBar}
          />
        ) : painting.imageDataUrl ? (
          <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden px-3 md:px-4">
            <div className="flex max-h-full w-full max-w-[min(100%,720px)] flex-col items-stretch">
              {promptBar}
              <div className="relative overflow-hidden rounded-xl bg-white/40 shadow-sm ring-1 ring-white/70 md:rounded-2xl">
                <img
                  src={painting.imageDataUrl}
                  alt={painting.prompt || '生成结果'}
                  className="max-h-[min(62dvh,640px)] w-full object-contain"
                />
                <button
                  type="button"
                  onClick={onDownload}
                  className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-md hover:bg-white md:right-4 md:bottom-4 md:px-3.5 md:text-sm">
                  <Download className="size-3.5 md:size-4" />
                  下载
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            role="img"
            aria-label="图片占位"
            className="relative size-[min(72cqh,96cqw)] rounded-3xl border border-slate-200 bg-[linear-gradient(145deg,#e2e8f0,transparent_58%)]">
            <div aria-hidden className="absolute inset-2 rounded-2xl border border-slate-200 bg-slate-50" />
          </div>
        )}
      </div>
    </div>
  )
}
