/**
 * Forensic Watermark Encoding
 * Story 18.5: Forensic Watermarking on View
 *
 * Implements spread-spectrum watermarking in the spatial domain.
 * The watermark is embedded by modifying pixel luminance values
 * based on a pseudo-random pattern generated from a secret key.
 *
 * Key features:
 * - Spread-spectrum: Data spread across image for robustness
 * - Error correction: Repetition coding for recovery from damage
 * - JPEG-resistant: Survives quality 70+ compression
 * - Invisible: Modifications below human perception threshold
 */

import sharp from 'sharp'
import { PRNG } from './prng'

/**
 * Watermark payload containing viewer identification data
 */
export interface WatermarkPayload {
  viewerId: string // Firebase UID (up to 28 chars)
  viewTimestamp: number // Unix timestamp in milliseconds
  screenshotId: string // Screenshot document ID
}

/**
 * Configuration for watermark embedding
 */
export interface WatermarkConfig {
  /** Strength of watermark embedding (0.0 - 1.0). Higher = more robust but more visible */
  strength: number
  /** Number of times to repeat each bit for error correction */
  repetitions: number
  /** Secret key for pseudo-random pattern generation */
  secretKey: string
  /** Minimum image dimension (width and height) for watermarking */
  minImageSize: number
  /** Output JPEG quality (0-100) */
  outputQuality: number
}

/**
 * Default configuration optimized for JPEG robustness while maintaining invisibility
 */
const DEFAULT_CONFIG: WatermarkConfig = {
  strength: 0.15, // 15% modification - invisible to human eye but survives compression
  repetitions: 5, // Each bit repeated 5 times for error correction
  secretKey: 'fledgely-watermark-v1', // Version-keyed for future compatibility
  minImageSize: 64, // Minimum 64x64 pixels for meaningful embedding
  outputQuality: 90, // High quality to preserve watermark
}

/**
 * Magic bytes for watermark detection (version + validation)
 * Format: [version][checksum nibble]
 */
const WATERMARK_VERSION = 0x01
const WATERMARK_MAGIC = [0xf1, 0xed, 0x9e, 0x1e] // "FLEDGELY" pattern

/**
 * Convert payload to binary representation
 */
function payloadToBits(payload: WatermarkPayload): number[] {
  const bits: number[] = []

  // Add magic bytes for validation (32 bits)
  for (const byte of WATERMARK_MAGIC) {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1)
    }
  }

  // Add version (8 bits)
  for (let i = 7; i >= 0; i--) {
    bits.push((WATERMARK_VERSION >> i) & 1)
  }

  // Encode viewerId (fixed 28 chars, padded with null)
  const viewerIdPadded = payload.viewerId.padEnd(28, '\0').slice(0, 28)
  for (const char of viewerIdPadded) {
    const code = char.charCodeAt(0)
    for (let i = 7; i >= 0; i--) {
      bits.push((code >> i) & 1)
    }
  }

  // Encode timestamp (64 bits)
  const timestampBigInt = BigInt(payload.viewTimestamp)
  for (let i = 63; i >= 0; i--) {
    bits.push(Number((timestampBigInt >> BigInt(i)) & BigInt(1)))
  }

  // Encode screenshotId (fixed 32 chars, padded with null)
  const screenshotIdPadded = payload.screenshotId.padEnd(32, '\0').slice(0, 32)
  for (const char of screenshotIdPadded) {
    const code = char.charCodeAt(0)
    for (let i = 7; i >= 0; i--) {
      bits.push((code >> i) & 1)
    }
  }

  // Add simple checksum (8 bits) - XOR of all payload bytes
  let checksum = 0
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8 && i + j < bits.length; j++) {
      byte = (byte << 1) | bits[i + j]
    }
    checksum ^= byte
  }
  for (let i = 7; i >= 0; i--) {
    bits.push((checksum >> i) & 1)
  }

  return bits
}

/**
 * Generate embedding positions for watermark bits
 * Uses spread-spectrum approach to distribute bits across image
 */
