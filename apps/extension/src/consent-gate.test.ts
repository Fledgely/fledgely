/**
 * Unit tests for Consent Gate - Story 6.5
 *
 * Tests cover:
 * - Consent status checking via Cloud Function
 * - Response parsing and error handling
 * - Caching logic (15-minute TTL)
 * - shouldEnableMonitoring helper
 * - getConsentMessage helper
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  checkConsentStatus,
  checkConsentStatusWithCache,
  cacheConsentStatus,
  getCachedConsentStatus,
  clearConsentCache,
  shouldEnableMonitoring,
  getConsentMessage,
  type ConsentStatus,
} from './consent-gate'

// Mock chrome.storage.local
const mockStorageData: Record<string, unknown> = {}

const mockChromeStorage = {
  get: vi.fn((keys: string | string[]) => {
    const keyArray = Array.isArray(keys) ? keys : [keys]
    const result: Record<string, unknown> = {}
    keyArray.forEach((key) => {
      if (mockStorageData[key] !== undefined) {
        result[key] = mockStorageData[key]
      }
    })
    return Promise.resolve(result)
  }),
  set: vi.fn((items: Record<string, unknown>) => {
    Object.assign(mockStorageData, items)
    return Promise.resolve()
  }),
  remove: vi.fn((keys: string | string[]) => {
    const keyArray = Array.isArray(keys) ? keys : [keys]
    keyArray.forEach((key) => delete mockStorageData[key])
    return Promise.resolve()
  }),
}

// Mock fetch
const mockFetch = vi.fn()

describe('Consent Gate - Story 6.5', () => {
  beforeEach(() => {
    // Clear mocks and storage
    vi.clearAllMocks()
    Object.keys(mockStorageData).forEach((key) => delete mockStorageData[key])

    // Setup global mocks
    global.chrome = {
      storage: {
        local: mockStorageData as unknown as chrome.storage.LocalStorageArea,
      },
    } as unknown as typeof chrome

    // Re-mock the storage methods
    ;(chrome.storage.local as unknown as Record<string, unknown>).get = mockChromeStorage.get
    ;(chrome.storage.local as unknown as Record<string, unknown>).set = mockChromeStorage.set
    ;(chrome.storage.local as unknown as Record<string, unknown>).remove = mockChromeStorage.remove

    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkConsentStatus', () => {
    it('returns consent granted when active agreement exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            result: {
              hasConsent: true,
              agreementId: 'agreement-123',
              agreementVersion: 'v1.0',
              consentStatus: 'granted',
              message: 'Active agreement found',
            },
          }),
      })

      const result = await checkConsentStatus('child-1', 'family-1', 'device-1')

      expect(result.success).toBe(true)
      expect(result.status?.hasConsent).toBe(true)
      expect(result.status?.consentStatus).toBe('granted')
      expect(result.status?.agreementId).toBe('agreement-123')
    })

    it('returns consent pending when no active agreement', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            result: {
              hasConsent: false,
              agreementId: null,
              agreementVersion: null,
              consentStatus: 'pending',
              message: 'No active agreement found',
            },
          }),
      })

      const result = await checkConsentStatus('child-1', 'family-1', 'device-1')

      expect(result.success).toBe(true)
      expect(result.status?.hasConsent).toBe(false)
      expect(result.status?.consentStatus).toBe('pending')
    })

    it('returns consent withdrawn for archived agreements', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            result: {
              hasConsent: false,
              agreementId: null,
              agreementVersion: null,
              consentStatus: 'withdrawn',
              message: 'Agreement has been archived',
            },
          }),
      })

      const result = await checkConsentStatus('child-1', 'family-1', 'device-1')

      expect(result.success).toBe(true)
      expect(result.status?.consentStatus).toBe('withdrawn')
    })

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await checkConsentStatus('child-1', 'family-1', 'device-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('handles HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: { message: 'Not found', code: 'NOT_FOUND' } }),
      })

      const result = await checkConsentStatus('child-1', 'family-1', 'device-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Not found')
    })

    it('handles JSON parse errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      const result = await checkConsentStatus('child-1', 'family-1', 'device-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid JSON')
    })

    it('sends correct query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            result: {
              hasConsent: true,
              agreementId: 'agreement-123',
              agreementVersion: 'v1.0',
              consentStatus: 'granted',
              message: 'Active agreement found',
            },
          }),
      })

      await checkConsentStatus('child-abc', 'family-xyz', 'device-123')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('childId=child-abc'),
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('familyId=family-xyz'),
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('deviceId=device-123'),
        expect.any(Object)
      )
    })
  })

  describe('caching', () => {
    const cachedStatus: ConsentStatus = {
      hasConsent: true,
      agreementId: 'cached-agreement',
      agreementVersion: 'v1.0',
      message: 'Cached',
      consentStatus: 'granted',
    }

    it('caches consent status with timestamp', async () => {
      await cacheConsentStatus(cachedStatus, 'child-1', 'family-1')

      expect(mockChromeStorage.set).toHaveBeenCalled()
      const setCall = mockChromeStorage.set.mock.calls[0][0]
      expect(setCall.consentStatusCache).toBeDefined()
      expect(setCall.consentStatusCache.status).toEqual(cachedStatus)
      expect(setCall.consentStatusCache.cachedAt).toBeLessThanOrEqual(Date.now())
    })

    it('retrieves cached status when valid', async () => {
      // Set up valid cache (15 minute TTL, cache is 5 minutes old)
      mockStorageData.consentStatusCache = {
        childId: 'child-1',
        familyId: 'family-1',
        status: cachedStatus,
        cachedAt: Date.now() - 5 * 60 * 1000, // 5 minutes ago
      }

      const result = await getCachedConsentStatus('child-1', 'family-1')

      expect(result).toEqual(cachedStatus)
    })

    it('returns null for expired cache', async () => {
      // Set up expired cache (15 minute TTL, cache is 20 minutes old)
      mockStorageData.consentStatusCache = {
        childId: 'child-1',
        familyId: 'family-1',
        status: cachedStatus,
        cachedAt: Date.now() - 20 * 60 * 1000, // 20 minutes ago
      }

      const result = await getCachedConsentStatus('child-1', 'family-1')

      expect(result).toBeNull()
    })

    it('returns null for different child/family', async () => {
      mockStorageData.consentStatusCache = {
        childId: 'child-1',
        familyId: 'family-1',
        status: cachedStatus,
        cachedAt: Date.now() - 5 * 60 * 1000,
      }

      const result = await getCachedConsentStatus('child-2', 'family-1')

      expect(result).toBeNull()
    })

    it('clears cache when requested', async () => {
      mockStorageData.consentStatusCache = {
        status: cachedStatus,
        cachedAt: Date.now(),
      }

      await clearConsentCache()

      expect(mockChromeStorage.remove).toHaveBeenCalledWith('consentStatusCache')
    })
  })

  describe('checkConsentStatusWithCache', () => {
    const freshStatus: ConsentStatus = {
      hasConsent: true,
      agreementId: 'fresh-agreement',
      agreementVersion: 'v2.0',
      message: 'Fresh from server',
      consentStatus: 'granted',
    }

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: freshStatus }),
      })
    })

    it('uses cached status when available and not forced', async () => {
      const cachedStatus: ConsentStatus = {
        hasConsent: false,
        agreementId: null,
        agreementVersion: null,
        message: 'Cached pending',
        consentStatus: 'pending',
      }

      mockStorageData.consentStatusCache = {
        childId: 'child-1',
        familyId: 'family-1',
        status: cachedStatus,
        cachedAt: Date.now() - 5 * 60 * 1000, // 5 minutes ago (within TTL)
      }

      const result = await checkConsentStatusWithCache('child-1', 'family-1', 'device-1', false)

      expect(result.success).toBe(true)
      expect(result.status).toEqual(cachedStatus)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('fetches fresh status when forceRefresh is true', async () => {
      const cachedStatus: ConsentStatus = {
        hasConsent: false,
        agreementId: null,
        agreementVersion: null,
        message: 'Cached pending',
        consentStatus: 'pending',
      }

      mockStorageData.consentStatusCache = {
        childId: 'child-1',
        familyId: 'family-1',
        status: cachedStatus,
        cachedAt: Date.now() - 5 * 60 * 1000, // 5 minutes ago (within TTL)
      }

      const result = await checkConsentStatusWithCache('child-1', 'family-1', 'device-1', true)

      expect(result.success).toBe(true)
      expect(result.status).toEqual(freshStatus)
      expect(mockFetch).toHaveBeenCalled()
    })

    it('fetches fresh status when cache is expired', async () => {
      mockStorageData.consentStatusCache = {
        childId: 'child-1',
        familyId: 'family-1',
        status: {
          hasConsent: false,
          agreementId: null,
          agreementVersion: null,
          message: 'Expired',
          consentStatus: 'pending',
        },
        cachedAt: Date.now() - 20 * 60 * 1000, // 20 minutes ago (expired)
      }

      const result = await checkConsentStatusWithCache('child-1', 'family-1', 'device-1', false)

      expect(result.success).toBe(true)
      expect(result.status).toEqual(freshStatus)
      expect(mockFetch).toHaveBeenCalled()
    })

    it('caches successful server response', async () => {
      await checkConsentStatusWithCache('child-1', 'family-1', 'device-1', true)

      expect(mockChromeStorage.set).toHaveBeenCalled()
      const setCall = mockChromeStorage.set.mock.calls[0][0]
      expect(setCall.consentStatusCache.status).toEqual(freshStatus)
    })
  })

  describe('shouldEnableMonitoring', () => {
    it('returns true when consent is granted', () => {
      const status: ConsentStatus = {
        hasConsent: true,
        agreementId: 'agreement-123',
        agreementVersion: 'v1.0',
        message: 'Active',
        consentStatus: 'granted',
      }

      expect(shouldEnableMonitoring(status)).toBe(true)
    })

    it('returns false when consent is pending', () => {
      const status: ConsentStatus = {
        hasConsent: false,
        agreementId: null,
        agreementVersion: null,
        message: 'Pending',
        consentStatus: 'pending',
      }

      expect(shouldEnableMonitoring(status)).toBe(false)
    })

    it('returns false when consent is withdrawn', () => {
      const status: ConsentStatus = {
        hasConsent: false,
        agreementId: null,
        agreementVersion: null,
        message: 'Withdrawn',
        consentStatus: 'withdrawn',
      }

      expect(shouldEnableMonitoring(status)).toBe(false)
    })

    it('returns false when hasConsent is false even if consentStatus is granted', () => {
      // Edge case: server returns inconsistent data
      const status: ConsentStatus = {
        hasConsent: false,
        agreementId: null,
        agreementVersion: null,
        message: 'Inconsistent',
        consentStatus: 'granted',
      }

      expect(shouldEnableMonitoring(status)).toBe(false)
    })
  })

  describe('getConsentMessage', () => {
    it('returns active message for granted consent', () => {
      const status: ConsentStatus = {
        hasConsent: true,
        agreementId: 'agreement-123',
        agreementVersion: 'v1.0',
        message: 'Server message',
        consentStatus: 'granted',
      }

      const message = getConsentMessage(status)

      expect(message.toLowerCase()).toContain('monitoring')
      expect(message.toLowerCase()).toContain('active')
    })

    it('returns pending message for pending consent', () => {
      const status: ConsentStatus = {
        hasConsent: false,
        agreementId: null,
        agreementVersion: null,
        message: 'Server message',
        consentStatus: 'pending',
      }

      const message = getConsentMessage(status)

      expect(message.toLowerCase()).toContain('agreement')
    })

    it('returns withdrawn message for withdrawn consent', () => {
      const status: ConsentStatus = {
        hasConsent: false,
        agreementId: null,
        agreementVersion: null,
        message: 'Server message',
        consentStatus: 'withdrawn',
      }

      const message = getConsentMessage(status)

      expect(message.toLowerCase()).toContain('agreement')
    })
  })
})
