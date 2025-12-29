/**
 * Forensic Watermark Decoding
 * Story 18.5: Forensic Watermarking on View
 *
 * Extracts watermark payload from potentially damaged images.
 * Uses correlation-based detection with majority voting
 * across repeated bit embeddings for error correction.
 */

import sharp from 'sharp'
import { PRNG } from './prng'

/**
 * Extracted watermark payload
 */
export interface DecodedWatermark {
  viewerId: string
  viewTimestamp: number
  screenshotId: string
  confidence: number // 0.0 - 1.0 representing extraction reliability
  valid: boolean // Whether magic bytes and checksum matched
}

/**
 * Decoding configuration
 */
interface DecodeConfig {
  /** Expected repetitions per bit (must match encode) */
  repetitions: number
  /** Secret key for pattern generation (must match encode) */
  secretKey: string
}

/**
 * Default decode configuration (must match encode defaults)
 */
const DEFAULT_CONFIG: DecodeConfig = {
  repetitions: 5,
  secretKey: 'fledgely-watermark-v1',
}

/**
 * Magic bytes for watermark validation
 */
const WATERMARK_MAGIC = [0xf1, 0xed, 0x9e, 0x1e]
const WATERMARK_VERSION = 0x01

/**
 * Generate extraction positions (must match encoder)
 */
function generateExtractPositions(
  width: number,
  height: number,
  numBits: number,
  repetitions: number,
  secretKey: string
): Array<{ x: number; y: number }[]> {
  const prng = new PRNG(secretKey)
  const positions: Array<{ x: number; y: number }[]> = []

  const marginX = Math.floor(width * 0.1)
  const marginY = Math.floor(height * 0.1)
  const safeWidth = width - 2 * marginX
  const safeHeight = height - 2 * marginY

  for (let bitIndex = 0; bitIndex < numBits; bitIndex++) {
    const bitPositions: { x: number; y: number }[] = []

    for (let rep = 0; rep < repetitions; rep++) {
      const x = marginX + prng.nextInt(0, safeWidth - 1)
      const y = marginY + prng.nextInt(0, safeHeight - 1)
      bitPositions.push({ x, y })
    }

    positions.push(bitPositions)
  }

  return positions
}

/**
 * Calculate total bits in watermark payload
 */
function getTotalBits(): number {
  return (
    WATERMARK_MAGIC.length * 8 + // Magic bytes
    8 + // Version
    28 * 8 + // viewerId
    64 + // timestamp
    32 * 8 + // screenshotId
    8 // Checksum
  )
}

/**
 * Convert bits back to payload
 */
function bitsToPayload(bits: number[]): {
  payload: { viewerId: string; viewTimestamp: number; screenshotId: string }
  magicValid: boolean
  versionValid: boolean
  checksumValid: boolean
} {
  let bitIndex = 0

  // Extract magic bytes
  const extractedMagic: number[] = []
  for (let i = 0; i < WATERMARK_MAGIC.length; i++) {
    let byte = 0
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bits[bitIndex++]
    }
    extractedMagic.push(byte)
  }

  const magicValid = extractedMagic.every((b, i) => b === WATERMARK_MAGIC[i])

  // Extract version
  let version = 0
  for (let j = 0; j < 8; j++) {
    version = (version << 1) | bits[bitIndex++]
  }
  const versionValid = version === WATERMARK_VERSION

  // Extract viewerId (28 chars)
  let viewerId = ''
  for (let i = 0; i < 28; i++) {
    let charCode = 0
    for (let j = 0; j < 8; j++) {
      charCode = (charCode << 1) | bits[bitIndex++]
    }
    if (charCode !== 0) {
      viewerId += String.fromCharCode(charCode)
    }
  }

  // Extract timestamp (64 bits)
  let timestampBigInt = BigInt(0)
  for (let j = 0; j < 64; j++) {
    timestampBigInt = (timestampBigInt << BigInt(1)) | BigInt(bits[bitIndex++])
  }
  const viewTimestamp = Number(timestampBigInt)

  // Extract screenshotId (32 chars)
  let screenshotId = ''
  for (let i = 0; i < 32; i++) {
    let charCode = 0
    for (let j = 0; j < 8; j++) {
      charCode = (charCode << 1) | bits[bitIndex++]
    }
    if (charCode !== 0) {
      screenshotId += String.fromCharCode(charCode)
    }
  }

  // Extract checksum
  let extractedChecksum = 0
  for (let j = 0; j < 8; j++) {
    extractedChecksum = (extractedChecksum << 1) | bits[bitIndex++]
  }

  // Calculate expected checksum from extracted data
  const payloadBits = bits.slice(0, bits.length - 8)
  let calculatedChecksum = 0
  for (let i = 0; i < payloadBits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8 && i + j < payloadBits.length; j++) {
      byte = (byte << 1) | payloadBits[i + j]
    }
    calculatedChecksum ^= byte
  }

  const checksumValid = extractedChecksum === calculatedChecksum

  return {
    payload: { viewerId, viewTimestamp, screenshotId },
    magicValid,
    versionValid,
    checksumValid,
  }
}

