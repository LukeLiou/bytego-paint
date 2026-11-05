import { type FC, type RefObject, useCallback, useEffect, useRef, useState } from 'react'

import { DEFAULT_TEMPLATE_ID } from '@/lib/templates'
import type { TemplatePreset } from '@/lib/types'

/**
 * Fan / stack slots (±3). Closer x offsets + deeper scale falloff
 * make more cards visibly pile behind the center one.
 */
const carouselPositions = [
  {
    x: 'calc(-50% - 30cqw)',
    y: 'calc(-50% + 16px)',
    rotation: '-12deg',
    scale: 0.7,
    className: 'z-[1] opacity-40'
  },
  {
    x: 'calc(-50% - 20cqw)',
    y: 'calc(-50% + 10px)',
    rotation: '-8deg',
    scale: 0.8,
    className: 'z-10 opacity-60'
  },
  {
    x: 'calc(-50% - 10cqw)',
    y: 'calc(-50% + 4px)',
    rotation: '-4deg',
    scale: 0.92,
    className: 'z-20 opacity-85'
  },
  {
    x: '-50%',
    y: 'calc(-50% - 4px)',
    rotation: '0deg',
    scale: 1.14,
    className: 'z-40 opacity-100'
  },
  {
    x: 'calc(-50% + 10cqw)',
    y: 'calc(-50% + 4px)',
    rotation: '4deg',
    scale: 0.92,
    className: 'z-20 opacity-85'
  },
  {
    x: 'calc(-50% + 20cqw)',
    y: 'calc(-50% + 10px)',
    rotation: '8deg',
    scale: 0.8,
    className: 'z-10 opacity-60'
  },
  {
    x: 'calc(-50% + 30cqw)',
    y: 'calc(-50% + 16px)',
    rotation: '12deg',
    scale: 0.7,
    className: 'z-[1] opacity-40'
  }
] as const

const VISIBLE_RADIUS = 3

/**
 * Wheel semantics:
 * - One intentional roll / notch → exactly one card
 * - Roll twice → two cards
 * - Trackpad inertia in the same continuous gesture must not multi-skip
 */
const WHEEL_NOTCH_MIN_MS = 70
/** After trackpad goes quiet, the next flick counts as a new gesture. */
const WHEEL_GESTURE_IDLE_MS = 100
/** Trackpad pixel stream: first crossing of this threshold steps once for the gesture. */
const WHEEL_TRACKPAD_THRESHOLD = 40
/** Flush prompt to parent after wheel goes idle (avoids App thrash mid-scroll). */
const WHEEL_PROMPT_FLUSH_MS = 100
/** Swipe keeps a longer lock to avoid double-fires on H5. */
const SWIPE_STEP_LOCK_MS = 420
const SWIPE_DISTANCE = 48

interface TemplateShowcaseProps {
  paintingId: string
  prompt: string
  templates: readonly TemplatePreset[]
  onSelect: (prompt: string) => void
  /** Whole middle stage — wheel / swipe listen here so the full block is interactive. */
  interactionRootRef?: RefObject<HTMLElement | null>
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function wrapIndex(index: number, length: number) {
  if (length <= 0) return 0
  return ((index % length) + length) % length
}

const TemplateShowcase: FC<TemplateShowcaseProps> = ({
  paintingId,
  prompt,
  templates,
  onSelect,
  interactionRootRef
}) => {
  const [styleSelection, setStyleSelection] = useState<{ paintingId: string; presetId: string }>()
  const promptedStyleIndex = prompt.trim() ? templates.findIndex((preset) => preset.prompt === prompt) : -1
  const rememberedStyleIndex =
    styleSelection?.paintingId === paintingId
      ? templates.findIndex((preset) => preset.id === styleSelection.presetId)
      : -1
  const defaultStyleIndex = templates.findIndex((preset) => preset.id === DEFAULT_TEMPLATE_ID)
  // Visual default is 洗衣房舞蹈, but empty prompt must stay empty until the user picks one.
  const selectedStyleIndex =
    rememberedStyleIndex >= 0
      ? rememberedStyleIndex
      : promptedStyleIndex >= 0
        ? promptedStyleIndex
        : defaultStyleIndex >= 0
          ? defaultStyleIndex
          : 0
  const activeStyleIndex = selectedStyleIndex
  const selectedPreset = templates[selectedStyleIndex]

  const fanRef = useRef<HTMLDivElement>(null)
  const templatesRef = useRef(templates)
  const templatesLengthRef = useRef(templates.length)
  const activeIndexRef = useRef(activeStyleIndex)
  const lastStepAtRef = useRef(0)
  const suppressClickUntilRef = useRef(0)
  const wheelAccRef = useRef(0)
  const trackpadGestureSteppedRef = useRef(false)
  const trackpadIdleTimerRef = useRef<number | null>(null)
  const pendingPromptRef = useRef<string | null>(null)
  const promptFlushTimerRef = useRef<number | null>(null)
  const swipeRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    consumed: boolean
  } | null>(null)

