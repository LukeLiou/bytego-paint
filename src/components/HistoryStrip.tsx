import { ImageIcon, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

import PaintingSkeletonSurface from './PaintingSkeletonSurface'
import type { PaintingRecord } from '@/lib/types'

interface HistoryStripProps {
  items: PaintingRecord[]
  selectedId: string
  runningId?: string
  onSelect: (id: string) => void
  onAdd: () => void
  onDelete: (id: string) => void
  busy?: boolean
}

function isEmptyDraft(item: PaintingRecord) {
  return !item.imageDataUrl && !item.persistedAt
}

export function HistoryStrip({
  items,
  selectedId,
  runningId,
  onSelect,
  onAdd,
  onDelete,
  busy
}: HistoryStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scroller = scrollerRef.current
    const selected = selectedRef.current
    if (!scroller || !selected) return
    selected.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
  }, [selectedId])

  return (
    <aside
      className="relative z-20 isolate flex shrink-0 flex-col bg-white/55 shadow-[0_1px_0_rgba(15,23,42,0.06)] backdrop-blur-md md:h-full md:w-[104px] md:bg-gradient-to-r md:from-white/45 md:to-transparent md:shadow-none md:backdrop-blur-none"
      aria-label="绘画历史">
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-2 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:h-full md:snap-y md:flex-col md:gap-3 md:overflow-x-hidden md:overflow-y-auto md:px-3 md:py-3">
        <button
          type="button"
          disabled={busy}
          onClick={onAdd}
          aria-label="新建绘画"
          title="新建绘画"
          className="sticky left-0 z-30 flex size-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300/90 bg-white text-slate-500 shadow-[4px_0_12px_rgba(255,255,255,0.95)] transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 md:sticky md:top-0 md:mb-1 md:size-16 md:rounded-2xl md:shadow-[0_4px_12px_rgba(255,255,255,0.95)]">
          <Plus className="size-5 md:size-6" />
        </button>

        {items.map((item) => {
          const active = item.id === selectedId
          const running = item.id === runningId
          const empty = isEmptyDraft(item)

          return (
            <div
              key={item.id}
              ref={active ? selectedRef : undefined}
              className={`group relative size-12 shrink-0 snap-start overflow-hidden rounded-xl bg-slate-100 leading-none transition md:size-16 md:rounded-2xl ${
                active ? 'bg-white ring-1 ring-slate-400/55 ring-inset' : 'hover:bg-slate-200/80'
              }`}>
              <button
                type="button"
                className="absolute inset-0 z-0"
                aria-label={item.prompt || (empty ? '新绘画' : '未命名绘画')}
                onClick={() => onSelect(item.id)}>
                <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl md:rounded-2xl">
                  {item.imageDataUrl ? (
                    <img src={item.imageDataUrl} alt="" className="h-full w-full object-cover" />
                  ) : running ? (
                    <div className="size-full bg-white">
                      <PaintingSkeletonSurface />
                    </div>
                  ) : (
                    <span
                      aria-hidden
                      className="flex size-full flex-col items-center justify-center gap-0.5 bg-[linear-gradient(145deg,#e8eef5,#f8fafc_48%,#e2e8f0)] text-slate-400">
                      <ImageIcon className="size-4 opacity-80 md:size-5" />
                      <span className="text-[9px] font-medium tracking-wide text-slate-400/90 md:text-[10px]">
                        新作品
                      </span>
                    </span>
                  )}
                </span>
              </button>

              {running && item.imageDataUrl && (
                <span className="pointer-events-none absolute inset-x-1.5 bottom-1.5 z-10 h-1 overflow-hidden rounded-full bg-black/10 md:inset-x-2 md:bottom-2 md:h-1.5">
                  <span className="block h-full w-5 animate-pulse rounded-full bg-slate-700/70 md:w-7" />
                </span>
              )}

              {items.length > 1 && (
                <button
                  type="button"
                  aria-label="删除"
                  className="absolute top-0.5 right-0.5 z-20 flex size-5 cursor-pointer items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-red-500 shadow-sm transition md:size-6 md:opacity-0 md:group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete(item.id)
                  }}>
                  <Trash2 className="size-3 md:size-3.5" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
