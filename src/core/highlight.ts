import type { RenderMeta } from './fps'
import { throttle } from 'lodash-es'
import { getComponentBoundingRect, getInstanceName } from './utils'

export interface ComponentBoundingRect {
  top: number
  left: number
  width: number
  height: number
  right: number
  bottom: number
}

export function isInViewport(bounds: ComponentBoundingRect): boolean {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // 只要元素和视口有交集，就认为是在视口内
  return !(
    bounds.left >= viewportWidth // 完全在视口右侧
    || bounds.right <= 0 // 完全在视口左侧
    || bounds.top >= viewportHeight // 完全在视口下方
    || bounds.bottom <= 0 // 完全在视口上方
  )
}

interface HighlightItem {
  bounds: ComponentBoundingRect
  name: string
  flashCount: number
  hideComponentName: boolean
  startTime: number
  lastUpdateTime: number
  opacity: number
  state: 'fade-in' | 'visible' | 'fade-out'
}

export interface HighlightCanvasOptions {
  /** default 450ms */
  displayDuration?: number
  /** default 25ms */
  fadeInDuration?: number
  /** default 50ms */
  fadeOutDuration?: number
}

class HighlightCanvas {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private readonly DISPLAY_DURATION: number
  private readonly FADE_IN_DURATION: number
  private readonly FADE_OUT_DURATION: number
  private highlights: Map<string, HighlightItem> = new Map()
  private animationFrame: number | null = null
  private textMetricsCache: Map<string, TextMetrics> = new Map()

