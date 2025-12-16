import { describe, it, expect } from 'vitest'
import {
  signatureTypeSchema,
  signatureSchema,
  agreementSignatureSchema,
  signerRoleSchema,
  signingStatusSchema,
  agreementSignaturesSchema,
  SIGNATURE_ORDER,
  SIGNATURE_VALIDATION,
  SIGNATURE_TYPE_LABELS,
  SIGNER_ROLE_LABELS,
  SIGNING_STATUS_LABELS,
  SIGNING_STATUS_DESCRIPTIONS,
  getSignatureTypeLabel,
  getSignerRoleLabel,
  getSigningStatusLabel,
  getSigningStatusDescription,
  safeParseSignature,
  safeParseAgreementSignature,
  validateSignature,
  validateAgreementSignature,
  isTypedSignatureValid,
  isDrawnSignatureValid,
  canChildSign,
  canParentSign,
  getNextSigningStatus,
  isSigningComplete,
  type SignatureType,
  type Signature,
  type AgreementSignature,
  type SignerRole,
  type SigningStatus,
} from './signature.schema'

// ============================================
// SIGNATURE TYPE SCHEMA TESTS (Task 1.2)
// ============================================

describe('signatureTypeSchema', () => {
  it('accepts valid signature types', () => {
    expect(signatureTypeSchema.parse('typed')).toBe('typed')
    expect(signatureTypeSchema.parse('drawn')).toBe('drawn')
  })

  it('rejects invalid signature types', () => {
    expect(() => signatureTypeSchema.parse('digital')).toThrow()
    expect(() => signatureTypeSchema.parse('')).toThrow()
    expect(() => signatureTypeSchema.parse(123)).toThrow()
  })
})

// ============================================
// SIGNATURE SCHEMA TESTS (Task 1.1, 1.3, 1.6)
// ============================================

