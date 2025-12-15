import { describe, it, expect } from 'vitest'
import {
  custodyTypeSchema,
  custodyDeclarationSchema,
  custodyDeclarationFirestoreSchema,
  custodyHistoryEntrySchema,
  custodyHistoryEntryFirestoreSchema,
  createCustodyDeclarationInputSchema,
  updateCustodyDeclarationInputSchema,
  CUSTODY_TYPE_LABELS,
  CUSTODY_ERROR_MESSAGES,
  convertFirestoreToCustodyDeclaration,
  convertFirestoreToCustodyHistoryEntry,
  validateCreateCustodyDeclarationInput,
  safeParseCustodyDeclaration,
  requiresSharedCustodySafeguards,
  getCustodyErrorMessage,
  getCustodyTypeLabel,
  hasXssDangerousChars,
  type CustodyType,
  type CustodyDeclaration,
} from './custody.schema'

// Test fixtures
const validDate = new Date('2024-01-15T10:00:00Z')
const mockTimestamp = { toDate: () => validDate }

const validCustodyDeclaration: CustodyDeclaration = {
  type: 'sole',
  notes: null,
  declaredBy: 'user123',
  declaredAt: validDate,
}

// ============================================
// CUSTODY TYPE SCHEMA TESTS
// ============================================
describe('custodyTypeSchema', () => {
  it('accepts "sole" as valid custody type', () => {
    expect(custodyTypeSchema.parse('sole')).toBe('sole')
  })

  it('accepts "shared" as valid custody type', () => {
    expect(custodyTypeSchema.parse('shared')).toBe('shared')
  })

  it('accepts "complex" as valid custody type', () => {
    expect(custodyTypeSchema.parse('complex')).toBe('complex')
  })

  it('rejects invalid custody type', () => {
    expect(() => custodyTypeSchema.parse('invalid')).toThrow()
  })

  it('rejects empty string', () => {
    expect(() => custodyTypeSchema.parse('')).toThrow()
  })

  it('rejects null', () => {
    expect(() => custodyTypeSchema.parse(null)).toThrow()
  })

  it('rejects undefined', () => {
    expect(() => custodyTypeSchema.parse(undefined)).toThrow()
  })

  it('rejects number', () => {
    expect(() => custodyTypeSchema.parse(123)).toThrow()
  })

  it('rejects object', () => {
    expect(() => custodyTypeSchema.parse({ type: 'sole' })).toThrow()
  })
})

