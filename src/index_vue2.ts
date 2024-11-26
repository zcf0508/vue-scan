import type { Plugin } from 'vue-demi'
import type { VueScanBaseOptions } from './types'
import { getInstanceName, type VueAppInstance } from '@vue/devtools-kit'
import { clearhighlight, highlight, unhighlight } from './core'
import { isDev } from './utils'

const plugin: Plugin<VueScanBaseOptions> = {
  install: (app: any, options?: VueScanBaseOptions) => {
    const { enable = isDev() } = options || {}

    if (!enable) {
      return
    }

    app.mixin({
      beforeCreate() {
        (this as any).__uuid = new Date().getTime()

        this.__flashTimeout = null as ReturnType<typeof setTimeout> | null
      },
      beforeUpdate() {
        const instance = (() => {
          this.subTree = {
            el: this.$el,
            component: this.$children,
          }
          return this
        })() as VueAppInstance

        const el = (() => {
          return instance?.$el
        })() as HTMLElement | undefined

        if (el) {
          const name = getInstanceName(instance)
          const uuid = `${name}__${(this as any).__uuid as string}`.replaceAll(' ', '_')

          highlight(instance, uuid, options)

          if (this.__flashTimeout) {
            clearTimeout(this.__flashTimeout)
            this.__flashTimeout = null
          }

          this.__flashTimeout = setTimeout(() => {
            unhighlight(uuid)
          }, 200)
        }
      },
      unmounted() {
        const uuid = `${(this as any).__uuid as string}`
        clearhighlight(uuid)
      },
    })
  },
}

export default plugin

export * from './types'
