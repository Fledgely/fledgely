/**
 * Watermark Encoding Tests
 * Story 18.5: Forensic Watermarking on View
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Sharp before importing the module
const mockToBufferWithObject = vi.fn()
const mockToBufferSimple = vi.fn()
const mockJpeg = vi.fn()
const mockRemoveAlpha = vi.fn()

// First instance - used for reading the image
const mockSharpFirstInstance = {
  raw: vi.fn().mockReturnThis(),
  ensureAlpha: vi.fn().mockReturnThis(),
  removeAlpha: vi.fn(() => {
    mockRemoveAlpha()
    return {
      jpeg: vi.fn((opts) => {
        mockJpeg(opts)
        return { toBuffer: mockToBufferSimple }
      }),
    }
  }),
  toBuffer: mockToBufferWithObject,
  metadata: vi.fn(),
}

// Second instance - used for converting back to JPEG
const mockSharpSecondInstance = {
  removeAlpha: vi.fn(() => {
    mockRemoveAlpha()
    return {
      jpeg: vi.fn((opts) => {
        mockJpeg(opts)
        return { toBuffer: mockToBufferSimple }
      }),
    }
  }),
}

let callCount = 0

vi.mock('sharp', () => ({
  default: vi.fn(() => {
    callCount++
    if (callCount % 2 === 1) {
      return mockSharpFirstInstance
    }
    return mockSharpSecondInstance
  }),
}))

import { embedWatermark, WatermarkPayload } from './encode'

describe('embedWatermark', () => {
  const validPayload: WatermarkPayload = {
    viewerId: 'user123abc',
    viewTimestamp: 1703001600000, // 2023-12-19T16:00:00.000Z
    screenshotId: 'screenshot456',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    callCount = 0

    // Default mock for 100x100 RGBA image
    const width = 100
    const height = 100
    const channels = 4 // RGBA
    const rawData = Buffer.alloc(width * height * channels, 128) // Grey image

    mockSharpFirstInstance.metadata.mockResolvedValue({
      width,
      height,
      channels: 3, // Original image has 3 channels
    })

    // Return with resolveWithObject format for raw pixel extraction
    mockToBufferWithObject.mockResolvedValue({
      data: rawData,
      info: { width, height, channels },
    })

    // Return simple buffer for final JPEG output
    mockToBufferSimple.mockResolvedValue(Buffer.from('fake-jpeg-output'))

    // Reset chaining methods
    mockSharpFirstInstance.raw.mockReturnThis()
    mockSharpFirstInstance.ensureAlpha.mockReturnThis()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('input validation', () => {
    it('should reject images smaller than minimum size', async () => {
      const width = 50
      const height = 50
      const channels = 4 // RGBA

      mockSharpFirstInstance.metadata.mockResolvedValue({
        width,
        height,
        channels: 3,
      })
      mockToBufferWithObject.mockResolvedValue({
        data: Buffer.alloc(width * height * channels, 128),
        info: { width, height, channels },
      })

      const imageBuffer = Buffer.from('fake-image')

      await expect(embedWatermark(imageBuffer, validPayload)).rejects.toThrow('Image too small')
    })

    it('should accept viewerId up to 28 characters', async () => {
      const payloadWithLongId = {
        ...validPayload,
        viewerId: 'a'.repeat(28),
      }

      const imageBuffer = Buffer.from('fake-image')

      // Should not throw
      await expect(embedWatermark(imageBuffer, payloadWithLongId)).resolves.toBeDefined()
    })

    it('should accept screenshotId up to 20 characters', async () => {
      const payloadWithLongId = {
        ...validPayload,
        screenshotId: 'b'.repeat(20),
      }

      const imageBuffer = Buffer.from('fake-image')

      // Should not throw
      await expect(embedWatermark(imageBuffer, payloadWithLongId)).resolves.toBeDefined()
    })
  })

  describe('watermark embedding', () => {
    it('should return a buffer with the watermarked image', async () => {
      const imageBuffer = Buffer.from('fake-image')

      const result = await embedWatermark(imageBuffer, validPayload)

      expect(result).toBeInstanceOf(Buffer)
    })

    it('should use JPEG output format with specified quality', async () => {
      const imageBuffer = Buffer.from('fake-image')

      await embedWatermark(imageBuffer, validPayload, { outputQuality: 85 })

      expect(mockJpeg).toHaveBeenCalledWith({ quality: 85 })
    })

    it('should use default output quality of 90', async () => {
      const imageBuffer = Buffer.from('fake-image')

      await embedWatermark(imageBuffer, validPayload)

      expect(mockJpeg).toHaveBeenCalledWith({ quality: 90 })
    })

    it('should call raw() to extract pixel data', async () => {
      const imageBuffer = Buffer.from('fake-image')

      await embedWatermark(imageBuffer, validPayload)

      expect(mockSharpFirstInstance.raw).toHaveBeenCalled()
    })

    it('should call ensureAlpha() for RGBA format', async () => {
      const imageBuffer = Buffer.from('fake-image')

      await embedWatermark(imageBuffer, validPayload)

      expect(mockSharpFirstInstance.ensureAlpha).toHaveBeenCalled()
    })

    it('should call removeAlpha() before JPEG output', async () => {
      const imageBuffer = Buffer.from('fake-image')

      await embedWatermark(imageBuffer, validPayload)

      expect(mockRemoveAlpha).toHaveBeenCalled()
    })
  })

  describe('configuration options', () => {
    it('should accept custom secret key', async () => {
      const imageBuffer = Buffer.from('fake-image')

      // Should not throw with custom secret key
      const result = await embedWatermark(imageBuffer, validPayload, {
        secretKey: 'custom-secret-key-123',
      })

      expect(result).toBeInstanceOf(Buffer)
    })

    it('should accept custom strength parameter', async () => {
      const imageBuffer = Buffer.from('fake-image')

      // Should not throw with custom strength
      const result = await embedWatermark(imageBuffer, validPayload, {
        strength: 5,
      })

      expect(result).toBeInstanceOf(Buffer)
    })

    it('should accept custom repetitions parameter', async () => {
      const imageBuffer = Buffer.from('fake-image')

      // Should not throw with custom repetitions
      const result = await embedWatermark(imageBuffer, validPayload, {
        repetitions: 3,
      })

      expect(result).toBeInstanceOf(Buffer)
    })
  })

  describe('payload serialization', () => {
    it('should handle empty viewerId', async () => {
      const payloadWithEmptyId = {
        ...validPayload,
        viewerId: '',
      }

      const imageBuffer = Buffer.from('fake-image')

      // Should not throw - empty string is padded
      const result = await embedWatermark(imageBuffer, payloadWithEmptyId)
      expect(result).toBeInstanceOf(Buffer)
    })

    it('should handle zero timestamp', async () => {
      const payloadWithZeroTimestamp = {
        ...validPayload,
        viewTimestamp: 0,
      }

      const imageBuffer = Buffer.from('fake-image')

      const result = await embedWatermark(imageBuffer, payloadWithZeroTimestamp)
      expect(result).toBeInstanceOf(Buffer)
    })

    it('should handle maximum timestamp value', async () => {
      const payloadWithMaxTimestamp = {
        ...validPayload,
        viewTimestamp: Number.MAX_SAFE_INTEGER,
      }

      const imageBuffer = Buffer.from('fake-image')

      const result = await embedWatermark(imageBuffer, payloadWithMaxTimestamp)
      expect(result).toBeInstanceOf(Buffer)
    })
  })
})
