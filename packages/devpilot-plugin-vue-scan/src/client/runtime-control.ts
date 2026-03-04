import type { DevpilotClient } from 'unplugin-devpilot/client'
import type { RuntimeControl, VueScanServerMethods } from './types'

// Initialize runtime control
export function initRuntimeControl(client: DevpilotClient<VueScanServerMethods>): RuntimeControl {
  if (!window.__VUE_SCAN_RUNTIME__) {
    window.__VUE_SCAN_RUNTIME__ = {
      isRecording: false,
      showHighlight: false,

      startRecording() {
        this.isRecording = true
        this.showHighlight = true
        client.rpcCall('vue-scan:startRecording').catch(() => {})
        console.log('📊 Vue Scan: Recording started')
      },

      stopRecording() {
        this.isRecording = false
        this.showHighlight = false
        client.rpcCall('vue-scan:stopRecording').catch(() => {})
        console.log('⏸️ Vue Scan: Recording stopped')
      },

      toggleRecording() {
        if (this.isRecording) {
          this.stopRecording()
        }
        else {
          this.startRecording()
        }
      },

      clearData() {
        client.rpcCall('vue-scan:clearData').catch(() => {})
        console.log('🗑️ Vue Scan: Data cleared')
      },
    }
  }

  return window.__VUE_SCAN_RUNTIME__
}
