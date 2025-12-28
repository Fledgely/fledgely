import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: path.resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
  resolve: {
    alias: {
      '@fledgely/contracts': path.resolve(__dirname, '../../packages/shared/src/contracts'),
      '@fledgely/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
})
