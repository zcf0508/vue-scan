// Server-side types
export interface ComponentUpdateEvent {
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
  parentComponent?: string
}

export interface ComponentSummary {
  componentName: string
  sourceLocation?: string
  totalUpdates: number
  updatesPerSecond: number
  firstUpdate: number
  lastUpdate: number
}

export interface QueryParams {
  limit: number
  componentName?: string
  timeRange?: { start: number, end: number }
  minUpdateCount?: number
  onlyInViewport?: boolean
  onlyUserComponents?: boolean
  includeRawEvents?: boolean
  sortBy: 'totalUpdates' | 'updatesPerSecond' | 'componentName'
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