  constructor(options?: HighlightCanvasOptions) {
    this.DISPLAY_DURATION = options?.displayDuration ?? 450
    this.FADE_IN_DURATION = options?.fadeInDuration ?? 25
    this.FADE_OUT_DURATION = options?.fadeOutDuration ?? 50
    this.canvas = document.createElement('canvas')
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 9999;
    `
    this.ctx = this.canvas.getContext('2d')!
    document.body.appendChild(this.canvas)
    this.updateCanvasSize()
    window.addEventListener('resize', () => this.updateCanvasSize())
    window.addEventListener('scroll', () => this.scheduleRender())
  }

  private updateCanvasSize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  drawHighlight(bounds: ComponentBoundingRect, uuid: string, name: string, flashCount: number, hideComponentName = false) {
    const now = Date.now()
    const existingItem = this.highlights.get(uuid)

    if (existingItem) {
      existingItem.bounds = bounds
      existingItem.name = name
      existingItem.flashCount = flashCount
      existingItem.hideComponentName = hideComponentName
      existingItem.lastUpdateTime = now

      if (existingItem.state === 'fade-out') {
        existingItem.state = 'visible'
        existingItem.opacity = 1
      }
    }
    else {
      this.highlights.set(uuid, {
        bounds,
        name,
        flashCount,
        hideComponentName,
        startTime: now,
        lastUpdateTime: now,
        opacity: 0,
        state: 'fade-in',
      })
    }

    this.scheduleRender()
  }

  private scheduleRender() {
    if (this.animationFrame)
      return
    this.animationFrame = requestAnimationFrame(() => this.render())
  }

  private render() {
    const now = Date.now()

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.ctx.font = '12px sans-serif'
    this.ctx.textBaseline = 'middle'

    for (const [uuid, item] of this.highlights.entries()) {
      if (!isInViewport(item.bounds))
        continue

      const fadeInElapsed = now - item.startTime
      const idleTime = now - item.lastUpdateTime
      const fadeOutElapsed = now - item.startTime

      switch (item.state) {
        case 'fade-in':
          item.opacity = Math.min(1, fadeInElapsed / this.FADE_IN_DURATION)
          if (fadeInElapsed >= this.FADE_IN_DURATION) {
            item.state = 'visible'
            item.opacity = 1
          }
          break

        case 'visible':
          if (idleTime >= this.DISPLAY_DURATION) {
            item.state = 'fade-out'
            item.startTime = now
          }
          break

        case 'fade-out':
          item.opacity = Math.max(0, 1 - (fadeOutElapsed / this.FADE_OUT_DURATION))
          if (fadeOutElapsed >= this.FADE_OUT_DURATION) {
            this.highlights.delete(uuid)
            continue
          }
          break
      }

      this.drawBorder(item)
      if (!item.hideComponentName) {
        this.drawLabel(item, item.opacity)
      }
    }

    if (this.highlights.size > 0) {
      this.animationFrame = requestAnimationFrame(() => this.render())
    }
    else {
      this.animationFrame = null
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
  }

  private drawBorder(item: HighlightItem) {
    const { bounds, flashCount, opacity } = item
    this.ctx.strokeStyle = `rgba(${Math.min(255, flashCount * 6)}, ${Math.max(0, 255 - flashCount * 6)}, 0, ${opacity})`
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(
      bounds.left,
      bounds.top,
      bounds.width,
      bounds.height,
    )
  }

  private drawLabel(item: HighlightItem, opacity: number) {
    const { bounds, name, flashCount } = item
    const labelMetrics = this.getTextMetrics(name)
    const padding = 6
    const labelHeight = 20

    // 计算标签位置 - 移除额外的padding，直接贴在边框上
    let labelX = bounds.left
    let labelY = bounds.top

    // 确保标签在视口内
    const viewportHeight = window.innerHeight
    const labelTotalHeight = labelHeight
    const viewportWidth = window.innerWidth
    const labelTotalWidth = labelMetrics.width + padding * 2

    // 如果标签底部超出视口
    if (labelY + labelTotalHeight > viewportHeight) {
      labelY = viewportHeight - labelTotalHeight
    }

    // 如果标签右侧超出视口
    if (labelX + labelTotalWidth > viewportWidth) {
      labelX = viewportWidth - labelTotalWidth
    }

    // 绘制背景
    this.ctx.fillStyle = `rgba(${Math.min(255, flashCount * 6)}, ${Math.max(0, 255 - flashCount * 6)}, 0, ${opacity * 0.8})`
    this.ctx.fillRect(labelX, labelY, labelMetrics.width + padding * 2, labelHeight)

    // 绘制文本 - 确保文本在背景中居中
    this.ctx.fillStyle = Math.min(255, flashCount * 6) > 128
      ? `rgba(255, 255, 255, ${opacity})`
      : `rgba(0, 0, 0, ${opacity})`
    this.ctx.fillText(name, labelX + padding, labelY + labelHeight / 2)
  }

  private getTextMetrics(text: string): TextMetrics {
    const cached = this.textMetricsCache.get(text)
    if (cached)
      return cached

    const metrics = this.ctx.measureText(text)
    this.textMetricsCache.set(text, metrics)
    return metrics
  }

  clear(uuid: string) {
    const item = this.highlights.get(uuid)
    if (item && item.state !== 'fade-out') {
      item.state = 'fade-out'
      item.startTime = Date.now()
      this.scheduleRender()
    }
  }

  clearAll() {
    this.highlights.clear()
    this.textMetricsCache.clear()
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  destroy() {
    this.clearAll()
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas)
    }
  }
}

let highlightCanvas: HighlightCanvas | null = null

function getHighlightCanvas(options?: HighlightCanvasOptions) {
  if (highlightCanvas)
    return highlightCanvas
  highlightCanvas = new HighlightCanvas(options)
  return highlightCanvas
}

window.addEventListener('unload', () => {
  if (highlightCanvas) {
    highlightCanvas.destroy()
    highlightCanvas = null
  }
})

type UpdateHighlightFn = (
  bounds: ComponentBoundingRect,
  name: string,
  flashCount: number,
  hideComponentName?: boolean
) => void

export function createUpdateHighlight(): UpdateHighlightFn {
  return throttle<UpdateHighlightFn>(
    (bounds, name, flashCount, hideComponentName) => {
      if (!isInViewport(bounds) || !highlightCanvas)
        return
      highlightCanvas.drawHighlight(bounds, name, name, flashCount, hideComponentName)
    },
    500,
  )
}

export function highlight(
  instance: any,
  uuid: string,
  flashCount: number,
  meta?: RenderMeta,
  options?: {
    hideComponentName?: boolean
  } & HighlightCanvasOptions,
) {
  const highlightCanvas = getHighlightCanvas(options)

  const bounds = getComponentBoundingRect(instance)

  if (!bounds.width && !bounds.height)
    return
  if (!isInViewport(bounds))
    return

  let name = `${getInstanceName(instance)} x ${flashCount}`
  if (meta) {
    const parts: string[] = [meta.phase]
    if (meta.renderTime != null)
      parts.push(`${meta.renderTime.toFixed(1)}ms`)
    if (meta.fps > 0)
      parts.push(`${meta.fps}fps`)
    name += ` · ${parts.join(' · ')}`
  }
  highlightCanvas?.drawHighlight(bounds, uuid, name, flashCount, options?.hideComponentName)
}

export function unhighlight(uuid: string) {
  highlightCanvas?.clear(uuid)
}

export function clearhighlight(uuid: string) {
  highlightCanvas?.clear(uuid)
}
