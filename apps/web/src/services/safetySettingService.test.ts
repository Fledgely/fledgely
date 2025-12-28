/**
 * Unit tests for Safety Setting Service.
 *
 * Story 3A.2: Safety Settings Two-Parent Approval
 * Story 3A.4: Safety Rule 48-Hour Cooling Period
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  proposeSafetySettingChange,
  approveSafetySettingChange,
  declineSafetySettingChange,
  getPendingSafetySettingChanges,
  reverseEmergencyIncrease,
  isEmergencySafetyIncrease,
  isProtectionReduction,
  cancelSafetySettingChange,
} from './safetySettingService'
import type { ProposeSafetySettingParams } from './safetySettingService'

// Mock Firebase Firestore
const mockAddDoc = vi.fn()
const mockGetDoc = vi.fn()
const mockGetDocs = vi.fn()
const mockUpdateDoc = vi.fn()
const mockCollection = vi.fn()
const mockDoc = vi.fn()
const mockQuery = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  Timestamp: {
    now: () => ({ seconds: 1234567890, nanoseconds: 0 }),
    fromDate: (date: Date) => ({ seconds: Math.floor(date.getTime() / 1000), toDate: () => date }),
  },
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: () => ({}),
}))

describe('safetySettingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAddDoc.mockResolvedValue({ id: 'change-123' })
    mockCollection.mockReturnValue('changes-collection-ref')
    mockDoc.mockReturnValue('change-doc-ref')
    mockQuery.mockReturnValue('query-ref')
    mockWhere.mockReturnValue('where-clause')
    mockOrderBy.mockReturnValue('order-clause')

    // Default: no recent declines (for cooldown checks)
    mockGetDocs.mockResolvedValue({ docs: [] })
  })

  describe('isEmergencySafetyIncrease', () => {
    it('returns true when monitoring_interval is decreased (more restrictive)', () => {
      expect(isEmergencySafetyIncrease('monitoring_interval', 60, 30)).toBe(true)
    })

    it('returns false when monitoring_interval is increased (less restrictive)', () => {
      expect(isEmergencySafetyIncrease('monitoring_interval', 30, 60)).toBe(false)
    })

    it('returns true when retention_period is decreased (more restrictive)', () => {
      expect(isEmergencySafetyIncrease('retention_period', 30, 7)).toBe(true)
    })

    it('returns false when retention_period is increased (less restrictive)', () => {
      expect(isEmergencySafetyIncrease('retention_period', 7, 30)).toBe(false)
    })

    it('returns true when time_limits is decreased (more restrictive)', () => {
      expect(isEmergencySafetyIncrease('time_limits', 120, 60)).toBe(true)
    })

    it('returns false when time_limits is increased (less restrictive)', () => {
      expect(isEmergencySafetyIncrease('time_limits', 60, 120)).toBe(false)
    })

    it('returns true when age_restrictions is increased (more restrictive)', () => {
      expect(isEmergencySafetyIncrease('age_restrictions', 13, 16)).toBe(true)
    })

    it('returns false when age_restrictions is decreased (less restrictive)', () => {
      expect(isEmergencySafetyIncrease('age_restrictions', 16, 13)).toBe(false)
    })

    it('handles non-numeric values by defaulting to 0', () => {
      expect(isEmergencySafetyIncrease('monitoring_interval', 'invalid', 30)).toBe(false)
      expect(isEmergencySafetyIncrease('monitoring_interval', 60, 'invalid')).toBe(true)
    })
  })

  describe('isProtectionReduction (Story 3A.4)', () => {
    it('returns true when monitoring_interval is increased (less restrictive)', () => {
      expect(isProtectionReduction('monitoring_interval', 30, 60)).toBe(true)
    })

    it('returns false when monitoring_interval is decreased (more restrictive)', () => {
      expect(isProtectionReduction('monitoring_interval', 60, 30)).toBe(false)
    })

    it('returns true when retention_period is increased (less restrictive)', () => {
      expect(isProtectionReduction('retention_period', 7, 30)).toBe(true)
    })

    it('returns false when retention_period is decreased (more restrictive)', () => {
      expect(isProtectionReduction('retention_period', 30, 7)).toBe(false)
    })

    it('returns true when time_limits is increased (less restrictive)', () => {
      expect(isProtectionReduction('time_limits', 60, 120)).toBe(true)
    })

    it('returns false when time_limits is decreased (more restrictive)', () => {
      expect(isProtectionReduction('time_limits', 120, 60)).toBe(false)
    })

    it('returns true when age_restrictions is decreased (less restrictive)', () => {
      expect(isProtectionReduction('age_restrictions', 16, 13)).toBe(true)
    })

    it('returns false when age_restrictions is increased (more restrictive)', () => {
      expect(isProtectionReduction('age_restrictions', 13, 16)).toBe(false)
    })

    it('is the inverse of isEmergencySafetyIncrease', () => {
      const testCases = [
        { type: 'monitoring_interval' as const, current: 60, proposed: 30 },
        { type: 'monitoring_interval' as const, current: 30, proposed: 60 },
        { type: 'time_limits' as const, current: 120, proposed: 60 },
        { type: 'time_limits' as const, current: 60, proposed: 120 },
      ]

      testCases.forEach(({ type, current, proposed }) => {
        expect(isProtectionReduction(type, current, proposed)).toBe(
          !isEmergencySafetyIncrease(type, current, proposed)
        )
      })
    })
  })

  describe('proposeSafetySettingChange', () => {
    const validParams: ProposeSafetySettingParams = {
      familyId: 'family-456',
      settingType: 'monitoring_interval',
      currentValue: 60,
      proposedValue: 30,
      proposedByUid: 'guardian-uid-1',
    }

    it('creates a pending proposal', async () => {
      const result = await proposeSafetySettingChange(validParams)

      expect(mockCollection).toHaveBeenCalledWith({}, 'safetySettingChanges')
      expect(mockAddDoc).toHaveBeenCalledWith(
        'changes-collection-ref',
        expect.objectContaining({
          familyId: 'family-456',
          settingType: 'monitoring_interval',
          currentValue: 60,
          proposedValue: 30,
          proposedByUid: 'guardian-uid-1',
          status: 'pending_approval',
          approverUid: null,
          declineReason: null,
        })
      )
      expect(result).toBe('change-123')
    })

    it('marks emergency increase correctly (more restrictive)', async () => {
      await proposeSafetySettingChange(validParams)

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isEmergencyIncrease: true,
          reviewExpiresAt: expect.anything(), // Should have review expiration
        })
      )
    })

    it('marks non-emergency correctly (less restrictive)', async () => {
      const lessRestrictiveParams = {
        ...validParams,
        currentValue: 30,
        proposedValue: 60,
      }

      await proposeSafetySettingChange(lessRestrictiveParams)

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isEmergencyIncrease: false,
          reviewExpiresAt: null,
        })
      )
    })

    it('throws error if familyId is empty', async () => {
      const params = { ...validParams, familyId: '' }
      await expect(proposeSafetySettingChange(params)).rejects.toThrow(
        'familyId is required for safety setting change'
      )
    })

    it('throws error if proposedByUid is empty', async () => {
      const params = { ...validParams, proposedByUid: '' }
      await expect(proposeSafetySettingChange(params)).rejects.toThrow(
        'proposedByUid is required for safety setting change'
      )
    })

    it('throws error for invalid settingType', async () => {
      const params = {
        ...validParams,
        settingType: 'invalid_type' as ProposeSafetySettingParams['settingType'],
      }
      await expect(proposeSafetySettingChange(params)).rejects.toThrow('Invalid settingType')
    })

    it('enforces 7-day cooldown after decline', async () => {
      // Mock a recent decline
      const recentDecline = {
        id: 'decline-123',
        data: () => ({
          familyId: 'family-456',
          settingType: 'monitoring_interval',
          proposedByUid: 'guardian-uid-1',
          status: 'declined',
          resolvedAt: { toDate: () => new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, // 3 days ago
          currentValue: 60,
          proposedValue: 30,
          approverUid: 'guardian-uid-2',
          declineReason: null,
          isEmergencyIncrease: true,
          reviewExpiresAt: null,
          createdAt: { toDate: () => new Date() },
          expiresAt: { toDate: () => new Date() },
        }),
      }

      mockGetDocs.mockResolvedValueOnce({
        docs: [recentDecline],
      })

      await expect(proposeSafetySettingChange(validParams)).rejects.toThrow(
        /Cannot re-propose this setting change/
      )
    })
  })

  describe('approveSafetySettingChange', () => {
    it('immediately approves an emergency increase (more restrictive)', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          proposedByUid: 'guardian-uid-1',
          status: 'pending_approval',
          settingType: 'monitoring_interval',
          currentValue: 60,
          proposedValue: 30, // More restrictive (shorter interval)
          expiresAt: { toDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
        }),
      })

      await approveSafetySettingChange({
        changeId: 'change-123',
        approverUid: 'guardian-uid-2', // Different from proposer
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'change-doc-ref',
        expect.objectContaining({
          status: 'approved',
          approverUid: 'guardian-uid-2',
        })
      )
    })

    it('enters cooling period for protection reduction (Story 3A.4)', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          proposedByUid: 'guardian-uid-1',
          status: 'pending_approval',
          settingType: 'monitoring_interval',
          currentValue: 30,
          proposedValue: 60, // Less restrictive (longer interval)
          expiresAt: { toDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
        }),
      })

      await approveSafetySettingChange({
        changeId: 'change-123',
        approverUid: 'guardian-uid-2',
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'change-doc-ref',
        expect.objectContaining({
          status: 'cooling_period',
          approverUid: 'guardian-uid-2',
          effectiveAt: expect.anything(), // Should have effectiveAt set
        })
      )
    })

    it('throws error if change not found', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      })

      await expect(
        approveSafetySettingChange({
          changeId: 'nonexistent',
          approverUid: 'guardian-uid-2',
        })
      ).rejects.toThrow('Safety setting change not found')
    })

    it('prevents self-approval', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          proposedByUid: 'guardian-uid-1',
          status: 'pending_approval',
        }),
      })

      await expect(
        approveSafetySettingChange({
          changeId: 'change-123',
          approverUid: 'guardian-uid-1', // Same as proposer
        })
      ).rejects.toThrow('Cannot approve your own proposed change')
    })

    it('throws error if already resolved', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          proposedByUid: 'guardian-uid-1',
          status: 'approved',
        }),
      })

      await expect(
        approveSafetySettingChange({
          changeId: 'change-123',
          approverUid: 'guardian-uid-2',
        })
      ).rejects.toThrow('Cannot approve change with status: approved')
    })

    it('throws error if expired', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          proposedByUid: 'guardian-uid-1',
          status: 'pending_approval',
          expiresAt: { toDate: () => new Date(Date.now() - 1000) }, // Already expired
        }),
      })

      await expect(
        approveSafetySettingChange({
          changeId: 'change-123',
          approverUid: 'guardian-uid-2',
        })
      ).rejects.toThrow('Cannot approve expired change')
    })

    it('throws error if changeId is empty', async () => {
      await expect(
        approveSafetySettingChange({
          changeId: '',
          approverUid: 'guardian-uid-2',
        })
      ).rejects.toThrow('changeId is required')
    })

    it('throws error if approverUid is empty', async () => {
      await expect(
        approveSafetySettingChange({
          changeId: 'change-123',
          approverUid: '',
        })
      ).rejects.toThrow('approverUid is required')
    })
  })

  describe('declineSafetySettingChange', () => {
    it('declines a pending change with reason', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          proposedByUid: 'guardian-uid-1',
          status: 'pending_approval',
        }),
      })

      await declineSafetySettingChange({
        changeId: 'change-123',
        declinerUid: 'guardian-uid-2',
        reason: 'Not appropriate at this time',
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'change-doc-ref',
        expect.objectContaining({
          status: 'declined',
          approverUid: 'guardian-uid-2',
          declineReason: 'Not appropriate at this time',
        })
      )
    })

    it('declines without reason', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          proposedByUid: 'guardian-uid-1',
          status: 'pending_approval',
        }),
      })

      await declineSafetySettingChange({
        changeId: 'change-123',
        declinerUid: 'guardian-uid-2',
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'change-doc-ref',
        expect.objectContaining({
          status: 'declined',
          declineReason: null,
        })
      )
    })

    it('prevents self-decline', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          proposedByUid: 'guardian-uid-1',
          status: 'pending_approval',
        }),
      })

      await expect(
        declineSafetySettingChange({
          changeId: 'change-123',
          declinerUid: 'guardian-uid-1', // Same as proposer
        })
      ).rejects.toThrow('Cannot decline your own proposed change')
    })

    it('throws error if change not found', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      })

      await expect(
        declineSafetySettingChange({
          changeId: 'nonexistent',
          declinerUid: 'guardian-uid-2',
        })
      ).rejects.toThrow('Safety setting change not found')
    })

    it('throws error if already resolved', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          proposedByUid: 'guardian-uid-1',
          status: 'declined',
        }),
      })

      await expect(
        declineSafetySettingChange({
          changeId: 'change-123',
          declinerUid: 'guardian-uid-2',
        })
      ).rejects.toThrow('Cannot decline change with status: declined')
    })
  })

  describe('getPendingSafetySettingChanges', () => {
    it('returns pending changes for a family', async () => {
      const mockDoc = {
        id: 'change-123',
        data: () => ({
          familyId: 'family-456',
          settingType: 'monitoring_interval',
          currentValue: 60,
          proposedValue: 30,
          proposedByUid: 'guardian-uid-1',
          approverUid: null,
          status: 'pending_approval',
          declineReason: null,
          isEmergencyIncrease: true,
          reviewExpiresAt: null,
          createdAt: { toDate: () => new Date() },
          expiresAt: { toDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
          resolvedAt: null,
        }),
      }

      mockGetDocs.mockResolvedValueOnce({ docs: [mockDoc] })

      const result = await getPendingSafetySettingChanges('family-456')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('change-123')
      expect(result[0].status).toBe('pending_approval')
    })

    it('filters out expired changes', async () => {
      const expiredDoc = {
        id: 'expired-change',
        data: () => ({
          familyId: 'family-456',
          settingType: 'monitoring_interval',
          currentValue: 60,
          proposedValue: 30,
          proposedByUid: 'guardian-uid-1',
          approverUid: null,
          status: 'pending_approval',
          declineReason: null,
          isEmergencyIncrease: false,
          reviewExpiresAt: null,
          createdAt: { toDate: () => new Date(Date.now() - 100000000) },
          expiresAt: { toDate: () => new Date(Date.now() - 1000) }, // Already expired
          resolvedAt: null,
        }),
      }

      mockGetDocs.mockResolvedValueOnce({ docs: [expiredDoc] })

      const result = await getPendingSafetySettingChanges('family-456')

      expect(result).toHaveLength(0) // Filtered out expired
    })

    it('throws error if familyId is empty', async () => {
      await expect(getPendingSafetySettingChanges('')).rejects.toThrow('familyId is required')
    })
  })

  describe('reverseEmergencyIncrease', () => {
    it('reverses an emergency increase within review period', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          isEmergencyIncrease: true,
          reviewExpiresAt: { toDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }, // 24h left
          proposedByUid: 'guardian-uid-1',
        }),
      })

      await reverseEmergencyIncrease('change-123', 'guardian-uid-2')

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'change-doc-ref',
        expect.objectContaining({
          status: 'declined',
          approverUid: 'guardian-uid-2',
          declineReason: 'Reversed during emergency review period',
        })
      )
    })

    it('throws error if not an emergency increase', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          isEmergencyIncrease: false,
        }),
      })

      await expect(reverseEmergencyIncrease('change-123', 'guardian-uid-2')).rejects.toThrow(
        'Only emergency increases can be reversed'
      )
    })

    it('throws error if review period expired', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          isEmergencyIncrease: true,
          reviewExpiresAt: { toDate: () => new Date(Date.now() - 1000) }, // Already expired
        }),
      })

      await expect(reverseEmergencyIncrease('change-123', 'guardian-uid-2')).rejects.toThrow(
        'Review period has expired'
      )
    })

    it('throws error if no review period set', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          isEmergencyIncrease: true,
          reviewExpiresAt: null,
        }),
      })

      await expect(reverseEmergencyIncrease('change-123', 'guardian-uid-2')).rejects.toThrow(
        'No review period set for this change'
      )
    })

    it('throws error if change not found', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      })

      await expect(reverseEmergencyIncrease('nonexistent', 'guardian-uid-2')).rejects.toThrow(
        'Safety setting change not found'
      )
    })
  })

  describe('cancelSafetySettingChange (Story 3A.4)', () => {
    it('cancels a change in cooling period', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          status: 'cooling_period',
          familyId: 'family-456',
          proposedByUid: 'guardian-uid-1',
          approverUid: 'guardian-uid-2',
          effectiveAt: { toDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
        }),
      })

      await cancelSafetySettingChange({
        changeId: 'change-123',
        cancellerUid: 'guardian-uid-1', // Proposer can cancel
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'change-doc-ref',
        expect.objectContaining({
          status: 'cancelled',
          cancelledByUid: 'guardian-uid-1',
        })
      )
    })

    it('allows approver to cancel during cooling period', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          status: 'cooling_period',
          familyId: 'family-456',
          proposedByUid: 'guardian-uid-1',
          approverUid: 'guardian-uid-2',
          effectiveAt: { toDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
        }),
      })

      await cancelSafetySettingChange({
        changeId: 'change-123',
        cancellerUid: 'guardian-uid-2', // Approver can also cancel
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'change-doc-ref',
        expect.objectContaining({
          status: 'cancelled',
          cancelledByUid: 'guardian-uid-2',
        })
      )
    })

    it('throws error if change not found', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      })

      await expect(
        cancelSafetySettingChange({
          changeId: 'nonexistent',
          cancellerUid: 'guardian-uid-1',
        })
      ).rejects.toThrow('Safety setting change not found')
    })

    it('throws error if not in cooling period', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          status: 'pending_approval', // Not in cooling period
          familyId: 'family-456',
        }),
      })

      await expect(
        cancelSafetySettingChange({
          changeId: 'change-123',
          cancellerUid: 'guardian-uid-1',
        })
      ).rejects.toThrow('Only changes in cooling period can be cancelled')
    })

    it('throws error if cooling period already passed (effectiveAt in past)', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          status: 'cooling_period',
          familyId: 'family-456',
          effectiveAt: { toDate: () => new Date(Date.now() - 1000) }, // Already passed
        }),
      })

      await expect(
        cancelSafetySettingChange({
          changeId: 'change-123',
          cancellerUid: 'guardian-uid-1',
        })
      ).rejects.toThrow('Cooling period has ended. Change has already taken effect.')
    })

    it('throws error if changeId is empty', async () => {
      await expect(
        cancelSafetySettingChange({
          changeId: '',
          cancellerUid: 'guardian-uid-1',
        })
      ).rejects.toThrow('changeId is required')
    })

    it('throws error if cancellerUid is empty', async () => {
      await expect(
        cancelSafetySettingChange({
          changeId: 'change-123',
          cancellerUid: '',
        })
      ).rejects.toThrow('cancellerUid is required')
    })

    it('verifies 48-hour cooling period cannot be bypassed', async () => {
      // The system has no "expedite" or "force activate" function
      // This test confirms that attempting to approve an already approved/cooling change fails
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          status: 'cooling_period', // Already in cooling
          proposedByUid: 'guardian-uid-1',
        }),
      })

      await expect(
        approveSafetySettingChange({
          changeId: 'change-123',
          approverUid: 'guardian-uid-2',
        })
      ).rejects.toThrow('Cannot approve change with status: cooling_period')
    })
  })
})
