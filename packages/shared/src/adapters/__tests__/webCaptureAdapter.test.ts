/**
 * Web Capture Adapter Tests
 *
 * Story 7.8: Privacy Gaps Injection - Task 8.5
 *
 * Tests for web capture adapter including:
 * - Capture decision based on privacy gaps
 * - Crisis URL suppression
 * - Zero-data-path compliance (no reason in decision)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createWebCaptureAdapter,
  type WebCaptureAdapter,
} from '../webCaptureAdapter'
import type { PrivacyGapDetector } from '../../services/privacyGapDetector'

describe('webCaptureAdapter', () => {
  let mockDetector: PrivacyGapDetector
  let adapter: WebCaptureAdapter

  beforeEach(() => {
    vi.clearAllMocks()

    mockDetector = {
      shouldSuppressCapture: vi.fn().mockResolvedValue({ suppress: false }),
      isWithinScheduledGap: vi.fn().mockResolvedValue(false),
    }

    adapter = createWebCaptureAdapter({
      privacyGapDetector: mockDetector,
      childId: 'test-child-123',
    })
  })

  describe('shouldCapture', () => {
    it('returns shouldCapture: true when not suppressed', async () => {
      vi.mocked(mockDetector.shouldSuppressCapture).mockResolvedValue({
        suppress: false,
      })

      const decision = await adapter.shouldCapture('https://example.com')

      expect(decision.shouldCapture).toBe(true)
    })

    it('returns shouldCapture: false when suppressed', async () => {
      vi.mocked(mockDetector.shouldSuppressCapture).mockResolvedValue({
        suppress: true,
      })

      const decision = await adapter.shouldCapture('https://988lifeline.org')

      expect(decision.shouldCapture).toBe(false)
    })

    it('calls detector with correct parameters', async () => {
      const url = 'https://test-url.com'

      await adapter.shouldCapture(url)

      expect(mockDetector.shouldSuppressCapture).toHaveBeenCalledWith(
        'test-child-123',
        expect.any(Date),
        url
      )
    })

    it('uses current timestamp for detector call', async () => {
      const beforeCall = new Date()

      await adapter.shouldCapture('https://example.com')

      const calledTimestamp = vi.mocked(mockDetector.shouldSuppressCapture).mock
        .calls[0][1] as Date

      const afterCall = new Date()

      expect(calledTimestamp.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime()
      )
      expect(calledTimestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime())
    })
  })

  describe('zero-data-path compliance', () => {
    it('decision contains ONLY shouldCapture field', async () => {
      const decision = await adapter.shouldCapture('https://example.com')

      expect(Object.keys(decision)).toEqual(['shouldCapture'])
    })

    it('decision does NOT contain reason field', async () => {
      vi.mocked(mockDetector.shouldSuppressCapture).mockResolvedValue({
        suppress: true,
      })

      const decision = await adapter.shouldCapture('https://988lifeline.org')

      expect(decision).not.toHaveProperty('reason')
      expect(decision).not.toHaveProperty('gapType')
      expect(decision).not.toHaveProperty('isCrisis')
    })

    it('suppression reason is never passed through', async () => {
      // Even if detector returned reason (which it shouldn't), adapter strips it
      vi.mocked(mockDetector.shouldSuppressCapture).mockResolvedValue({
        suppress: true,
        // @ts-expect-error - testing that even if reason exists, it's not passed
        reason: 'crisis-url',
      } as { suppress: boolean })

      const decision = await adapter.shouldCapture('https://988lifeline.org')

      expect(Object.keys(decision)).toEqual(['shouldCapture'])
    })
  })

  describe('setChildId', () => {
    it('updates child ID for subsequent calls', async () => {
      await adapter.shouldCapture('https://example.com')

      expect(mockDetector.shouldSuppressCapture).toHaveBeenCalledWith(
        'test-child-123',
        expect.any(Date),
        expect.any(String)
      )

      adapter.setChildId('new-child-456')

      await adapter.shouldCapture('https://example.com')

      expect(mockDetector.shouldSuppressCapture).toHaveBeenLastCalledWith(
        'new-child-456',
        expect.any(Date),
        expect.any(String)
      )
    })
  })

  describe('various URL types', () => {
    it('handles normal URLs', async () => {
      vi.mocked(mockDetector.shouldSuppressCapture).mockResolvedValue({
        suppress: false,
      })

      const decision = await adapter.shouldCapture('https://google.com')

      expect(decision.shouldCapture).toBe(true)
    })

    it('handles crisis URLs (via detector)', async () => {
      vi.mocked(mockDetector.shouldSuppressCapture).mockResolvedValue({
        suppress: true,
      })

      const decision = await adapter.shouldCapture('https://988lifeline.org')

      expect(decision.shouldCapture).toBe(false)
    })

    it('handles URLs with query params', async () => {
      await adapter.shouldCapture(
        'https://example.com/page?param=value&other=123'
      )

      expect(mockDetector.shouldSuppressCapture).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Date),
        'https://example.com/page?param=value&other=123'
      )
    })

    it('handles URLs with fragments', async () => {
      await adapter.shouldCapture('https://example.com/page#section')

      expect(mockDetector.shouldSuppressCapture).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Date),
        'https://example.com/page#section'
      )
    })

    it('handles localhost URLs', async () => {
      await adapter.shouldCapture('http://localhost:3000')

      expect(mockDetector.shouldSuppressCapture).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('propagates detector errors', async () => {
      vi.mocked(mockDetector.shouldSuppressCapture).mockRejectedValue(
        new Error('Detector error')
      )

      await expect(adapter.shouldCapture('https://example.com')).rejects.toThrow(
        'Detector error'
      )
    })
  })
})
