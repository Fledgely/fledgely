import { describe, it, expect } from 'vitest'
import {
  // Schemas
  safetySettingTypeSchema,
  proposalStatusSchema,
  safetySettingValueSchema,
  safetySettingsProposalSchema,
  safetySettingsProposalFirestoreSchema,
  createSafetySettingsProposalInputSchema,
  respondToProposalInputSchema,
  disputeProposalInputSchema,
  // Constants
  SAFETY_SETTING_TYPE_LABELS,
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_FIELD_LIMITS,
  PROPOSAL_TIME_LIMITS,
  PROPOSAL_RATE_LIMIT,
  SAFETY_PROPOSAL_ERROR_MESSAGES,
  // Functions
  getSafetySettingTypeLabel,
  getProposalStatusLabel,
  convertFirestoreToSafetySettingsProposal,
  safeParseSafetySettingsProposal,
  validateCreateSafetySettingsProposalInput,
  safeParseCreateSafetySettingsProposalInput,
  isEmergencySafetyIncrease,
  canRespondToProposal,
  canDisputeProposal,
  canRepropose,
  calculateProposalExpiry,
  getProposalTimeUntilExpiry,
  calculateDisputeDeadline,
  calculateReproposalDate,
  formatProposalDiff,
  formatSettingValue,
  getSafetyProposalErrorMessage,
  // Types
  type SafetySettingType,
  type ProposalStatus,
  type SafetySettingsProposal,
} from './safety-settings-proposal.schema'

// ============================================
// TEST DATA FACTORIES
// ============================================

function createValidProposal(overrides: Partial<SafetySettingsProposal> = {}): SafetySettingsProposal {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS)

  return {
    id: 'proposal-123',
    childId: 'child-456',
    proposedBy: 'parent-1',
    settingType: 'monitoring_interval',
    currentValue: 30,
    proposedValue: 15,
    status: 'pending',
    createdAt: now,
    expiresAt,
    isEmergencyIncrease: false,
    respondedBy: null,
    respondedAt: null,
    declineMessage: null,
    appliedAt: null,
    dispute: null,
    ...overrides,
  }
}

// ============================================
// SAFETY SETTING TYPE SCHEMA TESTS
// ============================================

describe('safetySettingTypeSchema', () => {
  const validTypes: SafetySettingType[] = [
    'monitoring_interval',
    'retention_period',
    'age_restriction',
    'screen_time_daily',
    'screen_time_per_app',
    'bedtime_start',
    'bedtime_end',
    'crisis_allowlist',
  ]

  it.each(validTypes)('accepts valid setting type: %s', (type) => {
    expect(safetySettingTypeSchema.parse(type)).toBe(type)
  })

  it('rejects invalid setting type', () => {
    expect(() => safetySettingTypeSchema.parse('invalid_type')).toThrow()
    expect(() => safetySettingTypeSchema.parse('')).toThrow()
    expect(() => safetySettingTypeSchema.parse(123)).toThrow()
    expect(() => safetySettingTypeSchema.parse(null)).toThrow()
  })
})

// ============================================
// PROPOSAL STATUS SCHEMA TESTS
// ============================================

describe('proposalStatusSchema', () => {
  const validStatuses: ProposalStatus[] = [
    'pending',
    'approved',
    'declined',
    'expired',
    'auto_applied',
    'disputed',
    'reverted',
  ]

  it.each(validStatuses)('accepts valid status: %s', (status) => {
    expect(proposalStatusSchema.parse(status)).toBe(status)
  })

  it('rejects invalid status', () => {
    expect(() => proposalStatusSchema.parse('invalid')).toThrow()
    expect(() => proposalStatusSchema.parse('PENDING')).toThrow()
    expect(() => proposalStatusSchema.parse('')).toThrow()
  })
})

// ============================================
// SAFETY SETTING VALUE SCHEMA TESTS
// ============================================

describe('safetySettingValueSchema', () => {
  it('accepts valid integer values', () => {
    expect(safetySettingValueSchema.parse(0)).toBe(0)
    expect(safetySettingValueSchema.parse(30)).toBe(30)
    expect(safetySettingValueSchema.parse(1440)).toBe(1440)
  })

  it('accepts valid string values', () => {
    expect(safetySettingValueSchema.parse('value')).toBe('value')
    expect(safetySettingValueSchema.parse('')).toBe('')
  })

  it('accepts valid boolean values', () => {
    expect(safetySettingValueSchema.parse(true)).toBe(true)
    expect(safetySettingValueSchema.parse(false)).toBe(false)
  })

  it('rejects negative numbers', () => {
    expect(() => safetySettingValueSchema.parse(-1)).toThrow()
  })

  it('rejects decimal numbers', () => {
    expect(() => safetySettingValueSchema.parse(1.5)).toThrow()
  })

  it('rejects strings over 256 characters', () => {
    const longString = 'a'.repeat(257)
    expect(() => safetySettingValueSchema.parse(longString)).toThrow()
  })

  it('accepts strings at max length (256)', () => {
    const maxString = 'a'.repeat(256)
    expect(safetySettingValueSchema.parse(maxString)).toBe(maxString)
  })
})

