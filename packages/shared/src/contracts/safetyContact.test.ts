/**
 * Unit tests for Safety Contact schemas.
 *
 * Story 0.5.1: Secure Safety Contact Channel
 * Story 3.6: Legal Parent Petition for Access
 *
 * Tests schema validation for safety ticket submission,
 * ensuring proper data structure for the escape feature
 * and legal parent petitions.
 */

import { describe, it, expect } from 'vitest'
import {
  safetyContactUrgencySchema,
  safeContactInfoSchema,
  safetyTicketStatusSchema,
  safetyTicketTypeSchema,
  safetyTicketSchema,
  safetyContactInputSchema,
  safetyContactResponseSchema,
  legalParentPetitionInfoSchema,
  grantLegalParentAccessInputSchema,
  denyLegalParentPetitionInputSchema,
  calculateBusinessDayDeadline,
  isPetitionOverdue,
  getBusinessDaysRemaining,
  PETITION_SLA_BUSINESS_DAYS,
} from './index'

describe('safetyContactUrgencySchema', () => {
  it('accepts valid urgency levels', () => {
    const validUrgencies = ['when_you_can', 'soon', 'urgent']

    validUrgencies.forEach((urgency) => {
      const result = safetyContactUrgencySchema.safeParse(urgency)
      expect(result.success).toBe(true)
    })
  })

  it('rejects invalid urgency levels', () => {
    const result = safetyContactUrgencySchema.safeParse('emergency')
    expect(result.success).toBe(false)
  })

  it('rejects empty string', () => {
    const result = safetyContactUrgencySchema.safeParse('')
    expect(result.success).toBe(false)
  })
})

