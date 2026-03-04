---
name: vue-scan
description: Vue component render performance monitoring. Captures component update events in real-time and provides queryable data for analyzing render frequency, hot components, and unnecessary re-renders.
allowed-tools: [
  "queryVueScanData"
]
---

# Vue Scan Skill

Monitor and analyze Vue component render performance via real-time update event tracking.

## ⚠️ CRITICAL: Recording Must Be Active

**Data is only collected while recording is active.** Before querying, ensure recording has been started via the control panel (Ctrl+Shift+R) or RPC. If query returns empty results, remind the user to start recording and reproduce their scenario.

## How It Works

- Client-side hooks are injected into Vue 2/3 component `beforeUpdate` lifecycle
- Each component re-render emits an event with: component name, ID, update count, bounding rect, viewport visibility
- Events are stored server-side in a circular buffer (max 10,000 events)
- LLM queries data through the `queryVueScanData` MCP tool

## Workflow

1. **Ensure recording**: Ask user to start recording and interact with the page
2. **Query data**: Call `queryVueScanData` with `includeStatistics: true` for an overview
3. **Drill down**: Filter by `componentName`, `timeRange`, or `minUpdateCount` to find hot components
4. **Analyze**: Identify components with excessive re-renders, unexpected updates, or off-screen renders

## queryVueScanData Parameters

| Parameter | Purpose |
|-----------|---------|
| `limit` | Max events to return (default: 100) |
| `componentName` | Filter by name (partial match) |
| `timeRange` | `{ start, end }` timestamps in ms |
| `minUpdateCount` | Only components updated >= N times |
| `onlyInViewport` | Exclude off-screen renders |
| `includeStatistics` | Add aggregated stats summary |
| `sortBy` | `timestamp` / `updateCount` / `componentName` |

## Best Practices

- **Start broad**: Query with `includeStatistics: true` first to see top re-rendering components
- **Use updateCount filter**: `minUpdateCount: 5` quickly surfaces over-rendering components
- **Check viewport**: `onlyInViewport: false` reveals wasted off-screen renders
- **Time-scope analysis**: Use `timeRange` to isolate a specific user interaction

## Example: Find Performance Issues

```
1. queryVueScanData({ includeStatistics: true, limit: 50 })
   → Review topComponents in statistics for hot spots
2. queryVueScanData({ componentName: "UserList", sortBy: "updateCount" })
   → Inspect specific component's render frequency
3. queryVueScanData({ minUpdateCount: 10, onlyInViewport: false })
   → Find components re-rendering excessively or off-screen
```
