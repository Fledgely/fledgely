import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['**/__tests__/integration/**', '**/e2e/**', '**/node_modules/**'],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@fledgely/contracts': path.resolve(__dirname, '../../packages/shared/src/contracts'),
      '@fledgely/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
})
