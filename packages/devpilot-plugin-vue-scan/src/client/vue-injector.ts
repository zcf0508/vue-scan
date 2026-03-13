/**
 * Vue component injection for data collection.
 * Follows the same injection pattern as src/auto.ts,
 * adding a data-report hook that sends update events via RPC.
 */
import type { DevpilotClient } from 'unplugin-devpilot/client'
import type { VueScanServerMethods } from './types'
import { throttle } from 'lodash-es'
import { getCurrentFps } from './fps'
import { getComponentBoundingRect, getInstanceName, isInViewport } from './helpers'

interface VueInstance {
  uid?: number
  _uid?: number
  $el?: HTMLElement
  subTree?: {
    el?: HTMLElement
    type?: any
    component?: VueInstance
    children?: any
  }
  children?: any
  $options?: any
  $children?: VueInstance[]
  $vnode?: { componentInstance?: VueInstance }
  $set?: (target: any, key: string, value: any) => void
  type?: any
  root?: any
  $root?: any
  appContext?: any
  parent?: any
  __vue_scan_injected__?: boolean
  __flashCount?: number
  __flashTimeout?: ReturnType<typeof setTimeout> | null
  __renderStartTime?: number | null
  __dataReportHook?: (() => void) | null
  __beforeUpdateHook?: (() => void) | null
  __updatedHook?: (() => void) | null
  bu?: Array<() => void> | null
  u?: Array<() => void> | null
  bum?: Array<() => void> | null
}

function getSourceLocation(instance: VueInstance): string | undefined {
  // 1. Check data-insp-path on root element (injected by unplugin-devpilot)
  const el = instance?.subTree?.el || instance.$el
  if (el instanceof HTMLElement) {
    const inspPath = el.getAttribute('data-insp-path')
    if (inspPath)
      return inspPath
  }

  // 2. Fallback to __file from Vue compiler
  const file = instance?.type?.__file
  if (file)
    return file

  return undefined
}

function isFromUserCode(source: string | undefined): boolean {
  if (!source)
    return false
  return !source.includes('node_modules')
}

function sendReportEvent(
  instance: VueInstance,
  client: DevpilotClient<VueScanServerMethods>,
  phase: 'mount' | 'update',
  renderTime?: number,
) {
  const runtime = window.__VUE_SCAN_RUNTIME__
  if (!runtime?.isRecording)
    return

  const name = getInstanceName(instance)
  const uuid = `${name}__${instance.uid || instance._uid}`.replaceAll(' ', '_')
  const sourceLocation = getSourceLocation(instance)
  const isUserComponent = isFromUserCode(sourceLocation)

  if (!instance.__flashCount) {
    instance.__flashCount = 0
  }
  instance.__flashCount++

  const bounds = getComponentBoundingRect(instance)

  client.rpcCall('vue-scan:recordUpdate', {
    timestamp: Date.now(),
    componentName: name,
    componentId: uuid,
    phase,
    renderTime,
    fps: getCurrentFps(),
    updateCount: instance.__flashCount,
    bounds: {
      width: bounds.width,
      height: bounds.height,
      top: bounds.top,
      left: bounds.left,
    },
    isInViewport: isInViewport(bounds),
    isUserComponent,
    sourceLocation,
  }).catch(() => {})
}

function createBeforeUpdateHook(instance: VueInstance) {
  return () => {
    const runtime = window.__VUE_SCAN_RUNTIME__
    if (!runtime?.isRecording)
      return
    instance.__renderStartTime = performance.now()
  }
}

function createMountedReportHook(instance: VueInstance, client: DevpilotClient<VueScanServerMethods>) {
  const el = instance?.subTree?.el || instance.$el
  if (!el)
    return

  return () => {
    sendReportEvent(instance, client, 'mount')
  }
}

function createUpdatedReportHook(instance: VueInstance, client: DevpilotClient<VueScanServerMethods>) {
  const el = instance?.subTree?.el || instance.$el
  if (!el)
    return

  return () => {
    const renderTime = instance.__renderStartTime != null
      ? performance.now() - instance.__renderStartTime
      : undefined
    instance.__renderStartTime = null
    sendReportEvent(instance, client, 'update', renderTime)
  }
}

