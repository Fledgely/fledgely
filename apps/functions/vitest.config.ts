import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    alias: {
      '@fledgely/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
    },
  },
})
