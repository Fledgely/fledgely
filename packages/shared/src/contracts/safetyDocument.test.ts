/**
 * Unit tests for Safety Document schemas.
 *
 * Story 0.5.2: Safety Request Documentation Upload
 *
 * Tests schema validation for safety document upload,
 * ensuring proper data structure for the document storage feature.
 */

import { describe, it, expect } from 'vitest'
import {
  safetyDocumentMimeTypeSchema,
  safetyDocumentSchema,
  safetyDocumentUploadInputSchema,
  safetyDocumentUploadResponseSchema,
  safetyDocumentDeleteInputSchema,
  safetyDocumentDeleteResponseSchema,
  SAFETY_DOCUMENT_MAX_SIZE_BYTES,
  SAFETY_DOCUMENT_MAX_TOTAL_SIZE_BYTES,
  SAFETY_DOCUMENT_RETENTION_YEARS,
} from './index'

describe('safetyDocumentMimeTypeSchema', () => {
  it('accepts application/pdf', () => {
    const result = safetyDocumentMimeTypeSchema.safeParse('application/pdf')
    expect(result.success).toBe(true)
  })

  it('accepts image/jpeg', () => {
    const result = safetyDocumentMimeTypeSchema.safeParse('image/jpeg')
    expect(result.success).toBe(true)
  })

  it('accepts image/png', () => {
    const result = safetyDocumentMimeTypeSchema.safeParse('image/png')
    expect(result.success).toBe(true)
  })

  it('accepts application/msword', () => {
    const result = safetyDocumentMimeTypeSchema.safeParse('application/msword')
    expect(result.success).toBe(true)
  })

  it('accepts application/vnd.openxmlformats-officedocument.wordprocessingml.document', () => {
    const result = safetyDocumentMimeTypeSchema.safeParse(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    expect(result.success).toBe(true)
  })

  it('rejects invalid mime types', () => {
    const result = safetyDocumentMimeTypeSchema.safeParse('application/zip')
    expect(result.success).toBe(false)
  })

  it('rejects empty string', () => {
    const result = safetyDocumentMimeTypeSchema.safeParse('')
    expect(result.success).toBe(false)
  })
})

describe('safetyDocumentSchema', () => {
  const validDocument = {
    id: 'doc-123',
    ticketId: 'ticket-456',
    filename: 'uuid_document.pdf',
    originalFilename: 'protection_order.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024 * 1024, // 1MB
    storagePath: 'safetyDocuments/ticket-456/uuid_document.pdf',
    uploadedAt: new Date(),
    retentionUntil: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000),
    legalHold: false,
    markedForDeletion: false,
    userId: 'user-789',
  }

  it('accepts valid safety document', () => {
    const result = safetyDocumentSchema.safeParse(validDocument)
    expect(result.success).toBe(true)
  })

  it('accepts document with null userId (unauthenticated upload)', () => {
    const result = safetyDocumentSchema.safeParse({
      ...validDocument,
      userId: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts document with legalHold true', () => {
    const result = safetyDocumentSchema.safeParse({
      ...validDocument,
      legalHold: true,
    })
    expect(result.success).toBe(true)
  })

  it('accepts document with markedForDeletion true', () => {
    const result = safetyDocumentSchema.safeParse({
      ...validDocument,
      markedForDeletion: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects document without id', () => {
    const { id: _id, ...docWithoutId } = validDocument
    const result = safetyDocumentSchema.safeParse(docWithoutId)
    expect(result.success).toBe(false)
  })

  it('rejects document without ticketId', () => {
    const { ticketId: _ticketId, ...docWithoutTicketId } = validDocument
    const result = safetyDocumentSchema.safeParse(docWithoutTicketId)
    expect(result.success).toBe(false)
  })

  it('rejects document with invalid mimeType', () => {
    const result = safetyDocumentSchema.safeParse({
      ...validDocument,
      mimeType: 'application/zip',
    })
    expect(result.success).toBe(false)
  })

  it('rejects document with size exceeding max', () => {
    const result = safetyDocumentSchema.safeParse({
      ...validDocument,
      sizeBytes: SAFETY_DOCUMENT_MAX_SIZE_BYTES + 1,
    })
    expect(result.success).toBe(false)
  })

  it('accepts document at maximum size', () => {
    const result = safetyDocumentSchema.safeParse({
      ...validDocument,
      sizeBytes: SAFETY_DOCUMENT_MAX_SIZE_BYTES,
    })
    expect(result.success).toBe(true)
  })

  it('rejects document with filename exceeding 255 chars', () => {
    const result = safetyDocumentSchema.safeParse({
      ...validDocument,
      filename: 'a'.repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it('accepts document with filename at 255 chars', () => {
    const result = safetyDocumentSchema.safeParse({
      ...validDocument,
      filename: 'a'.repeat(255),
    })
    expect(result.success).toBe(true)
  })
})

describe('safetyDocumentUploadInputSchema', () => {
  const validInput = {
    ticketId: 'ticket-123',
    filename: 'document.pdf',
    fileData: 'base64encodeddata',
    mimeType: 'application/pdf',
  }

  it('accepts valid upload input', () => {
    const result = safetyDocumentUploadInputSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('accepts input with image/jpeg', () => {
    const result = safetyDocumentUploadInputSchema.safeParse({
      ...validInput,
      filename: 'photo.jpg',
      mimeType: 'image/jpeg',
    })
    expect(result.success).toBe(true)
  })

  it('accepts input with image/png', () => {
    const result = safetyDocumentUploadInputSchema.safeParse({
      ...validInput,
      filename: 'scan.png',
      mimeType: 'image/png',
    })
    expect(result.success).toBe(true)
  })

  it('accepts input with docx', () => {
    const result = safetyDocumentUploadInputSchema.safeParse({
      ...validInput,
      filename: 'document.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    expect(result.success).toBe(true)
  })

  it('rejects input without ticketId', () => {
    const { ticketId: _ticketId, ...inputWithoutTicketId } = validInput
    const result = safetyDocumentUploadInputSchema.safeParse(inputWithoutTicketId)
    expect(result.success).toBe(false)
  })

  it('rejects input with empty ticketId', () => {
    const result = safetyDocumentUploadInputSchema.safeParse({
      ...validInput,
      ticketId: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects input without filename', () => {
    const { filename: _filename, ...inputWithoutFilename } = validInput
    const result = safetyDocumentUploadInputSchema.safeParse(inputWithoutFilename)
    expect(result.success).toBe(false)
  })

  it('rejects input with empty filename', () => {
    const result = safetyDocumentUploadInputSchema.safeParse({
      ...validInput,
      filename: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects input with invalid mimeType', () => {
    const result = safetyDocumentUploadInputSchema.safeParse({
      ...validInput,
      mimeType: 'application/zip',
    })
    expect(result.success).toBe(false)
  })
})

describe('safetyDocumentUploadResponseSchema', () => {
  it('accepts valid success response', () => {
    const result = safetyDocumentUploadResponseSchema.safeParse({
      success: true,
      documentId: 'doc-123',
      message: 'File uploaded successfully.',
    })
    expect(result.success).toBe(true)
  })

  it('accepts success response without documentId', () => {
    const result = safetyDocumentUploadResponseSchema.safeParse({
      success: true,
      message: 'File uploaded successfully.',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid failure response', () => {
    const result = safetyDocumentUploadResponseSchema.safeParse({
      success: false,
      message: 'Unable to upload file.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects response without success field', () => {
    const result = safetyDocumentUploadResponseSchema.safeParse({
      message: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects response without message field', () => {
    const result = safetyDocumentUploadResponseSchema.safeParse({
      success: true,
    })
    expect(result.success).toBe(false)
  })
})

describe('safetyDocumentDeleteInputSchema', () => {
  it('accepts valid delete input', () => {
    const result = safetyDocumentDeleteInputSchema.safeParse({
      documentId: 'doc-123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects input without documentId', () => {
    const result = safetyDocumentDeleteInputSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects input with empty documentId', () => {
    const result = safetyDocumentDeleteInputSchema.safeParse({
      documentId: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('safetyDocumentDeleteResponseSchema', () => {
  it('accepts valid success response', () => {
    const result = safetyDocumentDeleteResponseSchema.safeParse({
      success: true,
      message: 'File deleted successfully.',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid failure response', () => {
    const result = safetyDocumentDeleteResponseSchema.safeParse({
      success: false,
      message: 'Unable to delete file.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects response without success field', () => {
    const result = safetyDocumentDeleteResponseSchema.safeParse({
      message: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects response without message field', () => {
    const result = safetyDocumentDeleteResponseSchema.safeParse({
      success: true,
    })
    expect(result.success).toBe(false)
  })
})

describe('Safety document constants', () => {
  it('has max file size of 25MB', () => {
    expect(SAFETY_DOCUMENT_MAX_SIZE_BYTES).toBe(25 * 1024 * 1024)
  })

  it('has max total size of 100MB', () => {
    expect(SAFETY_DOCUMENT_MAX_TOTAL_SIZE_BYTES).toBe(100 * 1024 * 1024)
  })

  it('has retention period of 7 years', () => {
    expect(SAFETY_DOCUMENT_RETENTION_YEARS).toBe(7)
  })
})
