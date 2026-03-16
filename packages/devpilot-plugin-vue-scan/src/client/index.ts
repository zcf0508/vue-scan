import type { VueScanClientRpc, VueScanServerMethods } from './types'
// Client-side entry point for Vue Scan DevPilot Plugin
import { defineRpcHandlers, getDevpilotClient } from 'unplugin-devpilot/client'
import { createControlPanel } from './control-panel'
import { initRuntimeControl } from './runtime-control'
import { injectVueScanWithRuntimeControl } from './vue-injector'

// Define RPC handlers (currently empty as we don't need server-to-client RPC)
export const rpcHandlers: VueScanClientRpc = defineRpcHandlers<VueScanClientRpc>({
  // Add client-side RPC handlers here if needed
})

function setup() {
  const client = getDevpilotClient<VueScanServerMethods>()
  if (!client) {
    // Virtual module not initialized yet, retry
    setTimeout(setup, 100)
    return
  }

  // Wait for WebSocket connection to be ready
  client.onConnected(() => {
    // 1. Initialize runtime control
    initRuntimeControl(client)

    // 2. Inject Vue monitoring with runtime control
    injectVueScanWithRuntimeControl(client)

    // 3. Create control panel
    createControlPanel(client)

    // eslint-disable-next-line no-console
    console.log(
      '%c 🔍 Vue Scan DevPilot %c Ctrl+Shift+V → Toggle Panel | Ctrl+Shift+R → Toggle Recording ',
      'background:#35495e;color:#fff;padding:2px 4px;border-radius:3px 0 0 3px;',
      'background:#41b883;color:#fff;padding:2px 4px;border-radius:0 3px 3px 0;',
    )
  })
}

setup()
