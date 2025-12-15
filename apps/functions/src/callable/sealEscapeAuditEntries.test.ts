import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock firebase-admin/firestore
const mockAdd = vi.fn().mockResolvedValue({ id: 'audit-log-id' })
const mockGet = vi.fn()
const mockUpdate = vi.fn().mockResolvedValue(undefined)
const mockCommit = vi.fn().mockResolvedValue(undefined)
const mockWhere = vi.fn().mockReturnThis()
const mockOrderBy = vi.fn().mockReturnThis()
const mockLimit = vi.fn().mockReturnThis()

const mockBatch = {
  update: vi.fn(),
  commit: mockCommit,
}

const mockDocRef = {
  get: mockGet,
  update: mockUpdate,
}

const mockCollection = vi.fn().mockImplementation(() => ({
  doc: vi.fn().mockReturnValue(mockDocRef),
  add: mockAdd,
  where: mockWhere,
  orderBy: mockOrderBy,
  limit: mockLimit,
  get: mockGet,
}))

const mockDb = {
  collection: mockCollection,
  batch: vi.fn().mockReturnValue(mockBatch),
}

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => mockDb),
  Timestamp: {
    now: vi.fn(() => ({
      toDate: () => new Date('2025-12-15T10:00:00Z'),
    })),
    fromDate: vi.fn((date: Date) => ({
      toDate: () => date,
    })),
  },
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}))

// Mock firebase-functions/v2/https
vi.mock('firebase-functions/v2/https', () => ({
  onCall: vi.fn((options, handler) => handler),
  HttpsError: class HttpsError extends Error {
    code: string
    details?: unknown
    constructor(code: string, message: string, details?: unknown) {
      super(message)
      this.code = code
      this.details = details
      this.name = 'HttpsError'
    }
  },
}))

