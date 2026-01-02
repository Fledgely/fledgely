/**
 * Graduation Process Contract Tests - Story 38.3 Task 1
 *
 * Tests for Zod schemas and types for the formal graduation process.
 * AC1: Both parties must confirm graduation decision (dual-consent)
 * AC2: Graduation date can be immediate or scheduled for future
 * AC5: Existing data enters deletion queue with configurable retention
 * AC6: Child account transitions to alumni status
 */

import { describe, it, expect } from 'vitest'
import {
  graduationTypeSchema,
  accountStatusSchema,
  confirmationRecordSchema,
  graduationDecisionSchema,
  graduationCertificateSchema,
  alumniRecordSchema,
  deletionQueueEntrySchema,
  dataTypeSchema,
  deletionStatusSchema,
  alumniPreferencesSchema,
  type ConfirmationRecord,
  type GraduationDecision,
  type GraduationCertificate,
  type AlumniRecord,
  type DeletionQueueEntry,
  type DataType,
  type DeletionStatus,
  type AlumniPreferences,
  GRADUATION_RETENTION_DAYS,
  MIN_SCHEDULE_DAYS,
  MAX_SCHEDULE_DAYS,
  createInitialGraduationDecision,
  hasAllConfirmations,
  resolveGraduationType,
  isValidScheduledDate,
  calculateDeletionDate,
  getDecisionDaysUntilExpiry,
  isDecisionExpired,
  DECISION_EXPIRY_DAYS,
} from './graduationProcess'

// ============================================
// Graduation Type Schema Tests
// ============================================

describe('graduationTypeSchema', () => {
  it('should accept "immediate" type', () => {
    const result = graduationTypeSchema.safeParse('immediate')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('immediate')
    }
  })

  it('should accept "scheduled" type', () => {
    const result = graduationTypeSchema.safeParse('scheduled')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('scheduled')
    }
  })

  it('should reject invalid graduation type', () => {
    const result = graduationTypeSchema.safeParse('delayed')
    expect(result.success).toBe(false)
  })
})

// ============================================
// Account Status Schema Tests
// ============================================

describe('accountStatusSchema', () => {
  it('should accept "active" status', () => {
    const result = accountStatusSchema.safeParse('active')
    expect(result.success).toBe(true)
  })

  it('should accept "alumni" status', () => {
    const result = accountStatusSchema.safeParse('alumni')
    expect(result.success).toBe(true)
  })

  it('should accept "deleted" status', () => {
    const result = accountStatusSchema.safeParse('deleted')
    expect(result.success).toBe(true)
  })

  it('should reject invalid status', () => {
    const result = accountStatusSchema.safeParse('suspended')
    expect(result.success).toBe(false)
  })
})

// ============================================
// Data Type Schema Tests
// ============================================

describe('dataTypeSchema', () => {
  const validTypes: DataType[] = ['screenshots', 'flags', 'activity_logs', 'trust_history', 'all']

  it.each(validTypes)('should accept "%s" data type', (type) => {
    const result = dataTypeSchema.safeParse(type)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe(type)
    }
  })

  it('should reject invalid data type', () => {
    const result = dataTypeSchema.safeParse('messages')
    expect(result.success).toBe(false)
  })
})

// ============================================
// Deletion Status Schema Tests
// ============================================

describe('deletionStatusSchema', () => {
  const validStatuses: DeletionStatus[] = ['queued', 'processing', 'completed', 'failed']

  it.each(validStatuses)('should accept "%s" deletion status', (status) => {
    const result = deletionStatusSchema.safeParse(status)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe(status)
    }
  })

  it('should reject invalid deletion status', () => {
    const result = deletionStatusSchema.safeParse('pending')
    expect(result.success).toBe(false)
  })
})

// ============================================
// Confirmation Record Schema Tests
// ============================================

