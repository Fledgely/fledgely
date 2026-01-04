/**
 * Queue Encryption Tests - Story 46.1 Task 2
 *
 * Tests for AES-256-GCM encryption of queue data.
 * AC4: Encryption at Rest
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  deriveKey,
  generateIV,
  encryptData,
  decryptData,
  encryptScreenshotCapture,
  decryptScreenshotCapture,
  clearKeyCache,
  isKeyCached,
} from './queue-encryption'

describe('Queue Encryption Service', () => {
  beforeEach(() => {
    clearKeyCache()
  })

  afterEach(() => {
    clearKeyCache()
  })

  describe('deriveKey', () => {
    it('should derive a CryptoKey from deviceId', async () => {
      const key = await deriveKey('test-device-123')
      expect(key).toBeDefined()
      expect(key.type).toBe('secret')
      expect(key.algorithm.name).toBe('AES-GCM')
    })

    it('should return cached key for same deviceId', async () => {
      const key1 = await deriveKey('test-device-123')
      const key2 = await deriveKey('test-device-123')
      expect(key1).toBe(key2) // Same reference
    })

    it('should derive new key for different deviceId', async () => {
      const key1 = await deriveKey('device-1')
      const key2 = await deriveKey('device-2')
      expect(key1).not.toBe(key2)
    })

    it('should derive consistent key for same deviceId after cache clear', async () => {
      const deviceId = 'consistent-device'

      // First derivation
      await deriveKey(deviceId)
      const testData = 'test data'
      const { encryptedData, iv } = await encryptData(testData, deviceId)

      // Clear cache and re-derive
      clearKeyCache()
      await deriveKey(deviceId)

      // Should still be able to decrypt
      const decrypted = await decryptData(encryptedData, iv, deviceId)
      expect(decrypted).toBe(testData)
    })
  })

  describe('generateIV', () => {
    it('should generate 12-byte IV', () => {
      const iv = generateIV()
      expect(iv).toBeInstanceOf(Uint8Array)
      expect(iv.length).toBe(12)
    })

    it('should generate unique IVs', () => {
      const ivs = new Set<string>()
      for (let i = 0; i < 100; i++) {
        const iv = generateIV()
        ivs.add(Array.from(iv).join(','))
      }
      expect(ivs.size).toBe(100)
    })
  })

  describe('encryptData / decryptData', () => {
    const deviceId = 'test-device'

    it('should encrypt and decrypt data successfully', async () => {
      const originalData = 'Hello, World!'
      const { encryptedData, iv } = await encryptData(originalData, deviceId)

      // Check encryptedData is ArrayBuffer-like (may be ArrayBuffer or Uint8Array.buffer)
      expect(encryptedData.byteLength).toBeGreaterThan(0)
      expect(iv).toBeInstanceOf(Uint8Array)

      const decrypted = await decryptData(encryptedData, iv, deviceId)
      expect(decrypted).toBe(originalData)
    })

    it('should encrypt base64 image data', async () => {
      const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBg=='
      const { encryptedData, iv } = await encryptData(imageData, deviceId)

      const decrypted = await decryptData(encryptedData, iv, deviceId)
      expect(decrypted).toBe(imageData)
    })

    it('should produce different ciphertext for same data with different IVs', async () => {
      const data = 'Same data'
      const result1 = await encryptData(data, deviceId)
      const result2 = await encryptData(data, deviceId)

      // Different IVs should produce different ciphertext
      const cipher1 = new Uint8Array(result1.encryptedData)
      const cipher2 = new Uint8Array(result2.encryptedData)
      expect(cipher1).not.toEqual(cipher2)
    })

    it('should fail decryption with wrong IV', async () => {
      const data = 'Secret data'
      const { encryptedData } = await encryptData(data, deviceId)
      const wrongIV = generateIV()

      await expect(decryptData(encryptedData, wrongIV, deviceId)).rejects.toThrow()
    })

    it('should fail decryption with wrong deviceId', async () => {
      const data = 'Secret data'
      const { encryptedData, iv } = await encryptData(data, deviceId)

      await expect(decryptData(encryptedData, iv, 'wrong-device')).rejects.toThrow()
    })

    it('should handle empty string', async () => {
      const { encryptedData, iv } = await encryptData('', deviceId)
      const decrypted = await decryptData(encryptedData, iv, deviceId)
      expect(decrypted).toBe('')
    })

    it('should handle large data', async () => {
      // Simulate a large base64 screenshot (~100KB)
      const largeData = 'x'.repeat(100000)
      const { encryptedData, iv } = await encryptData(largeData, deviceId)
      const decrypted = await decryptData(encryptedData, iv, deviceId)
      expect(decrypted).toBe(largeData)
    })

    it('should handle unicode characters', async () => {
      const unicodeData = 'Hello, 世界! 🌍 Привет мир!'
      const { encryptedData, iv } = await encryptData(unicodeData, deviceId)
      const decrypted = await decryptData(encryptedData, iv, deviceId)
      expect(decrypted).toBe(unicodeData)
    })
  })

  describe('encryptScreenshotCapture / decryptScreenshotCapture', () => {
    const deviceId = 'test-device'
    const mockCapture = {
      dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      timestamp: 1234567890,
      url: 'https://example.com/page',
      title: 'Test Page Title',
      captureTimeMs: 75,
    }

    it('should encrypt and decrypt capture object', async () => {
      const { encryptedData, iv } = await encryptScreenshotCapture(mockCapture, deviceId)
      const decrypted = await decryptScreenshotCapture(encryptedData, iv, deviceId)

      expect(decrypted).toEqual(mockCapture)
    })

    it('should preserve all capture properties', async () => {
      const { encryptedData, iv } = await encryptScreenshotCapture(mockCapture, deviceId)
      const decrypted = await decryptScreenshotCapture(encryptedData, iv, deviceId)

      expect(decrypted.dataUrl).toBe(mockCapture.dataUrl)
      expect(decrypted.timestamp).toBe(mockCapture.timestamp)
      expect(decrypted.url).toBe(mockCapture.url)
      expect(decrypted.title).toBe(mockCapture.title)
      expect(decrypted.captureTimeMs).toBe(mockCapture.captureTimeMs)
    })

    it('should handle special characters in URL and title', async () => {
      const captureWithSpecialChars = {
        ...mockCapture,
        url: 'https://example.com/search?q=hello+world&lang=en',
        title: 'Search: "hello" & \'world\' <test>',
      }

      const { encryptedData, iv } = await encryptScreenshotCapture(
        captureWithSpecialChars,
        deviceId
      )
      const decrypted = await decryptScreenshotCapture(encryptedData, iv, deviceId)

      expect(decrypted).toEqual(captureWithSpecialChars)
    })
  })

  describe('clearKeyCache', () => {
    it('should clear cached key', async () => {
      const deviceId = 'test-device'
      await deriveKey(deviceId)
      expect(isKeyCached(deviceId)).toBe(true)

      clearKeyCache()
      expect(isKeyCached(deviceId)).toBe(false)
    })
  })

  describe('isKeyCached', () => {
    it('should return false when no key is cached', () => {
      expect(isKeyCached('any-device')).toBe(false)
    })

    it('should return true when key is cached for device', async () => {
      const deviceId = 'cached-device'
      await deriveKey(deviceId)
      expect(isKeyCached(deviceId)).toBe(true)
    })

    it('should return false for different device', async () => {
      await deriveKey('device-a')
      expect(isKeyCached('device-b')).toBe(false)
    })
  })

  describe('Performance', () => {
    it('should encrypt quickly with cached key', async () => {
      const deviceId = 'perf-device'
      await deriveKey(deviceId) // Pre-cache key

      const data = 'x'.repeat(10000) // 10KB
      const start = performance.now()
      await encryptData(data, deviceId)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(50) // Should be fast with cached key
    })

    it('should decrypt quickly with cached key', async () => {
      const deviceId = 'perf-device'
      const data = 'x'.repeat(10000)
      const { encryptedData, iv } = await encryptData(data, deviceId)

      const start = performance.now()
      await decryptData(encryptedData, iv, deviceId)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(50)
    })
  })
})