// ============================================
// SAFETY SETTINGS PROPOSAL SCHEMA TESTS
// ============================================

describe('safetySettingsProposalSchema', () => {
  it('accepts valid proposal', () => {
    const proposal = createValidProposal()
    const result = safetySettingsProposalSchema.parse(proposal)

    expect(result.id).toBe('proposal-123')
    expect(result.childId).toBe('child-456')
    expect(result.proposedBy).toBe('parent-1')
    expect(result.settingType).toBe('monitoring_interval')
    expect(result.currentValue).toBe(30)
    expect(result.proposedValue).toBe(15)
    expect(result.status).toBe('pending')
    expect(result.isEmergencyIncrease).toBe(false)
  })

  it('accepts proposal with response', () => {
    const proposal = createValidProposal({
      status: 'approved',
      respondedBy: 'parent-2',
      respondedAt: new Date(),
      appliedAt: new Date(),
    })
    const result = safetySettingsProposalSchema.parse(proposal)

    expect(result.status).toBe('approved')
    expect(result.respondedBy).toBe('parent-2')
    expect(result.respondedAt).toBeInstanceOf(Date)
    expect(result.appliedAt).toBeInstanceOf(Date)
  })

  it('accepts proposal with decline message', () => {
    const proposal = createValidProposal({
      status: 'declined',
      respondedBy: 'parent-2',
      respondedAt: new Date(),
      declineMessage: 'I disagree with this change',
    })
    const result = safetySettingsProposalSchema.parse(proposal)

    expect(result.status).toBe('declined')
    expect(result.declineMessage).toBe('I disagree with this change')
  })

  it('accepts proposal with dispute', () => {
    const disputedAt = new Date()
    const proposal = createValidProposal({
      status: 'disputed',
      isEmergencyIncrease: true,
      appliedAt: new Date(),
      dispute: {
        disputedBy: 'parent-2',
        disputedAt,
        reason: 'This is too restrictive',
        resolvedAt: null,
        resolution: null,
      },
    })
    const result = safetySettingsProposalSchema.parse(proposal)

    expect(result.status).toBe('disputed')
    expect(result.dispute?.disputedBy).toBe('parent-2')
    expect(result.dispute?.reason).toBe('This is too restrictive')
  })

  it('rejects missing required fields', () => {
    expect(() => safetySettingsProposalSchema.parse({})).toThrow()
    expect(() => safetySettingsProposalSchema.parse({ id: 'test' })).toThrow()
  })

  it('rejects empty id', () => {
    const proposal = createValidProposal({ id: '' })
    expect(() => safetySettingsProposalSchema.parse(proposal)).toThrow()
  })

  it('rejects id exceeding max length', () => {
    const proposal = createValidProposal({ id: 'a'.repeat(PROPOSAL_FIELD_LIMITS.id + 1) })
    expect(() => safetySettingsProposalSchema.parse(proposal)).toThrow()
  })

  it('accepts id at max length', () => {
    const maxId = 'a'.repeat(PROPOSAL_FIELD_LIMITS.id)
    const proposal = createValidProposal({ id: maxId })
    const result = safetySettingsProposalSchema.parse(proposal)
    expect(result.id).toBe(maxId)
  })

  it('rejects declineMessage exceeding max length', () => {
    const proposal = createValidProposal({
      status: 'declined',
      respondedBy: 'parent-2',
      respondedAt: new Date(),
      declineMessage: 'a'.repeat(PROPOSAL_FIELD_LIMITS.declineMessage + 1),
    })
    expect(() => safetySettingsProposalSchema.parse(proposal)).toThrow()
  })
})

// ============================================
// FIRESTORE SCHEMA TESTS
// ============================================

