import { type CSSProperties, type FC, type ReactNode, useCallback, useLayoutEffect, useRef, useState } from 'react'

import PaintingSkeletonSurface from './PaintingSkeletonSurface'

const SKELETON_MAX_SIZE = '100%'

interface PaintingImageSkeletonProps {
  imageUrl?: string
  naturalWidth?: number
  naturalHeight?: number
  onRevealReady?: () => void
  /** width / height */
  ratio?: number
  topBar?: ReactNode
}

/** Ported from cherry-studio `PaintingImageSkeleton` (ratio-locked blink grid). */
const PaintingImageSkeleton: FC<PaintingImageSkeletonProps> = ({
  imageUrl,
  naturalWidth,
  naturalHeight,
  onRevealReady,
  ratio,
  topBar
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [container, setContainer] = useState<{ width: number; height: number } | null>(null)
  const topBarObserverRef = useRef<ResizeObserver | null>(null)
  const [topBarHeight, setTopBarHeight] = useState(0)

  useLayoutEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const measure = () => setContainer({ width: el.clientWidth, height: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const setTopBarRef = useCallback((el: HTMLDivElement | null) => {
    topBarObserverRef.current?.disconnect()
    topBarObserverRef.current = null
    if (!el) {
      setTopBarHeight(0)
      return
    }
    const measure = () => setTopBarHeight(el.clientHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    topBarObserverRef.current = observer
  }, [])

  const availableHeight = container ? Math.max(0, container.height - topBarHeight) : null
  const hasMeasuredWidth = container != null && container.width > 0
  const hasAvailableHeight = availableHeight != null && availableHeight > 0
  const containerRatio =
    hasMeasuredWidth && hasAvailableHeight && container && availableHeight ? container.width / availableHeight : null

  let lockedSize: { width: number; height: number } | null = null
  if (naturalWidth && naturalHeight && naturalWidth > 0 && naturalHeight > 0 && container && availableHeight != null) {
    const scale = Math.min(1, container.width / naturalWidth, availableHeight / naturalHeight)
    lockedSize = { width: naturalWidth * scale, height: naturalHeight * scale }
  }

  let boxSize: { width: number; height: number } | null = lockedSize
  if (!boxSize && ratio != null && container) {
    if (containerRatio != null && ratio < containerRatio && availableHeight != null) {
      boxSize = { width: availableHeight * ratio, height: availableHeight }
    } else if (hasMeasuredWidth) {
      boxSize = { width: container.width, height: container.width / ratio }
    }
  }

  const boxStyle: CSSProperties | undefined = boxSize
    ? { width: boxSize.width, height: boxSize.height }
    : ratio == null
      ? undefined
      : { width: SKELETON_MAX_SIZE, height: 'auto', aspectRatio: String(ratio) }

  const hasKnownSize = boxStyle != null
  const columnWidth = boxSize?.width

  return (
    <div
      ref={wrapperRef}
      className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label={imageUrl ? '正在呈现生成的图片' : '绘图进行中，请不要离开页面'}>
      <div
        className={`flex flex-col items-stretch ${hasKnownSize ? 'max-h-full max-w-full' : 'h-full w-full'}`}
        style={columnWidth != null ? { width: columnWidth } : undefined}>
        {topBar && (
          <div ref={setTopBarRef} className="min-w-0">
            {topBar}
          </div>
        )}
        <div
          className={`overflow-hidden rounded-md bg-white ${!hasKnownSize ? 'min-h-0 flex-1' : ''}`}
          style={boxStyle}>
          <PaintingSkeletonSurface imageUrl={imageUrl} onRevealReady={onRevealReady} />
        </div>
      </div>
    </div>
  )
}

export default PaintingImageSkeleton
