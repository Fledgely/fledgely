/**
 * Tests for Re-enable Safe Escape Cloud Function - Story 40.3
 *
 * Acceptance Criteria:
 * - AC5: Only activator can re-enable
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase Admin
const mockSet = vi.fn().mockResolvedValue(undefined)
const mockUpdate = vi.fn().mockResolvedValue(undefined)
const mockGet = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
  }),
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
}))

vi.mock('firebase-functions/v2/https', () => ({
  onCall: (_config: unknown, handler: (...args: unknown[]) => unknown) => handler,
  HttpsError: class HttpsError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
      this.name = 'HttpsError'
    }
  },
}))

import { reenableSafeEscape } from './reenableSafeEscape'

describe('reenableSafeEscape', () => {
  const mockActivation = {
    exists: true,
    data: () => ({
      id: 'activation-123',
      familyId: 'family-123',
      activatedBy: 'guardian-1',
      activatedAt: new Date(),
      notificationSentAt: null,
      clearedLocationHistory: true,
      reenabledAt: null,
      reenabledBy: null,
    }),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock chain
    mockDoc.mockReturnValue({
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
    })

    mockCollection.mockImplementation((name: string) => {
      if (name === 'families') {
        return {
          doc: () => ({
            collection: mockCollection,
          }),
        }
      }
      if (name === 'safeEscapeActivations') {
        return {
          doc: () => ({
            get: mockGet,
            update: mockUpdate,
          }),
        }
      }
      if (name === 'settings') {
        return {
          doc: () => ({ set: mockSet }),
        }
      }
      return { doc: mockDoc }
    })

    mockGet.mockResolvedValue(mockActivation)
  })

  describe('Authentication (Step 1)', () => {
    it('throws unauthenticated error when no auth provided', async () => {
      const request = {
        auth: null,
        data: { familyId: 'family-123', activationId: 'activation-123' },
      }

      await expect(reenableSafeEscape(request as any)).rejects.toThrow('Must be signed in')
    })
  })

  describe('Validation (Step 2)', () => {
    it('throws invalid-argument error for missing familyId', async () => {
      const request = {
        auth: { uid: 'guardian-1' },
        data: { activationId: 'activation-123' },
      }

      await expect(reenableSafeEscape(request as any)).rejects.toThrow('Invalid input')
    })

    it('throws invalid-argument error for missing activationId', async () => {
      const request = {
        auth: { uid: 'guardian-1' },
        data: { familyId: 'family-123' },
      }

      await expect(reenableSafeEscape(request as any)).rejects.toThrow('Invalid input')
    })

    it('throws invalid-argument error for empty familyId', async () => {
      const request = {
        auth: { uid: 'guardian-1' },
        data: { familyId: '', activationId: 'activation-123' },
      }

      await expect(reenableSafeEscape(request as any)).rejects.toThrow('Invalid input')
    })

    it('throws invalid-argument error for empty activationId', async () => {
      const request = {
        auth: { uid: 'guardian-1' },
        data: { familyId: 'family-123', activationId: '' },
      }

      await expect(reenableSafeEscape(request as any)).rejects.toThrow('Invalid input')
    })
  })

  describe('Activation Not Found (Step 3)', () => {
    it('throws not-found when activation does not exist', async () => {
      mockGet.mockResolvedValue({ exists: false })

      const request = {
        auth: { uid: 'guardian-1' },
        data: { familyId: 'family-123', activationId: 'nonexistent' },
      }

      await expect(reenableSafeEscape(request as any)).rejects.toThrow(
        'Safe Escape activation not found'
      )
    })
  })

  describe('Only Activator Can Re-enable (AC5 - CRITICAL)', () => {
    it('allows original activator to re-enable', async () => {
      const request = {
        auth: { uid: 'guardian-1' },
        data: { familyId: 'family-123', activationId: 'activation-123' },
      }

      const result = await reenableSafeEscape(request as any)

      expect(result.success).toBe(true)
      expect(result.message).toContain('re-enabled')
    })

    it('rejects re-enable from different guardian', async () => {
      const request = {
        auth: { uid: 'guardian-2' },
        data: { familyId: 'family-123', activationId: 'activation-123' },
      }

      await expect(reenableSafeEscape(request as any)).rejects.toThrow(
        'Only the person who activated Safe Escape can re-enable location features'
      )
    })

    it('rejects re-enable from child who did not activate', async () => {
      // Activation was done by guardian-1
      const request = {
        auth: { uid: 'child-1' },
        data: { familyId: 'family-123', activationId: 'activation-123' },
      }

      await expect(reenableSafeEscape(request as any)).rejects.toThrow(
        'Only the person who activated Safe Escape can re-enable location features'
      )
    })

    it('allows child who activated to re-enable', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          ...mockActivation.data(),
          activatedBy: 'child-1',
        }),
      })

      const request = {
        auth: { uid: 'child-1' },
        data: { familyId: 'family-123', activationId: 'activation-123' },
      }

      const result = await reenableSafeEscape(request as any)

      expect(result.success).toBe(true)
    })

    it('rejects stranger from re-enabling', async () => {
      const request = {
        auth: { uid: 'stranger-1' },
        data: { familyId: 'family-123', activationId: 'activation-123' },
      }

      await expect(reenableSafeEscape(request as any)).rejects.toThrow(
        'Only the person who activated Safe Escape can re-enable location features'
      )
    })
  })

  describe('Already Re-enabled (Step 5)', () => {
    it('returns success if already re-enabled', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          ...mockActivation.data(),
          reenabledAt: new Date(),
          reenabledBy: 'guardian-1',
        }),
      })

      const request = {
        auth: { uid: 'guardian-1' },
        data: { familyId: 'family-123', activationId: 'activation-123' },
      }

      const result = await reenableSafeEscape(request as any)

      expect(result.success).toBe(true)
      expect(result.message).toContain('already re-enabled')
    })
  })

  describe('Re-enable Location Features (Step 6)', () => {
    it('sets locationFeaturesEnabled to true', async () => {
      const request = {
        auth: { uid: 'guardian-1' },
        data: { familyId: 'family-123', activationId: 'activation-123' },
      }

      await reenableSafeEscape(request as any)

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          locationFeaturesEnabled: true,
          disabledAt: null,
          disabledReason: null,
        }),
        { merge: true }
      )
    })
  })

  describe('Update Activation Record (Step 7)', () => {
    it('updates activation with reenabledAt and reenabledBy', async () => {
      const request = {
        auth: { uid: 'guardian-1' },
        data: { familyId: 'family-123', activationId: 'activation-123' },
      }

      await reenableSafeEscape(request as any)

      expect(mockUpdate).toHaveBeenCalledWith({
        reenabledAt: 'SERVER_TIMESTAMP',
        reenabledBy: 'guardian-1',
      })
    })
  })
})
