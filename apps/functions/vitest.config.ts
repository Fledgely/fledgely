import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    include: ['**/*.test.ts'],
    exclude: ['**/__tests__/integration/**', '**/node_modules/**'],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@fledgely/contracts': path.resolve(__dirname, '../../packages/shared/src/contracts'),
      '@fledgely/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
})
