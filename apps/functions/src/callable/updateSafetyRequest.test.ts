import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'

// Mock request data
const mockRequestData = {
  message: 'I need help escaping',
  safeEmail: 'safe@example.com',
  status: 'pending',
  assignedTo: null,
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

  const mockUpdate = vi.fn().mockResolvedValue(undefined)
  const mockAdd = vi.fn().mockResolvedValue({ id: 'audit-log-id' })

  const mockCollection = vi.fn().mockImplementation((name: string) => {
    if (name === 'safetyRequests') {
      return {
        doc: vi.fn().mockReturnValue({
          get: mockGet,
          update: mockUpdate,
        }),
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
      arrayUnion: vi.fn((item) => ({ _arrayUnion: item })),
    },
    Timestamp: {
      now: vi.fn().mockReturnValue({ seconds: Date.now() / 1000, nanoseconds: 0 }),
    },
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

type CallableFunction = (request: {
  data: Record<string, unknown>
  auth?: { uid: string; token: Record<string, unknown> }
}) => Promise<unknown>

describe('updateSafetyRequest Cloud Function', () => {
  let mockDb: ReturnType<typeof getFirestore>

  beforeAll(() => {
    mockDb = getFirestore()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('authentication and authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const { updateSafetyRequest } = await import('./updateSafetyRequest')

      const request = {
        data: { requestId: 'request-123', updateType: 'status', status: 'in-progress' },
        auth: undefined,
      }

      await expect(
        (updateSafetyRequest as CallableFunction)(request)
      ).rejects.toThrow('Authentication required')
    })

    it('should reject users without safety-team role', async () => {
      const { updateSafetyRequest } = await import('./updateSafetyRequest')

      const request = {
        data: { requestId: 'request-123', updateType: 'status', status: 'in-progress' },
        auth: {
          uid: 'regular-user',
          token: { isSafetyTeam: false, isAdmin: false },
        },
      }

      await expect(
        (updateSafetyRequest as CallableFunction)(request)
      ).rejects.toThrow('Safety team access required')
    })

    it('should allow safety-team users', async () => {
      const { updateSafetyRequest } = await import('./updateSafetyRequest')

      const request = {
        data: { requestId: 'request-123', updateType: 'status', status: 'in-progress' },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true, isAdmin: false },
        },
      }

      const result = await (updateSafetyRequest as CallableFunction)(request)

      expect(result).toHaveProperty('success', true)
    })
  })

  describe('status updates', () => {
    it('should update status', async () => {
      const { updateSafetyRequest } = await import('./updateSafetyRequest')

      const request = {
        data: {
          requestId: 'request-123',
          updateType: 'status',
          status: 'in-progress',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      const result = await (updateSafetyRequest as CallableFunction)(request)

      expect(result).toEqual({
        success: true,
        updateType: 'status',
        requestId: 'request-123',
      })

      const docRef = mockDb.collection('safetyRequests').doc('request-123')
      expect(docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in-progress',
        })
      )
    })

    it('should require status for status updates', async () => {
      const { updateSafetyRequest } = await import('./updateSafetyRequest')

      const request = {
        data: {
          requestId: 'request-123',
          updateType: 'status',
          // Missing status field
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await expect(
        (updateSafetyRequest as CallableFunction)(request)
      ).rejects.toThrow('Status is required for status updates')
    })
  })

  describe('assignment updates', () => {
    it('should assign request to agent', async () => {
      const { updateSafetyRequest } = await import('./updateSafetyRequest')

      const request = {
        data: {
          requestId: 'request-123',
          updateType: 'assignment',
          assignTo: 'agent-456',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (updateSafetyRequest as CallableFunction)(request)

      const docRef = mockDb.collection('safetyRequests').doc('request-123')
      expect(docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          assignedTo: 'agent-456',
        })
      )
    })

    it('should unassign request', async () => {
      const { updateSafetyRequest } = await import('./updateSafetyRequest')

      const request = {
        data: {
          requestId: 'request-123',
          updateType: 'assignment',
          assignTo: null,
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (updateSafetyRequest as CallableFunction)(request)

      const docRef = mockDb.collection('safetyRequests').doc('request-123')
      expect(docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          assignedTo: null,
        })
      )
    })
  })

  describe('verification updates', () => {
    it('should update verification checklist', async () => {
      const { updateSafetyRequest } = await import('./updateSafetyRequest')

      const request = {
        data: {
          requestId: 'request-123',
          updateType: 'verification',
          verification: { phoneVerified: true, idMatched: true },
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (updateSafetyRequest as CallableFunction)(request)

      const docRef = mockDb.collection('safetyRequests').doc('request-123')
      expect(docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationChecklist: expect.objectContaining({
            phoneVerified: true,
            idMatched: true,
          }),
        })
      )
    })
  })

  describe('note updates', () => {
    it('should add admin note', async () => {
      const { updateSafetyRequest } = await import('./updateSafetyRequest')

      const request = {
        data: {
          requestId: 'request-123',
          updateType: 'note',
          note: { content: 'Called the victim, confirmed identity.' },
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (updateSafetyRequest as CallableFunction)(request)

      const docRef = mockDb.collection('safetyRequests').doc('request-123')
      expect(docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          adminNotes: expect.objectContaining({
            _arrayUnion: expect.objectContaining({
              content: 'Called the victim, confirmed identity.',
              addedBy: 'safety-user',
            }),
          }),
        })
      )
    })

    it('should require content for notes', async () => {
      const { updateSafetyRequest } = await import('./updateSafetyRequest')

      const request = {
        data: {
          requestId: 'request-123',
          updateType: 'note',
          note: { content: '' }, // Empty content
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await expect(
        (updateSafetyRequest as CallableFunction)(request)
      ).rejects.toThrow()
    })
  })

  describe('escalation updates', () => {
    it('should escalate request', async () => {
      const { updateSafetyRequest } = await import('./updateSafetyRequest')

      const request = {
        data: {
          requestId: 'request-123',
          updateType: 'escalation',
          escalation: { isEscalated: true, reason: 'Urgent threat detected' },
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (updateSafetyRequest as CallableFunction)(request)

      const docRef = mockDb.collection('safetyRequests').doc('request-123')
      expect(docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          escalation: expect.objectContaining({
            isEscalated: true,
            reason: 'Urgent threat detected',
            escalatedBy: 'safety-user',
          }),
        })
      )
    })

    it('should de-escalate request', async () => {
      const { updateSafetyRequest } = await import('./updateSafetyRequest')

      const request = {
        data: {
          requestId: 'request-123',
          updateType: 'escalation',
          escalation: { isEscalated: false },
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (updateSafetyRequest as CallableFunction)(request)

      const docRef = mockDb.collection('safetyRequests').doc('request-123')
      expect(docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          escalation: expect.objectContaining({
            isEscalated: false,
            escalatedBy: null,
          }),
        })
      )
    })
  })

  describe('audit logging', () => {
    it('should log all updates to audit log', async () => {
      const { updateSafetyRequest } = await import('./updateSafetyRequest')

      const request = {
        data: {
          requestId: 'request-123',
          updateType: 'status',
          status: 'resolved',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (updateSafetyRequest as CallableFunction)(request)

      expect(mockDb.collection).toHaveBeenCalledWith('adminAuditLog')
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

      const { updateSafetyRequest } = await import('./updateSafetyRequest')

      const request = {
        data: {
          requestId: 'non-existent',
          updateType: 'status',
          status: 'in-progress',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await expect(
        (updateSafetyRequest as CallableFunction)(request)
      ).rejects.toThrow('Safety request not found')
    })
  })

  describe('CRITICAL: safety isolation tests', () => {
    it('should ONLY modify safetyRequests and adminAuditLog collections', async () => {
      const { updateSafetyRequest } = await import('./updateSafetyRequest')

      const request = {
        data: {
          requestId: 'request-123',
          updateType: 'status',
          status: 'resolved',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (updateSafetyRequest as CallableFunction)(request)

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

    it('should NEVER expose updates to family members', async () => {
      // This is verified by the test above - we only write to isolated collections
      // Family collections are never accessed
      const { updateSafetyRequest } = await import('./updateSafetyRequest')

      const request = {
        data: {
          requestId: 'request-123',
          updateType: 'note',
          note: { content: 'Internal investigation note' },
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (updateSafetyRequest as CallableFunction)(request)

      // Verify family collections were never touched
      const collectionCalls = (
        mockDb.collection as ReturnType<typeof vi.fn>
      ).mock.calls.flat()
      expect(collectionCalls).not.toContain('families')
      expect(collectionCalls).not.toContain('children')
      expect(collectionCalls).not.toContain('users')
    })
  })
})
