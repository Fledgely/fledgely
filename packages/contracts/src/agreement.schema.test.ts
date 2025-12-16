import { describe, it, expect } from 'vitest'
import {
  agreementStatusSchema,
  agreementVersionSchema,
  archiveReasonSchema,
  AGREEMENT_STATUS_LABELS,
  AGREEMENT_STATUS_DESCRIPTIONS,
  ARCHIVE_REASON_LABELS,
  getAgreementStatusLabel,
  getAgreementStatusDescription,
  getArchiveReasonLabel,
  isAgreementActive,
  isAgreementArchived,
  canActivateAgreement,
  getNextVersionNumber,
  parseVersionNumber,
  compareVersions,
  type AgreementStatus,
  type AgreementVersion,
  type ArchiveReason,
} from './agreement.schema'

// ============================================
// AGREEMENT STATUS SCHEMA TESTS (Task 1.1)
// ============================================

describe('agreementStatusSchema', () => {
  it('accepts valid agreement statuses', () => {
    expect(agreementStatusSchema.parse('draft')).toBe('draft')
    expect(agreementStatusSchema.parse('pending_signatures')).toBe('pending_signatures')
    expect(agreementStatusSchema.parse('active')).toBe('active')
    expect(agreementStatusSchema.parse('archived')).toBe('archived')
    expect(agreementStatusSchema.parse('superseded')).toBe('superseded')
  })

  it('rejects invalid agreement statuses', () => {
    expect(() => agreementStatusSchema.parse('signed')).toThrow()
    expect(() => agreementStatusSchema.parse('complete')).toThrow()
    expect(() => agreementStatusSchema.parse('')).toThrow()
    expect(() => agreementStatusSchema.parse(123)).toThrow()
  })
})

// ============================================
// AGREEMENT VERSION SCHEMA TESTS (Task 1.2)
// ============================================

describe('agreementVersionSchema', () => {
  it('accepts valid version formats', () => {
    expect(agreementVersionSchema.parse('1.0')).toBe('1.0')
    expect(agreementVersionSchema.parse('1.1')).toBe('1.1')
    expect(agreementVersionSchema.parse('2.0')).toBe('2.0')
    expect(agreementVersionSchema.parse('10.5')).toBe('10.5')
    expect(agreementVersionSchema.parse('99.99')).toBe('99.99')
  })

  it('rejects invalid version formats', () => {
    expect(() => agreementVersionSchema.parse('1')).toThrow()
    expect(() => agreementVersionSchema.parse('1.0.0')).toThrow()
    expect(() => agreementVersionSchema.parse('v1.0')).toThrow()
    expect(() => agreementVersionSchema.parse('1.0a')).toThrow()
    expect(() => agreementVersionSchema.parse('')).toThrow()
    expect(() => agreementVersionSchema.parse('abc')).toThrow()
  })
})

// ============================================
// ARCHIVE REASON SCHEMA TESTS (Task 1.4)
// ============================================

describe('archiveReasonSchema', () => {
  it('accepts valid archive reasons', () => {
    expect(archiveReasonSchema.parse('new_version')).toBe('new_version')
    expect(archiveReasonSchema.parse('manual_archive')).toBe('manual_archive')
    expect(archiveReasonSchema.parse('expired')).toBe('expired')
  })

  it('rejects invalid archive reasons', () => {
    expect(() => archiveReasonSchema.parse('deleted')).toThrow()
    expect(() => archiveReasonSchema.parse('')).toThrow()
  })
})

// ============================================
// LABEL CONSTANT TESTS
// ============================================

describe('AGREEMENT_STATUS_LABELS', () => {
  it('has labels for all agreement statuses', () => {
    expect(AGREEMENT_STATUS_LABELS.draft).toBe('Draft')
    expect(AGREEMENT_STATUS_LABELS.pending_signatures).toBe('Waiting for Signatures')
    expect(AGREEMENT_STATUS_LABELS.active).toBe('Active')
    expect(AGREEMENT_STATUS_LABELS.archived).toBe('Archived')
    expect(AGREEMENT_STATUS_LABELS.superseded).toBe('Replaced')
  })
})

describe('AGREEMENT_STATUS_DESCRIPTIONS', () => {
  it('has descriptions at 6th-grade reading level', () => {
    expect(AGREEMENT_STATUS_DESCRIPTIONS.draft).toBeDefined()
    expect(AGREEMENT_STATUS_DESCRIPTIONS.active).toBeDefined()
    expect(AGREEMENT_STATUS_DESCRIPTIONS.archived).toBeDefined()
    // Descriptions should be simple and clear
    expect(AGREEMENT_STATUS_DESCRIPTIONS.draft).not.toContain('subsequently')
    expect(AGREEMENT_STATUS_DESCRIPTIONS.draft).not.toContain('furthermore')
  })
})

describe('ARCHIVE_REASON_LABELS', () => {
  it('has labels for all archive reasons', () => {
    expect(ARCHIVE_REASON_LABELS.new_version).toBe('New Version Created')
    expect(ARCHIVE_REASON_LABELS.manual_archive).toBe('Manually Archived')
    expect(ARCHIVE_REASON_LABELS.expired).toBe('Expired')
  })
})

// ============================================
// HELPER FUNCTION TESTS
// ============================================

describe('getAgreementStatusLabel', () => {
  it('returns correct label for each status', () => {
    expect(getAgreementStatusLabel('draft')).toBe('Draft')
    expect(getAgreementStatusLabel('pending_signatures')).toBe('Waiting for Signatures')
    expect(getAgreementStatusLabel('active')).toBe('Active')
    expect(getAgreementStatusLabel('archived')).toBe('Archived')
    expect(getAgreementStatusLabel('superseded')).toBe('Replaced')
  })
})