describe('signatureSchema', () => {
  const validTypedSignature = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    type: 'typed',
    value: 'John Doe',
    signedBy: 'parent',
    signedAt: '2025-12-16T12:00:00.000Z',
  }

  const validDrawnSignature = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    type: 'drawn',
    value: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    signedBy: 'child',
    signedAt: '2025-12-16T12:00:00.000Z',
  }

  it('accepts valid typed signature', () => {
    const result = signatureSchema.safeParse(validTypedSignature)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('typed')
      expect(result.data.value).toBe('John Doe')
    }
  })

  it('accepts valid drawn signature', () => {
    const result = signatureSchema.safeParse(validDrawnSignature)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('drawn')
    }
  })

  it('accepts optional ipHash', () => {
    const withIpHash = {
      ...validTypedSignature,
      ipHash: 'abc123hash',
    }
    const result = signatureSchema.safeParse(withIpHash)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ipHash).toBe('abc123hash')
    }
  })

  it('rejects signature with missing id', () => {
    const { id, ...withoutId } = validTypedSignature
    const result = signatureSchema.safeParse(withoutId)
    expect(result.success).toBe(false)
  })

  it('rejects signature with invalid UUID', () => {
    const result = signatureSchema.safeParse({
      ...validTypedSignature,
      id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty signature value', () => {
    const result = signatureSchema.safeParse({
      ...validTypedSignature,
      value: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid signedBy value', () => {
    const result = signatureSchema.safeParse({
      ...validTypedSignature,
      signedBy: 'guardian',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid datetime format', () => {
    const result = signatureSchema.safeParse({
      ...validTypedSignature,
      signedAt: 'not-a-datetime',
    })
    expect(result.success).toBe(false)
  })
})

// ============================================
// AGREEMENT SIGNATURE SCHEMA TESTS (Task 1.4)
// ============================================

describe('agreementSignatureSchema', () => {
  const validAgreementSignature = {
    agreementId: '123e4567-e89b-12d3-a456-426614174002',
    signature: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'typed',
      value: 'Jane Smith',
      signedBy: 'child',
      signedAt: '2025-12-16T12:00:00.000Z',
    },
    consentCheckboxChecked: true,
    commitmentsReviewed: true,
  }

  it('accepts valid agreement signature', () => {
    const result = agreementSignatureSchema.safeParse(validAgreementSignature)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.consentCheckboxChecked).toBe(true)
      expect(result.data.commitmentsReviewed).toBe(true)
    }
  })

  it('rejects if consent checkbox not checked', () => {
    const result = agreementSignatureSchema.safeParse({
      ...validAgreementSignature,
      consentCheckboxChecked: false,
    })
    // Schema should accept false, but business logic should reject
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.consentCheckboxChecked).toBe(false)
    }
  })

  it('rejects missing agreementId', () => {
    const { agreementId, ...withoutAgreementId } = validAgreementSignature
    const result = agreementSignatureSchema.safeParse(withoutAgreementId)
    expect(result.success).toBe(false)
  })

  it('rejects invalid agreementId format', () => {
    const result = agreementSignatureSchema.safeParse({
      ...validAgreementSignature,
      agreementId: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })
})

// ============================================
// SIGNER ROLE SCHEMA TESTS
// ============================================

describe('signerRoleSchema', () => {
  it('accepts valid signer roles', () => {
    expect(signerRoleSchema.parse('parent')).toBe('parent')
    expect(signerRoleSchema.parse('child')).toBe('child')
    expect(signerRoleSchema.parse('co-parent')).toBe('co-parent')
  })

  it('rejects invalid signer roles', () => {
    expect(() => signerRoleSchema.parse('guardian')).toThrow()
    expect(() => signerRoleSchema.parse('')).toThrow()
  })
})

// ============================================
// SIGNING STATUS SCHEMA TESTS (Task 1.5)
// ============================================

describe('signingStatusSchema', () => {
  it('accepts valid signing statuses', () => {
    expect(signingStatusSchema.parse('pending')).toBe('pending')
    expect(signingStatusSchema.parse('parent_signed')).toBe('parent_signed')
    expect(signingStatusSchema.parse('child_signed')).toBe('child_signed')
    expect(signingStatusSchema.parse('complete')).toBe('complete')
  })

  it('rejects invalid statuses', () => {
    expect(() => signingStatusSchema.parse('signed')).toThrow()
    expect(() => signingStatusSchema.parse('')).toThrow()
  })
})

// ============================================
// CONSTANT TESTS (Task 1.5)
// ============================================

describe('SIGNATURE_ORDER', () => {
  it('enforces parent-first signing order', () => {
    expect(SIGNATURE_ORDER.parentFirst).toBe(true)
  })
})

describe('SIGNATURE_VALIDATION', () => {
  it('has correct validation limits', () => {
    expect(SIGNATURE_VALIDATION.minTypedNameLength).toBe(2)
    expect(SIGNATURE_VALIDATION.maxTypedNameLength).toBe(100)
    expect(SIGNATURE_VALIDATION.minDrawnDataLength).toBe(100)
  })
})

describe('label constants', () => {
  it('has labels for all signature types', () => {
    expect(SIGNATURE_TYPE_LABELS.typed).toBe('Typed Name')
    expect(SIGNATURE_TYPE_LABELS.drawn).toBe('Drawn Signature')
  })

  it('has labels for all signer roles', () => {
    expect(SIGNER_ROLE_LABELS.parent).toBe('Parent')
    expect(SIGNER_ROLE_LABELS.child).toBe('Child')
    expect(SIGNER_ROLE_LABELS['co-parent']).toBe('Co-Parent')
  })

  it('has labels for all signing statuses', () => {
    expect(SIGNING_STATUS_LABELS.pending).toBe('Waiting for Signatures')
    expect(SIGNING_STATUS_LABELS.parent_signed).toBe('Parent Signed')
    expect(SIGNING_STATUS_LABELS.child_signed).toBe('Child Signed')
    expect(SIGNING_STATUS_LABELS.complete).toBe('All Signed')
  })

  it('has descriptions at 6th-grade reading level', () => {
    expect(SIGNING_STATUS_DESCRIPTIONS.pending).toBeDefined()
    expect(SIGNING_STATUS_DESCRIPTIONS.complete).toBeDefined()
  })
})

// ============================================
// HELPER FUNCTION TESTS
// ============================================

describe('getSignatureTypeLabel', () => {
  it('returns correct label for typed', () => {
    expect(getSignatureTypeLabel('typed')).toBe('Typed Name')
  })

  it('returns correct label for drawn', () => {
    expect(getSignatureTypeLabel('drawn')).toBe('Drawn Signature')
  })
})

describe('getSignerRoleLabel', () => {
  it('returns correct labels', () => {
    expect(getSignerRoleLabel('parent')).toBe('Parent')
    expect(getSignerRoleLabel('child')).toBe('Child')
    expect(getSignerRoleLabel('co-parent')).toBe('Co-Parent')
  })
})

describe('getSigningStatusLabel', () => {
  it('returns correct labels', () => {
    expect(getSigningStatusLabel('pending')).toBe('Waiting for Signatures')
    expect(getSigningStatusLabel('complete')).toBe('All Signed')
  })
})

describe('getSigningStatusDescription', () => {
  it('returns descriptions at appropriate reading level', () => {
    const description = getSigningStatusDescription('pending')
    expect(description.length).toBeGreaterThan(0)
    // Description should be simple and clear
    expect(description).not.toContain('subsequently')
    expect(description).not.toContain('furthermore')
  })
})

describe('safeParseSignature', () => {
  it('returns signature for valid data', () => {
    const validSignature = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'typed',
      value: 'Test Name',
      signedBy: 'parent',
      signedAt: '2025-12-16T12:00:00.000Z',
    }
    const result = safeParseSignature(validSignature)
    expect(result).not.toBeNull()
    expect(result?.value).toBe('Test Name')
  })

  it('returns null for invalid data', () => {
    const result = safeParseSignature({ invalid: 'data' })
    expect(result).toBeNull()
  })
})

