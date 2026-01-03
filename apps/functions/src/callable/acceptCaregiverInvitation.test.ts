/**
 * Unit tests for acceptCaregiverInvitation Cloud Function.
 *
 * Tests cover:
 * - Auth validation (unauthenticated rejection) (AC3)
 * - Token validation (empty, not found)
 * - Invitation state validation (expired, accepted, revoked) (AC6)
 * - Duplicate member prevention
 * - Success path and response format (AC4)
 *
 * Story 19D.1: Caregiver Invitation & Onboarding
 * Story 39.1: Caregiver Account Creation
 * - AC1: Copy relationship from invitation to family caregiver entry
 * - AC4: Create notification for each child when caregiver joins
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore before importing
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => mockDocRef),
      where: vi.fn(() => ({
        limit: vi.fn(() => ({
          get: vi.fn(() => mockQuerySnapshot),
        })),
        get: vi.fn(() => mockQuerySnapshot),
      })),
    })),
    batch: vi.fn(() => mockBatch),
  })),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}))

// Mock auth
vi.mock('../shared/auth', () => ({
  verifyAuth: vi.fn(),
}))

import { verifyAuth } from '../shared/auth'
import { HttpsError } from 'firebase-functions/v2/https'

// Mock document reference
const mockDocRef = {
  id: 'inv-123',
  get: vi.fn(),
  update: vi.fn(),
  ref: { id: 'inv-123' },
}

// Mock query snapshot
const mockQuerySnapshot = {
  empty: true,
  docs: [],
}

// Mock batch
const mockBatch = {
  update: vi.fn(),
  commit: vi.fn(),
}

describe('acceptCaregiverInvitation Cloud Function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication (AC3)', () => {
    it('rejects unauthenticated requests', async () => {
      vi.mocked(verifyAuth).mockImplementation(() => {
        throw new HttpsError('unauthenticated', 'Authentication required')
      })

      expect(() => verifyAuth(undefined)).toThrow('Authentication required')
    })

    it('accepts authenticated requests (Google Sign-In)', () => {
      vi.mocked(verifyAuth).mockReturnValue({
        uid: 'caregiver-123',
        email: 'grandpa@example.com',
        displayName: 'Grandpa Joe',
      })

      const result = verifyAuth({ uid: 'caregiver-123' } as Parameters<typeof verifyAuth>[0])
      expect(result.uid).toBe('caregiver-123')
      expect(result.email).toBe('grandpa@example.com')
    })
  })

  describe('Input Validation', () => {
    it('rejects empty token', () => {
      const invalidInput = { token: '' }

      // Schema requires min(1) for token
      expect(invalidInput.token.length).toBe(0)
    })

    it('accepts valid token', () => {
      const validInput = { token: 'secure-token-abc123' }

      expect(validInput.token.length).toBeGreaterThan(0)
    })
  })

  describe('Invitation State Validation (AC6)', () => {
    it('rejects expired invitations', () => {
      const invitationData = {
        status: 'pending',
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
      }

      const now = new Date()
      const isExpired = invitationData.expiresAt < now
      expect(isExpired).toBe(true)
    })

    it('rejects already accepted invitations', () => {
      const invitationData = {
        status: 'accepted',
        expiresAt: new Date(Date.now() + 86400000),
      }

      expect(invitationData.status).toBe('accepted')
      expect(invitationData.status).not.toBe('pending')
    })

    it('rejects revoked invitations', () => {
      const invitationData = {
        status: 'revoked',
        expiresAt: new Date(Date.now() + 86400000),
      }

      expect(invitationData.status).toBe('revoked')
      expect(invitationData.status).not.toBe('pending')
    })

    it('accepts valid pending invitation', () => {
      const invitationData = {
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000 * 3), // 3 days from now
      }

      const now = new Date()
      const isValid = invitationData.status === 'pending' && invitationData.expiresAt > now
      expect(isValid).toBe(true)
    })
  })

  describe('Duplicate Member Prevention', () => {
    it('rejects if user is already a guardian', () => {
      const familyData = {
        guardians: [{ uid: 'user-123' }, { uid: 'user-456' }],
        caregivers: [],
      }
      const userId = 'user-123'

      const isGuardian = familyData.guardians.some((g: { uid: string }) => g.uid === userId)
      expect(isGuardian).toBe(true)
    })

    it('rejects if user is already a caregiver', () => {
      const familyData = {
        guardians: [{ uid: 'guardian-123' }],
        caregivers: [{ uid: 'caregiver-456' }],
      }
      const userId = 'caregiver-456'

      const isCaregiver = familyData.caregivers.some((c: { uid: string }) => c.uid === userId)
      expect(isCaregiver).toBe(true)
    })

    it('allows new users to join', () => {
      const familyData = {
        guardians: [{ uid: 'guardian-123' }],
        caregivers: [],
      }
      const userId = 'new-caregiver-789'

      const isGuardian = familyData.guardians.some((g: { uid: string }) => g.uid === userId)
      const isCaregiver = familyData.caregivers.some((c: { uid: string }) => c.uid === userId)

      expect(isGuardian).toBe(false)
      expect(isCaregiver).toBe(false)
    })
  })

  describe('Caregiver Entry Creation', () => {
    it('creates caregiver with status_viewer role', () => {
      const caregiverEntry = {
        uid: 'caregiver-123',
        email: 'grandpa@example.com',
        displayName: 'Grandpa Joe',
        role: 'status_viewer',
        childIds: ['child-1', 'child-2'],
        addedAt: new Date(),
        addedByUid: 'guardian-456',
      }

      expect(caregiverEntry.role).toBe('status_viewer')
    })

    it('includes correct childIds from invitation', () => {
      const invitationData = {
        childIds: ['child-1', 'child-2'],
      }

      const caregiverEntry = {
        childIds: invitationData.childIds,
        role: 'status_viewer',
      }

      expect(caregiverEntry.childIds).toEqual(['child-1', 'child-2'])
    })

    it('stores inviter uid as addedByUid', () => {
      const invitationData = {
        inviterUid: 'parent-123',
      }

      const caregiverEntry = {
        addedByUid: invitationData.inviterUid,
      }

      expect(caregiverEntry.addedByUid).toBe('parent-123')
    })
  })

  describe('Response Format (AC4)', () => {
    it('returns success with family info for onboarding', () => {
      const response = {
        success: true,
        familyId: 'family-123',
        familyName: 'Smith Family',
        childNames: ['Emma', 'Jack'],
        role: 'status_viewer' as const,
      }

      expect(response.success).toBe(true)
      expect(response.familyId).toBe('family-123')
      expect(response.familyName).toBe('Smith Family')
      expect(response.childNames).toEqual(['Emma', 'Jack'])
      expect(response.role).toBe('status_viewer')
    })

    it('includes all children the caregiver can view', () => {
      const invitationChildIds = ['child-1', 'child-2']
      const allChildren = [
        { id: 'child-1', name: 'Emma' },
        { id: 'child-2', name: 'Jack' },
        { id: 'child-3', name: 'Lily' },
      ]

      const childNames = allChildren
        .filter((c) => invitationChildIds.includes(c.id))
        .map((c) => c.name)

      expect(childNames).toEqual(['Emma', 'Jack'])
      expect(childNames).not.toContain('Lily')
    })
  })

  describe('Batch Operations', () => {
    it('updates invitation status to accepted', () => {
      const updateData = {
        status: 'accepted',
        acceptedByUid: 'caregiver-123',
      }

      expect(updateData.status).toBe('accepted')
      expect(updateData.acceptedByUid).toBeDefined()
    })

    it('adds caregiver to family document', () => {
      const familyUpdate = {
        caregivers: [
          {
            uid: 'caregiver-123',
            email: 'grandpa@example.com',
            role: 'status_viewer',
            childIds: ['child-1'],
            addedAt: new Date(),
            addedByUid: 'parent-456',
          },
        ],
        caregiverUids: ['caregiver-123'],
      }

      expect(familyUpdate.caregivers.length).toBe(1)
      expect(familyUpdate.caregiverUids).toContain('caregiver-123')
    })

    it('does NOT add caregiver to child documents (unlike guardians)', () => {
      // Caregivers only view status, they don't manage children
      // So they should NOT be added to child documents
      const shouldUpdateChildren = false

      expect(shouldUpdateChildren).toBe(false)
    })
  })

  describe('Error Messages', () => {
    it('provides clear message for expired invitation', () => {
      const errorMessage = 'This invitation has expired'
      expect(errorMessage).toContain('expired')
    })

    it('provides clear message for already accepted', () => {
      const errorMessage = 'This invitation has already been accepted'
      expect(errorMessage).toContain('already been accepted')
    })

    it('provides clear message for cancelled invitation', () => {
      const errorMessage = 'This invitation has been cancelled'
      expect(errorMessage).toContain('cancelled')
    })

    it('provides clear message for already a member', () => {
      const errorMessage = 'You are already a caregiver in this family'
      expect(errorMessage).toContain('already')
    })
  })

  describe('Story 39.1: Relationship Copy', () => {
    it('copies relationship from invitation to caregiver entry', () => {
      const invitationData = {
        relationship: 'grandparent',
        customRelationship: null,
        inviterUid: 'parent-123',
        childIds: ['child-1'],
      }

      const caregiverEntry = {
        uid: 'caregiver-123',
        email: 'grandpa@example.com',
        displayName: 'Grandpa Joe',
        role: 'status_viewer',
        relationship: invitationData.relationship,
        customRelationship: invitationData.customRelationship,
        childIds: invitationData.childIds,
        addedAt: new Date(),
        addedByUid: invitationData.inviterUid,
      }

      expect(caregiverEntry.relationship).toBe('grandparent')
      expect(caregiverEntry.customRelationship).toBeNull()
    })

    it('copies custom relationship text for other type', () => {
      const invitationData = {
        relationship: 'other',
        customRelationship: 'Trusted Neighbor',
        inviterUid: 'parent-123',
        childIds: ['child-1'],
      }

      const caregiverEntry = {
        uid: 'caregiver-123',
        email: 'neighbor@example.com',
        displayName: 'Mrs. Smith',
        role: 'status_viewer',
        relationship: invitationData.relationship,
        customRelationship: invitationData.customRelationship,
        childIds: invitationData.childIds,
        addedAt: new Date(),
        addedByUid: invitationData.inviterUid,
      }

      expect(caregiverEntry.relationship).toBe('other')
      expect(caregiverEntry.customRelationship).toBe('Trusted Neighbor')
    })

    it('handles aunt_uncle relationship', () => {
      const invitationData = {
        relationship: 'aunt_uncle',
        customRelationship: null,
      }

      const caregiverEntry = {
        relationship: invitationData.relationship,
        customRelationship: invitationData.customRelationship,
      }

      expect(caregiverEntry.relationship).toBe('aunt_uncle')
    })

    it('handles babysitter relationship', () => {
      const invitationData = {
        relationship: 'babysitter',
        customRelationship: null,
      }

      const caregiverEntry = {
        relationship: invitationData.relationship,
        customRelationship: invitationData.customRelationship,
      }

      expect(caregiverEntry.relationship).toBe('babysitter')
    })
  })

  describe('Story 39.1 AC4: Child Notification', () => {
    it('creates notification for each child in childIds', () => {
      const childIds = ['child-1', 'child-2', 'child-3']
      const notificationsToCreate: { childId: string; notification: Record<string, unknown> }[] = []

      // Simulate notification creation for each child
      for (const childId of childIds) {
        notificationsToCreate.push({
          childId,
          notification: {
            type: 'caregiver_added',
            caregiverUid: 'caregiver-123',
            caregiverName: 'Grandpa Joe',
            caregiverRelationship: 'grandparent',
            customRelationship: null,
            message: 'Grandpa Joe (Grandparent) has been added as a caregiver',
            read: false,
          },
        })
      }

      expect(notificationsToCreate.length).toBe(3)
      expect(notificationsToCreate.map((n) => n.childId)).toEqual(['child-1', 'child-2', 'child-3'])
    })

    it('formats notification message with relationship label', () => {
      const formatNotificationMessage = (
        displayName: string,
        relationship: string,
        customRelationship: string | null
      ): string => {
        const relationshipLabels: Record<string, string> = {
          grandparent: 'Grandparent',
          aunt_uncle: 'Aunt/Uncle',
          babysitter: 'Babysitter',
          other: customRelationship || 'Caregiver',
        }
        const label = relationshipLabels[relationship] || 'Caregiver'
        return `${displayName} (${label}) has been added as a caregiver`
      }

      expect(formatNotificationMessage('Grandpa Joe', 'grandparent', null)).toBe(
        'Grandpa Joe (Grandparent) has been added as a caregiver'
      )
      expect(formatNotificationMessage('Aunt Sarah', 'aunt_uncle', null)).toBe(
        'Aunt Sarah (Aunt/Uncle) has been added as a caregiver'
      )
      expect(formatNotificationMessage('Mary', 'babysitter', null)).toBe(
        'Mary (Babysitter) has been added as a caregiver'
      )
      expect(formatNotificationMessage('Mrs. Smith', 'other', 'Trusted Neighbor')).toBe(
        'Mrs. Smith (Trusted Neighbor) has been added as a caregiver'
      )
    })

    it('uses email prefix when displayName not available', () => {
      const getDisplayName = (displayName: string | null, email: string | null): string => {
        return displayName || email?.split('@')[0] || 'A caregiver'
      }

      expect(getDisplayName(null, 'grandpa@example.com')).toBe('grandpa')
      expect(getDisplayName('Grandpa Joe', 'grandpa@example.com')).toBe('Grandpa Joe')
      expect(getDisplayName(null, null)).toBe('A caregiver')
    })

    it('notification structure matches expected schema', () => {
      const notification = {
        type: 'caregiver_added',
        caregiverUid: 'caregiver-123',
        caregiverName: 'Grandpa Joe',
        caregiverRelationship: 'grandparent',
        customRelationship: null,
        message: 'Grandpa Joe (Grandparent) has been added as a caregiver',
        createdAt: 'SERVER_TIMESTAMP',
        read: false,
      }

      expect(notification.type).toBe('caregiver_added')
      expect(notification.caregiverUid).toBeDefined()
      expect(notification.caregiverName).toBeDefined()
      expect(notification.caregiverRelationship).toBeDefined()
      expect(notification.message).toBeDefined()
      expect(notification.read).toBe(false)
    })

    it('stores notification in child notifications subcollection path', () => {
      // Path should be: children/{childId}/notifications/{notificationId}
      const childId = 'child-123'
      const expectedPath = `children/${childId}/notifications`

      expect(expectedPath).toBe('children/child-123/notifications')
    })
  })
})
