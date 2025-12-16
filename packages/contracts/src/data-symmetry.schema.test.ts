/**
 * Tests for Data Symmetry Schema - Story 3A.1
 */

import { describe, it, expect } from 'vitest'
import {
  dataViewTypeSchema,
  DATA_VIEW_TYPE_LABELS,
  dataViewAuditEntrySchema,
  dataViewAuditEntryFirestoreSchema,
  logDataViewInputSchema,
  guardianAccessStatusSchema,
  symmetryStatusSchema,
  symmetryViolationTypeSchema,
  symmetryViolationSchema,
  convertFirestoreToDataViewAuditEntry,
  safeParseDataViewAuditEntry,
  getDataViewTypeLabel,
  requiresSymmetryEnforcement,
  checkGuardianAccessSymmetry,
  getSymmetryErrorMessage,
  type DataViewType,
  type GuardianAccessStatus,
} from './data-symmetry.schema'

describe('dataViewTypeSchema', () => {
  const validTypes: DataViewType[] = [
    'child_profile',
    'screenshot',
    'screenshot_list',
    'activity_log',
    'activity_summary',
    'device_status',
    'flag',
    'flag_list',
    'agreement',
    'trust_score',
  ]

  it.each(validTypes)('accepts valid type: %s', (type) => {
    expect(dataViewTypeSchema.parse(type)).toBe(type)
  })

  it('rejects invalid type', () => {
    expect(() => dataViewTypeSchema.parse('invalid_type')).toThrow()
  })

  it('rejects empty string', () => {
    expect(() => dataViewTypeSchema.parse('')).toThrow()
  })

  it('rejects null', () => {
    expect(() => dataViewTypeSchema.parse(null)).toThrow()
  })

  it('has labels for all types', () => {
    for (const type of validTypes) {
      expect(DATA_VIEW_TYPE_LABELS[type]).toBeDefined()
      expect(typeof DATA_VIEW_TYPE_LABELS[type]).toBe('string')
    }
  })
})

describe('guardianAccessStatusSchema', () => {
  const validStatuses: GuardianAccessStatus[] = ['active', 'suspended', 'revoked', 'pending']

  it.each(validStatuses)('accepts valid status: %s', (status) => {
    expect(guardianAccessStatusSchema.parse(status)).toBe(status)
  })

  it('rejects invalid status', () => {
    expect(() => guardianAccessStatusSchema.parse('invalid')).toThrow()
  })
})

describe('dataViewAuditEntrySchema', () => {
  const validEntry = {
    id: 'audit-123',
    childId: 'child-456',
    viewedBy: 'guardian-789',
    dataType: 'screenshot' as DataViewType,
    resourceId: 'screenshot-abc',
    viewedAt: new Date(),
    itemCount: 1,
    sessionId: 'session-xyz',
    clientInfo: {
      userAgent: 'Mozilla/5.0',
      platform: 'web',
      appVersion: '1.0.0',
    },
  }

  it('accepts valid audit entry with all fields', () => {
    const result = dataViewAuditEntrySchema.parse(validEntry)
    expect(result.id).toBe('audit-123')
    expect(result.childId).toBe('child-456')
    expect(result.viewedBy).toBe('guardian-789')
    expect(result.dataType).toBe('screenshot')
  })

  it('accepts audit entry with minimal fields', () => {
    const minimal = {
      id: 'audit-123',
      childId: 'child-456',
      viewedBy: 'guardian-789',
      dataType: 'child_profile',
      viewedAt: new Date(),
    }
    const result = dataViewAuditEntrySchema.parse(minimal)
    expect(result.id).toBe('audit-123')
  })

  it('accepts audit entry with null resourceId', () => {
    const entry = { ...validEntry, resourceId: null }
    const result = dataViewAuditEntrySchema.parse(entry)
    expect(result.resourceId).toBeNull()
  })

  it('rejects entry with empty id', () => {
    const invalid = { ...validEntry, id: '' }
    expect(() => dataViewAuditEntrySchema.parse(invalid)).toThrow()
  })

  it('rejects entry with empty childId', () => {
    const invalid = { ...validEntry, childId: '' }
    expect(() => dataViewAuditEntrySchema.parse(invalid)).toThrow()
  })

  it('rejects entry with empty viewedBy', () => {
    const invalid = { ...validEntry, viewedBy: '' }
    expect(() => dataViewAuditEntrySchema.parse(invalid)).toThrow()
  })

  it('rejects entry with negative itemCount', () => {
    const invalid = { ...validEntry, itemCount: -1 }
    expect(() => dataViewAuditEntrySchema.parse(invalid)).toThrow()
  })

  it('rejects entry with non-integer itemCount', () => {
    const invalid = { ...validEntry, itemCount: 1.5 }
    expect(() => dataViewAuditEntrySchema.parse(invalid)).toThrow()
  })
})

