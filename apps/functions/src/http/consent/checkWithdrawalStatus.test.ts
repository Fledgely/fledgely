/**
 * Unit tests for checkWithdrawalStatus Cloud Function - Story 6.6
 *
 * Tests cover:
 * - Request validation
 * - Query parameter handling
 * - Pending withdrawal lookup
 * - Response format
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

describe('checkWithdrawalStatus endpoint - Story 6.6 AC5', () => {
  let mockReq: {
    method: string
    query: Record<string, string | undefined>
  }
  let mockRes: {
    status: ReturnType<typeof vi.fn>
    json: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    mockReq = {
      method: 'GET',
      query: {
        childId: 'child-1',
        familyId: 'family-1',
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
    it('returns 405 for non-GET requests', async () => {
      mockReq.method = 'POST'

      const mockDoc = vi.fn()
      vi.mocked(getFirestore).mockReturnValue({
        doc: mockDoc,
        collection: vi.fn(),
      } as unknown as ReturnType<typeof getFirestore>)

      const { checkWithdrawalStatus } = await import('./checkWithdrawalStatus')

      await checkWithdrawalStatus(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(405)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'method-not-allowed', message: 'Method not allowed' },
      })
    })

    it('returns 400 when childId is missing', async () => {
      delete mockReq.query.childId

      const mockDoc = vi.fn()
      vi.mocked(getFirestore).mockReturnValue({
        doc: mockDoc,
        collection: vi.fn(),
      } as unknown as ReturnType<typeof getFirestore>)

      const { checkWithdrawalStatus } = await import('./checkWithdrawalStatus')

      await checkWithdrawalStatus(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'invalid-argument', message: 'childId is required' },
      })
    })

    it('returns 400 when familyId is missing', async () => {
      delete mockReq.query.familyId

      const mockDoc = vi.fn()
      vi.mocked(getFirestore).mockReturnValue({
        doc: mockDoc,
        collection: vi.fn(),
      } as unknown as ReturnType<typeof getFirestore>)

      const { checkWithdrawalStatus } = await import('./checkWithdrawalStatus')

      await checkWithdrawalStatus(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'invalid-argument', message: 'familyId is required' },
      })
    })
  })

  describe('withdrawal lookup', () => {
    it('returns 404 when no pending withdrawal exists', async () => {
      const mockCollection = vi.fn().mockImplementation((collectionPath: string) => {
        if (collectionPath === 'withdrawalRequests') {
          return {
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                empty: true,
                docs: [],
              }),
            }),
          }
        }
        return {}
      })

      vi.mocked(getFirestore).mockReturnValue({
        collection: mockCollection,
      } as unknown as ReturnType<typeof getFirestore>)

      const { checkWithdrawalStatus } = await import('./checkWithdrawalStatus')

      await checkWithdrawalStatus(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'not-found', message: 'No pending withdrawal request found' },
      })
    })

    it('returns 200 with withdrawal data when pending exists', async () => {
      const now = Date.now()
      const expiresAt = now + 24 * 60 * 60 * 1000 // 24 hours from now

      const mockWithdrawalDoc = {
        id: 'withdrawal-123',
        data: () => ({
          childId: 'child-1',
          familyId: 'family-1',
          deviceId: 'device-123',
          status: 'pending',
          requestedAt: { toMillis: () => now },
          expiresAt: { toMillis: () => expiresAt },
        }),
      }

      const mockCollection = vi.fn().mockImplementation((collectionPath: string) => {
        if (collectionPath === 'withdrawalRequests') {
          return {
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                empty: false,
                docs: [mockWithdrawalDoc],
              }),
            }),
          }
        }
        return {}
      })

      vi.mocked(getFirestore).mockReturnValue({
        collection: mockCollection,
      } as unknown as ReturnType<typeof getFirestore>)

      const { checkWithdrawalStatus } = await import('./checkWithdrawalStatus')

      await checkWithdrawalStatus(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        result: expect.objectContaining({
          requestId: 'withdrawal-123',
          childId: 'child-1',
          familyId: 'family-1',
          deviceId: 'device-123',
          status: 'pending',
          requestedAt: now,
          expiresAt: expiresAt,
        }),
      })
    })
  })

  describe('response format', () => {
    it('includes all required fields in success response', async () => {
      const now = Date.now()
      const expiresAt = now + 24 * 60 * 60 * 1000

      const mockWithdrawalDoc = {
        id: 'withdrawal-123',
        data: () => ({
          childId: 'child-1',
          familyId: 'family-1',
          deviceId: 'device-123',
          status: 'pending',
          requestedAt: { toMillis: () => now },
          expiresAt: { toMillis: () => expiresAt },
        }),
      }

      const mockCollection = vi.fn().mockImplementation((collectionPath: string) => {
        if (collectionPath === 'withdrawalRequests') {
          return {
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                empty: false,
                docs: [mockWithdrawalDoc],
              }),
            }),
          }
        }
        return {}
      })

      vi.mocked(getFirestore).mockReturnValue({
        collection: mockCollection,
      } as unknown as ReturnType<typeof getFirestore>)

      const { checkWithdrawalStatus } = await import('./checkWithdrawalStatus')

      await checkWithdrawalStatus(mockReq as unknown as Request, mockRes as unknown as Response)

      const response = mockRes.json.mock.calls[0][0]

      expect(response.result).toHaveProperty('requestId')
      expect(response.result).toHaveProperty('childId')
      expect(response.result).toHaveProperty('familyId')
      expect(response.result).toHaveProperty('deviceId')
      expect(response.result).toHaveProperty('status')
      expect(response.result).toHaveProperty('requestedAt')
      expect(response.result).toHaveProperty('expiresAt')
    })
  })

  describe('error handling', () => {
    it('returns 500 on Firestore error', async () => {
      const mockCollection = vi.fn().mockImplementation((collectionPath: string) => {
        if (collectionPath === 'withdrawalRequests') {
          return {
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockRejectedValue(new Error('Firestore connection failed')),
            }),
          }
        }
        return {}
      })

      vi.mocked(getFirestore).mockReturnValue({
        collection: mockCollection,
      } as unknown as ReturnType<typeof getFirestore>)

      const { checkWithdrawalStatus } = await import('./checkWithdrawalStatus')

      await checkWithdrawalStatus(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'internal', message: 'Failed to check withdrawal status' },
      })
    })
  })
})