describe('confirmationRecordSchema', () => {
  it('should validate a child confirmation record', () => {
    const record: ConfirmationRecord = {
      userId: 'child-123',
      role: 'child',
      confirmedAt: new Date(),
      selectedGraduationType: 'immediate',
      scheduledDatePreference: null,
    }
    const result = confirmationRecordSchema.safeParse(record)
    expect(result.success).toBe(true)
  })

  it('should validate a parent confirmation record with scheduled date', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)

    const record: ConfirmationRecord = {
      userId: 'parent-456',
      role: 'parent',
      confirmedAt: new Date(),
      selectedGraduationType: 'scheduled',
      scheduledDatePreference: futureDate,
    }
    const result = confirmationRecordSchema.safeParse(record)
    expect(result.success).toBe(true)
  })

  it('should require userId', () => {
    const result = confirmationRecordSchema.safeParse({
      role: 'child',
      confirmedAt: new Date(),
      selectedGraduationType: 'immediate',
      scheduledDatePreference: null,
    })
    expect(result.success).toBe(false)
  })

  it('should require valid role', () => {
    const result = confirmationRecordSchema.safeParse({
      userId: 'user-123',
      role: 'caregiver',
      confirmedAt: new Date(),
      selectedGraduationType: 'immediate',
      scheduledDatePreference: null,
    })
    expect(result.success).toBe(false)
  })
})

// ============================================
// Graduation Decision Schema Tests
// ============================================

describe('graduationDecisionSchema', () => {
  const createValidDecision = (overrides?: Partial<GraduationDecision>): GraduationDecision => ({
    id: 'decision-123',
    conversationId: 'conv-456',
    familyId: 'family-789',
    childId: 'child-001',
    requiredParentIds: ['parent-001', 'parent-002'],
    graduationType: 'immediate',
    scheduledDate: null,
    childConfirmation: null,
    parentConfirmations: [],
    status: 'pending',
    createdAt: new Date(),
    confirmedAt: null,
    completedAt: null,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ...overrides,
  })

  it('should validate a pending graduation decision', () => {
    const decision = createValidDecision()
    const result = graduationDecisionSchema.safeParse(decision)
    expect(result.success).toBe(true)
  })

  it('should validate a confirmed decision with confirmations', () => {
    const decision = createValidDecision({
      status: 'confirmed',
      childConfirmation: {
        userId: 'child-001',
        role: 'child',
        confirmedAt: new Date(),
        selectedGraduationType: 'immediate',
        scheduledDatePreference: null,
      },
      parentConfirmations: [
        {
          userId: 'parent-001',
          role: 'parent',
          confirmedAt: new Date(),
          selectedGraduationType: 'immediate',
          scheduledDatePreference: null,
        },
        {
          userId: 'parent-002',
          role: 'parent',
          confirmedAt: new Date(),
          selectedGraduationType: 'immediate',
          scheduledDatePreference: null,
        },
      ],
      confirmedAt: new Date(),
    })
    const result = graduationDecisionSchema.safeParse(decision)
    expect(result.success).toBe(true)
  })

  it('should validate a scheduled decision with future date', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 14)

    const decision = createValidDecision({
      graduationType: 'scheduled',
      scheduledDate: futureDate,
    })
    const result = graduationDecisionSchema.safeParse(decision)
    expect(result.success).toBe(true)
  })

  it('should validate a completed decision', () => {
    const decision = createValidDecision({
      status: 'completed',
      completedAt: new Date(),
    })
    const result = graduationDecisionSchema.safeParse(decision)
    expect(result.success).toBe(true)
  })

  it('should accept all valid decision statuses', () => {
    const statuses: GraduationDecision['status'][] = [
      'pending',
      'confirmed',
      'processing',
      'completed',
    ]

    statuses.forEach((status) => {
      const decision = createValidDecision({ status })
      const result = graduationDecisionSchema.safeParse(decision)
      expect(result.success).toBe(true)
    })
  })

  it('should require conversationId', () => {
    const { conversationId: _, ...decisionWithoutConvId } = createValidDecision()
    const result = graduationDecisionSchema.safeParse(decisionWithoutConvId)
    expect(result.success).toBe(false)
  })

  it('should require childId', () => {
    const { childId: _, ...decisionWithoutChildId } = createValidDecision()
    const result = graduationDecisionSchema.safeParse(decisionWithoutChildId)
    expect(result.success).toBe(false)
  })
})

// ============================================
// Graduation Certificate Schema Tests
// ============================================

