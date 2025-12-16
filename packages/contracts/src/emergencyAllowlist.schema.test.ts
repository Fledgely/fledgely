/**
 * Emergency Allowlist Schema Tests
 *
 * Story 7.4: Emergency Allowlist Push - Task 2.6
 *
 * Tests for emergency allowlist push Zod schemas.
 */

import { describe, it, expect } from 'vitest'
import {
  emergencyPushSchema,
  emergencyPushRecordSchema,
  emergencyOverrideEntrySchema,
  emergencyPushStatusSchema,
  type EmergencyPush,
  type EmergencyPushRecord,
  type EmergencyOverrideEntry,
  type EmergencyPushStatus,
} from './emergencyAllowlist.schema'
import type { CrisisUrlEntry } from '@fledgely/shared'

const validCrisisEntry: CrisisUrlEntry = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  domain: 'newcrisisresource.org',
  category: 'crisis',
  aliases: [],
  wildcardPatterns: [],
  name: 'New Crisis Resource',
  description: 'Emergency crisis support',
  region: 'us',
  contactMethods: ['phone', 'chat'],
  phoneNumber: '1-800-NEW-HELP',
}

describe('emergencyPushStatusSchema', () => {
  it('accepts valid status values', () => {
    const statuses: EmergencyPushStatus[] = [
      'pending',
      'propagated',
      'verified',
      'failed',
    ]

    for (const status of statuses) {
      const result = emergencyPushStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status values', () => {
    const result = emergencyPushStatusSchema.safeParse('unknown')
    expect(result.success).toBe(false)
  })
})

describe('emergencyPushSchema', () => {
  it('accepts valid emergency push input', () => {
    const input: EmergencyPush = {
      entries: [validCrisisEntry],
      reason: 'New crisis hotline identified for immediate protection',
      operator: 'admin@fledgely.com',
    }

    const result = emergencyPushSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('requires entries array', () => {
    const input = {
      reason: 'Test reason for emergency push',
      operator: 'admin@fledgely.com',
    }

    const result = emergencyPushSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('requires at least one entry', () => {
    const input = {
      entries: [],
      reason: 'Test reason for emergency push',
      operator: 'admin@fledgely.com',
    }

    const result = emergencyPushSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('requires reason with minimum length', () => {
    const input = {
      entries: [validCrisisEntry],
      reason: 'Short', // Less than 10 characters
      operator: 'admin@fledgely.com',
    }

    const result = emergencyPushSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('10 characters')
    }
  })

  it('rejects invalid operator email when provided', () => {
    const input = {
      entries: [validCrisisEntry],
      reason: 'Test reason for emergency push',
      operator: 'not-an-email',
    }

    const result = emergencyPushSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('accepts input without operator (optional)', () => {
    const input = {
      entries: [validCrisisEntry],
      reason: 'Test reason for emergency push',
    }

    const result = emergencyPushSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('accepts multiple entries', () => {
    const secondEntry = {
      ...validCrisisEntry,
      id: '550e8400-e29b-41d4-a716-446655440002',
      domain: 'anotherresource.org',
      name: 'Another Crisis Resource',
    }

    const input = {
      entries: [validCrisisEntry, secondEntry],
      reason: 'Multiple crisis resources identified',
      operator: 'admin@fledgely.com',
    }

    const result = emergencyPushSchema.safeParse(input)
    expect(result.success).toBe(true)
  })
})

describe('emergencyPushRecordSchema', () => {
  it('accepts valid emergency push record', () => {
    const record: EmergencyPushRecord = {
      id: '550e8400-e29b-41d4-a716-446655440099',
      entries: [validCrisisEntry],
      reason: 'New crisis hotline identified for immediate protection',
      operator: 'admin@fledgely.com',
      timestamp: '2025-12-16T12:00:00.000Z',
      status: 'pending',
    }

    const result = emergencyPushRecordSchema.safeParse(record)
    expect(result.success).toBe(true)
  })

  it('requires UUID for id', () => {
    const record = {
      id: 'not-a-uuid',
      entries: [validCrisisEntry],
      reason: 'New crisis hotline identified for immediate protection',
      operator: 'admin@fledgely.com',
      timestamp: '2025-12-16T12:00:00.000Z',
      status: 'pending',
    }

    const result = emergencyPushRecordSchema.safeParse(record)
    expect(result.success).toBe(false)
  })

  it('requires valid ISO timestamp', () => {
    const record = {
      id: '550e8400-e29b-41d4-a716-446655440099',
      entries: [validCrisisEntry],
      reason: 'New crisis hotline identified for immediate protection',
      operator: 'admin@fledgely.com',
      timestamp: 'not-a-date',
      status: 'pending',
    }

    const result = emergencyPushRecordSchema.safeParse(record)
    expect(result.success).toBe(false)
  })

  it('requires valid status', () => {
    const record = {
      id: '550e8400-e29b-41d4-a716-446655440099',
      entries: [validCrisisEntry],
      reason: 'New crisis hotline identified for immediate protection',
      operator: 'admin@fledgely.com',
      timestamp: '2025-12-16T12:00:00.000Z',
      status: 'invalid',
    }

    const result = emergencyPushRecordSchema.safeParse(record)
    expect(result.success).toBe(false)
  })

  it('accepts optional verifiedAt when verified', () => {
    const record: EmergencyPushRecord = {
      id: '550e8400-e29b-41d4-a716-446655440099',
      entries: [validCrisisEntry],
      reason: 'New crisis hotline identified for immediate protection',
      operator: 'admin@fledgely.com',
      timestamp: '2025-12-16T12:00:00.000Z',
      status: 'verified',
      verifiedAt: '2025-12-16T12:30:00.000Z',
    }

    const result = emergencyPushRecordSchema.safeParse(record)
    expect(result.success).toBe(true)
  })

  it('accepts optional failureReason when failed', () => {
    const record: EmergencyPushRecord = {
      id: '550e8400-e29b-41d4-a716-446655440099',
      entries: [validCrisisEntry],
      reason: 'New crisis hotline identified for immediate protection',
      operator: 'admin@fledgely.com',
      timestamp: '2025-12-16T12:00:00.000Z',
      status: 'failed',
      failureReason: 'Verification timeout after 15 minutes',
    }

    const result = emergencyPushRecordSchema.safeParse(record)
    expect(result.success).toBe(true)
  })
})

describe('emergencyOverrideEntrySchema', () => {
  it('accepts valid override entry', () => {
    const entry: EmergencyOverrideEntry = {
      id: '550e8400-e29b-41d4-a716-446655440050',
      entry: validCrisisEntry,
      addedAt: '2025-12-16T12:00:00.000Z',
      reason: 'New crisis hotline identified for immediate protection',
      pushId: '550e8400-e29b-41d4-a716-446655440099',
    }

    const result = emergencyOverrideEntrySchema.safeParse(entry)
    expect(result.success).toBe(true)
  })

  it('requires valid entry', () => {
    const entry = {
      id: '550e8400-e29b-41d4-a716-446655440050',
      entry: { invalid: 'entry' },
      addedAt: '2025-12-16T12:00:00.000Z',
      reason: 'New crisis hotline identified for immediate protection',
      pushId: '550e8400-e29b-41d4-a716-446655440099',
    }

    const result = emergencyOverrideEntrySchema.safeParse(entry)
    expect(result.success).toBe(false)
  })

  it('requires UUID for pushId', () => {
    const entry = {
      id: '550e8400-e29b-41d4-a716-446655440050',
      entry: validCrisisEntry,
      addedAt: '2025-12-16T12:00:00.000Z',
      reason: 'New crisis hotline identified for immediate protection',
      pushId: 'not-a-uuid',
    }

    const result = emergencyOverrideEntrySchema.safeParse(entry)
    expect(result.success).toBe(false)
  })
})
