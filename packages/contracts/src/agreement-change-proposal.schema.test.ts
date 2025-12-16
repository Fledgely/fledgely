import { describe, it, expect } from 'vitest'
import {
  // Schemas
  agreementChangeTypeSchema,
  agreementProposalStatusSchema,
  signatureStatusSchema,
  agreementSignatureSchema,
  agreementChangeValueSchema,
  agreementChangeProposalSchema,
  agreementChangeProposalFirestoreSchema,
  createAgreementChangeProposalInputSchema,
  respondToAgreementProposalInputSchema,
  signAgreementChangeInputSchema,
  // Constants
  AGREEMENT_CHANGE_TYPE_LABELS,
  AGREEMENT_PROPOSAL_STATUS_LABELS,
  AGREEMENT_PROPOSAL_FIELD_LIMITS,
  AGREEMENT_PROPOSAL_TIME_LIMITS,
  AGREEMENT_PROPOSAL_RATE_LIMIT,
  AGREEMENT_PROPOSAL_ERROR_MESSAGES,
  // Functions
  getAgreementChangeTypeLabel,
  getAgreementProposalStatusLabel,
  convertFirestoreToAgreementChangeProposal,
  safeParseAgreementChangeProposal,
  validateCreateAgreementChangeProposalInput,
  safeParseCreateAgreementChangeProposalInput,
  validateRespondToAgreementProposalInput,
  safeParseRespondToAgreementProposalInput,
  validateSignAgreementChangeInput,
  safeParseSignAgreementChangeInput,
  canRespondToAgreementProposal,
  canReproposeAgreementChange,
  calculateAgreementProposalExpiry,
  getAgreementProposalTimeUntilExpiry,
  calculateAgreementReproposalDate,
  calculateSignatureDeadline,
  isModificationProposal,
  canSignAgreementChange,
  allSignaturesCollected,
  getPendingSignatureCount,
  getPendingSigners,
  formatAgreementDiff,
  formatAgreementValue,
  getAgreementProposalErrorMessage,
  // Types
  type AgreementChangeType,
  type AgreementProposalStatus,
  type AgreementChangeProposal,
  type AgreementSignature,
} from './agreement-change-proposal.schema'

// ============================================
// TEST DATA FACTORIES
// ============================================

function createValidProposal(
  overrides: Partial<AgreementChangeProposal> = {}
): AgreementChangeProposal {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + AGREEMENT_PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS)

  return {
    id: 'proposal-123',
    childId: 'child-456',
    agreementId: 'agreement-789',
    proposedBy: 'parent-1',
    changeType: 'terms',
    changeDescription: 'Update bedtime rules for school nights',
    originalValue: 'Bedtime at 9 PM on school nights',
    proposedValue: 'Bedtime at 8:30 PM on school nights',
    status: 'pending',
    createdAt: now,
    expiresAt,
    respondedBy: null,
    respondedAt: null,
    declineMessage: null,
    originalProposalId: null,
    modificationNote: null,
    supersededByProposalId: null,
    signatures: null,
    signatureDeadline: null,
    activatedAt: null,
    newAgreementVersion: null,
    ...overrides,
  }
}

function createSignature(overrides: Partial<AgreementSignature> = {}): AgreementSignature {
  return {
    signerId: 'parent-1',
    signerType: 'parent',
    status: 'pending',
    signedAt: null,
    ...overrides,
  }
}

// ============================================
// AGREEMENT CHANGE TYPE SCHEMA TESTS
// ============================================

describe('agreementChangeTypeSchema', () => {
  const validTypes: AgreementChangeType[] = [
    'terms',
    'monitoring_rules',
    'screen_time',
    'bedtime_schedule',
    'app_restrictions',
    'content_filters',
    'consequences',
    'rewards',
  ]

  it.each(validTypes)('accepts valid change type: %s', (type) => {
    expect(agreementChangeTypeSchema.parse(type)).toBe(type)
  })

  it('rejects invalid change type', () => {
    expect(() => agreementChangeTypeSchema.parse('invalid_type')).toThrow()
    expect(() => agreementChangeTypeSchema.parse('')).toThrow()
    expect(() => agreementChangeTypeSchema.parse(123)).toThrow()
    expect(() => agreementChangeTypeSchema.parse(null)).toThrow()
  })

  it('rejects safety setting types (these are different)', () => {
    expect(() => agreementChangeTypeSchema.parse('monitoring_interval')).toThrow()
    expect(() => agreementChangeTypeSchema.parse('retention_period')).toThrow()
  })
})

// ============================================
// PROPOSAL STATUS SCHEMA TESTS
// ============================================

describe('agreementProposalStatusSchema', () => {
  const validStatuses: AgreementProposalStatus[] = [
    'pending',
    'approved',
    'declined',
    'expired',
    'modified',
    'awaiting_signatures',
    'active',
    'superseded',
  ]

  it.each(validStatuses)('accepts valid status: %s', (status) => {
    expect(agreementProposalStatusSchema.parse(status)).toBe(status)
  })

  it('rejects invalid status', () => {
    expect(() => agreementProposalStatusSchema.parse('invalid')).toThrow()
    expect(() => agreementProposalStatusSchema.parse('PENDING')).toThrow()
    expect(() => agreementProposalStatusSchema.parse('')).toThrow()
  })

  it('rejects safety settings specific statuses', () => {
    expect(() => agreementProposalStatusSchema.parse('auto_applied')).toThrow()
    expect(() => agreementProposalStatusSchema.parse('disputed')).toThrow()
    expect(() => agreementProposalStatusSchema.parse('reverted')).toThrow()
  })
})

// ============================================
// SIGNATURE STATUS SCHEMA TESTS
// ============================================

describe('signatureStatusSchema', () => {
  it('accepts pending status', () => {
    expect(signatureStatusSchema.parse('pending')).toBe('pending')
  })

  it('accepts signed status', () => {
    expect(signatureStatusSchema.parse('signed')).toBe('signed')
  })

  it('rejects invalid status', () => {
    expect(() => signatureStatusSchema.parse('approved')).toThrow()
    expect(() => signatureStatusSchema.parse('')).toThrow()
  })
})

// ============================================
// AGREEMENT SIGNATURE SCHEMA TESTS
// ============================================

describe('agreementSignatureSchema', () => {
  it('accepts valid parent signature', () => {
    const sig = createSignature({ signerType: 'parent' })
    const result = agreementSignatureSchema.parse(sig)
    expect(result.signerType).toBe('parent')
  })

  it('accepts valid child signature', () => {
    const sig = createSignature({ signerType: 'child' })
    const result = agreementSignatureSchema.parse(sig)
    expect(result.signerType).toBe('child')
  })

  it('accepts signed signature with date', () => {
    const sig = createSignature({
      status: 'signed',
      signedAt: new Date(),
    })
    const result = agreementSignatureSchema.parse(sig)
    expect(result.status).toBe('signed')
    expect(result.signedAt).toBeInstanceOf(Date)
  })

  it('rejects missing signerId', () => {
    const sig = { signerType: 'parent', status: 'pending' }
    expect(() => agreementSignatureSchema.parse(sig)).toThrow()
  })

  it('rejects empty signerId', () => {
    const sig = createSignature({ signerId: '' })
    expect(() => agreementSignatureSchema.parse(sig)).toThrow()
  })

  it('rejects invalid signerType', () => {
    const sig = { signerId: 'user-1', signerType: 'guardian', status: 'pending' }
    expect(() => agreementSignatureSchema.parse(sig)).toThrow()
  })
})

