---
name: vue-scan
description: Vue component render performance monitoring. Captures mount/update events with render time, FPS, and source locations. Provides per-component aggregated summaries for analyzing render frequency, slow components, and frame drops.
allowed-tools: [
  "queryVueScanData"
]
---

# Vue Scan Skill

Monitor and analyze Vue component render performance via real-time update event tracking.

## ⚠️ CRITICAL: Recording Must Be Active

**Data is only collected while recording is active.** Before querying, ensure recording has been started via the control panel (Ctrl+Shift+R) or RPC. If `bufferSize` is 0, remind the user to start recording and reproduce their scenario.

## How It Works

- Client-side hooks are injected into Vue 2/3 component `mounted` and `updated` lifecycle
- Each render emits an event with: phase (mount/update), render time (ms), FPS, component name, source location, update count, viewport visibility
- Render time is measured between `beforeUpdate` and `updated` hooks via `performance.now()`
- FPS is tracked using a `requestAnimationFrame` sliding window (1s)
- Events are stored server-side in a circular buffer (max 10,000 events)
- `queryVueScanData` returns **per-component aggregated summaries** (not raw events) by default

## Workflow

1. **Ensure recording**: Ask user to start recording and interact with the page
2. **Query overview**: Call `queryVueScanData()` — returns components sorted by `totalUpdates`
3. **Drill down**: Filter by `componentName` or sort by `updatesPerSecond` to find hot spots
4. **Locate source**: Use `sourceLocation` (format: `file:line:col:tag`) to pinpoint code

## queryVueScanData Parameters

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `limit` | 50 | Max components to return |
| `componentName` | - | Filter by name (partial match, case-insensitive, ignores `-` and `_`) |
| `timeRange` | - | `{ start, end }` timestamps in ms (0 values ignored) |
| `minUpdateCount` | - | Only components updated >= N times |
| `minRenderTime` | - | Only events with render time >= N ms |
| `onlyInViewport` | - | Exclude off-screen renders |
| `onlyUserComponents` | true | Filter out library components (no source location) |
| `includeRawEvents` | false | Include individual event details (usually not needed) |
| `sortBy` | totalUpdates | `totalUpdates` / `updatesPerSecond` / `renderTime` / `componentName` |

## Response Structure

- `components[]`: `{ componentName, sourceLocation, totalUpdates, updatesPerSecond, avgRenderTime, avgFps, firstUpdate, lastUpdate }`
- `metadata`: `{ recordingStatus, totalEvents, uniqueComponents, bufferSize, bufferCapacity, timeRange }`
- `events[]`: Only present when `includeRawEvents: true`

## Best Practices

- **Don't set timeRange to zeros**: Omit it entirely if not filtering by time
- **Sort by renderTime**: Find the slowest components causing frame drops
- **Sort by updatesPerSecond**: Reveals components re-rendering too rapidly
- **Check avgFps**: Low avgFps (< 30) indicates the component causes jank
- **Use sourceLocation**: Directly identifies the source file and line for fixes
- **Check onlyUserComponents=false**: If results seem sparse, library components may be the source

## Example: Find Performance Issues

```
1. queryVueScanData({ sortBy: "renderTime" })
   → Find slowest components by average render time
2. queryVueScanData({ sortBy: "totalUpdates" })
   → Review top re-rendering components with source locations
3. queryVueScanData({ minRenderTime: 16, sortBy: "renderTime" })
   → Find components exceeding one frame budget (16ms)
4. queryVueScanData({ componentName: "UserList", sortBy: "updatesPerSecond" })
   → Find the most frequently re-rendering component among partial matches
5. queryVueScanData({ onlyUserComponents: false, sortBy: "totalUpdates" })
   → Include library components to see full picture
```