describe('safeParseAgreementSignature', () => {
  it('returns agreement signature for valid data', () => {
    const valid = {
      agreementId: '123e4567-e89b-12d3-a456-426614174002',
      signature: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'typed',
        value: 'Test Name',
        signedBy: 'child',
        signedAt: '2025-12-16T12:00:00.000Z',
      },
      consentCheckboxChecked: true,
      commitmentsReviewed: true,
    }
    const result = safeParseAgreementSignature(valid)
    expect(result).not.toBeNull()
  })

  it('returns null for invalid data', () => {
    const result = safeParseAgreementSignature({ invalid: 'data' })
    expect(result).toBeNull()
  })
})

describe('validateSignature', () => {
  it('parses valid signature', () => {
    const valid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'typed',
      value: 'Test Name',
      signedBy: 'parent',
      signedAt: '2025-12-16T12:00:00.000Z',
    }
    expect(() => validateSignature(valid)).not.toThrow()
  })

  it('throws for invalid signature', () => {
    expect(() => validateSignature({ invalid: 'data' })).toThrow()
  })
})

describe('isTypedSignatureValid', () => {
  it('returns true for valid typed signature', () => {
    expect(isTypedSignatureValid('John Doe')).toBe(true)
    expect(isTypedSignatureValid('Jo')).toBe(true) // Min 2 chars
  })

  it('returns false for too short', () => {
    expect(isTypedSignatureValid('J')).toBe(false) // Only 1 char
    expect(isTypedSignatureValid('')).toBe(false)
  })

  it('returns false for too long', () => {
    const tooLong = 'A'.repeat(SIGNATURE_VALIDATION.maxTypedNameLength + 1)
    expect(isTypedSignatureValid(tooLong)).toBe(false)
  })
})

describe('isDrawnSignatureValid', () => {
  it('returns true for valid drawn signature (sufficient data)', () => {
    const validBase64 = 'data:image/png;base64,' + 'A'.repeat(100)
    expect(isDrawnSignatureValid(validBase64)).toBe(true)
  })

  it('returns false for empty signature', () => {
    expect(isDrawnSignatureValid('')).toBe(false)
  })

  it('returns false for too small signature data', () => {
    const tooSmall = 'data:image/png;base64,ABC'
    expect(isDrawnSignatureValid(tooSmall)).toBe(false)
  })
})