// ============================================
// AGREEMENT CHANGE VALUE SCHEMA TESTS
// ============================================

describe('agreementChangeValueSchema', () => {
  it('accepts valid string values', () => {
    expect(agreementChangeValueSchema.parse('New terms text')).toBe('New terms text')
    expect(agreementChangeValueSchema.parse('')).toBe('')
  })

  it('accepts valid number values', () => {
    expect(agreementChangeValueSchema.parse(30)).toBe(30)
    expect(agreementChangeValueSchema.parse(0)).toBe(0)
    expect(agreementChangeValueSchema.parse(-5)).toBe(-5) // Can be negative for some use cases
  })

  it('accepts valid boolean values', () => {
    expect(agreementChangeValueSchema.parse(true)).toBe(true)
    expect(agreementChangeValueSchema.parse(false)).toBe(false)
  })

  it('accepts valid object values', () => {
    const obj = { bedtime: '9:00 PM', wakeTime: '7:00 AM' }
    expect(agreementChangeValueSchema.parse(obj)).toEqual(obj)
  })

  it('accepts valid array values', () => {
    const apps = ['YouTube', 'TikTok', 'Instagram']
    expect(agreementChangeValueSchema.parse(apps)).toEqual(apps)
  })

  it('rejects strings over max length', () => {
    const longString = 'a'.repeat(AGREEMENT_PROPOSAL_FIELD_LIMITS.proposedValue + 1)
    expect(() => agreementChangeValueSchema.parse(longString)).toThrow()
  })

  it('accepts strings at max length', () => {
    const maxString = 'a'.repeat(AGREEMENT_PROPOSAL_FIELD_LIMITS.proposedValue)
    expect(agreementChangeValueSchema.parse(maxString)).toBe(maxString)
  })
})

// ============================================
// AGREEMENT CHANGE PROPOSAL SCHEMA TESTS
// ============================================

describe('agreementChangeProposalSchema', () => {
  it('accepts valid proposal', () => {
    const proposal = createValidProposal()
    const result = agreementChangeProposalSchema.parse(proposal)

    expect(result.id).toBe('proposal-123')
    expect(result.childId).toBe('child-456')
    expect(result.agreementId).toBe('agreement-789')
    expect(result.proposedBy).toBe('parent-1')
    expect(result.changeType).toBe('terms')
    expect(result.status).toBe('pending')
  })

  it('accepts proposal with response', () => {
    const proposal = createValidProposal({
      status: 'approved',
      respondedBy: 'parent-2',
      respondedAt: new Date(),
    })
    const result = agreementChangeProposalSchema.parse(proposal)

    expect(result.status).toBe('approved')
    expect(result.respondedBy).toBe('parent-2')
    expect(result.respondedAt).toBeInstanceOf(Date)
  })

  it('accepts proposal with decline message', () => {
    const proposal = createValidProposal({
      status: 'declined',
      respondedBy: 'parent-2',
      respondedAt: new Date(),
      declineMessage: 'I think we should discuss this first',
    })
    const result = agreementChangeProposalSchema.parse(proposal)

    expect(result.status).toBe('declined')
    expect(result.declineMessage).toBe('I think we should discuss this first')
  })

  it('accepts proposal with modification link', () => {
    const proposal = createValidProposal({
      originalProposalId: 'original-proposal-456',
      modificationNote: 'Modified the screen time to 2 hours instead of 1.5',
    })
    const result = agreementChangeProposalSchema.parse(proposal)

    expect(result.originalProposalId).toBe('original-proposal-456')
    expect(result.modificationNote).toBe('Modified the screen time to 2 hours instead of 1.5')
  })

  it('accepts proposal awaiting signatures', () => {
    const approvedAt = new Date()
    const proposal = createValidProposal({
      status: 'awaiting_signatures',
      respondedBy: 'parent-2',
      respondedAt: approvedAt,
      signatures: [
        createSignature({ signerId: 'parent-1', signerType: 'parent' }),
        createSignature({ signerId: 'parent-2', signerType: 'parent' }),
        createSignature({ signerId: 'child-456', signerType: 'child' }),
      ],
      signatureDeadline: new Date(
        approvedAt.getTime() + AGREEMENT_PROPOSAL_TIME_LIMITS.SIGNATURE_WINDOW_MS
      ),
    })
    const result = agreementChangeProposalSchema.parse(proposal)

    expect(result.status).toBe('awaiting_signatures')
    expect(result.signatures).toHaveLength(3)
    expect(result.signatureDeadline).toBeInstanceOf(Date)
  })

  it('accepts active proposal with new agreement version', () => {
    const proposal = createValidProposal({
      status: 'active',
      respondedBy: 'parent-2',
      respondedAt: new Date(),
      signatures: [
        createSignature({ signerId: 'parent-1', signerType: 'parent', status: 'signed', signedAt: new Date() }),
        createSignature({ signerId: 'parent-2', signerType: 'parent', status: 'signed', signedAt: new Date() }),
        createSignature({ signerId: 'child-456', signerType: 'child', status: 'signed', signedAt: new Date() }),
      ],
      activatedAt: new Date(),
      newAgreementVersion: 2,
    })
    const result = agreementChangeProposalSchema.parse(proposal)

    expect(result.status).toBe('active')
    expect(result.activatedAt).toBeInstanceOf(Date)
    expect(result.newAgreementVersion).toBe(2)
  })

  it('rejects missing required fields', () => {
    expect(() => agreementChangeProposalSchema.parse({})).toThrow()
    expect(() => agreementChangeProposalSchema.parse({ id: 'test' })).toThrow()
  })

  it('rejects empty id', () => {
    const proposal = createValidProposal({ id: '' })
    expect(() => agreementChangeProposalSchema.parse(proposal)).toThrow()
  })

  it('rejects id exceeding max length', () => {
    const proposal = createValidProposal({
      id: 'a'.repeat(AGREEMENT_PROPOSAL_FIELD_LIMITS.id + 1),
    })
    expect(() => agreementChangeProposalSchema.parse(proposal)).toThrow()
  })

  it('accepts id at max length', () => {
    const maxId = 'a'.repeat(AGREEMENT_PROPOSAL_FIELD_LIMITS.id)
    const proposal = createValidProposal({ id: maxId })
    const result = agreementChangeProposalSchema.parse(proposal)
    expect(result.id).toBe(maxId)
  })

  it('rejects empty childId', () => {
    const proposal = createValidProposal({ childId: '' })
    expect(() => agreementChangeProposalSchema.parse(proposal)).toThrow()
  })

  it('rejects empty agreementId', () => {
    const proposal = createValidProposal({ agreementId: '' })
    expect(() => agreementChangeProposalSchema.parse(proposal)).toThrow()
  })

  it('rejects empty changeDescription', () => {
    const proposal = createValidProposal({ changeDescription: '' })
    expect(() => agreementChangeProposalSchema.parse(proposal)).toThrow()
  })

  it('rejects changeDescription exceeding max length', () => {
    const proposal = createValidProposal({
      changeDescription: 'a'.repeat(AGREEMENT_PROPOSAL_FIELD_LIMITS.changeDescription + 1),
    })
    expect(() => agreementChangeProposalSchema.parse(proposal)).toThrow()
  })

  it('rejects declineMessage exceeding max length', () => {
    const proposal = createValidProposal({
      status: 'declined',
      respondedBy: 'parent-2',
      respondedAt: new Date(),
      declineMessage: 'a'.repeat(AGREEMENT_PROPOSAL_FIELD_LIMITS.declineMessage + 1),
    })
    expect(() => agreementChangeProposalSchema.parse(proposal)).toThrow()
  })

  it('rejects invalid newAgreementVersion (must be >= 1)', () => {
    const proposal = createValidProposal({
      status: 'active',
      newAgreementVersion: 0,
    })
    expect(() => agreementChangeProposalSchema.parse(proposal)).toThrow()
  })
})

