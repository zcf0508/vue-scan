# devpilot-plugin-vue-scan

A [DevPilot](https://github.com/zcf0508/unplugin-devpilot) plugin that exposes Vue component render performance data to LLMs via MCP.

[![NPM version](https://img.shields.io/npm/v/devpilot-plugin-vue-scan?color=a1b858&label=)](https://www.npmjs.com/package/devpilot-plugin-vue-scan)

## What It Does

- Injects hooks into Vue 2/3 component `beforeUpdate` lifecycle to track re-renders in real time
- Stores update events server-side in a circular buffer (10,000 events max)
- Provides a `queryVueScanData` MCP tool that returns **per-component aggregated summaries** with source code locations
- Enables LLMs to analyze render performance, identify hot components, and pinpoint the source file

## Installation

```bash
pnpm add devpilot-plugin-vue-scan
```

## Usage

Register as a DevPilot plugin in your Vite config:

```ts
import vueScanPlugin from 'devpilot-plugin-vue-scan'
import DevPilot from 'unplugin-devpilot/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    DevPilot({
      plugins: [vueScanPlugin],
    }),
  ],
})
```

## How It Works

1. **Start recording** — Press `Ctrl+Shift+R` or click the control panel's Start button
2. **Interact with the page** — Component updates are captured automatically
3. **Query via MCP** — LLM calls `queryVueScanData` to get aggregated performance data

## MCP Tool: `queryVueScanData`

Returns per-component render performance summaries.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Max components to return |
| `componentName` | string | - | Filter by name (partial match) |
| `timeRange` | `{ start, end }` | - | Filter by timestamp range (ms) |
| `minUpdateCount` | number | - | Only components updated ≥ N times |
| `onlyInViewport` | boolean | - | Exclude off-screen renders |
| `onlyUserComponents` | boolean | true | Filter out library components |
| `includeRawEvents` | boolean | false | Include individual event details |
| `sortBy` | string | totalUpdates | `totalUpdates` / `updatesPerSecond` / `componentName` |

### Response

```jsonc
{
  "components": [
    {
      "componentName": "UserList",
      "sourceLocation": "src/views/users/UserList.vue:25:5:div",
      "totalUpdates": 42,
      "updatesPerSecond": 14.0,
      "firstUpdate": 1772592779510,
      "lastUpdate": 1772592782451
    }
  ],
  "metadata": {
    "recordingStatus": "active",
    "totalEvents": 997,
    "uniqueComponents": 20,
    "bufferSize": 997,
    "bufferCapacity": 10000,
    "timeRange": { "start": 1772592779510, "end": 1772592782453 }
  }
}
```

### User vs Library Components

Components are identified as user code when their DOM root element has a `data-insp-path` attribute (injected by `unplugin-devpilot` at build time) or when `instance.type.__file` points to a path outside `node_modules`. With `onlyUserComponents: true` (default), library components are filtered out.

## Control Panel

A floating panel at the bottom-right corner of the page provides:

- **Start/Pause** recording toggle
- **Clear** recorded data
- **Event counter** showing buffer usage
- **Keyboard shortcuts**: `Ctrl+Shift+V` (toggle panel), `Ctrl+Shift+R` (toggle recording)

## License

[MIT](../../LICENSE)