describe('graduationCertificateSchema', () => {
  const createValidCertificate = (
    overrides?: Partial<GraduationCertificate>
  ): GraduationCertificate => ({
    id: 'cert-123',
    childId: 'child-001',
    familyId: 'family-789',
    childName: 'Alex',
    graduationDate: new Date(),
    monthsAtPerfectTrust: 12,
    totalMonitoringDuration: 24,
    generatedAt: new Date(),
    ...overrides,
  })

  it('should validate a complete certificate', () => {
    const cert = createValidCertificate()
    const result = graduationCertificateSchema.safeParse(cert)
    expect(result.success).toBe(true)
  })

  it('should require monthsAtPerfectTrust to be non-negative', () => {
    const cert = createValidCertificate({ monthsAtPerfectTrust: -1 })
    const result = graduationCertificateSchema.safeParse(cert)
    expect(result.success).toBe(false)
  })

  it('should require totalMonitoringDuration to be non-negative', () => {
    const cert = createValidCertificate({ totalMonitoringDuration: -5 })
    const result = graduationCertificateSchema.safeParse(cert)
    expect(result.success).toBe(false)
  })

  it('should require childName to be non-empty', () => {
    const cert = createValidCertificate({ childName: '' })
    const result = graduationCertificateSchema.safeParse(cert)
    expect(result.success).toBe(false)
  })

  it('should allow monthsAtPerfectTrust equal to totalMonitoringDuration', () => {
    const cert = createValidCertificate({
      monthsAtPerfectTrust: 12,
      totalMonitoringDuration: 12,
    })
    const result = graduationCertificateSchema.safeParse(cert)
    expect(result.success).toBe(true)
  })
})

// ============================================
// Alumni Record Schema Tests
// ============================================

describe('alumniRecordSchema', () => {
  const createValidAlumniRecord = (overrides?: Partial<AlumniRecord>): AlumniRecord => ({
    childId: 'child-001',
    familyId: 'family-789',
    graduatedAt: new Date(),
    certificateId: 'cert-123',
    previousAccountData: {
      monitoringStartDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      totalMonitoringMonths: 12,
      finalTrustScore: 100,
    },
    ...overrides,
  })

  it('should validate a complete alumni record', () => {
    const record = createValidAlumniRecord()
    const result = alumniRecordSchema.safeParse(record)
    expect(result.success).toBe(true)
  })

  it('should require previousAccountData fields', () => {
    const record = createValidAlumniRecord()
    // @ts-expect-error Testing invalid data
    record.previousAccountData = { monitoringStartDate: new Date() }
    const result = alumniRecordSchema.safeParse(record)
    expect(result.success).toBe(false)
  })

  it('should require finalTrustScore between 0 and 100', () => {
    const record = createValidAlumniRecord()
    record.previousAccountData.finalTrustScore = 150
    const result = alumniRecordSchema.safeParse(record)
    expect(result.success).toBe(false)
  })

  it('should accept finalTrustScore of exactly 100', () => {
    const record = createValidAlumniRecord()
    record.previousAccountData.finalTrustScore = 100
    const result = alumniRecordSchema.safeParse(record)
    expect(result.success).toBe(true)
  })

  it('should accept finalTrustScore of exactly 0', () => {
    const record = createValidAlumniRecord()
    record.previousAccountData.finalTrustScore = 0
    const result = alumniRecordSchema.safeParse(record)
    expect(result.success).toBe(true)
  })
})

// ============================================
// Deletion Queue Entry Schema Tests
// ============================================

describe('deletionQueueEntrySchema', () => {
  const createValidEntry = (overrides?: Partial<DeletionQueueEntry>): DeletionQueueEntry => ({
    id: 'del-123',
    childId: 'child-001',
    familyId: 'family-789',
    dataType: 'screenshots',
    scheduledDeletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    retentionDays: 30,
    status: 'queued',
    createdAt: new Date(),
    completedAt: null,
    ...overrides,
  })

  it('should validate a queued deletion entry', () => {
    const entry = createValidEntry()
    const result = deletionQueueEntrySchema.safeParse(entry)
    expect(result.success).toBe(true)
  })

  it('should validate a completed deletion entry', () => {
    const entry = createValidEntry({
      status: 'completed',
      completedAt: new Date(),
    })
    const result = deletionQueueEntrySchema.safeParse(entry)
    expect(result.success).toBe(true)
  })

  it('should validate all data types', () => {
    const dataTypes: DataType[] = ['screenshots', 'flags', 'activity_logs', 'trust_history', 'all']
    dataTypes.forEach((dataType) => {
      const entry = createValidEntry({ dataType })
      const result = deletionQueueEntrySchema.safeParse(entry)
      expect(result.success).toBe(true)
    })
  })

  it('should require retentionDays to be non-negative', () => {
    const entry = createValidEntry({ retentionDays: -1 })
    const result = deletionQueueEntrySchema.safeParse(entry)
    expect(result.success).toBe(false)
  })
})

// ============================================
// Alumni Preferences Schema Tests
// ============================================

