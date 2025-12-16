/**
 * Tests for Allowlist Sync Status Endpoint
 *
 * Story 7.7: Allowlist Distribution & Sync - Task 9.6
 *
 * Tests the HTTP endpoints for reporting and viewing allowlist sync status.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Request, Response } from 'express'
import { ALLOWLIST_SYNC_CONSTANTS } from '@fledgely/contracts'

// Mock firebase-admin/firestore
const mockSet = vi.fn().mockResolvedValue({})
const mockGet = vi.fn()
const mockDoc = vi.fn().mockImplementation(() => ({
  set: mockSet,
  get: mockGet,
}))
const mockCollection = vi.fn().mockImplementation(() => ({
  doc: mockDoc,
  get: mockGet,
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
  Timestamp: {
    now: vi.fn(() => ({
      toDate: () => new Date('2025-12-15T10:00:00Z'),
    })),
  },
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}))

// Mock firebase-functions/v2/https
vi.mock('firebase-functions/v2/https', () => ({
  onRequest: vi.fn((options, handler) => handler),
}))

// Mock @fledgely/shared - use importOriginal to preserve all exports
vi.mock('@fledgely/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@fledgely/shared')>()
  return {
    ...actual,
    getAllowlistVersion: vi.fn(() => '1.0.0-2025-12-16T00:00:00Z'),
  }
})

describe('allowlistSyncStatus endpoint', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let jsonSpy: ReturnType<typeof vi.fn>
  let statusSpy: ReturnType<typeof vi.fn>
  let setSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-15T10:00:00Z'))

    jsonSpy = vi.fn()
    statusSpy = vi.fn().mockReturnThis()
    setSpy = vi.fn().mockReturnThis()

    mockRes = {
      json: jsonSpy,
      status: statusSpy,
      set: setSpy,
      send: vi.fn(),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('POST /api/allowlist-sync-status', () => {
    it('accepts valid sync status report', async () => {
      const { __testing } = await import('./allowlistSyncStatus')

      mockReq = {
        method: 'POST',
        body: {
          platform: 'web',
          version: '1.0.0-2025-12-16T00:00:00Z',
          cacheAge: 3600000, // 1 hour
          isEmergency: false,
        },
        headers: {},
        ip: '192.168.1.1',
      }

      // Clear rate limit store
      __testing.rateLimitStore.clear()

      await __testing.handlePostSyncStatus(
        mockReq as Request,
        mockRes as Response
      )

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          serverVersion: '1.0.0-2025-12-16T00:00:00Z',
        })
      )
    })

    it('rejects invalid request body', async () => {
      const { __testing } = await import('./allowlistSyncStatus')

      mockReq = {
        method: 'POST',
        body: {
          // Missing required fields
          platform: 'web',
        },
        headers: {},
        ip: '192.168.1.1',
      }

      await __testing.handlePostSyncStatus(
        mockReq as Request,
        mockRes as Response
      )

      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid request body',
        })
      )
    })

    it('rate limits duplicate reports from same platform', async () => {
      const { __testing } = await import('./allowlistSyncStatus')

      mockReq = {
        method: 'POST',
        body: {
          platform: 'android',
          version: '1.0.0',
          cacheAge: 1000,
          isEmergency: false,
        },
        headers: {},
        ip: '192.168.1.1',
      }

      // Clear rate limit store
      __testing.rateLimitStore.clear()

      // First request should succeed
      await __testing.handlePostSyncStatus(
        mockReq as Request,
        mockRes as Response
      )
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      )

      // Reset mocks
      jsonSpy.mockClear()
      statusSpy.mockClear()

      // Second request should be rate limited
      await __testing.handlePostSyncStatus(
        mockReq as Request,
        mockRes as Response
      )

      expect(statusSpy).toHaveBeenCalledWith(429)
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many requests',
        })
      )
    })

    it('indicates shouldResync when version differs', async () => {
      const { __testing } = await import('./allowlistSyncStatus')

      mockReq = {
        method: 'POST',
        body: {
          platform: 'ios',
          version: '0.9.0', // Older version
          cacheAge: 1000,
          isEmergency: false,
        },
        headers: {},
        ip: '192.168.1.2',
      }

      // Clear rate limit store
      __testing.rateLimitStore.clear()

      await __testing.handlePostSyncStatus(
        mockReq as Request,
        mockRes as Response
      )

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          shouldResync: true,
        })
      )
    })

    it('stores sync status in Firestore', async () => {
      const { __testing } = await import('./allowlistSyncStatus')

      mockReq = {
        method: 'POST',
        body: {
          platform: 'chrome-extension',
          version: '1.0.0-2025-12-16T00:00:00Z',
          cacheAge: 5000,
          isEmergency: false,
          deviceId: 'test-device',
        },
        headers: {},
        ip: '192.168.1.3',
      }

      // Clear rate limit store
      __testing.rateLimitStore.clear()

      await __testing.handlePostSyncStatus(
        mockReq as Request,
        mockRes as Response
      )

      expect(mockCollection).toHaveBeenCalledWith(
        ALLOWLIST_SYNC_CONSTANTS.SYNC_STATUS_COLLECTION
      )
      expect(mockDoc).toHaveBeenCalledWith('chrome-extension')
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'chrome-extension',
          version: '1.0.0-2025-12-16T00:00:00Z',
        })
      )
    })
  })

  describe('GET /api/allowlist-sync-status', () => {
    it('returns all platform sync statuses', async () => {
      const { __testing } = await import('./allowlistSyncStatus')

      const recentSync = new Date('2025-12-15T08:00:00Z').toISOString()
      const mockStatuses = [
        {
          platform: 'web',
          version: '1.0.0',
          lastSyncAt: recentSync,
          isStale: false,
          cacheAge: 1000,
          isEmergency: false,
        },
      ]

      mockGet.mockResolvedValueOnce({
        forEach: (callback: (doc: { data: () => unknown }) => void) => {
          mockStatuses.forEach((status) => {
            callback({ data: () => status })
          })
        },
      })

      mockReq = {
        method: 'GET',
        headers: {},
      }

      await __testing.handleGetSyncStatuses(
        mockReq as Request,
        mockRes as Response
      )

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          statuses: expect.any(Array),
          serverVersion: '1.0.0-2025-12-16T00:00:00Z',
          generatedAt: expect.any(String),
        })
      )
    })

    it('identifies stale and missing platforms', async () => {
      const { __testing } = await import('./allowlistSyncStatus')

      // Only web has reported, and it's stale
      const staleSync = new Date('2025-12-12T08:00:00Z').toISOString()
      const mockStatuses = [
        {
          platform: 'web',
          version: '1.0.0',
          lastSyncAt: staleSync, // >48h ago
          isStale: true,
          cacheAge: 72 * 60 * 60 * 1000,
          isEmergency: false,
        },
      ]

      mockGet.mockResolvedValueOnce({
        forEach: (callback: (doc: { data: () => unknown }) => void) => {
          mockStatuses.forEach((status) => {
            callback({ data: () => status })
          })
        },
      })

      mockReq = {
        method: 'GET',
        headers: {},
      }

      await __testing.handleGetSyncStatuses(
        mockReq as Request,
        mockRes as Response
      )

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          stalePlatforms: expect.arrayContaining([
            'web', // stale
            'chrome-extension', // missing
            'android', // missing
            'ios', // missing
          ]),
        })
      )
    })

    it('sets appropriate cache headers', async () => {
      const { __testing } = await import('./allowlistSyncStatus')

      mockGet.mockResolvedValueOnce({
        forEach: vi.fn(),
      })

      mockReq = {
        method: 'GET',
        headers: {},
      }

      await __testing.handleGetSyncStatuses(
        mockReq as Request,
        mockRes as Response
      )

      expect(setSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'Cache-Control': 'private, max-age=60',
        })
      )
    })
  })

  describe('Method handling', () => {
    it('rejects unsupported methods', async () => {
      const { allowlistSyncStatusEndpoint } = await import(
        './allowlistSyncStatus'
      )

      mockReq = {
        method: 'DELETE',
        headers: {},
      }

      const sendSpy = vi.fn()
      mockRes.send = sendSpy

      await allowlistSyncStatusEndpoint(
        mockReq as Request,
        mockRes as Response
      )

      expect(statusSpy).toHaveBeenCalledWith(405)
      expect(sendSpy).toHaveBeenCalledWith('Method not allowed')
    })
  })

  describe('Rate limiting utilities', () => {
    it('getClientId uses platform and IP', async () => {
      const { __testing } = await import('./allowlistSyncStatus')

      mockReq = {
        headers: {},
        ip: '192.168.1.1',
      }

      const clientId = __testing.getClientId(mockReq as Request, 'web')
      expect(clientId).toBe('web:192.168.1.1')
    })

    it('getClientId handles x-forwarded-for header', async () => {
      const { __testing } = await import('./allowlistSyncStatus')

      mockReq = {
        headers: {
          'x-forwarded-for': '10.0.0.1, 192.168.1.1',
        },
        ip: '127.0.0.1',
      }

      const clientId = __testing.getClientId(mockReq as Request, 'android')
      expect(clientId).toBe('android:10.0.0.1')
    })

    it('cleanupRateLimitStore removes expired entries', async () => {
      const { __testing } = await import('./allowlistSyncStatus')

      // Add an expired entry
      __testing.rateLimitStore.set('expired:test', {
        count: 1,
        resetAt: Date.now() - 1000, // Already expired
      })

      // Add a valid entry
      __testing.rateLimitStore.set('valid:test', {
        count: 1,
        resetAt: Date.now() + 60000, // Still valid
      })

      __testing.cleanupRateLimitStore()

      expect(__testing.rateLimitStore.has('expired:test')).toBe(false)
      expect(__testing.rateLimitStore.has('valid:test')).toBe(true)
    })
  })
})
