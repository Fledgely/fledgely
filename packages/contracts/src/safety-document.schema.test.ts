import { describe, it, expect } from 'vitest'
import {
  safetyDocumentSchema,
  retentionPolicySchema,
  uploadSafetyDocumentInputSchema,
  deleteSafetyDocumentInputSchema,
  isAllowedFileType,
  isValidFileSize,
  calculateRetentionExpiration,
  MAX_DOCUMENTS_PER_REQUEST,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_FILE_EXTENSIONS,
  DEFAULT_RETENTION_YEARS,
} from './safety-document.schema'

describe('Safety Document Schema Constants', () => {
  it('should have correct maximum documents per request', () => {
    expect(MAX_DOCUMENTS_PER_REQUEST).toBe(5)
  })

  it('should have correct maximum file size (25MB)', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(25 * 1024 * 1024)
  })

  it('should have correct default retention years', () => {
    expect(DEFAULT_RETENTION_YEARS).toBe(7)
  })

  it('should support expected document types', () => {
    expect(ALLOWED_DOCUMENT_TYPES).toContain('application/pdf')
    expect(ALLOWED_DOCUMENT_TYPES).toContain('image/jpeg')
    expect(ALLOWED_DOCUMENT_TYPES).toContain('image/png')
    expect(ALLOWED_DOCUMENT_TYPES).toContain('image/gif')
    expect(ALLOWED_DOCUMENT_TYPES).toContain('image/webp')
    expect(ALLOWED_DOCUMENT_TYPES).toContain('image/heic')
    expect(ALLOWED_DOCUMENT_TYPES).toContain('application/msword')
    expect(ALLOWED_DOCUMENT_TYPES).toContain(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  })

  it('should have matching file extensions', () => {
    expect(ALLOWED_FILE_EXTENSIONS).toContain('.pdf')
    expect(ALLOWED_FILE_EXTENSIONS).toContain('.jpg')
    expect(ALLOWED_FILE_EXTENSIONS).toContain('.jpeg')
    expect(ALLOWED_FILE_EXTENSIONS).toContain('.png')
    expect(ALLOWED_FILE_EXTENSIONS).toContain('.doc')
    expect(ALLOWED_FILE_EXTENSIONS).toContain('.docx')
  })
})