describe('alumniPreferencesSchema', () => {
  it('should validate complete preferences', () => {
    const prefs: AlumniPreferences = {
      receiveWellnessResources: true,
      receiveAnniversaryReminders: false,
    }
    const result = alumniPreferencesSchema.safeParse(prefs)
    expect(result.success).toBe(true)
  })

  it('should require boolean values', () => {
    const result = alumniPreferencesSchema.safeParse({
      receiveWellnessResources: 'yes',
      receiveAnniversaryReminders: 'no',
    })
    expect(result.success).toBe(false)
  })
})

// ============================================
// Configuration Constants Tests
// ============================================

describe('Configuration constants', () => {
  it('should have GRADUATION_RETENTION_DAYS of 30', () => {
    expect(GRADUATION_RETENTION_DAYS).toBe(30)
  })

  it('should have MIN_SCHEDULE_DAYS of 1', () => {
    expect(MIN_SCHEDULE_DAYS).toBe(1)
  })

  it('should have MAX_SCHEDULE_DAYS of 90', () => {
    expect(MAX_SCHEDULE_DAYS).toBe(90)
  })

  it('should have DECISION_EXPIRY_DAYS of 30', () => {
    expect(DECISION_EXPIRY_DAYS).toBe(30)
  })
})

// ============================================
// Helper Function Tests
// ============================================

describe('createInitialGraduationDecision', () => {
  it('should create a pending decision with correct structure', () => {
    const decision = createInitialGraduationDecision(
      'decision-001',
      'conv-123',
      'child-456',
      'family-789',
      ['parent-001', 'parent-002']
    )

    expect(decision.id).toBe('decision-001')
    expect(decision.conversationId).toBe('conv-123')
    expect(decision.childId).toBe('child-456')
    expect(decision.familyId).toBe('family-789')
    expect(decision.requiredParentIds).toEqual(['parent-001', 'parent-002'])
    expect(decision.status).toBe('pending')
    expect(decision.childConfirmation).toBeNull()
    expect(decision.parentConfirmations).toEqual([])
    expect(decision.graduationType).toBe('immediate')
    expect(decision.scheduledDate).toBeNull()
    expect(decision.confirmedAt).toBeNull()
    expect(decision.completedAt).toBeNull()
  })

  it('should set expiry date 30 days in future', () => {
    const beforeCreate = Date.now()
    const decision = createInitialGraduationDecision(
      'decision-001',
      'conv-123',
      'child-456',
      'family-789',
      ['parent-001']
    )
    const afterCreate = Date.now()

    const expectedMinExpiry = beforeCreate + DECISION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    const expectedMaxExpiry = afterCreate + DECISION_EXPIRY_DAYS * 24 * 60 * 60 * 1000

    expect(decision.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry)
    expect(decision.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry)
  })

  it('should validate the created decision with schema', () => {
    const decision = createInitialGraduationDecision(
      'decision-001',
      'conv-123',
      'child-456',
      'family-789',
      ['parent-001']
    )
    const result = graduationDecisionSchema.safeParse(decision)
    expect(result.success).toBe(true)
  })
})

