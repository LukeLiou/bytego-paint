import { ExternalLink, KeyRound, ShieldCheck, X } from 'lucide-react'
import { type FormEvent, useEffect, useId, useRef, useState } from 'react'

import { normalizeApiKey } from '@/lib/apiKey'

const BYTEGO_KEYS_URL = 'https://www.bytego.team/keys'

interface ApiKeyDialogProps {
  open: boolean
  initialKey: string
  /** True when opened because user tried to generate without a key. */
  requireForUse?: boolean
  onClose: () => void
  onSave: (key: string) => void
}

export function ApiKeyDialog({ open, initialKey, requireForUse = false, onClose, onSave }: ApiKeyDialogProps) {
  const [value, setValue] = useState(initialKey)
  const [showKey, setShowKey] = useState(false)
  const [formError, setFormError] = useState<string>()
  const inputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    if (!open) return
    setValue(initialKey)
    setShowKey(false)
    setFormError(undefined)
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40)
    return () => window.clearTimeout(timer)
  }, [open, initialKey])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    try {
      const normalized = normalizeApiKey(value)
      setFormError(undefined)
      onSave(normalized)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'API Key 无效')
      inputRef.current?.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}>
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative z-10 max-h-[min(92dvh,920px)] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-slate-200/90 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:rounded-3xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400" />

        <div className="flex items-start justify-between gap-3 px-4 pt-5 sm:gap-4 sm:px-8 sm:pt-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 sm:size-14">
              <KeyRound className="size-5 sm:size-6" aria-hidden />
            </div>
            <div>
              <h2 id={titleId} className="text-lg font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {requireForUse ? '温馨提示' : '设置 API Key'}
              </h2>
              <p id={descId} className="mt-1.5 text-sm leading-6 text-slate-500 sm:mt-2 sm:text-base sm:leading-7">
                {requireForUse
                  ? '生成前需要配置 ByteGo API Key，填写后即可继续出图。'
                  : '配置后可使用 ByteGo 生图。可随时在此修改。'}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X className="size-5" />
          </button>
        </div>

        <form
          className="space-y-4 px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:space-y-5 sm:px-8 sm:pt-5 sm:pb-8"
          onSubmit={onSubmit}>
          <div className="flex items-start gap-2.5 rounded-2xl bg-slate-50 px-3.5 py-3 text-sm leading-6 text-slate-600 ring-1 ring-slate-100 sm:gap-3 sm:px-4 sm:py-3.5">
            <ShieldCheck className="mt-0.5 size-4.5 shrink-0 text-emerald-600 sm:size-5" aria-hidden />
            <span>密钥仅保存在本机浏览器，经 Cloudflare 代理转发到 ByteGo，不会上传到我们的服务器存储。</span>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            <label className="block text-sm font-medium text-slate-700 sm:text-base" htmlFor="api-key-input">
              ByteGo API Key
            </label>
            <div
              className={`flex overflow-hidden rounded-2xl border bg-white focus-within:ring-4 ${
                formError
                  ? 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500/15'
                  : 'border-slate-200 focus-within:border-blue-500 focus-within:ring-blue-500/15'
              }`}>
              <input
                ref={inputRef}
                id="api-key-input"
                type={showKey ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                value={value}
                onChange={(event) => {
                  setFormError(undefined)
                  setValue(event.target.value)
                }}
                placeholder="sk-..."
                className="min-w-0 flex-1 border-0 bg-transparent px-3.5 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 sm:px-4 sm:py-3.5"
              />
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                className="shrink-0 px-3.5 text-sm font-medium text-slate-500 hover:text-slate-800 sm:px-4 sm:text-base">
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
            {formError && <p className="text-sm leading-6 text-red-600">{formError}</p>}
            <a
              href={BYTEGO_KEYS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 sm:py-3.5 sm:text-base">
              还没有 Key？去 ByteGo 生成
              <ExternalLink className="size-4 sm:size-4.5" aria-hidden />
            </a>
          </div>

          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-3 text-base text-slate-600 transition hover:bg-slate-100">
              {requireForUse ? '稍后再说' : '取消'}
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="rounded-full bg-blue-600 px-6 py-3 text-base font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
              {requireForUse ? '保存并继续生成' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
