import type { DevpilotClient } from 'unplugin-devpilot/client'
import type { VueScanServerMethods } from './types'

// Extend global interface for storing listener reference
declare global {
  interface Document {
    __vueScanKeydownListener?: (e: KeyboardEvent) => void
  }
}

// Update control panel UI
function updatePanelContent(panel: HTMLDivElement, client: DevpilotClient<VueScanServerMethods>): void {
  const runtime = window.__VUE_SCAN_RUNTIME__
  const isRecording = runtime?.isRecording || false

  panel.innerHTML = `
    <div style="margin-bottom: 8px; font-weight: bold;">
      🔍 Vue Scan
    </div>
    <div style="margin-bottom: 8px; display: flex; align-items: center;">
      <span style="
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${isRecording ? '#00ff00' : '#666'};
        margin-right: 6px;
        display: inline-block;
      "></span>
      <span>${isRecording ? 'Recording' : 'Paused'}</span>
    </div>
    <div style="margin-bottom: 8px; color: #888;">
      Events: <span id="event-count">-</span>
    </div>
    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
      <button id="toggle-btn" style="
        padding: 4px 8px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        background: ${isRecording ? '#ff6b6b' : '#51cf66'};
        color: white;
      ">
        ${isRecording ? '⏸️ Pause' : '▶️ Start'}
      </button>
      <button id="clear-btn" style="
        padding: 4px 8px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        background: #495057;
        color: white;
      ">
        🗑️ Clear
      </button>
      <button id="stats-btn" style="
        padding: 4px 8px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        background: #495057;
        color: white;
      ">
        📊 Stats
      </button>
    </div>
    <div style="margin-top: 8px; font-size: 10px; color: #666;">
      Ctrl+Shift+V: Toggle Panel<br>
      Ctrl+Shift+R: Toggle Recording
    </div>
  `

  // Bind events
  const toggleBtn = panel.querySelector('#toggle-btn')
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      runtime?.toggleRecording()
      updatePanelContent(panel, client)
    })
  }

  const clearBtn = panel.querySelector('#clear-btn')
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      runtime?.clearData()
    })
  }

  const statsBtn = panel.querySelector('#stats-btn')
  if (statsBtn) {
    statsBtn.addEventListener('click', async () => {
      const data = await client.rpcCall('vue-scan:exportData')
      // eslint-disable-next-line no-alert
      alert(JSON.stringify(data, null, 2))
    })
  }
}

// Get current page's panel from DOM
function getCurrentPanel(): HTMLDivElement | null {
  return document.getElementById('vue-scan-control-panel') as HTMLDivElement | null
}

// Register keyboard shortcuts
export function registerKeyboardShortcuts(client: DevpilotClient<VueScanServerMethods>): void {
  // Remove existing listener if any to avoid duplicates
  if (document.__vueScanKeydownListener) {
    document.removeEventListener('keydown', document.__vueScanKeydownListener)
  }

  const keydownListener = (e: KeyboardEvent) => {
    // Ctrl+Shift+V: Toggle panel visibility
    if (e.ctrlKey && e.shiftKey && e.key === 'V') {
      const panel = getCurrentPanel()
      if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none'
        // eslint-disable-next-line no-console
        console.log(`[Vue Scan] Panel ${panel.style.display === 'none' ? 'hidden' : 'shown'}`)
      }
      e.preventDefault()
    }

    // Ctrl+Shift+R: Toggle recording
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      window.__VUE_SCAN_RUNTIME__?.toggleRecording()
      const panel = getCurrentPanel()
      if (panel) {
        updatePanelContent(panel, client)
      }
      e.preventDefault()
    }
  }

  document.addEventListener('keydown', keydownListener)
  document.__vueScanKeydownListener = keydownListener

  // eslint-disable-next-line no-console
  console.log('[Vue Scan] Keyboard shortcuts registered (Ctrl+Shift+V/R)')
}

// Create control panel UI
export function createControlPanel(client: DevpilotClient<VueScanServerMethods>): HTMLDivElement | null {
  // Check if panel already exists in current document
  if (document.getElementById('vue-scan-control-panel')) {
    return null
  }

  const panel = document.createElement('div')
  panel.id = 'vue-scan-control-panel'
  panel.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 12px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 12px;
    z-index: 10000;
    min-width: 200px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `

  document.body.appendChild(panel)
  panel.style.display = 'none'
  updatePanelContent(panel, client)

  // Update event count periodically (only when panel is visible)
  setInterval(async () => {
    const currentPanel = getCurrentPanel()
    if (!currentPanel || currentPanel.style.display === 'none') {
      return
    }
    try {
      const data = await client.rpcCall('vue-scan:exportData') as any
      const countEl = currentPanel.querySelector('#event-count')
      if (countEl && data) {
        countEl.textContent = `${data.events?.length || 0} / 10000`
      }
    }
    catch {
      // Ignore errors
    }
  }, 1000)

  // eslint-disable-next-line no-console
  console.log('[Vue Scan] Control panel created')

  return panel
}