describe('hasAllConfirmations', () => {
  const baseDecision: GraduationDecision = {
    id: 'decision-001',
    conversationId: 'conv-123',
    childId: 'child-456',
    familyId: 'family-789',
    requiredParentIds: ['parent-001', 'parent-002'],
    graduationType: 'immediate',
    scheduledDate: null,
    childConfirmation: null,
    parentConfirmations: [],
    status: 'pending',
    createdAt: new Date(),
    confirmedAt: null,
    completedAt: null,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  }

  it('should return false when no confirmations exist', () => {
    expect(hasAllConfirmations(baseDecision)).toBe(false)
  })

  it('should return false when only child has confirmed', () => {
    const decision: GraduationDecision = {
      ...baseDecision,
      childConfirmation: {
        userId: 'child-456',
        role: 'child',
        confirmedAt: new Date(),
        selectedGraduationType: 'immediate',
        scheduledDatePreference: null,
      },
    }
    expect(hasAllConfirmations(decision)).toBe(false)
  })

  it('should return false when only some parents have confirmed', () => {
    const decision: GraduationDecision = {
      ...baseDecision,
      childConfirmation: {
        userId: 'child-456',
        role: 'child',
        confirmedAt: new Date(),
        selectedGraduationType: 'immediate',
        scheduledDatePreference: null,
      },
      parentConfirmations: [
        {
          userId: 'parent-001',
          role: 'parent',
          confirmedAt: new Date(),
          selectedGraduationType: 'immediate',
          scheduledDatePreference: null,
        },
      ],
    }
    expect(hasAllConfirmations(decision)).toBe(false)
  })

  it('should return true when child and all parents have confirmed', () => {
    const decision: GraduationDecision = {
      ...baseDecision,
      childConfirmation: {
        userId: 'child-456',
        role: 'child',
        confirmedAt: new Date(),
        selectedGraduationType: 'immediate',
        scheduledDatePreference: null,
      },
      parentConfirmations: [
        {
          userId: 'parent-001',
          role: 'parent',
          confirmedAt: new Date(),
          selectedGraduationType: 'immediate',
          scheduledDatePreference: null,
        },
        {
          userId: 'parent-002',
          role: 'parent',
          confirmedAt: new Date(),
          selectedGraduationType: 'immediate',
          scheduledDatePreference: null,
        },
      ],
    }
    expect(hasAllConfirmations(decision)).toBe(true)
  })

  it('should handle single parent families', () => {
    const decision: GraduationDecision = {
      ...baseDecision,
      requiredParentIds: ['parent-001'],
      childConfirmation: {
        userId: 'child-456',
        role: 'child',
        confirmedAt: new Date(),
        selectedGraduationType: 'immediate',
        scheduledDatePreference: null,
      },
      parentConfirmations: [
        {
          userId: 'parent-001',
          role: 'parent',
          confirmedAt: new Date(),
          selectedGraduationType: 'immediate',
          scheduledDatePreference: null,
        },
      ],
    }
    expect(hasAllConfirmations(decision)).toBe(true)
  })
})

describe('resolveGraduationType', () => {
  const now = new Date()
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  const baseDecision: GraduationDecision = {
    id: 'decision-001',
    conversationId: 'conv-123',
    childId: 'child-456',
    familyId: 'family-789',
    requiredParentIds: ['parent-001'],
    graduationType: 'immediate',
    scheduledDate: null,
    childConfirmation: {
      userId: 'child-456',
      role: 'child',
      confirmedAt: now,
      selectedGraduationType: 'immediate',
      scheduledDatePreference: null,
    },
    parentConfirmations: [
      {
        userId: 'parent-001',
        role: 'parent',
        confirmedAt: now,
        selectedGraduationType: 'immediate',
        scheduledDatePreference: null,
      },
    ],
    status: 'confirmed',
    createdAt: now,
    confirmedAt: now,
    completedAt: null,
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  }

  it('should return immediate when all select immediate', () => {
    const result = resolveGraduationType(baseDecision)
    expect(result.type).toBe('immediate')
    // For immediate, date should be today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const resultDate = new Date(result.date)
    resultDate.setHours(0, 0, 0, 0)
    expect(resultDate.getTime()).toBe(today.getTime())
  })

  it('should return scheduled if any party selects scheduled', () => {
    const decision: GraduationDecision = {
      ...baseDecision,
      childConfirmation: {
        ...baseDecision.childConfirmation!,
        selectedGraduationType: 'immediate',
        scheduledDatePreference: null,
      },
      parentConfirmations: [
        {
          userId: 'parent-001',
          role: 'parent',
          confirmedAt: now,
          selectedGraduationType: 'scheduled',
          scheduledDatePreference: oneWeekFromNow,
        },
      ],
    }
    const result = resolveGraduationType(decision)
    expect(result.type).toBe('scheduled')
  })

  it('should use the latest scheduled date when multiple scheduled preferences', () => {
    const decision: GraduationDecision = {
      ...baseDecision,
      requiredParentIds: ['parent-001', 'parent-002'],
      childConfirmation: {
        ...baseDecision.childConfirmation!,
        selectedGraduationType: 'scheduled',
        scheduledDatePreference: oneWeekFromNow,
      },
      parentConfirmations: [
        {
          userId: 'parent-001',
          role: 'parent',
          confirmedAt: now,
          selectedGraduationType: 'scheduled',
          scheduledDatePreference: twoWeeksFromNow,
        },
        {
          userId: 'parent-002',
          role: 'parent',
          confirmedAt: now,
          selectedGraduationType: 'immediate',
          scheduledDatePreference: null,
        },
      ],
    }
    const result = resolveGraduationType(decision)
    expect(result.type).toBe('scheduled')
    expect(result.date.getTime()).toBe(twoWeeksFromNow.getTime())
  })
})