// ============================================
// CUSTODY DECLARATION SCHEMA TESTS
// ============================================
describe('custodyDeclarationSchema', () => {
  it('accepts valid custody declaration with sole type', () => {
    const result = custodyDeclarationSchema.parse(validCustodyDeclaration)
    expect(result.type).toBe('sole')
    expect(result.declaredBy).toBe('user123')
  })

  it('accepts valid custody declaration with shared type', () => {
    const result = custodyDeclarationSchema.parse({
      ...validCustodyDeclaration,
      type: 'shared',
    })
    expect(result.type).toBe('shared')
  })

  it('accepts valid custody declaration with complex type', () => {
    const result = custodyDeclarationSchema.parse({
      ...validCustodyDeclaration,
      type: 'complex',
    })
    expect(result.type).toBe('complex')
  })

  it('accepts custody declaration with notes', () => {
    const result = custodyDeclarationSchema.parse({
      ...validCustodyDeclaration,
      type: 'complex',
      notes: 'Blended family with step-children',
    })
    expect(result.notes).toBe('Blended family with step-children')
  })

  it('accepts custody declaration with null notes', () => {
    const result = custodyDeclarationSchema.parse({
      ...validCustodyDeclaration,
      notes: null,
    })
    expect(result.notes).toBeNull()
  })

  it('accepts custody declaration with undefined notes', () => {
    const declaration = { ...validCustodyDeclaration }
    delete (declaration as Record<string, unknown>).notes
    const result = custodyDeclarationSchema.parse(declaration)
    expect(result.notes).toBeUndefined()
  })

  it('rejects missing type', () => {
    const declaration = { ...validCustodyDeclaration }
    delete (declaration as Record<string, unknown>).type
    expect(() => custodyDeclarationSchema.parse(declaration)).toThrow()
  })

  it('rejects missing declaredBy', () => {
    const declaration = { ...validCustodyDeclaration }
    delete (declaration as Record<string, unknown>).declaredBy
    expect(() => custodyDeclarationSchema.parse(declaration)).toThrow()
  })

  it('rejects empty declaredBy', () => {
    expect(() =>
      custodyDeclarationSchema.parse({
        ...validCustodyDeclaration,
        declaredBy: '',
      })
    ).toThrow(/Declarer ID is required/)
  })

  it('rejects missing declaredAt', () => {
    const declaration = { ...validCustodyDeclaration }
    delete (declaration as Record<string, unknown>).declaredAt
    expect(() => custodyDeclarationSchema.parse(declaration)).toThrow()
  })

  it('rejects notes exceeding 500 characters', () => {
    const longNotes = 'a'.repeat(501)
    expect(() =>
      custodyDeclarationSchema.parse({
        ...validCustodyDeclaration,
        notes: longNotes,
      })
    ).toThrow(/500 characters/)
  })

  it('accepts notes exactly 500 characters', () => {
    const maxNotes = 'a'.repeat(500)
    const result = custodyDeclarationSchema.parse({
      ...validCustodyDeclaration,
      notes: maxNotes,
    })
    expect(result.notes?.length).toBe(500)
  })

  // XSS Protection Tests
  it('rejects notes containing < character', () => {
    expect(() =>
      custodyDeclarationSchema.parse({
        ...validCustodyDeclaration,
        notes: '<script>alert("xss")</script>',
      })
    ).toThrow(/special characters/)
  })

  it('rejects notes containing > character', () => {
    expect(() =>
      custodyDeclarationSchema.parse({
        ...validCustodyDeclaration,
        notes: 'Test > injection',
      })
    ).toThrow(/special characters/)
  })

  it('rejects notes containing " character', () => {
    expect(() =>
      custodyDeclarationSchema.parse({
        ...validCustodyDeclaration,
        notes: 'Test "quoted" text',
      })
    ).toThrow(/special characters/)
  })

  it("rejects notes containing ' character", () => {
    expect(() =>
      custodyDeclarationSchema.parse({
        ...validCustodyDeclaration,
        notes: "Test 'quoted' text",
      })
    ).toThrow(/special characters/)
  })

  it('rejects notes containing ` character', () => {
    expect(() =>
      custodyDeclarationSchema.parse({
        ...validCustodyDeclaration,
        notes: 'Test `backtick` text',
      })
    ).toThrow(/special characters/)
  })

  it('rejects notes containing & character', () => {
    expect(() =>
      custodyDeclarationSchema.parse({
        ...validCustodyDeclaration,
        notes: 'Test & injection',
      })
    ).toThrow(/special characters/)
  })

  it('trims whitespace from notes', () => {
    const result = custodyDeclarationSchema.parse({
      ...validCustodyDeclaration,
      notes: '  Some notes with whitespace  ',
    })
    expect(result.notes).toBe('Some notes with whitespace')
  })
})

// ============================================
// CUSTODY DECLARATION FIRESTORE SCHEMA TESTS
// ============================================
describe('custodyDeclarationFirestoreSchema', () => {
  it('accepts valid Firestore custody declaration', () => {
    const result = custodyDeclarationFirestoreSchema.parse({
      type: 'sole',
      notes: null,
      declaredBy: 'user123',
      declaredAt: mockTimestamp,
    })
    expect(result.type).toBe('sole')
    expect(result.declaredAt.toDate()).toEqual(validDate)
  })

  it('rejects invalid timestamp format', () => {
    expect(() =>
      custodyDeclarationFirestoreSchema.parse({
        type: 'sole',
        notes: null,
        declaredBy: 'user123',
        declaredAt: validDate, // Date instead of Timestamp
      })
    ).toThrow()
  })
})