describe('safetySettingsProposalFirestoreSchema', () => {
  it('accepts valid Firestore proposal', () => {
    const firestoreProposal = {
      id: 'proposal-123',
      childId: 'child-456',
      proposedBy: 'parent-1',
      settingType: 'monitoring_interval',
      currentValue: 30,
      proposedValue: 15,
      status: 'pending',
      createdAt: { toDate: () => new Date() },
      expiresAt: { toDate: () => new Date() },
      isEmergencyIncrease: false,
      respondedBy: null,
      respondedAt: null,
      declineMessage: null,
      appliedAt: null,
      dispute: null,
    }

    const result = safetySettingsProposalFirestoreSchema.parse(firestoreProposal)
    expect(result.id).toBe('proposal-123')
  })

  it('rejects non-Timestamp date fields', () => {
    const invalidProposal = {
      id: 'proposal-123',
      childId: 'child-456',
      proposedBy: 'parent-1',
      settingType: 'monitoring_interval',
      currentValue: 30,
      proposedValue: 15,
      status: 'pending',
      createdAt: new Date(), // Should be Timestamp-like
      expiresAt: { toDate: () => new Date() },
      isEmergencyIncrease: false,
    }

    expect(() => safetySettingsProposalFirestoreSchema.parse(invalidProposal)).toThrow()
  })
})

// ============================================
// INPUT SCHEMA TESTS
// ============================================

describe('createSafetySettingsProposalInputSchema', () => {
  it('accepts valid input', () => {
    const input = {
      childId: 'child-123',
      settingType: 'monitoring_interval',
      proposedValue: 15,
    }
    const result = createSafetySettingsProposalInputSchema.parse(input)
    expect(result.childId).toBe('child-123')
    expect(result.settingType).toBe('monitoring_interval')
    expect(result.proposedValue).toBe(15)
  })

  it('accepts all setting types', () => {
    const settingTypes: SafetySettingType[] = [
      'monitoring_interval',
      'retention_period',
      'age_restriction',
      'screen_time_daily',
      'screen_time_per_app',
      'bedtime_start',
      'bedtime_end',
      'crisis_allowlist',
    ]

    for (const settingType of settingTypes) {
      const input = {
        childId: 'child-123',
        settingType,
        proposedValue: 30,
      }
      expect(() => createSafetySettingsProposalInputSchema.parse(input)).not.toThrow()
    }
  })

  it('rejects missing childId', () => {
    const input = {
      settingType: 'monitoring_interval',
      proposedValue: 15,
    }
    expect(() => createSafetySettingsProposalInputSchema.parse(input)).toThrow()
  })

  it('rejects empty childId', () => {
    const input = {
      childId: '',
      settingType: 'monitoring_interval',
      proposedValue: 15,
    }
    expect(() => createSafetySettingsProposalInputSchema.parse(input)).toThrow()
  })
})

describe('respondToProposalInputSchema', () => {
  it('accepts approve action', () => {
    const input = {
      proposalId: 'proposal-123',
      childId: 'child-456',
      action: 'approve',
    }
    const result = respondToProposalInputSchema.parse(input)
    expect(result.action).toBe('approve')
  })

  it('accepts decline action with message', () => {
    const input = {
      proposalId: 'proposal-123',
      childId: 'child-456',
      action: 'decline',
      message: 'I disagree',
    }
    const result = respondToProposalInputSchema.parse(input)
    expect(result.action).toBe('decline')
    expect(result.message).toBe('I disagree')
  })

  it('rejects invalid action', () => {
    const input = {
      proposalId: 'proposal-123',
      childId: 'child-456',
      action: 'invalid',
    }
    expect(() => respondToProposalInputSchema.parse(input)).toThrow()
  })

  it('rejects message exceeding max length', () => {
    const input = {
      proposalId: 'proposal-123',
      childId: 'child-456',
      action: 'decline',
      message: 'a'.repeat(PROPOSAL_FIELD_LIMITS.declineMessage + 1),
    }
    expect(() => respondToProposalInputSchema.parse(input)).toThrow()
  })
})

describe('disputeProposalInputSchema', () => {
  it('accepts valid dispute input', () => {
    const input = {
      proposalId: 'proposal-123',
      childId: 'child-456',
      reason: 'Too restrictive',
    }
    const result = disputeProposalInputSchema.parse(input)
    expect(result.proposalId).toBe('proposal-123')
    expect(result.reason).toBe('Too restrictive')
  })

  it('accepts dispute without reason', () => {
    const input = {
      proposalId: 'proposal-123',
      childId: 'child-456',
    }
    const result = disputeProposalInputSchema.parse(input)
    expect(result.reason).toBeUndefined()
  })
})

// ============================================
// CONVERSION UTILITIES TESTS
// ============================================