describe('isValidScheduledDate', () => {
  it('should return true for date 1 day in future', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(isValidScheduledDate(tomorrow)).toBe(true)
  })

  it('should return true for date 90 days in future', () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 90)
    expect(isValidScheduledDate(maxDate)).toBe(true)
  })

  it('should return false for today', () => {
    const today = new Date()
    expect(isValidScheduledDate(today)).toBe(false)
  })

  it('should return false for past date', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)
    expect(isValidScheduledDate(pastDate)).toBe(false)
  })

  it('should return false for date more than 90 days in future', () => {
    const tooFar = new Date()
    tooFar.setDate(tooFar.getDate() + 91)
    expect(isValidScheduledDate(tooFar)).toBe(false)
  })
})

describe('calculateDeletionDate', () => {
  it('should add retention days to graduation date', () => {
    const graduationDate = new Date('2025-06-01')
    const result = calculateDeletionDate(graduationDate, 30)

    const expected = new Date('2025-07-01')
    expect(result.getTime()).toBe(expected.getTime())
  })

  it('should handle 0 retention days', () => {
    const graduationDate = new Date('2025-06-01')
    const result = calculateDeletionDate(graduationDate, 0)
    expect(result.getTime()).toBe(graduationDate.getTime())
  })

  it('should handle custom retention periods', () => {
    const graduationDate = new Date('2025-01-15')
    const result = calculateDeletionDate(graduationDate, 7)

    const expected = new Date('2025-01-22')
    expect(result.getTime()).toBe(expected.getTime())
  })
})

describe('getDecisionDaysUntilExpiry', () => {
  it('should return correct days until expiry', () => {
    const decision: GraduationDecision = {
      id: 'decision-001',
      conversationId: 'conv-123',
      childId: 'child-456',
      familyId: 'family-789',
      requiredParentIds: ['parent-001'],
      graduationType: 'immediate',
      scheduledDate: null,
      childConfirmation: null,
      parentConfirmations: [],
      status: 'pending',
      createdAt: new Date(),
      confirmedAt: null,
      completedAt: null,
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    }

    const days = getDecisionDaysUntilExpiry(decision)
    expect(days).toBeGreaterThanOrEqual(14)
    expect(days).toBeLessThanOrEqual(15)
  })

  it('should return 0 for expired decision', () => {
    const decision: GraduationDecision = {
      id: 'decision-001',
      conversationId: 'conv-123',
      childId: 'child-456',
      familyId: 'family-789',
      requiredParentIds: ['parent-001'],
      graduationType: 'immediate',
      scheduledDate: null,
      childConfirmation: null,
      parentConfirmations: [],
      status: 'pending',
      createdAt: new Date(),
      confirmedAt: null,
      completedAt: null,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    }

    expect(getDecisionDaysUntilExpiry(decision)).toBe(0)
  })
})

describe('isDecisionExpired', () => {
  it('should return false for non-expired decision', () => {
    const decision: GraduationDecision = {
      id: 'decision-001',
      conversationId: 'conv-123',
      childId: 'child-456',
      familyId: 'family-789',
      requiredParentIds: ['parent-001'],
      graduationType: 'immediate',
      scheduledDate: null,
      childConfirmation: null,
      parentConfirmations: [],
      status: 'pending',
      createdAt: new Date(),
      confirmedAt: null,
      completedAt: null,
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    }

    expect(isDecisionExpired(decision)).toBe(false)
  })

  it('should return true for expired decision', () => {
    const decision: GraduationDecision = {
      id: 'decision-001',
      conversationId: 'conv-123',
      childId: 'child-456',
      familyId: 'family-789',
      requiredParentIds: ['parent-001'],
      graduationType: 'immediate',
      scheduledDate: null,
      childConfirmation: null,
      parentConfirmations: [],
      status: 'pending',
      createdAt: new Date(),
      confirmedAt: null,
      completedAt: null,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    }

    expect(isDecisionExpired(decision)).toBe(true)
  })

  it('should return false for completed decision regardless of expiry', () => {
    const decision: GraduationDecision = {
      id: 'decision-001',
      conversationId: 'conv-123',
      childId: 'child-456',
      familyId: 'family-789',
      requiredParentIds: ['parent-001'],
      graduationType: 'immediate',
      scheduledDate: null,
      childConfirmation: null,
      parentConfirmations: [],
      status: 'completed',
      createdAt: new Date(),
      confirmedAt: new Date(),
      completedAt: new Date(),
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    }

    expect(isDecisionExpired(decision)).toBe(false)
  })
})
