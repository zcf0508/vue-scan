import type { VueScanClientRpc, VueScanServerMethods } from './types'
// Client-side entry point for Vue Scan DevPilot Plugin
import { defineRpcHandlers, getDevpilotClient } from 'unplugin-devpilot/client'
import { createControlPanel, registerKeyboardShortcuts } from './control-panel'
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
    // eslint-disable-next-line no-console
    console.log('[Vue Scan] Waiting for DevPilot client...')
    setTimeout(setup, 100)
    return
  }

  // eslint-disable-next-line no-console
  console.log('[Vue Scan] DevPilot client found, connecting...')

  // Track connection timeout
  let connectionTimeout: ReturnType<typeof setTimeout> | null = null

  // Wait for WebSocket connection to be ready
  client.onConnected(() => {
    if (connectionTimeout) {
      clearTimeout(connectionTimeout)
    }

    // eslint-disable-next-line no-console
    console.log('[Vue Scan] Connected to DevPilot server')

    // 1. Initialize runtime control
    initRuntimeControl(client)

    // 2. Inject Vue monitoring with runtime control
    injectVueScanWithRuntimeControl(client)

    // 3. Create control panel
    createControlPanel(client)

    // 4. Register keyboard shortcuts (now that client is available)
    registerKeyboardShortcuts(client)

    // eslint-disable-next-line no-console
    console.log(
      '%c 🔍 Vue Scan DevPilot %c Ctrl+Shift+V → Toggle Panel | Ctrl+Shift+R → Toggle Recording ',
      'background:#35495e;color:#fff;padding:2px 4px;border-radius:3px 0 0 3px;',
      'background:#41b883;color:#fff;padding:2px 4px;border-radius:0 3px 3px 0;',
    )
  })

  // Set connection timeout warning
  connectionTimeout = setTimeout(() => {
    // eslint-disable-next-line no-console
    console.warn('[Vue Scan] WebSocket connection timeout - DevPilot server may not be running')
  }, 5000)
}

setup()
