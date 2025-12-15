import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase Admin SDK
const mockUpdate = vi.fn().mockResolvedValue(undefined)
const mockGet = vi.fn()
const mockAdd = vi.fn().mockResolvedValue({ id: 'audit-123' })
const mockDoc = vi.fn().mockReturnValue({
  get: mockGet,
  update: mockUpdate,
})
const mockCollection = vi.fn().mockReturnValue({
  doc: mockDoc,
  add: mockAdd,
})

const mockFileDelete = vi.fn().mockResolvedValue(undefined)
const mockFile = vi.fn().mockReturnValue({
  delete: mockFileDelete,
})
const mockBucket = vi.fn().mockReturnValue({
  file: mockFile,
})

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
  }),
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
}))

vi.mock('firebase-admin/storage', () => ({
  getStorage: () => ({
    bucket: mockBucket,
  }),
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

import { deleteSafetyDocument } from './deleteSafetyDocument'

describe('deleteSafetyDocument Cloud Function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validInput = {
    requestId: 'request-123',
    documentId: '550e8400-e29b-41d4-a716-446655440000',
  }

  const mockRequest = (data: unknown, auth?: { uid: string }) => ({
    data,
    auth,
  })

  const mockDocumentToDelete = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    fileName: 'test.pdf',
    storagePath: 'safetyDocuments/request-123/550e8400_test.pdf',
  }

  const mockExistingSafetyRequest = {
    exists: true,
    data: () => ({
      message: 'Test message',
      submittedBy: 'user-123',
      documents: [mockDocumentToDelete],
    }),
  }

  it('should successfully delete a document for original submitter', async () => {
    mockGet.mockResolvedValueOnce(mockExistingSafetyRequest)

    const result = await (deleteSafetyDocument as Function)(
      mockRequest(validInput, { uid: 'user-123' })
    )

    expect(result).toEqual({ success: true })
    expect(mockFileDelete).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('should reject if safety request does not exist', async () => {
    mockGet.mockResolvedValueOnce({ exists: false })

    await expect(
      (deleteSafetyDocument as Function)(mockRequest(validInput))
    ).rejects.toThrow('Safety request not found')
  })

  it('should reject if document does not exist', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        documents: [{ id: 'different-id' }],
      }),
    })

    await expect(
      (deleteSafetyDocument as Function)(mockRequest(validInput))
    ).rejects.toThrow('Document not found')
  })

  it('should reject if non-owner tries to delete (not safety team)', async () => {
    mockGet.mockResolvedValueOnce(mockExistingSafetyRequest)
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ roles: [] }), // Not safety team
    })

    await expect(
      (deleteSafetyDocument as Function)(
        mockRequest(validInput, { uid: 'different-user' })
      )
    ).rejects.toThrow('permission')
  })

  it('should allow safety team to delete any document', async () => {
    mockGet.mockResolvedValueOnce(mockExistingSafetyRequest)
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ roles: ['safety-team'] }),
    })

    const result = await (deleteSafetyDocument as Function)(
      mockRequest(validInput, { uid: 'safety-agent' })
    )

    expect(result).toEqual({ success: true })
  })

  it('should allow admin to delete any document', async () => {
    mockGet.mockResolvedValueOnce(mockExistingSafetyRequest)
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ roles: ['admin'] }),
    })

    const result = await (deleteSafetyDocument as Function)(
      mockRequest(validInput, { uid: 'admin-user' })
    )

    expect(result).toEqual({ success: true })
  })

  it('should work for anonymous requests on anonymous submissions', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        // No submittedBy - anonymous submission
        documents: [mockDocumentToDelete],
      }),
    })

    const result = await (deleteSafetyDocument as Function)(
      mockRequest(validInput) // No auth
    )

    expect(result).toEqual({ success: true })
  })

  it('should log to admin audit log', async () => {
    mockGet.mockResolvedValueOnce(mockExistingSafetyRequest)

    await (deleteSafetyDocument as Function)(
      mockRequest(validInput, { uid: 'user-123' })
    )

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'safety_document_deleted',
        resourceType: 'safetyDocument',
      })
    )
  })

  it('should continue if storage file already deleted', async () => {
    mockGet.mockResolvedValueOnce(mockExistingSafetyRequest)
    mockFileDelete.mockRejectedValueOnce(new Error('File not found'))

    // Should not throw - should continue with Firestore cleanup
    const result = await (deleteSafetyDocument as Function)(
      mockRequest(validInput, { uid: 'user-123' })
    )

    expect(result).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('should remove document from array correctly', async () => {
    const multipleDocuments = [
      { id: 'doc-1', fileName: 'one.pdf' },
      mockDocumentToDelete,
      { id: 'doc-3', fileName: 'three.pdf' },
    ]

    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        submittedBy: 'user-123',
        documents: multipleDocuments,
      }),
    })

    await (deleteSafetyDocument as Function)(
      mockRequest(validInput, { uid: 'user-123' })
    )

    expect(mockUpdate).toHaveBeenCalledWith({
      documents: [
        { id: 'doc-1', fileName: 'one.pdf' },
        { id: 'doc-3', fileName: 'three.pdf' },
      ],
    })
  })

  // CRITICAL: Security tests
  describe('Security - No Family Audit Trail', () => {
    it('should NEVER log to family audit trail', async () => {
      mockGet.mockResolvedValueOnce(mockExistingSafetyRequest)

      await (deleteSafetyDocument as Function)(
        mockRequest(validInput, { uid: 'user-123' })
      )

      // Verify no calls to children or family audit collections
      const collectionCalls = mockCollection.mock.calls.map(
        (call) => call[0]
      )
      expect(collectionCalls).not.toContain('children')
      expect(
        collectionCalls.some((c: string) => c.includes('auditLog') && !c.includes('admin'))
      ).toBe(false)
    })

    it('should only log to adminAuditLog', async () => {
      mockGet.mockResolvedValueOnce(mockExistingSafetyRequest)

      await (deleteSafetyDocument as Function)(
        mockRequest(validInput, { uid: 'user-123' })
      )

      expect(mockCollection).toHaveBeenCalledWith('adminAuditLog')
    })
  })
})
