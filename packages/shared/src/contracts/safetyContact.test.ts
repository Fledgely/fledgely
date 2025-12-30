/**
 * Unit tests for Safety Contact schemas.
 *
 * Story 0.5.1: Secure Safety Contact Channel
 *
 * Tests schema validation for safety ticket submission,
 * ensuring proper data structure for the escape feature.
 */

import { describe, it, expect } from 'vitest'
import {
  safetyContactUrgencySchema,
  safeContactInfoSchema,
  safetyTicketStatusSchema,
  safetyTicketSchema,
  safetyContactInputSchema,
  safetyContactResponseSchema,
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
    const validStatuses = ['pending', 'in_review', 'resolved', 'closed']

    validStatuses.forEach((status) => {
      const result = safetyTicketStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    })
  })

  it('rejects invalid status values', () => {
    const result = safetyTicketStatusSchema.safeParse('active')
    expect(result.success).toBe(false)
  })
})

describe('safetyTicketSchema', () => {
  const validTicket = {
    id: 'ticket-123',
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
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.urgency).toBe('when_you_can') // Default value
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
    })
    expect(result.success).toBe(true)
  })

  it('accepts input with null safeContactInfo', () => {
    const result = safetyContactInputSchema.safeParse({
      message: 'I need help',
      safeContactInfo: null,
      urgency: 'soon',
    })
    expect(result.success).toBe(true)
  })

  it('rejects input without message', () => {
    const result = safetyContactInputSchema.safeParse({
      safeContactInfo: null,
      urgency: 'when_you_can',
    })
    expect(result.success).toBe(false)
  })

  it('rejects input with empty message', () => {
    const result = safetyContactInputSchema.safeParse({
      message: '',
      safeContactInfo: null,
      urgency: 'when_you_can',
    })
    expect(result.success).toBe(false)
  })

  it('uses default urgency when not provided', () => {
    const result = safetyContactInputSchema.safeParse({
      message: 'Help me',
      safeContactInfo: null,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.urgency).toBe('when_you_can')
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
