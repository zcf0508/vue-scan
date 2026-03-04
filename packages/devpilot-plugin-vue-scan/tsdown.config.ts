import { copyFileSync, mkdirSync } from 'node:fs'
import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: [
      'src/*.ts',
    ],
    dts: true,
    inlineOnly: false,
  },
  {
    entry: [
      'src/client/index.ts',
    ],
    outDir: 'dist/client',
    inlineOnly: false,
    hooks: {
      'build:done': () => {
        mkdirSync('dist', { recursive: true })
        copyFileSync('src/skill.md', 'dist/skill.md')
      },
    },
  },
])
