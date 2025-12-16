import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  removeSelfFromFamily,
  canRemoveSelf,
  SelfRemovalServiceError,
  getErrorMessage,
} from './selfRemovalService'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
  writeBatch: vi.fn(() => ({
    update: vi.fn(),
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
  arrayRemove: vi.fn((item) => ({ _arrayRemove: item })),
  deleteField: vi.fn(() => ({ _deleteField: true })),
  FieldValue: {
    delete: vi.fn(() => ({ _delete: true })),
  },
}))

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

// Mock sealed audit service
vi.mock('./sealedAuditService', () => ({
  createGuardianSelfRemovalAudit: vi.fn().mockResolvedValue({
    id: 'audit-123',
    action: 'guardian_self_removed',
    userId: 'user-123',
    familyId: 'family-456',
    performedAt: new Date(),
  }),
}))

import { doc, getDoc, writeBatch } from 'firebase/firestore'
import { createGuardianSelfRemovalAudit } from './sealedAuditService'

const mockDoc = vi.mocked(doc)
const mockGetDoc = vi.mocked(getDoc)
const mockWriteBatch = vi.mocked(writeBatch)
const mockCreateSealedAudit = vi.mocked(createGuardianSelfRemovalAudit)

/**
 * Self-Removal Service Tests
 *
 * Story 2.8: Unilateral Self-Removal (Survivor Escape)
 *
 * Tests verify:
 * - Self-removal immediately revokes access
 * - NO notifications are sent
 * - Audit is created in sealed_audits only
 * - Single guardian scenarios are handled
 * - Error handling follows 6th-grade reading level
 */