describe('convertFirestoreToSafetySettingsProposal', () => {
  it('converts Firestore proposal to domain type', () => {
    const now = new Date()
    const firestoreProposal = {
      id: 'proposal-123',
      childId: 'child-456',
      proposedBy: 'parent-1',
      settingType: 'monitoring_interval' as const,
      currentValue: 30,
      proposedValue: 15,
      status: 'pending' as const,
      createdAt: { toDate: () => now },
      expiresAt: { toDate: () => new Date(now.getTime() + PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS) },
      isEmergencyIncrease: false,
      respondedBy: null,
      respondedAt: null,
      declineMessage: null,
      appliedAt: null,
      dispute: null,
    }

    const result = convertFirestoreToSafetySettingsProposal(firestoreProposal)

    expect(result.id).toBe('proposal-123')
    expect(result.createdAt).toBeInstanceOf(Date)
    expect(result.expiresAt).toBeInstanceOf(Date)
  })

  it('converts Firestore proposal with dispute', () => {
    const now = new Date()
    const disputedAt = new Date()
    const firestoreProposal = {
      id: 'proposal-123',
      childId: 'child-456',
      proposedBy: 'parent-1',
      settingType: 'monitoring_interval' as const,
      currentValue: 30,
      proposedValue: 15,
      status: 'disputed' as const,
      createdAt: { toDate: () => now },
      expiresAt: { toDate: () => new Date(now.getTime() + PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS) },
      isEmergencyIncrease: true,
      respondedBy: null,
      respondedAt: null,
      declineMessage: null,
      appliedAt: { toDate: () => now },
      dispute: {
        disputedBy: 'parent-2',
        disputedAt: { toDate: () => disputedAt },
        reason: 'Too restrictive',
        resolvedAt: null,
        resolution: null,
      },
    }

    const result = convertFirestoreToSafetySettingsProposal(firestoreProposal)

    expect(result.dispute).not.toBeNull()
    expect(result.dispute?.disputedBy).toBe('parent-2')
    expect(result.dispute?.disputedAt).toBeInstanceOf(Date)
  })
})

describe('safeParseSafetySettingsProposal', () => {
  it('returns proposal for valid data', () => {
    const proposal = createValidProposal()
    const result = safeParseSafetySettingsProposal(proposal)
    expect(result).not.toBeNull()
    expect(result?.id).toBe('proposal-123')
  })

  it('returns null for invalid data', () => {
    const result = safeParseSafetySettingsProposal({ invalid: 'data' })
    expect(result).toBeNull()
  })

  it('returns null for null input', () => {
    const result = safeParseSafetySettingsProposal(null)
    expect(result).toBeNull()
  })
})

describe('validateCreateSafetySettingsProposalInput', () => {
  it('validates and returns valid input', () => {
    const input = {
      childId: 'child-123',
      settingType: 'monitoring_interval',
      proposedValue: 15,
    }
    const result = validateCreateSafetySettingsProposalInput(input)
    expect(result.childId).toBe('child-123')
  })

  it('throws for invalid input', () => {
    expect(() => validateCreateSafetySettingsProposalInput({})).toThrow()
  })
})

describe('safeParseCreateSafetySettingsProposalInput', () => {
  it('returns input for valid data', () => {
    const input = {
      childId: 'child-123',
      settingType: 'monitoring_interval',
      proposedValue: 15,
    }
    const result = safeParseCreateSafetySettingsProposalInput(input)
    expect(result).not.toBeNull()
  })

  it('returns null for invalid data', () => {
    const result = safeParseCreateSafetySettingsProposalInput({})
    expect(result).toBeNull()
  })
})

// ============================================
// EMERGENCY SAFETY INCREASE TESTS
// ============================================

