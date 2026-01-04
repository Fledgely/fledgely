/**
 * Tests for track login session callable.
 *
 * Story 41.5: New Login Notifications - AC1, AC4, AC6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trackLoginSessionCallable } from './trackLoginSession'
import { Request as CallableRequest } from 'firebase-functions/v2/https'
import type { AuthData } from 'firebase-functions/v2/tasks'

// Mock firebase-admin/firestore
const mockDocGet = vi.fn()
const mockDocSet = vi.fn()
const mockCollectionGet = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: () => ({
      doc: () => ({
        collection: () => ({
          doc: () => ({
            get: mockDocGet,
            set: mockDocSet,
          }),
          get: mockCollectionGet,
        }),
        get: mockDocGet,
        set: mockDocSet,
      }),
    }),
  }),
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
}))

// Mock loginSessionTracker
const mockTrackSession = vi.fn()
vi.mock('../lib/sessions/loginSessionTracker', () => ({
  trackLoginSession: (...args: unknown[]) => mockTrackSession(...args),
  _resetDbForTesting: vi.fn(),
}))

// Mock loginNotification
const mockSendNewLoginNotification = vi.fn()
vi.mock('../lib/notifications/loginNotification', () => ({
  sendNewLoginNotification: (...args: unknown[]) => mockSendNewLoginNotification(...args),
  _resetDbForTesting: vi.fn(),
}))

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

describe('trackLoginSessionCallable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDocGet.mockReset()
    mockDocSet.mockReset()
    mockCollectionGet.mockReset()
    mockTrackSession.mockReset()
    mockSendNewLoginNotification.mockReset()
  })

  const validInput = {
    familyId: 'family-123',
    userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
    ipAddress: '192.168.1.1',
    approximateLocation: 'San Francisco, CA',
  }

  const createRequest = (auth: AuthData | undefined, data: unknown): CallableRequest<unknown> => ({
    auth,
    data,
    rawRequest: {} as never,
    acceptsStreaming: false,
  })

  it('rejects unauthenticated requests', async () => {
    const request = createRequest(undefined, validInput)

    await expect(trackLoginSessionCallable.run(request)).rejects.toThrow('Must be logged in')
  })

  it('rejects invalid input', async () => {
    const request = createRequest(
      { uid: 'user-123', token: {} as never },
      { familyId: 'family-123' } // Missing required fields
    )

    await expect(trackLoginSessionCallable.run(request)).rejects.toThrow('Invalid input')
  })

  it('rejects request from non-family-member', async () => {
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        guardianUids: ['other-user'],
        parentIds: [],
      }),
    })

    const request = createRequest({ uid: 'user-123', token: {} as never }, validInput)

    await expect(trackLoginSessionCallable.run(request)).rejects.toThrow(
      'Not a member of this family'
    )
  })

  it('rejects request when family not found', async () => {
    mockDocGet.mockResolvedValueOnce({ exists: false })

    const request = createRequest({ uid: 'user-123', token: {} as never }, validInput)

    await expect(trackLoginSessionCallable.run(request)).rejects.toThrow('Family not found')
  })

  it('tracks session for valid request (AC1, AC6)', async () => {
    // Family exists with caller as guardian
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        guardianUids: ['user-123'],
        parentIds: [],
      }),
    })
    // User document
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        displayName: 'John Doe',
      }),
    })
    // Track session result
    mockTrackSession.mockResolvedValue({
      sessionId: 'session-456',
      isNewDevice: true,
      isTrusted: false,
      fingerprintId: 'fp-789',
      fingerprint: {
        id: 'fp-789',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'Windows 10',
        approximateLocation: 'San Francisco, CA',
        createdAt: Date.now(),
      },
    })
    // Notification result
    mockSendNewLoginNotification.mockResolvedValue({
      notificationGenerated: true,
      guardiansNotified: ['user-123'],
      guardiansSkipped: [],
      sessionId: 'session-456',
    })

    const request = createRequest({ uid: 'user-123', token: {} as never }, validInput)

    const result = await trackLoginSessionCallable.run(request)

    expect(result.success).toBe(true)
    expect(result.sessionId).toBe('session-456')
    expect(result.isNewDevice).toBe(true)
    expect(result.notificationSent).toBe(true)
    expect(mockTrackSession).toHaveBeenCalledWith({
      userId: 'user-123',
      familyId: 'family-123',
      userAgent: validInput.userAgent,
      ipAddress: validInput.ipAddress,
      approximateLocation: validInput.approximateLocation,
    })
  })

  it('skips notification for trusted devices', async () => {
    // Family exists with caller as guardian
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        guardianUids: ['user-123'],
        parentIds: [],
      }),
    })
    // User document
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        displayName: 'John Doe',
      }),
    })
    // Track session result - trusted device
    mockTrackSession.mockResolvedValue({
      sessionId: 'session-456',
      isNewDevice: false,
      isTrusted: true,
      fingerprintId: 'fp-789',
      fingerprint: {
        id: 'fp-789',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'Windows 10',
        approximateLocation: 'San Francisco, CA',
        createdAt: Date.now(),
      },
    })

    const request = createRequest({ uid: 'user-123', token: {} as never }, validInput)

    const result = await trackLoginSessionCallable.run(request)

    expect(result.success).toBe(true)
    expect(result.isTrusted).toBe(true)
    expect(result.notificationSent).toBe(false)
    expect(mockSendNewLoginNotification).not.toHaveBeenCalled()
  })

  it('handles notification failure gracefully', async () => {
    // Family exists with caller as guardian
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        guardianUids: ['user-123'],
        parentIds: [],
      }),
    })
    // User document
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        displayName: 'John Doe',
      }),
    })
    // Track session result
    mockTrackSession.mockResolvedValue({
      sessionId: 'session-456',
      isNewDevice: true,
      isTrusted: false,
      fingerprintId: 'fp-789',
      fingerprint: {
        id: 'fp-789',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'Windows 10',
        approximateLocation: 'San Francisco, CA',
        createdAt: Date.now(),
      },
    })
    // Notification fails
    mockSendNewLoginNotification.mockRejectedValue(new Error('FCM error'))

    const request = createRequest({ uid: 'user-123', token: {} as never }, validInput)

    // Should not throw, notification failure is non-blocking
    const result = await trackLoginSessionCallable.run(request)

    expect(result.success).toBe(true)
    expect(result.sessionId).toBe('session-456')
    expect(result.notificationSent).toBe(false)
  })

  it('allows access via parentIds array', async () => {
    // Family exists with caller as parent
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        guardianUids: [],
        parentIds: ['user-123'],
      }),
    })
    // User document
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        displayName: 'John Doe',
      }),
    })
    // Track session result
    mockTrackSession.mockResolvedValue({
      sessionId: 'session-456',
      isNewDevice: false,
      isTrusted: true,
      fingerprintId: 'fp-789',
      fingerprint: {
        id: 'fp-789',
        deviceType: 'mobile',
        browser: 'Safari',
        os: 'iOS',
        approximateLocation: null,
        createdAt: Date.now(),
      },
    })

    const request = createRequest({ uid: 'user-123', token: {} as never }, validInput)

    const result = await trackLoginSessionCallable.run(request)

    expect(result.success).toBe(true)
    expect(mockTrackSession).toHaveBeenCalled()
  })

  it('returns fingerprint info in response', async () => {
    // Family exists with caller as guardian
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        guardianUids: ['user-123'],
        parentIds: [],
      }),
    })
    // User document
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        displayName: 'John Doe',
      }),
    })
    // Track session result
    mockTrackSession.mockResolvedValue({
      sessionId: 'session-456',
      isNewDevice: true,
      isTrusted: false,
      fingerprintId: 'fp-789',
      fingerprint: {
        id: 'fp-789',
        deviceType: 'tablet',
        browser: 'Firefox',
        os: 'Android',
        approximateLocation: 'New York, NY',
        createdAt: Date.now(),
      },
    })
    mockSendNewLoginNotification.mockResolvedValue({
      notificationGenerated: true,
      guardiansNotified: ['user-123'],
      guardiansSkipped: [],
      sessionId: 'session-456',
    })

    const request = createRequest({ uid: 'user-123', token: {} as never }, validInput)

    const result = await trackLoginSessionCallable.run(request)

    expect(result.fingerprint).toEqual({
      id: 'fp-789',
      deviceType: 'tablet',
      browser: 'Firefox',
      os: 'Android',
    })
  })
})
