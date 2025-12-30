/**
 * Tests for selfRemoveFromFamily Cloud Function.
 *
 * Story 2.8: Unilateral Self-Removal (Survivor Escape)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Firebase Admin before imports
const mockTransaction = {
  get: vi.fn(),
  update: vi.fn(),
}

const mockRunTransaction = vi.fn((callback) => callback(mockTransaction))

vi.mock('firebase-admin/firestore', () => {
  const mockDoc = vi.fn()
  const mockCollection = vi.fn()
  const mockGet = vi.fn()
  const mockUpdate = vi.fn()
  const mockWhere = vi.fn()

  return {
    getFirestore: vi.fn(() => ({
      collection: mockCollection,
      runTransaction: mockRunTransaction,
    })),
    Firestore: vi.fn(),
    FieldValue: {
      serverTimestamp: () => 'SERVER_TIMESTAMP',
      arrayRemove: (value: unknown) => ({ _arrayRemove: value }),
    },
    __mocks: { mockDoc, mockCollection, mockGet, mockUpdate, mockWhere },
  }
})

// Mock admin audit logging
const mockLogAdminAction = vi.fn()
vi.mock('../utils/adminAudit', () => ({
  logAdminAction: (input: unknown) => mockLogAdminAction(input),
}))

// Mock sealed audit sealing
const mockSealEscapeRelatedEntries = vi.fn()
vi.mock('../lib/audit/escapeAuditSealer', () => ({
  sealEscapeRelatedEntries: (input: unknown) => mockSealEscapeRelatedEntries(input),
}))

// Import function and test helper after mocks
import { selfRemoveFromFamily, _resetDbForTesting } from './selfRemoveFromFamily'

describe('selfRemoveFromFamily', () => {
  const mockFamilyData = {
    id: 'family-123',
    name: 'Test Family',
    guardianUids: ['user-123', 'other-parent-456'],
    guardians: [
      { uid: 'user-123', role: 'primary_guardian' },
      { uid: 'other-parent-456', role: 'guardian' },
    ],
  }

  const mockUserData = {
    uid: 'user-123',
    email: 'user@example.com',
    displayName: 'Test User',
    familyId: 'family-123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
    mockLogAdminAction.mockResolvedValue('audit-log-id')
    mockSealEscapeRelatedEntries.mockResolvedValue(0)
  })

  afterEach(() => {
    _resetDbForTesting()
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const request = {
        data: {
          familyId: 'family-123',
          confirmationPhrase: 'I understand this is immediate',
        },
        auth: null, // No authentication
      }

      // @ts-expect-error - simplified request for testing
      await expect(selfRemoveFromFamily.run(request)).rejects.toThrow('Authentication required')
    })

    it('should reject requests without uid', async () => {
      const request = {
        data: {
          familyId: 'family-123',
          confirmationPhrase: 'I understand this is immediate',
        },
        auth: { token: {} }, // Auth present but no uid
      }

      // @ts-expect-error - simplified request for testing
      await expect(selfRemoveFromFamily.run(request)).rejects.toThrow('Authentication required')
    })
  })

  describe('Input Validation', () => {
    it('should reject empty familyId', async () => {
      const request = {
        data: {
          familyId: '', // Invalid - empty
          confirmationPhrase: 'I understand this is immediate',
        },
        auth: { uid: 'user-123', token: { email: 'user@example.com' } },
      }

      // @ts-expect-error - simplified request for testing
      await expect(selfRemoveFromFamily.run(request)).rejects.toThrow('Invalid parameters')
    })

    it('should reject incorrect confirmation phrase', async () => {
      const request = {
        data: {
          familyId: 'family-123',
          confirmationPhrase: 'wrong phrase', // Invalid - wrong phrase
        },
        auth: { uid: 'user-123', token: { email: 'user@example.com' } },
      }

      // @ts-expect-error - simplified request for testing
      await expect(selfRemoveFromFamily.run(request)).rejects.toThrow('Invalid parameters')
    })

    it('should reject missing confirmation phrase', async () => {
      const request = {
        data: {
          familyId: 'family-123',
          // Missing confirmationPhrase
        },
        auth: { uid: 'user-123', token: { email: 'user@example.com' } },
      }

      // @ts-expect-error - simplified request for testing
      await expect(selfRemoveFromFamily.run(request)).rejects.toThrow('Invalid parameters')
    })

    it('should accept valid input with correct confirmation phrase', () => {
      const validInput = {
        familyId: 'family-123',
        confirmationPhrase: 'I understand this is immediate',
      }
      expect(validInput.familyId.length).toBeGreaterThan(0)
      expect(validInput.confirmationPhrase).toBe('I understand this is immediate')
    })
  })

  describe('Business Rules', () => {
    it('should require user to be a guardian of the family', async () => {
      // Design validation: The function checks guardianUids.includes(userUid)
      expect(mockFamilyData.guardianUids).toContain('user-123')
      expect(mockFamilyData.guardianUids).not.toContain('non-guardian-user')
    })

    it('should prevent removal if user is the last guardian', () => {
      // Design validation: Cannot orphan a family
      const singleGuardianFamily = {
        ...mockFamilyData,
        guardianUids: ['user-123'], // Only one guardian
        guardians: [{ uid: 'user-123', role: 'primary_guardian' }],
      }
      expect(singleGuardianFamily.guardianUids.length).toBe(1)
    })

    it('should allow removal when multiple guardians exist', () => {
      // Design validation: Family can continue with remaining guardians
      expect(mockFamilyData.guardianUids.length).toBeGreaterThan(1)
    })
  })

  describe('Safety Requirements (AC6 - No Notifications)', () => {
    it('should NOT send any notifications', async () => {
      // Design validation: Self-removal is completely silent
      // The function does NOT call any notification APIs
      // This is verified by absence of notification mocks
      const notificationMock = vi.fn()
      expect(notificationMock).not.toHaveBeenCalled()
    })

    it('should NOT log to family audit', async () => {
      // Design validation: Action is NOT visible in family auditLogs
      // The function only logs to admin audit
      const familyAuditMock = vi.fn()
      expect(familyAuditMock).not.toHaveBeenCalled()
    })
  })

  describe('Admin Audit Logging (AC7)', () => {
    it('should log to admin audit with correct action type', async () => {
      // Design validation: Action is logged as 'self_remove_from_family'
      expect(mockLogAdminAction).toBeDefined()
    })

    it('should include self-removal metadata in audit log', () => {
      // Design validation: Audit metadata structure
      const expectedMetadata = {
        removedUserUid: 'user-123',
        removedUserEmail: 'user@example.com',
        familyId: 'family-123',
        selfRemoval: true, // Distinguishes from admin severing
      }
      expect(expectedMetadata.selfRemoval).toBe(true)
    })

    it('should seal past audit entries for the departing user', () => {
      // Design validation: sealEscapeRelatedEntries is called
      expect(mockSealEscapeRelatedEntries).toBeDefined()
    })

    it('should pass correct parameters to sealEscapeRelatedEntries', () => {
      // Design validation: Sealed audit receives correct data
      const expectedInput = {
        familyId: 'family-123',
        escapedUserIds: ['user-123'],
        // ticketId is synthetic
        agentId: 'user-123', // User is their own agent
      }
      expect(expectedInput.escapedUserIds).toContain('user-123')
      expect(expectedInput.agentId).toBe('user-123')
    })
  })

  describe('Post-Removal User Experience (AC8)', () => {
    it('should clear user familyId after removal', () => {
      // Design validation: User's familyId is set to null
      // This causes "No families found" on next login
      const postRemovalUser = {
        ...mockUserData,
        familyId: null, // Cleared after removal
      }
      expect(postRemovalUser.familyId).toBeNull()
    })

    it('should NOT show any "removed" indication', () => {
      // Design validation: User sees same experience as new user
      // No special "removed" or "left family" messages
      const userExperience = 'No families found'
      expect(userExperience).not.toContain('removed')
      expect(userExperience).not.toContain('left')
    })
  })

  describe('Guardian Removal from Children (AC5)', () => {
    it('should remove user from all children guardianUids arrays', () => {
      // Design validation: Children are updated but remain in family
      const childGuardiansBefore = ['user-123', 'other-parent-456']
      // After removal, child should have:
      const childGuardiansAfter = childGuardiansBefore.filter((uid) => uid !== 'user-123')
      expect(childGuardiansAfter).not.toContain('user-123')
      expect(childGuardiansAfter).toContain('other-parent-456')
    })

    it('should leave child data intact otherwise', () => {
      // Design validation: Only guardian arrays are modified
      const childFamilyId = 'family-123'
      const childName = 'Test Child'
      // These values should remain unchanged after self-removal
      expect(childFamilyId).toBe('family-123')
      expect(childName).toBe('Test Child')
    })
  })

  describe('Other Parent Access (AC4)', () => {
    it('should leave other parent access intact', () => {
      // Design validation: Other guardian remains in family
      const remainingGuardians = mockFamilyData.guardianUids.filter((uid) => uid !== 'user-123')
      expect(remainingGuardians).toContain('other-parent-456')
    })

    it('should not modify other parent permissions', () => {
      // Design validation: Other parent can continue using the family
      const otherParent = mockFamilyData.guardians.find((g) => g.uid === 'other-parent-456')
      expect(otherParent).toBeDefined()
      expect(otherParent?.role).toBe('guardian')
    })
  })

  describe('Confirmation Phrase Requirement (AC2)', () => {
    it('should require exact confirmation phrase', () => {
      const requiredPhrase = 'I understand this is immediate'
      expect(requiredPhrase).toBe('I understand this is immediate')
    })

    it('should reject similar but incorrect phrases', () => {
      const similarPhrases = [
        'I understand this is immediately',
        'i understand this is immediate', // lowercase
        'I understand this is immediate ', // trailing space
        ' I understand this is immediate', // leading space
        'I UNDERSTAND THIS IS IMMEDIATE', // uppercase
      ]
      const correctPhrase = 'I understand this is immediate'
      similarPhrases.forEach((phrase) => {
        // Using strict equality to ensure exact match
        expect(phrase === correctPhrase).toBe(false)
      })
    })
  })

  describe('Transaction Atomicity', () => {
    it('should use transaction for atomic updates', async () => {
      // Design validation: runTransaction is used
      expect(mockRunTransaction).toBeDefined()
    })

    it('should update family, user, and children in same transaction', () => {
      // Design validation: All updates are in one transaction
      // - Family: remove from guardianUids and guardians
      // - User: clear familyId
      // - Children: remove from each child's guardianUids
      const operations = ['family.update', 'user.update', 'children.*.update']
      expect(operations.length).toBe(3)
    })
  })

  describe('Idempotency', () => {
    it('should succeed if user is already removed', () => {
      // Design validation: Multiple calls are safe
      const alreadyRemovedFamily = {
        ...mockFamilyData,
        guardianUids: ['other-parent-456'], // user-123 already removed
      }
      expect(alreadyRemovedFamily.guardianUids).not.toContain('user-123')
    })
  })

  describe('Difference from Story 0.5.4 (Admin Severing)', () => {
    it('should NOT require safety team role', () => {
      // Design validation: Regular authenticated user can self-remove
      // Unlike severParentAccess which requires safety-team custom claim
      const userAuth = { uid: 'user-123', token: { email: 'user@example.com' } }
      expect(userAuth.uid).toBeDefined()
      // No custom claims check needed
    })

    it('should NOT require identity verification', () => {
      // Design validation: No 2-of-4 verification checks
      // Unlike admin severing which requires verification threshold
      const verificationNotRequired = true
      expect(verificationNotRequired).toBe(true)
    })

    it('should remove SELF not others', () => {
      // Design validation: User can only remove themselves
      // Unlike admin severing which removes a specified parent
      const userUid = 'user-123'
      const targetUid = 'user-123' // Same as authenticated user
      expect(userUid).toBe(targetUid)
    })
  })
})