function injectVueScan(node: HTMLElement, client: DevpilotClient<VueScanServerMethods>) {
  // @ts-expect-error vue internal
  if (node.__vue_app__) {
    // Vue 3
    // @ts-expect-error vue internal
    const vueApp = node.__vue_app__

    // Register mixin to cover future-mounted components
    if (!vueApp.__vue_scan_mixin_installed__) {
      vueApp.mixin({
        mounted(this: any) {
          const instance = this.$ as VueInstance
          if (!instance.__dataReportHook) {
            instance.__dataReportHook = createMountedReportHook(instance, client)
          }
          if (!instance.__beforeUpdateHook) {
            instance.__beforeUpdateHook = createBeforeUpdateHook(instance)
          }
          if (!instance.__updatedHook) {
            instance.__updatedHook = createUpdatedReportHook(instance, client)
          }
          instance.__dataReportHook?.()
        },
        beforeUpdate(this: any) {
          const instance = this.$ as VueInstance
          instance.__beforeUpdateHook?.()
        },
        updated(this: any) {
          const instance = this.$ as VueInstance
          instance.__updatedHook?.()
        },
      })
      vueApp.__vue_scan_mixin_installed__ = true
    }

    const vueInstance = vueApp._container._vnode.component as VueInstance

    function mixinChildren(children: any) {
      if (!children || typeof children === 'string' || !Array.isArray(children))
        return

      children.forEach((item: any) => {
        if (typeof item !== 'object')
          return
        if (item && 'component' in item && item.component) {
          mixin(item.component as VueInstance)
        }
        else if (item && 'children' in item) {
          mixinChildren(item.children)
        }
      })
    }

    function mixin(instance: VueInstance) {
      if (instance.subTree?.el && instance.__vue_scan_injected__ !== true) {
        const beforeUpdate = createBeforeUpdateHook(instance)
        const updated = createUpdatedReportHook(instance, client)

        if (beforeUpdate) {
          if (instance.bu) {
            instance.bu.push(beforeUpdate)
          }
          else {
            instance.bu = [beforeUpdate]
          }
        }

        if (updated) {
          if (instance.u) {
            instance.u.push(updated)
          }
          else {
            instance.u = [updated]
          }
        }

        instance.__vue_scan_injected__ = true
      }

      if (!instance.subTree?.component && instance.subTree?.children) {
        mixinChildren(instance.subTree.children)
      }
      else if (instance.subTree?.component) {
        mixin(instance.subTree.component as VueInstance)
      }
      else if (!instance.subTree && instance.children) {
        mixinChildren(instance.children)
      }
    }

    mixin(vueInstance)
    vueInstance.__vue_scan_injected__ = true
  }
  // @ts-expect-error vue internal
  else if (node.__vue__) {
    // Vue 2
    // @ts-expect-error vue internal
    const vueInstance = (node.__vue__?.$vnode?.componentInstance || node.__vue__) as VueInstance

    function mixin(instance: VueInstance) {
      if (instance?.$el && instance.__vue_scan_injected__ !== true) {
        const beforeUpdate = createBeforeUpdateHook(instance)
        const updated = createUpdatedReportHook(instance, client)

        if (beforeUpdate) {
          if (instance.$options?.beforeUpdate) {
            const arr = [...instance.$options.beforeUpdate]
            arr.push(beforeUpdate)
            instance.$set!(instance.$options, 'beforeUpdate', arr)
          }
          else if (instance.$options) {
            instance.$set!(instance.$options, 'beforeUpdate', [beforeUpdate])
          }
        }

        if (updated) {
          if (instance.$options?.updated) {
            const arr = [...instance.$options.updated]
            arr.push(updated)
            instance.$set!(instance.$options, 'updated', arr)
          }
          else if (instance.$options) {
            instance.$set!(instance.$options, 'updated', [updated])
          }
        }

        instance.__vue_scan_injected__ = true
      }

      if (instance.$children) {
        (instance.$children as Array<VueInstance>).forEach((child) => {
          mixin(child)
        })
      }
    }

    mixin(vueInstance)
    vueInstance.__vue_scan_injected__ = true
  }
}

function getMountDoms() {
  return Array.from(document.body.children).filter((element) => {
    // @ts-expect-error vue internal
    return !!(element.__vue_app__ || element.__vue__)
  }) as HTMLElement[]
}

function createDomMutationObserver(
  getTarget: () => HTMLElement | null,
  callback: MutationCallback,
  options: MutationObserverInit,
  throttleWait: number,
) {
  const targetObserver = new MutationObserver(throttle(callback, throttleWait))

  const findTargetObserver = new MutationObserver(throttle(() => {
    const target = getTarget()
    if (target) {
      findTargetObserver.disconnect()
      targetObserver.observe(target, options)
    }
  }, 200))

  findTargetObserver.observe(document.body, {
    childList: true,
    subtree: true,
  })

  return targetObserver
}

export function injectVueScanWithRuntimeControl(client: DevpilotClient<VueScanServerMethods>): void {
  const vue2ObserverMap = new WeakMap<HTMLElement, MutationObserver>()

  const documentObserver = new MutationObserver(throttle(() => {
    const mountDoms = getMountDoms()
    if (mountDoms.length === 0)
      return

    const isVue3 = mountDoms.some((mountDom) => {
      // @ts-expect-error vue internal
      return !!mountDom.__vue_app__
    })

    if (isVue3) {
      documentObserver.disconnect()
    }

    mountDoms.forEach((mountDom) => {
      // @ts-expect-error vue internal
      if (mountDom.__vue_app__) {
        documentObserver.disconnect()
        injectVueScan(mountDom, client)
      }
      else {
        if (!vue2ObserverMap.get(mountDom)) {
          vue2ObserverMap.set(mountDom, createDomMutationObserver(
            () => mountDom,
            () => injectVueScan(mountDom, client),
            { childList: true, subtree: true },
            600,
          ))
        }
      }
    })
  }, 600))

  documentObserver.observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
  })

  // Try immediate injection
  const mountDoms = getMountDoms()
  mountDoms.forEach((mountDom) => {
    injectVueScan(mountDom, client)
  })
}
