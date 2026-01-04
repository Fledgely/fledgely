/**
 * Trusted Adult Service Tests - Story 52.4 Task 2
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  canDesignateTrustedAdult,
  isEmailAlreadyUsed,
  requiresTeenApproval,
  createTrustedAdultInvitation,
  validateInvitationToken,
  acceptTrustedAdultInvitation,
  processTeenapproval,
  revokeTrustedAdult,
  expireInvitation,
  getActiveTrustedAdults,
  getPendingTeenApprovalTrustedAdults,
  getPendingInvitations,
  getTrustedAdultCounts,
  validateTrustedAdultEmail,
  validateTrustedAdultName,
  MAX_TRUSTED_ADULTS_PER_CHILD,
} from './trustedAdultService'
import {
  type TrustedAdult,
  type TrustedAdultInvitationToken,
  TrustedAdultStatus,
  calculateInvitationExpiry,
} from '../contracts/trustedAdult'

// ============================================
// Test Fixtures
// ============================================

const createTestTrustedAdult = (overrides?: Partial<TrustedAdult>): TrustedAdult => {
  const now = new Date()
  return {
    id: 'ta-123',
    email: 'trusted@example.com',
    name: 'Trusted Adult',
    status: TrustedAdultStatus.ACTIVE,
    childId: 'child-123',
    familyId: 'family-123',
    invitedBy: 'parent-123',
    invitedAt: now,
    expiresAt: calculateInvitationExpiry(now),
    ...overrides,
  }
}

const createPendingInvitationTrustedAdult = (): TrustedAdult =>
  createTestTrustedAdult({
    id: 'ta-pending',
    status: TrustedAdultStatus.PENDING_INVITATION,
  })

const createPendingTeenApprovalTrustedAdult = (): TrustedAdult =>
  createTestTrustedAdult({
    id: 'ta-pending-teen',
    status: TrustedAdultStatus.PENDING_TEEN_APPROVAL,
    userId: 'trusted-user-123',
    acceptedAt: new Date(),
  })

// ============================================
// canDesignateTrustedAdult Tests
// ============================================

describe('canDesignateTrustedAdult', () => {
  it('should allow designation when no trusted adults exist', () => {
    const result = canDesignateTrustedAdult([])

    expect(result.canDesignate).toBe(true)
    expect(result.currentCount).toBe(0)
    expect(result.maxAllowed).toBe(MAX_TRUSTED_ADULTS_PER_CHILD)
  })

  it('should allow designation when one trusted adult exists', () => {
    const existing = [createTestTrustedAdult()]
    const result = canDesignateTrustedAdult(existing)

    expect(result.canDesignate).toBe(true)
    expect(result.currentCount).toBe(1)
  })

  it('should not allow designation when max trusted adults reached', () => {
    const existing = [
      createTestTrustedAdult({ id: 'ta-1' }),
      createTestTrustedAdult({ id: 'ta-2' }),
    ]
    const result = canDesignateTrustedAdult(existing)

    expect(result.canDesignate).toBe(false)
    expect(result.reason).toContain('Maximum')
    expect(result.currentCount).toBe(2)
  })

  it('should count pending invitations toward limit', () => {
    const existing = [createTestTrustedAdult({ id: 'ta-1' }), createPendingInvitationTrustedAdult()]
    const result = canDesignateTrustedAdult(existing)

    expect(result.canDesignate).toBe(false)
    expect(result.currentCount).toBe(2)
  })

  it('should count pending teen approval toward limit', () => {
    const existing = [
      createTestTrustedAdult({ id: 'ta-1' }),
      createPendingTeenApprovalTrustedAdult(),
    ]
    const result = canDesignateTrustedAdult(existing)

    expect(result.canDesignate).toBe(false)
    expect(result.currentCount).toBe(2)
  })

  it('should not count revoked trusted adults toward limit', () => {
    const existing = [
      createTestTrustedAdult({ id: 'ta-1' }),
      createTestTrustedAdult({ id: 'ta-revoked', status: TrustedAdultStatus.REVOKED }),
    ]
    const result = canDesignateTrustedAdult(existing)

    expect(result.canDesignate).toBe(true)
    expect(result.currentCount).toBe(1)
  })

  it('should not count expired invitations toward limit', () => {
    const existing = [
      createTestTrustedAdult({ id: 'ta-1' }),
      createTestTrustedAdult({ id: 'ta-expired', status: TrustedAdultStatus.EXPIRED }),
    ]
    const result = canDesignateTrustedAdult(existing)

    expect(result.canDesignate).toBe(true)
    expect(result.currentCount).toBe(1)
  })
})

// ============================================
// isEmailAlreadyUsed Tests
// ============================================

describe('isEmailAlreadyUsed', () => {
  it('should return false for new email', () => {
    const existing = [createTestTrustedAdult({ email: 'existing@example.com' })]
    const result = isEmailAlreadyUsed('new@example.com', existing)

    expect(result).toBe(false)
  })

  it('should return true for existing email', () => {
    const existing = [createTestTrustedAdult({ email: 'existing@example.com' })]
    const result = isEmailAlreadyUsed('existing@example.com', existing)

    expect(result).toBe(true)
  })

  it('should be case insensitive', () => {
    const existing = [createTestTrustedAdult({ email: 'Existing@Example.com' })]
    const result = isEmailAlreadyUsed('existing@example.com', existing)

    expect(result).toBe(true)
  })

  it('should trim whitespace', () => {
    const existing = [createTestTrustedAdult({ email: 'existing@example.com' })]
    const result = isEmailAlreadyUsed('  existing@example.com  ', existing)

    expect(result).toBe(true)
  })

  it('should not match revoked trusted adults', () => {
    const existing = [
      createTestTrustedAdult({
        email: 'existing@example.com',
        status: TrustedAdultStatus.REVOKED,
      }),
    ]
    const result = isEmailAlreadyUsed('existing@example.com', existing)

    expect(result).toBe(false)
  })

  it('should match pending invitations', () => {
    const existing = [createPendingInvitationTrustedAdult()]
    existing[0].email = 'pending@example.com'
    const result = isEmailAlreadyUsed('pending@example.com', existing)

    expect(result).toBe(true)
  })
})

// ============================================
// requiresTeenApproval Tests
// ============================================

describe('requiresTeenApproval', () => {
  it('should return true for 16 year old', () => {
    const sixteenYearsAgo = new Date()
    sixteenYearsAgo.setFullYear(sixteenYearsAgo.getFullYear() - 16)

    expect(requiresTeenApproval(sixteenYearsAgo)).toBe(true)
  })

  it('should return true for 17 year old', () => {
    const seventeenYearsAgo = new Date()
    seventeenYearsAgo.setFullYear(seventeenYearsAgo.getFullYear() - 17)

    expect(requiresTeenApproval(seventeenYearsAgo)).toBe(true)
  })

  it('should return false for 15 year old', () => {
    const fifteenYearsAgo = new Date()
    fifteenYearsAgo.setFullYear(fifteenYearsAgo.getFullYear() - 15)

    expect(requiresTeenApproval(fifteenYearsAgo)).toBe(false)
  })

  it('should return false for 10 year old', () => {
    const tenYearsAgo = new Date()
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)

    expect(requiresTeenApproval(tenYearsAgo)).toBe(false)
  })
})

// ============================================
// createTrustedAdultInvitation Tests
// ============================================

describe('createTrustedAdultInvitation', () => {
  it('should create invitation with correct fields', () => {
    const result = createTrustedAdultInvitation(
      'parent-123',
      'family-123',
      'child-123',
      'trusted@example.com',
      'Trusted Adult'
    )

    expect(result.trustedAdult.id).toBeDefined()
    expect(result.trustedAdult.email).toBe('trusted@example.com')
    expect(result.trustedAdult.name).toBe('Trusted Adult')
    expect(result.trustedAdult.status).toBe(TrustedAdultStatus.PENDING_INVITATION)
    expect(result.trustedAdult.childId).toBe('child-123')
    expect(result.trustedAdult.familyId).toBe('family-123')
    expect(result.trustedAdult.invitedBy).toBe('parent-123')
    expect(result.trustedAdult.invitedAt).toBeDefined()
    expect(result.trustedAdult.expiresAt).toBeDefined()
  })

  it('should create invitation token', () => {
    const result = createTrustedAdultInvitation(
      'parent-123',
      'family-123',
      'child-123',
      'trusted@example.com',
      'Trusted Adult'
    )

    expect(result.invitationToken.invitationId).toBe(result.trustedAdult.id)
    expect(result.invitationToken.familyId).toBe('family-123')
    expect(result.invitationToken.childId).toBe('child-123')
    expect(result.invitationToken.email).toBe('trusted@example.com')
    expect(result.invitationToken.nonce).toBeDefined()
    expect(result.invitationToken.expiresAt).toBeDefined()
  })

  it('should create audit event', () => {
    const result = createTrustedAdultInvitation(
      'parent-123',
      'family-123',
      'child-123',
      'trusted@example.com',
      'Trusted Adult',
      '192.168.1.1',
      'Mozilla/5.0'
    )

    expect(result.auditEvent.changeType).toBe('invited')
    expect(result.auditEvent.performedBy).toBe('parent-123')
    expect(result.auditEvent.performedByRole).toBe('parent')
    expect(result.auditEvent.ipAddress).toBe('192.168.1.1')
    expect(result.auditEvent.userAgent).toBe('Mozilla/5.0')
  })

  it('should normalize email to lowercase', () => {
    const result = createTrustedAdultInvitation(
      'parent-123',
      'family-123',
      'child-123',
      'Trusted@EXAMPLE.com',
      'Trusted Adult'
    )

    expect(result.trustedAdult.email).toBe('trusted@example.com')
    expect(result.invitationToken.email).toBe('trusted@example.com')
  })
})

// ============================================
// validateInvitationToken Tests
// ============================================

describe('validateInvitationToken', () => {
  let validToken: TrustedAdultInvitationToken
  let validTrustedAdult: TrustedAdult

  beforeEach(() => {
    const now = new Date()
    validTrustedAdult = createPendingInvitationTrustedAdult()
    validTrustedAdult.email = 'trusted@example.com'

    validToken = {
      invitationId: validTrustedAdult.id,
      familyId: validTrustedAdult.familyId,
      childId: validTrustedAdult.childId,
      email: 'trusted@example.com',
      expiresAt: new Date(now.getTime() + 1000 * 60 * 60), // 1 hour from now
      nonce: 'nonce-123',
    }
  })

  it('should return valid for valid token', () => {
    const result = validateInvitationToken(validToken, validTrustedAdult)

    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should return invalid when trusted adult not found', () => {
    const result = validateInvitationToken(validToken, null)

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invitation not found')
  })

  it('should return invalid when invitation already accepted', () => {
    validTrustedAdult.status = TrustedAdultStatus.PENDING_TEEN_APPROVAL
    const result = validateInvitationToken(validToken, validTrustedAdult)

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invitation is no longer valid')
  })

  it('should return invalid when invitation expired', () => {
    validToken.expiresAt = new Date(Date.now() - 1000) // Expired
    const result = validateInvitationToken(validToken, validTrustedAdult)

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invitation has expired')
  })

  it('should return invalid for email mismatch', () => {
    validToken.email = 'different@example.com'
    const result = validateInvitationToken(validToken, validTrustedAdult)

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Email mismatch')
  })
})

// ============================================
// acceptTrustedAdultInvitation Tests
// ============================================

describe('acceptTrustedAdultInvitation', () => {
  it('should set active status when teen approval not required', () => {
    const trustedAdult = createPendingInvitationTrustedAdult()
    const childBirthdate = new Date()
    childBirthdate.setFullYear(childBirthdate.getFullYear() - 10) // 10 years old

    const result = acceptTrustedAdultInvitation(trustedAdult, 'trusted-user-123', childBirthdate)

    expect(result.trustedAdult.status).toBe(TrustedAdultStatus.ACTIVE)
    expect(result.trustedAdult.userId).toBe('trusted-user-123')
    expect(result.trustedAdult.acceptedAt).toBeDefined()
    expect(result.requiresTeenApproval).toBe(false)
  })

  it('should set pending teen approval when child is 16+', () => {
    const trustedAdult = createPendingInvitationTrustedAdult()
    const childBirthdate = new Date()
    childBirthdate.setFullYear(childBirthdate.getFullYear() - 16) // 16 years old

    const result = acceptTrustedAdultInvitation(trustedAdult, 'trusted-user-123', childBirthdate)

    expect(result.trustedAdult.status).toBe(TrustedAdultStatus.PENDING_TEEN_APPROVAL)
    expect(result.requiresTeenApproval).toBe(true)
  })

  it('should create audit event', () => {
    const trustedAdult = createPendingInvitationTrustedAdult()
    const childBirthdate = new Date()
    childBirthdate.setFullYear(childBirthdate.getFullYear() - 16)

    const result = acceptTrustedAdultInvitation(
      trustedAdult,
      'trusted-user-123',
      childBirthdate,
      '192.168.1.1',
      'Mozilla/5.0'
    )

    expect(result.auditEvent.changeType).toBe('invitation_accepted')
    expect(result.auditEvent.performedBy).toBe('trusted-user-123')
    expect(result.auditEvent.performedByRole).toBe('trusted_adult')
  })
})

// ============================================
// processTeenapproval Tests
// ============================================

describe('processTeenapproval', () => {
  it('should set active status when teen approves', () => {
    const trustedAdult = createPendingTeenApprovalTrustedAdult()

    const result = processTeenapproval(trustedAdult, 'teen-123', true)

    expect(result.trustedAdult.status).toBe(TrustedAdultStatus.ACTIVE)
    expect(result.trustedAdult.approvedByTeenAt).toBeDefined()
    expect(result.trustedAdult.approvedByTeenId).toBe('teen-123')
    expect(result.auditEvent.changeType).toBe('teen_approved')
  })

  it('should set revoked status when teen rejects', () => {
    const trustedAdult = createPendingTeenApprovalTrustedAdult()

    const result = processTeenapproval(trustedAdult, 'teen-123', false, 'I do not know this person')

    expect(result.trustedAdult.status).toBe(TrustedAdultStatus.REVOKED)
    expect(result.trustedAdult.revokedAt).toBeDefined()
    expect(result.trustedAdult.revokedBy).toBe('teen-123')
    expect(result.trustedAdult.revokedReason).toBe('I do not know this person')
    expect(result.auditEvent.changeType).toBe('teen_rejected')
  })
})

// ============================================
// revokeTrustedAdult Tests
// ============================================

describe('revokeTrustedAdult', () => {
  it('should set revoked status by parent', () => {
    const trustedAdult = createTestTrustedAdult()

    const result = revokeTrustedAdult(trustedAdult, 'parent-123', 'parent', 'No longer needed')

    expect(result.trustedAdult.status).toBe(TrustedAdultStatus.REVOKED)
    expect(result.trustedAdult.revokedBy).toBe('parent-123')
    expect(result.trustedAdult.revokedReason).toBe('No longer needed')
    expect(result.auditEvent.changeType).toBe('revoked_by_parent')
  })

  it('should set revoked status by teen', () => {
    const trustedAdult = createTestTrustedAdult()

    const result = revokeTrustedAdult(trustedAdult, 'teen-123', 'teen', 'Privacy concerns')

    expect(result.trustedAdult.status).toBe(TrustedAdultStatus.REVOKED)
    expect(result.auditEvent.changeType).toBe('revoked_by_teen')
    expect(result.auditEvent.performedByRole).toBe('teen')
  })
})

// ============================================
// expireInvitation Tests
// ============================================

describe('expireInvitation', () => {
  it('should set expired status', () => {
    const trustedAdult = createPendingInvitationTrustedAdult()

    const result = expireInvitation(trustedAdult)

    expect(result.trustedAdult.status).toBe(TrustedAdultStatus.EXPIRED)
    expect(result.auditEvent.changeType).toBe('invitation_expired')
    expect(result.auditEvent.performedBy).toBe('system')
    expect(result.auditEvent.performedByRole).toBe('system')
  })
})

// ============================================
// Query Functions Tests
// ============================================

describe('getActiveTrustedAdults', () => {
  it('should return only active trusted adults', () => {
    const trustedAdults = [
      createTestTrustedAdult({ id: 'ta-active-1' }),
      createPendingInvitationTrustedAdult(),
      createPendingTeenApprovalTrustedAdult(),
      createTestTrustedAdult({ id: 'ta-revoked', status: TrustedAdultStatus.REVOKED }),
    ]

    const result = getActiveTrustedAdults(trustedAdults)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('ta-active-1')
  })
})

describe('getPendingTeenApprovalTrustedAdults', () => {
  it('should return only pending teen approval', () => {
    const trustedAdults = [
      createTestTrustedAdult({ id: 'ta-active' }),
      createPendingInvitationTrustedAdult(),
      createPendingTeenApprovalTrustedAdult(),
    ]

    const result = getPendingTeenApprovalTrustedAdults(trustedAdults)

    expect(result).toHaveLength(1)
    expect(result[0].status).toBe(TrustedAdultStatus.PENDING_TEEN_APPROVAL)
  })
})

describe('getPendingInvitations', () => {
  it('should return only pending invitations', () => {
    const trustedAdults = [
      createTestTrustedAdult({ id: 'ta-active' }),
      createPendingInvitationTrustedAdult(),
      createPendingTeenApprovalTrustedAdult(),
    ]

    const result = getPendingInvitations(trustedAdults)

    expect(result).toHaveLength(1)
    expect(result[0].status).toBe(TrustedAdultStatus.PENDING_INVITATION)
  })
})

describe('getTrustedAdultCounts', () => {
  it('should return correct counts', () => {
    const trustedAdults = [
      createTestTrustedAdult({ id: 'ta-active-1' }),
      createPendingInvitationTrustedAdult(),
      createTestTrustedAdult({ id: 'ta-revoked', status: TrustedAdultStatus.REVOKED }),
    ]

    const result = getTrustedAdultCounts(trustedAdults)

    expect(result.active).toBe(1)
    expect(result.pendingInvitation).toBe(1)
    expect(result.pendingTeenApproval).toBe(0)
    expect(result.total).toBe(2)
    expect(result.maxAllowed).toBe(MAX_TRUSTED_ADULTS_PER_CHILD)
    expect(result.canAddMore).toBe(false)
  })

  it('should allow more when under limit', () => {
    const trustedAdults = [createTestTrustedAdult({ id: 'ta-active-1' })]

    const result = getTrustedAdultCounts(trustedAdults)

    expect(result.total).toBe(1)
    expect(result.canAddMore).toBe(true)
  })
})

// ============================================
// Validation Functions Tests
// ============================================

describe('validateTrustedAdultEmail', () => {
  it('should accept valid email', () => {
    expect(validateTrustedAdultEmail('test@example.com').valid).toBe(true)
  })

  it('should reject empty email', () => {
    const result = validateTrustedAdultEmail('')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Email is required')
  })

  it('should reject invalid email format', () => {
    const result = validateTrustedAdultEmail('invalid-email')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invalid email format')
  })

  it('should reject email without domain', () => {
    const result = validateTrustedAdultEmail('test@')
    expect(result.valid).toBe(false)
  })
})

describe('validateTrustedAdultName', () => {
  it('should accept valid name', () => {
    expect(validateTrustedAdultName('John Doe').valid).toBe(true)
  })

  it('should reject empty name', () => {
    const result = validateTrustedAdultName('')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Name is required')
  })

  it('should reject single character name', () => {
    const result = validateTrustedAdultName('A')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Name must be at least 2 characters')
  })

  it('should reject very long name', () => {
    const longName = 'A'.repeat(101)
    const result = validateTrustedAdultName(longName)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Name must be less than 100 characters')
  })
})
