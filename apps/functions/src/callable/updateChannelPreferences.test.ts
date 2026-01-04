/**
 * Tests for updateChannelPreferences and getChannelPreferences callables.
 *
 * Story 41.6: Notification Delivery Channels - AC4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock verifyAuth
const mockVerifyAuth = vi.fn()

vi.mock('../shared/auth', () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}))

// Mock Firebase
const mockGet = vi.fn()
const mockSet = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
}))

// Mock logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

// Mock firebase-functions/v2/https
vi.mock('firebase-functions/v2/https', () => ({
  onCall: vi.fn((handler) => handler),
  HttpsError: class HttpsError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  },
}))

import {
  updateChannelPreferences,
  getChannelPreferences,
  _resetDbForTesting,
} from './updateChannelPreferences'

describe('updateChannelPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()

    // Default: authenticated user
    mockVerifyAuth.mockReturnValue({ uid: 'user-123' })

    // Default: no preferences stored
    mockGet.mockResolvedValue({ exists: false })
    mockSet.mockResolvedValue(undefined)

    // Setup Firestore mock chain
    mockDoc.mockImplementation(() => ({
      get: mockGet,
      set: mockSet,
      collection: mockCollection,
    }))

    mockCollection.mockImplementation(() => ({
      doc: mockDoc,
    }))
  })

  afterEach(() => {
    _resetDbForTesting()
  })

  describe('updateChannelPreferences', () => {
    it('requires authentication', async () => {
      mockVerifyAuth.mockImplementation(() => {
        throw new Error('Unauthenticated')
      })

      await expect(
        updateChannelPreferences({
          data: {},
          auth: null,
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Unauthenticated')
    })

    it('updates channel preferences', async () => {
      const result = await updateChannelPreferences({
        data: {
          criticalFlags: { push: false, email: true, sms: true },
        },
        auth: { uid: 'user-123' } as never,
        rawRequest: {} as never,
      })

      expect(result.success).toBe(true)
      expect(result.preferences.criticalFlags).toEqual({
        push: false,
        email: true,
        sms: true,
      })

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          criticalFlags: { push: false, email: true, sms: true },
        })
      )
    })

    it('always keeps loginAlerts locked', async () => {
      const result = await updateChannelPreferences({
        data: {
          criticalFlags: { push: true, email: true, sms: false },
        },
        auth: { uid: 'user-123' } as never,
        rawRequest: {} as never,
      })

      expect(result.preferences.loginAlerts).toEqual({
        push: true,
        email: true,
        sms: false,
      })

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          loginAlerts: { push: true, email: true, sms: false },
        })
      )
    })

    it('merges with existing preferences', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          criticalFlags: { push: true, email: false, sms: false },
          timeLimitWarnings: { push: false, email: true },
        }),
      })

      const result = await updateChannelPreferences({
        data: {
          criticalFlags: { push: false, email: true, sms: true },
        },
        auth: { uid: 'user-123' } as never,
        rawRequest: {} as never,
      })

      expect(result.preferences.criticalFlags).toEqual({
        push: false,
        email: true,
        sms: true,
      })
      // timeLimitWarnings preserved
      expect(result.preferences.timeLimitWarnings).toEqual({
        push: false,
        email: true,
      })
    })

    it('rejects invalid input format', async () => {
      await expect(
        updateChannelPreferences({
          data: {
            criticalFlags: { push: 'not-a-boolean' },
          } as never,
          auth: { uid: 'user-123' } as never,
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Invalid channel preferences format')
    })

    it('handles Firestore errors', async () => {
      mockSet.mockRejectedValue(new Error('Firestore error'))

      await expect(
        updateChannelPreferences({
          data: {
            criticalFlags: { push: true, email: true, sms: false },
          },
          auth: { uid: 'user-123' } as never,
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Failed to update notification preferences')
    })
  })

  describe('getChannelPreferences', () => {
    it('requires authentication', async () => {
      mockVerifyAuth.mockImplementation(() => {
        throw new Error('Unauthenticated')
      })

      await expect(
        getChannelPreferences({
          data: undefined,
          auth: null,
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Unauthenticated')
    })

    it('returns defaults when no preferences exist', async () => {
      mockGet.mockResolvedValue({ exists: false })

      const result = await getChannelPreferences({
        data: undefined,
        auth: { uid: 'user-123' } as never,
        rawRequest: {} as never,
      })

      expect(result.success).toBe(true)
      expect(result.preferences.criticalFlags).toEqual({
        push: true,
        email: true,
        sms: false,
      })
      expect(result.preferences.loginAlerts).toEqual({
        push: true,
        email: true,
        sms: false,
      })
    })

    it('returns stored preferences', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          criticalFlags: { push: false, email: true, sms: true },
          deviceSyncAlerts: { push: false, email: true },
        }),
      })

      const result = await getChannelPreferences({
        data: undefined,
        auth: { uid: 'user-123' } as never,
        rawRequest: {} as never,
      })

      expect(result.success).toBe(true)
      expect(result.preferences.criticalFlags).toEqual({
        push: false,
        email: true,
        sms: true,
      })
    })

    it('always normalizes loginAlerts', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          loginAlerts: { push: false, email: false, sms: true },
        }),
      })

      const result = await getChannelPreferences({
        data: undefined,
        auth: { uid: 'user-123' } as never,
        rawRequest: {} as never,
      })

      // loginAlerts should always be locked
      expect(result.preferences.loginAlerts).toEqual({
        push: true,
        email: true,
        sms: false,
      })
    })

    it('handles Firestore errors', async () => {
      mockGet.mockRejectedValue(new Error('Firestore error'))

      await expect(
        getChannelPreferences({
          data: undefined,
          auth: { uid: 'user-123' } as never,
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Failed to retrieve notification preferences')
    })
  })
})