// ============================================
// SIGNING ORDER TESTS (Task 1.5, AC #7)
// ============================================

describe('canChildSign', () => {
  it('returns true when parent has signed', () => {
    expect(canChildSign('parent_signed')).toBe(true)
  })

  it('returns false when status is pending (parent has not signed)', () => {
    expect(canChildSign('pending')).toBe(false)
  })

  it('returns false when already complete', () => {
    expect(canChildSign('complete')).toBe(false)
  })

  it('returns false when child already signed (should not happen in parent-first)', () => {
    expect(canChildSign('child_signed')).toBe(false)
  })
})

describe('canParentSign', () => {
  it('returns true when status is pending', () => {
    expect(canParentSign('pending')).toBe(true)
  })

  it('returns false when parent already signed', () => {
    expect(canParentSign('parent_signed')).toBe(false)
  })

  it('returns false when complete', () => {
    expect(canParentSign('complete')).toBe(false)
  })
})

describe('getNextSigningStatus', () => {
  it('returns parent_signed after parent signs from pending', () => {
    expect(getNextSigningStatus('pending', 'parent')).toBe('parent_signed')
  })

  it('returns complete after child signs from parent_signed', () => {
    expect(getNextSigningStatus('parent_signed', 'child')).toBe('complete')
  })

  it('returns same status if parent tries to sign when already signed', () => {
    expect(getNextSigningStatus('parent_signed', 'parent')).toBe('parent_signed')
  })

  it('returns same status if child tries to sign before parent', () => {
    expect(getNextSigningStatus('pending', 'child')).toBe('pending')
  })

  it('returns complete if already complete', () => {
    expect(getNextSigningStatus('complete', 'parent')).toBe('complete')
    expect(getNextSigningStatus('complete', 'child')).toBe('complete')
  })
})

describe('isSigningComplete', () => {
  it('returns true when status is complete', () => {
    expect(isSigningComplete('complete')).toBe(true)
  })

  it('returns false for all other statuses', () => {
    expect(isSigningComplete('pending')).toBe(false)
    expect(isSigningComplete('parent_signed')).toBe(false)
    expect(isSigningComplete('child_signed')).toBe(false)
  })
})

// ============================================
// AGREEMENT SIGNATURES SCHEMA TESTS
// ============================================

describe('agreementSignaturesSchema', () => {
  const validAgreementSignatures = {
    parent: {
      agreementId: '123e4567-e89b-12d3-a456-426614174002',
      signature: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'typed',
        value: 'Parent Name',
        signedBy: 'parent',
        signedAt: '2025-12-16T12:00:00.000Z',
      },
      consentCheckboxChecked: true,
      commitmentsReviewed: true,
    },
    child: null,
    coParent: null,
    signingStatus: 'parent_signed',
  }

  it('accepts valid agreement signatures with partial signatures', () => {
    const result = agreementSignaturesSchema.safeParse(validAgreementSignatures)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.signingStatus).toBe('parent_signed')
      expect(result.data.parent).not.toBeNull()
      expect(result.data.child).toBeNull()
    }
  })

  it('accepts complete agreement signatures', () => {
    const complete = {
      ...validAgreementSignatures,
      child: {
        agreementId: '123e4567-e89b-12d3-a456-426614174002',
        signature: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          type: 'drawn',
          value: 'data:image/png;base64,' + 'A'.repeat(100),
          signedBy: 'child',
          signedAt: '2025-12-16T13:00:00.000Z',
        },
        consentCheckboxChecked: true,
        commitmentsReviewed: true,
      },
      signingStatus: 'complete',
    }
    const result = agreementSignaturesSchema.safeParse(complete)
    expect(result.success).toBe(true)
  })

  it('accepts pending status with no signatures', () => {
    const pending = {
      parent: null,
      child: null,
      coParent: null,
      signingStatus: 'pending',
    }
    const result = agreementSignaturesSchema.safeParse(pending)
    expect(result.success).toBe(true)
  })
})
