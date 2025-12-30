/**
 * Unit tests for cancelConsentWithdrawal Cloud Function - Story 6.6
 *
 * Tests cover:
 * - Request validation
 * - Authorization (child owns request)
 * - Status validation (must be pending)
 * - Cooling period validation
 * - Cancellation flow
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Firebase Admin modules
vi.mock('firebase-admin/app', () => ({
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(),
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    doc: vi.fn(),
    collection: vi.fn(),
  })),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
  Timestamp: {
    fromMillis: vi.fn((ms) => ({ toMillis: () => ms })),
  },
}))

vi.mock('firebase-functions/v2/https', () => ({
  onRequest: vi.fn((_options, handler) => handler),
}))

vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}))

import { getFirestore } from 'firebase-admin/firestore'

describe('cancelConsentWithdrawal endpoint - Story 6.6 AC6', () => {
  let mockReq: {
    method: string
    body: Record<string, string | undefined>
  }
  let mockRes: {
    status: ReturnType<typeof vi.fn>
    json: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    mockReq = {
      method: 'POST',
      body: {
        requestId: 'request-123',
        childId: 'child-1',
      },
    }

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('request validation', () => {
    it('returns 405 for non-POST requests', async () => {
      mockReq.method = 'GET'

      const mockDoc = vi.fn()
      vi.mocked(getFirestore).mockReturnValue({
        doc: mockDoc,
        collection: vi.fn(),
      } as unknown as ReturnType<typeof getFirestore>)

      const { cancelConsentWithdrawal } = await import('./cancelWithdrawal')

      await cancelConsentWithdrawal(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(405)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'method-not-allowed', message: 'Method not allowed' },
      })
    })

    it('returns 400 when requestId is missing', async () => {
      delete mockReq.body.requestId

      const mockDoc = vi.fn()
      vi.mocked(getFirestore).mockReturnValue({
        doc: mockDoc,
        collection: vi.fn(),
      } as unknown as ReturnType<typeof getFirestore>)

      const { cancelConsentWithdrawal } = await import('./cancelWithdrawal')

      await cancelConsentWithdrawal(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'invalid-argument', message: 'requestId is required' },
      })
    })

    it('returns 400 when childId is missing', async () => {
      delete mockReq.body.childId

      const mockDoc = vi.fn()
      vi.mocked(getFirestore).mockReturnValue({
        doc: mockDoc,
        collection: vi.fn(),
      } as unknown as ReturnType<typeof getFirestore>)

      const { cancelConsentWithdrawal } = await import('./cancelWithdrawal')

      await cancelConsentWithdrawal(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'invalid-argument', message: 'childId is required' },
      })
    })
  })

  describe('request lookup', () => {
    it('returns 404 when request not found', async () => {
      const mockWithdrawalRef = {
        get: vi.fn().mockResolvedValue({ exists: false }),
      }

      const mockCollection = vi.fn().mockImplementation((collectionPath: string) => {
        if (collectionPath === 'withdrawalRequests') {
          return {
            doc: vi.fn().mockReturnValue(mockWithdrawalRef),
          }
        }
        return {}
      })

      vi.mocked(getFirestore).mockReturnValue({
        collection: mockCollection,
      } as unknown as ReturnType<typeof getFirestore>)

      const { cancelConsentWithdrawal } = await import('./cancelWithdrawal')

      await cancelConsentWithdrawal(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'not-found', message: 'Withdrawal request not found' },
      })
    })
  })

  describe('authorization', () => {
    it('returns 403 when request belongs to different child', async () => {
      const mockWithdrawalData = {
        exists: true,
        data: () => ({
          childId: 'child-different',
          familyId: 'family-1',
          status: 'pending',
          expiresAt: { toMillis: () => Date.now() + 24 * 60 * 60 * 1000 },
        }),
      }

      const mockWithdrawalRef = {
        get: vi.fn().mockResolvedValue(mockWithdrawalData),
      }

      const mockCollection = vi.fn().mockImplementation((collectionPath: string) => {
        if (collectionPath === 'withdrawalRequests') {
          return {
            doc: vi.fn().mockReturnValue(mockWithdrawalRef),
          }
        }
        return {}
      })

      vi.mocked(getFirestore).mockReturnValue({
        collection: mockCollection,
      } as unknown as ReturnType<typeof getFirestore>)

      const { cancelConsentWithdrawal } = await import('./cancelWithdrawal')

      await cancelConsentWithdrawal(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'permission-denied', message: 'Not authorized to cancel this request' },
      })
    })
  })

  describe('status validation', () => {
    it('returns 409 when request is already cancelled', async () => {
      const mockWithdrawalData = {
        exists: true,
        data: () => ({
          childId: 'child-1',
          familyId: 'family-1',
          status: 'cancelled',
          expiresAt: { toMillis: () => Date.now() + 24 * 60 * 60 * 1000 },
        }),
      }

      const mockWithdrawalRef = {
        get: vi.fn().mockResolvedValue(mockWithdrawalData),
      }

      const mockCollection = vi.fn().mockImplementation((collectionPath: string) => {
        if (collectionPath === 'withdrawalRequests') {
          return {
            doc: vi.fn().mockReturnValue(mockWithdrawalRef),
          }
        }
        return {}
      })

      vi.mocked(getFirestore).mockReturnValue({
        collection: mockCollection,
      } as unknown as ReturnType<typeof getFirestore>)

      const { cancelConsentWithdrawal } = await import('./cancelWithdrawal')

      await cancelConsentWithdrawal(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(409)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'failed-precondition',
          message: 'Cannot cancel request with status: cancelled',
        },
      })
    })

    it('returns 409 when request is already executed', async () => {
      const mockWithdrawalData = {
        exists: true,
        data: () => ({
          childId: 'child-1',
          familyId: 'family-1',
          status: 'executed',
          expiresAt: { toMillis: () => Date.now() + 24 * 60 * 60 * 1000 },
        }),
      }

      const mockWithdrawalRef = {
        get: vi.fn().mockResolvedValue(mockWithdrawalData),
      }

      const mockCollection = vi.fn().mockImplementation((collectionPath: string) => {
        if (collectionPath === 'withdrawalRequests') {
          return {
            doc: vi.fn().mockReturnValue(mockWithdrawalRef),
          }
        }
        return {}
      })

      vi.mocked(getFirestore).mockReturnValue({
        collection: mockCollection,
      } as unknown as ReturnType<typeof getFirestore>)

      const { cancelConsentWithdrawal } = await import('./cancelWithdrawal')

      await cancelConsentWithdrawal(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(409)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'failed-precondition',
          message: 'Cannot cancel request with status: executed',
        },
      })
    })
  })

  describe('cooling period validation', () => {
    it('returns 409 when cooling period has expired', async () => {
      const mockWithdrawalData = {
        exists: true,
        data: () => ({
          childId: 'child-1',
          familyId: 'family-1',
          status: 'pending',
          expiresAt: { toMillis: () => Date.now() - 1000 }, // Expired 1 second ago
        }),
      }

      const mockWithdrawalRef = {
        get: vi.fn().mockResolvedValue(mockWithdrawalData),
      }

      const mockCollection = vi.fn().mockImplementation((collectionPath: string) => {
        if (collectionPath === 'withdrawalRequests') {
          return {
            doc: vi.fn().mockReturnValue(mockWithdrawalRef),
          }
        }
        return {}
      })

      vi.mocked(getFirestore).mockReturnValue({
        collection: mockCollection,
      } as unknown as ReturnType<typeof getFirestore>)

      const { cancelConsentWithdrawal } = await import('./cancelWithdrawal')

      await cancelConsentWithdrawal(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(409)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'failed-precondition',
          message: 'Cooling period has expired, cannot cancel',
        },
      })
    })
  })

  describe('successful cancellation', () => {
    it('returns 200 and updates status on successful cancellation', async () => {
      const mockWithdrawalData = {
        exists: true,
        data: () => ({
          childId: 'child-1',
          familyId: 'family-1',
          status: 'pending',
          expiresAt: { toMillis: () => Date.now() + 24 * 60 * 60 * 1000 },
        }),
      }

      const mockUpdate = vi.fn().mockResolvedValue({})

      const mockWithdrawalRef = {
        get: vi.fn().mockResolvedValue(mockWithdrawalData),
        update: mockUpdate,
      }

      const mockFamilyData = {
        exists: true,
        data: () => ({
          guardians: ['guardian-1', 'guardian-2'],
        }),
      }

      const mockFamilyRef = {
        get: vi.fn().mockResolvedValue(mockFamilyData),
      }

      const mockNotificationAdd = vi.fn().mockResolvedValue({})

      const mockCollection = vi.fn().mockImplementation((collectionPath: string) => {
        if (collectionPath === 'withdrawalRequests') {
          return {
            doc: vi.fn().mockReturnValue(mockWithdrawalRef),
          }
        }
        if (collectionPath === 'families') {
          return {
            doc: vi.fn().mockReturnValue(mockFamilyRef),
          }
        }
        if (collectionPath === 'notifications') {
          return {
            add: mockNotificationAdd,
          }
        }
        return {}
      })

      vi.mocked(getFirestore).mockReturnValue({
        collection: mockCollection,
      } as unknown as ReturnType<typeof getFirestore>)

      const { cancelConsentWithdrawal } = await import('./cancelWithdrawal')

      await cancelConsentWithdrawal(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        result: {
          success: true,
          message: 'Withdrawal request cancelled successfully',
        },
      })
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cancelled',
        })
      )
    })
  })

  describe('error handling', () => {
    it('returns 500 on Firestore error', async () => {
      const mockCollection = vi.fn().mockImplementation((collectionPath: string) => {
        if (collectionPath === 'withdrawalRequests') {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockRejectedValue(new Error('Firestore connection failed')),
            }),
          }
        }
        return {}
      })

      vi.mocked(getFirestore).mockReturnValue({
        collection: mockCollection,
      } as unknown as ReturnType<typeof getFirestore>)

      const { cancelConsentWithdrawal } = await import('./cancelWithdrawal')

      await cancelConsentWithdrawal(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'internal', message: 'Failed to cancel withdrawal request' },
      })
    })
  })
})
