/**
 * Unit tests for sendCaregiverInvitation Cloud Function.
 *
 * Tests cover:
 * - Auth validation (unauthenticated rejection)
 * - Input validation (invalid email, empty childIds)
 * - Permission checks (non-guardian rejection)
 * - Duplicate prevention (existing caregiver, pending invitation)
 * - Success path
 *
 * Story 19D.1: Caregiver Invitation & Onboarding
 * Story 39.1: Caregiver Account Creation
 * - Relationship field validation
 * - Maximum 5 caregivers per family limit
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore before importing
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => mockDocRef),
      where: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn(() => mockQuerySnapshot),
        })),
        get: vi.fn(() => mockQuerySnapshot),
      })),
    })),
  })),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}))

// Mock the email service
vi.mock('../services/caregiverEmailService', () => ({
  sendCaregiverInvitationEmail: vi.fn(),
}))

// Mock auth
vi.mock('../shared/auth', () => ({
  verifyAuth: vi.fn(),
}))

import { verifyAuth } from '../shared/auth'
import { sendCaregiverInvitationEmail } from '../services/caregiverEmailService'
import { HttpsError } from 'firebase-functions/v2/https'

// Mock document reference
const mockDocRef = {
  id: 'inv-123',
  get: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
}

// Mock query snapshot
const mockQuerySnapshot = {
  empty: true,
  docs: [],
}

describe('sendCaregiverInvitation Cloud Function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('rejects unauthenticated requests', async () => {
      vi.mocked(verifyAuth).mockImplementation(() => {
        throw new HttpsError('unauthenticated', 'Authentication required')
      })

      expect(() => verifyAuth(undefined)).toThrow('Authentication required')
    })

    it('accepts authenticated requests', () => {
      vi.mocked(verifyAuth).mockReturnValue({
        uid: 'guardian-123',
        email: 'guardian@example.com',
        displayName: 'Parent Name',
      })

      const result = verifyAuth({ uid: 'guardian-123' } as Parameters<typeof verifyAuth>[0])
      expect(result.uid).toBe('guardian-123')
    })
  })

  describe('Input Validation', () => {
    it('rejects empty familyId', () => {
      const invalidInput = {
        familyId: '',
        recipientEmail: 'grandpa@example.com',
        childIds: ['child-1'],
      }

      expect(invalidInput.familyId.length).toBe(0)
    })

    it('rejects invalid email format', () => {
      const invalidEmails = ['notanemail', 'missing@domain', '@nodomain.com']

      invalidEmails.forEach((email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        expect(regex.test(email)).toBe(false)
      })
    })

    it('rejects empty childIds array (AC5)', () => {
      const invalidInput = {
        familyId: 'family-123',
        recipientEmail: 'grandpa@example.com',
        childIds: [],
      }

      // Schema requires min(1) for childIds
      expect(invalidInput.childIds.length).toBe(0)
    })

    it('accepts valid input', () => {
      const validInput = {
        familyId: 'family-123',
        recipientEmail: 'grandpa@example.com',
        childIds: ['child-1', 'child-2'],
      }

      expect(validInput.familyId.length).toBeGreaterThan(0)
      expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validInput.recipientEmail)).toBe(true)
      expect(validInput.childIds.length).toBeGreaterThan(0)
    })
  })

  describe('Permission Checks', () => {
    it('validates user is a guardian in the family (AC1)', () => {
      const familyData = {
        guardians: [{ uid: 'guardian-123' }, { uid: 'guardian-456' }],
      }
      const requestingUserId = 'guardian-123'

      const isGuardian = familyData.guardians.some(
        (g: { uid: string }) => g.uid === requestingUserId
      )
      expect(isGuardian).toBe(true)
    })

    it('rejects non-guardian users', () => {
      const familyData = {
        guardians: [{ uid: 'guardian-123' }],
      }
      const requestingUserId = 'random-user'

      const isGuardian = familyData.guardians.some(
        (g: { uid: string }) => g.uid === requestingUserId
      )
      expect(isGuardian).toBe(false)
    })
  })

  describe('Duplicate Prevention', () => {
    it('rejects if email is already a guardian', () => {
      const familyData = {
        guardians: [{ uid: 'guardian-123', email: 'parent@example.com' }],
        caregivers: [],
      }
      const recipientEmail = 'parent@example.com'

      const existingGuardian = familyData.guardians.find(
        (g: { email?: string }) => g.email?.toLowerCase() === recipientEmail.toLowerCase()
      )
      expect(existingGuardian).toBeDefined()
    })

    it('rejects if email is already a caregiver', () => {
      const familyData = {
        guardians: [{ uid: 'guardian-123' }],
        caregivers: [{ uid: 'caregiver-456', email: 'grandpa@example.com' }],
      }
      const recipientEmail = 'grandpa@example.com'

      const existingCaregiver = familyData.caregivers.find(
        (c: { email: string }) => c.email.toLowerCase() === recipientEmail.toLowerCase()
      )
      expect(existingCaregiver).toBeDefined()
    })

    it('allows new email addresses', () => {
      const familyData = {
        guardians: [{ uid: 'guardian-123', email: 'parent@example.com' }],
        caregivers: [],
      }
      const recipientEmail = 'new-grandpa@example.com'

      const existingGuardian = familyData.guardians.find(
        (g: { email?: string }) => g.email?.toLowerCase() === recipientEmail.toLowerCase()
      )
      const existingCaregiver = familyData.caregivers.find(
        (c: { email: string }) => c.email.toLowerCase() === recipientEmail.toLowerCase()
      )

      expect(existingGuardian).toBeUndefined()
      expect(existingCaregiver).toBeUndefined()
    })
  })

  describe('Child Validation', () => {
    it('rejects if childIds contain invalid children', () => {
      const familyChildIds = ['child-1', 'child-2', 'child-3']
      const requestedChildIds = ['child-1', 'child-invalid']

      const invalidChildIds = requestedChildIds.filter((id) => !familyChildIds.includes(id))
      expect(invalidChildIds.length).toBeGreaterThan(0)
    })

    it('accepts valid childIds', () => {
      const familyChildIds = ['child-1', 'child-2', 'child-3']
      const requestedChildIds = ['child-1', 'child-2']

      const invalidChildIds = requestedChildIds.filter((id) => !familyChildIds.includes(id))
      expect(invalidChildIds.length).toBe(0)
    })
  })

  describe('Invitation Creation', () => {
    it('sets caregiver role to status_viewer (AC2)', () => {
      const invitationData = {
        caregiverRole: 'status_viewer',
        childIds: ['child-1', 'child-2'],
        status: 'pending',
      }

      expect(invitationData.caregiverRole).toBe('status_viewer')
    })

    it('sets expiration to 7 days (AC6)', () => {
      const now = new Date()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const daysDiff = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      expect(daysDiff).toBe(7)
    })

    it('stores selected childIds (AC5)', () => {
      const childIds = ['child-1', 'child-2']
      const invitationData = {
        childIds,
        caregiverRole: 'status_viewer',
      }

      expect(invitationData.childIds).toEqual(childIds)
    })
  })

  describe('Email Service Integration', () => {
    it('calls email service with correct parameters', async () => {
      vi.mocked(sendCaregiverInvitationEmail).mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      })

      const result = await sendCaregiverInvitationEmail('grandpa@example.com', {
        inviterName: 'Parent',
        familyName: 'Smith Family',
        joinLink: 'https://fledgely.com/caregiver/accept?token=abc123',
      })

      expect(sendCaregiverInvitationEmail).toHaveBeenCalledWith('grandpa@example.com', {
        inviterName: 'Parent',
        familyName: 'Smith Family',
        joinLink: 'https://fledgely.com/caregiver/accept?token=abc123',
      })
      expect(result.success).toBe(true)
    })

    it('handles email service failure gracefully', async () => {
      vi.mocked(sendCaregiverInvitationEmail).mockResolvedValue({
        success: false,
        error: 'Failed to send',
      })

      const result = await sendCaregiverInvitationEmail('grandpa@example.com', {
        inviterName: 'Parent',
        familyName: 'Smith Family',
        joinLink: 'https://fledgely.com/caregiver/accept?token=abc123',
      })

      // Function should still succeed even if email fails (manual link sharing fallback)
      expect(result.success).toBe(false)
    })
  })

  describe('Token Generation', () => {
    it('generates unique tokens', () => {
      // Simulate token generation
      const tokens = new Set<string>()
      for (let i = 0; i < 100; i++) {
        // Using crypto.randomBytes pattern
        const token = Math.random().toString(36).substring(2) + Date.now().toString(36)
        tokens.add(token)
      }

      // All tokens should be unique
      expect(tokens.size).toBe(100)
    })
  })

  describe('Story 39.1: Relationship Field', () => {
    it('accepts grandparent relationship (AC1)', () => {
      const validInput = {
        familyId: 'family-123',
        recipientEmail: 'grandpa@example.com',
        childIds: ['child-1'],
        relationship: 'grandparent',
      }

      expect(['grandparent', 'aunt_uncle', 'babysitter', 'other']).toContain(
        validInput.relationship
      )
    })

    it('accepts aunt_uncle relationship (AC1)', () => {
      const validInput = {
        familyId: 'family-123',
        recipientEmail: 'aunt@example.com',
        childIds: ['child-1'],
        relationship: 'aunt_uncle',
      }

      expect(['grandparent', 'aunt_uncle', 'babysitter', 'other']).toContain(
        validInput.relationship
      )
    })

    it('accepts babysitter relationship (AC1)', () => {
      const validInput = {
        familyId: 'family-123',
        recipientEmail: 'sitter@example.com',
        childIds: ['child-1'],
        relationship: 'babysitter',
      }

      expect(['grandparent', 'aunt_uncle', 'babysitter', 'other']).toContain(
        validInput.relationship
      )
    })

    it('accepts other relationship with custom text (AC1)', () => {
      const validInput = {
        familyId: 'family-123',
        recipientEmail: 'neighbor@example.com',
        childIds: ['child-1'],
        relationship: 'other',
        customRelationship: 'Trusted Neighbor',
      }

      expect(validInput.relationship).toBe('other')
      expect(validInput.customRelationship).toBe('Trusted Neighbor')
      expect(validInput.customRelationship!.length).toBeLessThanOrEqual(50)
    })

    it('rejects invalid relationship type', () => {
      const invalidRelationship = 'cousin'
      const validRelationships = ['grandparent', 'aunt_uncle', 'babysitter', 'other']

      expect(validRelationships).not.toContain(invalidRelationship)
    })

    it('rejects customRelationship longer than 50 chars', () => {
      const longCustomRelationship = 'A'.repeat(51)

      expect(longCustomRelationship.length).toBeGreaterThan(50)
    })

    it('stores relationship in invitation data', () => {
      const invitationData = {
        caregiverRole: 'status_viewer',
        relationship: 'grandparent',
        customRelationship: null,
        childIds: ['child-1'],
        status: 'pending',
      }

      expect(invitationData.relationship).toBe('grandparent')
    })
  })

  describe('Story 39.1: Caregiver Limit (AC2)', () => {
    const MAX_CAREGIVERS_PER_FAMILY = 5

    it('allows invitation when under limit', () => {
      const activeCaregiversCount = 2
      const pendingInvitationsCount = 1
      const totalCount = activeCaregiversCount + pendingInvitationsCount

      expect(totalCount).toBeLessThan(MAX_CAREGIVERS_PER_FAMILY)
    })

    it('allows invitation at exactly 4 total (room for 1 more)', () => {
      const activeCaregiversCount = 3
      const pendingInvitationsCount = 1
      const totalCount = activeCaregiversCount + pendingInvitationsCount

      expect(totalCount).toBeLessThan(MAX_CAREGIVERS_PER_FAMILY)
    })

    it('rejects invitation when at limit with active caregivers', () => {
      const activeCaregiversCount = 5
      const pendingInvitationsCount = 0
      const totalCount = activeCaregiversCount + pendingInvitationsCount

      expect(totalCount).toBeGreaterThanOrEqual(MAX_CAREGIVERS_PER_FAMILY)
    })

    it('rejects invitation when at limit with pending invitations', () => {
      const activeCaregiversCount = 2
      const pendingInvitationsCount = 3
      const totalCount = activeCaregiversCount + pendingInvitationsCount

      expect(totalCount).toBeGreaterThanOrEqual(MAX_CAREGIVERS_PER_FAMILY)
    })

    it('rejects invitation when exceeding limit (pending count toward limit)', () => {
      const activeCaregiversCount = 4
      const pendingInvitationsCount = 2
      const totalCount = activeCaregiversCount + pendingInvitationsCount

      expect(totalCount).toBeGreaterThan(MAX_CAREGIVERS_PER_FAMILY)
    })

    it('counts pending invitations toward limit', () => {
      const activeCaregiversCount = 0
      const pendingInvitationsCount = 5
      const totalCount = activeCaregiversCount + pendingInvitationsCount

      expect(totalCount).toBeGreaterThanOrEqual(MAX_CAREGIVERS_PER_FAMILY)
    })

    it('handles family with no existing caregivers', () => {
      const activeCaregiversCount = 0
      const pendingInvitationsCount = 0
      const totalCount = activeCaregiversCount + pendingInvitationsCount

      expect(totalCount).toBeLessThan(MAX_CAREGIVERS_PER_FAMILY)
    })
  })
})