describe('safeContactInfoSchema', () => {
  it('accepts null (contact info is optional)', () => {
    const result = safeContactInfoSchema.safeParse(null)
    expect(result.success).toBe(true)
  })

  it('accepts valid contact info with all fields', () => {
    const result = safeContactInfoSchema.safeParse({
      phone: '555-1234',
      email: 'test@example.com',
      preferredMethod: 'email',
      safeTimeToContact: 'Weekdays 9-5',
    })
    expect(result.success).toBe(true)
  })

  it('accepts contact info with null fields', () => {
    const result = safeContactInfoSchema.safeParse({
      phone: null,
      email: null,
      preferredMethod: null,
      safeTimeToContact: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts partial contact info', () => {
    const result = safeContactInfoSchema.safeParse({
      phone: '555-1234',
      email: null,
      preferredMethod: 'phone',
      safeTimeToContact: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const result = safeContactInfoSchema.safeParse({
      phone: null,
      email: 'invalid-email',
      preferredMethod: null,
      safeTimeToContact: null,
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid email format', () => {
    const result = safeContactInfoSchema.safeParse({
      phone: null,
      email: 'valid@email.com',
      preferredMethod: null,
      safeTimeToContact: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid preferred method', () => {
    const result = safeContactInfoSchema.safeParse({
      phone: null,
      email: null,
      preferredMethod: 'text', // invalid
      safeTimeToContact: null,
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid preferred methods', () => {
    const validMethods = ['phone', 'email', 'either']

    validMethods.forEach((method) => {
      const result = safeContactInfoSchema.safeParse({
        phone: null,
        email: null,
        preferredMethod: method,
        safeTimeToContact: null,
      })
      expect(result.success).toBe(true)
    })
  })

  it('rejects safe time to contact exceeding 200 characters', () => {
    const result = safeContactInfoSchema.safeParse({
      phone: null,
      email: null,
      preferredMethod: null,
      safeTimeToContact: 'a'.repeat(201),
    })
    expect(result.success).toBe(false)
  })
})

describe('safetyTicketStatusSchema', () => {
  it('accepts valid status values', () => {
    const validStatuses = ['pending', 'in_review', 'resolved', 'closed', 'denied']

    validStatuses.forEach((status) => {
      const result = safetyTicketStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    })
  })

  it('rejects invalid status values', () => {
    const result = safetyTicketStatusSchema.safeParse('active')
    expect(result.success).toBe(false)
  })

  it('accepts denied status (Story 3.6)', () => {
    const result = safetyTicketStatusSchema.safeParse('denied')
    expect(result.success).toBe(true)
  })
})

// Story 3.6: Legal Parent Petition for Access tests
describe('safetyTicketTypeSchema', () => {
  it('accepts safety_request type', () => {
    const result = safetyTicketTypeSchema.safeParse('safety_request')
    expect(result.success).toBe(true)
  })

  it('accepts legal_parent_petition type', () => {
    const result = safetyTicketTypeSchema.safeParse('legal_parent_petition')
    expect(result.success).toBe(true)
  })

  it('rejects invalid ticket types', () => {
    const result = safetyTicketTypeSchema.safeParse('complaint')
    expect(result.success).toBe(false)
  })
})

describe('legalParentPetitionInfoSchema', () => {
  it('accepts null (petition info is optional)', () => {
    const result = legalParentPetitionInfoSchema.safeParse(null)
    expect(result.success).toBe(true)
  })

  it('accepts valid petition info with all required fields', () => {
    const result = legalParentPetitionInfoSchema.safeParse({
      childName: 'Test Child',
      childBirthdate: '2015-06-15',
      relationshipClaim: 'biological_parent',
      existingParentEmail: 'parent@example.com',
      courtOrderReference: 'Case #12345',
    })
    expect(result.success).toBe(true)
  })

  it('accepts petition info with minimal required fields', () => {
    const result = legalParentPetitionInfoSchema.safeParse({
      childName: 'Test Child',
      childBirthdate: null,
      relationshipClaim: 'biological_parent',
      existingParentEmail: null,
      courtOrderReference: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts adoptive_parent relationship claim', () => {
    const result = legalParentPetitionInfoSchema.safeParse({
      childName: 'Test Child',
      childBirthdate: null,
      relationshipClaim: 'adoptive_parent',
      existingParentEmail: null,
      courtOrderReference: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts legal_guardian relationship claim', () => {
    const result = legalParentPetitionInfoSchema.safeParse({
      childName: 'Test Child',
      childBirthdate: null,
      relationshipClaim: 'legal_guardian',
      existingParentEmail: null,
      courtOrderReference: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid relationship claim', () => {
    const result = legalParentPetitionInfoSchema.safeParse({
      childName: 'Test Child',
      childBirthdate: null,
      relationshipClaim: 'step_parent',
      existingParentEmail: null,
      courtOrderReference: null,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty child name', () => {
    const result = legalParentPetitionInfoSchema.safeParse({
      childName: '',
      childBirthdate: null,
      relationshipClaim: 'biological_parent',
      existingParentEmail: null,
      courtOrderReference: null,
    })
    expect(result.success).toBe(false)
  })

  it('rejects child name exceeding 100 characters', () => {
    const result = legalParentPetitionInfoSchema.safeParse({
      childName: 'a'.repeat(101),
      childBirthdate: null,
      relationshipClaim: 'biological_parent',
      existingParentEmail: null,
      courtOrderReference: null,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid existing parent email', () => {
    const result = legalParentPetitionInfoSchema.safeParse({
      childName: 'Test Child',
      childBirthdate: null,
      relationshipClaim: 'biological_parent',
      existingParentEmail: 'invalid-email',
      courtOrderReference: null,
    })
    expect(result.success).toBe(false)
  })
})

describe('safetyTicketSchema', () => {
  const validTicket = {
    id: 'ticket-123',
    type: 'safety_request', // Story 3.6: Added type field
    message: 'I need help',
    safeContactInfo: null,
    urgency: 'when_you_can',
    userId: 'user-123',
    userEmail: 'user@example.com',
    familyId: null, // Intentionally null
    createdAt: new Date(),
    ipHash: 'abc123def456',
    userAgent: 'Mozilla/5.0',
    status: 'pending',
    assignedTo: null,
    // Story 3.6: Added petition-specific fields
    verification: null, // Story 3.6: Verification tracking
    petitionInfo: null,
    slaDeadline: null,
    denialReason: null,
    deniedAt: null,
    deniedByAgentId: null,
    grantedAt: null,
    grantedByAgentId: null,
    grantedFamilyId: null,
  }

  it('accepts valid safety ticket', () => {
    const result = safetyTicketSchema.safeParse(validTicket)
    expect(result.success).toBe(true)
  })

  it('accepts ticket with null userId (unauthenticated user)', () => {
    const result = safetyTicketSchema.safeParse({
      ...validTicket,
      userId: null,
      userEmail: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts ticket with contact info', () => {
    const result = safetyTicketSchema.safeParse({
      ...validTicket,
      safeContactInfo: {
        phone: '555-1234',
        email: 'safe@email.com',
        preferredMethod: 'email',
        safeTimeToContact: 'Weekdays only',
      },
    })
    expect(result.success).toBe(true)
  })

  it('rejects ticket without message', () => {
    const { message: _message, ...ticketWithoutMessage } = validTicket
    const result = safetyTicketSchema.safeParse(ticketWithoutMessage)
    expect(result.success).toBe(false)
  })

  it('rejects ticket with empty message', () => {
    const result = safetyTicketSchema.safeParse({
      ...validTicket,
      message: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects ticket with message exceeding 5000 characters', () => {
    const result = safetyTicketSchema.safeParse({
      ...validTicket,
      message: 'a'.repeat(5001),
    })
    expect(result.success).toBe(false)
  })

  it('accepts ticket with message at maximum length (5000 chars)', () => {
    const result = safetyTicketSchema.safeParse({
      ...validTicket,
      message: 'a'.repeat(5000),
    })
    expect(result.success).toBe(true)
  })

  it('rejects ticket without ipHash', () => {
    const { ipHash: _ipHash, ...ticketWithoutIpHash } = validTicket
    const result = safetyTicketSchema.safeParse(ticketWithoutIpHash)
    expect(result.success).toBe(false)
  })
})

describe('safetyContactInputSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = safetyContactInputSchema.safeParse({
      message: 'I need help',
      safeContactInfo: null,
      petitionInfo: null, // Story 3.6: Optional petition info
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.urgency).toBe('when_you_can') // Default value
      expect(result.data.type).toBe('safety_request') // Story 3.6: Default type
    }
  })

  it('accepts valid input with all fields', () => {
    const result = safetyContactInputSchema.safeParse({
      message: 'I need help',
      safeContactInfo: {
        phone: '555-1234',
        email: 'test@example.com',
        preferredMethod: 'phone',
        safeTimeToContact: 'Morning',
      },
      urgency: 'urgent',
      petitionInfo: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts input with null safeContactInfo', () => {
    const result = safetyContactInputSchema.safeParse({
      message: 'I need help',
      safeContactInfo: null,
      urgency: 'soon',
      petitionInfo: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects input without message', () => {
    const result = safetyContactInputSchema.safeParse({
      safeContactInfo: null,
      urgency: 'when_you_can',
      petitionInfo: null,
    })
    expect(result.success).toBe(false)
  })

  it('rejects input with empty message', () => {
    const result = safetyContactInputSchema.safeParse({
      message: '',
      safeContactInfo: null,
      urgency: 'when_you_can',
      petitionInfo: null,
    })
    expect(result.success).toBe(false)
  })

  it('uses default urgency when not provided', () => {
    const result = safetyContactInputSchema.safeParse({
      message: 'Help me',
      safeContactInfo: null,
      petitionInfo: null,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.urgency).toBe('when_you_can')
    }
  })

  // Story 3.6: Legal parent petition input tests
  it('accepts legal_parent_petition type with petition info', () => {
    const result = safetyContactInputSchema.safeParse({
      type: 'legal_parent_petition',
      message: 'I am seeking access to my child',
      safeContactInfo: {
        phone: null,
        email: 'parent@example.com',
        preferredMethod: 'email',
        safeTimeToContact: null,
      },
      petitionInfo: {
        childName: 'Test Child',
        childBirthdate: null,
        relationshipClaim: 'biological_parent',
        existingParentEmail: null,
        courtOrderReference: null,
      },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('legal_parent_petition')
    }
  })

  it('accepts safety_request type explicitly', () => {
    const result = safetyContactInputSchema.safeParse({
      type: 'safety_request',
      message: 'I need help escaping my situation',
      safeContactInfo: null,
      petitionInfo: null,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('safety_request')
    }
  })
})

describe('safetyContactResponseSchema', () => {
  it('accepts valid success response', () => {
    const result = safetyContactResponseSchema.safeParse({
      success: true,
      message: 'Your message has been received.',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid failure response', () => {
    const result = safetyContactResponseSchema.safeParse({
      success: false,
      message: 'Unable to send your message.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects response without success field', () => {
    const result = safetyContactResponseSchema.safeParse({
      message: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects response without message field', () => {
    const result = safetyContactResponseSchema.safeParse({
      success: true,
    })
    expect(result.success).toBe(false)
  })
})

// Story 3.6: Grant and Deny input schemas
describe('grantLegalParentAccessInputSchema', () => {
  it('accepts valid grant input', () => {
    const result = grantLegalParentAccessInputSchema.safeParse({
      ticketId: 'ticket-123',
      familyId: 'family-456',
      petitionerEmail: 'petitioner@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty ticketId', () => {
    const result = grantLegalParentAccessInputSchema.safeParse({
      ticketId: '',
      familyId: 'family-456',
      petitionerEmail: 'petitioner@example.com',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty familyId', () => {
    const result = grantLegalParentAccessInputSchema.safeParse({
      ticketId: 'ticket-123',
      familyId: '',
      petitionerEmail: 'petitioner@example.com',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = grantLegalParentAccessInputSchema.safeParse({
      ticketId: 'ticket-123',
      familyId: 'family-456',
      petitionerEmail: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })
})

describe('denyLegalParentPetitionInputSchema', () => {
  it('accepts valid deny input', () => {
    const result = denyLegalParentPetitionInputSchema.safeParse({
      ticketId: 'ticket-123',
      reason: 'Insufficient documentation provided',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty ticketId', () => {
    const result = denyLegalParentPetitionInputSchema.safeParse({
      ticketId: '',
      reason: 'Insufficient documentation',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty reason', () => {
    const result = denyLegalParentPetitionInputSchema.safeParse({
      ticketId: 'ticket-123',
      reason: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects reason exceeding 1000 characters', () => {
    const result = denyLegalParentPetitionInputSchema.safeParse({
      ticketId: 'ticket-123',
      reason: 'a'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })

  it('accepts reason at max length (1000 chars)', () => {
    const result = denyLegalParentPetitionInputSchema.safeParse({
      ticketId: 'ticket-123',
      reason: 'a'.repeat(1000),
    })
    expect(result.success).toBe(true)
  })
})

// Story 3.6: SLA function tests
describe('PETITION_SLA_BUSINESS_DAYS', () => {
  it('is set to 5 business days', () => {
    expect(PETITION_SLA_BUSINESS_DAYS).toBe(5)
  })
})

describe('calculateBusinessDayDeadline', () => {
  it('calculates 5 business days from Monday', () => {
    // Monday Dec 16, 2024
    const startDate = new Date('2024-12-16T10:00:00Z')
    const deadline = calculateBusinessDayDeadline(startDate, 5)

    // Should be Monday Dec 23, 2024 (skips weekend)
    expect(deadline.getDate()).toBe(23)
    expect(deadline.getMonth()).toBe(11) // December
  })

  it('calculates 5 business days from Friday', () => {
    // Friday Dec 20, 2024
    const startDate = new Date('2024-12-20T10:00:00Z')
    const deadline = calculateBusinessDayDeadline(startDate, 5)

    // Should be Friday Dec 27, 2024 (skips 2 weekends)
    expect(deadline.getDate()).toBe(27)
    expect(deadline.getMonth()).toBe(11)
  })

  it('calculates 1 business day from Wednesday', () => {
    // Wednesday Dec 18, 2024
    const startDate = new Date('2024-12-18T10:00:00Z')
    const deadline = calculateBusinessDayDeadline(startDate, 1)

    // Should be Thursday Dec 19, 2024
    expect(deadline.getDate()).toBe(19)
  })

  it('skips weekend days', () => {
    // Thursday Dec 19, 2024
    const startDate = new Date('2024-12-19T10:00:00Z')
    const deadline = calculateBusinessDayDeadline(startDate, 2)

    // Fri + Mon = 2 business days (skips Sat/Sun)
    // Should be Monday Dec 23, 2024
    expect(deadline.getDate()).toBe(23)
  })

  it('handles zero business days', () => {
    const startDate = new Date('2024-12-16T10:00:00Z')
    const deadline = calculateBusinessDayDeadline(startDate, 0)

    // Same date
    expect(deadline.getDate()).toBe(startDate.getDate())
  })

  // Input validation tests
  it('throws error for invalid date', () => {
    expect(() => calculateBusinessDayDeadline(new Date('invalid'), 5)).toThrow(
      'Invalid start date provided'
    )
  })

  it('throws error for negative business days', () => {
    const startDate = new Date('2024-12-16T10:00:00Z')
    expect(() => calculateBusinessDayDeadline(startDate, -1)).toThrow(
      'Business days cannot be negative'
    )
  })

  it('throws error for non-finite business days', () => {
    const startDate = new Date('2024-12-16T10:00:00Z')
    expect(() => calculateBusinessDayDeadline(startDate, Infinity)).toThrow(
      'Business days must be a finite number'
    )
  })

  it('throws error for NaN business days', () => {
    const startDate = new Date('2024-12-16T10:00:00Z')
    expect(() => calculateBusinessDayDeadline(startDate, NaN)).toThrow(
      'Business days must be a finite number'
    )
  })

  it('throws error for excessive business days', () => {
    const startDate = new Date('2024-12-16T10:00:00Z')
    expect(() => calculateBusinessDayDeadline(startDate, 400)).toThrow(
      'Business days cannot exceed 365'
    )
  })

  it('accepts maximum allowed business days', () => {
    const startDate = new Date('2024-12-16T10:00:00Z')
    // Should not throw for 365 days
    expect(() => calculateBusinessDayDeadline(startDate, 365)).not.toThrow()
  })
})

describe('isPetitionOverdue', () => {
  it('returns false for null deadline', () => {
    expect(isPetitionOverdue(null)).toBe(false)
  })

  it('returns false for future deadline', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 5)
    expect(isPetitionOverdue(futureDate)).toBe(false)
  })

  it('returns true for past deadline', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)
    expect(isPetitionOverdue(pastDate)).toBe(true)
  })
})

describe('getBusinessDaysRemaining', () => {
  it('returns 0 for null deadline', () => {
    expect(getBusinessDaysRemaining(null)).toBe(0)
  })

  it('returns positive days for future deadline', () => {
    // Set deadline to next Monday (if today is a weekday)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const remaining = getBusinessDaysRemaining(futureDate)
    expect(remaining).toBeGreaterThan(0)
  })

  it('returns negative days for past deadline', () => {
    // Set deadline to last week
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 7)
    const remaining = getBusinessDaysRemaining(pastDate)
    expect(remaining).toBeLessThan(0)
  })
})
