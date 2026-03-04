// Server-side RPC methods that client can call
export interface VueScanServerMethods {
  'vue-scan:recordUpdate': (data: {
    timestamp: number
    componentName: string
    componentId: string
    updateCount: number
    bounds: {
      width: number
      height: number
      top: number
      left: number
    }
    isInViewport: boolean
    isUserComponent: boolean
    sourceLocation?: string
  }) => Promise<void>
  'vue-scan:startRecording': () => Promise<{ status: string }>
  'vue-scan:stopRecording': () => Promise<{ status: string }>
  'vue-scan:clearData': () => Promise<{ status: string }>
  'vue-scan:exportData': () => Promise<unknown>
}

// Client-side RPC interface (methods that server can call on client)
export interface VueScanClientRpc {
  // Add client-side RPC methods here if needed in the future
}

export interface RuntimeControl {
  isRecording: boolean
  showHighlight: boolean
  startRecording: () => void
  stopRecording: () => void
  toggleRecording: () => void
  clearData: () => void
}

// Extend window interface
declare global {
  interface Window {
    __VUE_SCAN_RUNTIME__?: RuntimeControl
  }
}
