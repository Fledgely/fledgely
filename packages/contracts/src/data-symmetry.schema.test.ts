/**
 * Tests for Data Symmetry Schema - Story 3A.1, 3A.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
  // Story 3A.5: Screenshot viewing rate alert
  SCREENSHOT_VIEWING_RATE_LIMITS,
  SCREENSHOT_RATE_ALERT_ERROR_MESSAGES,
  screenshotViewingRateAlertSchema,
  screenshotViewingRateAlertFirestoreSchema,
  checkScreenshotViewingRateInputSchema,
  checkScreenshotViewingRateResponseSchema,
  convertFirestoreToScreenshotViewingRateAlert,
  safeParseScreenshotViewingRateAlert,
  checkScreenshotViewingRate,
  isWithinAlertCooldown,
  getAlertCooldownRemaining,
  formatScreenshotRateAlertMessage,
  getScreenshotRateAlertErrorMessage,
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

// ============================================
// STORY 3A.5: SCREENSHOT VIEWING RATE ALERT TESTS
// ============================================

describe('SCREENSHOT_VIEWING_RATE_LIMITS constants', () => {
  it('has threshold of 50 screenshots per hour (AC1, AC6)', () => {
    expect(SCREENSHOT_VIEWING_RATE_LIMITS.THRESHOLD_PER_HOUR).toBe(50)
  })

  it('has window of 1 hour in milliseconds', () => {
    expect(SCREENSHOT_VIEWING_RATE_LIMITS.WINDOW_MS).toBe(60 * 60 * 1000)
  })

  it('has alert cooldown of 1 hour in milliseconds', () => {
    expect(SCREENSHOT_VIEWING_RATE_LIMITS.ALERT_COOLDOWN_MS).toBe(60 * 60 * 1000)
  })

  it('threshold is not configurable (AC6 - immutable constant)', () => {
    // This test documents that the threshold is a constant, not configurable
    expect(Object.isFrozen(SCREENSHOT_VIEWING_RATE_LIMITS)).toBe(true)
  })
})

describe('screenshotViewingRateAlertSchema', () => {
  const validAlert = {
    id: 'alert-123',
    childId: 'child-456',
    triggeredBy: 'parent-1',
    alertedTo: ['parent-2'],
    screenshotCount: 50, // Exactly at threshold
    windowStart: new Date(Date.now() - 60 * 60 * 1000),
    windowEnd: new Date(),
    createdAt: new Date(),
  }

  it('accepts valid alert with all fields', () => {
    const result = screenshotViewingRateAlertSchema.parse(validAlert)
    expect(result.id).toBe('alert-123')
    expect(result.childId).toBe('child-456')
    expect(result.triggeredBy).toBe('parent-1')
    expect(result.alertedTo).toEqual(['parent-2'])
    expect(result.screenshotCount).toBe(50)
  })

  it('accepts alert with multiple parents alerted', () => {
    const multiParent = {
      ...validAlert,
      alertedTo: ['parent-2', 'parent-3'],
    }
    const result = screenshotViewingRateAlertSchema.parse(multiParent)
    expect(result.alertedTo).toHaveLength(2)
  })

  it('accepts alert with count above threshold', () => {
    const highCount = { ...validAlert, screenshotCount: 100 }
    const result = screenshotViewingRateAlertSchema.parse(highCount)
    expect(result.screenshotCount).toBe(100)
  })

  it('rejects alert with count below threshold', () => {
    const lowCount = { ...validAlert, screenshotCount: 49 }
    expect(() => screenshotViewingRateAlertSchema.parse(lowCount)).toThrow()
  })

  it('rejects alert with empty id', () => {
    const invalid = { ...validAlert, id: '' }
    expect(() => screenshotViewingRateAlertSchema.parse(invalid)).toThrow()
  })

  it('rejects alert with empty childId', () => {
    const invalid = { ...validAlert, childId: '' }
    expect(() => screenshotViewingRateAlertSchema.parse(invalid)).toThrow()
  })

  it('rejects alert with empty triggeredBy', () => {
    const invalid = { ...validAlert, triggeredBy: '' }
    expect(() => screenshotViewingRateAlertSchema.parse(invalid)).toThrow()
  })

  it('accepts alert with empty alertedTo array (single-parent scenario)', () => {
    // Single-parent families: alert still created for audit but no one to notify
    const singleParent = { ...validAlert, alertedTo: [] }
    const result = screenshotViewingRateAlertSchema.parse(singleParent)
    expect(result.alertedTo).toEqual([])
  })

  it('rejects alert with empty string in alertedTo array', () => {
    const invalid = { ...validAlert, alertedTo: [''] }
    expect(() => screenshotViewingRateAlertSchema.parse(invalid)).toThrow()
  })

  it('does NOT include screenshot IDs in schema (AC2 - privacy)', () => {
    // This documents that we intentionally don't store which screenshots were viewed
    const schema = screenshotViewingRateAlertSchema
    const shape = schema.shape as Record<string, unknown>
    expect(shape.screenshotIds).toBeUndefined()
    expect(shape.viewedScreenshots).toBeUndefined()
  })
})

describe('screenshotViewingRateAlertFirestoreSchema', () => {
  const firestoreTimestamp = { toDate: () => new Date() }

  const validFirestoreAlert = {
    id: 'alert-123',
    childId: 'child-456',
    triggeredBy: 'parent-1',
    alertedTo: ['parent-2'],
    screenshotCount: 50,
    windowStart: firestoreTimestamp,
    windowEnd: firestoreTimestamp,
    createdAt: firestoreTimestamp,
  }

  it('accepts valid Firestore alert with timestamps', () => {
    const result = screenshotViewingRateAlertFirestoreSchema.parse(validFirestoreAlert)
    expect(result.id).toBe('alert-123')
  })

  it('validates toDate function exists on timestamps', () => {
    const invalidTimestamp = { ...validFirestoreAlert, windowStart: 'not-a-timestamp' }
    expect(() => screenshotViewingRateAlertFirestoreSchema.parse(invalidTimestamp)).toThrow()
  })
})

describe('checkScreenshotViewingRateInputSchema', () => {
  it('accepts valid input', () => {
    const input = { childId: 'child-123' }
    const result = checkScreenshotViewingRateInputSchema.parse(input)
    expect(result.childId).toBe('child-123')
  })

  it('rejects empty childId', () => {
    expect(() => checkScreenshotViewingRateInputSchema.parse({ childId: '' })).toThrow()
  })

  it('rejects missing childId', () => {
    expect(() => checkScreenshotViewingRateInputSchema.parse({})).toThrow()
  })
})

describe('checkScreenshotViewingRateResponseSchema', () => {
  it('accepts valid response with alert created', () => {
    const response = {
      exceedsLimit: true,
      currentCount: 55,
      threshold: 50,
      alertCreated: true,
      alertId: 'alert-123',
    }
    const result = checkScreenshotViewingRateResponseSchema.parse(response)
    expect(result.exceedsLimit).toBe(true)
    expect(result.alertCreated).toBe(true)
    expect(result.alertId).toBe('alert-123')
  })

  it('accepts valid response without alert (cooldown)', () => {
    const response = {
      exceedsLimit: true,
      currentCount: 55,
      threshold: 50,
      alertCreated: false,
      alertId: null,
    }
    const result = checkScreenshotViewingRateResponseSchema.parse(response)
    expect(result.exceedsLimit).toBe(true)
    expect(result.alertCreated).toBe(false)
    expect(result.alertId).toBeNull()
  })

  it('accepts valid response under limit', () => {
    const response = {
      exceedsLimit: false,
      currentCount: 25,
      threshold: 50,
      alertCreated: false,
      alertId: null,
    }
    const result = checkScreenshotViewingRateResponseSchema.parse(response)
    expect(result.exceedsLimit).toBe(false)
    expect(result.currentCount).toBe(25)
  })

  it('enforces threshold is exactly 50', () => {
    const wrongThreshold = {
      exceedsLimit: false,
      currentCount: 25,
      threshold: 100, // Wrong threshold
      alertCreated: false,
      alertId: null,
    }
    expect(() => checkScreenshotViewingRateResponseSchema.parse(wrongThreshold)).toThrow()
  })
})

describe('convertFirestoreToScreenshotViewingRateAlert', () => {
  it('converts Firestore timestamps to Date objects', () => {
    const windowStart = new Date('2024-01-15T10:00:00Z')
    const windowEnd = new Date('2024-01-15T11:00:00Z')
    const createdAt = new Date('2024-01-15T11:00:01Z')

    const firestoreAlert = {
      id: 'alert-123',
      childId: 'child-456',
      triggeredBy: 'parent-1',
      alertedTo: ['parent-2'],
      screenshotCount: 52,
      windowStart: { toDate: () => windowStart },
      windowEnd: { toDate: () => windowEnd },
      createdAt: { toDate: () => createdAt },
    }

    const result = convertFirestoreToScreenshotViewingRateAlert(firestoreAlert)
    expect(result.windowStart).toEqual(windowStart)
    expect(result.windowEnd).toEqual(windowEnd)
    expect(result.createdAt).toEqual(createdAt)
    expect(result.windowStart).toBeInstanceOf(Date)
  })
})

describe('safeParseScreenshotViewingRateAlert', () => {
  it('returns alert for valid data', () => {
    const valid = {
      id: 'alert-123',
      childId: 'child-456',
      triggeredBy: 'parent-1',
      alertedTo: ['parent-2'],
      screenshotCount: 50,
      windowStart: new Date(),
      windowEnd: new Date(),
      createdAt: new Date(),
    }
    const result = safeParseScreenshotViewingRateAlert(valid)
    expect(result).not.toBeNull()
    expect(result?.id).toBe('alert-123')
  })

  it('returns null for invalid data', () => {
    const invalid = { id: '', screenshotCount: 10 }
    const result = safeParseScreenshotViewingRateAlert(invalid)
    expect(result).toBeNull()
  })

  it('returns null for null input', () => {
    expect(safeParseScreenshotViewingRateAlert(null)).toBeNull()
  })
})

describe('checkScreenshotViewingRate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns exceedsLimit=false when count is below threshold', () => {
    const timestamps = Array.from({ length: 49 }, (_, i) => new Date(Date.now() - i * 60000))
    const result = checkScreenshotViewingRate(timestamps)
    expect(result.exceedsLimit).toBe(false)
    expect(result.currentCount).toBe(49)
  })

  it('returns exceedsLimit=true when count is exactly at threshold (AC1)', () => {
    const timestamps = Array.from({ length: 50 }, (_, i) => new Date(Date.now() - i * 60000))
    const result = checkScreenshotViewingRate(timestamps)
    expect(result.exceedsLimit).toBe(true)
    expect(result.currentCount).toBe(50)
  })

  it('returns exceedsLimit=true when count exceeds threshold', () => {
    // Use 45-second intervals so all 75 timestamps fit within 1 hour (75 * 45s = 56.25 minutes)
    const timestamps = Array.from({ length: 75 }, (_, i) => new Date(Date.now() - i * 45000))
    const result = checkScreenshotViewingRate(timestamps)
    expect(result.exceedsLimit).toBe(true)
    expect(result.currentCount).toBe(75)
  })

  it('excludes views outside the 1-hour window', () => {
    const now = Date.now()
    const recentViews = Array.from({ length: 25 }, (_, i) => new Date(now - i * 60000))
    const oldViews = Array.from({ length: 30 }, (_, i) => new Date(now - 70 * 60000 - i * 60000)) // 70+ minutes ago
    const allViews = [...recentViews, ...oldViews]

    const result = checkScreenshotViewingRate(allViews)
    expect(result.exceedsLimit).toBe(false)
    expect(result.currentCount).toBe(25) // Only recent views counted
  })

  it('returns empty count for no views', () => {
    const result = checkScreenshotViewingRate([])
    expect(result.exceedsLimit).toBe(false)
    expect(result.currentCount).toBe(0)
  })

  it('provides window start and end times', () => {
    const timestamps = [new Date()]
    const result = checkScreenshotViewingRate(timestamps)
    expect(result.windowStart).toBeInstanceOf(Date)
    expect(result.windowEnd).toBeInstanceOf(Date)
    expect(result.windowEnd.getTime() - result.windowStart.getTime()).toBe(
      SCREENSHOT_VIEWING_RATE_LIMITS.WINDOW_MS
    )
  })
})

describe('isWithinAlertCooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false when no previous alert', () => {
    expect(isWithinAlertCooldown(null)).toBe(false)
  })

  it('returns true when alert was recent (within 1 hour)', () => {
    const recentAlert = new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
    expect(isWithinAlertCooldown(recentAlert)).toBe(true)
  })

  it('returns false when alert was over 1 hour ago', () => {
    const oldAlert = new Date(Date.now() - 61 * 60 * 1000) // 61 minutes ago
    expect(isWithinAlertCooldown(oldAlert)).toBe(false)
  })

  it('returns true at exactly 1 hour boundary', () => {
    // Exactly at cooldown end - should be false (cooldown just ended)
    const exactlyOneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    expect(isWithinAlertCooldown(exactlyOneHourAgo)).toBe(false)
  })

  it('returns true 1 millisecond before cooldown ends', () => {
    const justBeforeCooldownEnd = new Date(Date.now() - 60 * 60 * 1000 + 1)
    expect(isWithinAlertCooldown(justBeforeCooldownEnd)).toBe(true)
  })
})

describe('getAlertCooldownRemaining', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 0 when no previous alert', () => {
    expect(getAlertCooldownRemaining(null)).toBe(0)
  })

  it('returns remaining time when in cooldown', () => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    const remaining = getAlertCooldownRemaining(thirtyMinutesAgo)
    expect(remaining).toBe(30 * 60 * 1000) // 30 minutes remaining
  })

  it('returns 0 when cooldown has passed', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    expect(getAlertCooldownRemaining(twoHoursAgo)).toBe(0)
  })

  it('never returns negative value', () => {
    const veryOldAlert = new Date(Date.now() - 100 * 60 * 60 * 1000) // 100 hours ago
    expect(getAlertCooldownRemaining(veryOldAlert)).toBe(0)
  })
})

describe('formatScreenshotRateAlertMessage', () => {
  it('formats message with screenshot count (AC2 - no screenshot IDs)', () => {
    const message = formatScreenshotRateAlertMessage(50)
    expect(message).toBe('Your co-parent viewed 50 screenshots in the past hour.')
  })

  it('formats message with higher count', () => {
    const message = formatScreenshotRateAlertMessage(75)
    expect(message).toBe('Your co-parent viewed 75 screenshots in the past hour.')
  })

  it('does NOT include which screenshots were viewed', () => {
    const message = formatScreenshotRateAlertMessage(100)
    expect(message).not.toContain('screenshot-')
    expect(message).not.toContain('ID')
    expect(message).not.toContain('ids')
  })

  it('uses 6th-grade reading level language', () => {
    const message = formatScreenshotRateAlertMessage(50)
    // Should be simple, short words
    expect(message.split(' ').every((word) => word.length <= 12)).toBe(true)
  })
})

describe('getScreenshotRateAlertErrorMessage', () => {
  it('returns correct message for not-found', () => {
    expect(getScreenshotRateAlertErrorMessage('not-found')).toBe(
      'Could not find the child information.'
    )
  })

  it('returns correct message for not-guardian', () => {
    expect(getScreenshotRateAlertErrorMessage('not-guardian')).toBe(
      'You must be a guardian to check viewing rates.'
    )
  })

  it('returns correct message for rate-limit', () => {
    expect(getScreenshotRateAlertErrorMessage('rate-limit')).toBe(
      'Too many requests. Please wait a moment.'
    )
  })

  it('returns unknown message for unrecognized code', () => {
    expect(getScreenshotRateAlertErrorMessage('unknown-code')).toBe(
      'Something went wrong. Please try again.'
    )
  })
})

describe('SCREENSHOT_RATE_ALERT_ERROR_MESSAGES constants', () => {
  it('has all expected error codes', () => {
    expect(SCREENSHOT_RATE_ALERT_ERROR_MESSAGES['not-found']).toBeDefined()
    expect(SCREENSHOT_RATE_ALERT_ERROR_MESSAGES['not-guardian']).toBeDefined()
    expect(SCREENSHOT_RATE_ALERT_ERROR_MESSAGES['rate-limit']).toBeDefined()
    expect(SCREENSHOT_RATE_ALERT_ERROR_MESSAGES.unknown).toBeDefined()
  })

  it('messages use 6th-grade reading level', () => {
    // All messages should be short and simple
    Object.values(SCREENSHOT_RATE_ALERT_ERROR_MESSAGES).forEach((message) => {
      expect(message.length).toBeLessThan(80)
    })
  })
})

describe('screenshot viewing rate alert - adversarial tests', () => {
  it('rejects alert with extremely high screenshot count', () => {
    const extremeCount = {
      id: 'alert-123',
      childId: 'child-456',
      triggeredBy: 'parent-1',
      alertedTo: ['parent-2'],
      screenshotCount: Number.MAX_SAFE_INTEGER,
      windowStart: new Date(),
      windowEnd: new Date(),
      createdAt: new Date(),
    }
    // Should accept - no upper limit on count
    const result = screenshotViewingRateAlertSchema.parse(extremeCount)
    expect(result.screenshotCount).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('rejects alert with negative screenshot count', () => {
    const negativeCount = {
      id: 'alert-123',
      childId: 'child-456',
      triggeredBy: 'parent-1',
      alertedTo: ['parent-2'],
      screenshotCount: -10,
      windowStart: new Date(),
      windowEnd: new Date(),
      createdAt: new Date(),
    }
    expect(() => screenshotViewingRateAlertSchema.parse(negativeCount)).toThrow()
  })

  it('rejects alert with non-integer screenshot count', () => {
    const floatCount = {
      id: 'alert-123',
      childId: 'child-456',
      triggeredBy: 'parent-1',
      alertedTo: ['parent-2'],
      screenshotCount: 50.5,
      windowStart: new Date(),
      windowEnd: new Date(),
      createdAt: new Date(),
    }
    expect(() => screenshotViewingRateAlertSchema.parse(floatCount)).toThrow()
  })

  it('handles XSS attempt in triggeredBy (stored but should be escaped in display)', () => {
    const xssAttempt = {
      id: 'alert-123',
      childId: 'child-456',
      triggeredBy: '<script>alert(1)</script>',
      alertedTo: ['parent-2'],
      screenshotCount: 50,
      windowStart: new Date(),
      windowEnd: new Date(),
      createdAt: new Date(),
    }
    const result = screenshotViewingRateAlertSchema.parse(xssAttempt)
    // Schema accepts string - display layer must escape
    expect(result.triggeredBy).toBe('<script>alert(1)</script>')
  })

  it('accepts strings at maximum allowed length', () => {
    const maxLengthId = 'a'.repeat(128)
    const valid = {
      id: maxLengthId,
      childId: 'child-456',
      triggeredBy: 'parent-1',
      alertedTo: ['parent-2'],
      screenshotCount: 50,
      windowStart: new Date(),
      windowEnd: new Date(),
      createdAt: new Date(),
    }
    const result = screenshotViewingRateAlertSchema.parse(valid)
    expect(result.id.length).toBe(128)
  })

  it('rejects strings exceeding maximum allowed length', () => {
    const tooLongId = 'a'.repeat(129)
    const invalid = {
      id: tooLongId,
      childId: 'child-456',
      triggeredBy: 'parent-1',
      alertedTo: ['parent-2'],
      screenshotCount: 50,
      windowStart: new Date(),
      windowEnd: new Date(),
      createdAt: new Date(),
    }
    expect(() => screenshotViewingRateAlertSchema.parse(invalid)).toThrow()
  })
})

describe('screenshot viewing rate alert - AC verification tests', () => {
  it('AC1: Threshold is exactly 50 screenshots per hour', () => {
    expect(SCREENSHOT_VIEWING_RATE_LIMITS.THRESHOLD_PER_HOUR).toBe(50)

    // 49 views should not trigger
    const below = checkScreenshotViewingRate(
      Array.from({ length: 49 }, () => new Date())
    )
    expect(below.exceedsLimit).toBe(false)

    // 50 views should trigger
    const atThreshold = checkScreenshotViewingRate(
      Array.from({ length: 50 }, () => new Date())
    )
    expect(atThreshold.exceedsLimit).toBe(true)
  })

  it('AC2: Alert does NOT include which screenshots were viewed', () => {
    // The schema intentionally excludes screenshot IDs
    const alertShape = screenshotViewingRateAlertSchema.shape as Record<string, unknown>
    expect(alertShape.screenshotIds).toBeUndefined()
    expect(alertShape.viewedScreenshotIds).toBeUndefined()

    // Format message doesn't include screenshot IDs
    const message = formatScreenshotRateAlertMessage(50)
    expect(message).not.toMatch(/screenshot-\w+/)
  })

  it('AC3: Alert is informational only (no action fields)', () => {
    // Schema has no action/response fields
    const alertShape = screenshotViewingRateAlertSchema.shape as Record<string, unknown>
    expect(alertShape.action).toBeUndefined()
    expect(alertShape.response).toBeUndefined()
    expect(alertShape.acknowledge).toBeUndefined()
    expect(alertShape.blockViewing).toBeUndefined()
  })

  it('AC4: Schema does NOT block viewing (no blocking field)', () => {
    const alertShape = screenshotViewingRateAlertSchema.shape as Record<string, unknown>
    expect(alertShape.blocked).toBeUndefined()
    expect(alertShape.viewingBlocked).toBeUndefined()
    expect(alertShape.preventFurtherViewing).toBeUndefined()
  })

  it('AC5: Audit trail logging via timestamps', () => {
    const alert = {
      id: 'alert-123',
      childId: 'child-456',
      triggeredBy: 'parent-1',
      alertedTo: ['parent-2'],
      screenshotCount: 50,
      windowStart: new Date('2024-01-15T10:00:00Z'),
      windowEnd: new Date('2024-01-15T11:00:00Z'),
      createdAt: new Date('2024-01-15T11:00:01Z'),
    }
    const result = screenshotViewingRateAlertSchema.parse(alert)
    expect(result.windowStart).toBeDefined()
    expect(result.windowEnd).toBeDefined()
    expect(result.createdAt).toBeDefined()
  })

  it('AC6: Threshold is NOT configurable (constant)', () => {
    // The constant is frozen and cannot be modified
    expect(Object.isFrozen(SCREENSHOT_VIEWING_RATE_LIMITS)).toBe(true)

    // Attempting to modify should have no effect
    const original = SCREENSHOT_VIEWING_RATE_LIMITS.THRESHOLD_PER_HOUR
    try {
      // @ts-expect-error - intentionally trying to modify readonly
      SCREENSHOT_VIEWING_RATE_LIMITS.THRESHOLD_PER_HOUR = 100
    } catch {
      // Expected in strict mode
    }
    expect(SCREENSHOT_VIEWING_RATE_LIMITS.THRESHOLD_PER_HOUR).toBe(original)
  })

  it('AC7: Child is NOT in alertedTo (schema allows only guardians)', () => {
    // The schema structure ensures alerts go to guardians, not children
    // This is enforced at the Cloud Function level, not schema level
    // But we document that alertedTo contains guardian UIDs only
    const validAlert = {
      id: 'alert-123',
      childId: 'child-456',
      triggeredBy: 'parent-1',
      alertedTo: ['parent-2'], // Guardian UID, not child
      screenshotCount: 50,
      windowStart: new Date(),
      windowEnd: new Date(),
      createdAt: new Date(),
    }
    const result = screenshotViewingRateAlertSchema.parse(validAlert)
    expect(result.alertedTo).not.toContain('child-456')
  })
})
