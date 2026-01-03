/**
 * Caregiver Schema Tests - Story 19D.1, Story 39.1, Story 39.2, Story 39.3, Story 39.4
 *
 * Task 7.1: Test caregiver schemas
 * Story 39.1: Added relationship field tests
 * Story 39.2: Added permission configuration tests
 * Story 39.3: Added temporary access schema tests
 * Story 39.4: Added PIN and extension limit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  caregiverRoleSchema,
  caregiverRelationshipSchema,
  caregiverPermissionsSchema,
  DEFAULT_CAREGIVER_PERMISSIONS,
  MAX_CAREGIVERS_PER_FAMILY,
  accessWindowSchema,
  familyCaregiverSchema,
  caregiverInvitationStatusSchema,
  caregiverInvitationSchema,
  sendCaregiverInvitationInputSchema,
  acceptCaregiverInvitationInputSchema,
  acceptCaregiverInvitationResultSchema,
  familySchema,
  // Story 39.3: Temporary access schemas
  temporaryAccessPresetSchema,
  temporaryAccessStatusSchema,
  temporaryAccessGrantSchema,
  grantTemporaryAccessInputSchema,
  revokeTemporaryAccessInputSchema,
  MIN_TEMP_ACCESS_DURATION_HOURS,
  MAX_TEMP_ACCESS_DURATION_DAYS,
  isTemporaryAccessActive,
  isTemporaryAccessPending,
  getTemporaryAccessTimeRemaining,
  formatTemporaryAccessDuration,
  type TemporaryAccessGrant,
  // Story 39.4: PIN and extension schemas
  MAX_PIN_ATTEMPTS,
  PIN_LOCKOUT_MINUTES,
  caregiverPinConfigSchema,
  extensionLimitConfigSchema,
  DEFAULT_EXTENSION_LIMITS,
  caregiverExtensionLogSchema,
  setCaregiverPinInputSchema,
  approveExtensionWithPinInputSchema,
  familyCaregiverWithPinSchema,
  // Story 39.5: Flag viewing schemas
  caregiverFlagViewLogSchema,
  logCaregiverFlagViewInputSchema,
  markFlagReviewedByCaregiverInputSchema,
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

  describe('caregiverPermissionsSchema - Story 39.2', () => {
    it('should accept valid permissions with both false', () => {
      const permissions = {
        canExtendTime: false,
        canViewFlags: false,
      }
      expect(caregiverPermissionsSchema.parse(permissions)).toEqual(permissions)
    })

    it('should accept valid permissions with both true', () => {
      const permissions = {
        canExtendTime: true,
        canViewFlags: true,
      }
      expect(caregiverPermissionsSchema.parse(permissions)).toEqual(permissions)
    })

    it('should accept mixed permissions', () => {
      const permissions = {
        canExtendTime: true,
        canViewFlags: false,
      }
      expect(caregiverPermissionsSchema.parse(permissions)).toEqual(permissions)
    })

    it('should default canExtendTime to false', () => {
      const permissions = caregiverPermissionsSchema.parse({})
      expect(permissions.canExtendTime).toBe(false)
    })

    it('should default canViewFlags to false', () => {
      const permissions = caregiverPermissionsSchema.parse({})
      expect(permissions.canViewFlags).toBe(false)
    })

    it('should reject non-boolean values', () => {
      expect(() =>
        caregiverPermissionsSchema.parse({
          canExtendTime: 'yes',
          canViewFlags: false,
        })
      ).toThrow()
    })
  })

  describe('DEFAULT_CAREGIVER_PERMISSIONS - Story 39.2', () => {
    it('should have canExtendTime as false', () => {
      expect(DEFAULT_CAREGIVER_PERMISSIONS.canExtendTime).toBe(false)
    })

    it('should have canViewFlags as false', () => {
      expect(DEFAULT_CAREGIVER_PERMISSIONS.canViewFlags).toBe(false)
    })
  })

  describe('familyCaregiverSchema with permissions - Story 39.2', () => {
    it('should accept caregiver with permissions', () => {
      const caregiver = {
        uid: 'caregiver-123',
        email: 'grandpa@example.com',
        displayName: 'Grandpa Joe',
        role: 'status_viewer',
        relationship: 'grandparent',
        permissions: {
          canExtendTime: true,
          canViewFlags: false,
        },
        childIds: ['child-1'],
        addedAt: new Date(),
        addedByUid: 'parent-123',
      }
      const parsed = familyCaregiverSchema.parse(caregiver)
      expect(parsed.permissions?.canExtendTime).toBe(true)
      expect(parsed.permissions?.canViewFlags).toBe(false)
    })

    it('should accept caregiver without permissions (defaults)', () => {
      const caregiver = {
        uid: 'caregiver-123',
        email: 'grandpa@example.com',
        displayName: 'Grandpa Joe',
        role: 'status_viewer',
        relationship: 'grandparent',
        childIds: ['child-1'],
        addedAt: new Date(),
        addedByUid: 'parent-123',
      }
      const parsed = familyCaregiverSchema.parse(caregiver)
      expect(parsed.permissions).toBeUndefined()
    })

    it('should accept caregiver with full permissions', () => {
      const caregiver = {
        uid: 'caregiver-123',
        email: 'babysitter@example.com',
        displayName: 'Mary',
        role: 'status_viewer',
        relationship: 'babysitter',
        permissions: {
          canExtendTime: true,
          canViewFlags: true,
        },
        childIds: ['child-1', 'child-2'],
        addedAt: new Date(),
        addedByUid: 'parent-123',
      }
      const parsed = familyCaregiverSchema.parse(caregiver)
      expect(parsed.permissions?.canExtendTime).toBe(true)
      expect(parsed.permissions?.canViewFlags).toBe(true)
    })
  })
})

// ============================================
// Story 39.3: Temporary Caregiver Access Tests
// ============================================

describe('Temporary Access Schemas - Story 39.3', () => {
  describe('temporaryAccessPresetSchema', () => {
    it('should accept today_only preset', () => {
      expect(temporaryAccessPresetSchema.parse('today_only')).toBe('today_only')
    })

    it('should accept this_weekend preset', () => {
      expect(temporaryAccessPresetSchema.parse('this_weekend')).toBe('this_weekend')
    })

    it('should accept custom preset', () => {
      expect(temporaryAccessPresetSchema.parse('custom')).toBe('custom')
    })

    it('should reject invalid preset', () => {
      expect(() => temporaryAccessPresetSchema.parse('next_week')).toThrow()
      expect(() => temporaryAccessPresetSchema.parse('')).toThrow()
    })
  })

  describe('temporaryAccessStatusSchema', () => {
    it('should accept all valid statuses', () => {
      expect(temporaryAccessStatusSchema.parse('pending')).toBe('pending')
      expect(temporaryAccessStatusSchema.parse('active')).toBe('active')
      expect(temporaryAccessStatusSchema.parse('expired')).toBe('expired')
      expect(temporaryAccessStatusSchema.parse('revoked')).toBe('revoked')
    })

    it('should reject invalid status', () => {
      expect(() => temporaryAccessStatusSchema.parse('cancelled')).toThrow()
      expect(() => temporaryAccessStatusSchema.parse('')).toThrow()
    })
  })

  describe('temporaryAccessGrantSchema', () => {
    const validGrant = {
      id: 'grant-123',
      familyId: 'family-456',
      caregiverUid: 'caregiver-789',
      grantedByUid: 'parent-123',
      startAt: new Date('2026-01-04T17:00:00Z'),
      endAt: new Date('2026-01-06T22:00:00Z'),
      preset: 'this_weekend',
      timezone: 'America/New_York',
      status: 'active',
      createdAt: new Date(),
    }

    it('should accept valid grant', () => {
      const parsed = temporaryAccessGrantSchema.parse(validGrant)
      expect(parsed.id).toBe('grant-123')
      expect(parsed.status).toBe('active')
      expect(parsed.preset).toBe('this_weekend')
    })

    it('should accept grant with revocation details', () => {
      const revokedGrant = {
        ...validGrant,
        status: 'revoked',
        revokedAt: new Date(),
        revokedByUid: 'parent-123',
        revokedReason: 'No longer needed',
      }
      const parsed = temporaryAccessGrantSchema.parse(revokedGrant)
      expect(parsed.status).toBe('revoked')
      expect(parsed.revokedReason).toBe('No longer needed')
    })

    it('should accept grant without revocation details', () => {
      const parsed = temporaryAccessGrantSchema.parse(validGrant)
      expect(parsed.revokedAt).toBeUndefined()
      expect(parsed.revokedByUid).toBeUndefined()
      expect(parsed.revokedReason).toBeUndefined()
    })

    it('should reject grant with revocation reason too long', () => {
      const invalidGrant = {
        ...validGrant,
        revokedReason: 'A'.repeat(201),
      }
      expect(() => temporaryAccessGrantSchema.parse(invalidGrant)).toThrow()
    })

    it('should accept revocation reason at max length', () => {
      const grantWithMaxReason = {
        ...validGrant,
        status: 'revoked',
        revokedReason: 'A'.repeat(200),
      }
      const parsed = temporaryAccessGrantSchema.parse(grantWithMaxReason)
      expect(parsed.revokedReason).toHaveLength(200)
    })

    it('should require all mandatory fields', () => {
      const incompleteGrant = {
        id: 'grant-123',
        familyId: 'family-456',
        // missing other required fields
      }
      expect(() => temporaryAccessGrantSchema.parse(incompleteGrant)).toThrow()
    })
  })

  describe('grantTemporaryAccessInputSchema', () => {
    it('should accept valid input with preset', () => {
      const input = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        preset: 'today_only',
        timezone: 'America/New_York',
      }
      expect(grantTemporaryAccessInputSchema.parse(input)).toEqual(input)
    })

    it('should accept input with custom dates', () => {
      const input = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        preset: 'custom',
        startAt: new Date('2026-01-04T10:00:00Z'),
        endAt: new Date('2026-01-04T18:00:00Z'),
        timezone: 'America/New_York',
      }
      const parsed = grantTemporaryAccessInputSchema.parse(input)
      expect(parsed.preset).toBe('custom')
      expect(parsed.startAt).toBeDefined()
      expect(parsed.endAt).toBeDefined()
    })

    it('should accept input without custom dates for presets', () => {
      const input = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        preset: 'this_weekend',
        timezone: 'UTC',
      }
      const parsed = grantTemporaryAccessInputSchema.parse(input)
      expect(parsed.startAt).toBeUndefined()
      expect(parsed.endAt).toBeUndefined()
    })

    it('should require timezone', () => {
      const input = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        preset: 'today_only',
      }
      expect(() => grantTemporaryAccessInputSchema.parse(input)).toThrow()
    })
  })

  describe('revokeTemporaryAccessInputSchema', () => {
    it('should accept valid revocation input', () => {
      const input = {
        familyId: 'family-123',
        grantId: 'grant-456',
      }
      expect(revokeTemporaryAccessInputSchema.parse(input)).toEqual(input)
    })

    it('should accept revocation with reason', () => {
      const input = {
        familyId: 'family-123',
        grantId: 'grant-456',
        reason: 'Changed plans',
      }
      const parsed = revokeTemporaryAccessInputSchema.parse(input)
      expect(parsed.reason).toBe('Changed plans')
    })

    it('should reject reason too long', () => {
      const input = {
        familyId: 'family-123',
        grantId: 'grant-456',
        reason: 'A'.repeat(201),
      }
      expect(() => revokeTemporaryAccessInputSchema.parse(input)).toThrow()
    })
  })

  describe('Duration Constants', () => {
    it('MIN_TEMP_ACCESS_DURATION_HOURS should be 1', () => {
      expect(MIN_TEMP_ACCESS_DURATION_HOURS).toBe(1)
    })

    it('MAX_TEMP_ACCESS_DURATION_DAYS should be 7', () => {
      expect(MAX_TEMP_ACCESS_DURATION_DAYS).toBe(7)
    })
  })
})

describe('Temporary Access Helper Functions - Story 39.3', () => {
  describe('isTemporaryAccessActive', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-05T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return true for active grant within time window', () => {
      const grant: TemporaryAccessGrant = {
        id: 'grant-123',
        familyId: 'family-456',
        caregiverUid: 'caregiver-789',
        grantedByUid: 'parent-123',
        startAt: new Date('2026-01-04T17:00:00Z'),
        endAt: new Date('2026-01-06T22:00:00Z'),
        preset: 'this_weekend',
        timezone: 'America/New_York',
        status: 'active',
        createdAt: new Date('2026-01-04T10:00:00Z'),
      }
      expect(isTemporaryAccessActive(grant)).toBe(true)
    })

    it('should return false for expired grant', () => {
      const grant: TemporaryAccessGrant = {
        id: 'grant-123',
        familyId: 'family-456',
        caregiverUid: 'caregiver-789',
        grantedByUid: 'parent-123',
        startAt: new Date('2026-01-01T17:00:00Z'),
        endAt: new Date('2026-01-02T22:00:00Z'),
        preset: 'custom',
        timezone: 'America/New_York',
        status: 'active',
        createdAt: new Date('2026-01-01T10:00:00Z'),
      }
      expect(isTemporaryAccessActive(grant)).toBe(false)
    })

    it('should return false for pending grant before start', () => {
      const grant: TemporaryAccessGrant = {
        id: 'grant-123',
        familyId: 'family-456',
        caregiverUid: 'caregiver-789',
        grantedByUid: 'parent-123',
        startAt: new Date('2026-01-10T17:00:00Z'),
        endAt: new Date('2026-01-10T22:00:00Z'),
        preset: 'custom',
        timezone: 'America/New_York',
        status: 'active',
        createdAt: new Date('2026-01-04T10:00:00Z'),
      }
      expect(isTemporaryAccessActive(grant)).toBe(false)
    })

    it('should return false for revoked grant', () => {
      const grant: TemporaryAccessGrant = {
        id: 'grant-123',
        familyId: 'family-456',
        caregiverUid: 'caregiver-789',
        grantedByUid: 'parent-123',
        startAt: new Date('2026-01-04T17:00:00Z'),
        endAt: new Date('2026-01-06T22:00:00Z'),
        preset: 'this_weekend',
        timezone: 'America/New_York',
        status: 'revoked',
        revokedAt: new Date('2026-01-05T10:00:00Z'),
        createdAt: new Date('2026-01-04T10:00:00Z'),
      }
      expect(isTemporaryAccessActive(grant)).toBe(false)
    })
  })

  describe('isTemporaryAccessPending', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-05T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return true for pending grant before start time', () => {
      const grant: TemporaryAccessGrant = {
        id: 'grant-123',
        familyId: 'family-456',
        caregiverUid: 'caregiver-789',
        grantedByUid: 'parent-123',
        startAt: new Date('2026-01-10T17:00:00Z'),
        endAt: new Date('2026-01-10T22:00:00Z'),
        preset: 'custom',
        timezone: 'America/New_York',
        status: 'pending',
        createdAt: new Date('2026-01-04T10:00:00Z'),
      }
      expect(isTemporaryAccessPending(grant)).toBe(true)
    })

    it('should return false for active grant', () => {
      const grant: TemporaryAccessGrant = {
        id: 'grant-123',
        familyId: 'family-456',
        caregiverUid: 'caregiver-789',
        grantedByUid: 'parent-123',
        startAt: new Date('2026-01-04T17:00:00Z'),
        endAt: new Date('2026-01-06T22:00:00Z'),
        preset: 'this_weekend',
        timezone: 'America/New_York',
        status: 'active',
        createdAt: new Date('2026-01-04T10:00:00Z'),
      }
      expect(isTemporaryAccessPending(grant)).toBe(false)
    })

    it('should return false for pending grant after start time passed', () => {
      const grant: TemporaryAccessGrant = {
        id: 'grant-123',
        familyId: 'family-456',
        caregiverUid: 'caregiver-789',
        grantedByUid: 'parent-123',
        startAt: new Date('2026-01-04T17:00:00Z'),
        endAt: new Date('2026-01-06T22:00:00Z'),
        preset: 'this_weekend',
        timezone: 'America/New_York',
        status: 'pending',
        createdAt: new Date('2026-01-04T10:00:00Z'),
      }
      expect(isTemporaryAccessPending(grant)).toBe(false)
    })
  })

  describe('getTemporaryAccessTimeRemaining', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-05T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return time remaining for active grant', () => {
      const grant: TemporaryAccessGrant = {
        id: 'grant-123',
        familyId: 'family-456',
        caregiverUid: 'caregiver-789',
        grantedByUid: 'parent-123',
        startAt: new Date('2026-01-04T17:00:00Z'),
        endAt: new Date('2026-01-05T22:00:00Z'),
        preset: 'custom',
        timezone: 'America/New_York',
        status: 'active',
        createdAt: new Date('2026-01-04T10:00:00Z'),
      }
      const remaining = getTemporaryAccessTimeRemaining(grant)
      // 10 hours = 36,000,000 ms
      expect(remaining).toBe(10 * 60 * 60 * 1000)
    })

    it('should return null for inactive grant', () => {
      const grant: TemporaryAccessGrant = {
        id: 'grant-123',
        familyId: 'family-456',
        caregiverUid: 'caregiver-789',
        grantedByUid: 'parent-123',
        startAt: new Date('2026-01-01T17:00:00Z'),
        endAt: new Date('2026-01-02T22:00:00Z'),
        preset: 'custom',
        timezone: 'America/New_York',
        status: 'expired',
        createdAt: new Date('2026-01-01T10:00:00Z'),
      }
      expect(getTemporaryAccessTimeRemaining(grant)).toBeNull()
    })

    it('should return null for revoked grant', () => {
      const grant: TemporaryAccessGrant = {
        id: 'grant-123',
        familyId: 'family-456',
        caregiverUid: 'caregiver-789',
        grantedByUid: 'parent-123',
        startAt: new Date('2026-01-04T17:00:00Z'),
        endAt: new Date('2026-01-06T22:00:00Z'),
        preset: 'this_weekend',
        timezone: 'America/New_York',
        status: 'revoked',
        createdAt: new Date('2026-01-04T10:00:00Z'),
      }
      expect(getTemporaryAccessTimeRemaining(grant)).toBeNull()
    })
  })

  describe('formatTemporaryAccessDuration', () => {
    it('should format 1 hour', () => {
      const startAt = new Date('2026-01-05T10:00:00Z')
      const endAt = new Date('2026-01-05T11:00:00Z')
      expect(formatTemporaryAccessDuration(startAt, endAt)).toBe('1 hour')
    })

    it('should format multiple hours', () => {
      const startAt = new Date('2026-01-05T10:00:00Z')
      const endAt = new Date('2026-01-05T15:00:00Z')
      expect(formatTemporaryAccessDuration(startAt, endAt)).toBe('5 hours')
    })

    it('should format 1 day', () => {
      const startAt = new Date('2026-01-05T10:00:00Z')
      const endAt = new Date('2026-01-06T10:00:00Z')
      expect(formatTemporaryAccessDuration(startAt, endAt)).toBe('1 day')
    })

    it('should format multiple days', () => {
      const startAt = new Date('2026-01-05T10:00:00Z')
      const endAt = new Date('2026-01-08T10:00:00Z')
      expect(formatTemporaryAccessDuration(startAt, endAt)).toBe('3 days')
    })

    it('should format days with remaining hours', () => {
      const startAt = new Date('2026-01-05T10:00:00Z')
      const endAt = new Date('2026-01-06T15:00:00Z')
      expect(formatTemporaryAccessDuration(startAt, endAt)).toBe('1 day 5h')
    })

    it('should format multiple days with hours', () => {
      const startAt = new Date('2026-01-05T10:00:00Z')
      const endAt = new Date('2026-01-07T18:00:00Z')
      expect(formatTemporaryAccessDuration(startAt, endAt)).toBe('2 days 8h')
    })
  })
})

// ============================================
// Story 39.4: Caregiver PIN for Time Extension Tests
// ============================================

describe('Caregiver PIN Schemas - Story 39.4', () => {
  describe('PIN Security Constants', () => {
    it('MAX_PIN_ATTEMPTS should be 3', () => {
      expect(MAX_PIN_ATTEMPTS).toBe(3)
    })

    it('PIN_LOCKOUT_MINUTES should be 15', () => {
      expect(PIN_LOCKOUT_MINUTES).toBe(15)
    })
  })

  describe('caregiverPinConfigSchema', () => {
    it('should accept valid PIN config', () => {
      const config = {
        pinHash: '$2b$10$abcdefghijklmnopqrstuv',
        pinSetAt: new Date(),
        pinSetByUid: 'parent-123',
        failedAttempts: 0,
      }
      const parsed = caregiverPinConfigSchema.parse(config)
      expect(parsed.pinHash).toBe('$2b$10$abcdefghijklmnopqrstuv')
      expect(parsed.failedAttempts).toBe(0)
    })

    it('should accept config with lockout', () => {
      const config = {
        pinHash: '$2b$10$abcdefghijklmnopqrstuv',
        pinSetAt: new Date(),
        pinSetByUid: 'parent-123',
        failedAttempts: 3,
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      }
      const parsed = caregiverPinConfigSchema.parse(config)
      expect(parsed.failedAttempts).toBe(3)
      expect(parsed.lockedUntil).toBeDefined()
    })

    it('should default failedAttempts to 0', () => {
      const config = {
        pinHash: '$2b$10$abcdefghijklmnopqrstuv',
        pinSetAt: new Date(),
        pinSetByUid: 'parent-123',
      }
      const parsed = caregiverPinConfigSchema.parse(config)
      expect(parsed.failedAttempts).toBe(0)
    })

    it('should require pinHash', () => {
      const config = {
        pinSetAt: new Date(),
        pinSetByUid: 'parent-123',
      }
      expect(() => caregiverPinConfigSchema.parse(config)).toThrow()
    })

    it('should reject negative failedAttempts', () => {
      const config = {
        pinHash: '$2b$10$abcdefghijklmnopqrstuv',
        pinSetAt: new Date(),
        pinSetByUid: 'parent-123',
        failedAttempts: -1,
      }
      expect(() => caregiverPinConfigSchema.parse(config)).toThrow()
    })
  })

  describe('extensionLimitConfigSchema', () => {
    it('should accept valid extension limits', () => {
      const limits = {
        maxDurationMinutes: 60,
        maxDailyExtensions: 2,
      }
      const parsed = extensionLimitConfigSchema.parse(limits)
      expect(parsed.maxDurationMinutes).toBe(60)
      expect(parsed.maxDailyExtensions).toBe(2)
    })

    it('should accept 30 minute max duration', () => {
      const limits = { maxDurationMinutes: 30 }
      const parsed = extensionLimitConfigSchema.parse(limits)
      expect(parsed.maxDurationMinutes).toBe(30)
    })

    it('should accept 120 minute max duration', () => {
      const limits = { maxDurationMinutes: 120 }
      const parsed = extensionLimitConfigSchema.parse(limits)
      expect(parsed.maxDurationMinutes).toBe(120)
    })

    it('should reject invalid max duration', () => {
      const limits = { maxDurationMinutes: 45 }
      expect(() => extensionLimitConfigSchema.parse(limits)).toThrow()
    })

    it('should default maxDurationMinutes to 30', () => {
      const parsed = extensionLimitConfigSchema.parse({})
      expect(parsed.maxDurationMinutes).toBe(30)
    })

    it('should default maxDailyExtensions to 1', () => {
      const parsed = extensionLimitConfigSchema.parse({})
      expect(parsed.maxDailyExtensions).toBe(1)
    })

    it('should reject maxDailyExtensions less than 1', () => {
      const limits = { maxDailyExtensions: 0 }
      expect(() => extensionLimitConfigSchema.parse(limits)).toThrow()
    })

    it('should reject maxDailyExtensions greater than 5', () => {
      const limits = { maxDailyExtensions: 6 }
      expect(() => extensionLimitConfigSchema.parse(limits)).toThrow()
    })
  })

  describe('DEFAULT_EXTENSION_LIMITS', () => {
    it('should have maxDurationMinutes as 30', () => {
      expect(DEFAULT_EXTENSION_LIMITS.maxDurationMinutes).toBe(30)
    })

    it('should have maxDailyExtensions as 1', () => {
      expect(DEFAULT_EXTENSION_LIMITS.maxDailyExtensions).toBe(1)
    })
  })

  describe('caregiverExtensionLogSchema', () => {
    const validLog = {
      id: 'log-123',
      familyId: 'family-456',
      caregiverUid: 'caregiver-789',
      caregiverName: 'Grandma',
      childUid: 'child-101',
      childName: 'Mateo',
      extensionMinutes: 30,
      createdAt: new Date(),
    }

    it('should accept valid extension log', () => {
      const parsed = caregiverExtensionLogSchema.parse(validLog)
      expect(parsed.id).toBe('log-123')
      expect(parsed.extensionMinutes).toBe(30)
      expect(parsed.caregiverName).toBe('Grandma')
    })

    it('should accept log with optional requestId', () => {
      const logWithRequest = { ...validLog, requestId: 'req-123' }
      const parsed = caregiverExtensionLogSchema.parse(logWithRequest)
      expect(parsed.requestId).toBe('req-123')
    })

    it('should reject extensionMinutes less than 1', () => {
      const invalidLog = { ...validLog, extensionMinutes: 0 }
      expect(() => caregiverExtensionLogSchema.parse(invalidLog)).toThrow()
    })

    it('should reject extensionMinutes greater than 120', () => {
      const invalidLog = { ...validLog, extensionMinutes: 121 }
      expect(() => caregiverExtensionLogSchema.parse(invalidLog)).toThrow()
    })

    it('should require all mandatory fields', () => {
      const incompleteLog = {
        id: 'log-123',
        familyId: 'family-456',
        // missing other required fields
      }
      expect(() => caregiverExtensionLogSchema.parse(incompleteLog)).toThrow()
    })
  })

  describe('setCaregiverPinInputSchema', () => {
    it('should accept valid 4-digit PIN', () => {
      const input = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        pin: '1234',
      }
      const parsed = setCaregiverPinInputSchema.parse(input)
      expect(parsed.pin).toBe('1234')
    })

    it('should accept valid 6-digit PIN', () => {
      const input = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        pin: '123456',
      }
      const parsed = setCaregiverPinInputSchema.parse(input)
      expect(parsed.pin).toBe('123456')
    })

    it('should accept input with extension limits', () => {
      const input = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        pin: '1234',
        extensionLimits: {
          maxDurationMinutes: 60,
          maxDailyExtensions: 2,
        },
      }
      const parsed = setCaregiverPinInputSchema.parse(input)
      expect(parsed.extensionLimits?.maxDurationMinutes).toBe(60)
    })

    it('should reject PIN with fewer than 4 digits', () => {
      const input = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        pin: '123',
      }
      expect(() => setCaregiverPinInputSchema.parse(input)).toThrow()
    })

    it('should reject PIN with more than 6 digits', () => {
      const input = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        pin: '1234567',
      }
      expect(() => setCaregiverPinInputSchema.parse(input)).toThrow()
    })

    it('should reject PIN with non-digit characters', () => {
      const input = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        pin: '12ab',
      }
      expect(() => setCaregiverPinInputSchema.parse(input)).toThrow()
    })

    it('should reject empty PIN', () => {
      const input = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        pin: '',
      }
      expect(() => setCaregiverPinInputSchema.parse(input)).toThrow()
    })
  })

  describe('approveExtensionWithPinInputSchema', () => {
    it('should accept valid input', () => {
      const input = {
        familyId: 'family-123',
        childUid: 'child-456',
        pin: '1234',
      }
      const parsed = approveExtensionWithPinInputSchema.parse(input)
      expect(parsed.familyId).toBe('family-123')
      expect(parsed.pin).toBe('1234')
    })

    it('should accept input with extensionMinutes', () => {
      const input = {
        familyId: 'family-123',
        childUid: 'child-456',
        pin: '1234',
        extensionMinutes: 30,
      }
      const parsed = approveExtensionWithPinInputSchema.parse(input)
      expect(parsed.extensionMinutes).toBe(30)
    })

    it('should accept input with requestId', () => {
      const input = {
        familyId: 'family-123',
        childUid: 'child-456',
        pin: '1234',
        requestId: 'req-789',
      }
      const parsed = approveExtensionWithPinInputSchema.parse(input)
      expect(parsed.requestId).toBe('req-789')
    })

    it('should reject extensionMinutes less than 1', () => {
      const input = {
        familyId: 'family-123',
        childUid: 'child-456',
        pin: '1234',
        extensionMinutes: 0,
      }
      expect(() => approveExtensionWithPinInputSchema.parse(input)).toThrow()
    })

    it('should reject extensionMinutes greater than 120', () => {
      const input = {
        familyId: 'family-123',
        childUid: 'child-456',
        pin: '1234',
        extensionMinutes: 121,
      }
      expect(() => approveExtensionWithPinInputSchema.parse(input)).toThrow()
    })

    it('should reject invalid PIN format', () => {
      const input = {
        familyId: 'family-123',
        childUid: 'child-456',
        pin: 'abcd',
      }
      expect(() => approveExtensionWithPinInputSchema.parse(input)).toThrow()
    })
  })

  describe('caregiverFlagViewLogSchema', () => {
    const validLog = {
      id: 'log-123',
      familyId: 'family-456',
      caregiverUid: 'caregiver-789',
      caregiverName: 'Grandma',
      flagId: 'flag-101',
      childUid: 'child-202',
      childName: 'Emma',
      action: 'viewed',
      flagCategory: 'Violence',
      flagSeverity: 'high',
      createdAt: new Date(),
    }

    it('should accept valid flag view log with viewed action', () => {
      const parsed = caregiverFlagViewLogSchema.parse(validLog)
      expect(parsed.id).toBe('log-123')
      expect(parsed.action).toBe('viewed')
      expect(parsed.caregiverName).toBe('Grandma')
      expect(parsed.flagCategory).toBe('Violence')
    })

    it('should accept valid flag view log with marked_reviewed action', () => {
      const logWithReviewed = { ...validLog, action: 'marked_reviewed' }
      const parsed = caregiverFlagViewLogSchema.parse(logWithReviewed)
      expect(parsed.action).toBe('marked_reviewed')
    })

    it('should reject invalid action', () => {
      const invalidLog = { ...validLog, action: 'dismissed' }
      expect(() => caregiverFlagViewLogSchema.parse(invalidLog)).toThrow()
    })

    it('should require flagId', () => {
      const { flagId: _flagId, ...logWithoutFlagId } = validLog
      expect(() => caregiverFlagViewLogSchema.parse(logWithoutFlagId)).toThrow()
    })

    it('should require flagCategory', () => {
      const { flagCategory: _flagCategory, ...logWithoutCategory } = validLog
      expect(() => caregiverFlagViewLogSchema.parse(logWithoutCategory)).toThrow()
    })

    it('should require flagSeverity', () => {
      const { flagSeverity: _flagSeverity, ...logWithoutSeverity } = validLog
      expect(() => caregiverFlagViewLogSchema.parse(logWithoutSeverity)).toThrow()
    })

    it('should require caregiverName', () => {
      const { caregiverName: _caregiverName, ...logWithoutName } = validLog
      expect(() => caregiverFlagViewLogSchema.parse(logWithoutName)).toThrow()
    })

    it('should require childName', () => {
      const { childName: _childName, ...logWithoutChildName } = validLog
      expect(() => caregiverFlagViewLogSchema.parse(logWithoutChildName)).toThrow()
    })

    it('should require all mandatory fields', () => {
      const incompleteLog = {
        id: 'log-123',
        familyId: 'family-456',
        // missing other required fields
      }
      expect(() => caregiverFlagViewLogSchema.parse(incompleteLog)).toThrow()
    })
  })

  describe('logCaregiverFlagViewInputSchema', () => {
    it('should accept valid input with viewed action', () => {
      const input = {
        familyId: 'family-123',
        flagId: 'flag-456',
        childUid: 'child-789',
        action: 'viewed',
        flagCategory: 'Bullying',
        flagSeverity: 'medium',
      }
      const parsed = logCaregiverFlagViewInputSchema.parse(input)
      expect(parsed.action).toBe('viewed')
      expect(parsed.flagCategory).toBe('Bullying')
    })

    it('should accept valid input with marked_reviewed action', () => {
      const input = {
        familyId: 'family-123',
        flagId: 'flag-456',
        childUid: 'child-789',
        action: 'marked_reviewed',
        flagCategory: 'Violence',
        flagSeverity: 'high',
      }
      const parsed = logCaregiverFlagViewInputSchema.parse(input)
      expect(parsed.action).toBe('marked_reviewed')
    })

    it('should reject invalid action', () => {
      const input = {
        familyId: 'family-123',
        flagId: 'flag-456',
        childUid: 'child-789',
        action: 'escalated',
        flagCategory: 'Violence',
        flagSeverity: 'high',
      }
      expect(() => logCaregiverFlagViewInputSchema.parse(input)).toThrow()
    })

    it('should require flagCategory', () => {
      const input = {
        familyId: 'family-123',
        flagId: 'flag-456',
        childUid: 'child-789',
        action: 'viewed',
        flagSeverity: 'high',
      }
      expect(() => logCaregiverFlagViewInputSchema.parse(input)).toThrow()
    })
  })

  describe('markFlagReviewedByCaregiverInputSchema', () => {
    it('should accept valid input', () => {
      const input = {
        familyId: 'family-123',
        flagId: 'flag-456',
        childUid: 'child-1',
      }
      const parsed = markFlagReviewedByCaregiverInputSchema.parse(input)
      expect(parsed.familyId).toBe('family-123')
      expect(parsed.flagId).toBe('flag-456')
      expect(parsed.childUid).toBe('child-1')
    })

    it('should require familyId', () => {
      const input = { flagId: 'flag-456', childUid: 'child-1' }
      expect(() => markFlagReviewedByCaregiverInputSchema.parse(input)).toThrow()
    })

    it('should require flagId', () => {
      const input = { familyId: 'family-123', childUid: 'child-1' }
      expect(() => markFlagReviewedByCaregiverInputSchema.parse(input)).toThrow()
    })

    it('should require childUid', () => {
      const input = { familyId: 'family-123', flagId: 'flag-456' }
      expect(() => markFlagReviewedByCaregiverInputSchema.parse(input)).toThrow()
    })
  })

  describe('familyCaregiverWithPinSchema', () => {
    const baseCaregiver = {
      uid: 'caregiver-123',
      email: 'grandma@example.com',
      displayName: 'Grandma',
      role: 'status_viewer',
      relationship: 'grandparent',
      childIds: ['child-1'],
      addedAt: new Date(),
      addedByUid: 'parent-123',
    }

    it('should accept caregiver without PIN config', () => {
      const parsed = familyCaregiverWithPinSchema.parse(baseCaregiver)
      expect(parsed.pinConfig).toBeUndefined()
      expect(parsed.extensionLimits).toBeUndefined()
    })

    it('should accept caregiver with PIN config', () => {
      const caregiverWithPin = {
        ...baseCaregiver,
        pinConfig: {
          pinHash: '$2b$10$abcdefghijklmnopqrstuv',
          pinSetAt: new Date(),
          pinSetByUid: 'parent-123',
          failedAttempts: 0,
        },
      }
      const parsed = familyCaregiverWithPinSchema.parse(caregiverWithPin)
      expect(parsed.pinConfig).toBeDefined()
      expect(parsed.pinConfig?.pinHash).toBe('$2b$10$abcdefghijklmnopqrstuv')
    })

    it('should accept caregiver with extension limits', () => {
      const caregiverWithLimits = {
        ...baseCaregiver,
        extensionLimits: {
          maxDurationMinutes: 60,
          maxDailyExtensions: 2,
        },
      }
      const parsed = familyCaregiverWithPinSchema.parse(caregiverWithLimits)
      expect(parsed.extensionLimits?.maxDurationMinutes).toBe(60)
    })

    it('should accept caregiver with both PIN and limits', () => {
      const fullCaregiver = {
        ...baseCaregiver,
        permissions: {
          canExtendTime: true,
          canViewFlags: false,
        },
        pinConfig: {
          pinHash: '$2b$10$abcdefghijklmnopqrstuv',
          pinSetAt: new Date(),
          pinSetByUid: 'parent-123',
          failedAttempts: 0,
        },
        extensionLimits: {
          maxDurationMinutes: 120,
          maxDailyExtensions: 3,
        },
      }
      const parsed = familyCaregiverWithPinSchema.parse(fullCaregiver)
      expect(parsed.permissions?.canExtendTime).toBe(true)
      expect(parsed.pinConfig).toBeDefined()
      expect(parsed.extensionLimits?.maxDurationMinutes).toBe(120)
    })
  })
})
