import type { DevpilotClient } from 'unplugin-devpilot/client'
import type { VueScanServerMethods } from './types'

// Create control panel UI
export function createControlPanel(client: DevpilotClient<VueScanServerMethods>): void {
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

  function updatePanel() {
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
        updatePanel()
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

  document.body.appendChild(panel)
  panel.style.display = 'none'
  updatePanel()

  // Update event count periodically
  setInterval(async () => {
    try {
      const data = await client.rpcCall('vue-scan:exportData') as any
      const countEl = panel.querySelector('#event-count')
      if (countEl && data) {
        countEl.textContent = `${data.events?.length || 0} / 10000`
      }
    }
    catch {
      // Ignore errors
    }
  }, 1000)

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+V: Toggle panel visibility
    if (e.ctrlKey && e.shiftKey && e.key === 'V') {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none'
      e.preventDefault()
    }

    // Ctrl+Shift+R: Toggle recording
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      window.__VUE_SCAN_RUNTIME__?.toggleRecording()
      updatePanel()
      e.preventDefault()
    }
  })
}
