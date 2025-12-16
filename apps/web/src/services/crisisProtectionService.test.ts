/**
 * Crisis Protection Service Tests
 *
 * Story 7.2: Crisis Visit Zero-Data-Path - Task 1.9
 *
 * Tests the zero-data-path service that blocks ALL monitoring
 * when a child visits a crisis resource.
 *
 * CRITICAL: INV-001 - Crisis URLs NEVER captured
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @fledgely/shared before importing the service
vi.mock('@fledgely/shared', () => ({
  isCrisisUrl: vi.fn(),
  getCrisisAllowlist: vi.fn(() => ({
    version: '1.0.0-2025-12-16T12:00:00Z',
    lastUpdated: '2025-12-16T12:00:00Z',
    entries: [
      {
        id: 'test-1',
        domain: '988lifeline.org',
        category: 'suicide',
        aliases: ['suicidepreventionlifeline.org'],
        wildcardPatterns: ['*.988lifeline.org'],
        name: '988 Suicide & Crisis Lifeline',
        description: 'National suicide prevention',
        region: 'us',
        contactMethods: ['phone', 'text', 'chat'],
      },
    ],
  })),
}))

import {
  shouldBlockMonitoring,
  shouldBlockScreenshot,
  shouldBlockUrlLogging,
  shouldBlockTimeTracking,
  shouldBlockNotification,
  shouldBlockAnalytics,
  crisisGuard,
  type CrisisProtectionGuard,
} from './crisisProtectionService'
import { isCrisisUrl } from '@fledgely/shared'

const mockIsCrisisUrl = vi.mocked(isCrisisUrl)

describe('crisisProtectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('shouldBlockMonitoring', () => {
    it('returns true for crisis URLs', () => {
      mockIsCrisisUrl.mockReturnValue(true)

      expect(shouldBlockMonitoring('https://988lifeline.org')).toBe(true)
      expect(mockIsCrisisUrl).toHaveBeenCalledWith('https://988lifeline.org')
    })

    it('returns false for non-crisis URLs', () => {
      mockIsCrisisUrl.mockReturnValue(false)

      expect(shouldBlockMonitoring('https://google.com')).toBe(false)
      expect(mockIsCrisisUrl).toHaveBeenCalledWith('https://google.com')
    })

    it('returns false for empty string', () => {
      mockIsCrisisUrl.mockReturnValue(false)

      expect(shouldBlockMonitoring('')).toBe(false)
    })

    it('returns false for null/undefined (defensive)', () => {
      mockIsCrisisUrl.mockReturnValue(false)

      // Type assertions for testing defensive behavior
      expect(shouldBlockMonitoring(null as unknown as string)).toBe(false)
      expect(shouldBlockMonitoring(undefined as unknown as string)).toBe(false)
    })

    it('is synchronous (not async)', () => {
      mockIsCrisisUrl.mockReturnValue(true)

      // The function should return immediately, not a promise
      const result = shouldBlockMonitoring('https://988lifeline.org')
      expect(result).not.toBeInstanceOf(Promise)
      expect(typeof result).toBe('boolean')
    })
  })

  describe('shouldBlockScreenshot (AC: 1)', () => {
    it('returns true when URL is a crisis resource', () => {
      mockIsCrisisUrl.mockReturnValue(true)

      expect(shouldBlockScreenshot('https://988lifeline.org')).toBe(true)
    })

    it('returns false when URL is not a crisis resource', () => {
      mockIsCrisisUrl.mockReturnValue(false)

      expect(shouldBlockScreenshot('https://youtube.com')).toBe(false)
    })
  })

  describe('shouldBlockUrlLogging (AC: 2)', () => {
    it('returns true when URL is a crisis resource', () => {
      mockIsCrisisUrl.mockReturnValue(true)

      expect(shouldBlockUrlLogging('https://rainn.org')).toBe(true)
    })

    it('returns false when URL is not a crisis resource', () => {
      mockIsCrisisUrl.mockReturnValue(false)

      expect(shouldBlockUrlLogging('https://facebook.com')).toBe(false)
    })
  })

  describe('shouldBlockTimeTracking (AC: 3)', () => {
    it('returns true when URL is a crisis resource', () => {
      mockIsCrisisUrl.mockReturnValue(true)

      expect(shouldBlockTimeTracking('https://thetrevoproject.org')).toBe(true)
    })

    it('returns false when URL is not a crisis resource', () => {
      mockIsCrisisUrl.mockReturnValue(false)

      expect(shouldBlockTimeTracking('https://twitter.com')).toBe(false)
    })
  })

  describe('shouldBlockNotification (AC: 4)', () => {
    it('returns true when URL is a crisis resource', () => {
      mockIsCrisisUrl.mockReturnValue(true)

      expect(shouldBlockNotification('https://thehotline.org')).toBe(true)
    })

    it('returns false when URL is not a crisis resource', () => {
      mockIsCrisisUrl.mockReturnValue(false)

      expect(shouldBlockNotification('https://instagram.com')).toBe(false)
    })
  })

  describe('shouldBlockAnalytics (AC: 5)', () => {
    it('returns true when URL is a crisis resource', () => {
      mockIsCrisisUrl.mockReturnValue(true)

      expect(shouldBlockAnalytics('https://childhelp.org')).toBe(true)
    })

    it('returns false when URL is not a crisis resource', () => {
      mockIsCrisisUrl.mockReturnValue(false)

      expect(shouldBlockAnalytics('https://tiktok.com')).toBe(false)
    })
  })

  describe('crisisGuard', () => {
    it('implements CrisisProtectionGuard interface', () => {
      const guard: CrisisProtectionGuard = crisisGuard

      expect(guard).toBeDefined()
      expect(typeof guard.shouldBlock).toBe('function')
      expect(typeof guard.shouldBlockScreenshot).toBe('function')
      expect(typeof guard.shouldBlockUrlLogging).toBe('function')
      expect(typeof guard.shouldBlockTimeTracking).toBe('function')
      expect(typeof guard.shouldBlockNotification).toBe('function')
      expect(typeof guard.shouldBlockAnalytics).toBe('function')
    })

    it('shouldBlock delegates to shouldBlockMonitoring', () => {
      mockIsCrisisUrl.mockReturnValue(true)

      expect(crisisGuard.shouldBlock('https://988lifeline.org')).toBe(true)
    })

    it('all blocking methods return true for crisis URLs', () => {
      mockIsCrisisUrl.mockReturnValue(true)
      const url = 'https://988lifeline.org'

      expect(crisisGuard.shouldBlock(url)).toBe(true)
      expect(crisisGuard.shouldBlockScreenshot(url)).toBe(true)
      expect(crisisGuard.shouldBlockUrlLogging(url)).toBe(true)
      expect(crisisGuard.shouldBlockTimeTracking(url)).toBe(true)
      expect(crisisGuard.shouldBlockNotification(url)).toBe(true)
      expect(crisisGuard.shouldBlockAnalytics(url)).toBe(true)
    })

    it('all blocking methods return false for non-crisis URLs', () => {
      mockIsCrisisUrl.mockReturnValue(false)
      const url = 'https://google.com'

      expect(crisisGuard.shouldBlock(url)).toBe(false)
      expect(crisisGuard.shouldBlockScreenshot(url)).toBe(false)
      expect(crisisGuard.shouldBlockUrlLogging(url)).toBe(false)
      expect(crisisGuard.shouldBlockTimeTracking(url)).toBe(false)
      expect(crisisGuard.shouldBlockNotification(url)).toBe(false)
      expect(crisisGuard.shouldBlockAnalytics(url)).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('handles URLs with paths', () => {
      mockIsCrisisUrl.mockReturnValue(true)

      expect(shouldBlockMonitoring('https://988lifeline.org/get-help')).toBe(true)
    })

    it('handles URLs with query parameters', () => {
      mockIsCrisisUrl.mockReturnValue(true)

      expect(shouldBlockMonitoring('https://988lifeline.org?ref=test')).toBe(true)
    })

    it('handles URLs with fragments', () => {
      mockIsCrisisUrl.mockReturnValue(true)

      expect(shouldBlockMonitoring('https://988lifeline.org#resources')).toBe(true)
    })

    it('handles malformed URLs gracefully', () => {
      mockIsCrisisUrl.mockReturnValue(false)

      // Should not throw, just return false
      expect(shouldBlockMonitoring('not-a-url')).toBe(false)
      expect(shouldBlockMonitoring('://invalid')).toBe(false)
    })
  })

  describe('Fail-Safe Behavior', () => {
    it('returns false on error (fail-open for non-crisis)', () => {
      // Simulating isCrisisUrl throwing an error
      mockIsCrisisUrl.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      // Should catch error and return false (fail-open)
      // This is intentional - we don't block normal browsing if check fails
      expect(shouldBlockMonitoring('https://example.com')).toBe(false)
    })
  })
})