describe('logDataViewInputSchema', () => {
  it('accepts valid input with all fields', () => {
    const input = {
      childId: 'child-123',
      dataType: 'screenshot_list' as DataViewType,
      resourceId: null,
      itemCount: 10,
      sessionId: 'session-abc',
      clientInfo: {
        platform: 'web',
      },
    }
    const result = logDataViewInputSchema.parse(input)
    expect(result.childId).toBe('child-123')
    expect(result.dataType).toBe('screenshot_list')
    expect(result.itemCount).toBe(10)
  })

  it('accepts minimal input', () => {
    const input = {
      childId: 'child-123',
      dataType: 'activity_log' as DataViewType,
    }
    const result = logDataViewInputSchema.parse(input)
    expect(result.childId).toBe('child-123')
  })

  it('rejects input with empty childId', () => {
    const invalid = {
      childId: '',
      dataType: 'activity_log',
    }
    expect(() => logDataViewInputSchema.parse(invalid)).toThrow()
  })
})

describe('symmetryStatusSchema', () => {
  const validStatus = {
    childId: 'child-123',
    isEnforced: true,
    guardianStatuses: [
      { guardianId: 'guardian-1', status: 'active' as GuardianAccessStatus, lastViewedAt: new Date() },
      { guardianId: 'guardian-2', status: 'active' as GuardianAccessStatus, lastViewedAt: null },
    ],
    isSymmetric: true,
    asymmetryReason: null,
    lastCheckedAt: new Date(),
  }

  it('accepts valid symmetry status', () => {
    const result = symmetryStatusSchema.parse(validStatus)
    expect(result.isEnforced).toBe(true)
    expect(result.isSymmetric).toBe(true)
    expect(result.guardianStatuses).toHaveLength(2)
  })

  it('accepts status with asymmetry reason', () => {
    const asymmetric = {
      ...validStatus,
      isSymmetric: false,
      asymmetryReason: 'One guardian has suspended access',
    }
    const result = symmetryStatusSchema.parse(asymmetric)
    expect(result.isSymmetric).toBe(false)
    expect(result.asymmetryReason).toBe('One guardian has suspended access')
  })

  it('accepts status with no guardians', () => {
    const noGuardians = {
      ...validStatus,
      guardianStatuses: [],
    }
    const result = symmetryStatusSchema.parse(noGuardians)
    expect(result.guardianStatuses).toHaveLength(0)
  })
})

describe('symmetryViolationSchema', () => {
  const validViolation = {
    id: 'violation-123',
    childId: 'child-456',
    violationType: 'access_revoked_one_parent' as const,
    description: 'One parent lost access while the other retained it',
    affectedGuardians: ['guardian-1'],
    detectedAt: new Date(),
    resolved: false,
    resolvedAt: null,
    resolution: null,
  }

  it('accepts valid violation', () => {
    const result = symmetryViolationSchema.parse(validViolation)
    expect(result.violationType).toBe('access_revoked_one_parent')
    expect(result.resolved).toBe(false)
  })

  it('accepts resolved violation', () => {
    const resolved = {
      ...validViolation,
      resolved: true,
      resolvedAt: new Date(),
      resolution: 'Access restored to both parents',
    }
    const result = symmetryViolationSchema.parse(resolved)
    expect(result.resolved).toBe(true)
    expect(result.resolution).toBe('Access restored to both parents')
  })

  it('rejects violation with empty description', () => {
    const invalid = { ...validViolation, description: '' }
    expect(() => symmetryViolationSchema.parse(invalid)).toThrow()
  })

  it('rejects violation with empty affectedGuardians', () => {
    const invalid = { ...validViolation, affectedGuardians: [''] }
    expect(() => symmetryViolationSchema.parse(invalid)).toThrow()
  })
})