describe('isEmergencySafetyIncrease', () => {
  describe('monitoring_interval', () => {
    it('returns true when interval decreases (more frequent)', () => {
      expect(isEmergencySafetyIncrease('monitoring_interval', 30, 15)).toBe(true)
    })

    it('returns false when interval increases (less frequent)', () => {
      expect(isEmergencySafetyIncrease('monitoring_interval', 15, 30)).toBe(false)
    })

    it('returns false when interval stays the same', () => {
      expect(isEmergencySafetyIncrease('monitoring_interval', 30, 30)).toBe(false)
    })
  })

  describe('retention_period', () => {
    it('returns true when retention increases (kept longer)', () => {
      expect(isEmergencySafetyIncrease('retention_period', 7, 30)).toBe(true)
    })

    it('returns false when retention decreases (kept shorter)', () => {
      expect(isEmergencySafetyIncrease('retention_period', 30, 7)).toBe(false)
    })
  })

  describe('age_restriction', () => {
    it('returns true when age restriction increases (more restrictive)', () => {
      expect(isEmergencySafetyIncrease('age_restriction', 13, 18)).toBe(true)
    })

    it('returns false when age restriction decreases (less restrictive)', () => {
      expect(isEmergencySafetyIncrease('age_restriction', 18, 13)).toBe(false)
    })
  })

  describe('screen_time_daily', () => {
    it('returns true when time limit decreases (less time allowed)', () => {
      expect(isEmergencySafetyIncrease('screen_time_daily', 180, 120)).toBe(true)
    })

    it('returns false when time limit increases (more time allowed)', () => {
      expect(isEmergencySafetyIncrease('screen_time_daily', 120, 180)).toBe(false)
    })
  })

  describe('screen_time_per_app', () => {
    it('returns true when per-app limit decreases', () => {
      expect(isEmergencySafetyIncrease('screen_time_per_app', 60, 30)).toBe(true)
    })

    it('returns false when per-app limit increases', () => {
      expect(isEmergencySafetyIncrease('screen_time_per_app', 30, 60)).toBe(false)
    })
  })

  describe('bedtime_start', () => {
    it('returns true when bedtime is earlier (more restrictive)', () => {
      // 9 PM = 21 * 60 = 1260 minutes
      // 8 PM = 20 * 60 = 1200 minutes
      expect(isEmergencySafetyIncrease('bedtime_start', 1260, 1200)).toBe(true)
    })

    it('returns false when bedtime is later (less restrictive)', () => {
      expect(isEmergencySafetyIncrease('bedtime_start', 1200, 1260)).toBe(false)
    })
  })

  describe('bedtime_end', () => {
    it('returns true when wake time is later (more restrictive)', () => {
      // 7 AM = 420 minutes, 8 AM = 480 minutes
      expect(isEmergencySafetyIncrease('bedtime_end', 420, 480)).toBe(true)
    })

    it('returns false when wake time is earlier (less restrictive)', () => {
      expect(isEmergencySafetyIncrease('bedtime_end', 480, 420)).toBe(false)
    })
  })

  describe('crisis_allowlist', () => {
    it('always returns true (crisis resources are always emergency)', () => {
      expect(isEmergencySafetyIncrease('crisis_allowlist', 'old', 'new')).toBe(true)
      expect(isEmergencySafetyIncrease('crisis_allowlist', '', 'site.org')).toBe(true)
    })
  })

  describe('non-numeric values', () => {
    it('returns false for string values (non-crisis)', () => {
      expect(isEmergencySafetyIncrease('monitoring_interval', 'old', 'new')).toBe(false)
    })

    it('returns false for boolean values', () => {
      expect(isEmergencySafetyIncrease('monitoring_interval', true, false)).toBe(false)
    })
  })
})

// ============================================
// PROPOSAL WORKFLOW UTILITIES TESTS
// ============================================

describe('canRespondToProposal', () => {
  it('returns true for pending proposal within window', () => {
    const proposal = createValidProposal({ status: 'pending' })
    expect(canRespondToProposal(proposal)).toBe(true)
  })

  it('returns false for expired proposal', () => {
    const pastDate = new Date(Date.now() - 1000)
    const proposal = createValidProposal({
      status: 'pending',
      expiresAt: pastDate,
    })
    expect(canRespondToProposal(proposal)).toBe(false)
  })

  it('returns false for already approved proposal', () => {
    const proposal = createValidProposal({ status: 'approved' })
    expect(canRespondToProposal(proposal)).toBe(false)
  })

  it('returns false for declined proposal', () => {
    const proposal = createValidProposal({ status: 'declined' })
    expect(canRespondToProposal(proposal)).toBe(false)
  })

  it('returns false for auto_applied proposal', () => {
    const proposal = createValidProposal({ status: 'auto_applied' })
    expect(canRespondToProposal(proposal)).toBe(false)
  })
})

describe('canDisputeProposal', () => {
  it('returns true for auto_applied proposal within 48 hours', () => {
    const appliedAt = new Date()
    const proposal = createValidProposal({
      status: 'auto_applied',
      appliedAt,
      isEmergencyIncrease: true,
    })
    expect(canDisputeProposal(proposal)).toBe(true)
  })

  it('returns false for auto_applied proposal after 48 hours', () => {
    const appliedAt = new Date(Date.now() - 49 * 60 * 60 * 1000) // 49 hours ago
    const proposal = createValidProposal({
      status: 'auto_applied',
      appliedAt,
      isEmergencyIncrease: true,
    })
    expect(canDisputeProposal(proposal)).toBe(false)
  })

  it('returns false for pending proposal', () => {
    const proposal = createValidProposal({ status: 'pending' })
    expect(canDisputeProposal(proposal)).toBe(false)
  })

  it('returns false for approved proposal', () => {
    const proposal = createValidProposal({ status: 'approved' })
    expect(canDisputeProposal(proposal)).toBe(false)
  })

  it('returns false when appliedAt is missing', () => {
    const proposal = createValidProposal({
      status: 'auto_applied',
      appliedAt: null,
    })
    expect(canDisputeProposal(proposal)).toBe(false)
  })
})

