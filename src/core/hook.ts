import type { VueAppInstance } from '@vue/devtools-kit'
import { getCurrentFps } from './fps'
import {
  clearhighlight,
  createUpdateHighlight,
  highlight,
  type HighlightCanvasOptions,
  unhighlight,
} from './highlight'
import { getInstanceName } from './utils'

export interface BACE_VUE_INSTANCE extends VueAppInstance {
  __vue_scan_injected__?: boolean
  /** beforeUpdate */
  bu?: Array<() => void> | null
  /** updated */
  u?: Array<() => void> | null
  /** beforeUnmount */
  bum?: Array<() => void> | null
  _uid?: number
  __flashCount?: number
  __flashTimeout?: ReturnType<typeof setTimeout> | null
  __renderStartTime?: number | null
  $options?: {
    beforeUpdate?: Array<() => void> | null
    updated?: Array<() => void> | null
    beforeDestroy?: Array<() => void> | null
  }
}

export function createOnBeforeUpdateHook(instance?: BACE_VUE_INSTANCE) {
  if (!instance) {
    return
  }

  const el = instance?.subTree?.el || instance.$el

  if (!el) {
    return
  }

  return () => {
    instance.__renderStartTime = performance.now()
  }
}

export function createOnMountedHook(instance?: BACE_VUE_INSTANCE, options?: {
  hideComponentName?: boolean
  interval?: number
} & HighlightCanvasOptions) {
  const {
    interval = 1000,
  } = options || {}

  if (!instance) {
    return
  }

  const el = instance?.subTree?.el || instance.$el

  if (!el) {
    return
  }

  const name = getInstanceName(instance)
  const uuid = `${name}__${instance.uid || instance._uid}`.replaceAll(' ', '_')

  return () => {
    if (!instance.__flashCount) {
      instance.__flashCount = 0
    }

    if (!instance.__updateHighlight) {
      instance.__updateHighlight = createUpdateHighlight()
    }

    instance.__flashCount++

    const fps = getCurrentFps()
    highlight(instance, uuid, instance.__flashCount, { phase: 'mount', fps }, options)

    if (instance.__flashTimeout) {
      clearTimeout(instance.__flashTimeout)
      instance.__flashTimeout = null
    }

    instance.__flashTimeout = setTimeout(() => {
      unhighlight(uuid)
      instance.__flashTimeout = null
      instance.__flashCount = 0
    }, interval)
  }
}

export function createOnUpdatedHook(instance?: BACE_VUE_INSTANCE, options?: {
  hideComponentName?: boolean
  interval?: number
} & HighlightCanvasOptions) {
  const {
    interval = 1000,
  } = options || {}

  if (!instance) {
    return
  }

  const el = instance?.subTree?.el || instance.$el

  if (!el) {
    return
  }

  const name = getInstanceName(instance)
  const uuid = `${name}__${instance.uid || instance._uid}`.replaceAll(' ', '_')

  return () => {
    if (!instance.__flashCount) {
      instance.__flashCount = 0
    }

    if (!instance.__updateHighlight) {
      instance.__updateHighlight = createUpdateHighlight()
    }

    instance.__flashCount++

    const renderTime = instance.__renderStartTime != null
      ? performance.now() - instance.__renderStartTime
      : undefined
    instance.__renderStartTime = null
    const fps = getCurrentFps()

    highlight(instance, uuid, instance.__flashCount, { phase: 'update', renderTime, fps }, options)

    if (instance.__flashTimeout) {
      clearTimeout(instance.__flashTimeout)
      instance.__flashTimeout = null
    }

    instance.__flashTimeout = setTimeout(() => {
      unhighlight(uuid)
      instance.__flashTimeout = null
      instance.__flashCount = 0
    }, interval)
  }
}

export function createOnBeforeUnmountHook(instance?: BACE_VUE_INSTANCE) {
  if (!instance) {
    return
  }

  const el = instance?.subTree?.el || instance.$el

  if (!el) {
    return
  }

  const name = getInstanceName(instance)
  const uuid = `${name}__${instance.uid || instance._uid}`.replaceAll(' ', '_')

  return () => {
    clearhighlight(uuid)
  }
}