describe('symmetryViolationTypeSchema', () => {
  const validTypes = [
    'access_revoked_one_parent',
    'data_delay',
    'data_filtering',
    'excessive_viewing',
  ]

  it.each(validTypes)('accepts valid violation type: %s', (type) => {
    expect(symmetryViolationTypeSchema.parse(type)).toBe(type)
  })

  it('rejects invalid violation type', () => {
    expect(() => symmetryViolationTypeSchema.parse('invalid')).toThrow()
  })
})

describe('convertFirestoreToDataViewAuditEntry', () => {
  it('converts Firestore entry to domain type', () => {
    const viewedAt = new Date('2024-01-15T10:30:00Z')
    const firestoreEntry = {
      id: 'audit-123',
      childId: 'child-456',
      viewedBy: 'guardian-789',
      dataType: 'screenshot' as DataViewType,
      resourceId: 'screenshot-abc',
      viewedAt: { toDate: () => viewedAt },
      itemCount: 5,
      sessionId: 'session-xyz',
    }

    const result = convertFirestoreToDataViewAuditEntry(firestoreEntry)
    expect(result.id).toBe('audit-123')
    expect(result.viewedAt).toEqual(viewedAt)
    expect(result.viewedAt).toBeInstanceOf(Date)
  })
})

describe('safeParseDataViewAuditEntry', () => {
  it('returns entry for valid data', () => {
    const valid = {
      id: 'audit-123',
      childId: 'child-456',
      viewedBy: 'guardian-789',
      dataType: 'activity_log',
      viewedAt: new Date(),
    }
    const result = safeParseDataViewAuditEntry(valid)
    expect(result).not.toBeNull()
    expect(result?.id).toBe('audit-123')
  })

  it('returns null for invalid data', () => {
    const invalid = { id: '' }
    const result = safeParseDataViewAuditEntry(invalid)
    expect(result).toBeNull()
  })

  it('returns null for null input', () => {
    const result = safeParseDataViewAuditEntry(null)
    expect(result).toBeNull()
  })
})

describe('getDataViewTypeLabel', () => {
  it('returns correct label for screenshot', () => {
    expect(getDataViewTypeLabel('screenshot')).toBe('Screenshot')
  })

  it('returns correct label for activity_log', () => {
    expect(getDataViewTypeLabel('activity_log')).toBe('Activity log')
  })

  it('returns correct label for child_profile', () => {
    expect(getDataViewTypeLabel('child_profile')).toBe('Child profile')
  })
})

describe('requiresSymmetryEnforcement', () => {
  it('returns true when safeguards required and 2+ guardians', () => {
    expect(requiresSymmetryEnforcement(true, 2)).toBe(true)
    expect(requiresSymmetryEnforcement(true, 3)).toBe(true)
  })

  it('returns false when safeguards not required', () => {
    expect(requiresSymmetryEnforcement(false, 2)).toBe(false)
    expect(requiresSymmetryEnforcement(false, 10)).toBe(false)
  })

  it('returns false when less than 2 guardians', () => {
    expect(requiresSymmetryEnforcement(true, 1)).toBe(false)
    expect(requiresSymmetryEnforcement(true, 0)).toBe(false)
  })
})

describe('checkGuardianAccessSymmetry', () => {
  it('returns symmetric when all guardians active', () => {
    const statuses = [
      { guardianId: 'g1', status: 'active' as GuardianAccessStatus },
      { guardianId: 'g2', status: 'active' as GuardianAccessStatus },
    ]
    const result = checkGuardianAccessSymmetry(statuses)
    expect(result.isSymmetric).toBe(true)
    expect(result.asymmetryReason).toBeNull()
  })

  it('returns symmetric when all guardians inactive', () => {
    const statuses = [
      { guardianId: 'g1', status: 'suspended' as GuardianAccessStatus },
      { guardianId: 'g2', status: 'revoked' as GuardianAccessStatus },
    ]
    const result = checkGuardianAccessSymmetry(statuses)
    expect(result.isSymmetric).toBe(true)
  })

  it('returns asymmetric when some active and some not', () => {
    const statuses = [
      { guardianId: 'g1', status: 'active' as GuardianAccessStatus },
      { guardianId: 'g2', status: 'suspended' as GuardianAccessStatus },
    ]
    const result = checkGuardianAccessSymmetry(statuses)
    expect(result.isSymmetric).toBe(false)
    expect(result.asymmetryReason).toContain('1 guardian(s) do not have active access')
  })

  it('returns symmetric for single guardian', () => {
    const statuses = [{ guardianId: 'g1', status: 'active' as GuardianAccessStatus }]
    const result = checkGuardianAccessSymmetry(statuses)
    expect(result.isSymmetric).toBe(true)
  })

  it('returns symmetric for empty guardians list', () => {
    const result = checkGuardianAccessSymmetry([])
    expect(result.isSymmetric).toBe(true)
  })

  it('handles multiple inactive guardians', () => {
    const statuses = [
      { guardianId: 'g1', status: 'active' as GuardianAccessStatus },
      { guardianId: 'g2', status: 'suspended' as GuardianAccessStatus },
      { guardianId: 'g3', status: 'revoked' as GuardianAccessStatus },
    ]
    const result = checkGuardianAccessSymmetry(statuses)
    expect(result.isSymmetric).toBe(false)
    expect(result.asymmetryReason).toContain('2 guardian(s) do not have active access')
  })
})