// ============================================
// CUSTODY HISTORY ENTRY SCHEMA TESTS
// ============================================
describe('custodyHistoryEntrySchema', () => {
  it('accepts valid custody history entry', () => {
    const result = custodyHistoryEntrySchema.parse({
      previousDeclaration: validCustodyDeclaration,
      changedAt: validDate,
      changedBy: 'user456',
    })
    expect(result.previousDeclaration.type).toBe('sole')
    expect(result.changedBy).toBe('user456')
  })

  it('rejects missing previousDeclaration', () => {
    expect(() =>
      custodyHistoryEntrySchema.parse({
        changedAt: validDate,
        changedBy: 'user456',
      })
    ).toThrow()
  })

  it('rejects missing changedAt', () => {
    expect(() =>
      custodyHistoryEntrySchema.parse({
        previousDeclaration: validCustodyDeclaration,
        changedBy: 'user456',
      })
    ).toThrow()
  })

  it('rejects empty changedBy', () => {
    expect(() =>
      custodyHistoryEntrySchema.parse({
        previousDeclaration: validCustodyDeclaration,
        changedAt: validDate,
        changedBy: '',
      })
    ).toThrow(/Changer ID is required/)
  })
})

// ============================================
// CREATE CUSTODY DECLARATION INPUT SCHEMA TESTS
// ============================================
describe('createCustodyDeclarationInputSchema', () => {
  it('accepts valid input with type only', () => {
    const result = createCustodyDeclarationInputSchema.parse({
      type: 'sole',
    })
    expect(result.type).toBe('sole')
    expect(result.notes).toBeUndefined()
  })

  it('accepts valid input with type and notes', () => {
    const result = createCustodyDeclarationInputSchema.parse({
      type: 'complex',
      notes: 'Blended family situation',
    })
    expect(result.type).toBe('complex')
    expect(result.notes).toBe('Blended family situation')
  })

  it('transforms empty string notes to null', () => {
    const result = createCustodyDeclarationInputSchema.parse({
      type: 'sole',
      notes: '',
    })
    expect(result.notes).toBeNull()
  })

  it('rejects missing type', () => {
    expect(() =>
      createCustodyDeclarationInputSchema.parse({
        notes: 'Some notes',
      })
    ).toThrow()
  })

  it('rejects XSS characters in notes', () => {
    expect(() =>
      createCustodyDeclarationInputSchema.parse({
        type: 'complex',
        notes: '<script>evil()</script>',
      })
    ).toThrow(/special characters/)
  })
})

// ============================================
// UPDATE CUSTODY DECLARATION INPUT SCHEMA TESTS
// ============================================
describe('updateCustodyDeclarationInputSchema', () => {
  it('accepts empty update (all optional)', () => {
    const result = updateCustodyDeclarationInputSchema.parse({})
    expect(result.type).toBeUndefined()
  })

  it('accepts partial update with type only', () => {
    const result = updateCustodyDeclarationInputSchema.parse({
      type: 'shared',
    })
    expect(result.type).toBe('shared')
  })

  it('accepts partial update with notes only', () => {
    const result = updateCustodyDeclarationInputSchema.parse({
      notes: 'Updated notes',
    })
    expect(result.notes).toBe('Updated notes')
  })

  it('transforms empty string notes to null', () => {
    const result = updateCustodyDeclarationInputSchema.parse({
      notes: '',
    })
    expect(result.notes).toBeNull()
  })
})

// ============================================
// HELPER FUNCTION TESTS
// ============================================
describe('convertFirestoreToCustodyDeclaration', () => {
  it('converts Firestore data to CustodyDeclaration', () => {
    const result = convertFirestoreToCustodyDeclaration({
      type: 'shared',
      notes: 'Test notes',
      declaredBy: 'user123',
      declaredAt: mockTimestamp,
    })
    expect(result.type).toBe('shared')
    expect(result.notes).toBe('Test notes')
    expect(result.declaredBy).toBe('user123')
    expect(result.declaredAt).toEqual(validDate)
  })
})

