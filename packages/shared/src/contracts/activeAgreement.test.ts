/**
 * Tests for ActiveAgreement schema and helper functions.
 *
 * Story 6.3: Agreement Activation - AC1, AC2, AC3, AC6, AC7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  activeAgreementSchema,
  activeAgreementStatusSchema,
  generateNextVersion,
  createActiveAgreement,
  archiveAgreement,
  findActiveAgreementForChild,
  type AgreementSigning,
  type AgreementTerm,
  type ActiveAgreement,
} from './index'

// Helper to create a mock signing session
const createMockSigning = (overrides: Partial<AgreementSigning> = {}): AgreementSigning => ({
  id: 'signing-1',
  sessionId: 'session-1',
  familyId: 'family-1',
  childId: 'child-1',
  status: 'complete',
  childSignature: {
    id: 'sig-child',
    party: 'child',
    method: 'typed',
    name: 'Alex',
    imageData: null,
    signerId: 'child-1',
    signerName: 'Alex',
    signedAt: new Date('2024-01-15T10:00:00'),
    acknowledged: true,
  },
  parentSignatures: [
    {
      id: 'sig-parent',
      party: 'parent',
      method: 'typed',
      name: 'Mom',
      imageData: null,
      signerId: 'parent-1',
      signerName: 'Mom',
      signedAt: new Date('2024-01-15T11:00:00'),
      acknowledged: true,
    },
  ],
  requiresBothParents: false,
  startedAt: new Date('2024-01-15T09:00:00'),
  completedAt: null,
  agreementVersion: 'v1.0',
  ...overrides,
})

// Helper to create a mock term
const createMockTerm = (overrides: Partial<AgreementTerm> = {}): AgreementTerm => ({
  id: 'term-1',
  text: 'No phones at dinner',
  category: 'time',
  party: 'child',
  order: 0,
  explanation: 'Family time is important',
  createdAt: new Date('2024-01-15T10:00:00'),
  updatedAt: new Date('2024-01-15T10:00:00'),
  ...overrides,
})

// Helper to create a mock active agreement
const createMockActiveAgreement = (overrides: Partial<ActiveAgreement> = {}): ActiveAgreement => ({
  id: 'agreement-family-1-child-1-1705320000000',
  familyId: 'family-1',
  childId: 'child-1',
  version: 'v1.0',
  signingSessionId: 'signing-1',
  coCreationSessionId: 'session-1',
  terms: [createMockTerm()],
  activatedAt: new Date('2024-01-15T12:00:00'),
  activatedByUid: 'parent-1',
  status: 'active',
  archivedAt: null,
  archivedByAgreementId: null,
  ...overrides,
})

describe('activeAgreementStatusSchema', () => {
  it('should accept "active" status', () => {
    expect(activeAgreementStatusSchema.parse('active')).toBe('active')
  })

  it('should accept "archived" status', () => {
    expect(activeAgreementStatusSchema.parse('archived')).toBe('archived')
  })

  it('should reject invalid status', () => {
    expect(() => activeAgreementStatusSchema.parse('invalid')).toThrow()
  })
})

describe('activeAgreementSchema', () => {
  it('should validate a complete active agreement', () => {
    const agreement = createMockActiveAgreement()
    expect(() => activeAgreementSchema.parse(agreement)).not.toThrow()
  })

  it('should validate an archived agreement with archivedAt', () => {
    const agreement = createMockActiveAgreement({
      status: 'archived',
      archivedAt: new Date(),
      archivedByAgreementId: 'new-agreement-id',
    })
    expect(() => activeAgreementSchema.parse(agreement)).not.toThrow()
  })

  it('should require all mandatory fields', () => {
    const incomplete = { id: 'test' }
    expect(() => activeAgreementSchema.parse(incomplete)).toThrow()
  })

  it('should allow null archivedAt for active agreements', () => {
    const agreement = createMockActiveAgreement({ archivedAt: null })
    const result = activeAgreementSchema.parse(agreement)
    expect(result.archivedAt).toBeNull()
  })

  it('should allow null archivedByAgreementId for active agreements', () => {
    const agreement = createMockActiveAgreement({ archivedByAgreementId: null })
    const result = activeAgreementSchema.parse(agreement)
    expect(result.archivedByAgreementId).toBeNull()
  })
})

describe('generateNextVersion', () => {
  it('should return v1.0 for first agreement (null previous)', () => {
    expect(generateNextVersion(null)).toBe('v1.0')
  })

  it('should increment major version from v1.0 to v2.0', () => {
    expect(generateNextVersion('v1.0')).toBe('v2.0')
  })

  it('should increment major version from v2.0 to v3.0', () => {
    expect(generateNextVersion('v2.0')).toBe('v3.0')
  })

  it('should increment major version from v1.5 to v2.0', () => {
    expect(generateNextVersion('v1.5')).toBe('v2.0')
  })

  it('should return v1.0 for invalid version format', () => {
    expect(generateNextVersion('invalid')).toBe('v1.0')
  })

  it('should return v1.0 for version without v prefix', () => {
    expect(generateNextVersion('1.0')).toBe('v1.0')
  })
})

describe('createActiveAgreement', () => {
  let mockDate: Date

  beforeEach(() => {
    mockDate = new Date('2024-01-15T12:00:00')
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should create an active agreement with correct fields (AC1, AC2, AC3)', () => {
    const signing = createMockSigning()
    const terms = [createMockTerm()]

    const result = createActiveAgreement(signing, terms, null, 'parent-1')

    expect(result.familyId).toBe('family-1')
    expect(result.childId).toBe('child-1')
    expect(result.version).toBe('v1.0')
    expect(result.signingSessionId).toBe('signing-1')
    expect(result.coCreationSessionId).toBe('session-1')
    expect(result.terms).toEqual(terms)
    expect(result.activatedAt).toEqual(mockDate)
    expect(result.activatedByUid).toBe('parent-1')
    expect(result.status).toBe('active')
    expect(result.archivedAt).toBeNull()
    expect(result.archivedByAgreementId).toBeNull()
  })

  it('should generate correct version for new agreement (AC2)', () => {
    const signing = createMockSigning()
    const terms = [createMockTerm()]

    const result = createActiveAgreement(signing, terms, null, 'parent-1')

    expect(result.version).toBe('v1.0')
  })

  it('should increment version for renewal (AC2)', () => {
    const signing = createMockSigning()
    const terms = [createMockTerm()]

    const result = createActiveAgreement(signing, terms, 'v1.0', 'parent-1')

    expect(result.version).toBe('v2.0')
  })

  it('should record activation timestamp distinct from signing (AC3)', () => {
    const signing = createMockSigning({
      startedAt: new Date('2024-01-15T09:00:00'),
    })
    const terms = [createMockTerm()]

    const result = createActiveAgreement(signing, terms, null, 'parent-1')

    expect(result.activatedAt).toEqual(mockDate)
    expect(result.activatedAt).not.toEqual(signing.startedAt)
  })

  it('should include terms snapshot (AC6)', () => {
    const signing = createMockSigning()
    const terms = [
      createMockTerm({ id: 'term-1', text: 'Rule 1' }),
      createMockTerm({ id: 'term-2', text: 'Rule 2' }),
    ]

    const result = createActiveAgreement(signing, terms, null, 'parent-1')

    expect(result.terms).toHaveLength(2)
    expect(result.terms[0].text).toBe('Rule 1')
    expect(result.terms[1].text).toBe('Rule 2')
  })

  it('should throw error if signing is not complete (AC1)', () => {
    const incompleteSigning = createMockSigning({
      childSignature: null,
    })
    const terms = [createMockTerm()]

    expect(() => createActiveAgreement(incompleteSigning, terms, null, 'parent-1')).toThrow(
      'Cannot activate agreement: not all signatures collected'
    )
  })

  it('should throw error if shared custody and only one parent signed', () => {
    const incompleteSigning = createMockSigning({
      requiresBothParents: true,
      parentSignatures: [
        {
          id: 'sig-parent-1',
          party: 'parent',
          method: 'typed',
          name: 'Mom',
          imageData: null,
          signerId: 'parent-1',
          signerName: 'Mom',
          signedAt: new Date(),
          acknowledged: true,
        },
      ],
    })
    const terms = [createMockTerm()]

    expect(() => createActiveAgreement(incompleteSigning, terms, null, 'parent-1')).toThrow(
      'Cannot activate agreement: not all signatures collected'
    )
  })

  it('should succeed with shared custody when both parents signed', () => {
    const completeSigning = createMockSigning({
      requiresBothParents: true,
      parentSignatures: [
        {
          id: 'sig-parent-1',
          party: 'parent',
          method: 'typed',
          name: 'Mom',
          imageData: null,
          signerId: 'parent-1',
          signerName: 'Mom',
          signedAt: new Date(),
          acknowledged: true,
        },
        {
          id: 'sig-parent-2',
          party: 'parent',
          method: 'typed',
          name: 'Dad',
          imageData: null,
          signerId: 'parent-2',
          signerName: 'Dad',
          signedAt: new Date(),
          acknowledged: true,
        },
      ],
    })
    const terms = [createMockTerm()]

    const result = createActiveAgreement(completeSigning, terms, null, 'parent-2')

    expect(result.status).toBe('active')
  })

  it('should generate unique ID with timestamp', () => {
    const signing = createMockSigning()
    const terms = [createMockTerm()]

    const result = createActiveAgreement(signing, terms, null, 'parent-1')

    expect(result.id).toContain('agreement-family-1-child-1-')
    expect(result.id).toContain(mockDate.getTime().toString())
  })
})

describe('archiveAgreement', () => {
  let mockDate: Date

  beforeEach(() => {
    mockDate = new Date('2024-01-16T12:00:00')
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should set status to archived (AC7)', () => {
    const agreement = createMockActiveAgreement()

    const result = archiveAgreement(agreement, 'new-agreement-id')

    expect(result.status).toBe('archived')
  })

  it('should set archivedAt timestamp (AC7)', () => {
    const agreement = createMockActiveAgreement()

    const result = archiveAgreement(agreement, 'new-agreement-id')

    expect(result.archivedAt).toEqual(mockDate)
  })

  it('should set archivedByAgreementId (AC7)', () => {
    const agreement = createMockActiveAgreement()

    const result = archiveAgreement(agreement, 'new-agreement-id')

    expect(result.archivedByAgreementId).toBe('new-agreement-id')
  })

  it('should preserve all other fields', () => {
    const agreement = createMockActiveAgreement()

    const result = archiveAgreement(agreement, 'new-agreement-id')

    expect(result.id).toBe(agreement.id)
    expect(result.familyId).toBe(agreement.familyId)
    expect(result.childId).toBe(agreement.childId)
    expect(result.version).toBe(agreement.version)
    expect(result.terms).toEqual(agreement.terms)
    expect(result.activatedAt).toEqual(agreement.activatedAt)
  })
})

describe('findActiveAgreementForChild', () => {
  it('should find active agreement for child (AC7)', () => {
    const agreements = [
      createMockActiveAgreement({ childId: 'child-1', status: 'active' }),
      createMockActiveAgreement({ childId: 'child-2', status: 'active' }),
    ]

    const result = findActiveAgreementForChild(agreements, 'child-1')

    expect(result).not.toBeNull()
    expect(result?.childId).toBe('child-1')
  })

  it('should return null if no active agreement for child', () => {
    const agreements = [createMockActiveAgreement({ childId: 'child-1', status: 'archived' })]

    const result = findActiveAgreementForChild(agreements, 'child-1')

    expect(result).toBeNull()
  })

  it('should return null for empty agreements list', () => {
    const result = findActiveAgreementForChild([], 'child-1')

    expect(result).toBeNull()
  })

  it('should ignore archived agreements', () => {
    const agreements = [
      createMockActiveAgreement({ id: 'old', childId: 'child-1', status: 'archived' }),
      createMockActiveAgreement({ id: 'new', childId: 'child-1', status: 'active' }),
    ]

    const result = findActiveAgreementForChild(agreements, 'child-1')

    expect(result?.id).toBe('new')
    expect(result?.status).toBe('active')
  })

  it('should only return ONE active agreement (AC7)', () => {
    const agreements = [createMockActiveAgreement({ childId: 'child-1', status: 'active' })]

    const result = findActiveAgreementForChild(agreements, 'child-1')

    // Should return a single agreement, not an array
    expect(result).not.toBeNull()
    expect(Array.isArray(result)).toBe(false)
  })
})
