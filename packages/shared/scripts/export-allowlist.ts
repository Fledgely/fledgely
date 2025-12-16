/**
 * Platform Export Script for Crisis Allowlist
 *
 * Story 7.1: Crisis Allowlist Data Structure - Task 6
 *
 * Exports the crisis allowlist in formats suitable for each platform:
 * - TypeScript: Default module export (already exists)
 * - Android: JSON file in dist/android/crisis-allowlist.json
 * - iOS: JSON file in dist/ios/crisis-allowlist.json
 *
 * Run with: npm run export:allowlist
 */

import * as fs from 'fs'
import * as path from 'path'
import { getCrisisAllowlist, crisisAllowlistSchema } from '../src/constants/crisis-urls'

const DIST_DIR = path.join(__dirname, '..', 'dist')
const ANDROID_DIR = path.join(DIST_DIR, 'android')
const IOS_DIR = path.join(DIST_DIR, 'ios')

/**
 * Ensure directory exists, creating it if necessary
 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`Created directory: ${dir}`)
  }
}

/**
 * Export allowlist to a JSON file
 */
function exportToJson(outputPath: string, platform: string): void {
  const allowlist = getCrisisAllowlist()

  // Validate before export
  const validation = crisisAllowlistSchema.safeParse(allowlist)
  if (!validation.success) {
    console.error(`Validation failed for ${platform} export:`, validation.error)
    process.exit(1)
  }

  // Write formatted JSON for readability (AC #6: human-readable)
  const content = JSON.stringify(allowlist, null, 2)
  fs.writeFileSync(outputPath, content, 'utf-8')

  console.log(`✅ Exported ${platform} allowlist: ${outputPath}`)
  console.log(`   - Version: ${allowlist.version}`)
  console.log(`   - Entries: ${allowlist.entries.length}`)
}

/**
 * Main export function
 */
async function main(): Promise<void> {
  console.log('🚀 Crisis Allowlist Export Script')
  console.log('================================\n')

  // Ensure output directories exist
  ensureDir(DIST_DIR)
  ensureDir(ANDROID_DIR)
  ensureDir(IOS_DIR)

  // Get allowlist for summary
  const allowlist = getCrisisAllowlist()
  console.log(`Source allowlist version: ${allowlist.version}`)
  console.log(`Total entries: ${allowlist.entries.length}\n`)

  // Export for Android
  const androidPath = path.join(ANDROID_DIR, 'crisis-allowlist.json')
  exportToJson(androidPath, 'Android')

  // Export for iOS
  const iosPath = path.join(IOS_DIR, 'crisis-allowlist.json')
  exportToJson(iosPath, 'iOS')

  // Summary
  console.log('\n📦 Export Complete!')
  console.log('==================')
  console.log('Files created:')
  console.log(`  - ${androidPath}`)
  console.log(`  - ${iosPath}`)
  console.log('\nCopy these files to your native projects:')
  console.log('  - Android: Copy to app/src/main/assets/')
  console.log('  - iOS: Copy to Resources/')
}

// Run the export
main().catch((error) => {
  console.error('Export failed:', error)
  process.exit(1)
})
