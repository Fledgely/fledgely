import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'

// Mock Firestore data - message must be over 100 chars to test truncation
const longMessage = 'I need help escaping a very dangerous situation. This is a detailed message that describes my circumstances and why I urgently need assistance from the safety team to help me.'
const mockRequestData = {
  message: longMessage,
  safeEmail: 'safe@example.com',
  safePhone: '+1234567890',
  submittedAt: { toDate: () => new Date() },
  status: 'pending',
  source: 'settings',
  documents: [],
  assignedTo: null,
  escalation: { isEscalated: false },
}

vi.mock('firebase-admin/firestore', () => {
  const mockDocs = [
    {
      id: 'request-1',
      data: () => ({ ...mockRequestData }),
    },
    {
      id: 'request-2',
      data: () => ({ ...mockRequestData, status: 'in-progress' }),
    },
  ]

  const mockQuery = {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    startAfter: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: mockDocs }),
  }

  const mockAdd = vi.fn().mockResolvedValue({ id: 'audit-log-id' })
  const mockGet = vi.fn().mockResolvedValue({ exists: true, data: () => mockRequestData })

  const mockCollection = vi.fn().mockImplementation((name: string) => {
    if (name === 'safetyRequests') {
      return {
        ...mockQuery,
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
    Query: vi.fn(),
    DocumentData: vi.fn(),
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

describe('listSafetyRequests Cloud Function', () => {
  let mockDb: ReturnType<typeof getFirestore>

  beforeAll(() => {
    mockDb = getFirestore()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('authentication and authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const { listSafetyRequests } = await import('./listSafetyRequests')

      const request = {
        data: {},
        auth: undefined,
      }

      await expect(
        (listSafetyRequests as CallableFunction)(request)
      ).rejects.toThrow('Authentication required')
    })

    it('should reject users without safety-team role', async () => {
      const { listSafetyRequests } = await import('./listSafetyRequests')

      const request = {
        data: {},
        auth: {
          uid: 'regular-user',
          token: { isSafetyTeam: false, isAdmin: false },
        },
      }

      await expect(
        (listSafetyRequests as CallableFunction)(request)
      ).rejects.toThrow('Safety team access required')
    })

    it('should allow safety-team users', async () => {
      const { listSafetyRequests } = await import('./listSafetyRequests')

      const request = {
        data: {},
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true, isAdmin: false },
        },
      }

      const result = await (listSafetyRequests as CallableFunction)(request)

      expect(result).toHaveProperty('success', true)
      expect(result).toHaveProperty('requests')
    })

    it('should allow admin users', async () => {
      const { listSafetyRequests } = await import('./listSafetyRequests')

      const request = {
        data: {},
        auth: {
          uid: 'admin-user',
          token: { isSafetyTeam: false, isAdmin: true },
        },
      }

      const result = await (listSafetyRequests as CallableFunction)(request)

      expect(result).toHaveProperty('success', true)
    })
  })

  describe('filtering', () => {
    it('should apply status filter', async () => {
      const { listSafetyRequests } = await import('./listSafetyRequests')

      const request = {
        data: { status: 'pending' },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (listSafetyRequests as CallableFunction)(request)

      const collection = mockDb.collection('safetyRequests')
      expect(collection.where).toHaveBeenCalledWith('status', '==', 'pending')
    })

    it('should apply escalation filter', async () => {
      const { listSafetyRequests } = await import('./listSafetyRequests')

      const request = {
        data: { escalated: true },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (listSafetyRequests as CallableFunction)(request)

      const collection = mockDb.collection('safetyRequests')
      expect(collection.where).toHaveBeenCalledWith(
        'escalation.isEscalated',
        '==',
        true
      )
    })
  })

  describe('pagination', () => {
    it('should apply limit', async () => {
      const { listSafetyRequests } = await import('./listSafetyRequests')

      const request = {
        data: { limit: 10 },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (listSafetyRequests as CallableFunction)(request)

      const collection = mockDb.collection('safetyRequests')
      expect(collection.limit).toHaveBeenCalledWith(10)
    })

    it('should return hasMore when results equal limit', async () => {
      const { listSafetyRequests } = await import('./listSafetyRequests')

      const request = {
        data: { limit: 2 }, // We have 2 mock docs
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      const result = (await (listSafetyRequests as CallableFunction)(
        request
      )) as { hasMore: boolean }

      expect(result.hasMore).toBe(true)
    })
  })

  describe('response format', () => {
    it('should return summary fields only (not full content)', async () => {
      const { listSafetyRequests } = await import('./listSafetyRequests')

      const request = {
        data: {},
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      const result = (await (listSafetyRequests as CallableFunction)(
        request
      )) as { requests: Array<Record<string, unknown>> }

      const firstRequest = result.requests[0]

      // Should have summary fields
      expect(firstRequest).toHaveProperty('id')
      expect(firstRequest).toHaveProperty('status')
      expect(firstRequest).toHaveProperty('hasEmail')
      expect(firstRequest).toHaveProperty('hasPhone')
      expect(firstRequest).toHaveProperty('hasDocuments')
      expect(firstRequest).toHaveProperty('messagePreview')

      // Should NOT have full message (truncated) - preview is max 100 chars + ellipsis
      expect(firstRequest.messagePreview).not.toBe(longMessage)
      // Should be truncated with ellipsis since longMessage > 100 chars
      expect((firstRequest.messagePreview as string).length).toBeLessThanOrEqual(103)
    })
  })

  describe('audit logging', () => {
    it('should log list access to audit log', async () => {
      const { listSafetyRequests } = await import('./listSafetyRequests')

      const request = {
        data: {},
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (listSafetyRequests as CallableFunction)(request)

      expect(mockDb.collection).toHaveBeenCalledWith('adminAuditLog')
    })
  })

  describe('CRITICAL: safety isolation tests', () => {
    it('should ONLY query safetyRequests collection', async () => {
      const { listSafetyRequests } = await import('./listSafetyRequests')

      const request = {
        data: {},
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (listSafetyRequests as CallableFunction)(request)

      const collectionCalls = (
        mockDb.collection as ReturnType<typeof vi.fn>
      ).mock.calls.flat()

      // Should query safetyRequests and adminAuditLog only
      expect(collectionCalls).toContain('safetyRequests')
      expect(collectionCalls).toContain('adminAuditLog')

      // Should NEVER access family-related collections
      expect(collectionCalls).not.toContain('children')
      expect(collectionCalls).not.toContain('families')
      expect(collectionCalls).not.toContain('auditLog')
    })
  })
})
