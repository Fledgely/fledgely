/**
 * Unit tests for invitationService.
 *
 * Tests the invitation service functions including:
 * - checkEpic3ASafeguards stub behavior
 * - Schema validation
 */

import { describe, it, expect } from 'vitest'
import { checkEpic3ASafeguards, isValidEmail, getInvitationLink } from './invitationService'
import {
  invitationSchema,
  invitationStatusSchema,
  type Invitation,
} from '@fledgely/shared/contracts'

describe('invitationService', () => {
  describe('checkEpic3ASafeguards', () => {
    it('returns false for MVP (safeguards not ready)', () => {
      const result = checkEpic3ASafeguards()
      expect(result).toBe(false)
    })
  })
})

describe('invitationSchema', () => {
  it('validates a complete invitation object', () => {
    const validInvitation = {
      id: 'inv-123',
      familyId: 'fam-456',
      inviterUid: 'user-789',
      inviterName: 'John Doe',
      familyName: 'Doe Family',
      token: 'abc-def-ghi',
      status: 'pending' as const,
      recipientEmail: null, // Story 3.2 field
      emailSentAt: null, // Story 3.2 field
      expiresAt: new Date('2025-01-05'),
      createdAt: new Date('2024-12-28'),
      updatedAt: new Date('2024-12-28'),
    }

    const result = invitationSchema.safeParse(validInvitation)
    expect(result.success).toBe(true)
  })

  it('rejects invitation with missing required fields', () => {
    const invalidInvitation = {
      id: 'inv-123',
      familyId: 'fam-456',
      // Missing inviterUid, inviterName, etc.
    }

    const result = invitationSchema.safeParse(invalidInvitation)
    expect(result.success).toBe(false)
  })

  it('rejects invitation with invalid status', () => {
    const invalidInvitation = {
      id: 'inv-123',
      familyId: 'fam-456',
      inviterUid: 'user-789',
      inviterName: 'John Doe',
      familyName: 'Doe Family',
      token: 'abc-def-ghi',
      status: 'invalid-status',
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = invitationSchema.safeParse(invalidInvitation)
    expect(result.success).toBe(false)
  })
})

describe('invitationStatusSchema', () => {
  it('accepts valid status values', () => {
    expect(invitationStatusSchema.safeParse('pending').success).toBe(true)
    expect(invitationStatusSchema.safeParse('accepted').success).toBe(true)
    expect(invitationStatusSchema.safeParse('expired').success).toBe(true)
    expect(invitationStatusSchema.safeParse('revoked').success).toBe(true)
  })

  it('rejects invalid status values', () => {
    expect(invitationStatusSchema.safeParse('invalid').success).toBe(false)
    expect(invitationStatusSchema.safeParse('').success).toBe(false)
    expect(invitationStatusSchema.safeParse(123).success).toBe(false)
  })
})

describe('invitation expiry calculation', () => {
  it('calculates 7 days expiry correctly', () => {
    const createdAt = new Date('2024-12-28T10:00:00Z')
    const expiresAt = new Date(createdAt)
    expiresAt.setDate(expiresAt.getDate() + 7)

    expect(expiresAt.toISOString()).toBe('2025-01-04T10:00:00.000Z')
  })

  it('identifies expired invitations correctly', () => {
    const now = new Date()
    const pastExpiry = new Date(now)
    pastExpiry.setDate(pastExpiry.getDate() - 1)

    expect(pastExpiry < now).toBe(true)

    const futureExpiry = new Date(now)
    futureExpiry.setDate(futureExpiry.getDate() + 7)

    expect(futureExpiry > now).toBe(true)
  })
})

describe('isValidEmail', () => {
  it('accepts valid email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
    expect(isValidEmail('user+tag@example.org')).toBe(true)
  })

  it('rejects invalid email addresses', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('invalid')).toBe(false)
    expect(isValidEmail('missing@domain')).toBe(false)
    expect(isValidEmail('@nodomain.com')).toBe(false)
    expect(isValidEmail('noat.example.com')).toBe(false)
  })
})

describe('getInvitationLink', () => {
  it('generates correct invitation link with token', () => {
    const mockInvitation: Invitation = {
      id: 'inv-123',
      familyId: 'fam-456',
      inviterUid: 'user-789',
      inviterName: 'John Doe',
      familyName: 'Doe Family',
      token: 'secure-token-123',
      status: 'pending',
      recipientEmail: null,
      emailSentAt: null,
      expiresAt: new Date('2025-01-05'),
      createdAt: new Date('2024-12-28'),
      updatedAt: new Date('2024-12-28'),
    }

    const link = getInvitationLink(mockInvitation)
    expect(link).toContain('/invite/accept?token=secure-token-123')
  })
})

describe('invitationSchema with new fields', () => {
  it('validates invitation with recipientEmail and emailSentAt', () => {
    const invitation = {
      id: 'inv-123',
      familyId: 'fam-456',
      inviterUid: 'user-789',
      inviterName: 'John Doe',
      familyName: 'Doe Family',
      token: 'abc-def-ghi',
      status: 'pending' as const,
      recipientEmail: 'coparent@example.com',
      emailSentAt: new Date('2024-12-28T12:00:00Z'),
      expiresAt: new Date('2025-01-05'),
      createdAt: new Date('2024-12-28'),
      updatedAt: new Date('2024-12-28'),
    }

    const result = invitationSchema.safeParse(invitation)
    expect(result.success).toBe(true)
  })

  it('validates invitation with null recipientEmail and emailSentAt', () => {
    const invitation = {
      id: 'inv-123',
      familyId: 'fam-456',
      inviterUid: 'user-789',
      inviterName: 'John Doe',
      familyName: 'Doe Family',
      token: 'abc-def-ghi',
      status: 'pending' as const,
      recipientEmail: null,
      emailSentAt: null,
      expiresAt: new Date('2025-01-05'),
      createdAt: new Date('2024-12-28'),
      updatedAt: new Date('2024-12-28'),
    }

    const result = invitationSchema.safeParse(invitation)
    expect(result.success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const invitation = {
      id: 'inv-123',
      familyId: 'fam-456',
      inviterUid: 'user-789',
      inviterName: 'John Doe',
      familyName: 'Doe Family',
      token: 'abc-def-ghi',
      status: 'pending' as const,
      recipientEmail: 'invalid-email',
      emailSentAt: null,
      expiresAt: new Date('2025-01-05'),
      createdAt: new Date('2024-12-28'),
      updatedAt: new Date('2024-12-28'),
    }

    const result = invitationSchema.safeParse(invitation)
    expect(result.success).toBe(false)
  })
})
