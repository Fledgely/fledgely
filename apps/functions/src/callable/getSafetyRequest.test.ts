import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'

// Mock request data
const mockRequestData = {
  message: 'I need help escaping a dangerous situation',
  safeEmail: 'safe@example.com',
  safePhone: '+1234567890',
  submittedBy: 'user123',
  submittedAt: { toDate: () => new Date() },
  source: 'settings',
  status: 'pending',
  assignedTo: null,
  documents: [
    {
      id: 'doc-1',
      fileName: 'evidence.pdf',
      fileType: 'application/pdf',
      storagePath: 'safety-documents/user123/doc-1.pdf',
      uploadedAt: { toDate: () => new Date() },
      sizeBytes: 1024,
    },
  ],
  verificationChecklist: {
    phoneVerified: false,
    idMatched: false,
    accountOwnershipVerified: false,
    safeContactConfirmed: false,
  },
  adminNotes: [],
  escalation: { isEscalated: false },
}

vi.mock('firebase-admin/firestore', () => {
  const mockGet = vi.fn().mockResolvedValue({
    exists: true,
    id: 'request-123',
    data: () => mockRequestData,
  })

  const mockAdd = vi.fn().mockResolvedValue({ id: 'audit-log-id' })

  const mockCollection = vi.fn().mockImplementation((name: string) => {
    if (name === 'safetyRequests') {
      return {
        doc: vi.fn().mockReturnValue({ get: mockGet }),
      }
    }
    if (name === 'adminAuditLog') {
      return { add: mockAdd }
    }
    return { doc: vi.fn(), add: vi.fn() }
  })

  return {
    getFirestore: vi.fn().mockReturnValue({
      collection: mockCollection,
    }),
    FieldValue: {
      serverTimestamp: vi.fn().mockReturnValue('SERVER_TIMESTAMP'),
    },
  }
})

vi.mock('firebase-admin/storage', () => {
  const mockGetSignedUrl = vi.fn().mockResolvedValue([
    'https://storage.example.com/signed-url?token=abc123',
  ])

  const mockFile = vi.fn().mockReturnValue({
    getSignedUrl: mockGetSignedUrl,
  })

  const mockBucket = vi.fn().mockReturnValue({
    file: mockFile,
  })

  return {
    getStorage: vi.fn().mockReturnValue({
      bucket: mockBucket,
    }),
  }
})

vi.mock('firebase-functions/v2/https', () => ({
  onCall: vi.fn((_config, handler) => handler),
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string,
      public details?: unknown
    ) {
      super(message)
    }
  },
}))

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
}))

import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

type CallableFunction = (request: {
  data: Record<string, unknown>
  auth?: { uid: string; token: Record<string, unknown> }
}) => Promise<unknown>

describe('getSafetyRequest Cloud Function', () => {
  let mockDb: ReturnType<typeof getFirestore>
  let mockStorage: ReturnType<typeof getStorage>

  beforeAll(() => {
    mockDb = getFirestore()
    mockStorage = getStorage()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('authentication and authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const { getSafetyRequest } = await import('./getSafetyRequest')

      const request = {
        data: { requestId: 'request-123' },
        auth: undefined,
      }

      await expect(
        (getSafetyRequest as CallableFunction)(request)
      ).rejects.toThrow('Authentication required')
    })

    it('should reject users without safety-team role', async () => {
      const { getSafetyRequest } = await import('./getSafetyRequest')

      const request = {
        data: { requestId: 'request-123' },
        auth: {
          uid: 'regular-user',
          token: { isSafetyTeam: false, isAdmin: false },
        },
      }

      await expect(
        (getSafetyRequest as CallableFunction)(request)
      ).rejects.toThrow('Safety team access required')
    })

    it('should allow safety-team users', async () => {
      const { getSafetyRequest } = await import('./getSafetyRequest')

      const request = {
        data: { requestId: 'request-123' },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true, isAdmin: false },
        },
      }

      const result = await (getSafetyRequest as CallableFunction)(request)

      expect(result).toHaveProperty('success', true)
      expect(result).toHaveProperty('request')
    })
  })

  describe('document signed URLs', () => {
    it('should generate signed URLs for documents', async () => {
      const { getSafetyRequest } = await import('./getSafetyRequest')

      const request = {
        data: { requestId: 'request-123', includeDocumentUrls: true },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      const result = (await (getSafetyRequest as CallableFunction)(
        request
      )) as { request: { documents: Array<{ signedUrl: string }> } }

      expect(result.request.documents[0].signedUrl).toContain('signed-url')
      expect(mockStorage.bucket().file).toHaveBeenCalledWith(
        'safety-documents/user123/doc-1.pdf'
      )
    })

    it('should skip signed URLs when includeDocumentUrls is false', async () => {
      const { getSafetyRequest } = await import('./getSafetyRequest')

      const request = {
        data: { requestId: 'request-123', includeDocumentUrls: false },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (getSafetyRequest as CallableFunction)(request)

      // Storage should not have been called for signed URLs
      expect(mockStorage.bucket().file().getSignedUrl).not.toHaveBeenCalled()
    })
  })

  describe('request not found', () => {
    it('should return not-found error for missing request', async () => {
      // Override mock to return non-existent document
      vi.mocked(mockDb.collection('safetyRequests').doc('').get).mockResolvedValueOnce({
        exists: false,
        id: 'missing-id',
        data: () => null,
      } as never)

      const { getSafetyRequest } = await import('./getSafetyRequest')

      const request = {
        data: { requestId: 'non-existent' },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await expect(
        (getSafetyRequest as CallableFunction)(request)
      ).rejects.toThrow('Safety request not found')
    })
  })

  describe('response data', () => {
    it('should return full request details', async () => {
      const { getSafetyRequest } = await import('./getSafetyRequest')

      const request = {
        data: { requestId: 'request-123' },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      const result = (await (getSafetyRequest as CallableFunction)(
        request
      )) as {
        request: {
          message: string
          safeEmail: string
          safePhone: string
          verificationChecklist: Record<string, boolean>
          escalation: Record<string, boolean>
        }
      }

      expect(result.request.message).toBe(mockRequestData.message)
      expect(result.request.safeEmail).toBe(mockRequestData.safeEmail)
      expect(result.request.safePhone).toBe(mockRequestData.safePhone)
      expect(result.request.verificationChecklist).toEqual(
        mockRequestData.verificationChecklist
      )
      expect(result.request.escalation).toEqual(mockRequestData.escalation)
    })
  })

  describe('audit logging', () => {
    it('should log view access to audit log', async () => {
      const { getSafetyRequest } = await import('./getSafetyRequest')

      const request = {
        data: { requestId: 'request-123' },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (getSafetyRequest as CallableFunction)(request)

      expect(mockDb.collection).toHaveBeenCalledWith('adminAuditLog')
    })
  })

  describe('CRITICAL: safety isolation tests', () => {
    it('should ONLY access safetyRequests and adminAuditLog collections', async () => {
      const { getSafetyRequest } = await import('./getSafetyRequest')

      const request = {
        data: { requestId: 'request-123' },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (getSafetyRequest as CallableFunction)(request)

      const collectionCalls = (
        mockDb.collection as ReturnType<typeof vi.fn>
      ).mock.calls.flat()

      // Should only access allowed collections
      expect(collectionCalls).toContain('safetyRequests')
      expect(collectionCalls).toContain('adminAuditLog')

      // Should NEVER access family-related collections
      expect(collectionCalls).not.toContain('children')
      expect(collectionCalls).not.toContain('families')
      expect(collectionCalls).not.toContain('auditLog')
    })
  })
})
