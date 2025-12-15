import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase Admin SDK
const mockSet = vi.fn().mockResolvedValue(undefined)
const mockUpdate = vi.fn().mockResolvedValue(undefined)
const mockGet = vi.fn()
const mockAdd = vi.fn().mockResolvedValue({ id: 'audit-123' })
const mockDoc = vi.fn().mockReturnValue({
  get: mockGet,
  set: mockSet,
  update: mockUpdate,
})
const mockCollection = vi.fn().mockReturnValue({
  doc: mockDoc,
  add: mockAdd,
})

const mockFileSave = vi.fn().mockResolvedValue(undefined)
const mockFile = vi.fn().mockReturnValue({
  save: mockFileSave,
})
const mockBucket = vi.fn().mockReturnValue({
  file: mockFile,
})

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
  }),
  Timestamp: {
    now: () => ({ toDate: () => new Date() }),
    fromDate: (date: Date) => ({ toDate: () => date }),
  },
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
    arrayUnion: (item: unknown) => ({ _arrayUnion: item }),
  },
}))

vi.mock('firebase-admin/storage', () => ({
  getStorage: () => ({
    bucket: mockBucket,
  }),
}))

vi.mock('crypto', () => ({
  randomUUID: () => '550e8400-e29b-41d4-a716-446655440000',
}))

// Mock the onCall wrapper to just return the handler
vi.mock('firebase-functions/v2/https', () => ({
  onCall: (_config: unknown, handler: unknown) => handler,
  HttpsError: class HttpsError extends Error {
    code: string
    details?: unknown
    constructor(code: string, message: string, details?: unknown) {
      super(message)
      this.code = code
      this.details = details
    }
  },
}))

import { uploadSafetyDocument } from './uploadSafetyDocument'

describe('uploadSafetyDocument Cloud Function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validInput = {
    requestId: 'request-123',
    fileName: 'protection-order.pdf',
    fileType: 'application/pdf',
    sizeBytes: 1024,
    fileContent: Buffer.from('test content').toString('base64'),
  }

  const mockRequest = (data: unknown, auth?: { uid: string }) => ({
    data,
    auth,
  })

  const mockExistingSafetyRequest = {
    exists: true,
    data: () => ({
      message: 'Test message',
      documents: [],
    }),
  }

  it('should successfully upload a document', async () => {
    mockGet.mockResolvedValueOnce(mockExistingSafetyRequest)

    const result = await (uploadSafetyDocument as Function)(
      mockRequest(validInput, { uid: 'user-123' })
    )

    expect(result).toEqual({
      success: true,
      documentId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(mockFileSave).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('should reject invalid file types', async () => {
    const invalidInput = {
      ...validInput,
      fileType: 'application/javascript',
    }

    await expect(
      (uploadSafetyDocument as Function)(mockRequest(invalidInput))
    ).rejects.toThrow('Invalid upload data')
  })

  it('should reject oversized files', async () => {
    const oversizedInput = {
      ...validInput,
      sizeBytes: 26 * 1024 * 1024, // 26MB
    }

    await expect(
      (uploadSafetyDocument as Function)(mockRequest(oversizedInput))
    ).rejects.toThrow('Invalid upload data')
  })

  it('should reject if safety request does not exist', async () => {
    mockGet.mockResolvedValueOnce({ exists: false })

    await expect(
      (uploadSafetyDocument as Function)(mockRequest(validInput))
    ).rejects.toThrow('Safety request not found')
  })

  it('should reject if maximum documents reached', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        message: 'Test',
        documents: [
          { id: '1' },
          { id: '2' },
          { id: '3' },
          { id: '4' },
          { id: '5' },
        ],
      }),
    })

    await expect(
      (uploadSafetyDocument as Function)(mockRequest(validInput))
    ).rejects.toThrow('Maximum 5 documents allowed')
  })

  it('should work for anonymous users', async () => {
    mockGet.mockResolvedValueOnce(mockExistingSafetyRequest)

    const result = await (uploadSafetyDocument as Function)(
      mockRequest(validInput) // No auth
    )

    expect(result.success).toBe(true)
  })

  it('should log to admin audit log', async () => {
    mockGet.mockResolvedValueOnce(mockExistingSafetyRequest)

    await (uploadSafetyDocument as Function)(
      mockRequest(validInput, { uid: 'user-123' })
    )

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'safety_document_uploaded',
        resourceType: 'safetyDocument',
      })
    )
  })

  it('should sanitize file names', async () => {
    mockGet.mockResolvedValueOnce(mockExistingSafetyRequest)

    const inputWithSpecialChars = {
      ...validInput,
      fileName: 'test file<script>.pdf',
    }

    await (uploadSafetyDocument as Function)(
      mockRequest(inputWithSpecialChars)
    )

    expect(mockFile).toHaveBeenCalledWith(
      expect.stringContaining('test_file_script_.pdf')
    )
  })

  it('should set retention policy on first document', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        message: 'Test',
        documents: [],
        // No retentionPolicy
      }),
    })

    await (uploadSafetyDocument as Function)(mockRequest(validInput))

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        retentionPolicy: expect.objectContaining({
          years: 7,
        }),
      })
    )
  })

  // CRITICAL: Security tests
  describe('Security - No Family Audit Trail', () => {
    it('should NEVER log to family audit trail', async () => {
      mockGet.mockResolvedValueOnce(mockExistingSafetyRequest)

      await (uploadSafetyDocument as Function)(mockRequest(validInput))

      // Verify no calls to children or family audit collections
      const collectionCalls = mockCollection.mock.calls.map(
        (call) => call[0]
      )
      expect(collectionCalls).not.toContain('children')
      expect(
        collectionCalls.some((c: string) => c.includes('auditLog'))
      ).toBe(false)
    })

    it('should only log to adminAuditLog', async () => {
      mockGet.mockResolvedValueOnce(mockExistingSafetyRequest)

      await (uploadSafetyDocument as Function)(mockRequest(validInput))

      expect(mockCollection).toHaveBeenCalledWith('adminAuditLog')
    })
  })
})