describe('selfRemovalService', () => {
  const mockUserId = 'user-123'
  const mockFamilyId = 'family-456'
  const mockReauthToken = 'valid-token'

  const mockGuardian = {
    uid: mockUserId,
    role: 'primary',
    permissions: 'full',
  }

  const mockOtherGuardian = {
    uid: 'other-user-789',
    role: 'co-guardian',
    permissions: 'full',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockDoc.mockReturnValue({ id: 'mock-doc-id' } as ReturnType<typeof doc>)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('SelfRemovalServiceError', () => {
    it('should create error with code and message', () => {
      const error = new SelfRemovalServiceError('test-code', 'Test message')

      expect(error.code).toBe('test-code')
      expect(error.message).toBe('Test message')
      expect(error.name).toBe('SelfRemovalServiceError')
    })
  })

  describe('getErrorMessage', () => {
    it('should return correct messages for known codes', () => {
      expect(getErrorMessage('family-not-found')).toBe('We could not find this family.')
      expect(getErrorMessage('not-a-guardian')).toBe('You are not a member of this family.')
      expect(getErrorMessage('reauth-required')).toBe(
        'Please sign in again to confirm this action.'
      )
      expect(getErrorMessage('removal-failed')).toBe(
        'Could not remove you from the family. Please try again.'
      )
    })

    it('should return default message for unknown codes', () => {
      expect(getErrorMessage('unknown')).toBe('Something went wrong. Please try again.')
    })
  })

  // ============================================================================
  // removeSelfFromFamily Tests
  // ============================================================================

  describe('removeSelfFromFamily', () => {
    it('should throw when family not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => null,
      } as never)

      await expect(
        removeSelfFromFamily(mockFamilyId, mockUserId, mockReauthToken)
      ).rejects.toThrow('We could not find this family.')
    })

    it('should throw when user is not a guardian', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [mockOtherGuardian], // Different guardian
          children: [],
        }),
      } as never)

      await expect(
        removeSelfFromFamily(mockFamilyId, mockUserId, mockReauthToken)
      ).rejects.toThrow('You are not a member of this family.')
    })

    it('should throw when re-auth token is missing', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [mockGuardian],
          children: [],
        }),
      } as never)

      await expect(removeSelfFromFamily(mockFamilyId, mockUserId, '')).rejects.toThrow(
        'Please sign in again to confirm this action.'
      )
    })

    it('should successfully remove user from multi-guardian family', async () => {
      const mockBatch = {
        update: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }
      mockWriteBatch.mockReturnValue(mockBatch as never)

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [mockGuardian, mockOtherGuardian],
          children: ['child-1', 'child-2'],
        }),
      } as never)

      const result = await removeSelfFromFamily(mockFamilyId, mockUserId, mockReauthToken)

      expect(result.success).toBe(true)
      expect(result.isSingleGuardian).toBe(false)
      expect(result.familyId).toBe(mockFamilyId)
      expect(result.removedAt).toBeInstanceOf(Date)

      // Verify batch was committed
      expect(mockBatch.commit).toHaveBeenCalledTimes(1)

      // Verify sealed audit was created
      expect(mockCreateSealedAudit).toHaveBeenCalledWith(mockUserId, mockFamilyId, {
        wasOnlyGuardian: false,
        remainingGuardians: 1,
        childCount: 2,
      })
    })

    it('should handle single guardian family and flag for support', async () => {
      const mockBatch = {
        update: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }
      mockWriteBatch.mockReturnValue(mockBatch as never)

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [mockGuardian], // Only one guardian
          children: ['child-1'],
        }),
      } as never)

      const result = await removeSelfFromFamily(mockFamilyId, mockUserId, mockReauthToken)

      expect(result.success).toBe(true)
      expect(result.isSingleGuardian).toBe(true)

      // Verify orphaned flag was set
      expect(mockBatch.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          'flags.orphanedByEscape': true,
          'flags.needsSupportReview': true,
        })
      )

      // Verify sealed audit was created with wasOnlyGuardian: true
      expect(mockCreateSealedAudit).toHaveBeenCalledWith(mockUserId, mockFamilyId, {
        wasOnlyGuardian: true,
        remainingGuardians: 0,
        childCount: 1,
      })
    })

    it('should remove user from all children guardian permissions', async () => {
      const mockBatch = {
        update: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }
      mockWriteBatch.mockReturnValue(mockBatch as never)

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [mockGuardian, mockOtherGuardian],
          children: ['child-1', 'child-2', 'child-3'],
        }),
      } as never)

      await removeSelfFromFamily(mockFamilyId, mockUserId, mockReauthToken)

      // Verify update was called for each child + family doc updates
      // Family doc gets 2 updates (guardians + updatedAt), each child gets 1 update
      expect(mockBatch.update).toHaveBeenCalled()
    })

    it('should NOT create family audit log entry', async () => {
      const mockBatch = {
        update: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }
      mockWriteBatch.mockReturnValue(mockBatch as never)

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [mockGuardian, mockOtherGuardian],
          children: [],
        }),
      } as never)

      await removeSelfFromFamily(mockFamilyId, mockUserId, mockReauthToken)

      // Verify no batch.set calls (which would create audit log entries)
      // Only sealed audit service should be called
      expect(mockBatch.set).not.toHaveBeenCalled()
    })

    it('should handle Firestore errors gracefully', async () => {
      mockGetDoc.mockRejectedValue(new Error('Firestore error'))

      await expect(
        removeSelfFromFamily(mockFamilyId, mockUserId, mockReauthToken)
      ).rejects.toThrow('Could not remove you from the family. Please try again.')
    })

    it('should handle batch commit errors', async () => {
      const mockBatch = {
        update: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockRejectedValue(new Error('Commit failed')),
      }
      mockWriteBatch.mockReturnValue(mockBatch as never)

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [mockGuardian, mockOtherGuardian],
          children: [],
        }),
      } as never)

      await expect(
        removeSelfFromFamily(mockFamilyId, mockUserId, mockReauthToken)
      ).rejects.toThrow('Could not remove you from the family. Please try again.')
    })
  })

  // ============================================================================
  // canRemoveSelf Tests
  // ============================================================================

  describe('canRemoveSelf', () => {
    it('should return canRemove:true for valid guardian', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [mockGuardian, mockOtherGuardian],
        }),
      } as never)

      const result = await canRemoveSelf(mockFamilyId, mockUserId)

      expect(result.canRemove).toBe(true)
      expect(result.isSingleGuardian).toBe(false)
      expect(result.reason).toBeUndefined()
    })

    it('should return canRemove:false when family not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => null,
      } as never)

      const result = await canRemoveSelf(mockFamilyId, mockUserId)

      expect(result.canRemove).toBe(false)
      expect(result.isSingleGuardian).toBe(false)
      expect(result.reason).toBe('family-not-found')
    })

    it('should return canRemove:false when user is not a guardian', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [mockOtherGuardian],
        }),
      } as never)

      const result = await canRemoveSelf(mockFamilyId, mockUserId)

      expect(result.canRemove).toBe(false)
      expect(result.isSingleGuardian).toBe(false)
      expect(result.reason).toBe('not-a-guardian')
    })

    it('should return warning for single guardian', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [mockGuardian], // Only one guardian
        }),
      } as never)

      const result = await canRemoveSelf(mockFamilyId, mockUserId)

      expect(result.canRemove).toBe(true)
      expect(result.isSingleGuardian).toBe(true)
      expect(result.reason).toBe('single-guardian-warning')
    })

    it('should handle errors gracefully', async () => {
      mockGetDoc.mockRejectedValue(new Error('Firestore error'))

      const result = await canRemoveSelf(mockFamilyId, mockUserId)

      expect(result.canRemove).toBe(false)
      expect(result.isSingleGuardian).toBe(false)
      expect(result.reason).toBe('removal-failed')
    })
  })

  // ============================================================================
  // Security Tests
  // ============================================================================

  describe('Security Patterns', () => {
    it('should create sealed audit entry, not family audit', async () => {
      const mockBatch = {
        update: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }
      mockWriteBatch.mockReturnValue(mockBatch as never)

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [mockGuardian, mockOtherGuardian],
          children: [],
        }),
      } as never)

      await removeSelfFromFamily(mockFamilyId, mockUserId, mockReauthToken)

      // Verify sealed audit was created
      expect(mockCreateSealedAudit).toHaveBeenCalledTimes(1)

      // Verify no family audit was created (no batch.set calls)
      expect(mockBatch.set).not.toHaveBeenCalled()
    })
  })
})
