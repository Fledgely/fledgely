/**
 * Tests for approveLocationOptIn Cloud Function.
 *
 * Story 40.1: Location-Based Rule Opt-In
 * - AC1: Explicit Dual-Guardian Opt-In
 *
 * Tests cover:
 * - Authentication validation
 * - Permission validation (only guardians can approve)
 * - Request existence and status validation
 * - Different guardian validation (can't approve own request)
 * - Location features enabling
 * - Child notification creation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @fledgely/shared
vi.mock('@fledgely/shared', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { z } = require('zod')
  return {
    approveLocationOptInInputSchema: z.object({
      familyId: z.string().min(1),
      requestId: z.string().min(1),
    }),
  }
})

// Mock firebase-admin/firestore
const mockBatchSet = vi.fn()
const mockBatchUpdate = vi.fn()
const mockBatchCommit = vi.fn()
const mockFamilyDocGet = vi.fn()
const mockRequestDocGet = vi.fn()
const mockCollection = vi.fn()

vi.mock('firebase-admin/firestore', () => {
  return {
    getFirestore: () => ({
      collection: (...args: unknown[]) => mockCollection(...args),
      batch: () => ({
        set: mockBatchSet,
        update: mockBatchUpdate,
        commit: mockBatchCommit,
      }),
    }),
    FieldValue: {
      serverTimestamp: () => 'SERVER_TIMESTAMP',
    },
  }
})

// Mock firebase-functions
vi.mock('firebase-functions/v2/https', () => ({
  onCall: (handler: unknown) => handler,
  HttpsError: class HttpsError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
      this.name = 'HttpsError'
    }
  },
}))

// Mock auth verification
vi.mock('../shared/auth', () => ({
  verifyAuth: vi.fn((auth) => {
    if (!auth || !auth.uid) {
      const error = new Error('Authentication required')
      ;(error as unknown as { code: string }).code = 'unauthenticated'
      throw error
    }
    return { uid: auth.uid, email: auth.email || 'guardian@example.com' }
  }),
}))

// Import after mocks
import { approveLocationOptIn } from './approveLocationOptIn'

describe('approveLocationOptIn', () => {
  const mockFamily = {
    exists: true,
    data: () => ({
      id: 'family-456',
      name: 'Test Family',
      guardianUids: ['guardian-1', 'guardian-2'],
      childIds: ['child-1', 'child-2'],
      locationFeaturesEnabled: false,
    }),
  }

  const mockPendingRequest = {
    exists: true,
    data: () => ({
      id: 'request-789',
      familyId: 'family-456',
      requestedByUid: 'guardian-1',
      status: 'pending',
      approvedByUid: null,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      resolvedAt: null,
    }),
  }

  const mockFamilyDoc = {
    get: mockFamilyDocGet,
    collection: vi.fn().mockImplementation((subPath: string) => {
      if (subPath === 'locationOptInRequests') {
        return {
          doc: vi.fn().mockReturnValue({
            get: mockRequestDocGet,
            id: 'request-789',
          }),
        }
      }
      if (subPath === 'childNotifications') {
        return {
          doc: vi.fn().mockReturnValue({
            id: 'notification-123',
          }),
        }
      }
      return { doc: vi.fn() }
    }),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockFamilyDocGet.mockResolvedValue(mockFamily)
    mockRequestDocGet.mockResolvedValue(mockPendingRequest)

    mockCollection.mockImplementation((path: string) => {
      if (path === 'families') {
        return {
          doc: vi.fn().mockReturnValue(mockFamilyDoc),
        }
      }
      return { doc: vi.fn() }
    })

    mockBatchCommit.mockResolvedValue(undefined)
  })

  describe('Authentication', () => {
    it('throws unauthenticated error when no auth provided', async () => {
      await expect(
        approveLocationOptIn({
          auth: null,
          data: {
            familyId: 'family-456',
            requestId: 'request-789',
          },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Authentication required')
    })
  })

  describe('Validation', () => {
    it('throws invalid-argument error for missing familyId', async () => {
      await expect(
        approveLocationOptIn({
          auth: { uid: 'guardian-2', token: {} as never },
          data: { requestId: 'request-789' } as never,
          rawRequest: {} as never,
        })
      ).rejects.toThrow()
    })

    it('throws invalid-argument error for missing requestId', async () => {
      await expect(
        approveLocationOptIn({
          auth: { uid: 'guardian-2', token: {} as never },
          data: { familyId: 'family-456' } as never,
          rawRequest: {} as never,
        })
      ).rejects.toThrow()
    })
  })

  describe('Permission', () => {
    it('throws not-found error when family does not exist', async () => {
      mockFamilyDocGet.mockResolvedValue({ exists: false })

      await expect(
        approveLocationOptIn({
          auth: { uid: 'guardian-2', token: {} as never },
          data: { familyId: 'family-456', requestId: 'request-789' },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Family not found')
    })

    it('throws permission-denied error when caller is not guardian', async () => {
      mockFamilyDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardianUids: ['other-guardian'],
          locationFeaturesEnabled: false,
        }),
      })

      await expect(
        approveLocationOptIn({
          auth: { uid: 'guardian-2', token: {} as never },
          data: { familyId: 'family-456', requestId: 'request-789' },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Only family guardians can approve')
    })

    it('throws permission-denied error when approving own request', async () => {
      // guardian-1 is the requester, trying to approve their own request
      await expect(
        approveLocationOptIn({
          auth: { uid: 'guardian-1', token: {} as never },
          data: { familyId: 'family-456', requestId: 'request-789' },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Cannot approve your own request')
    })
  })

  describe('Request Validation', () => {
    it('throws not-found error when request does not exist', async () => {
      mockRequestDocGet.mockResolvedValue({ exists: false })

      await expect(
        approveLocationOptIn({
          auth: { uid: 'guardian-2', token: {} as never },
          data: { familyId: 'family-456', requestId: 'request-789' },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Opt-in request not found')
    })

    it('throws failed-precondition error when request is not pending', async () => {
      mockRequestDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          ...mockPendingRequest.data(),
          status: 'approved',
        }),
      })

      await expect(
        approveLocationOptIn({
          auth: { uid: 'guardian-2', token: {} as never },
          data: { familyId: 'family-456', requestId: 'request-789' },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Request is not pending')
    })

    it('throws failed-precondition error when request is expired', async () => {
      mockRequestDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          ...mockPendingRequest.data(),
          expiresAt: new Date(Date.now() - 1000), // Expired
        }),
      })

      await expect(
        approveLocationOptIn({
          auth: { uid: 'guardian-2', token: {} as never },
          data: { familyId: 'family-456', requestId: 'request-789' },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Request has expired')
    })
  })

  describe('Business Logic', () => {
    it('enables location features on family document', async () => {
      await approveLocationOptIn({
        auth: { uid: 'guardian-2', token: {} as never },
        data: { familyId: 'family-456', requestId: 'request-789' },
        rawRequest: {} as never,
      })

      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          locationFeaturesEnabled: true,
          locationEnabledByUids: expect.arrayContaining(['guardian-1', 'guardian-2']),
        })
      )
    })

    it('updates request status to approved', async () => {
      await approveLocationOptIn({
        auth: { uid: 'guardian-2', token: {} as never },
        data: { familyId: 'family-456', requestId: 'request-789' },
        rawRequest: {} as never,
      })

      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'approved',
          approvedByUid: 'guardian-2',
        })
      )
    })

    it('creates child notification (AC3)', async () => {
      await approveLocationOptIn({
        auth: { uid: 'guardian-2', token: {} as never },
        data: { familyId: 'family-456', requestId: 'request-789' },
        rawRequest: {} as never,
      })

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'location_features_enabled',
          childUids: ['child-1', 'child-2'],
        })
      )
    })

    it('returns success response', async () => {
      const result = await approveLocationOptIn({
        auth: { uid: 'guardian-2', token: {} as never },
        data: { familyId: 'family-456', requestId: 'request-789' },
        rawRequest: {} as never,
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('enabled')
    })
  })

  describe('Batch Commit', () => {
    it('commits all changes in a single batch', async () => {
      await approveLocationOptIn({
        auth: { uid: 'guardian-2', token: {} as never },
        data: { familyId: 'family-456', requestId: 'request-789' },
        rawRequest: {} as never,
      })

      expect(mockBatchCommit).toHaveBeenCalledTimes(1)
      expect(mockBatchUpdate).toHaveBeenCalledTimes(2) // Family + Request
      expect(mockBatchSet).toHaveBeenCalledTimes(1) // Notification
    })
  })
})