// ============================================
// FIRESTORE SCHEMA TESTS
// ============================================

describe('agreementChangeProposalFirestoreSchema', () => {
  it('accepts valid Firestore proposal', () => {
    const firestoreProposal = {
      id: 'proposal-123',
      childId: 'child-456',
      agreementId: 'agreement-789',
      proposedBy: 'parent-1',
      changeType: 'terms',
      changeDescription: 'Update bedtime rules',
      originalValue: 'Old terms',
      proposedValue: 'New terms',
      status: 'pending',
      createdAt: { toDate: () => new Date() },
      expiresAt: { toDate: () => new Date() },
      respondedBy: null,
      respondedAt: null,
      declineMessage: null,
      originalProposalId: null,
      modificationNote: null,
      supersededByProposalId: null,
      signatures: null,
      signatureDeadline: null,
      activatedAt: null,
      newAgreementVersion: null,
    }

    const result = agreementChangeProposalFirestoreSchema.parse(firestoreProposal)
    expect(result.id).toBe('proposal-123')
  })

  it('accepts Firestore proposal with signatures', () => {
    const firestoreProposal = {
      id: 'proposal-123',
      childId: 'child-456',
      agreementId: 'agreement-789',
      proposedBy: 'parent-1',
      changeType: 'terms',
      changeDescription: 'Update terms',
      originalValue: 'Old',
      proposedValue: 'New',
      status: 'awaiting_signatures',
      createdAt: { toDate: () => new Date() },
      expiresAt: { toDate: () => new Date() },
      respondedBy: 'parent-2',
      respondedAt: { toDate: () => new Date() },
      declineMessage: null,
      originalProposalId: null,
      modificationNote: null,
      supersededByProposalId: null,
      signatures: [
        { signerId: 'parent-1', signerType: 'parent', status: 'signed', signedAt: { toDate: () => new Date() } },
        { signerId: 'parent-2', signerType: 'parent', status: 'pending', signedAt: null },
      ],
      signatureDeadline: { toDate: () => new Date() },
      activatedAt: null,
      newAgreementVersion: null,
    }

    const result = agreementChangeProposalFirestoreSchema.parse(firestoreProposal)
    expect(result.signatures).toHaveLength(2)
  })

  it('rejects non-Timestamp date fields', () => {
    const invalidProposal = {
      id: 'proposal-123',
      childId: 'child-456',
      agreementId: 'agreement-789',
      proposedBy: 'parent-1',
      changeType: 'terms',
      changeDescription: 'Update terms',
      originalValue: 'Old',
      proposedValue: 'New',
      status: 'pending',
      createdAt: new Date(), // Should be Timestamp-like
      expiresAt: { toDate: () => new Date() },
    }

    expect(() => agreementChangeProposalFirestoreSchema.parse(invalidProposal)).toThrow()
  })
})

// ============================================
// INPUT SCHEMA TESTS
// ============================================

describe('createAgreementChangeProposalInputSchema', () => {
  it('accepts valid input', () => {
    const input = {
      childId: 'child-123',
      changeType: 'screen_time',
      proposedValue: 120,
    }
    const result = createAgreementChangeProposalInputSchema.parse(input)
    expect(result.childId).toBe('child-123')
    expect(result.changeType).toBe('screen_time')
  })

  it('accepts input with optional justification', () => {
    const input = {
      childId: 'child-123',
      changeType: 'screen_time',
      proposedValue: 120,
      justification: 'Need to reduce screen time for better sleep',
    }
    const result = createAgreementChangeProposalInputSchema.parse(input)
    expect(result.justification).toBe('Need to reduce screen time for better sleep')
  })

  it('accepts input with modifiesProposalId', () => {
    const input = {
      childId: 'child-123',
      changeType: 'screen_time',
      proposedValue: 120,
      modifiesProposalId: 'proposal-456',
    }
    const result = createAgreementChangeProposalInputSchema.parse(input)
    expect(result.modifiesProposalId).toBe('proposal-456')
  })

  it('accepts all change types', () => {
    const changeTypes: AgreementChangeType[] = [
      'terms',
      'monitoring_rules',
      'screen_time',
      'bedtime_schedule',
      'app_restrictions',
      'content_filters',
      'consequences',
      'rewards',
    ]

    for (const changeType of changeTypes) {
      const input = {
        childId: 'child-123',
        changeType,
        proposedValue: 'test',
      }
      expect(() => createAgreementChangeProposalInputSchema.parse(input)).not.toThrow()
    }
  })

  it('rejects missing childId', () => {
    const input = {
      changeType: 'terms',
      proposedValue: 'test',
    }
    expect(() => createAgreementChangeProposalInputSchema.parse(input)).toThrow()
  })

  it('rejects empty childId', () => {
    const input = {
      childId: '',
      changeType: 'terms',
      proposedValue: 'test',
    }
    expect(() => createAgreementChangeProposalInputSchema.parse(input)).toThrow()
  })

  it('rejects missing changeType', () => {
    const input = {
      childId: 'child-123',
      proposedValue: 'test',
    }
    expect(() => createAgreementChangeProposalInputSchema.parse(input)).toThrow()
  })

  it('rejects missing proposedValue', () => {
    const input = {
      childId: 'child-123',
      changeType: 'terms',
    }
    expect(() => createAgreementChangeProposalInputSchema.parse(input)).toThrow()
  })
})