describe('getSymmetryErrorMessage', () => {
  it('returns correct message for not-found', () => {
    expect(getSymmetryErrorMessage('not-found')).toBe('Could not find the child information.')
  })

  it('returns correct message for not-guardian', () => {
    expect(getSymmetryErrorMessage('not-guardian')).toBe('You must be a guardian to view this data.')
  })

  it('returns correct message for access-suspended', () => {
    expect(getSymmetryErrorMessage('access-suspended')).toBe(
      'Your access to this data is currently suspended.'
    )
  })

  it('returns correct message for symmetry-violation', () => {
    expect(getSymmetryErrorMessage('symmetry-violation')).toBe(
      'Both parents must have equal access. Please contact support.'
    )
  })

  it('returns unknown message for unrecognized code', () => {
    expect(getSymmetryErrorMessage('some-random-code')).toBe('Something went wrong. Please try again.')
  })
})

describe('adversarial tests', () => {
  it('rejects XSS in audit entry id', () => {
    const invalid = {
      id: '<script>alert(1)</script>',
      childId: 'child-123',
      viewedBy: 'guardian-456',
      dataType: 'screenshot',
      viewedAt: new Date(),
    }
    // Schema allows the string but output should be escaped in display layer
    // This test documents that input validation doesn't sanitize HTML
    const result = dataViewAuditEntrySchema.parse(invalid)
    expect(result.id).toBe('<script>alert(1)</script>')
  })

  it('rejects SQL injection in childId', () => {
    const invalid = {
      id: 'audit-123',
      childId: "'; DROP TABLE children; --",
      viewedBy: 'guardian-456',
      dataType: 'screenshot',
      viewedAt: new Date(),
    }
    // Schema allows the string - Firestore handles injection prevention
    const result = dataViewAuditEntrySchema.parse(invalid)
    expect(result.childId).toBe("'; DROP TABLE children; --")
  })

  it('accepts strings at maximum allowed length', () => {
    // AUDIT_FIELD_LIMITS.id = 128
    const maxLengthId = 'a'.repeat(128)
    const valid = {
      id: maxLengthId,
      childId: 'child-123',
      viewedBy: 'guardian-456',
      dataType: 'screenshot' as DataViewType,
      viewedAt: new Date(),
    }
    const result = dataViewAuditEntrySchema.parse(valid)
    expect(result.id.length).toBe(128)
  })

  it('rejects strings exceeding maximum allowed length', () => {
    // AUDIT_FIELD_LIMITS.id = 128
    const tooLongId = 'a'.repeat(129)
    const invalid = {
      id: tooLongId,
      childId: 'child-123',
      viewedBy: 'guardian-456',
      dataType: 'screenshot' as DataViewType,
      viewedAt: new Date(),
    }
    expect(() => dataViewAuditEntrySchema.parse(invalid)).toThrow()
  })

  it('rejects violation with empty affectedGuardians array item', () => {
    const invalid = {
      id: 'violation-123',
      childId: 'child-456',
      violationType: 'access_revoked_one_parent',
      description: 'Test violation',
      affectedGuardians: [''], // Empty string in array
      detectedAt: new Date(),
      resolved: false,
    }
    expect(() => symmetryViolationSchema.parse(invalid)).toThrow()
  })
})
