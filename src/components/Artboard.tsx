import { Download, Palette } from 'lucide-react'
import { type FC, useCallback, useLayoutEffect, useRef, useState } from 'react'

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
  return (
    <div className="mb-2 flex w-full min-w-0 items-center justify-between gap-2 text-xs text-slate-500">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        <Palette className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{prompt}</span>
      </div>
      <span className="shrink-0">{sizeLabel(size)}</span>
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
    paintingIdRef.current = painting.id
    if (paintingChanged) {
      awaitingRevealRef.current = false
      setRevealState(null)
    }

    const wasLoading = paintingChanged ? loading : previousLoadingRef.current
    previousLoadingRef.current = loading

    if (loading) {
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
          <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden px-2">
            <div className="flex max-h-full max-w-full flex-col items-stretch">
              {promptBar}
              <img
                src={painting.imageDataUrl}
                alt={painting.prompt || '生成结果'}
                className="max-h-[min(70dvh,720px)] max-w-full rounded-md object-contain"
              />
            </div>
            <button
              type="button"
              onClick={onDownload}
              className="absolute right-4 bottom-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-white">
              <Download className="size-3.5" />
              下载
            </button>
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