  templatesRef.current = templates
  templatesLengthRef.current = templates.length
  activeIndexRef.current = activeStyleIndex

  const flushPendingPrompt = useCallback(() => {
    if (promptFlushTimerRef.current !== null) {
      window.clearTimeout(promptFlushTimerRef.current)
      promptFlushTimerRef.current = null
    }
    const promptValue = pendingPromptRef.current
    if (promptValue == null) return
    pendingPromptRef.current = null
    onSelect(promptValue)
  }, [onSelect])

  const selectByIndex = useCallback(
    (index: number, options?: { deferPrompt?: boolean }) => {
      const list = templatesRef.current
      if (list.length === 0) return
      const nextIndex = wrapIndex(index, list.length)
      const preset = list[nextIndex]
      if (!preset) return
      setStyleSelection({ paintingId, presetId: preset.id })
      activeIndexRef.current = nextIndex
      if (options?.deferPrompt) {
        pendingPromptRef.current = preset.prompt
        if (promptFlushTimerRef.current !== null) window.clearTimeout(promptFlushTimerRef.current)
        promptFlushTimerRef.current = window.setTimeout(() => {
          promptFlushTimerRef.current = null
          const promptValue = pendingPromptRef.current
          if (promptValue == null) return
          pendingPromptRef.current = null
          onSelect(promptValue)
        }, WHEEL_PROMPT_FLUSH_MS)
        return
      }
      pendingPromptRef.current = null
      if (promptFlushTimerRef.current !== null) {
        window.clearTimeout(promptFlushTimerRef.current)
        promptFlushTimerRef.current = null
      }
      onSelect(preset.prompt)
    },
    [onSelect, paintingId]
  )

  useEffect(() => () => flushPendingPrompt(), [flushPendingPrompt])

  useEffect(() => {
    const node = interactionRootRef?.current ?? fanRef.current
    if (!node || templates.length <= 1) return

    const stepOnce = (direction: 1 | -1, minIntervalMs: number, deferPrompt: boolean) => {
      const now = Date.now()
      if (now - lastStepAtRef.current < minIntervalMs) return false
      const length = templatesLengthRef.current
      const next = wrapIndex(activeIndexRef.current + direction, length)
      lastStepAtRef.current = now
      selectByIndex(next, { deferPrompt })
      return true
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const dominant =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      if (Math.abs(dominant) < 1) return

      // Mouse wheel notches (line/page) or large per-event deltas: 1 event → 1 card.
      // Rapid successive notches each count separately (roll 2 times → 2 cards).
      const isMouseNotch =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE ||
        event.deltaMode === WheelEvent.DOM_DELTA_PAGE ||
        Math.abs(dominant) >= 50

      if (isMouseNotch) {
        wheelAccRef.current = 0
        trackpadGestureSteppedRef.current = false
        stepOnce(dominant > 0 ? 1 : -1, WHEEL_NOTCH_MIN_MS, true)
        return
      }

      // Trackpad pixel stream: one continuous flick → one card; pause then flick again → next.
      if (trackpadIdleTimerRef.current !== null) window.clearTimeout(trackpadIdleTimerRef.current)
      trackpadIdleTimerRef.current = window.setTimeout(() => {
        trackpadGestureSteppedRef.current = false
        wheelAccRef.current = 0
        trackpadIdleTimerRef.current = null
      }, WHEEL_GESTURE_IDLE_MS)

      if (trackpadGestureSteppedRef.current) return

      wheelAccRef.current += dominant
      if (Math.abs(wheelAccRef.current) < WHEEL_TRACKPAD_THRESHOLD) return

      const direction: 1 | -1 = wheelAccRef.current > 0 ? 1 : -1
      wheelAccRef.current = 0
      if (stepOnce(direction, WHEEL_NOTCH_MIN_MS, true)) {
        trackpadGestureSteppedRef.current = true
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return
      swipeRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        consumed: false
      }
      try {
        node.setPointerCapture(event.pointerId)
      } catch {
        // ignore
      }
    }

    const finishSwipe = (event: PointerEvent) => {
      const swipe = swipeRef.current
      if (!swipe || swipe.pointerId !== event.pointerId) return
      swipeRef.current = null
      try {
        if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId)
      } catch {
        // ignore
      }
      if (swipe.consumed) return

      const dx = event.clientX - swipe.startX
      const dy = event.clientY - swipe.startY
      const isHorizontal = Math.abs(dx) > Math.abs(dy) * 1.2
      if (!isHorizontal || Math.abs(dx) < SWIPE_DISTANCE) return

      swipe.consumed = true
      if (stepOnce(dx < 0 ? 1 : -1, SWIPE_STEP_LOCK_MS, false)) {
        suppressClickUntilRef.current = Date.now() + SWIPE_STEP_LOCK_MS
      }
    }

    const onPointerCancel = (event: PointerEvent) => {
      if (swipeRef.current?.pointerId === event.pointerId) swipeRef.current = null
    }

    const onClickCapture = (event: MouseEvent) => {
      if (Date.now() < suppressClickUntilRef.current) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    node.addEventListener('wheel', onWheel, { passive: false })
    node.addEventListener('pointerdown', onPointerDown)
    node.addEventListener('pointerup', finishSwipe)
    node.addEventListener('pointercancel', onPointerCancel)
    node.addEventListener('click', onClickCapture, true)
    return () => {
      if (trackpadIdleTimerRef.current !== null) window.clearTimeout(trackpadIdleTimerRef.current)
      node.removeEventListener('wheel', onWheel)
      node.removeEventListener('pointerdown', onPointerDown)
      node.removeEventListener('pointerup', finishSwipe)
      node.removeEventListener('pointercancel', onPointerCancel)
      node.removeEventListener('click', onClickCapture, true)
    }
  }, [interactionRootRef, selectByIndex, templates.length])