describe('getAgreementStatusDescription', () => {
  it('returns descriptions at appropriate reading level', () => {
    const description = getAgreementStatusDescription('active')
    expect(description.length).toBeGreaterThan(0)
    // Description should be simple and clear
    expect(description).not.toContain('subsequently')
    expect(description).not.toContain('henceforth')
  })
})

describe('getArchiveReasonLabel', () => {
  it('returns correct labels', () => {
    expect(getArchiveReasonLabel('new_version')).toBe('New Version Created')
    expect(getArchiveReasonLabel('manual_archive')).toBe('Manually Archived')
    expect(getArchiveReasonLabel('expired')).toBe('Expired')
  })
})

// ============================================
// AGREEMENT STATUS HELPER TESTS (Task 1.5)
// ============================================

describe('isAgreementActive', () => {
  it('returns true only for active status', () => {
    expect(isAgreementActive('active')).toBe(true)
  })

  it('returns false for all other statuses', () => {
    expect(isAgreementActive('draft')).toBe(false)
    expect(isAgreementActive('pending_signatures')).toBe(false)
    expect(isAgreementActive('archived')).toBe(false)
    expect(isAgreementActive('superseded')).toBe(false)
  })
})

describe('isAgreementArchived', () => {
  it('returns true for archived status', () => {
    expect(isAgreementArchived('archived')).toBe(true)
  })

  it('returns true for superseded status', () => {
    expect(isAgreementArchived('superseded')).toBe(true)
  })

  it('returns false for active, draft, and pending statuses', () => {
    expect(isAgreementArchived('active')).toBe(false)
    expect(isAgreementArchived('draft')).toBe(false)
    expect(isAgreementArchived('pending_signatures')).toBe(false)
  })
})

describe('canActivateAgreement', () => {
  it('returns true only for pending_signatures status', () => {
    expect(canActivateAgreement('pending_signatures')).toBe(true)
  })

  it('returns false for all other statuses', () => {
    expect(canActivateAgreement('draft')).toBe(false)
    expect(canActivateAgreement('active')).toBe(false)
    expect(canActivateAgreement('archived')).toBe(false)
    expect(canActivateAgreement('superseded')).toBe(false)
  })
})

// ============================================
// VERSION NUMBER HELPER TESTS (Task 1.5)
// ============================================

describe('getNextVersionNumber', () => {
  it('returns 1.0 for first agreement (empty array)', () => {
    expect(getNextVersionNumber([])).toBe('1.0')
  })

  it('returns 1.0 when no versions exist (undefined)', () => {
    expect(getNextVersionNumber(undefined as unknown as string[])).toBe('1.0')
  })

  it('increments minor version for single existing version', () => {
    expect(getNextVersionNumber(['1.0'])).toBe('1.1')
  })

  it('increments from latest version when multiple exist', () => {
    expect(getNextVersionNumber(['1.0', '1.1', '1.2'])).toBe('1.3')
  })

  it('handles out-of-order versions correctly', () => {
    // Should find the highest version and increment
    expect(getNextVersionNumber(['1.2', '1.0', '1.1'])).toBe('1.3')
  })

  it('increments major version when minor reaches threshold', () => {
    expect(getNextVersionNumber(['1.9'])).toBe('1.10')
    expect(getNextVersionNumber(['1.99'])).toBe('1.100')
  })

  it('handles major version increments', () => {
    expect(getNextVersionNumber(['2.5'])).toBe('2.6')
    expect(getNextVersionNumber(['10.0'])).toBe('10.1')
  })
})

describe('parseVersionNumber', () => {
  it('parses valid version strings', () => {
    expect(parseVersionNumber('1.0')).toEqual({ major: 1, minor: 0 })
    expect(parseVersionNumber('2.5')).toEqual({ major: 2, minor: 5 })
    expect(parseVersionNumber('10.99')).toEqual({ major: 10, minor: 99 })
  })

  it('returns null for invalid version strings', () => {
    expect(parseVersionNumber('1')).toBeNull()
    expect(parseVersionNumber('1.0.0')).toBeNull()
    expect(parseVersionNumber('v1.0')).toBeNull()
    expect(parseVersionNumber('')).toBeNull()
    expect(parseVersionNumber('abc')).toBeNull()
  })
})

describe('compareVersions', () => {
  it('returns negative when first version is lower', () => {
    expect(compareVersions('1.0', '1.1')).toBeLessThan(0)
    expect(compareVersions('1.9', '2.0')).toBeLessThan(0)
    expect(compareVersions('1.0', '10.0')).toBeLessThan(0)
  })

  it('returns positive when first version is higher', () => {
    expect(compareVersions('1.1', '1.0')).toBeGreaterThan(0)
    expect(compareVersions('2.0', '1.9')).toBeGreaterThan(0)
    expect(compareVersions('10.0', '1.0')).toBeGreaterThan(0)
  })

  it('returns zero when versions are equal', () => {
    expect(compareVersions('1.0', '1.0')).toBe(0)
    expect(compareVersions('2.5', '2.5')).toBe(0)
  })

  it('handles invalid versions gracefully', () => {
    // Invalid versions should compare as 0.0
    expect(compareVersions('invalid', '1.0')).toBeLessThan(0)
    expect(compareVersions('1.0', 'invalid')).toBeGreaterThan(0)
    expect(compareVersions('invalid', 'invalid')).toBe(0)
  })
})
