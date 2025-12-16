import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@fledgely/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
      // Resolve zustand from local node_modules to ensure react is found
      'zustand': path.resolve(__dirname, './node_modules/zustand'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