/**
 * Extract watermark from image
 *
 * @param imageBuffer - Potentially watermarked image
 * @param config - Optional configuration override
 * @returns Decoded watermark with confidence score
 */
export async function extractWatermark(
  imageBuffer: Buffer,
  config: Partial<DecodeConfig> = {}
): Promise<DecodedWatermark> {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  // Get image metadata and raw pixel data
  const image = sharp(imageBuffer)
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error('Cannot read image dimensions')
  }

  const width = metadata.width
  const height = metadata.height

  // Extract raw pixel data (RGBA)
  const { data: rawPixels } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  // Generate extraction positions (same as encoder)
  const totalBits = getTotalBits()
  const positions = generateExtractPositions(
    width,
    height,
    totalBits,
    cfg.repetitions,
    cfg.secretKey
  )

  // Extract bits using majority voting across repetitions
  const extractedBits: number[] = []
  let totalConfidence = 0

  for (let bitIndex = 0; bitIndex < totalBits; bitIndex++) {
    const bitPositions = positions[bitIndex]
    let sumVotes = 0
    let validVotes = 0

    for (const pos of bitPositions) {
      // Check if position is within bounds (for cropped images)
      if (pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height) {
        const pixelIndex = (pos.y * width + pos.x) * 4
        const greenValue = rawPixels[pixelIndex + 1]

        // Compare to expected neutral value (128)
        // Higher = 1, Lower = 0
        // Use a threshold approach based on deviation from neutral
        const neutralValue = 128
        const deviation = greenValue - neutralValue

        // Vote: positive deviation = 1, negative = 0
        // Weight the vote by deviation magnitude
        sumVotes += deviation
        validVotes++
      }
    }

    if (validVotes > 0) {
      // Majority voting with weighted average
      const averageDeviation = sumVotes / validVotes
      const bit = averageDeviation > 0 ? 1 : 0
      extractedBits.push(bit)

      // Calculate confidence for this bit (how strong was the majority?)
      const bitConfidence = Math.min(1, Math.abs(averageDeviation) / 30) // Normalize
      totalConfidence += bitConfidence
    } else {
      // No valid positions (severe crop) - default to 0
      extractedBits.push(0)
    }
  }

  // Average confidence across all bits
  const confidence = totalConfidence / totalBits

  // Convert bits back to payload
  const { payload, magicValid, versionValid, checksumValid } = bitsToPayload(extractedBits)

  return {
    viewerId: payload.viewerId,
    viewTimestamp: payload.viewTimestamp,
    screenshotId: payload.screenshotId,
    confidence,
    valid: magicValid && versionValid && checksumValid,
  }
}

/**
 * Quick check if image might contain a watermark
 * Uses magic byte detection for fast rejection
 */
export async function hasWatermark(
  imageBuffer: Buffer,
  config: Partial<DecodeConfig> = {}
): Promise<boolean> {
  try {
    const result = await extractWatermark(imageBuffer, config)
    return result.valid && result.confidence > 0.3
  } catch {
    return false
  }
}
