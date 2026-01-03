/**
 * Tests for Activate Safe Escape Cloud Function - Story 40.3
 *
 * Acceptance Criteria:
 * - AC1: Instant activation, no confirmation
 * - AC2: Silent operation - no notifications for 72 hours
 * - AC3: Location history cleared for activating user
 * - AC6: Children have same protections as adults
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase Admin
const mockSet = vi.fn().mockResolvedValue(undefined)
const _mockDelete = vi.fn()
const mockBatchCommit = vi.fn().mockResolvedValue(undefined)
const mockBatchDelete = vi.fn()
const mockGet = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockWhere = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
    batch: () => ({
      delete: mockBatchDelete,
      commit: mockBatchCommit,
    }),
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

import { activateSafeEscape } from './activateSafeEscape'

describe('activateSafeEscape', () => {
  const mockFamily = {
    exists: true,
    data: () => ({
      guardians: [{ id: 'guardian-1' }, { id: 'guardian-2' }],
      children: [{ id: 'child-1' }, { id: 'child-2' }],
    }),
  }

  const mockLocationHistory = {
    empty: false,
    docs: [{ ref: { id: 'loc-1' } }, { ref: { id: 'loc-2' } }],
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock chain
    mockDoc.mockReturnValue({
      get: mockGet,
      set: mockSet,
      collection: mockCollection,
    })

    mockCollection.mockImplementation((name: string) => {
      if (name === 'families') {
        return { doc: mockDoc }
      }
      if (name === 'safeEscapeActivations') {
        return {
          doc: () => ({
            id: 'activation-123',
            set: mockSet,
          }),
        }
      }
      if (name === 'locationHistory') {
        return {
          where: mockWhere,
        }
      }
      if (name === 'settings') {
        return {
          doc: () => ({ set: mockSet }),
        }
      }
      if (name === 'sealedAuditEntries') {
        return {
          doc: () => ({ set: mockSet }),
        }
      }
      return { doc: mockDoc }
    })

    mockWhere.mockReturnValue({
      get: () => Promise.resolve(mockLocationHistory),
    })

    mockGet.mockResolvedValue(mockFamily)
  })

  describe('Authentication (Step 1)', () => {
    it('throws unauthenticated error when no auth provided', async () => {
      const request = {
        auth: null,
        data: { familyId: 'family-123' },
      }

      await expect(activateSafeEscape(request as any)).rejects.toThrow('Must be signed in')
    })
  })

  describe('Validation (Step 2)', () => {
    it('throws invalid-argument error for missing familyId', async () => {
      const request = {
        auth: { uid: 'guardian-1' },
        data: {},
      }

      await expect(activateSafeEscape(request as any)).rejects.toThrow('Invalid input')
    })

    it('throws invalid-argument error for empty familyId', async () => {
      const request = {
        auth: { uid: 'guardian-1' },
        data: { familyId: '' },
      }

      await expect(activateSafeEscape(request as any)).rejects.toThrow('Invalid input')
    })
  })

  describe('Permission (Step 3)', () => {
    it('allows guardian to activate', async () => {
      const request = {
        auth: { uid: 'guardian-1' },
        data: { familyId: 'family-123' },
      }

      const result = await activateSafeEscape(request as any)
      expect(result.success).toBe(true)
    })

    it('allows child to activate (AC6)', async () => {
      const request = {
        auth: { uid: 'child-1' },
        data: { familyId: 'family-123' },
      }

      const result = await activateSafeEscape(request as any)
      expect(result.success).toBe(true)
    })

    it('throws permission-denied for non-family member', async () => {
      const request = {
        auth: { uid: 'stranger-1' },
        data: { familyId: 'family-123' },
      }

      await expect(activateSafeEscape(request as any)).rejects.toThrow(
        'Only family members can activate Safe Escape'
      )
    })

    it('throws not-found when family does not exist', async () => {
      mockGet.mockResolvedValue({ exists: false })

      const request = {
        auth: { uid: 'guardian-1' },
        data: { familyId: 'nonexistent-family' },
      }

      await expect(activateSafeEscape(request as any)).rejects.toThrow('Family not found')
    })
  })

  describe('Instant Activation (AC1)', () => {
    it('activates immediately without confirmation', async () => {
      const request = {
        auth: { uid: 'guardian-1' },
        data: { familyId: 'family-123' },
      }

      const result = await activateSafeEscape(request as any)

      expect(result.success).toBe(true)
      expect(result.activationId).toBe('activation-123')
      expect(result.message).toContain('Safe Escape activated')
    })

    it('disables location features immediately', async () => {
      const request = {
        auth: { uid: 'guardian-1' },
        data: { familyId: 'family-123' },
      }

      await activateSafeEscape(request as any)

      // Verify location settings were disabled
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          locationFeaturesEnabled: false,
          disabledReason: 'safe_escape',
        }),
        { merge: true }
      )
    })
  })

  describe('Silent Operation (AC2)', () => {
    it('does not send immediate notifications', async () => {
      const request = {
        auth: { uid: 'guardian-1' },
        data: { familyId: 'family-123' },
      }

      const result = await activateSafeEscape(request as any)

      // No notification calls should be made
      // The notificationScheduledAt should be 72 hours in the future
      expect(result.notificationScheduledAt).toBeDefined()
      const scheduledTime = new Date(result.notificationScheduledAt)
      const now = new Date()
      const hoursDiff = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60)
      expect(hoursDiff).toBeGreaterThan(71) // At least 71 hours from now
      expect(hoursDiff).toBeLessThan(73) // Less than 73 hours
    })

    it('creates activation record with null notificationSentAt', async () => {
      const request = {
        auth: { uid: 'guardian-1' },
        data: { familyId: 'family-123' },
      }

      await activateSafeEscape(request as any)

      // Verify activation record has null notificationSentAt
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationSentAt: null,
        })
      )
    })
  })

  describe('Location History Clearing (AC3)', () => {
    it('clears location history for activating user', async () => {
      // Setup mock to return location history
      mockWhere.mockReturnValue({
        get: () =>
          Promise.resolve({
            empty: false,
            docs: [{ ref: { id: 'loc-1' } }, { ref: { id: 'loc-2' } }, { ref: { id: 'loc-3' } }],
          }),
      })

      const request = {
        auth: { uid: 'child-1' },
        data: { familyId: 'family-123' },
      }

      await activateSafeEscape(request as any)

      // Verify location history query was for the activating user
      expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'child-1')
    })

    it('handles empty location history gracefully', async () => {
      mockWhere.mockReturnValue({
        get: () => Promise.resolve({ empty: true, docs: [] }),
      })

      const request = {
        auth: { uid: 'guardian-1' },
        data: { familyId: 'family-123' },
      }

      const result = await activateSafeEscape(request as any)
      expect(result.success).toBe(true)
    })
  })

  describe('Activation Record', () => {
    it('creates activation record with correct fields', async () => {
      const request = {
        auth: { uid: 'child-1' },
        data: { familyId: 'family-123' },
      }

      await activateSafeEscape(request as any)

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'activation-123',
          familyId: 'family-123',
          activatedBy: 'child-1',
          reenabledAt: null,
          reenabledBy: null,
        })
      )
    })
  })

  describe('Sealed Audit Entry', () => {
    it('creates sealed audit entry for privacy', async () => {
      const request = {
        auth: { uid: 'child-1' },
        data: { familyId: 'family-123' },
      }

      await activateSafeEscape(request as any)

      // Verify sealed entry was created
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          familyId: 'family-123',
          sealReason: 'escape_action',
          legalHold: true,
        })
      )
    })
  })

  describe('Child Protection (AC6)', () => {
    it('gives children same instant activation as adults', async () => {
      const childRequest = {
        auth: { uid: 'child-1' },
        data: { familyId: 'family-123' },
      }

      const result = await activateSafeEscape(childRequest as any)
      expect(result.success).toBe(true)
      expect(result.activationId).toBeDefined()
    })

    it('clears child location history on activation', async () => {
      const request = {
        auth: { uid: 'child-2' },
        data: { familyId: 'family-123' },
      }

      await activateSafeEscape(request as any)

      expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'child-2')
    })
  })
})
