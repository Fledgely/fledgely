/**
 * Tests for login session tracking service.
 *
 * Story 41.5: New Login Notifications - AC1, AC2, AC6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  trackLoginSession,
  getTrustedDevices,
  markDeviceAsTrusted,
  removeTrustedDevice,
  getUserSessions,
  getSession,
  revokeSession,
  updateSessionLastSeen,
  _resetDbForTesting,
} from './loginSessionTracker'

// Mock firebase-admin/firestore
const mockDocGet = vi.fn()
const mockDocSet = vi.fn()
const mockDocUpdate = vi.fn()
const mockDocDelete = vi.fn()
const mockCollectionGet = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: () => ({
      doc: () => ({
        collection: () => ({
          doc: () => ({
            get: mockDocGet,
            set: mockDocSet,
            update: mockDocUpdate,
            delete: mockDocDelete,
          }),
          get: mockCollectionGet,
          orderBy: () => ({
            limit: () => ({
              get: mockCollectionGet,
            }),
          }),
        }),
        get: mockDocGet,
        set: mockDocSet,
        update: mockDocUpdate,
        delete: mockDocDelete,
      }),
    }),
  }),
}))

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

describe('loginSessionTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
    mockDocGet.mockReset()
    mockDocSet.mockReset()
    mockDocUpdate.mockReset()
    mockDocDelete.mockReset()
    mockCollectionGet.mockReset()
    mockDocSet.mockResolvedValue(undefined)
    mockDocUpdate.mockResolvedValue(undefined)
    mockDocDelete.mockResolvedValue(undefined)
  })

  describe('trackLoginSession', () => {
    const baseParams = {
      userId: 'user-123',
      familyId: 'family-456',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      ipAddress: '192.168.1.1',
      approximateLocation: 'San Francisco, CA',
    }

    it('creates new fingerprint and session for new device (AC1, AC6)', async () => {
      // Fingerprint doesn't exist
      mockDocGet.mockResolvedValueOnce({ exists: false })
      // Trusted device check - not trusted
      mockDocGet.mockResolvedValueOnce({ exists: false })

      const result = await trackLoginSession(baseParams)

      expect(result.isNewDevice).toBe(true)
      expect(result.isTrusted).toBe(false)
      expect(result.sessionId).toMatch(/^session-/)
      expect(result.fingerprintId).toBeTruthy()
      expect(result.fingerprint.browser).toBe('Chrome')
      expect(result.fingerprint.os).toBe('Windows 10')
      expect(result.fingerprint.deviceType).toBe('desktop')
      expect(mockDocSet).toHaveBeenCalled()
    })

    it('reuses existing fingerprint for known device', async () => {
      const existingFingerprint = {
        id: 'fp-existing',
        userAgent: baseParams.userAgent,
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'Windows 10',
        approximateLocation: 'San Francisco, CA',
        createdAt: Date.now() - 86400000,
      }

      // Fingerprint exists
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => existingFingerprint,
      })
      // Trusted device check - not trusted
      mockDocGet.mockResolvedValueOnce({ exists: false })

      const result = await trackLoginSession(baseParams)

      expect(result.isNewDevice).toBe(false)
      expect(result.fingerprintId).toBe('fp-existing')
    })

    it('marks session as trusted when device is trusted (AC2)', async () => {
      const existingFingerprint = {
        id: 'fp-trusted',
        userAgent: baseParams.userAgent,
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'Windows 10',
        approximateLocation: null,
        createdAt: Date.now() - 86400000,
      }

      // Fingerprint exists
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => existingFingerprint,
      })
      // Trusted device check - IS trusted
      mockDocGet.mockResolvedValueOnce({ exists: true })

      const result = await trackLoginSession(baseParams)

      expect(result.isTrusted).toBe(true)
      expect(result.isNewDevice).toBe(false)
    })

    it('handles mobile device fingerprint', async () => {
      const mobileParams = {
        ...baseParams,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1',
      }

      mockDocGet.mockResolvedValueOnce({ exists: false })
      mockDocGet.mockResolvedValueOnce({ exists: false })

      const result = await trackLoginSession(mobileParams)

      expect(result.fingerprint.deviceType).toBe('mobile')
      expect(result.fingerprint.os).toBe('iOS')
    })
  })

  describe('getTrustedDevices', () => {
    it('returns list of trusted devices', async () => {
      const trustedDevices = [
        {
          id: 'fp-1',
          userId: 'user-123',
          fingerprintId: 'fp-1',
          deviceName: 'My MacBook',
          createdAt: Date.now(),
        },
        {
          id: 'fp-2',
          userId: 'user-123',
          fingerprintId: 'fp-2',
          deviceName: 'Work PC',
          createdAt: Date.now(),
        },
      ]

      mockCollectionGet.mockResolvedValue({
        docs: trustedDevices.map((d) => ({
          id: d.id,
          data: () => d,
        })),
      })

      const result = await getTrustedDevices('user-123')

      expect(result).toHaveLength(2)
      expect(result[0].deviceName).toBe('My MacBook')
      expect(result[1].deviceName).toBe('Work PC')
    })

    it('returns empty array when no trusted devices', async () => {
      mockCollectionGet.mockResolvedValue({ docs: [] })

      const result = await getTrustedDevices('user-123')

      expect(result).toHaveLength(0)
    })
  })

  describe('markDeviceAsTrusted', () => {
    it('marks device as trusted (AC2)', async () => {
      const fingerprint = {
        id: 'fp-abc123',
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'Windows 10',
        approximateLocation: null,
        createdAt: Date.now(),
      }

      // Fingerprint exists
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => fingerprint,
      })

      const result = await markDeviceAsTrusted('user-123', 'fp-abc123', 'My Work PC')

      expect(result.id).toBe('fp-abc123')
      expect(result.deviceName).toBe('My Work PC')
      expect(result.userId).toBe('user-123')
      expect(mockDocSet).toHaveBeenCalled()
    })

    it('generates default device name when not provided', async () => {
      const fingerprint = {
        id: 'fp-abc123',
        userAgent: 'Mozilla/5.0 Safari/605.1.15',
        deviceType: 'desktop',
        browser: 'Safari',
        os: 'macOS',
        approximateLocation: null,
        createdAt: Date.now(),
      }

      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => fingerprint,
      })

      const result = await markDeviceAsTrusted('user-123', 'fp-abc123')

      expect(result.deviceName).toBe('Safari on macOS')
    })

    it('throws error when fingerprint not found', async () => {
      mockDocGet.mockResolvedValue({ exists: false })

      await expect(markDeviceAsTrusted('user-123', 'fp-nonexistent')).rejects.toThrow(
        'Fingerprint fp-nonexistent not found'
      )
    })
  })

  describe('removeTrustedDevice', () => {
    it('removes device from trusted list', async () => {
      await removeTrustedDevice('user-123', 'fp-abc123')

      expect(mockDocDelete).toHaveBeenCalled()
    })
  })

  describe('getUserSessions', () => {
    it('returns list of user sessions', async () => {
      const sessions = [
        {
          id: 'session-1',
          userId: 'user-123',
          familyId: 'family-456',
          fingerprintId: 'fp-1',
          isNewDevice: false,
          isTrusted: true,
          ipHash: 'hash1',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        },
      ]

      mockCollectionGet.mockResolvedValue({
        docs: sessions.map((s) => ({
          id: s.id,
          data: () => s,
        })),
      })

      const result = await getUserSessions('user-123')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('session-1')
    })
  })

  describe('getSession', () => {
    it('returns session when found', async () => {
      const session = {
        id: 'session-123',
        userId: 'user-123',
        familyId: 'family-456',
        fingerprintId: 'fp-1',
        isNewDevice: true,
        isTrusted: false,
        ipHash: 'hash1',
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
      }

      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => session,
      })

      const result = await getSession('user-123', 'session-123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('session-123')
    })

    it('returns null when session not found', async () => {
      mockDocGet.mockResolvedValue({ exists: false })

      const result = await getSession('user-123', 'session-nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('updateSessionLastSeen', () => {
    it('updates last seen timestamp', async () => {
      await updateSessionLastSeen('user-123', 'session-123')

      expect(mockDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ lastSeenAt: expect.any(Number) })
      )
    })
  })

  describe('revokeSession', () => {
    it('deletes session', async () => {
      await revokeSession('user-123', 'session-123')

      expect(mockDocDelete).toHaveBeenCalled()
    })
  })
})
