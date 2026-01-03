/**
 * Tests for requestLocationOptIn Cloud Function.
 *
 * Story 40.1: Location-Based Rule Opt-In
 * - AC1: Explicit Dual-Guardian Opt-In
 *
 * Tests cover:
 * - Authentication validation
 * - Permission validation (only guardians can request)
 * - Family existence validation
 * - Pending request creation
 * - Duplicate request prevention
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @fledgely/shared
vi.mock('@fledgely/shared', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { z } = require('zod')
  return {
    requestLocationOptInInputSchema: z.object({
      familyId: z.string().min(1),
    }),
    LOCATION_OPT_IN_EXPIRY_MS: 72 * 60 * 60 * 1000,
  }
})

// Mock firebase-admin/firestore
const mockBatchSet = vi.fn()
const mockBatchCommit = vi.fn()
const mockDocGet = vi.fn()
const mockCollection = vi.fn()
const mockWhere = vi.fn()
const mockGetDocs = vi.fn()

vi.mock('firebase-admin/firestore', () => {
  return {
    getFirestore: () => ({
      collection: (...args: unknown[]) => mockCollection(...args),
      batch: () => ({
        set: mockBatchSet,
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
import { requestLocationOptIn } from './requestLocationOptIn'

describe('requestLocationOptIn', () => {
  const mockFamilyWithGuardians = {
    exists: true,
    data: () => ({
      id: 'family-456',
      name: 'Test Family',
      guardianUids: ['guardian-1', 'guardian-2'],
      childIds: ['child-1'],
      locationFeaturesEnabled: false,
    }),
  }

  const mockFamilyDoc = {
    get: mockDocGet,
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        id: 'request-789',
      }),
      where: mockWhere,
    }),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default successful mocks
    mockDocGet.mockResolvedValue(mockFamilyWithGuardians)
    mockWhere.mockReturnValue({ get: mockGetDocs })
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

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

  describe('Authentication (Step 1)', () => {
    it('throws unauthenticated error when no auth provided', async () => {
      await expect(
        requestLocationOptIn({
          auth: null,
          data: {
            familyId: 'family-456',
          },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Authentication required')
    })
  })

  describe('Validation (Step 2)', () => {
    it('throws invalid-argument error for missing familyId', async () => {
      await expect(
        requestLocationOptIn({
          auth: { uid: 'guardian-1', token: {} as never },
          data: {} as never,
          rawRequest: {} as never,
        })
      ).rejects.toThrow()
    })

    it('throws invalid-argument error for empty familyId', async () => {
      await expect(
        requestLocationOptIn({
          auth: { uid: 'guardian-1', token: {} as never },
          data: { familyId: '' },
          rawRequest: {} as never,
        })
      ).rejects.toThrow()
    })
  })

  describe('Permission (Step 3)', () => {
    it('throws not-found error when family does not exist', async () => {
      mockDocGet.mockResolvedValue({ exists: false })

      await expect(
        requestLocationOptIn({
          auth: { uid: 'guardian-1', token: {} as never },
          data: { familyId: 'family-456' },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Family not found')
    })

    it('throws permission-denied error when caller is not guardian', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardianUids: ['other-guardian'],
          locationFeaturesEnabled: false,
        }),
      })

      await expect(
        requestLocationOptIn({
          auth: { uid: 'guardian-1', token: {} as never },
          data: { familyId: 'family-456' },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Only family guardians can request location opt-in')
    })
  })

  describe('Business Logic (Step 4)', () => {
    it('throws already-exists error when location already enabled', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardianUids: ['guardian-1', 'guardian-2'],
          locationFeaturesEnabled: true,
        }),
      })

      await expect(
        requestLocationOptIn({
          auth: { uid: 'guardian-1', token: {} as never },
          data: { familyId: 'family-456' },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Location features are already enabled')
    })

    it('throws already-exists error when pending request exists', async () => {
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'existing-request', data: () => ({ status: 'pending' }) }],
      })

      await expect(
        requestLocationOptIn({
          auth: { uid: 'guardian-1', token: {} as never },
          data: { familyId: 'family-456' },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('A pending location opt-in request already exists')
    })

    it('creates opt-in request successfully', async () => {
      const result = await requestLocationOptIn({
        auth: { uid: 'guardian-1', token: {} as never },
        data: { familyId: 'family-456' },
        rawRequest: {} as never,
      })

      expect(result.success).toBe(true)
      expect(result.requestId).toBeDefined()
    })

    it('creates request with correct fields', async () => {
      await requestLocationOptIn({
        auth: { uid: 'guardian-1', token: {} as never },
        data: { familyId: 'family-456' },
        rawRequest: {} as never,
      })

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          familyId: 'family-456',
          requestedByUid: 'guardian-1',
          status: 'pending',
          approvedByUid: null,
        })
      )
    })

    it('sets expiry to 72 hours from creation', async () => {
      const beforeCall = Date.now()

      await requestLocationOptIn({
        auth: { uid: 'guardian-1', token: {} as never },
        data: { familyId: 'family-456' },
        rawRequest: {} as never,
      })

      const afterCall = Date.now()

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          expiresAt: expect.any(Date),
        })
      )

      // Verify expiry is approximately 72 hours from now
      const setCall = mockBatchSet.mock.calls[0]
      const expiresAt = setCall[1].expiresAt.getTime()
      const expectedExpiry = 72 * 60 * 60 * 1000

      expect(expiresAt).toBeGreaterThanOrEqual(beforeCall + expectedExpiry - 1000)
      expect(expiresAt).toBeLessThanOrEqual(afterCall + expectedExpiry + 1000)
    })

    it('returns success with request ID', async () => {
      const result = await requestLocationOptIn({
        auth: { uid: 'guardian-1', token: {} as never },
        data: { familyId: 'family-456' },
        rawRequest: {} as never,
      })

      expect(result.success).toBe(true)
      expect(result.requestId).toBe('request-789')
      expect(result.message).toContain('Pending approval')
    })
  })

  describe('Batch Commit', () => {
    it('commits request in a single batch', async () => {
      await requestLocationOptIn({
        auth: { uid: 'guardian-1', token: {} as never },
        data: { familyId: 'family-456' },
        rawRequest: {} as never,
      })

      expect(mockBatchCommit).toHaveBeenCalledTimes(1)
      expect(mockBatchSet).toHaveBeenCalledTimes(1)
    })
  })
})