function generateEmbedPositions(
  width: number,
  height: number,
  numBits: number,
  repetitions: number,
  secretKey: string
): Array<{ x: number; y: number }[]> {
  const prng = new PRNG(secretKey)
  const positions: Array<{ x: number; y: number }[]> = []

  // Reserve margin (10%) to survive cropping
  const marginX = Math.floor(width * 0.1)
  const marginY = Math.floor(height * 0.1)
  const safeWidth = width - 2 * marginX
  const safeHeight = height - 2 * marginY

  // Generate positions for each bit (with repetitions)
  for (let bitIndex = 0; bitIndex < numBits; bitIndex++) {
    const bitPositions: { x: number; y: number }[] = []

    for (let rep = 0; rep < repetitions; rep++) {
      // Generate position within safe area
      const x = marginX + prng.nextInt(0, safeWidth - 1)
      const y = marginY + prng.nextInt(0, safeHeight - 1)
      bitPositions.push({ x, y })
    }

    positions.push(bitPositions)
  }

  return positions
}

/**
 * Embed watermark into image
 *
 * @param imageBuffer - Original JPEG image buffer
 * @param payload - Watermark payload to embed
 * @param config - Optional configuration override
 * @returns Watermarked image buffer
 */
export async function embedWatermark(
  imageBuffer: Buffer,
  payload: WatermarkPayload,
  config: Partial<WatermarkConfig> = {}
): Promise<Buffer> {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  // Get image metadata and raw pixel data
  const image = sharp(imageBuffer)
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error('Cannot read image dimensions')
  }

  const width = metadata.width
  const height = metadata.height

  // Validate minimum image size
  if (width < cfg.minImageSize || height < cfg.minImageSize) {
    throw new Error(
      `Image too small for watermarking. Minimum ${cfg.minImageSize}x${cfg.minImageSize}, got ${width}x${height}`
    )
  }

  // Extract raw pixel data (RGBA)
  const { data: rawPixels, info } = await image
    .ensureAlpha() // Ensure RGBA format
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Convert payload to bits
  const bits = payloadToBits(payload)

  // Generate embedding positions
  const positions = generateEmbedPositions(
    width,
    height,
    bits.length,
    cfg.repetitions,
    cfg.secretKey
  )

  // Create mutable copy of pixel data
  const pixels = Buffer.from(rawPixels)

  // Embed bits using spread-spectrum technique
  for (let bitIndex = 0; bitIndex < bits.length; bitIndex++) {
    const bit = bits[bitIndex]
    const bitPositions = positions[bitIndex]

    for (const pos of bitPositions) {
      const pixelIndex = (pos.y * width + pos.x) * 4 // RGBA = 4 bytes per pixel

      // Modify luminance (approximate using green channel which has highest luminance weight)
      // Bit 1 = increase brightness, Bit 0 = decrease brightness
      const currentValue = pixels[pixelIndex + 1] // Green channel
      const delta = Math.round(cfg.strength * 255 * (bit === 1 ? 1 : -1))
      const newValue = Math.max(0, Math.min(255, currentValue + delta))
      pixels[pixelIndex + 1] = newValue
    }
  }

  // Re-encode as JPEG with high quality to preserve watermark
  const watermarkedBuffer = await sharp(pixels, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels as 1 | 2 | 3 | 4,
    },
  })
    .removeAlpha() // Convert RGBA back to RGB for JPEG
    .jpeg({ quality: cfg.outputQuality })
    .toBuffer()

  return watermarkedBuffer
}

/**
 * Get the total bits needed for a watermark payload
 * Useful for capacity calculations
 */
export function getPayloadBitLength(): number {
  return (
    WATERMARK_MAGIC.length * 8 + // Magic bytes
    8 + // Version
    28 * 8 + // viewerId (28 chars)
    64 + // timestamp (64 bits)
    32 * 8 + // screenshotId (32 chars)
    8 // Checksum
  )
}

/**
 * Check if an image has sufficient capacity for watermarking
 */
export async function hasWatermarkCapacity(
  imageBuffer: Buffer,
  config: Partial<WatermarkConfig> = {}
): Promise<boolean> {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  const metadata = await sharp(imageBuffer).metadata()
  if (!metadata.width || !metadata.height) {
    return false
  }

  // Calculate safe area (80% of image, accounting for 10% margin on each side)
  const safePixels = metadata.width * metadata.height * 0.64
  const bitsNeeded = getPayloadBitLength()
  const positionsNeeded = bitsNeeded * cfg.repetitions

  // Need at least 10 pixels spacing between embedding positions
  return safePixels / 10 >= positionsNeeded
}