describe('respondToAgreementProposalInputSchema', () => {
  it('accepts approve action', () => {
    const input = {
      proposalId: 'proposal-123',
      childId: 'child-456',
      action: 'approve',
    }
    const result = respondToAgreementProposalInputSchema.parse(input)
    expect(result.action).toBe('approve')
  })

  it('accepts decline action with message', () => {
    const input = {
      proposalId: 'proposal-123',
      childId: 'child-456',
      action: 'decline',
      declineMessage: 'I disagree with this change',
    }
    const result = respondToAgreementProposalInputSchema.parse(input)
    expect(result.action).toBe('decline')
    expect(result.declineMessage).toBe('I disagree with this change')
  })

  it('accepts modify action with modified value', () => {
    const input = {
      proposalId: 'proposal-123',
      childId: 'child-456',
      action: 'modify',
      modifiedValue: 'Counter-proposal value',
      modificationNote: 'I suggest we try this instead',
    }
    const result = respondToAgreementProposalInputSchema.parse(input)
    expect(result.action).toBe('modify')
    expect(result.modifiedValue).toBe('Counter-proposal value')
  })

  it('rejects invalid action', () => {
    const input = {
      proposalId: 'proposal-123',
      childId: 'child-456',
      action: 'invalid',
    }
    expect(() => respondToAgreementProposalInputSchema.parse(input)).toThrow()
  })

  it('rejects message exceeding max length', () => {
    const input = {
      proposalId: 'proposal-123',
      childId: 'child-456',
      action: 'decline',
      declineMessage: 'a'.repeat(AGREEMENT_PROPOSAL_FIELD_LIMITS.declineMessage + 1),
    }
    expect(() => respondToAgreementProposalInputSchema.parse(input)).toThrow()
  })

  it('accepts empty proposalId validation fails', () => {
    const input = {
      proposalId: '',
      childId: 'child-456',
      action: 'approve',
    }
    expect(() => respondToAgreementProposalInputSchema.parse(input)).toThrow()
  })
})

describe('signAgreementChangeInputSchema', () => {
  it('accepts valid sign input', () => {
    const input = {
      proposalId: 'proposal-123',
      childId: 'child-456',
    }
    const result = signAgreementChangeInputSchema.parse(input)
    expect(result.proposalId).toBe('proposal-123')
    expect(result.childId).toBe('child-456')
  })

  it('rejects missing proposalId', () => {
    const input = {
      childId: 'child-456',
    }
    expect(() => signAgreementChangeInputSchema.parse(input)).toThrow()
  })

  it('rejects empty proposalId', () => {
    const input = {
      proposalId: '',
      childId: 'child-456',
    }
    expect(() => signAgreementChangeInputSchema.parse(input)).toThrow()
  })

  it('rejects missing childId', () => {
    const input = {
      proposalId: 'proposal-123',
    }
    expect(() => signAgreementChangeInputSchema.parse(input)).toThrow()
  })
})

// ============================================
// CONVERSION UTILITIES TESTS
// ============================================

