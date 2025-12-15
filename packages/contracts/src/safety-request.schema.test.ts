import { describe, it, expect } from 'vitest'
import {
  safetyRequestInputSchema,
  safetyRequestSchema,
  safetyRequestSourceSchema,
  safetyRequestStatusSchema,
} from './safety-request.schema'

describe('safetyRequestSourceSchema', () => {
  it('should accept "login-page" as valid source', () => {
    const result = safetyRequestSourceSchema.safeParse('login-page')
    expect(result.success).toBe(true)
  })

  it('should accept "settings" as valid source', () => {
    const result = safetyRequestSourceSchema.safeParse('settings')
    expect(result.success).toBe(true)
  })

  it('should reject invalid source values', () => {
    const result = safetyRequestSourceSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('safetyRequestStatusSchema', () => {
  it('should accept "pending" as valid status', () => {
    const result = safetyRequestStatusSchema.safeParse('pending')
    expect(result.success).toBe(true)
  })

  it('should accept "in-progress" as valid status', () => {
    const result = safetyRequestStatusSchema.safeParse('in-progress')
    expect(result.success).toBe(true)
  })

  it('should accept "resolved" as valid status', () => {
    const result = safetyRequestStatusSchema.safeParse('resolved')
    expect(result.success).toBe(true)
  })

  it('should reject invalid status values', () => {
    const result = safetyRequestStatusSchema.safeParse('closed')
    expect(result.success).toBe(false)
  })
})

describe('safetyRequestInputSchema', () => {
  it('should accept valid input with all fields', () => {
    const input = {
      message: 'I need help escaping a dangerous situation',
      safeEmail: 'safe@example.com',
      safePhone: '+1234567890',
      source: 'login-page',
    }
    const result = safetyRequestInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept valid input with only required fields', () => {
    const input = {
      message: 'I need help',
      source: 'settings',
    }
    const result = safetyRequestInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept empty string for optional email', () => {
    const input = {
      message: 'I need help',
      safeEmail: '',
      source: 'login-page',
    }
    const result = safetyRequestInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept empty string for optional phone', () => {
    const input = {
      message: 'I need help',
      safePhone: '',
      source: 'login-page',
    }
    const result = safetyRequestInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should reject empty message', () => {
    const input = {
      message: '',
      source: 'login-page',
    }
    const result = safetyRequestInputSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Message is required')
    }
  })

  it('should reject message over 5000 characters', () => {
    const input = {
      message: 'a'.repeat(5001),
      source: 'login-page',
    }
    const result = safetyRequestInputSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Message must be less than 5000 characters'
      )
    }
  })

  it('should reject invalid email format', () => {
    const input = {
      message: 'I need help',
      safeEmail: 'not-an-email',
      source: 'login-page',
    }
    const result = safetyRequestInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should reject invalid phone format with letters', () => {
    const input = {
      message: 'I need help',
      safePhone: 'call-me-maybe',
      source: 'login-page',
    }
    const result = safetyRequestInputSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Please enter a valid phone number')
    }
  })

  it('should accept valid phone formats', () => {
    const validPhones = ['+1 (555) 123-4567', '555-123-4567', '+44 20 7946 0958', '5551234567']
    validPhones.forEach((phone) => {
      const input = {
        message: 'I need help',
        safePhone: phone,
        source: 'login-page',
      }
      const result = safetyRequestInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  it('should reject missing source', () => {
    const input = {
      message: 'I need help',
    }
    const result = safetyRequestInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should reject invalid source', () => {
    const input = {
      message: 'I need help',
      source: 'invalid-source',
    }
    const result = safetyRequestInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})

describe('safetyRequestSchema', () => {
  it('should accept valid full safety request document', () => {
    const request = {
      message: 'I need help',
      safeEmail: 'safe@example.com',
      safePhone: '+1234567890',
      submittedBy: 'user123',
      submittedAt: new Date(),
      source: 'login-page',
      status: 'pending',
      assignedTo: 'support-agent-1',
      adminNotes: ['First contact made', 'Escalated to supervisor'],
    }
    const result = safetyRequestSchema.safeParse(request)
    expect(result.success).toBe(true)
  })

  it('should accept minimal safety request document', () => {
    const request = {
      message: 'I need help',
      submittedAt: new Date(),
      source: 'settings',
      status: 'pending',
    }
    const result = safetyRequestSchema.safeParse(request)
    expect(result.success).toBe(true)
  })

  it('should allow anonymous submissions (no submittedBy)', () => {
    const request = {
      message: 'Anonymous cry for help',
      submittedAt: new Date(),
      source: 'login-page',
      status: 'pending',
    }
    const result = safetyRequestSchema.safeParse(request)
    expect(result.success).toBe(true)
  })

  it('should reject invalid status in document', () => {
    const request = {
      message: 'I need help',
      submittedAt: new Date(),
      source: 'login-page',
      status: 'invalid-status',
    }
    const result = safetyRequestSchema.safeParse(request)
    expect(result.success).toBe(false)
  })
})