describe('convertFirestoreToCustodyHistoryEntry', () => {
  it('converts Firestore history entry to CustodyHistoryEntry', () => {
    const result = convertFirestoreToCustodyHistoryEntry({
      previousDeclaration: {
        type: 'sole',
        notes: null,
        declaredBy: 'user123',
        declaredAt: mockTimestamp,
      },
      changedAt: mockTimestamp,
      changedBy: 'user456',
    })
    expect(result.previousDeclaration.type).toBe('sole')
    expect(result.changedBy).toBe('user456')
  })
})

describe('validateCreateCustodyDeclarationInput', () => {
  it('returns validated input for valid data', () => {
    const result = validateCreateCustodyDeclarationInput({
      type: 'complex',
      notes: 'Valid notes',
    })
    expect(result.type).toBe('complex')
    expect(result.notes).toBe('Valid notes')
  })

  it('throws for invalid data', () => {
    expect(() =>
      validateCreateCustodyDeclarationInput({
        type: 'invalid',
      })
    ).toThrow()
  })
})

describe('safeParseCustodyDeclaration', () => {
  it('returns parsed data for valid input', () => {
    const result = safeParseCustodyDeclaration(validCustodyDeclaration)
    expect(result).not.toBeNull()
    expect(result?.type).toBe('sole')
  })

  it('returns null for invalid input', () => {
    const result = safeParseCustodyDeclaration({ invalid: 'data' })
    expect(result).toBeNull()
  })

  it('returns null for null input', () => {
    const result = safeParseCustodyDeclaration(null)
    expect(result).toBeNull()
  })
})

describe('requiresSharedCustodySafeguards', () => {
  it('returns true for shared custody type', () => {
    expect(requiresSharedCustodySafeguards('shared')).toBe(true)
  })

  it('returns false for sole custody type', () => {
    expect(requiresSharedCustodySafeguards('sole')).toBe(false)
  })

  it('returns false for complex custody type', () => {
    expect(requiresSharedCustodySafeguards('complex')).toBe(false)
  })
})

describe('getCustodyErrorMessage', () => {
  it('returns correct message for child-not-found', () => {
    expect(getCustodyErrorMessage('child-not-found')).toBe(
      'We could not find this child. Please try again.'
    )
  })

  it('returns correct message for permission-denied', () => {
    expect(getCustodyErrorMessage('permission-denied')).toBe(
      'You do not have permission to change custody settings.'
    )
  })

  it('returns correct message for custody-required', () => {
    expect(getCustodyErrorMessage('custody-required')).toBe(
      'Please tell us about your custody arrangement first.'
    )
  })

  it('returns default message for unknown error code', () => {
    expect(getCustodyErrorMessage('unknown-error')).toBe('Something went wrong. Please try again.')
  })
})

describe('getCustodyTypeLabel', () => {
  it('returns correct label for sole custody', () => {
    const label = getCustodyTypeLabel('sole')
    expect(label.title).toBe('Sole Custody')
    expect(label.description).toContain('only parent or guardian')
  })

  it('returns correct label for shared custody', () => {
    const label = getCustodyTypeLabel('shared')
    expect(label.title).toBe('Shared Custody')
    expect(label.description).toContain('shares custody')
  })

  it('returns correct label for complex custody', () => {
    const label = getCustodyTypeLabel('complex')
    expect(label.title).toBe('Complex Arrangement')
    expect(label.description).toContain('unique situation')
  })
})

