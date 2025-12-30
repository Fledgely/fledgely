/**
 * Unit tests for checkConsentStatus Cloud Function - Story 6.5
 *
 * Tests cover:
 * - Active agreement detection
 * - Device validation
 * - Query parameter handling
 * - Response format validation
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

describe('checkConsentStatus endpoint - Story 6.5', () => {
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
    // Reset module cache to get fresh import
    vi.resetModules()

    mockReq = {
      method: 'GET',
      query: {
        familyId: 'family-1',
        childId: 'child-1',
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
    it('returns 405 for non-GET requests', async () => {
      mockReq.method = 'POST'

      const mockDoc = vi.fn()
      vi.mocked(getFirestore).mockReturnValue({
        doc: mockDoc,
        collection: vi.fn(),
      } as unknown as ReturnType<typeof getFirestore>)

      const { checkConsentStatus } = await import('./checkStatus')

      await checkConsentStatus(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(405)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'method-not-allowed', message: 'Method not allowed' },
      })
    })

    it('returns 400 when familyId is missing', async () => {
      delete mockReq.query.familyId

      const mockDoc = vi.fn()
      vi.mocked(getFirestore).mockReturnValue({
        doc: mockDoc,
        collection: vi.fn(),
      } as unknown as ReturnType<typeof getFirestore>)

      const { checkConsentStatus } = await import('./checkStatus')

      await checkConsentStatus(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'invalid-argument', message: 'familyId is required' },
      })
    })

    it('returns 400 when childId is missing', async () => {
      delete mockReq.query.childId

      const mockDoc = vi.fn()
      vi.mocked(getFirestore).mockReturnValue({
        doc: mockDoc,
        collection: vi.fn(),
      } as unknown as ReturnType<typeof getFirestore>)

      const { checkConsentStatus } = await import('./checkStatus')

      await checkConsentStatus(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'invalid-argument', message: 'childId is required' },
      })
    })

    it('returns 400 when deviceId is missing', async () => {
      delete mockReq.query.deviceId

      const mockDoc = vi.fn()
      vi.mocked(getFirestore).mockReturnValue({
        doc: mockDoc,
        collection: vi.fn(),
      } as unknown as ReturnType<typeof getFirestore>)

      const { checkConsentStatus } = await import('./checkStatus')

      await checkConsentStatus(mockReq as unknown as Request, mockRes as unknown as Response)

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

      const { checkConsentStatus } = await import('./checkStatus')

      await checkConsentStatus(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'not-found', message: 'Device not found' },
      })
    })

    it('returns 200 with hasConsent=false when device childId does not match', async () => {
      const wrongChildDevice = {
        exists: true,
        data: () => ({
          deviceId: 'device-123',
          familyId: 'family-1',
          childId: 'child-wrong', // Different child
          status: 'active',
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

      const { checkConsentStatus } = await import('./checkStatus')

      await checkConsentStatus(mockReq as unknown as Request, mockRes as unknown as Response)

      // Device exists but not assigned to this child - returns 200 with no consent
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        result: expect.objectContaining({
          hasConsent: false,
          consentStatus: 'pending',
        }),
      })
    })
  })

  describe('active agreement detection', () => {
    it('returns hasConsent=true when active agreement exists', async () => {
      const mockDeviceData = {
        exists: true,
        data: () => ({
          deviceId: 'device-123',
          familyId: 'family-1',
          childId: 'child-1',
          status: 'active',
        }),
      }

      const mockAgreementDoc = {
        id: 'agreement-123',
        data: () => ({
          childId: 'child-1',
          familyId: 'family-1',
          status: 'active',
          version: 'v1.0',
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
                empty: false,
                docs: [mockAgreementDoc],
              }),
            }),
          }
        }
        return {}
      })

      vi.mocked(getFirestore).mockReturnValue({
        collection: mockCollection,
      } as unknown as ReturnType<typeof getFirestore>)

      const { checkConsentStatus } = await import('./checkStatus')

      await checkConsentStatus(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        result: expect.objectContaining({
          hasConsent: true,
          consentStatus: 'granted',
          agreementId: 'agreement-123',
          agreementVersion: 'v1.0',
        }),
      })
    })

    it('returns hasConsent=false when no active agreement', async () => {
      const mockDeviceData = {
        exists: true,
        data: () => ({
          deviceId: 'device-123',
          familyId: 'family-1',
          childId: 'child-1',
          status: 'active',
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

      const { checkConsentStatus } = await import('./checkStatus')

      await checkConsentStatus(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        result: expect.objectContaining({
          hasConsent: false,
          consentStatus: 'pending',
          agreementId: null,
          agreementVersion: null,
        }),
      })
    })
  })

  describe('response format', () => {
    it('includes all required fields in success response', async () => {
      const mockDeviceData = {
        exists: true,
        data: () => ({
          deviceId: 'device-123',
          familyId: 'family-1',
          childId: 'child-1',
        }),
      }

      const mockAgreementDoc = {
        id: 'agreement-123',
        data: () => ({
          version: 'v1.0',
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
                empty: false,
                docs: [mockAgreementDoc],
              }),
            }),
          }
        }
        return {}
      })

      vi.mocked(getFirestore).mockReturnValue({
        collection: mockCollection,
      } as unknown as ReturnType<typeof getFirestore>)

      const { checkConsentStatus } = await import('./checkStatus')

      await checkConsentStatus(mockReq as unknown as Request, mockRes as unknown as Response)

      const response = mockRes.json.mock.calls[0][0]

      expect(response.result).toHaveProperty('hasConsent')
      expect(response.result).toHaveProperty('agreementId')
      expect(response.result).toHaveProperty('agreementVersion')
      expect(response.result).toHaveProperty('consentStatus')
      expect(response.result).toHaveProperty('message')
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

      const { checkConsentStatus } = await import('./checkStatus')

      await checkConsentStatus(mockReq as unknown as Request, mockRes as unknown as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { code: 'internal', message: 'Failed to check consent status' },
      })
    })
  })
})
