/**
 * Caregiver Schema Tests - Story 19D.1, Story 39.1
 *
 * Task 7.1: Test caregiver schemas
 * Story 39.1: Added relationship field tests
 */

import { describe, it, expect } from 'vitest'
import {
  caregiverRoleSchema,
  caregiverRelationshipSchema,
  MAX_CAREGIVERS_PER_FAMILY,
  accessWindowSchema,
  familyCaregiverSchema,
  caregiverInvitationStatusSchema,
  caregiverInvitationSchema,
  sendCaregiverInvitationInputSchema,
  acceptCaregiverInvitationInputSchema,
  acceptCaregiverInvitationResultSchema,
  familySchema,
} from './index'

describe('Caregiver Schemas - Story 19D.1', () => {
  describe('caregiverRoleSchema', () => {
    it('should accept status_viewer role', () => {
      expect(caregiverRoleSchema.parse('status_viewer')).toBe('status_viewer')
    })

    it('should reject invalid roles', () => {
      expect(() => caregiverRoleSchema.parse('admin')).toThrow()
      expect(() => caregiverRoleSchema.parse('guardian')).toThrow()
      expect(() => caregiverRoleSchema.parse('')).toThrow()
    })
  })

  describe('caregiverRelationshipSchema - Story 39.1', () => {
    it('should accept grandparent relationship', () => {
      expect(caregiverRelationshipSchema.parse('grandparent')).toBe('grandparent')
    })

    it('should accept aunt_uncle relationship', () => {
      expect(caregiverRelationshipSchema.parse('aunt_uncle')).toBe('aunt_uncle')
    })

    it('should accept babysitter relationship', () => {
      expect(caregiverRelationshipSchema.parse('babysitter')).toBe('babysitter')
    })

    it('should accept other relationship', () => {
      expect(caregiverRelationshipSchema.parse('other')).toBe('other')
    })

    it('should reject invalid relationships', () => {
      expect(() => caregiverRelationshipSchema.parse('parent')).toThrow()
      expect(() => caregiverRelationshipSchema.parse('friend')).toThrow()
      expect(() => caregiverRelationshipSchema.parse('')).toThrow()
    })
  })

  describe('MAX_CAREGIVERS_PER_FAMILY - Story 39.1', () => {
    it('should be set to 5', () => {
      expect(MAX_CAREGIVERS_PER_FAMILY).toBe(5)
    })
  })

  describe('accessWindowSchema', () => {
    it('should accept valid access window', () => {
      const window = {
        dayOfWeek: 'saturday',
        startTime: '14:00',
        endTime: '18:00',
        timezone: 'America/New_York',
      }
      expect(accessWindowSchema.parse(window)).toEqual(window)
    })

    it('should accept all days of week', () => {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      days.forEach((day) => {
        const window = {
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
          timezone: 'UTC',
        }
        expect(accessWindowSchema.parse(window).dayOfWeek).toBe(day)
      })
    })

    it('should reject invalid time format', () => {
      const window = {
        dayOfWeek: 'monday',
        startTime: '9:00', // Missing leading zero
        endTime: '17:00',
        timezone: 'UTC',
      }
      expect(() => accessWindowSchema.parse(window)).toThrow()
    })

    it('should reject invalid day', () => {
      const window = {
        dayOfWeek: 'Funday',
        startTime: '09:00',
        endTime: '17:00',
        timezone: 'UTC',
      }
      expect(() => accessWindowSchema.parse(window)).toThrow()
    })
  })

  describe('familyCaregiverSchema', () => {
    it('should accept valid caregiver with relationship', () => {
      const caregiver = {
        uid: 'caregiver-123',
        email: 'grandpa@example.com',
        displayName: 'Grandpa Joe',
        role: 'status_viewer',
        relationship: 'grandparent',
        childIds: ['child-1', 'child-2'],
        addedAt: new Date(),
        addedByUid: 'parent-123',
      }
      expect(familyCaregiverSchema.parse(caregiver)).toMatchObject({
        uid: 'caregiver-123',
        role: 'status_viewer',
        relationship: 'grandparent',
      })
    })

    it('should accept caregiver with other relationship and custom text', () => {
      const caregiver = {
        uid: 'caregiver-123',
        email: 'neighbor@example.com',
        displayName: 'Mrs. Smith',
        role: 'status_viewer',
        relationship: 'other',
        customRelationship: 'Trusted Neighbor',
        childIds: ['child-1'],
        addedAt: new Date(),
        addedByUid: 'parent-123',
      }
      const parsed = familyCaregiverSchema.parse(caregiver)
      expect(parsed.relationship).toBe('other')
      expect(parsed.customRelationship).toBe('Trusted Neighbor')
    })

    it('should accept caregiver with access windows', () => {
      const caregiver = {
        uid: 'caregiver-123',
        email: 'grandma@example.com',
        displayName: null,
        role: 'status_viewer',
        relationship: 'grandparent',
        childIds: ['child-1'],
        accessWindows: [
          {
            dayOfWeek: 'saturday',
            startTime: '14:00',
            endTime: '18:00',
            timezone: 'America/New_York',
          },
        ],
        addedAt: new Date(),
        addedByUid: 'parent-123',
      }
      expect(familyCaregiverSchema.parse(caregiver).accessWindows).toHaveLength(1)
    })

    it('should accept caregiver without access windows', () => {
      const caregiver = {
        uid: 'caregiver-123',
        email: 'aunt@example.com',
        displayName: 'Aunt Jane',
        role: 'status_viewer',
        relationship: 'aunt_uncle',
        childIds: ['child-1'],
        addedAt: new Date(),
        addedByUid: 'parent-123',
      }
      expect(familyCaregiverSchema.parse(caregiver).accessWindows).toBeUndefined()
    })

    it('should require relationship field', () => {
      const caregiver = {
        uid: 'caregiver-123',
        email: 'grandpa@example.com',
        displayName: 'Grandpa Joe',
        role: 'status_viewer',
        childIds: ['child-1'],
        addedAt: new Date(),
        addedByUid: 'parent-123',
      }
      expect(() => familyCaregiverSchema.parse(caregiver)).toThrow()
    })

    it('should reject customRelationship longer than 50 chars', () => {
      const caregiver = {
        uid: 'caregiver-123',
        email: 'neighbor@example.com',
        displayName: 'Mrs. Smith',
        role: 'status_viewer',
        relationship: 'other',
        customRelationship: 'A'.repeat(51),
        childIds: ['child-1'],
        addedAt: new Date(),
        addedByUid: 'parent-123',
      }
      expect(() => familyCaregiverSchema.parse(caregiver)).toThrow()
    })
  })

  describe('caregiverInvitationStatusSchema', () => {
    it('should accept all valid statuses', () => {
      expect(caregiverInvitationStatusSchema.parse('pending')).toBe('pending')
      expect(caregiverInvitationStatusSchema.parse('accepted')).toBe('accepted')
      expect(caregiverInvitationStatusSchema.parse('expired')).toBe('expired')
      expect(caregiverInvitationStatusSchema.parse('revoked')).toBe('revoked')
    })

    it('should reject invalid status', () => {
      expect(() => caregiverInvitationStatusSchema.parse('cancelled')).toThrow()
    })
  })

  describe('caregiverInvitationSchema', () => {
    it('should accept valid invitation with relationship', () => {
      const invitation = {
        id: 'inv-123',
        familyId: 'family-456',
        inviterUid: 'parent-789',
        inviterName: 'Mom',
        familyName: 'Smith Family',
        token: 'secure-token-abc',
        status: 'pending',
        recipientEmail: 'grandpa@example.com',
        caregiverRole: 'status_viewer',
        relationship: 'grandparent',
        childIds: ['child-1', 'child-2'],
        emailSentAt: new Date(),
        acceptedAt: null,
        acceptedByUid: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(caregiverInvitationSchema.parse(invitation)).toMatchObject({
        id: 'inv-123',
        status: 'pending',
        relationship: 'grandparent',
      })
    })

    it('should accept invitation with other relationship and custom text', () => {
      const invitation = {
        id: 'inv-123',
        familyId: 'family-456',
        inviterUid: 'parent-789',
        inviterName: 'Mom',
        familyName: 'Smith Family',
        token: 'secure-token-abc',
        status: 'pending',
        recipientEmail: 'neighbor@example.com',
        caregiverRole: 'status_viewer',
        relationship: 'other',
        customRelationship: 'Family Friend',
        childIds: ['child-1'],
        emailSentAt: new Date(),
        acceptedAt: null,
        acceptedByUid: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const parsed = caregiverInvitationSchema.parse(invitation)
      expect(parsed.relationship).toBe('other')
      expect(parsed.customRelationship).toBe('Family Friend')
    })

    it('should require relationship field', () => {
      const invitation = {
        id: 'inv-123',
        familyId: 'family-456',
        inviterUid: 'parent-789',
        inviterName: 'Mom',
        familyName: 'Smith Family',
        token: 'secure-token-abc',
        status: 'pending',
        recipientEmail: 'grandpa@example.com',
        caregiverRole: 'status_viewer',
        childIds: ['child-1'],
        emailSentAt: null,
        acceptedAt: null,
        acceptedByUid: null,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(() => caregiverInvitationSchema.parse(invitation)).toThrow()
    })

    it('should require valid email', () => {
      const invitation = {
        id: 'inv-123',
        familyId: 'family-456',
        inviterUid: 'parent-789',
        inviterName: 'Mom',
        familyName: 'Smith Family',
        token: 'secure-token-abc',
        status: 'pending',
        recipientEmail: 'not-an-email',
        caregiverRole: 'status_viewer',
        relationship: 'grandparent',
        childIds: ['child-1'],
        emailSentAt: null,
        acceptedAt: null,
        acceptedByUid: null,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(() => caregiverInvitationSchema.parse(invitation)).toThrow()
    })
  })

  describe('sendCaregiverInvitationInputSchema', () => {
    it('should accept valid input with relationship', () => {
      const input = {
        familyId: 'family-123',
        recipientEmail: 'grandpa@example.com',
        childIds: ['child-1', 'child-2'],
        relationship: 'grandparent',
      }
      expect(sendCaregiverInvitationInputSchema.parse(input)).toEqual(input)
    })

    it('should accept input with other relationship and custom text', () => {
      const input = {
        familyId: 'family-123',
        recipientEmail: 'neighbor@example.com',
        childIds: ['child-1'],
        relationship: 'other',
        customRelationship: 'Trusted Neighbor',
      }
      const parsed = sendCaregiverInvitationInputSchema.parse(input)
      expect(parsed.relationship).toBe('other')
      expect(parsed.customRelationship).toBe('Trusted Neighbor')
    })

    it('should require relationship field', () => {
      const input = {
        familyId: 'family-123',
        recipientEmail: 'grandpa@example.com',
        childIds: ['child-1'],
      }
      expect(() => sendCaregiverInvitationInputSchema.parse(input)).toThrow()
    })

    it('should require at least one child (AC5)', () => {
      const input = {
        familyId: 'family-123',
        recipientEmail: 'grandpa@example.com',
        childIds: [],
        relationship: 'grandparent',
      }
      expect(() => sendCaregiverInvitationInputSchema.parse(input)).toThrow()
    })
  })

  describe('acceptCaregiverInvitationInputSchema', () => {
    it('should accept valid token', () => {
      const input = { token: 'secure-token-xyz' }
      expect(acceptCaregiverInvitationInputSchema.parse(input)).toEqual(input)
    })

    it('should reject empty token', () => {
      expect(() => acceptCaregiverInvitationInputSchema.parse({ token: '' })).toThrow()
    })
  })

  describe('acceptCaregiverInvitationResultSchema', () => {
    it('should accept valid result', () => {
      const result = {
        success: true,
        familyId: 'family-123',
        familyName: 'Smith Family',
        childNames: ['Emma', 'Jack'],
        role: 'status_viewer',
      }
      expect(acceptCaregiverInvitationResultSchema.parse(result)).toEqual(result)
    })
  })

  describe('familySchema with caregivers', () => {
    it('should accept family without caregivers', () => {
      const family = {
        id: 'family-123',
        name: 'Smith Family',
        guardians: [
          {
            uid: 'guardian-1',
            role: 'primary_guardian',
            addedAt: new Date(),
          },
        ],
        guardianUids: ['guardian-1'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(familySchema.parse(family).caregivers).toBeUndefined()
    })

    it('should accept family with caregivers', () => {
      const family = {
        id: 'family-123',
        name: 'Smith Family',
        guardians: [
          {
            uid: 'guardian-1',
            role: 'primary_guardian',
            addedAt: new Date(),
          },
        ],
        guardianUids: ['guardian-1'],
        caregivers: [
          {
            uid: 'caregiver-1',
            email: 'grandpa@example.com',
            displayName: 'Grandpa Joe',
            role: 'status_viewer',
            relationship: 'grandparent',
            childIds: ['child-1'],
            addedAt: new Date(),
            addedByUid: 'guardian-1',
          },
        ],
        caregiverUids: ['caregiver-1'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(familySchema.parse(family).caregivers).toHaveLength(1)
      expect(familySchema.parse(family).caregiverUids).toContain('caregiver-1')
    })

    it('should accept family with multiple caregivers up to limit', () => {
      const family = {
        id: 'family-123',
        name: 'Smith Family',
        guardians: [
          {
            uid: 'guardian-1',
            role: 'primary_guardian',
            addedAt: new Date(),
          },
        ],
        guardianUids: ['guardian-1'],
        caregivers: [
          {
            uid: 'caregiver-1',
            email: 'grandpa@example.com',
            displayName: 'Grandpa Joe',
            role: 'status_viewer',
            relationship: 'grandparent',
            childIds: ['child-1'],
            addedAt: new Date(),
            addedByUid: 'guardian-1',
          },
          {
            uid: 'caregiver-2',
            email: 'grandma@example.com',
            displayName: 'Grandma Jane',
            role: 'status_viewer',
            relationship: 'grandparent',
            childIds: ['child-1'],
            addedAt: new Date(),
            addedByUid: 'guardian-1',
          },
          {
            uid: 'caregiver-3',
            email: 'aunt@example.com',
            displayName: 'Aunt Sarah',
            role: 'status_viewer',
            relationship: 'aunt_uncle',
            childIds: ['child-1'],
            addedAt: new Date(),
            addedByUid: 'guardian-1',
          },
        ],
        caregiverUids: ['caregiver-1', 'caregiver-2', 'caregiver-3'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(familySchema.parse(family).caregivers).toHaveLength(3)
      // Note: The 5 limit is enforced at the Cloud Function level, not schema level
    })
  })
})
