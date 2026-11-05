import { Plus, Trash2 } from 'lucide-react'

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

export function HistoryStrip({
  items,
  selectedId,
  runningId,
  onSelect,
  onAdd,
  onDelete,
  busy
}: HistoryStripProps) {
  return (
    <aside
      className="flex shrink-0 gap-2 overflow-x-auto bg-transparent px-2 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:h-full md:w-[100px] md:flex-col md:gap-3 md:overflow-x-hidden md:overflow-y-auto md:border-r md:border-white/50 md:bg-gradient-to-r md:from-white/30 md:to-transparent md:px-3 md:py-3"
      aria-label="绘画历史">
      <button
        type="button"
        disabled={busy}
        onClick={onAdd}
        aria-label="新建绘画"
        title="新建绘画"
        className="sticky left-0 z-10 flex size-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300/80 bg-white/70 text-slate-500 shadow-sm backdrop-blur-sm hover:bg-white/90 hover:text-slate-800 disabled:opacity-50 md:sticky md:top-0 md:mb-1 md:size-16 md:rounded-2xl">
        <Plus className="size-5 md:size-6" />
      </button>

      {items.map((item) => {
        const active = item.id === selectedId
        const running = item.id === runningId
        return (
          <div
            key={item.id}
            className={`group relative flex size-12 shrink-0 items-center justify-center overflow-visible rounded-xl bg-slate-100 p-0 leading-none transition hover:bg-slate-200/80 md:size-16 md:rounded-2xl ${
              active ? 'bg-white' : ''
            }`}>
            <button
              type="button"
              className="absolute inset-0 z-0"
              aria-label={item.prompt || '未命名绘画'}
              onClick={() => onSelect(item.id)}>
              <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl md:rounded-2xl">
                {item.imageDataUrl ? (
                  <img src={item.imageDataUrl} alt="" className="h-full w-full object-cover" />
                ) : running ? (
                  <div className="size-full bg-white">
                    <PaintingSkeletonSurface />
                  </div>
                ) : (
                  <span className="block size-full bg-slate-200/70" aria-hidden />
                )}
              </span>
            </button>

            {active && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 z-10 rounded-xl ring-1 ring-slate-400/55 ring-inset md:rounded-2xl"
              />
            )}

            {running && item.imageDataUrl && (
              <span className="pointer-events-none absolute inset-x-1.5 bottom-1.5 z-10 h-1 overflow-hidden rounded-full bg-black/10 md:inset-x-2 md:bottom-2 md:h-1.5">
                <span className="block h-full w-5 animate-pulse rounded-full bg-slate-700/70 md:w-7" />
              </span>
            )}

            {items.length > 1 && (
              <button
                type="button"
                aria-label="删除"
                className="absolute -top-1 -right-1 z-20 flex size-5 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/95 text-red-500 opacity-100 shadow-sm transition md:size-7 md:opacity-0 md:group-hover:opacity-100"
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(item.id)
                }}>
                <Trash2 className="size-3 md:size-4" />
              </button>
            )}
          </div>
        )
      })}
    </aside>
  )
}
