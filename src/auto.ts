import type { VNodeNormalizedChildren } from 'vue-demi'
import { throttle } from 'lodash-es'
import { type BACE_VUE_INSTANCE, createOnBeforeUnmountHook, createOnBeforeUpdateHook, createOnMountedHook, createOnUpdatedHook } from './core/hook'
import plugin from './index'
import { createDomMutationObserver } from './utils/MutationObserverDom'

(() => {
  // eslint-disable-next-line node/prefer-global/process
  if (!window.process) {
    // @ts-expect-error browser mock
    // eslint-disable-next-line node/prefer-global/process
    window.process = {
      env: {
        NODE_ENV: 'development',
      },
    }
  }

  if (!window.__VUE_SCAN__) {
    window.__VUE_SCAN__ = {
      plugin,
      createOnBeforeUpdateHook,
      createOnBeforeUnmountHook,
      createOnMountedHook,
      createOnUpdatedHook,
    }
  }
})()

// Check if the __vue_app__ property exists on the #app node of the page

function injectVueScan(node: HTMLElement) {
  // @ts-expect-error vue internal
  if ((node.__vue_app__ || node.__vue__)) {
    // @ts-expect-error vue internal
    if (node.__vue_app__) { // VUE 3
      // @ts-expect-error vue internal
      const vueInstance = node.__vue_app__._container._vnode.component as BACE_VUE_INSTANCE

      // @ts-expect-error vue internal
      node.__vue_app__.use(window.__VUE_SCAN__.plugin)

      const first = !vueInstance?.__vue_scan_injected__

      if (!first) {
        console.log(vueInstance)
      }

      function mixinChildren(children: VNodeNormalizedChildren) {
        if (!children) {
          return
        }

        if (typeof children === 'string') {
          return
        }

        if (!Array.isArray(children)) {
          return
        }

        children.forEach((item) => {
          if (typeof item !== 'object') {
            return
          }

          if (item && 'component' in item && item.component) {
            mixin(item.component as BACE_VUE_INSTANCE)
          }
          else if (item && 'children' in item) {
            mixinChildren(item.children)
          }
        })
      }

      function mixin(vueInstance: BACE_VUE_INSTANCE) {
        if (vueInstance.subTree?.el && vueInstance?.__vue_scan_injected__ !== true) {
          const onBeforeUpdate = createOnBeforeUpdateHook(vueInstance)
          const onUpdated = createOnUpdatedHook(vueInstance)
          const onBeforeUnmount = createOnBeforeUnmountHook(vueInstance)

          if (onBeforeUpdate) {
            if (vueInstance?.bu) {
              vueInstance.bu.push(onBeforeUpdate)
            }
            else {
              vueInstance!.bu = [onBeforeUpdate]
            }
          }

          if (onUpdated) {
            if (vueInstance?.u) {
              vueInstance.u.push(onUpdated)
            }
            else {
              vueInstance!.u = [onUpdated]
            }
          }

          if (onBeforeUnmount) {
            if (vueInstance?.bum) {
              vueInstance.bum.push(onBeforeUnmount)
            }
            else {
              vueInstance!.bum = [onBeforeUnmount]
            }
          }

          vueInstance.__vue_scan_injected__ = true
        }

        if (!vueInstance?.subTree?.component && vueInstance?.subTree?.children) {
          mixinChildren(vueInstance.subTree.children)
        }
        else if (vueInstance?.subTree?.component) {
          mixin(vueInstance.subTree.component as BACE_VUE_INSTANCE)
        }

        else if (!vueInstance?.subTree && vueInstance?.children) {
          mixinChildren(vueInstance.children)
        }
      }

      mixin(vueInstance)

      if (!first) {
        console.log('vue scan inject success')
      }

      vueInstance.__vue_scan_injected__ = true
    }
    // @ts-expect-error vue internal
    else if (node.__vue__) { // VUE 2
      // @ts-expect-error vue internal
      const vueInstance = (node.__vue__?.$vnode?.componentInstance || node.__vue__) as BACE_VUE_INSTANCE

      const first = !vueInstance?.__vue_scan_injected__

      if (first) {
        console.log(vueInstance)
      }

      function mixin(vueInstance: BACE_VUE_INSTANCE) {
        if (vueInstance?.$el && vueInstance?.__vue_scan_injected__ !== true) {
          const onBeforeUpdate = createOnBeforeUpdateHook(vueInstance)
          const onUpdated = createOnUpdatedHook(vueInstance)
          const onBeforeUnmount = createOnBeforeUnmountHook(vueInstance)

          if (onBeforeUpdate) {
            if (vueInstance?.$options?.beforeUpdate) {
              const newBeforeUpdate = [...vueInstance.$options.beforeUpdate]
              newBeforeUpdate.push(onBeforeUpdate)
              vueInstance.$set(vueInstance.$options, 'beforeUpdate', newBeforeUpdate)
            }
            else if (vueInstance?.$options) {
              vueInstance.$set(vueInstance.$options, 'beforeUpdate', [onBeforeUpdate])
            }
          }

          if (onUpdated) {
            if (vueInstance?.$options?.updated) {
              const newUpdated = [...vueInstance.$options.updated]
              newUpdated.push(onUpdated)
              vueInstance.$set(vueInstance.$options, 'updated', newUpdated)
            }
            else if (vueInstance?.$options) {
              vueInstance.$set(vueInstance.$options, 'updated', [onUpdated])
            }
          }

          if (onBeforeUnmount) {
            if (vueInstance?.$options?.beforeDestroy) {
              const newBeforeDestroy = [...vueInstance.$options.beforeDestroy]
              newBeforeDestroy.push(onBeforeUnmount)
              vueInstance.$set(vueInstance.$options, 'beforeDestroy', newBeforeDestroy)
            }
            else if (vueInstance?.$options) {
              vueInstance.$set(vueInstance.$options, 'beforeDestroy', [onBeforeUnmount])
            }
          }

          vueInstance.__vue_scan_injected__ = true
        }

        if (vueInstance?.$children) {
          (vueInstance?.$children as Array<BACE_VUE_INSTANCE>).forEach((child) => {
            mixin(child)
          })
        }
      }

      mixin(vueInstance)

      if (first) {
        console.log('vue scan inject success')
      }

      vueInstance.__vue_scan_injected__ = true
    }
  }
}

function getMountDoms() {
  const elements = Array.from(document.body.children)

  return elements.filter((element) => {
    // @ts-expect-error vue internal
    return (!!element.__vue_app__ || !!element.__vue__)
  }) as HTMLElement[]
}

const vue2ObserverMap = new WeakMap<HTMLElement, MutationObserver>()

const documentObserver = new MutationObserver(throttle(() => {
  if (!window.__VUE_SCAN__) {
    return
  }

  const mountDoms = getMountDoms()

  if (mountDoms.length === 0) {
    return
  }

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
      // vue3
      documentObserver.disconnect()
      injectVueScan(mountDom)
    }
    else {
      // vue2
      if (!vue2ObserverMap.get(mountDom)) {
        vue2ObserverMap.set(mountDom, createDomMutationObserver(
          () => mountDom,
          () => {
            console.log('injectVueScan')
            injectVueScan(mountDom)
          },
          {
            childList: true,
            subtree: true,
          },
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
