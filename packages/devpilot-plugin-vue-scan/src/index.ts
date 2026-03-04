import type { DevpilotPlugin } from 'unplugin-devpilot'
import type { ComponentUpdateEvent, QueryParams } from './types'
import { defineMcpToolRegister, resolveClientModule, resolveSkillModule } from 'unplugin-devpilot'
import { z } from 'zod'
import { VueScanDataStore } from './data-store'

// Create data store instance
const dataStore = new VueScanDataStore()

// Define the DevPilot plugin
export const vueScanPlugin: DevpilotPlugin = {
  namespace: 'vue-scan',

  // Client-side module for auto-injection and data collection
  clientModule: resolveClientModule(import.meta.url, './client/index.mjs'),
  skillModule: resolveSkillModule(import.meta.url, './skill.md'),

  // Server-side RPC methods
  serverSetup: () => ({
    'vue-scan:recordUpdate': async (data: ComponentUpdateEvent) => {
      dataStore.addEvent(data)
    },

    'vue-scan:startRecording': async () => {
      dataStore.startRecording()
      return { status: 'active' }
    },

    'vue-scan:stopRecording': async () => {
      dataStore.stopRecording()
      return { status: 'paused' }
    },

    'vue-scan:clearData': async () => {
      dataStore.clear()
      return { status: 'cleared' }
    },

    'vue-scan:exportData': async () => {
      return dataStore.exportAll()
    },
  }),

  // MCP tools for LLM integration
  mcpSetup() {
    const tools = [
      defineMcpToolRegister(
        'queryVueScanData',
        {
          title: 'Query Vue Component Render Performance',
          description: 'Query Vue component render performance data. Returns per-component aggregated summaries (update count, frequency, source location) for performance analysis. Use includeRawEvents only when you need individual event details.',
          inputSchema: z.object({
            limit: z.number()
              .default(50)
              .describe('Maximum number of components to return'),

            componentName: z.string()
              .optional()
              .describe('Filter by component name (supports partial match)'),

            timeRange: z.object({
              start: z.number().describe('Start timestamp (ms)'),
              end: z.number().describe('End timestamp (ms)'),
            }).optional().describe('Filter by time range'),

            minUpdateCount: z.number()
              .optional()
              .describe('Only return components with update count >= this value'),

            onlyInViewport: z.boolean()
              .optional()
              .describe('Only return updates that occurred in viewport'),

            onlyUserComponents: z.boolean()
              .default(true)
              .describe('Only return user code components, filter out library components. Default true'),

            includeRawEvents: z.boolean()
              .default(false)
              .describe('Include raw update events in addition to component summaries. Usually not needed'),

            sortBy: z.enum(['totalUpdates', 'updatesPerSecond', 'componentName'])
              .default('totalUpdates')
              .describe('Sort components by field'),
          }),
        },
        async (params) => {
          const data = dataStore.query(params as QueryParams)
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(data, null, 2),
            }],
          }
        },
      ),
    ]

    return tools
  },
}

export default vueScanPlugin
export * from './types'
