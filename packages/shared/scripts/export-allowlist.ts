/**
 * Platform Export Script for Crisis Allowlist
 *
 * Story 7.1: Crisis Allowlist Data Structure - Task 6
 * Story 7.7: Allowlist Distribution & Sync - Task 7
 *
 * Exports the crisis allowlist in formats suitable for each platform:
 * - TypeScript: Default module export (already exists)
 * - Web: JSON file in dist/web/crisis-allowlist.json
 * - Android: JSON file in dist/android/crisis-allowlist.json
 * - iOS: JSON file in dist/ios/crisis-allowlist.json
 * - Chrome Extension: JSON file in dist/chrome-extension/crisis-allowlist.json
 *
 * Run with: npm run generate:allowlist (or npm run export:allowlist)
 *
 * ## Platform Integration Instructions
 *
 * ### Web (Next.js/React)
 * The allowlist is bundled in @fledgely/shared and accessed via:
 * ```typescript
 * import { getCrisisAllowlist } from '@fledgely/shared'
 * ```
 *
 * ### Android
 * Copy dist/android/crisis-allowlist.json to your project:
 * ```
 * android/app/src/main/assets/crisis-allowlist.json
 * ```
 * Access in Kotlin:
 * ```kotlin
 * val json = context.assets.open("crisis-allowlist.json").bufferedReader().use { it.readText() }
 * val allowlist = Json.decodeFromString<CrisisAllowlist>(json)
 * ```
 *
 * ### iOS
 * Copy dist/ios/crisis-allowlist.json to your project:
 * ```
 * ios/Resources/crisis-allowlist.json
 * ```
 * Access in Swift:
 * ```swift
 * guard let url = Bundle.main.url(forResource: "crisis-allowlist", withExtension: "json"),
 *       let data = try? Data(contentsOf: url),
 *       let allowlist = try? JSONDecoder().decode(CrisisAllowlist.self, from: data)
 * else { fatalError("Failed to load crisis allowlist") }
 * ```
 *
 * ### Chrome Extension (Epic 11)
 * Copy dist/chrome-extension/crisis-allowlist.json to your extension:
 * ```
 * extension/assets/crisis-allowlist.json
 * ```
 * Update manifest.json:
 * ```json
 * {
 *   "web_accessible_resources": [{
 *     "resources": ["assets/crisis-allowlist.json"],
 *     "matches": ["<all_urls>"]
 *   }]
 * }
 * ```
 * Access in service worker:
 * ```typescript
 * const url = chrome.runtime.getURL('assets/crisis-allowlist.json')
 * const response = await fetch(url)
 * const allowlist = await response.json()
 * ```
 */

import * as fs from 'fs'
import * as path from 'path'
import { getCrisisAllowlist, crisisAllowlistSchema } from '../src/constants/crisis-urls'

const DIST_DIR = path.join(__dirname, '..', 'dist')
const WEB_DIR = path.join(DIST_DIR, 'web')
const ANDROID_DIR = path.join(DIST_DIR, 'android')
const IOS_DIR = path.join(DIST_DIR, 'ios')
const CHROME_DIR = path.join(DIST_DIR, 'chrome-extension')

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
 * Platform type for export
 */
export type Platform = 'web' | 'android' | 'ios' | 'chrome-extension'

/**
 * Export result for a single platform
 */
export interface ExportResult {
  platform: Platform
  outputPath: string
  version: string
  entryCount: number
}

/**
 * Get the output directory for a platform
 */
export function getPlatformDir(platform: Platform): string {
  switch (platform) {
    case 'web':
      return WEB_DIR
    case 'android':
      return ANDROID_DIR
    case 'ios':
      return IOS_DIR
    case 'chrome-extension':
      return CHROME_DIR
  }
}

/**
 * Export allowlist for a specific platform
 */
export function exportForPlatform(platform: Platform): ExportResult {
  const dir = getPlatformDir(platform)
  ensureDir(dir)

  const outputPath = path.join(dir, 'crisis-allowlist.json')
  exportToJson(outputPath, platform)

  const allowlist = getCrisisAllowlist()
  return {
    platform,
    outputPath,
    version: allowlist.version,
    entryCount: allowlist.entries.length,
  }
}

/**
 * Export allowlist for all platforms
 */
export function exportAllPlatforms(): ExportResult[] {
  const platforms: Platform[] = ['web', 'android', 'ios', 'chrome-extension']
  return platforms.map((platform) => exportForPlatform(platform))
}

/**
 * Main export function
 */
async function main(): Promise<void> {
  console.log('🚀 Crisis Allowlist Export Script')
  console.log('================================\n')

  // Ensure output directories exist
  ensureDir(DIST_DIR)
  ensureDir(WEB_DIR)
  ensureDir(ANDROID_DIR)
  ensureDir(IOS_DIR)
  ensureDir(CHROME_DIR)

  // Get allowlist for summary
  const allowlist = getCrisisAllowlist()
  console.log(`Source allowlist version: ${allowlist.version}`)
  console.log(`Total entries: ${allowlist.entries.length}\n`)

  // Export for Web
  const webPath = path.join(WEB_DIR, 'crisis-allowlist.json')
  exportToJson(webPath, 'Web')

  // Export for Android
  const androidPath = path.join(ANDROID_DIR, 'crisis-allowlist.json')
  exportToJson(androidPath, 'Android')

  // Export for iOS
  const iosPath = path.join(IOS_DIR, 'crisis-allowlist.json')
  exportToJson(iosPath, 'iOS')

  // Export for Chrome Extension
  const chromePath = path.join(CHROME_DIR, 'crisis-allowlist.json')
  exportToJson(chromePath, 'Chrome Extension')

  // Summary
  console.log('\n📦 Export Complete!')
  console.log('==================')
  console.log('Files created:')
  console.log(`  - ${webPath}`)
  console.log(`  - ${androidPath}`)
  console.log(`  - ${iosPath}`)
  console.log(`  - ${chromePath}`)
  console.log('\nCopy these files to your native projects:')
  console.log('  - Web: Already bundled in @fledgely/shared')
  console.log('  - Android: Copy to app/src/main/assets/')
  console.log('  - iOS: Copy to Resources/')
  console.log('  - Chrome Extension: Copy to extension/assets/')
}

// Run the export
main().catch((error) => {
  console.error('Export failed:', error)
  process.exit(1)
})
