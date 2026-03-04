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

    console.log('✅ Vue Scan DevPilot Plugin loaded')
    console.log('   Press Ctrl+Shift+V to toggle control panel')
    console.log('   Press Ctrl+Shift+R to toggle recording')
  })
}

setup()
