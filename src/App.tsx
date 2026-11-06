import { KeyRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ApiKeyDialog } from '@/components/ApiKeyDialog'
import { Artboard } from '@/components/Artboard'
import { Composer } from '@/components/Composer'
import { HistoryStrip } from '@/components/HistoryStrip'
import TemplateShowcase from '@/components/TemplateShowcase'
import { generateImage } from '@/lib/generate'
import {
  clearApiKey,
  createDraftPainting,
  deletePainting,
  getApiKey,
  listPaintings,
  putPainting,
  setApiKey
} from '@/lib/storage'
import { loadTemplates } from '@/lib/templates'
import type { ImageSize, ModelId, PaintingRecord, TemplatePreset } from '@/lib/types'

export default function App() {
  const [apiKey, setApiKeyState] = useState(() => getApiKey())
  const [keyDialogOpen, setKeyDialogOpen] = useState(false)
  const [requireKeyForUse, setRequireKeyForUse] = useState(false)
  const [items, setItems] = useState<PaintingRecord[]>([])
  const [current, setCurrent] = useState<PaintingRecord>(() => createDraftPainting())
  const [templates, setTemplates] = useState<TemplatePreset[]>([])
  const [generating, setGenerating] = useState(false)
  const [promptCollapsed, setPromptCollapsed] = useState(false)
  const [error, setError] = useState<string>()
  const abortRef = useRef<AbortController | null>(null)
  const hydratedRef = useRef(false)
  const pendingGenerateRef = useRef(false)
  const templateStageRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [history, catalog] = await Promise.all([listPaintings(), loadTemplates().catch(() => [])])
      if (cancelled) return
      setTemplates(catalog)
      // Refresh always opens a blank canvas; completed works stay in the strip only.
      const draft = createDraftPainting()
      setCurrent(draft)
      setItems([draft, ...history])
      hydratedRef.current = true
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydratedRef.current) return
    setItems((prev) => {
      const byId = new Map(prev.map((item) => [item.id, item]))
      byId.set(current.id, current)
      const all = [...byId.values()]
      const drafts = all.filter((item) => !item.imageDataUrl && !item.persistedAt)
      const done = all
        .filter((item) => Boolean(item.imageDataUrl || item.persistedAt))
        .sort((a, b) => b.updatedAt - a.updatedAt)
      const orderedDrafts = [
        ...drafts.filter((item) => item.id === current.id),
        ...drafts.filter((item) => item.id !== current.id)
      ]
      return [...orderedDrafts, ...done]
    })
  }, [current])

  const showTemplateShowcase = !current.imageDataUrl && !generating && !current.persistedAt
  const canCollapse = Boolean(current.imageDataUrl) && !showTemplateShowcase

  useEffect(() => {
    if (generating || showTemplateShowcase || !current.imageDataUrl) {
      setPromptCollapsed(false)
      return
    }
    setPromptCollapsed(true)
  }, [current.id, current.imageDataUrl, generating, showTemplateShowcase])

  const patchCurrent = useCallback((updates: Partial<PaintingRecord>) => {
    setCurrent((prev) => ({ ...prev, ...updates, updatedAt: Date.now() }))
  }, [])

  const persistCurrent = useCallback(async (record: PaintingRecord) => {
    await putPainting(record)
    setItems((prev) => {
      const others = prev.filter((item) => item.id !== record.id)
      return [record, ...others].sort((a, b) => b.updatedAt - a.updatedAt)
    })
  }, [])

  const runGenerate = useCallback(
    async (key: string) => {
      if (!current.prompt.trim()) {
        setError('请先填写提示词，或选择一个预设模板')
        return
      }

      setError(undefined)
      setGenerating(true)
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const result = await generateImage({
          apiKey: key,
          model: current.model,
          prompt: current.prompt.trim(),
          size: current.size,
          referenceImages: current.referenceImages,
          signal: controller.signal
        })
        const next: PaintingRecord = {
          ...current,
          imageDataUrl: result.imageDataUrl,
          persistedAt: Date.now(),
          updatedAt: Date.now()
        }
        setCurrent(next)
        await persistCurrent(next)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError(err instanceof Error ? err.message : '生成失败')
      } finally {
        setGenerating(false)
      }
    },
    [current, persistCurrent]
  )

  const onGenerate = useCallback(() => {
    if (!current.prompt.trim()) {
      setError('请先填写提示词，或选择一个预设模板')
      return
    }

    const key = getApiKey()
    if (!key) {
      pendingGenerateRef.current = true
      setRequireKeyForUse(true)
      setKeyDialogOpen(true)
      return
    }

    void runGenerate(key)
  }, [current.prompt, runGenerate])

  const onCancel = useCallback(() => {
    abortRef.current?.abort()
    setGenerating(false)
  }, [])

  const onAdd = useCallback(() => {
    const draft = createDraftPainting({ model: current.model, size: current.size })
    setCurrent(draft)
    setItems((prev) => {
      const keep = prev.filter((item) => {
        if (item.id === current.id) return false
        return Boolean(item.imageDataUrl || item.persistedAt || item.prompt.trim() || (item.referenceImages?.length ?? 0) > 0)
      })
      return [draft, ...keep]
    })
    setError(undefined)
  }, [current.id, current.model, current.size])

  const onSelect = useCallback(
    (id: string) => {
      const found = items.find((item) => item.id === id)
      if (found) {
        setCurrent(found)
        setError(undefined)
      }
    },
    [items]
  )

  const onDelete = useCallback(
    async (id: string) => {
      await deletePainting(id)
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== id)
        if (next.length === 0) {
          const draft = createDraftPainting()
          setCurrent(draft)
          return [draft]
        }
        if (current.id === id) setCurrent(next[0])
        return next
      })
    },
    [current.id]
  )

  const headerKeyLabel = useMemo(() => (apiKey ? 'API Key' : '配置 API Key'), [apiKey])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="relative z-30 flex shrink-0 items-center justify-between gap-2 bg-gradient-to-b from-white/55 via-white/25 to-transparent px-3 pt-2 pb-1.5 md:gap-3 md:px-6 md:pt-3 md:pb-2">
        <div className="flex min-w-0 items-center gap-2.5 md:gap-3.5">
          <img
            src="/logo.png"
            alt="AI补给站"
            className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-white/70 md:h-12 md:w-12 md:rounded-2xl"
          />
          <div className="min-w-0">
            <div className="truncate text-base font-semibold tracking-tight text-slate-900 md:text-lg">
              ByteGo 生图
            </div>
            <div className="hidden truncate text-xs text-slate-500/90 sm:block md:text-sm">
              AI补给站 · 网页版绘画
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            pendingGenerateRef.current = false
            setRequireKeyForUse(false)
            setKeyDialogOpen(true)
          }}
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-sm shadow-sm backdrop-blur-md transition md:h-10 md:gap-2 md:px-4 md:text-base ${
            apiKey
              ? 'border-white/70 bg-white/55 text-slate-600 hover:bg-white/80 hover:text-slate-900'
              : 'border-white/70 bg-white/55 text-slate-500 hover:bg-white/80 hover:text-slate-800'
          }`}>
          <KeyRound className="size-4 md:size-4.5" />
          <span className="max-w-24 truncate sm:max-w-52">{headerKeyLabel}</span>
          {apiKey ? (
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
          ) : (
            <span className="size-1.5 rounded-full bg-amber-400" aria-hidden />
          )}
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <HistoryStrip
          items={items}
          selectedId={current.id}
          runningId={generating ? current.id : undefined}
          onAdd={onAdd}
          onSelect={onSelect}
          onDelete={onDelete}
          busy={generating}
        />

        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {!showTemplateShowcase && <Artboard painting={current} loading={generating} />}
            {showTemplateShowcase && (
              <section
                ref={templateStageRef}
                data-testid="painting-template-stage"
                className="[container-type:size] absolute inset-0 z-0 mx-auto flex min-h-0 w-full max-w-7xl items-center justify-center overflow-hidden px-3 pt-1 pb-4 touch-none md:px-5 md:pt-2 md:pb-8">
                <div className="flex h-full max-h-full min-h-0 w-full flex-col items-center justify-center md:max-h-[34rem]">
                  <h1 className="max-w-3xl shrink-0 px-2 text-center text-[clamp(1.2rem,5.5cqw,2.75rem)] leading-[1.2] font-bold tracking-tight text-slate-900">
                    给你的下一幅杰作，留一个位置。
                  </h1>

                  <div className="mt-[clamp(8px,4cqh,44px)] flex min-h-0 w-full flex-1 flex-col items-center">
                    {templates.length > 0 ? (
                      <TemplateShowcase
                        paintingId={current.id}
                        prompt={current.prompt}
                        templates={templates}
                        interactionRootRef={templateStageRef}
                        onSelect={(prompt) => patchCurrent({ prompt })}
                      />
                    ) : (
                      <Artboard painting={current} loading={false} />
                    )}

                    <p className="mt-[clamp(6px,2cqh,18px)] max-w-2xl shrink-0 px-3 pb-1 text-center text-xs leading-5 text-slate-500 md:px-4 md:text-base md:leading-7">
                      选择一个模板作为起点，再在下方把提示词改成你的表达。
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>

          {error && (
            <div className="mx-auto mb-1 w-full max-w-7xl px-2 md:px-4">
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:px-4 md:py-3 md:text-base">
                {error}
              </div>
            </div>
          )}

          <Composer
            painting={current}
            generating={generating}
            collapsed={promptCollapsed}
            canCollapse={canCollapse}
            onToggleCollapse={() => setPromptCollapsed((value) => !value)}
            onPromptChange={(prompt) => patchCurrent({ prompt })}
            onModelChange={(model: ModelId) => patchCurrent({ model })}
            onSizeChange={(size: ImageSize) => patchCurrent({ size })}
            onReferenceImagesChange={(referenceImages) => patchCurrent({ referenceImages })}
            onGenerate={() => void onGenerate()}
            onCancel={onCancel}
          />
        </main>
      </div>

      <ApiKeyDialog
        open={keyDialogOpen}
        initialKey={apiKey}
        requireForUse={requireKeyForUse}
        onClose={() => {
          pendingGenerateRef.current = false
          setKeyDialogOpen(false)
          setRequireKeyForUse(false)
        }}
        onSave={(key) => {
          try {
            setApiKey(key)
            setApiKeyState(key)
            setKeyDialogOpen(false)
            setRequireKeyForUse(false)
            const shouldGenerate = pendingGenerateRef.current
            pendingGenerateRef.current = false
            if (shouldGenerate) void runGenerate(key)
          } catch (error) {
            setError(error instanceof Error ? error.message : 'API Key 无效')
            clearApiKey()
            setApiKeyState('')
          }
        }}
      />
    </div>
  )
}
