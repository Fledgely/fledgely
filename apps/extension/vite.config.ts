import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { copyFileSync, mkdirSync, existsSync, readdirSync, writeFileSync } from 'fs'

// Generate a minimal valid PNG (1x1 pixel, indigo color #4F46E5)
function generatePlaceholderPng(): Buffer {
  // Minimal PNG: 8-byte signature + IHDR + IDAT + IEND
  // This creates a 1x1 indigo pixel PNG
  const png = Buffer.from([
    // PNG Signature
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    // IHDR chunk (13 bytes)
    0x00,
    0x00,
    0x00,
    0x0d, // length
    0x49,
    0x48,
    0x44,
    0x52, // "IHDR"
    0x00,
    0x00,
    0x00,
    0x01, // width: 1
    0x00,
    0x00,
    0x00,
    0x01, // height: 1
    0x08,
    0x02, // bit depth 8, color type 2 (RGB)
    0x00,
    0x00,
    0x00, // compression, filter, interlace
    0x90,
    0x77,
    0x53,
    0xde, // CRC
    // IDAT chunk (compressed pixel data)
    0x00,
    0x00,
    0x00,
    0x0c, // length
    0x49,
    0x44,
    0x41,
    0x54, // "IDAT"
    0x08,
    0xd7,
    0x63,
    0x90,
    0x89,
    0xe5,
    0x00,
    0x00,
    0x01,
    0x88,
    0x00,
    0xc5,
    // IEND chunk
    0x00,
    0x00,
    0x00,
    0x00, // length
    0x49,
    0x45,
    0x4e,
    0x44, // "IEND"
    0xae,
    0x42,
    0x60,
    0x82, // CRC
  ])
  return png
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-extension-files',
      closeBundle() {
        // Copy manifest.json to dist
        copyFileSync(
          path.resolve(__dirname, 'manifest.json'),
          path.resolve(__dirname, 'dist/manifest.json')
        )

        // Copy popup.html to dist
        copyFileSync(
          path.resolve(__dirname, 'popup.html'),
          path.resolve(__dirname, 'dist/popup.html')
        )

        // Copy onboarding.html to dist
        copyFileSync(
          path.resolve(__dirname, 'onboarding.html'),
          path.resolve(__dirname, 'dist/onboarding.html')
        )

        // Copy emergency-unlock.html to dist (Story 13.3)
        copyFileSync(
          path.resolve(__dirname, 'emergency-unlock.html'),
          path.resolve(__dirname, 'dist/emergency-unlock.html')
        )

        // Create icons directory and placeholder icons
        const iconsDir = path.resolve(__dirname, 'dist/icons')
        if (!existsSync(iconsDir)) {
          mkdirSync(iconsDir, { recursive: true })
        }

        // Copy real icons if they exist, otherwise create placeholders
        const sourceIconsDir = path.resolve(__dirname, 'icons')
        const sizes = [16, 32, 48, 128]

        sizes.forEach((size) => {
          const iconName = `icon${size}.png`
          const sourceIcon = path.join(sourceIconsDir, iconName)
          const destIcon = path.join(iconsDir, iconName)

          if (existsSync(sourceIcon)) {
            copyFileSync(sourceIcon, destIcon)
          } else {
            // Create placeholder PNG
            writeFileSync(destIcon, generatePlaceholderPng())
          }
        })
      },
    },
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: path.resolve(__dirname, 'src/background.ts'),
        popup: path.resolve(__dirname, 'src/popup.ts'),
        'emergency-unlock': path.resolve(__dirname, 'src/emergency-unlock.ts'),
        'content-scripts/crisis-redirect': path.resolve(
          __dirname,
          'src/content-scripts/crisis-redirect.ts'
        ),
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    // Ensure proper chunking for extension
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@fledgely/contracts': path.resolve(__dirname, '../../packages/shared/src/contracts'),
      '@fledgely/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
})
