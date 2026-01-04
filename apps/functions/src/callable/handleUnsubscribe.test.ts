/**
 * Tests for handleUnsubscribe callable.
 *
 * Story 41.6: Notification Delivery Channels - AC6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock validateUnsubscribeToken
const mockValidateToken = vi.fn()

vi.mock('../lib/email', () => ({
  validateUnsubscribeToken: (...args: unknown[]) => mockValidateToken(...args),
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

import { handleUnsubscribe, _resetDbForTesting } from './handleUnsubscribe'

describe('handleUnsubscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()

    // Default: no preferences stored
    mockGet.mockResolvedValue({ exists: false })
    mockSet.mockResolvedValue(undefined)

    // Setup Firestore mock chain - needs to handle nested collection/doc calls
    // Path: users/{userId}/settings/channelPreferences
    mockDoc.mockImplementation(() => ({
      get: mockGet,
      set: mockSet,
      collection: mockCollection,
    }))

    mockCollection.mockImplementation(() => ({
      doc: mockDoc,
    }))

    // Default: valid token
    mockValidateToken.mockReturnValue({
      userId: 'user-123',
      notificationType: 'criticalFlags',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    })
  })

  afterEach(() => {
    _resetDbForTesting()
  })

  it('returns error for missing token', async () => {
    await expect(
      handleUnsubscribe({ data: {}, auth: null, rawRequest: {} as never })
    ).rejects.toThrow('Invalid request: token is required')
  })

  it('returns error for empty token', async () => {
    await expect(
      handleUnsubscribe({ data: { token: '' }, auth: null, rawRequest: {} as never })
    ).rejects.toThrow('Invalid request: token is required')
  })

  it('returns failure for invalid token', async () => {
    mockValidateToken.mockReturnValue(null)

    const result = await handleUnsubscribe({
      data: { token: 'invalid-token' },
      auth: null,
      rawRequest: {} as never,
    })

    expect(result.success).toBe(false)
    expect(result.message).toContain('expired or is invalid')
  })

  it('prevents unsubscribing from security notifications', async () => {
    mockValidateToken.mockReturnValue({
      userId: 'user-123',
      notificationType: 'loginAlerts',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    })

    const result = await handleUnsubscribe({
      data: { token: 'valid-token' },
      auth: null,
      rawRequest: {} as never,
    })

    expect(result.success).toBe(false)
    expect(result.message).toContain('cannot be disabled')
    expect(result.notificationType).toBe('loginAlerts')
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('updates channel preferences for valid unsubscribe', async () => {
    const result = await handleUnsubscribe({
      data: { token: 'valid-token' },
      auth: null,
      rawRequest: {} as never,
    })

    expect(result.success).toBe(true)
    expect(result.message).toContain('unsubscribed')
    expect(result.notificationType).toBe('criticalFlags')

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        criticalFlags: expect.objectContaining({
          email: false,
        }),
      }),
      { merge: true }
    )
  })

  it('preserves other channel settings when unsubscribing', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        criticalFlags: { push: true, email: true, sms: true },
      }),
    })

    await handleUnsubscribe({
      data: { token: 'valid-token' },
      auth: null,
      rawRequest: {} as never,
    })

    expect(mockSet).toHaveBeenCalledWith(
      {
        criticalFlags: {
          push: true,
          email: false, // Only email changed
          sms: true,
        },
      },
      { merge: true }
    )
  })

  it('handles different notification types', async () => {
    mockValidateToken.mockReturnValue({
      userId: 'user-123',
      notificationType: 'flagDigest',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    })

    const result = await handleUnsubscribe({
      data: { token: 'valid-token' },
      auth: null,
      rawRequest: {} as never,
    })

    expect(result.success).toBe(true)
    expect(result.message).toContain('flag digest')
    expect(result.notificationType).toBe('flagDigest')
  })

  it('handles Firestore errors', async () => {
    mockSet.mockRejectedValue(new Error('Firestore error'))

    await expect(
      handleUnsubscribe({
        data: { token: 'valid-token' },
        auth: null,
        rawRequest: {} as never,
      })
    ).rejects.toThrow('Failed to update notification preferences')
  })

  it('uses default settings if no preferences exist', async () => {
    mockGet.mockResolvedValue({ exists: false })

    await handleUnsubscribe({
      data: { token: 'valid-token' },
      auth: null,
      rawRequest: {} as never,
    })

    expect(mockSet).toHaveBeenCalledWith(
      {
        criticalFlags: {
          push: true,
          email: false,
          sms: false,
        },
      },
      { merge: true }
    )
  })
})