describe('sealEscapeAuditEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const { sealEscapeAuditEntries } = await import('./sealEscapeAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: null,
        data: {},
      }

      await expect(sealEscapeAuditEntries(request as never)).rejects.toThrow(HttpsError)
      await expect(sealEscapeAuditEntries(request as never)).rejects.toThrow('Authentication required')
    })

    it('should reject requests without safety-team role', async () => {
      const { sealEscapeAuditEntries } = await import('./sealEscapeAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: {
          uid: 'admin-123',
          token: {
            isAdmin: true,
            // Missing isSafetyTeam
          },
        },
        data: {
          safetyRequestId: 'request-123',
          familyId: 'family-123',
          reason: 'This is a detailed reason for sealing.',
        },
      }

      await expect(sealEscapeAuditEntries(request as never)).rejects.toThrow(HttpsError)
      await expect(sealEscapeAuditEntries(request as never)).rejects.toThrow('Safety team access required')
    })

    it('should reject compliance team without safety role', async () => {
      const { sealEscapeAuditEntries } = await import('./sealEscapeAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: {
          uid: 'compliance-agent-123',
          token: {
            isComplianceTeam: true,
            // Missing isSafetyTeam
          },
        },
        data: {
          safetyRequestId: 'request-123',
          familyId: 'family-123',
          reason: 'This is a detailed reason for sealing.',
        },
      }

      await expect(sealEscapeAuditEntries(request as never)).rejects.toThrow('Safety team access required')
    })
  })

  describe('input validation', () => {
    it('should reject missing safetyRequestId', async () => {
      const { sealEscapeAuditEntries } = await import('./sealEscapeAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          familyId: 'family-123',
          reason: 'This is a detailed reason for sealing.',
        },
      }

      await expect(sealEscapeAuditEntries(request as never)).rejects.toThrow(HttpsError)
    })

    it('should reject reason under 20 characters', async () => {
      const { sealEscapeAuditEntries } = await import('./sealEscapeAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          safetyRequestId: 'request-123',
          familyId: 'family-123',
          reason: 'Too short',
        },
      }

      await expect(sealEscapeAuditEntries(request as never)).rejects.toThrow(HttpsError)
      await expect(sealEscapeAuditEntries(request as never)).rejects.toThrow('Invalid input')
    })

    it('should accept valid sealReason from enum', async () => {
      const { sealEscapeAuditEntries } = await import('./sealEscapeAuditEntries')

      // Mock safety request exists
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'family-123',
          status: 'verified',
        }),
      })

      // Mock auto-discovery returns empty
      mockGet.mockResolvedValue({ docs: [], empty: true })

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          safetyRequestId: 'request-123',
          familyId: 'family-123',
          reason: 'Sealing escape action entries for victim safety protection.',
          sealReason: 'device-unenrollment',
        },
      }

      const result = await sealEscapeAuditEntries(request as never)
      expect(result.success).toBe(true)
    })
  })

  describe('safety request validation', () => {
    it('should reject if safety request does not exist', async () => {
      const { sealEscapeAuditEntries } = await import('./sealEscapeAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      // Mock safety request does not exist
      mockGet.mockResolvedValueOnce({
        exists: false,
      })

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          safetyRequestId: 'nonexistent-request',
          familyId: 'family-123',
          reason: 'Sealing escape action entries for victim safety.',
        },
      }

      await expect(sealEscapeAuditEntries(request as never)).rejects.toThrow(HttpsError)
      await expect(sealEscapeAuditEntries(request as never)).rejects.toThrow('Safety request not found')
    })

    it('should reject if safety request familyId does not match', async () => {
      const { sealEscapeAuditEntries } = await import('./sealEscapeAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      // Mock safety request with different familyId (use mockResolvedValue for multiple calls)
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          familyId: 'different-family',
          status: 'verified',
        }),
      })

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          safetyRequestId: 'request-123',
          familyId: 'family-123',
          reason: 'Sealing escape action entries for victim safety.',
        },
      }

      await expect(sealEscapeAuditEntries(request as never)).rejects.toThrow(HttpsError)
      await expect(sealEscapeAuditEntries(request as never)).rejects.toThrow('does not match')
    })
  })

  describe('auto-discovery sealing', () => {
    it('should auto-discover and seal related entries when no entryIds provided', async () => {
      const { sealEscapeAuditEntries } = await import('./sealEscapeAuditEntries')

      // Mock safety request exists
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'family-123',
          status: 'verified',
        }),
      })

      // Mock auto-discovery queries return empty (no entries to seal)
      mockGet.mockResolvedValue({ docs: [], empty: true })

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          safetyRequestId: 'request-123',
          familyId: 'family-123',
          reason: 'Sealing escape action entries for victim safety.',
        },
      }

      const result = await sealEscapeAuditEntries(request as never)

      expect(result.success).toBe(true)
      expect(result.sealed).toBe(true)
      expect(result.totalSealed).toBe(0)
    })
  })

  describe('manual sealing', () => {
    it('should seal specific entries when entryIds provided', async () => {
      const { sealEscapeAuditEntries } = await import('./sealEscapeAuditEntries')

      // Mock safety request exists
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'family-123',
          status: 'verified',
        }),
      })

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          safetyRequestId: 'request-123',
          familyId: 'family-123',
          reason: 'Sealing specific entries for victim safety.',
          entryIds: [
            { collection: 'adminAuditLog', id: 'entry-1' },
            { collection: 'adminAuditLog', id: 'entry-2' },
            { collection: 'deviceCommands', id: 'cmd-1' },
          ],
        },
      }

      const result = await sealEscapeAuditEntries(request as never)

      expect(result.success).toBe(true)
      expect(result.sealed).toBe(true)
      expect(result.totalSealed).toBe(3)
      expect(result.byCollection).toEqual({
        adminAuditLog: 2,
        deviceCommands: 1,
      })
    })
  })

  describe('audit logging', () => {
    it('should log sealing operation to adminAuditLog', async () => {
      const { sealEscapeAuditEntries } = await import('./sealEscapeAuditEntries')

      // Mock safety request exists
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'family-123',
          status: 'verified',
        }),
      })

      // Mock auto-discovery returns empty
      mockGet.mockResolvedValue({ docs: [], empty: true })

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          safetyRequestId: 'request-123',
          familyId: 'family-123',
          reason: 'Sealing escape action entries for victim safety.',
        },
      }

      await sealEscapeAuditEntries(request as never)

      // Verify audit log was created
      expect(mockAdd).toHaveBeenCalled()
      const auditCall = mockAdd.mock.calls[0][0]
      expect(auditCall.action).toBe('escape-audit-entries-seal')
      expect(auditCall.sealed).toBe(true)
      expect(auditCall.integrityHash).toBeDefined()
    })

    it('should include integrity hash in audit log', async () => {
      const { sealEscapeAuditEntries } = await import('./sealEscapeAuditEntries')

      // Mock safety request exists
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'family-123',
          status: 'verified',
        }),
      })

      // Mock auto-discovery returns empty
      mockGet.mockResolvedValue({ docs: [], empty: true })

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          safetyRequestId: 'request-123',
          familyId: 'family-123',
          reason: 'Sealing escape action entries for victim safety.',
        },
      }

      await sealEscapeAuditEntries(request as never)

      const auditCall = mockAdd.mock.calls[0][0]
      expect(auditCall.integrityHash).toHaveLength(64)
    })
  })

  describe('response', () => {
    it('should NOT include reason in response for security', async () => {
      const { sealEscapeAuditEntries } = await import('./sealEscapeAuditEntries')

      // Mock safety request exists
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'family-123',
          status: 'verified',
        }),
      })

      // Mock auto-discovery returns empty
      mockGet.mockResolvedValue({ docs: [], empty: true })

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          safetyRequestId: 'request-123',
          familyId: 'family-123',
          reason: 'This is a sensitive reason that should not be in response.',
        },
      }

      const result = await sealEscapeAuditEntries(request as never)

      expect(result.reason).toBeUndefined()
      expect(result.success).toBe(true)
      expect(result.familyId).toBe('family-123')
      expect(result.safetyRequestId).toBe('request-123')
    })

    it('should include sealedAt timestamp in response', async () => {
      const { sealEscapeAuditEntries } = await import('./sealEscapeAuditEntries')

      // Mock safety request exists
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'family-123',
          status: 'verified',
        }),
      })

      // Mock auto-discovery returns empty
      mockGet.mockResolvedValue({ docs: [], empty: true })

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          safetyRequestId: 'request-123',
          familyId: 'family-123',
          reason: 'Sealing escape action entries for victim safety.',
        },
      }

      const result = await sealEscapeAuditEntries(request as never)

      expect(result.sealedAt).toBeDefined()
      expect(typeof result.sealedAt).toBe('string')
    })
  })
})
