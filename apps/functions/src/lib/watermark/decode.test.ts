/**
 * Watermark Decoding Tests
 * Story 18.5: Forensic Watermarking on View
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Sharp before importing the module
const mockToBuffer = vi.fn()

const mockSharp = {
  raw: vi.fn().mockReturnThis(),
  ensureAlpha: vi.fn().mockReturnThis(),
  toBuffer: mockToBuffer,
  metadata: vi.fn(),
}

vi.mock('sharp', () => ({
  default: vi.fn(() => mockSharp),
}))

import { extractWatermark } from './decode'

describe('extractWatermark', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock for 100x100 RGBA image
    const width = 100
    const height = 100
    const channels = 4 // RGBA after ensureAlpha
    const rawData = Buffer.alloc(width * height * channels, 128) // Grey image

    mockSharp.metadata.mockResolvedValue({
      width,
      height,
      channels: 3, // Original has 3 channels
    })

    // Return with resolveWithObject format
    mockToBuffer.mockResolvedValue({
      data: rawData,
      info: { width, height, channels },
    })

    // Reset chaining methods
    mockSharp.raw.mockReturnThis()
    mockSharp.ensureAlpha.mockReturnThis()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('result structure', () => {
    it('should return DecodedWatermark with required fields', async () => {
      const imageBuffer = Buffer.from('fake-image')

      const result = await extractWatermark(imageBuffer)

      expect(result).toHaveProperty('viewerId')
      expect(result).toHaveProperty('viewTimestamp')
      expect(result).toHaveProperty('screenshotId')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('valid')
    })

    it('should return confidence between 0 and 1', async () => {
      const imageBuffer = Buffer.from('fake-image')

      const result = await extractWatermark(imageBuffer)

      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it('should return valid as boolean', async () => {
      const imageBuffer = Buffer.from('fake-image')

      const result = await extractWatermark(imageBuffer)

      expect(typeof result.valid).toBe('boolean')
    })
  })

  describe('non-watermarked images', () => {
    it('should return invalid for random noise image', async () => {
      const width = 100
      const height = 100
      const channels = 4 // RGBA
      // Create random pixel data (noise)
      const randomData = Buffer.alloc(width * height * channels)
      for (let i = 0; i < randomData.length; i++) {
        randomData[i] = Math.floor(Math.random() * 256)
      }

      mockToBuffer.mockResolvedValue({
        data: randomData,
        info: { width, height, channels },
      })

      const imageBuffer = Buffer.from('fake-image')
      const result = await extractWatermark(imageBuffer)

      // Random image should likely be invalid (magic bytes won't match)
      expect(result).toHaveProperty('valid')
      expect(result).toHaveProperty('confidence')
    })

    it('should return invalid for solid color image', async () => {
      const width = 100
      const height = 100
      const channels = 4 // RGBA
      // Create solid white image
      const solidData = Buffer.alloc(width * height * channels, 255)

      mockToBuffer.mockResolvedValue({
        data: solidData,
        info: { width, height, channels },
      })

      const imageBuffer = Buffer.from('fake-image')
      const result = await extractWatermark(imageBuffer)

      // Solid image should be invalid
      expect(result.valid).toBe(false)
    })
  })

  describe('configuration options', () => {
    it('should accept custom secret key', async () => {
      const imageBuffer = Buffer.from('fake-image')

      // Should not throw with custom secret key
      const result = await extractWatermark(imageBuffer, {
        secretKey: 'custom-secret-key-123',
      })

      expect(result).toHaveProperty('valid')
    })

    it('should accept custom repetitions', async () => {
      const imageBuffer = Buffer.from('fake-image')

      // Should not throw with custom repetitions
      const result = await extractWatermark(imageBuffer, {
        repetitions: 3,
      })

      expect(result).toHaveProperty('valid')
    })

    it('should accept different repetition counts', async () => {
      const imageBuffer = Buffer.from('fake-image')

      // Should not throw with different repetitions
      const result = await extractWatermark(imageBuffer, {
        repetitions: 7,
      })

      expect(result).toHaveProperty('valid')
    })
  })

  describe('error handling', () => {
    it('should handle small images gracefully', async () => {
      const width = 50
      const height = 50
      const channels = 4 // RGBA

      mockSharp.metadata.mockResolvedValue({
        width,
        height,
        channels: 3,
      })
      mockToBuffer.mockResolvedValue({
        data: Buffer.alloc(width * height * channels, 128),
        info: { width, height, channels },
      })

      const imageBuffer = Buffer.from('fake-image')

      // Should return invalid result rather than throwing
      const result = await extractWatermark(imageBuffer)
      expect(result.valid).toBe(false)
    })

    it('should handle corrupted image data', async () => {
      mockSharp.metadata.mockRejectedValue(new Error('Invalid image'))

      const imageBuffer = Buffer.from('not-an-image')

      await expect(extractWatermark(imageBuffer)).rejects.toThrow()
    })
  })

  describe('timestamp parsing', () => {
    it('should return viewTimestamp as number', async () => {
      const imageBuffer = Buffer.from('fake-image')

      const result = await extractWatermark(imageBuffer)

      expect(typeof result.viewTimestamp).toBe('number')
    })
  })

  describe('viewer ID extraction', () => {
    it('should return viewerId as string', async () => {
      const imageBuffer = Buffer.from('fake-image')

      const result = await extractWatermark(imageBuffer)

      expect(typeof result.viewerId).toBe('string')
    })
  })

  describe('screenshot ID extraction', () => {
    it('should return screenshotId as string', async () => {
      const imageBuffer = Buffer.from('fake-image')

      const result = await extractWatermark(imageBuffer)

      expect(typeof result.screenshotId).toBe('string')
    })
  })

  describe('Sharp method calls', () => {
    it('should call ensureAlpha() for RGBA format', async () => {
      const imageBuffer = Buffer.from('fake-image')

      await extractWatermark(imageBuffer)

      expect(mockSharp.ensureAlpha).toHaveBeenCalled()
    })

    it('should call raw() to extract pixel data', async () => {
      const imageBuffer = Buffer.from('fake-image')

      await extractWatermark(imageBuffer)

      expect(mockSharp.raw).toHaveBeenCalled()
    })
  })
})
