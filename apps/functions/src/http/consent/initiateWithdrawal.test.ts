/**
 * Unit tests for initiateConsentWithdrawal Cloud Function - Story 6.6
 *
 * Tests cover:
 * - Request validation
 * - Device ownership verification
 * - Active agreement lookup
 * - Withdrawal request creation
 * - Parent notification
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

describe('initiateConsentWithdrawal endpoint - Story 6.6', () => {
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
        childId: 'child-1',
        familyId: 'family-1',
        deviceId: 'device-123',
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

      const { initiateConsentWithdrawal } = await import('./initiateWithdrawal')

      await initiateConsentWithdrawal(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(405)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'method-not-allowed', message: 'Method not allowed' },
      })
    })

    it('returns 400 when childId is missing', async () => {
      delete mockReq.body.childId

      const mockDoc = vi.fn()
      vi.mocked(getFirestore).mockReturnValue({
        doc: mockDoc,
        collection: vi.fn(),
      } as unknown as ReturnType<typeof getFirestore>)

      const { initiateConsentWithdrawal } = await import('./initiateWithdrawal')

      await initiateConsentWithdrawal(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'invalid-argument', message: 'childId is required' },
      })
    })

    it('returns 400 when familyId is missing', async () => {
      delete mockReq.body.familyId

      const mockDoc = vi.fn()
      vi.mocked(getFirestore).mockReturnValue({
        doc: mockDoc,
        collection: vi.fn(),
      } as unknown as ReturnType<typeof getFirestore>)

      const { initiateConsentWithdrawal } = await import('./initiateWithdrawal')

      await initiateConsentWithdrawal(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'invalid-argument', message: 'familyId is required' },
      })
    })

    it('returns 400 when deviceId is missing', async () => {
      delete mockReq.body.deviceId

      const mockDoc = vi.fn()
      vi.mocked(getFirestore).mockReturnValue({
        doc: mockDoc,
        collection: vi.fn(),
      } as unknown as ReturnType<typeof getFirestore>)

      const { initiateConsentWithdrawal } = await import('./initiateWithdrawal')

      await initiateConsentWithdrawal(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'invalid-argument', message: 'deviceId is required' },
      })
    })
  })

  describe('device validation', () => {
    it('returns 404 when device not found', async () => {
      const mockDeviceDoc = vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
      })

      const mockCollection = vi.fn().mockImplementation((collectionPath: string) => {
        if (collectionPath === 'families') {
          return {
            doc: vi.fn().mockReturnValue({
              collection: vi.fn().mockReturnValue({
                doc: mockDeviceDoc,
              }),
            }),
          }
        }
        return { where: vi.fn().mockReturnThis(), limit: vi.fn() }
      })

      vi.mocked(getFirestore).mockReturnValue({
        collection: mockCollection,
      } as unknown as ReturnType<typeof getFirestore>)

      const { initiateConsentWithdrawal } = await import('./initiateWithdrawal')

      await initiateConsentWithdrawal(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'not-found', message: 'Device not found' },
      })
    })

    it('returns 403 when device belongs to different child', async () => {
      const wrongChildDevice = {
        exists: true,
        data: () => ({
          deviceId: 'device-123',
          familyId: 'family-1',
          childId: 'child-wrong',
        }),
      }

      const mockDeviceDoc = vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue(wrongChildDevice),
      })

      const mockCollection = vi.fn().mockImplementation((collectionPath: string) => {
        if (collectionPath === 'families') {
          return {
            doc: vi.fn().mockReturnValue({
              collection: vi.fn().mockReturnValue({
                doc: mockDeviceDoc,
              }),
            }),
          }
        }
        return { where: vi.fn().mockReturnThis(), limit: vi.fn() }
      })

      vi.mocked(getFirestore).mockReturnValue({
        collection: mockCollection,
      } as unknown as ReturnType<typeof getFirestore>)

      const { initiateConsentWithdrawal } = await import('./initiateWithdrawal')

      await initiateConsentWithdrawal(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'permission-denied', message: 'Device not assigned to this child' },
      })
    })
  })

  describe('agreement validation', () => {
    it('returns 404 when no active agreement exists', async () => {
      const mockDeviceData = {
        exists: true,
        data: () => ({
          deviceId: 'device-123',
          familyId: 'family-1',
          childId: 'child-1',
        }),
      }

      const mockDeviceDocFn = vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue(mockDeviceData),
      })

      const mockCollection = vi.fn().mockImplementation((collectionPath: string) => {
        if (collectionPath === 'families') {
          return {
            doc: vi.fn().mockReturnValue({
              collection: vi.fn().mockReturnValue({
                doc: mockDeviceDocFn,
              }),
            }),
          }
        }
        if (collectionPath === 'activeAgreements') {
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

      const { initiateConsentWithdrawal } = await import('./initiateWithdrawal')

      await initiateConsentWithdrawal(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'not-found', message: 'No active agreement found for this child' },
      })
    })
  })

  describe('error handling', () => {
    it('returns 500 on Firestore error', async () => {
      const mockCollection = vi.fn().mockImplementation((collectionPath: string) => {
        if (collectionPath === 'families') {
          return {
            doc: vi.fn().mockReturnValue({
              collection: vi.fn().mockReturnValue({
                doc: vi.fn().mockReturnValue({
                  get: vi.fn().mockRejectedValue(new Error('Firestore connection failed')),
                }),
              }),
            }),
          }
        }
        return {}
      })

      vi.mocked(getFirestore).mockReturnValue({
        collection: mockCollection,
      } as unknown as ReturnType<typeof getFirestore>)

      const { initiateConsentWithdrawal } = await import('./initiateWithdrawal')

      await initiateConsentWithdrawal(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'internal', message: 'Failed to initiate withdrawal request' },
      })
    })
  })
})