describe('canRepropose', () => {
  it('returns true when no declined proposals exist', () => {
    expect(canRepropose('monitoring_interval', 'child-123', [])).toBe(true)
  })

  it('returns true after 7-day cooldown', () => {
    const declinedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago
    const declinedProposal = createValidProposal({
      status: 'declined',
      respondedAt: declinedAt,
    })
    expect(canRepropose('monitoring_interval', 'child-456', [declinedProposal])).toBe(true)
  })

  it('returns false within 7-day cooldown', () => {
    const declinedAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    const declinedProposal = createValidProposal({
      status: 'declined',
      respondedAt: declinedAt,
    })
    expect(canRepropose('monitoring_interval', 'child-456', [declinedProposal])).toBe(false)
  })

  it('returns true for different setting type', () => {
    const declinedAt = new Date() // Just declined
    const declinedProposal = createValidProposal({
      settingType: 'retention_period',
      status: 'declined',
      respondedAt: declinedAt,
    })
    // Different setting type should not be blocked
    expect(canRepropose('monitoring_interval', 'child-456', [declinedProposal])).toBe(true)
  })

  it('returns true for different child', () => {
    const declinedAt = new Date() // Just declined
    const declinedProposal = createValidProposal({
      childId: 'other-child',
      status: 'declined',
      respondedAt: declinedAt,
    })
    expect(canRepropose('monitoring_interval', 'child-456', [declinedProposal])).toBe(true)
  })

  it('uses most recent declined proposal for cooldown', () => {
    const oldDecline = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
    const recentDecline = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago

    const declinedProposals = [
      createValidProposal({ id: 'old', status: 'declined', respondedAt: oldDecline }),
      createValidProposal({ id: 'recent', status: 'declined', respondedAt: recentDecline }),
    ]

    expect(canRepropose('monitoring_interval', 'child-456', declinedProposals)).toBe(false)
  })
})

describe('calculateProposalExpiry', () => {
  it('calculates expiry 72 hours from creation', () => {
    const createdAt = new Date('2024-01-01T12:00:00Z')
    const expiry = calculateProposalExpiry(createdAt)

    const expectedExpiry = new Date('2024-01-04T12:00:00Z')
    expect(expiry.getTime()).toBe(expectedExpiry.getTime())
  })
})

describe('getProposalTimeUntilExpiry', () => {
  it('returns positive time for future expiry', () => {
    const now = new Date()
    const proposal = createValidProposal({
      expiresAt: new Date(now.getTime() + 60000), // 1 minute in future
    })

    const remaining = getProposalTimeUntilExpiry(proposal, now)
    expect(remaining).toBeGreaterThan(0)
    expect(remaining).toBeLessThanOrEqual(60000)
  })

  it('returns 0 for past expiry', () => {
    const now = new Date()
    const proposal = createValidProposal({
      expiresAt: new Date(now.getTime() - 60000), // 1 minute in past
    })

    expect(getProposalTimeUntilExpiry(proposal, now)).toBe(0)
  })
})

describe('calculateDisputeDeadline', () => {
  it('calculates dispute deadline 48 hours from application', () => {
    const appliedAt = new Date('2024-01-01T12:00:00Z')
    const deadline = calculateDisputeDeadline(appliedAt)

    const expectedDeadline = new Date('2024-01-03T12:00:00Z')
    expect(deadline.getTime()).toBe(expectedDeadline.getTime())
  })
})

describe('calculateReproposalDate', () => {
  it('calculates reproposal date 7 days from decline', () => {
    const declinedAt = new Date('2024-01-01T12:00:00Z')
    const reproposalDate = calculateReproposalDate(declinedAt)

    const expectedDate = new Date('2024-01-08T12:00:00Z')
    expect(reproposalDate.getTime()).toBe(expectedDate.getTime())
  })
})

// ============================================
// DIFF FORMATTING TESTS
// ============================================

describe('formatProposalDiff', () => {
  it('formats monitoring interval change', () => {
    const proposal = createValidProposal({
      settingType: 'monitoring_interval',
      currentValue: 30,
      proposedValue: 15,
    })
    expect(formatProposalDiff(proposal)).toBe('Monitoring interval: 30 minutes → 15 minutes')
  })

  it('formats retention period change', () => {
    const proposal = createValidProposal({
      settingType: 'retention_period',
      currentValue: 7,
      proposedValue: 30,
    })
    expect(formatProposalDiff(proposal)).toBe('Screenshot retention period: 7 days → 30 days')
  })

  it('formats screen time change', () => {
    const proposal = createValidProposal({
      settingType: 'screen_time_daily',
      currentValue: 120,
      proposedValue: 90,
    })
    expect(formatProposalDiff(proposal)).toBe('Daily screen time limit: 2 hours → 1h 30m')
  })
})

