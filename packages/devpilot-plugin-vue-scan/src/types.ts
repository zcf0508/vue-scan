// Server-side types
export interface ComponentUpdateEvent {
  timestamp: number
  componentName: string
  componentId: string
  phase: 'mount' | 'update'
  renderTime?: number
  fps: number
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
  parentComponent?: string
}

export interface ComponentSummary {
  componentName: string
  sourceLocation?: string
  totalUpdates: number
  updatesPerSecond: number
  avgRenderTime?: number
  avgFps?: number
  firstUpdate: number
  lastUpdate: number
}

export interface QueryParams {
  limit: number
  componentName?: string
  timeRange?: { start: number, end: number }
  minUpdateCount?: number
  minRenderTime?: number
  onlyInViewport?: boolean
  onlyUserComponents?: boolean
  includeRawEvents?: boolean
  sortBy: 'totalUpdates' | 'updatesPerSecond' | 'renderTime' | 'componentName'
}

export interface QueryResult {
  components: ComponentSummary[]
  events?: ComponentUpdateEvent[]
  metadata: {
    recordingStatus: 'active' | 'paused'
    totalEvents: number
    uniqueComponents: number
    bufferSize: number
    bufferCapacity: number
    timeRange: { start: number, end: number } | null
  }
}
