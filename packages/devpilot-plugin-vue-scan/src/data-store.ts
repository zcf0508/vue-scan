import type { ComponentSummary, ComponentUpdateEvent, QueryParams, QueryResult } from './types'

function normalize(name: string): string {
  return name
    .replace(/[-_]/g, '')
    .toLowerCase()
}

export class VueScanDataStore {
  private events: ComponentUpdateEvent[] = []
  private maxEvents = 10000
  public isRecording = false

  addEvent(event: ComponentUpdateEvent) {
    if (!this.isRecording)
      return

    if (this.events.length >= this.maxEvents) {
      this.events.shift()
    }

    this.events.push(event)
  }

  query(params: QueryParams): QueryResult {
    let filtered = [...this.events]

    if (params.componentName) {
      const normalizedQuery = normalize(params.componentName)
      filtered = filtered.filter(e =>
        normalize(e.componentName).includes(normalizedQuery),
      )
    }

    if (params.timeRange && params.timeRange.start > 0 && params.timeRange.end > 0) {
      filtered = filtered.filter(e =>
        e.timestamp >= params.timeRange!.start
        && e.timestamp <= params.timeRange!.end,
      )
    }

    if (params.minUpdateCount) {
      filtered = filtered.filter(e =>
        e.updateCount >= params.minUpdateCount!,
      )
    }

    if (params.onlyInViewport) {
      filtered = filtered.filter(e => e.isInViewport)
    }

    if (params.onlyUserComponents !== false) {
      filtered = filtered.filter(e => e.isUserComponent)
    }

    // Aggregate by component
    const componentMap = new Map<string, {
      sourceLocation?: string
      timestamps: number[]
    }>()

    for (const event of filtered) {
      const key = event.componentId
      const existing = componentMap.get(key)
      if (existing) {
        existing.timestamps.push(event.timestamp)
      }
      else {
        componentMap.set(key, {
          sourceLocation: event.sourceLocation,
          timestamps: [event.timestamp],
        })
      }
    }

    let components: ComponentSummary[] = Array.from(componentMap.entries())
      .map(([componentId, data]) => {
        const totalUpdates = data.timestamps.length
        const firstUpdate = Math.min(...data.timestamps)
        const lastUpdate = Math.max(...data.timestamps)
        const durationSec = (lastUpdate - firstUpdate) / 1000
        const rawName = componentId.split('__')[0] || componentId
        const componentName = rawName === 'Anonymous Component' && data.sourceLocation
          ? `Anonymous (${data.sourceLocation})`
          : rawName
        return {
          componentName,
          sourceLocation: data.sourceLocation,
          totalUpdates,
          updatesPerSecond: durationSec > 0 ? totalUpdates / durationSec : totalUpdates,
          firstUpdate,
          lastUpdate,
        }
      })

    // Sort
    components.sort((a, b) => {
      switch (params.sortBy) {
        case 'totalUpdates': return b.totalUpdates - a.totalUpdates
        case 'updatesPerSecond': return b.updatesPerSecond - a.updatesPerSecond
        case 'componentName': return a.componentName.localeCompare(b.componentName)
        default: return b.totalUpdates - a.totalUpdates
      }
    })

    components = components.slice(0, params.limit)

    // Time range for all filtered events
    const timeRange = filtered.length > 0
      ? {
          start: filtered[0].timestamp,
          end: filtered[filtered.length - 1].timestamp,
        }
      : null

    return {
      components,
      events: params.includeRawEvents ? filtered.slice(0, params.limit) : undefined,
      metadata: {
        recordingStatus: this.isRecording ? 'active' : 'paused',
        totalEvents: filtered.length,
        uniqueComponents: componentMap.size,
        bufferSize: this.events.length,
        bufferCapacity: this.maxEvents,
        timeRange,
      },
    }
  }

  clear() {
    this.events = []
  }

  startRecording() {
    this.isRecording = true
  }

  stopRecording() {
    this.isRecording = false
  }

  exportAll() {
    return {
      events: this.events,
      exportedAt: Date.now(),
    }
  }
}