describe('formatSettingValue', () => {
  describe('monitoring_interval', () => {
    it('formats singular minute', () => {
      expect(formatSettingValue('monitoring_interval', 1)).toBe('1 minute')
    })

    it('formats plural minutes', () => {
      expect(formatSettingValue('monitoring_interval', 30)).toBe('30 minutes')
    })
  })

  describe('retention_period', () => {
    it('formats singular day', () => {
      expect(formatSettingValue('retention_period', 1)).toBe('1 day')
    })

    it('formats plural days', () => {
      expect(formatSettingValue('retention_period', 30)).toBe('30 days')
    })
  })

  describe('age_restriction', () => {
    it('formats age restriction', () => {
      expect(formatSettingValue('age_restriction', 13)).toBe('Age 13+')
      expect(formatSettingValue('age_restriction', 18)).toBe('Age 18+')
    })
  })

  describe('screen_time', () => {
    it('formats minutes only', () => {
      expect(formatSettingValue('screen_time_daily', 30)).toBe('30 minutes')
    })

    it('formats hours only', () => {
      expect(formatSettingValue('screen_time_daily', 60)).toBe('1 hour')
      expect(formatSettingValue('screen_time_daily', 120)).toBe('2 hours')
    })

    it('formats hours and minutes', () => {
      expect(formatSettingValue('screen_time_daily', 90)).toBe('1h 30m')
      expect(formatSettingValue('screen_time_daily', 150)).toBe('2h 30m')
    })
  })

  describe('bedtime', () => {
    it('formats bedtime start (PM)', () => {
      // 9 PM = 21 * 60 = 1260 minutes
      expect(formatSettingValue('bedtime_start', 1260)).toBe('9:00 PM')
    })

    it('formats bedtime end (AM)', () => {
      // 7 AM = 7 * 60 = 420 minutes
      expect(formatSettingValue('bedtime_end', 420)).toBe('7:00 AM')
    })

    it('formats midnight', () => {
      expect(formatSettingValue('bedtime_start', 0)).toBe('12:00 AM')
    })

    it('formats noon', () => {
      expect(formatSettingValue('bedtime_end', 720)).toBe('12:00 PM')
    })
  })

  describe('boolean values', () => {
    it('formats true as Enabled', () => {
      expect(formatSettingValue('monitoring_interval', true)).toBe('Enabled')
    })

    it('formats false as Disabled', () => {
      expect(formatSettingValue('monitoring_interval', false)).toBe('Disabled')
    })
  })

  describe('string values', () => {
    it('returns string as-is', () => {
      expect(formatSettingValue('crisis_allowlist', 'resource.org')).toBe('resource.org')
    })
  })
})

// ============================================
// LABEL FUNCTIONS TESTS
// ============================================

describe('getSafetySettingTypeLabel', () => {
  it('returns correct labels for all setting types', () => {
    expect(getSafetySettingTypeLabel('monitoring_interval')).toBe('Monitoring interval')
    expect(getSafetySettingTypeLabel('retention_period')).toBe('Screenshot retention period')
    expect(getSafetySettingTypeLabel('age_restriction')).toBe('Content age restriction')
    expect(getSafetySettingTypeLabel('screen_time_daily')).toBe('Daily screen time limit')
    expect(getSafetySettingTypeLabel('screen_time_per_app')).toBe('Per-app time limit')
    expect(getSafetySettingTypeLabel('bedtime_start')).toBe('Bedtime start time')
    expect(getSafetySettingTypeLabel('bedtime_end')).toBe('Bedtime end time')
    expect(getSafetySettingTypeLabel('crisis_allowlist')).toBe('Crisis resource allowlist')
  })
})

describe('getProposalStatusLabel', () => {
  it('returns correct labels for all statuses', () => {
    expect(getProposalStatusLabel('pending')).toBe('Waiting for approval')
    expect(getProposalStatusLabel('approved')).toBe('Approved and applied')
    expect(getProposalStatusLabel('declined')).toBe('Declined by co-parent')
    expect(getProposalStatusLabel('expired')).toBe('Expired (no response)')
    expect(getProposalStatusLabel('auto_applied')).toBe('Applied immediately (emergency)')
    expect(getProposalStatusLabel('disputed')).toBe('Under dispute review')
    expect(getProposalStatusLabel('reverted')).toBe('Reverted to original')
  })
})