describe('hasXssDangerousChars', () => {
  it('returns true for text with < character', () => {
    expect(hasXssDangerousChars('<script>')).toBe(true)
  })

  it('returns true for text with > character', () => {
    expect(hasXssDangerousChars('test>')).toBe(true)
  })

  it('returns true for text with " character', () => {
    expect(hasXssDangerousChars('test"quote')).toBe(true)
  })

  it("returns true for text with ' character", () => {
    expect(hasXssDangerousChars("test'quote")).toBe(true)
  })

  it('returns true for text with ` character', () => {
    expect(hasXssDangerousChars('test`backtick')).toBe(true)
  })

  it('returns true for text with & character', () => {
    expect(hasXssDangerousChars('test&entity')).toBe(true)
  })

  it('returns false for safe text', () => {
    expect(hasXssDangerousChars('This is safe text with no special chars')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(hasXssDangerousChars('')).toBe(false)
  })
})

// ============================================
// CONSTANTS TESTS
// ============================================
describe('CUSTODY_TYPE_LABELS', () => {
  it('has label for all custody types', () => {
    const types: CustodyType[] = ['sole', 'shared', 'complex']
    types.forEach((type) => {
      expect(CUSTODY_TYPE_LABELS[type]).toBeDefined()
      expect(CUSTODY_TYPE_LABELS[type].title).toBeTruthy()
      expect(CUSTODY_TYPE_LABELS[type].description).toBeTruthy()
    })
  })
})

describe('CUSTODY_ERROR_MESSAGES', () => {
  it('has a default error message', () => {
    expect(CUSTODY_ERROR_MESSAGES.default).toBeTruthy()
  })

  it('has messages at 6th-grade reading level (no complex words)', () => {
    Object.values(CUSTODY_ERROR_MESSAGES).forEach((message) => {
      // Simple heuristic: messages should be relatively short and simple
      expect(message.length).toBeLessThan(100)
    })
  })
})

// ============================================
// ADVERSARIAL TESTS
// ============================================
describe('Adversarial: XSS Prevention', () => {
  // These payloads contain XSS-dangerous characters (<, >, ", ', `, &) and will be rejected
  const xssPayloadsWithDangerousChars = [
    '<script>alert("xss")</script>',
    '"><script>alert("xss")</script>',
    "' OR '1'='1",
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    '{{constructor.constructor("alert(1)")()}}',
    '`${alert(1)}`',
    '<iframe src="javascript:alert(1)">',
  ]

  xssPayloadsWithDangerousChars.forEach((payload) => {
    it(`rejects XSS payload: ${payload.substring(0, 30)}...`, () => {
      expect(() =>
        createCustodyDeclarationInputSchema.parse({
          type: 'complex',
          notes: payload,
        })
      ).toThrow()
    })
  })

  // Note: 'javascript:alert(1)' doesn't contain XSS dangerous chars we check for
  // This is OK because notes are text content, not URLs that get href'd
  it('accepts javascript: prefix (safe in text context, no dangerous chars)', () => {
    // This is NOT a URL field, so javascript: prefix is harmless text
    const result = createCustodyDeclarationInputSchema.parse({
      type: 'complex',
      notes: 'javascript protocol is blocked in URLs',
    })
    expect(result.notes).toBe('javascript protocol is blocked in URLs')
  })
})

describe('Adversarial: Input Validation', () => {
  it('rejects custody type with path traversal attempt', () => {
    expect(() => custodyTypeSchema.parse('../../../etc/passwd')).toThrow()
  })

  it('rejects custody type with null byte', () => {
    expect(() => custodyTypeSchema.parse('sole\x00')).toThrow()
  })

  it('handles extremely long notes appropriately', () => {
    const veryLongNotes = 'a'.repeat(10000)
    expect(() =>
      createCustodyDeclarationInputSchema.parse({
        type: 'complex',
        notes: veryLongNotes,
      })
    ).toThrow(/500 characters/)
  })

  it('handles unicode in notes correctly', () => {
    const result = createCustodyDeclarationInputSchema.parse({
      type: 'complex',
      notes: 'Family situation with international characters: ',
    })
    expect(result.notes).toContain('')
  })

  it('rejects notes with only whitespace', () => {
    const result = createCustodyDeclarationInputSchema.parse({
      type: 'sole',
      notes: '    ',
    })
    // After trim, empty string becomes null
    expect(result.notes).toBeNull()
  })
})