describe('safetyDocumentSchema', () => {
  const validDocument = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    fileName: 'protection-order.pdf',
    fileType: 'application/pdf' as const,
    storagePath: 'safetyDocuments/request123/550e8400-e29b-41d4-a716-446655440000_protection-order.pdf',
    uploadedAt: new Date(),
    sizeBytes: 1024 * 1024, // 1MB
  }

  it('should accept valid document metadata', () => {
    const result = safetyDocumentSchema.safeParse(validDocument)
    expect(result.success).toBe(true)
  })

  it('should require valid UUID for id', () => {
    const result = safetyDocumentSchema.safeParse({
      ...validDocument,
      id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('should require non-empty fileName', () => {
    const result = safetyDocumentSchema.safeParse({
      ...validDocument,
      fileName: '',
    })
    expect(result.success).toBe(false)
  })

  it('should reject fileName exceeding 255 characters', () => {
    const result = safetyDocumentSchema.safeParse({
      ...validDocument,
      fileName: 'a'.repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it('should only accept allowed file types', () => {
    const validTypes = ALLOWED_DOCUMENT_TYPES
    for (const type of validTypes) {
      const result = safetyDocumentSchema.safeParse({
        ...validDocument,
        fileType: type,
      })
      expect(result.success).toBe(true)
    }

    const invalidResult = safetyDocumentSchema.safeParse({
      ...validDocument,
      fileType: 'application/javascript',
    })
    expect(invalidResult.success).toBe(false)
  })

  it('should require non-empty storagePath', () => {
    const result = safetyDocumentSchema.safeParse({
      ...validDocument,
      storagePath: '',
    })
    expect(result.success).toBe(false)
  })

  it('should require positive sizeBytes', () => {
    const zeroResult = safetyDocumentSchema.safeParse({
      ...validDocument,
      sizeBytes: 0,
    })
    expect(zeroResult.success).toBe(false)

    const negativeResult = safetyDocumentSchema.safeParse({
      ...validDocument,
      sizeBytes: -100,
    })
    expect(negativeResult.success).toBe(false)
  })

  it('should reject files exceeding MAX_FILE_SIZE_BYTES', () => {
    const result = safetyDocumentSchema.safeParse({
      ...validDocument,
      sizeBytes: MAX_FILE_SIZE_BYTES + 1,
    })
    expect(result.success).toBe(false)
  })

  it('should accept files at exactly MAX_FILE_SIZE_BYTES', () => {
    const result = safetyDocumentSchema.safeParse({
      ...validDocument,
      sizeBytes: MAX_FILE_SIZE_BYTES,
    })
    expect(result.success).toBe(true)
  })
})

describe('retentionPolicySchema', () => {
  it('should accept valid retention policy', () => {
    const result = retentionPolicySchema.safeParse({
      years: 7,
      expiresAt: new Date('2032-01-01'),
    })
    expect(result.success).toBe(true)
  })

  it('should require positive years', () => {
    const zeroResult = retentionPolicySchema.safeParse({
      years: 0,
      expiresAt: new Date(),
    })
    expect(zeroResult.success).toBe(false)

    const negativeResult = retentionPolicySchema.safeParse({
      years: -1,
      expiresAt: new Date(),
    })
    expect(negativeResult.success).toBe(false)
  })

  it('should require expiresAt date', () => {
    const result = retentionPolicySchema.safeParse({
      years: 7,
    })
    expect(result.success).toBe(false)
  })
})

describe('uploadSafetyDocumentInputSchema', () => {
  const validInput = {
    requestId: 'request-123',
    fileName: 'document.pdf',
    fileType: 'application/pdf' as const,
    sizeBytes: 1024,
    fileContent: 'base64encodedcontent',
  }

  it('should accept valid upload input', () => {
    const result = uploadSafetyDocumentInputSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('should require requestId', () => {
    const result = uploadSafetyDocumentInputSchema.safeParse({
      ...validInput,
      requestId: '',
    })
    expect(result.success).toBe(false)
  })

  it('should require fileName', () => {
    const result = uploadSafetyDocumentInputSchema.safeParse({
      ...validInput,
      fileName: '',
    })
    expect(result.success).toBe(false)
  })

  it('should validate fileType', () => {
    const invalidResult = uploadSafetyDocumentInputSchema.safeParse({
      ...validInput,
      fileType: 'text/html',
    })
    expect(invalidResult.success).toBe(false)
  })

  it('should reject oversized files', () => {
    const result = uploadSafetyDocumentInputSchema.safeParse({
      ...validInput,
      sizeBytes: MAX_FILE_SIZE_BYTES + 1,
    })
    expect(result.success).toBe(false)
  })

  it('should require fileContent', () => {
    const result = uploadSafetyDocumentInputSchema.safeParse({
      ...validInput,
      fileContent: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('deleteSafetyDocumentInputSchema', () => {
  it('should accept valid delete input', () => {
    const result = deleteSafetyDocumentInputSchema.safeParse({
      requestId: 'request-123',
      documentId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('should require requestId', () => {
    const result = deleteSafetyDocumentInputSchema.safeParse({
      requestId: '',
      documentId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(false)
  })

  it('should require valid UUID for documentId', () => {
    const result = deleteSafetyDocumentInputSchema.safeParse({
      requestId: 'request-123',
      documentId: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })
})

describe('Helper Functions', () => {
  describe('isAllowedFileType', () => {
    it('should return true for allowed types', () => {
      expect(isAllowedFileType('application/pdf')).toBe(true)
      expect(isAllowedFileType('image/jpeg')).toBe(true)
      expect(isAllowedFileType('image/png')).toBe(true)
    })

    it('should return false for disallowed types', () => {
      expect(isAllowedFileType('application/javascript')).toBe(false)
      expect(isAllowedFileType('text/html')).toBe(false)
      expect(isAllowedFileType('application/x-executable')).toBe(false)
    })
  })

  describe('isValidFileSize', () => {
    it('should return true for valid sizes', () => {
      expect(isValidFileSize(1)).toBe(true)
      expect(isValidFileSize(1024 * 1024)).toBe(true) // 1MB
      expect(isValidFileSize(MAX_FILE_SIZE_BYTES)).toBe(true) // Exactly 25MB
    })

    it('should return false for invalid sizes', () => {
      expect(isValidFileSize(0)).toBe(false)
      expect(isValidFileSize(-1)).toBe(false)
      expect(isValidFileSize(MAX_FILE_SIZE_BYTES + 1)).toBe(false)
    })
  })

  describe('calculateRetentionExpiration', () => {
    it('should calculate expiration date correctly', () => {
      const now = new Date()
      const expiration = calculateRetentionExpiration(7)

      // Should be approximately 7 years from now
      const expectedYear = now.getFullYear() + 7
      expect(expiration.getFullYear()).toBe(expectedYear)
    })

    it('should use default retention years when not specified', () => {
      const now = new Date()
      const expiration = calculateRetentionExpiration()

      const expectedYear = now.getFullYear() + DEFAULT_RETENTION_YEARS
      expect(expiration.getFullYear()).toBe(expectedYear)
    })

    it('should handle custom retention periods', () => {
      const now = new Date()
      const expiration = calculateRetentionExpiration(10)

      const expectedYear = now.getFullYear() + 10
      expect(expiration.getFullYear()).toBe(expectedYear)
    })
  })
})

describe('Security Considerations', () => {
  it('should not allow executable file types', () => {
    const executableTypes = [
      'application/x-executable',
      'application/x-msdownload',
      'application/x-sh',
      'text/javascript',
      'application/javascript',
    ]

    for (const type of executableTypes) {
      expect(isAllowedFileType(type)).toBe(false)
    }
  })

  it('should support common legal document formats', () => {
    // PDF - most common for legal documents
    expect(isAllowedFileType('application/pdf')).toBe(true)

    // Images - for scanned documents
    expect(isAllowedFileType('image/jpeg')).toBe(true)
    expect(isAllowedFileType('image/png')).toBe(true)

    // Word documents - for typed documents
    expect(isAllowedFileType('application/msword')).toBe(true)
    expect(isAllowedFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true)
  })
})