// ============================================
// ERROR MESSAGES TESTS
// ============================================

describe('getSafetyProposalErrorMessage', () => {
  it('returns correct error messages', () => {
    expect(getSafetyProposalErrorMessage('not-found')).toBe('Could not find the proposal.')
    expect(getSafetyProposalErrorMessage('not-guardian')).toBe(
      'You must be a guardian of this child to make this change.'
    )
    expect(getSafetyProposalErrorMessage('proposal-expired')).toBe(
      'This proposal has expired. You can create a new one.'
    )
    expect(getSafetyProposalErrorMessage('cooldown-active')).toBe(
      'This setting was recently declined. Please wait 7 days before proposing again.'
    )
    expect(getSafetyProposalErrorMessage('rate-limit')).toBe(
      'You have made too many proposals. Please wait an hour.'
    )
  })

  it('returns unknown message for undefined codes', () => {
    expect(getSafetyProposalErrorMessage('nonexistent-code')).toBe(
      'Something went wrong. Please try again.'
    )
  })
})

// ============================================
// CONSTANTS TESTS
// ============================================

describe('PROPOSAL_FIELD_LIMITS', () => {
  it('defines all required field limits', () => {
    expect(PROPOSAL_FIELD_LIMITS.id).toBe(128)
    expect(PROPOSAL_FIELD_LIMITS.childId).toBe(128)
    expect(PROPOSAL_FIELD_LIMITS.proposedBy).toBe(128)
    expect(PROPOSAL_FIELD_LIMITS.respondedBy).toBe(128)
    expect(PROPOSAL_FIELD_LIMITS.declineMessage).toBe(500)
    expect(PROPOSAL_FIELD_LIMITS.disputeReason).toBe(500)
  })
})

describe('PROPOSAL_TIME_LIMITS', () => {
  it('defines correct time limits', () => {
    expect(PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS).toBe(72 * 60 * 60 * 1000) // 72 hours
    expect(PROPOSAL_TIME_LIMITS.DISPUTE_WINDOW_MS).toBe(48 * 60 * 60 * 1000) // 48 hours
    expect(PROPOSAL_TIME_LIMITS.REPROPOSAL_COOLDOWN_MS).toBe(7 * 24 * 60 * 60 * 1000) // 7 days
  })
})

describe('PROPOSAL_RATE_LIMIT', () => {
  it('defines rate limit constants', () => {
    expect(PROPOSAL_RATE_LIMIT.MAX_PROPOSALS_PER_HOUR).toBe(10)
    expect(PROPOSAL_RATE_LIMIT.WINDOW_MS).toBe(60 * 60 * 1000)
  })
})

describe('SAFETY_SETTING_TYPE_LABELS', () => {
  it('has labels for all setting types', () => {
    const settingTypes: SafetySettingType[] = [
      'monitoring_interval',
      'retention_period',
      'age_restriction',
      'screen_time_daily',
      'screen_time_per_app',
      'bedtime_start',
      'bedtime_end',
      'crisis_allowlist',
    ]

    for (const type of settingTypes) {
      expect(SAFETY_SETTING_TYPE_LABELS[type]).toBeDefined()
      expect(typeof SAFETY_SETTING_TYPE_LABELS[type]).toBe('string')
    }
  })
})

describe('PROPOSAL_STATUS_LABELS', () => {
  it('has labels for all statuses', () => {
    const statuses: ProposalStatus[] = [
      'pending',
      'approved',
      'declined',
      'expired',
      'auto_applied',
      'disputed',
      'reverted',
    ]

    for (const status of statuses) {
      expect(PROPOSAL_STATUS_LABELS[status]).toBeDefined()
      expect(typeof PROPOSAL_STATUS_LABELS[status]).toBe('string')
    }
  })
})

describe('SAFETY_PROPOSAL_ERROR_MESSAGES', () => {
  it('has all required error messages', () => {
    const requiredCodes = [
      'not-found',
      'not-guardian',
      'not-shared-custody',
      'proposal-expired',
      'already-responded',
      'cannot-respond-own',
      'cooldown-active',
      'dispute-expired',
      'cannot-dispute-own',
      'rate-limit',
      'invalid-setting',
      'invalid-value',
      'unknown',
    ]

    for (const code of requiredCodes) {
      expect(SAFETY_PROPOSAL_ERROR_MESSAGES[code]).toBeDefined()
      expect(typeof SAFETY_PROPOSAL_ERROR_MESSAGES[code]).toBe('string')
    }
  })
})