describe('convertFirestoreToAgreementChangeProposal', () => {
  it('converts Firestore proposal to domain type', () => {
    const now = new Date()
    const firestoreProposal = {
      id: 'proposal-123',
      childId: 'child-456',
      agreementId: 'agreement-789',
      proposedBy: 'parent-1',
      changeType: 'terms' as const,
      changeDescription: 'Update terms',
      originalValue: 'Old terms',
      proposedValue: 'New terms',
      status: 'pending' as const,
      createdAt: { toDate: () => now },
      expiresAt: {
        toDate: () => new Date(now.getTime() + AGREEMENT_PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS),
      },
      respondedBy: null,
      respondedAt: null,
      declineMessage: null,
      originalProposalId: null,
      modificationNote: null,
      supersededByProposalId: null,
      signatures: null,
      signatureDeadline: null,
      activatedAt: null,
      newAgreementVersion: null,
    }

    const result = convertFirestoreToAgreementChangeProposal(firestoreProposal)

    expect(result.id).toBe('proposal-123')
    expect(result.createdAt).toBeInstanceOf(Date)
    expect(result.expiresAt).toBeInstanceOf(Date)
  })

  it('converts Firestore proposal with signatures', () => {
    const now = new Date()
    const signedAt = new Date()
    const firestoreProposal = {
      id: 'proposal-123',
      childId: 'child-456',
      agreementId: 'agreement-789',
      proposedBy: 'parent-1',
      changeType: 'terms' as const,
      changeDescription: 'Update terms',
      originalValue: 'Old',
      proposedValue: 'New',
      status: 'awaiting_signatures' as const,
      createdAt: { toDate: () => now },
      expiresAt: { toDate: () => new Date(now.getTime() + 1000000) },
      respondedBy: 'parent-2',
      respondedAt: { toDate: () => now },
      declineMessage: null,
      originalProposalId: null,
      modificationNote: null,
      supersededByProposalId: null,
      signatures: [
        {
          signerId: 'parent-1',
          signerType: 'parent' as const,
          status: 'signed' as const,
          signedAt: { toDate: () => signedAt },
        },
        { signerId: 'parent-2', signerType: 'parent' as const, status: 'pending' as const, signedAt: null },
      ],
      signatureDeadline: { toDate: () => new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
      activatedAt: null,
      newAgreementVersion: null,
    }

    const result = convertFirestoreToAgreementChangeProposal(firestoreProposal)

    expect(result.signatures).toHaveLength(2)
    expect(result.signatures![0].status).toBe('signed')
    expect(result.signatures![0].signedAt).toBeInstanceOf(Date)
    expect(result.signatures![1].signedAt).toBeNull()
  })
})

describe('safeParseAgreementChangeProposal', () => {
  it('returns proposal for valid data', () => {
    const proposal = createValidProposal()
    const result = safeParseAgreementChangeProposal(proposal)
    expect(result).not.toBeNull()
    expect(result?.id).toBe('proposal-123')
  })

  it('returns null for invalid data', () => {
    const result = safeParseAgreementChangeProposal({ invalid: 'data' })
    expect(result).toBeNull()
  })

  it('returns null for null input', () => {
    const result = safeParseAgreementChangeProposal(null)
    expect(result).toBeNull()
  })
})

describe('validateCreateAgreementChangeProposalInput', () => {
  it('validates and returns valid input', () => {
    const input = {
      childId: 'child-123',
      agreementId: 'agreement-456',
      changeType: 'terms',
      changeDescription: 'Test',
      proposedValue: 'new value',
    }
    const result = validateCreateAgreementChangeProposalInput(input)
    expect(result.childId).toBe('child-123')
  })

  it('throws for invalid input', () => {
    expect(() => validateCreateAgreementChangeProposalInput({})).toThrow()
  })
})

describe('safeParseCreateAgreementChangeProposalInput', () => {
  it('returns input for valid data', () => {
    const input = {
      childId: 'child-123',
      agreementId: 'agreement-456',
      changeType: 'terms',
      changeDescription: 'Test',
      proposedValue: 'new value',
    }
    const result = safeParseCreateAgreementChangeProposalInput(input)
    expect(result).not.toBeNull()
  })

  it('returns null for invalid data', () => {
    const result = safeParseCreateAgreementChangeProposalInput({})
    expect(result).toBeNull()
  })
})

describe('validateRespondToAgreementProposalInput', () => {
  it('validates and returns valid input', () => {
    const input = {
      proposalId: 'proposal-123',
      childId: 'child-456',
      action: 'approve',
    }
    const result = validateRespondToAgreementProposalInput(input)
    expect(result.action).toBe('approve')
  })

  it('throws for invalid input', () => {
    expect(() => validateRespondToAgreementProposalInput({})).toThrow()
  })
})

describe('safeParseRespondToAgreementProposalInput', () => {
  it('returns input for valid data', () => {
    const input = {
      proposalId: 'proposal-123',
      childId: 'child-456',
      action: 'approve',
    }
    const result = safeParseRespondToAgreementProposalInput(input)
    expect(result).not.toBeNull()
  })

  it('returns null for invalid data', () => {
    const result = safeParseRespondToAgreementProposalInput({})
    expect(result).toBeNull()
  })
})

describe('validateSignAgreementChangeInput', () => {
  it('validates and returns valid input', () => {
    const input = {
      proposalId: 'proposal-123',
      childId: 'child-456',
    }
    const result = validateSignAgreementChangeInput(input)
    expect(result.proposalId).toBe('proposal-123')
  })

  it('throws for invalid input', () => {
    expect(() => validateSignAgreementChangeInput({})).toThrow()
  })
})

describe('safeParseSignAgreementChangeInput', () => {
  it('returns input for valid data', () => {
    const input = {
      proposalId: 'proposal-123',
      childId: 'child-456',
    }
    const result = safeParseSignAgreementChangeInput(input)
    expect(result).not.toBeNull()
  })

  it('returns null for invalid data', () => {
    const result = safeParseSignAgreementChangeInput({})
    expect(result).toBeNull()
  })
})

// ============================================
// PROPOSAL WORKFLOW UTILITIES TESTS
// ============================================

describe('canRespondToAgreementProposal', () => {
  it('returns canRespond true for pending proposal within window', () => {
    const proposal = createValidProposal({ status: 'pending' })
    const result = canRespondToAgreementProposal(proposal)
    expect(result.canRespond).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it('returns canRespond false for expired proposal with reason', () => {
    const pastDate = new Date(Date.now() - 1000)
    const proposal = createValidProposal({
      status: 'pending',
      expiresAt: pastDate,
    })
    const result = canRespondToAgreementProposal(proposal)
    expect(result.canRespond).toBe(false)
    expect(result.reason).toContain('expired')
  })

  it('returns canRespond false for already approved proposal with reason', () => {
    const proposal = createValidProposal({ status: 'approved' })
    const result = canRespondToAgreementProposal(proposal)
    expect(result.canRespond).toBe(false)
    expect(result.reason).toContain('approved')
  })

  it('returns canRespond false for declined proposal with reason', () => {
    const proposal = createValidProposal({ status: 'declined' })
    const result = canRespondToAgreementProposal(proposal)
    expect(result.canRespond).toBe(false)
    expect(result.reason).toContain('declined')
  })

  it('returns canRespond false for awaiting_signatures proposal with reason', () => {
    const proposal = createValidProposal({ status: 'awaiting_signatures' })
    const result = canRespondToAgreementProposal(proposal)
    expect(result.canRespond).toBe(false)
    expect(result.reason).toContain('awaiting_signatures')
  })

  it('returns canRespond false for active proposal with reason', () => {
    const proposal = createValidProposal({ status: 'active' })
    const result = canRespondToAgreementProposal(proposal)
    expect(result.canRespond).toBe(false)
    expect(result.reason).toContain('active')
  })

  it('respects custom now date', () => {
    const createdAt = new Date('2024-01-01T12:00:00Z')
    const expiresAt = new Date('2024-01-15T12:00:00Z') // 14 days later
    const proposal = createValidProposal({ status: 'pending', createdAt, expiresAt })

    // Within window
    const withinWindow = new Date('2024-01-10T12:00:00Z')
    expect(canRespondToAgreementProposal(proposal, withinWindow).canRespond).toBe(true)

    // After expiry
    const afterExpiry = new Date('2024-01-16T12:00:00Z')
    const afterResult = canRespondToAgreementProposal(proposal, afterExpiry)
    expect(afterResult.canRespond).toBe(false)
    expect(afterResult.reason).toContain('expired')
  })
})

describe('canReproposeAgreementChange', () => {
  it('returns true when no declined proposals exist', () => {
    expect(canReproposeAgreementChange('terms', 'child-123', [])).toBe(true)
  })

  it('returns true after 7-day cooldown', () => {
    const declinedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago
    const declinedProposal = createValidProposal({
      status: 'declined',
      respondedAt: declinedAt,
    })
    expect(canReproposeAgreementChange('terms', 'child-456', [declinedProposal])).toBe(true)
  })

  it('returns false within 7-day cooldown', () => {
    const declinedAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    const declinedProposal = createValidProposal({
      status: 'declined',
      respondedAt: declinedAt,
    })
    expect(canReproposeAgreementChange('terms', 'child-456', [declinedProposal])).toBe(false)
  })

  it('returns true for different change type', () => {
    const declinedAt = new Date() // Just declined
    const declinedProposal = createValidProposal({
      changeType: 'screen_time',
      status: 'declined',
      respondedAt: declinedAt,
    })
    // Different change type should not be blocked
    expect(canReproposeAgreementChange('terms', 'child-456', [declinedProposal])).toBe(true)
  })

  it('returns true for different child', () => {
    const declinedAt = new Date() // Just declined
    const declinedProposal = createValidProposal({
      childId: 'other-child',
      status: 'declined',
      respondedAt: declinedAt,
    })
    expect(canReproposeAgreementChange('terms', 'child-456', [declinedProposal])).toBe(true)
  })

  it('uses most recent declined proposal for cooldown', () => {
    const oldDecline = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
    const recentDecline = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago

    const declinedProposals = [
      createValidProposal({ id: 'old', status: 'declined', respondedAt: oldDecline }),
      createValidProposal({ id: 'recent', status: 'declined', respondedAt: recentDecline }),
    ]

    expect(canReproposeAgreementChange('terms', 'child-456', declinedProposals)).toBe(false)
  })
})

describe('calculateAgreementProposalExpiry', () => {
  it('calculates expiry 14 days from creation', () => {
    const createdAt = new Date('2024-01-01T12:00:00Z')
    const expiry = calculateAgreementProposalExpiry(createdAt)

    const expectedExpiry = new Date('2024-01-15T12:00:00Z')
    expect(expiry.getTime()).toBe(expectedExpiry.getTime())
  })
})

describe('getAgreementProposalTimeUntilExpiry', () => {
  it('returns positive time for future expiry', () => {
    const now = new Date()
    const proposal = createValidProposal({
      expiresAt: new Date(now.getTime() + 60000), // 1 minute in future
    })

    const remaining = getAgreementProposalTimeUntilExpiry(proposal, now)
    expect(remaining).toBeGreaterThan(0)
    expect(remaining).toBeLessThanOrEqual(60000)
  })

  it('returns 0 for past expiry', () => {
    const now = new Date()
    const proposal = createValidProposal({
      expiresAt: new Date(now.getTime() - 60000), // 1 minute in past
    })

    expect(getAgreementProposalTimeUntilExpiry(proposal, now)).toBe(0)
  })
})

describe('calculateAgreementReproposalDate', () => {
  it('calculates reproposal date 7 days from decline', () => {
    const declinedAt = new Date('2024-01-01T12:00:00Z')
    const reproposalDate = calculateAgreementReproposalDate(declinedAt)

    const expectedDate = new Date('2024-01-08T12:00:00Z')
    expect(reproposalDate.getTime()).toBe(expectedDate.getTime())
  })
})

describe('calculateSignatureDeadline', () => {
  it('calculates signature deadline 30 days from approval', () => {
    const approvedAt = new Date('2024-01-01T12:00:00Z')
    const deadline = calculateSignatureDeadline(approvedAt)

    const expectedDeadline = new Date('2024-01-31T12:00:00Z')
    expect(deadline.getTime()).toBe(expectedDeadline.getTime())
  })
})

describe('isModificationProposal', () => {
  it('returns true when originalProposalId is set', () => {
    const proposal = createValidProposal({ originalProposalId: 'original-123' })
    expect(isModificationProposal(proposal)).toBe(true)
  })

  it('returns false when originalProposalId is null', () => {
    const proposal = createValidProposal({ originalProposalId: null })
    expect(isModificationProposal(proposal)).toBe(false)
  })

  it('returns false when originalProposalId is undefined', () => {
    const proposal = createValidProposal()
    delete (proposal as { originalProposalId?: string | null }).originalProposalId
    expect(isModificationProposal(proposal as AgreementChangeProposal)).toBe(false)
  })
})

// ============================================
// SIGNATURE WORKFLOW UTILITIES TESTS
// ============================================

describe('canSignAgreementChange', () => {
  function createProposalWithSignatures(
    parentsSigned: boolean[] = [false, false],
    childSigned: boolean = false
  ): AgreementChangeProposal {
    const now = new Date()
    return createValidProposal({
      status: 'awaiting_signatures',
      signatures: [
        createSignature({
          signerId: 'parent-1',
          signerType: 'parent',
          status: parentsSigned[0] ? 'signed' : 'pending',
          signedAt: parentsSigned[0] ? now : null,
        }),
        createSignature({
          signerId: 'parent-2',
          signerType: 'parent',
          status: parentsSigned[1] ? 'signed' : 'pending',
          signedAt: parentsSigned[1] ? now : null,
        }),
        createSignature({
          signerId: 'child-456',
          signerType: 'child',
          status: childSigned ? 'signed' : 'pending',
          signedAt: childSigned ? now : null,
        }),
      ],
      signatureDeadline: new Date(now.getTime() + AGREEMENT_PROPOSAL_TIME_LIMITS.SIGNATURE_WINDOW_MS),
    })
  }

  it('allows parent to sign awaiting_signatures proposal', () => {
    const proposal = createProposalWithSignatures([false, false], false)
    const result = canSignAgreementChange(proposal, 'parent-1', 'parent')
    expect(result.canSign).toBe(true)
  })

  it('allows child to sign after both parents signed', () => {
    const proposal = createProposalWithSignatures([true, true], false)
    const result = canSignAgreementChange(proposal, 'child-456', 'child')
    expect(result.canSign).toBe(true)
  })

  it('denies child signing before both parents signed', () => {
    const proposal = createProposalWithSignatures([true, false], false)
    const result = canSignAgreementChange(proposal, 'child-456', 'child')
    expect(result.canSign).toBe(false)
    expect(result.reason).toBe('Both parents must sign before child')
  })

  it('denies signing if not in awaiting_signatures status', () => {
    const proposal = createValidProposal({ status: 'pending' })
    const result = canSignAgreementChange(proposal, 'parent-1', 'parent')
    expect(result.canSign).toBe(false)
    expect(result.reason).toBe('Proposal is not awaiting signatures')
  })

  it('denies signing if no signatures array', () => {
    const proposal = createValidProposal({
      status: 'awaiting_signatures',
      signatures: null,
    })
    const result = canSignAgreementChange(proposal, 'parent-1', 'parent')
    expect(result.canSign).toBe(false)
    expect(result.reason).toBe('No signatures initialized')
  })

  it('denies signing if already signed', () => {
    const proposal = createProposalWithSignatures([true, false], false)
    const result = canSignAgreementChange(proposal, 'parent-1', 'parent')
    expect(result.canSign).toBe(false)
    expect(result.reason).toBe('Already signed')
  })

  it('denies signing if not in signer list', () => {
    const proposal = createProposalWithSignatures([false, false], false)
    const result = canSignAgreementChange(proposal, 'unknown-user', 'parent')
    expect(result.canSign).toBe(false)
    expect(result.reason).toBe('Signer not in signature list')
  })

  it('denies signing after deadline passed', () => {
    const proposal = createProposalWithSignatures([false, false], false)
    proposal.signatureDeadline = new Date(Date.now() - 1000) // Past
    const result = canSignAgreementChange(proposal, 'parent-1', 'parent')
    expect(result.canSign).toBe(false)
    expect(result.reason).toBe('Signature deadline has passed')
  })

  it('denies signing with no signature deadline', () => {
    const proposal = createProposalWithSignatures([false, false], false)
    proposal.signatureDeadline = null
    const result = canSignAgreementChange(proposal, 'parent-1', 'parent')
    expect(result.canSign).toBe(false)
    expect(result.reason).toBe('No signature deadline set')
  })
})

describe('allSignaturesCollected', () => {
  it('returns true when all signatures are collected', () => {
    const now = new Date()
    const proposal = createValidProposal({
      signatures: [
        createSignature({ status: 'signed', signedAt: now }),
        createSignature({ status: 'signed', signedAt: now }),
        createSignature({ signerType: 'child', status: 'signed', signedAt: now }),
      ],
    })
    expect(allSignaturesCollected(proposal)).toBe(true)
  })

  it('returns false when some signatures are pending', () => {
    const now = new Date()
    const proposal = createValidProposal({
      signatures: [
        createSignature({ status: 'signed', signedAt: now }),
        createSignature({ status: 'pending' }),
        createSignature({ signerType: 'child', status: 'pending' }),
      ],
    })
    expect(allSignaturesCollected(proposal)).toBe(false)
  })

  it('returns false when no signatures', () => {
    const proposal = createValidProposal({ signatures: null })
    expect(allSignaturesCollected(proposal)).toBe(false)
  })

  it('returns false for empty signatures array', () => {
    const proposal = createValidProposal({ signatures: [] })
    expect(allSignaturesCollected(proposal)).toBe(false)
  })
})

describe('getPendingSignatureCount', () => {
  it('returns correct count of pending signatures', () => {
    const now = new Date()
    const proposal = createValidProposal({
      signatures: [
        createSignature({ status: 'signed', signedAt: now }),
        createSignature({ status: 'pending' }),
        createSignature({ signerType: 'child', status: 'pending' }),
      ],
    })
    expect(getPendingSignatureCount(proposal)).toBe(2)
  })

  it('returns 0 when all signed', () => {
    const now = new Date()
    const proposal = createValidProposal({
      signatures: [
        createSignature({ status: 'signed', signedAt: now }),
        createSignature({ status: 'signed', signedAt: now }),
      ],
    })
    expect(getPendingSignatureCount(proposal)).toBe(0)
  })

  it('returns 0 when no signatures', () => {
    const proposal = createValidProposal({ signatures: null })
    expect(getPendingSignatureCount(proposal)).toBe(0)
  })
})

describe('getPendingSigners', () => {
  it('returns list of pending signers', () => {
    const now = new Date()
    const proposal = createValidProposal({
      signatures: [
        createSignature({ signerId: 'parent-1', status: 'signed', signedAt: now }),
        createSignature({ signerId: 'parent-2', status: 'pending' }),
        createSignature({ signerId: 'child-456', signerType: 'child', status: 'pending' }),
      ],
    })
    const pending = getPendingSigners(proposal)
    expect(pending).toHaveLength(2)
    expect(pending[0].signerId).toBe('parent-2')
    expect(pending[1].signerId).toBe('child-456')
  })

  it('returns empty array when all signed', () => {
    const now = new Date()
    const proposal = createValidProposal({
      signatures: [
        createSignature({ status: 'signed', signedAt: now }),
        createSignature({ status: 'signed', signedAt: now }),
      ],
    })
    expect(getPendingSigners(proposal)).toHaveLength(0)
  })

  it('returns empty array when no signatures', () => {
    const proposal = createValidProposal({ signatures: null })
    expect(getPendingSigners(proposal)).toHaveLength(0)
  })
})

// ============================================
// DIFF FORMATTING TESTS
// ============================================

describe('formatAgreementDiff', () => {
  it('formats terms change', () => {
    const proposal = createValidProposal({
      changeType: 'terms',
      originalValue: 'Old terms text',
      proposedValue: 'New terms text',
    })
    expect(formatAgreementDiff(proposal)).toBe('Terms and conditions: Old terms text → New terms text')
  })

  it('formats screen time change with numeric values', () => {
    const proposal = createValidProposal({
      changeType: 'screen_time',
      originalValue: 120,
      proposedValue: 90,
    })
    expect(formatAgreementDiff(proposal)).toBe('Screen time limits: 2 hours → 1h 30m')
  })

  it('truncates long string values', () => {
    const longValue = 'a'.repeat(150)
    const proposal = createValidProposal({
      changeType: 'terms',
      originalValue: longValue,
      proposedValue: 'Short',
    })
    const diff = formatAgreementDiff(proposal)
    expect(diff).toContain('...')
  })
})

describe('formatAgreementValue', () => {
  describe('boolean values', () => {
    it('formats true as Enabled', () => {
      expect(formatAgreementValue('terms', true)).toBe('Enabled')
    })

    it('formats false as Disabled', () => {
      expect(formatAgreementValue('terms', false)).toBe('Disabled')
    })
  })

  describe('string values', () => {
    it('returns short strings as-is', () => {
      expect(formatAgreementValue('terms', 'Short text')).toBe('Short text')
    })

    it('truncates strings over 100 characters', () => {
      const longString = 'a'.repeat(150)
      const result = formatAgreementValue('terms', longString)
      expect(result).toHaveLength(100)
      expect(result).toContain('...')
    })
  })

  describe('screen_time values', () => {
    it('formats minutes only', () => {
      expect(formatAgreementValue('screen_time', 30)).toBe('30 minutes')
    })

    it('formats singular minute', () => {
      expect(formatAgreementValue('screen_time', 1)).toBe('1 minute')
    })

    it('formats hours only', () => {
      expect(formatAgreementValue('screen_time', 60)).toBe('1 hour')
      expect(formatAgreementValue('screen_time', 120)).toBe('2 hours')
    })

    it('formats hours and minutes', () => {
      expect(formatAgreementValue('screen_time', 90)).toBe('1h 30m')
      expect(formatAgreementValue('screen_time', 150)).toBe('2h 30m')
    })
  })

  describe('bedtime_schedule values', () => {
    it('formats PM times', () => {
      // 9 PM = 21 * 60 = 1260 minutes
      expect(formatAgreementValue('bedtime_schedule', 1260)).toBe('9:00 PM')
    })

    it('formats AM times', () => {
      // 7 AM = 7 * 60 = 420 minutes
      expect(formatAgreementValue('bedtime_schedule', 420)).toBe('7:00 AM')
    })

    it('formats midnight', () => {
      expect(formatAgreementValue('bedtime_schedule', 0)).toBe('12:00 AM')
    })

    it('formats noon', () => {
      expect(formatAgreementValue('bedtime_schedule', 720)).toBe('12:00 PM')
    })
  })

  describe('array values', () => {
    it('formats empty array', () => {
      expect(formatAgreementValue('app_restrictions', [])).toBe('(empty list)')
    })

    it('formats small arrays', () => {
      expect(formatAgreementValue('app_restrictions', ['App1', 'App2'])).toBe('App1, App2')
    })

    it('formats arrays with 3 items', () => {
      expect(formatAgreementValue('app_restrictions', ['A', 'B', 'C'])).toBe('A, B, C')
    })

    it('truncates large arrays', () => {
      const apps = ['App1', 'App2', 'App3', 'App4', 'App5']
      expect(formatAgreementValue('app_restrictions', apps)).toBe('App1, App2, App3 (+2 more)')
    })
  })

  describe('object values', () => {
    it('formats empty object', () => {
      expect(formatAgreementValue('monitoring_rules', {})).toBe('(empty)')
    })

    it('formats object with settings count', () => {
      const obj = { setting1: true, setting2: false, setting3: 'value' }
      expect(formatAgreementValue('monitoring_rules', obj)).toBe('3 settings')
    })
  })
})

// ============================================
// LABEL FUNCTIONS TESTS
// ============================================

describe('getAgreementChangeTypeLabel', () => {
  it('returns correct labels for all change types', () => {
    expect(getAgreementChangeTypeLabel('terms')).toBe('Terms and conditions')
    expect(getAgreementChangeTypeLabel('monitoring_rules')).toBe('Monitoring rules')
    expect(getAgreementChangeTypeLabel('screen_time')).toBe('Screen time limits')
    expect(getAgreementChangeTypeLabel('bedtime_schedule')).toBe('Bedtime schedule')
    expect(getAgreementChangeTypeLabel('app_restrictions')).toBe('App restrictions')
    expect(getAgreementChangeTypeLabel('content_filters')).toBe('Content filters')
    expect(getAgreementChangeTypeLabel('consequences')).toBe('Consequences')
    expect(getAgreementChangeTypeLabel('rewards')).toBe('Rewards')
  })
})

describe('getAgreementProposalStatusLabel', () => {
  it('returns correct labels for all statuses', () => {
    expect(getAgreementProposalStatusLabel('pending')).toBe('Waiting for approval')
    expect(getAgreementProposalStatusLabel('approved')).toBe('Approved by both parents')
    expect(getAgreementProposalStatusLabel('declined')).toBe('Declined by co-parent')
    expect(getAgreementProposalStatusLabel('expired')).toBe('Expired (no response)')
    expect(getAgreementProposalStatusLabel('modified')).toBe('Modified by co-parent')
    expect(getAgreementProposalStatusLabel('awaiting_signatures')).toBe('Awaiting signatures')
    expect(getAgreementProposalStatusLabel('active')).toBe('Active (all signed)')
    expect(getAgreementProposalStatusLabel('superseded')).toBe('Superseded by newer proposal')
  })
})

// ============================================
// ERROR MESSAGES TESTS
// ============================================

describe('getAgreementProposalErrorMessage', () => {
  it('returns correct error messages', () => {
    expect(getAgreementProposalErrorMessage('not-found')).toBe('Could not find the proposal.')
    expect(getAgreementProposalErrorMessage('not-guardian')).toBe(
      'You must be a guardian of this child to make this change.'
    )
    expect(getAgreementProposalErrorMessage('proposal-expired')).toBe(
      'This proposal has expired. You can create a new one.'
    )
    expect(getAgreementProposalErrorMessage('cooldown-active')).toBe(
      'This change was recently declined. Please wait 7 days before proposing again.'
    )
    expect(getAgreementProposalErrorMessage('rate-limit')).toBe(
      'You have made too many proposals. Please wait an hour.'
    )
    expect(getAgreementProposalErrorMessage('parents-must-sign-first')).toBe(
      'Both parents must sign before the child can sign.'
    )
    expect(getAgreementProposalErrorMessage('signature-deadline-passed')).toBe(
      'The deadline for signatures has passed.'
    )
  })

  it('returns unknown message for undefined codes', () => {
    expect(getAgreementProposalErrorMessage('nonexistent-code')).toBe(
      'Something went wrong. Please try again.'
    )
  })
})

// ============================================
// CONSTANTS TESTS
// ============================================

describe('AGREEMENT_PROPOSAL_FIELD_LIMITS', () => {
  it('defines all required field limits', () => {
    expect(AGREEMENT_PROPOSAL_FIELD_LIMITS.id).toBe(128)
    expect(AGREEMENT_PROPOSAL_FIELD_LIMITS.childId).toBe(128)
    expect(AGREEMENT_PROPOSAL_FIELD_LIMITS.agreementId).toBe(128)
    expect(AGREEMENT_PROPOSAL_FIELD_LIMITS.proposedBy).toBe(128)
    expect(AGREEMENT_PROPOSAL_FIELD_LIMITS.respondedBy).toBe(128)
    expect(AGREEMENT_PROPOSAL_FIELD_LIMITS.originalProposalId).toBe(128)
    expect(AGREEMENT_PROPOSAL_FIELD_LIMITS.declineMessage).toBe(500)
    expect(AGREEMENT_PROPOSAL_FIELD_LIMITS.modificationNote).toBe(500)
    expect(AGREEMENT_PROPOSAL_FIELD_LIMITS.changeDescription).toBe(2000)
    expect(AGREEMENT_PROPOSAL_FIELD_LIMITS.originalValue).toBe(10000)
    expect(AGREEMENT_PROPOSAL_FIELD_LIMITS.proposedValue).toBe(10000)
  })
})

describe('AGREEMENT_PROPOSAL_TIME_LIMITS', () => {
  it('defines correct time limits', () => {
    expect(AGREEMENT_PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS).toBe(14 * 24 * 60 * 60 * 1000) // 14 days
    expect(AGREEMENT_PROPOSAL_TIME_LIMITS.REPROPOSAL_COOLDOWN_MS).toBe(7 * 24 * 60 * 60 * 1000) // 7 days
    expect(AGREEMENT_PROPOSAL_TIME_LIMITS.SIGNATURE_WINDOW_MS).toBe(30 * 24 * 60 * 60 * 1000) // 30 days
  })
})

describe('AGREEMENT_PROPOSAL_RATE_LIMIT', () => {
  it('defines rate limit constants', () => {
    expect(AGREEMENT_PROPOSAL_RATE_LIMIT.MAX_PROPOSALS_PER_HOUR).toBe(10)
    expect(AGREEMENT_PROPOSAL_RATE_LIMIT.WINDOW_MS).toBe(60 * 60 * 1000)
  })
})

describe('AGREEMENT_CHANGE_TYPE_LABELS', () => {
  it('has labels for all change types', () => {
    const changeTypes: AgreementChangeType[] = [
      'terms',
      'monitoring_rules',
      'screen_time',
      'bedtime_schedule',
      'app_restrictions',
      'content_filters',
      'consequences',
      'rewards',
    ]

    for (const type of changeTypes) {
      expect(AGREEMENT_CHANGE_TYPE_LABELS[type]).toBeDefined()
      expect(typeof AGREEMENT_CHANGE_TYPE_LABELS[type]).toBe('string')
    }
  })
})

describe('AGREEMENT_PROPOSAL_STATUS_LABELS', () => {
  it('has labels for all statuses', () => {
    const statuses: AgreementProposalStatus[] = [
      'pending',
      'approved',
      'declined',
      'expired',
      'modified',
      'awaiting_signatures',
      'active',
      'superseded',
    ]

    for (const status of statuses) {
      expect(AGREEMENT_PROPOSAL_STATUS_LABELS[status]).toBeDefined()
      expect(typeof AGREEMENT_PROPOSAL_STATUS_LABELS[status]).toBe('string')
    }
  })
})

describe('AGREEMENT_PROPOSAL_ERROR_MESSAGES', () => {
  it('has all required error messages', () => {
    const requiredCodes = [
      'not-found',
      'not-guardian',
      'not-shared-custody',
      'proposal-expired',
      'already-responded',
      'cannot-respond-own',
      'cooldown-active',
      'rate-limit',
      'invalid-change-type',
      'invalid-value',
      'no-active-agreement',
      'pending-proposal-exists',
      'signature-deadline-passed',
      'already-signed',
      'parents-must-sign-first',
      'not-in-signer-list',
      'not-awaiting-signatures',
      'modify-requires-value',
      'unknown',
    ]

    for (const code of requiredCodes) {
      expect(AGREEMENT_PROPOSAL_ERROR_MESSAGES[code]).toBeDefined()
      expect(typeof AGREEMENT_PROPOSAL_ERROR_MESSAGES[code]).toBe('string')
    }
  })
})
