#!/usr/bin/env npx tsx
/**
 * Forensic Watermark Decode CLI Tool
 * Story 18.5: Forensic Watermarking on View
 *
 * Usage:
 *   npx tsx scripts/decode-watermark.ts <image-path>
 *
 * Example:
 *   npx tsx scripts/decode-watermark.ts leaked-screenshot.jpg
 *
 * Output:
 *   - viewerId: Firebase UID of viewer
 *   - viewTimestamp: When screenshot was viewed
 *   - screenshotId: Original screenshot ID
 *   - confidence: 0.0 - 1.0 extraction reliability
 *   - valid: Whether checksum/magic verified
 *
 * ADMIN ONLY: This tool should only be used by authorized
 * administrators for leak investigation purposes.
 */

import * as fs from 'fs'
import * as path from 'path'

// Import from the watermark library
// Note: This script runs from repo root, so we need relative path
import { extractWatermark } from '../apps/functions/src/lib/watermark'

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/decode-watermark.ts <image-path>')
    console.error('')
    console.error('Example:')
    console.error('  npx tsx scripts/decode-watermark.ts leaked-screenshot.jpg')
    process.exit(1)
  }

  const imagePath = args[0]

  // Resolve path relative to current working directory
  const absolutePath = path.resolve(process.cwd(), imagePath)

  // Check if file exists
  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: File not found: ${absolutePath}`)
    process.exit(1)
  }

  console.log(`\nDecoding watermark from: ${absolutePath}`)
  console.log('─'.repeat(60))

  try {
    // Read image file
    const imageBuffer = fs.readFileSync(absolutePath)

    // Extract watermark
    const result = await extractWatermark(imageBuffer)

    // Display results
    console.log('\nWatermark Extraction Results:')
    console.log('─'.repeat(60))
    console.log(
      `Valid:           ${result.valid ? '✓ YES' : '✗ NO (may be damaged or not watermarked)'}`
    )
    console.log(`Confidence:      ${(result.confidence * 100).toFixed(1)}%`)
    console.log('')
    console.log(`Viewer ID:       ${result.viewerId || '(not extracted)'}`)
    console.log(
      `View Timestamp:  ${result.viewTimestamp ? new Date(result.viewTimestamp).toISOString() : '(not extracted)'}`
    )
    console.log(`Screenshot ID:   ${result.screenshotId || '(not extracted)'}`)
    console.log('─'.repeat(60))

    // Provide interpretation
    if (result.valid && result.confidence > 0.7) {
      console.log('\n✓ HIGH CONFIDENCE: Watermark appears intact and verified.')
      console.log('  The extracted viewer information can be used for investigation.')
    } else if (result.valid && result.confidence > 0.4) {
      console.log('\n⚠ MEDIUM CONFIDENCE: Watermark partially damaged.')
      console.log('  The extracted information may be reliable but should be verified.')
    } else if (result.valid) {
      console.log('\n⚠ LOW CONFIDENCE: Watermark heavily damaged.')
      console.log('  The extracted information may not be reliable.')
    } else {
      console.log('\n✗ INVALID: Could not verify watermark.')
      console.log('  Image may not be watermarked, or watermark was destroyed.')
      console.log('  This could indicate severe manipulation (heavy crop, quality < 70).')
    }

    // Exit with appropriate code
    process.exit(result.valid ? 0 : 1)
  } catch (error) {
    console.error(
      '\nError extracting watermark:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    process.exit(1)
  }
}

main()
