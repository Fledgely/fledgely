/**
 * Tests for disableLocationFeatures Cloud Function.
 *
 * Story 40.1: Location-Based Rule Opt-In
 * - AC5: Instant Disable by Any Guardian (single guardian can disable)
 * - AC6: Fleeing Mode Integration (72-hour notification suppression)
 *
 * Tests cover:
 * - Authentication validation
 * - Permission validation (only guardians can disable)
 * - Already disabled state handling
 * - Normal disable (with notification)
 * - Fleeing mode disable (without notification for 72 hours)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @fledgely/shared
vi.mock('@fledgely/shared', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { z } = require('zod')
  return {
    disableLocationFeaturesInputSchema: z.object({
      familyId: z.string().min(1),
      isFleeingMode: z.boolean().default(false),
    }),
  }
})

// Mock firebase-admin/firestore
const mockBatchSet = vi.fn()
const mockBatchUpdate = vi.fn()
const mockBatchCommit = vi.fn()
const mockFamilyDocGet = vi.fn()
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
import { disableLocationFeatures } from './disableLocationFeatures'

describe('disableLocationFeatures', () => {
  const mockFamilyEnabled = {
    exists: true,
    data: () => ({
      id: 'family-456',
      name: 'Test Family',
      guardianUids: ['guardian-1', 'guardian-2'],
      childIds: ['child-1', 'child-2'],
      locationFeaturesEnabled: true,
      locationEnabledAt: new Date(),
      locationEnabledByUids: ['guardian-1', 'guardian-2'],
    }),
  }

  const mockFamilyDoc = {
    get: mockFamilyDocGet,
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        id: 'notification-123',
      }),
    }),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockFamilyDocGet.mockResolvedValue(mockFamilyEnabled)

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
        disableLocationFeatures({
          auth: null,
          data: { familyId: 'family-456' },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Authentication required')
    })
  })

  describe('Validation', () => {
    it('throws invalid-argument error for missing familyId', async () => {
      await expect(
        disableLocationFeatures({
          auth: { uid: 'guardian-1', token: {} as never },
          data: {} as never,
          rawRequest: {} as never,
        })
      ).rejects.toThrow()
    })
  })

  describe('Permission', () => {
    it('throws not-found error when family does not exist', async () => {
      mockFamilyDocGet.mockResolvedValue({ exists: false })

      await expect(
        disableLocationFeatures({
          auth: { uid: 'guardian-1', token: {} as never },
          data: { familyId: 'family-456' },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Family not found')
    })

    it('throws permission-denied error when caller is not guardian', async () => {
      mockFamilyDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardianUids: ['other-guardian'],
          locationFeaturesEnabled: true,
        }),
      })

      await expect(
        disableLocationFeatures({
          auth: { uid: 'guardian-1', token: {} as never },
          data: { familyId: 'family-456' },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Only family guardians can disable')
    })
  })

  describe('Business Logic - Normal Disable (AC5)', () => {
    it('throws failed-precondition when location already disabled', async () => {
      mockFamilyDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardianUids: ['guardian-1', 'guardian-2'],
          locationFeaturesEnabled: false,
        }),
      })

      await expect(
        disableLocationFeatures({
          auth: { uid: 'guardian-1', token: {} as never },
          data: { familyId: 'family-456' },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Location features are not enabled')
    })

    it('disables location features on family document', async () => {
      await disableLocationFeatures({
        auth: { uid: 'guardian-1', token: {} as never },
        data: { familyId: 'family-456', isFleeingMode: false },
        rawRequest: {} as never,
      })

      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          locationFeaturesEnabled: false,
          locationDisabledByUid: 'guardian-1',
        })
      )
    })

    it('creates child notification when not fleeing mode', async () => {
      await disableLocationFeatures({
        auth: { uid: 'guardian-1', token: {} as never },
        data: { familyId: 'family-456', isFleeingMode: false },
        rawRequest: {} as never,
      })

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'location_features_disabled',
          childUids: ['child-1', 'child-2'],
        })
      )
    })

    it('returns success response', async () => {
      const result = await disableLocationFeatures({
        auth: { uid: 'guardian-1', token: {} as never },
        data: { familyId: 'family-456', isFleeingMode: false },
        rawRequest: {} as never,
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('disabled')
    })
  })

  describe('Business Logic - Fleeing Mode (AC6)', () => {
    it('disables without creating notification in fleeing mode', async () => {
      await disableLocationFeatures({
        auth: { uid: 'guardian-1', token: {} as never },
        data: { familyId: 'family-456', isFleeingMode: true },
        rawRequest: {} as never,
      })

      // Family should be updated
      expect(mockBatchUpdate).toHaveBeenCalled()
      // But NO notification should be created
      expect(mockBatchSet).not.toHaveBeenCalled()
    })

    it('records fleeing mode activation in family document', async () => {
      await disableLocationFeatures({
        auth: { uid: 'guardian-1', token: {} as never },
        data: { familyId: 'family-456', isFleeingMode: true },
        rawRequest: {} as never,
      })

      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          locationFeaturesEnabled: false,
          fleeingModeActivatedAt: expect.any(Date),
          fleeingModeActivatedByUid: 'guardian-1',
        })
      )
    })

    it('returns success without notification ID in fleeing mode', async () => {
      const result = await disableLocationFeatures({
        auth: { uid: 'guardian-1', token: {} as never },
        data: { familyId: 'family-456', isFleeingMode: true },
        rawRequest: {} as never,
      })

      expect(result.success).toBe(true)
      expect(result.notificationId).toBeNull()
    })
  })
})
