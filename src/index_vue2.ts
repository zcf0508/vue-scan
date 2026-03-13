import type { VueAppInstance } from '@vue/devtools-kit'
import type { Plugin } from 'vue-demi'
import type { VueScanBaseOptions } from './types'
import { createOnBeforeUnmountHook, createOnBeforeUpdateHook, createOnMountedHook, createOnUpdatedHook } from './core/index'
import { isDev } from './utils'

const plugin: Plugin<VueScanBaseOptions> = {
  install: (app, options?: VueScanBaseOptions) => {
    const { enable = isDev() } = options || {}

    if (!enable) {
      return
    }

    app.mixin({
      mounted() {
        const instance = this as VueAppInstance

        if (!instance.__m) {
          instance.__m = createOnMountedHook(instance, options)
        }

        if (!instance.__bu) {
          instance.__bu = createOnBeforeUpdateHook(instance)
        }

        if (!instance.__u) {
          instance.__u = createOnUpdatedHook(instance, options)
        }

        if (!instance.__bum) {
          instance.__bum = createOnBeforeUnmountHook(instance)
        }

        instance.__vue_scan_injected__ = true
        instance.__m?.()
      },
      beforeUpdate() {
        const instance = this as VueAppInstance

        instance.__bu?.()
      },
      updated() {
        const instance = this as VueAppInstance

        instance.__u?.()
      },
      beforeDestroy() {
        const instance = this as VueAppInstance

        instance.__bum?.()
      },
    })
  },
}

export default plugin

export * from './types'