  return (
    <div className="relative flex max-h-[220px] min-h-0 w-full flex-1 flex-col items-center md:max-h-[420px]">
      <div className="pointer-events-none z-50 flex shrink-0 items-center justify-center px-2 py-1 md:py-1.5">
        {selectedPreset && (
          <span className="whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white shadow-sm md:rounded-lg md:px-3 md:py-1.5 md:text-base">
            {selectedPreset.label}
          </span>
        )}
      </div>

      <div
        ref={fanRef}
        className="[container-type:size] relative mt-1.5 min-h-0 w-full flex-1 overflow-hidden md:mt-2"
        role="group"
        aria-label="提示词模板，可滑动或滚轮切换"
        tabIndex={0}
        onKeyDown={(event) => {
          if (Date.now() - lastStepAtRef.current < WHEEL_NOTCH_MIN_MS) return
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            event.preventDefault()
            const next = wrapIndex(activeStyleIndex + 1, templates.length)
            activeIndexRef.current = next
            lastStepAtRef.current = Date.now()
            selectByIndex(next)
          } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            event.preventDefault()
            const next = wrapIndex(activeStyleIndex - 1, templates.length)
            activeIndexRef.current = next
            lastStepAtRef.current = Date.now()
            selectByIndex(next)
          }
        }}>
        {templates.map((preset, index) => {
          const isSelected = index === selectedStyleIndex
          const middlePosition = Math.floor(templates.length / 2)
          const relativePosition =
            ((index - activeStyleIndex + middlePosition + templates.length) % templates.length) - middlePosition
          const isHidden = Math.abs(relativePosition) > VISIBLE_RADIUS
          const visiblePosition = Math.max(-VISIBLE_RADIUS, Math.min(VISIBLE_RADIUS, relativePosition))
          const carouselPosition = carouselPositions[visiblePosition + VISIBLE_RADIUS] ?? carouselPositions[VISIBLE_RADIUS]

          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={isSelected}
              aria-hidden={isHidden || undefined}
              aria-label={preset.label}
              title={preset.label}
              tabIndex={isHidden ? -1 : 0}
              className={cn(
                'group absolute top-1/2 left-1/2 h-[clamp(64px,min(26cqw,58cqh),248px)] w-[clamp(50px,min(20cqw,46cqh),198px)] overflow-visible rounded-xl border-0 bg-transparent p-0 opacity-100 transition-[transform,opacity,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform hover:z-50 hover:bg-transparent hover:shadow-lg focus-visible:z-50 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-0 focus-visible:ring-inset focus-visible:outline-none md:rounded-2xl',
                carouselPosition.className,
                isHidden && 'pointer-events-none opacity-0',
                isSelected && 'shadow-md'
              )}
              style={{
                transform: `translate(${carouselPosition.x}, ${carouselPosition.y}) rotate(${carouselPosition.rotation}) scale(${carouselPosition.scale})`
              }}
              onClick={(event) => {
                if (Date.now() < suppressClickUntilRef.current) {
                  event.preventDefault()
                  return
                }
                if (Date.now() - lastStepAtRef.current < WHEEL_NOTCH_MIN_MS) return
                activeIndexRef.current = index
                lastStepAtRef.current = Date.now()
                selectByIndex(index)
              }}>
              <span
                className="pointer-events-none relative block size-full overflow-hidden rounded-2xl bg-white shadow-sm"
                style={{
                  borderRadius: '1rem',
                  clipPath: 'inset(0 round 1rem)',
                  WebkitClipPath: 'inset(0 round 1rem)',
                  transform: 'translateZ(0)'
                }}>
                {preset.imageUrl ? (
                  <img
                    src={preset.imageUrl}
                    alt=""
                    draggable={false}
                    className="block size-full object-cover rounded-2xl"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-2xl bg-[linear-gradient(145deg,#e2e8f0,transparent_58%)]"
                  />
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default TemplateShowcase
