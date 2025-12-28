/**
 * Unit tests for Safety Setting Change schemas.
 *
 * Story 3A.2: Safety Settings Two-Parent Approval - AC1
 */

import { describe, it, expect } from 'vitest'
import {
  safetySettingTypeSchema,
  settingChangeStatusSchema,
  safetySettingChangeSchema,
} from './index'

describe('safetySettingTypeSchema', () => {
  it('accepts valid safety setting types', () => {
    const validTypes = [
      'monitoring_interval',
      'retention_period',
      'time_limits',
      'age_restrictions',
    ]

    validTypes.forEach((type) => {
      const result = safetySettingTypeSchema.safeParse(type)
      expect(result.success).toBe(true)
    })
  })

  it('rejects invalid safety setting types', () => {
    const result = safetySettingTypeSchema.safeParse('invalid_setting')
    expect(result.success).toBe(false)
  })
})

describe('settingChangeStatusSchema', () => {
  it('accepts valid status values', () => {
    const validStatuses = ['pending_approval', 'approved', 'declined', 'expired']

    validStatuses.forEach((status) => {
      const result = settingChangeStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    })
  })

  it('rejects invalid status values', () => {
    const result = settingChangeStatusSchema.safeParse('invalid_status')
    expect(result.success).toBe(false)
  })
})

describe('safetySettingChangeSchema', () => {
  const validChange = {
    id: 'change-123',
    familyId: 'family-456',
    settingType: 'monitoring_interval',
    currentValue: { interval: 30 },
    proposedValue: { interval: 15 },
    proposedByUid: 'guardian-uid-1',
    approverUid: null,
    status: 'pending_approval',
    declineReason: null,
    isEmergencyIncrease: true,
    reviewExpiresAt: null,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    resolvedAt: null,
  }

  it('validates a complete pending change', () => {
    const result = safetySettingChangeSchema.safeParse(validChange)
    expect(result.success).toBe(true)
  })

  it('validates an approved change with approver', () => {
    const approvedChange = {
      ...validChange,
      status: 'approved',
      approverUid: 'guardian-uid-2',
      resolvedAt: new Date(),
    }

    const result = safetySettingChangeSchema.safeParse(approvedChange)
    expect(result.success).toBe(true)
  })

  it('validates a declined change with reason', () => {
    const declinedChange = {
      ...validChange,
      status: 'declined',
      approverUid: 'guardian-uid-2',
      declineReason: 'Not appropriate at this time',
      resolvedAt: new Date(),
    }

    const result = safetySettingChangeSchema.safeParse(declinedChange)
    expect(result.success).toBe(true)
  })

  it('validates an expired change', () => {
    const expiredChange = {
      ...validChange,
      status: 'expired',
      resolvedAt: new Date(),
    }

    const result = safetySettingChangeSchema.safeParse(expiredChange)
    expect(result.success).toBe(true)
  })

  it('validates emergency increase with review expiration', () => {
    const emergencyChange = {
      ...validChange,
      isEmergencyIncrease: true,
      reviewExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    }

    const result = safetySettingChangeSchema.safeParse(emergencyChange)
    expect(result.success).toBe(true)
  })

  it('validates non-emergency change (not more restrictive)', () => {
    const nonEmergencyChange = {
      ...validChange,
      isEmergencyIncrease: false,
      reviewExpiresAt: null,
    }

    const result = safetySettingChangeSchema.safeParse(nonEmergencyChange)
    expect(result.success).toBe(true)
  })

  it('rejects change with missing required fields', () => {
    const invalidChange = {
      id: 'change-123',
      familyId: 'family-456',
      // missing other required fields
    }

    const result = safetySettingChangeSchema.safeParse(invalidChange)
    expect(result.success).toBe(false)
  })

  it('rejects change with invalid settingType', () => {
    const invalidChange = {
      ...validChange,
      settingType: 'invalid_type',
    }

    const result = safetySettingChangeSchema.safeParse(invalidChange)
    expect(result.success).toBe(false)
  })

  it('rejects change with invalid status', () => {
    const invalidChange = {
      ...validChange,
      status: 'invalid_status',
    }

    const result = safetySettingChangeSchema.safeParse(invalidChange)
    expect(result.success).toBe(false)
  })

  it('validates all safety setting types', () => {
    const settingTypes = [
      'monitoring_interval',
      'retention_period',
      'time_limits',
      'age_restrictions',
    ]

    settingTypes.forEach((settingType) => {
      const change = {
        ...validChange,
        settingType,
      }

      const result = safetySettingChangeSchema.safeParse(change)
      expect(result.success).toBe(true)
    })
  })

  it('validates currentValue and proposedValue as unknown types', () => {
    const changeWithDifferentValues = {
      ...validChange,
      currentValue: 60, // number
      proposedValue: { minutes: 30, enabled: true }, // object
    }

    const result = safetySettingChangeSchema.safeParse(changeWithDifferentValues)
    expect(result.success).toBe(true)
  })

  it('validates null values where allowed', () => {
    const changeWithNulls = {
      ...validChange,
      approverUid: null,
      declineReason: null,
      reviewExpiresAt: null,
      resolvedAt: null,
    }

    const result = safetySettingChangeSchema.safeParse(changeWithNulls)
    expect(result.success).toBe(true)
  })
})
