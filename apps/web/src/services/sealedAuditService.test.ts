import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createSealedAuditEntry,
  createGuardianSelfRemovalAudit,
  createSafetyEscapeAudit,
  SealedAuditServiceError,
  getErrorMessage,
} from './sealedAuditService'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
  setDoc: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

import { doc, collection, setDoc } from 'firebase/firestore'

const mockDoc = vi.mocked(doc)
const mockCollection = vi.mocked(collection)
const mockSetDoc = vi.mocked(setDoc)

/**
 * Sealed Audit Service Tests
 *
 * Story 2.8: Unilateral Self-Removal (Survivor Escape)
 *
 * Tests verify:
 * - Sealed audit entries are created with correct data
 * - Entries are stored in sealed_audits collection (NOT family audit)
 * - Error handling follows 6th-grade reading level
 * - Convenience functions for common audit types
 */

describe('sealedAuditService', () => {
  const mockUserId = 'user-123'
  const mockFamilyId = 'family-456'

  beforeEach(() => {
    vi.clearAllMocks()
    // Set up doc mock to return an object with id
    mockCollection.mockReturnValue({ id: 'sealed_audits' } as ReturnType<typeof collection>)
    mockDoc.mockReturnValue({ id: 'mock-audit-id' } as ReturnType<typeof doc>)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('SealedAuditServiceError', () => {
    it('should create error with code and message', () => {
      const error = new SealedAuditServiceError('test-code', 'Test message')

      expect(error.code).toBe('test-code')
      expect(error.message).toBe('Test message')
      expect(error.name).toBe('SealedAuditServiceError')
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
  // createSealedAuditEntry Tests
  // ============================================================================

  describe('createSealedAuditEntry', () => {
    it('should create sealed audit entry with correct data', async () => {
      const input = {
        action: 'guardian_self_removed' as const,
        userId: mockUserId,
        familyId: mockFamilyId,
        metadata: { wasOnlyGuardian: false },
      }

      const result = await createSealedAuditEntry(input)

      // Verify entry was created
      expect(result.id).toBe('mock-audit-id')
      expect(result.action).toBe('guardian_self_removed')
      expect(result.userId).toBe(mockUserId)
      expect(result.familyId).toBe(mockFamilyId)
      expect(result.metadata).toEqual({ wasOnlyGuardian: false })
      expect(result.performedAt).toBeInstanceOf(Date)

      // Verify Firestore was called
      expect(mockSetDoc).toHaveBeenCalledTimes(1)
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'mock-audit-id',
          action: 'guardian_self_removed',
          userId: mockUserId,
          familyId: mockFamilyId,
        })
      )
    })

    it('should create entry without metadata', async () => {
      const input = {
        action: 'guardian_self_removed' as const,
        userId: mockUserId,
        familyId: mockFamilyId,
      }

      const result = await createSealedAuditEntry(input)

      expect(result.action).toBe('guardian_self_removed')
      expect(result.metadata).toBeUndefined()
    })

    it('should throw when userId is missing', async () => {
      const input = {
        action: 'guardian_self_removed' as const,
        userId: '',
        familyId: mockFamilyId,
      }

      await expect(createSealedAuditEntry(input)).rejects.toThrow(
        'Could not remove you from the family. Please try again.'
      )
    })

    it('should throw when familyId is missing', async () => {
      const input = {
        action: 'guardian_self_removed' as const,
        userId: mockUserId,
        familyId: '',
      }

      await expect(createSealedAuditEntry(input)).rejects.toThrow(
        'Could not remove you from the family. Please try again.'
      )
    })

    it('should handle Firestore errors gracefully', async () => {
      mockSetDoc.mockRejectedValueOnce(new Error('Firestore error'))

      const input = {
        action: 'guardian_self_removed' as const,
        userId: mockUserId,
        familyId: mockFamilyId,
      }

      await expect(createSealedAuditEntry(input)).rejects.toThrow(
        'Could not remove you from the family. Please try again.'
      )
    })

    it('should use sealed_audits collection', async () => {
      const input = {
        action: 'guardian_self_removed' as const,
        userId: mockUserId,
        familyId: mockFamilyId,
      }

      await createSealedAuditEntry(input)

      // Verify collection was called with sealed_audits
      expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'sealed_audits')
    })
  })

  // ============================================================================
  // createGuardianSelfRemovalAudit Tests
  // ============================================================================

  describe('createGuardianSelfRemovalAudit', () => {
    it('should create guardian self-removal audit entry', async () => {
      const result = await createGuardianSelfRemovalAudit(mockUserId, mockFamilyId, {
        wasOnlyGuardian: true,
        remainingGuardians: 0,
      })

      expect(result.action).toBe('guardian_self_removed')
      expect(result.userId).toBe(mockUserId)
      expect(result.familyId).toBe(mockFamilyId)
      expect(result.metadata).toEqual({
        wasOnlyGuardian: true,
        remainingGuardians: 0,
      })
    })

    it('should create entry without metadata', async () => {
      const result = await createGuardianSelfRemovalAudit(mockUserId, mockFamilyId)

      expect(result.action).toBe('guardian_self_removed')
      expect(result.metadata).toBeUndefined()
    })
  })

  // ============================================================================
  // createSafetyEscapeAudit Tests
  // ============================================================================

  describe('createSafetyEscapeAudit', () => {
    it('should create safety escape audit entry', async () => {
      const result = await createSafetyEscapeAudit(mockUserId, mockFamilyId, {
        initiatedBySupportAgent: true,
        supportAgentId: 'agent-789',
      })

      expect(result.action).toBe('safety_escape_initiated')
      expect(result.userId).toBe(mockUserId)
      expect(result.familyId).toBe(mockFamilyId)
      expect(result.metadata).toEqual({
        initiatedBySupportAgent: true,
        supportAgentId: 'agent-789',
      })
    })

    it('should create entry without metadata', async () => {
      const result = await createSafetyEscapeAudit(mockUserId, mockFamilyId)

      expect(result.action).toBe('safety_escape_initiated')
      expect(result.metadata).toBeUndefined()
    })
  })

  // ============================================================================
  // Security Tests
  // ============================================================================

  describe('Security Patterns', () => {
    it('should NOT log to family audit collection', async () => {
      const input = {
        action: 'guardian_self_removed' as const,
        userId: mockUserId,
        familyId: mockFamilyId,
      }

      await createSealedAuditEntry(input)

      // Verify we never called collection with family audit paths
      const collectionCalls = mockCollection.mock.calls.map((call) => call[1])
      expect(collectionCalls).not.toContain('auditLog')
      expect(collectionCalls).not.toContain('families')
      expect(collectionCalls).toContain('sealed_audits')
    })
  })
})
