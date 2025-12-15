import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock firebase-admin/firestore
const mockAdd = vi.fn().mockResolvedValue({ id: 'access-log-id' })
const mockGet = vi.fn()
const mockWhere = vi.fn().mockReturnThis()
const mockOrderBy = vi.fn().mockReturnThis()
const mockLimit = vi.fn().mockReturnThis()
const mockBatchCommit = vi.fn().mockResolvedValue(undefined)
const mockBatchSet = vi.fn()

const mockBatch = {
  set: mockBatchSet,
  commit: mockBatchCommit,
}

const mockCollection = vi.fn().mockImplementation((name: string) => ({
  doc: vi.fn().mockReturnValue({
    get: mockGet,
    update: vi.fn().mockResolvedValue(undefined),
  }),
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

describe('getSealedAuditEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const { getSealedAuditEntries } = await import('./getSealedAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: null,
        data: {},
      }

      await expect(getSealedAuditEntries(request as never)).rejects.toThrow(HttpsError)
      await expect(getSealedAuditEntries(request as never)).rejects.toThrow('Authentication required')
    })

    it('should reject requests without compliance or legal team role', async () => {
      const { getSealedAuditEntries } = await import('./getSealedAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: {
          uid: 'admin-123',
          token: {
            isAdmin: true,
            isSafetyTeam: true,
            // Missing isComplianceTeam and isLegalTeam
          },
        },
        data: {
          familyId: 'family-123',
          justification: 'This is a detailed justification that meets the 50 character minimum requirement.',
        },
      }

      await expect(getSealedAuditEntries(request as never)).rejects.toThrow(HttpsError)
      await expect(getSealedAuditEntries(request as never)).rejects.toThrow('Compliance or Legal team access required')
    })

    it('should reject safety team without compliance/legal role', async () => {
      const { getSealedAuditEntries } = await import('./getSealedAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: {
            isSafetyTeam: true,
            // isComplianceTeam is NOT true
          },
        },
        data: {
          familyId: 'family-123',
          justification: 'This is a detailed justification that meets the 50 character minimum requirement.',
        },
      }

      await expect(getSealedAuditEntries(request as never)).rejects.toThrow('Compliance or Legal team access required')
    })
  })

  describe('authorization', () => {
    it('should allow compliance team access', async () => {
      const { getSealedAuditEntries } = await import('./getSealedAuditEntries')

      // Mock sealed entries query
      mockGet.mockResolvedValue({
        docs: [
          {
            id: 'entry-1',
            data: () => ({
              action: 'escape-action',
              familyId: 'family-123',
              sealed: true,
              sealedAt: { toDate: () => new Date('2025-12-10') },
              timestamp: { toDate: () => new Date('2025-12-10') },
              integrityHash: 'a'.repeat(64),
            }),
          },
        ],
        empty: false,
      })

      const request = {
        auth: {
          uid: 'compliance-agent-123',
          token: {
            isComplianceTeam: true,
          },
        },
        data: {
          familyId: 'family-123',
          justification: 'This is a detailed justification that meets the 50 character minimum requirement.',
        },
      }

      const result = await getSealedAuditEntries(request as never)

      expect(result.success).toBe(true)
      expect(result.entries).toBeDefined()
    })

    it('should allow legal team access', async () => {
      const { getSealedAuditEntries } = await import('./getSealedAuditEntries')

      // Mock sealed entries query
      mockGet.mockResolvedValue({
        docs: [],
        empty: true,
      })

      const request = {
        auth: {
          uid: 'legal-agent-123',
          token: {
            isLegalTeam: true,
          },
        },
        data: {
          familyId: 'family-123',
          justification: 'This is a detailed justification that meets the 50 character minimum requirement.',
        },
      }

      const result = await getSealedAuditEntries(request as never)

      expect(result.success).toBe(true)
    })
  })

  describe('input validation', () => {
    beforeEach(() => {
      // Default mock for successful query
      mockGet.mockResolvedValue({
        docs: [],
        empty: true,
      })
    })

    it('should reject missing familyId', async () => {
      const { getSealedAuditEntries } = await import('./getSealedAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: {
          uid: 'compliance-agent-123',
          token: { isComplianceTeam: true },
        },
        data: {
          justification: 'This is a detailed justification that meets the 50 character minimum requirement.',
        },
      }

      await expect(getSealedAuditEntries(request as never)).rejects.toThrow(HttpsError)
    })

    it('should reject justification under 50 characters', async () => {
      const { getSealedAuditEntries } = await import('./getSealedAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: {
          uid: 'compliance-agent-123',
          token: { isComplianceTeam: true },
        },
        data: {
          familyId: 'family-123',
          justification: 'Too short',
        },
      }

      await expect(getSealedAuditEntries(request as never)).rejects.toThrow(HttpsError)
      await expect(getSealedAuditEntries(request as never)).rejects.toThrow('Invalid input')
    })

    it('should accept valid input with minimum fields', async () => {
      const { getSealedAuditEntries } = await import('./getSealedAuditEntries')

      const request = {
        auth: {
          uid: 'compliance-agent-123',
          token: { isComplianceTeam: true },
        },
        data: {
          familyId: 'family-123',
          justification: 'This is a detailed justification that meets the 50 character minimum requirement.',
        },
      }

      const result = await getSealedAuditEntries(request as never)
      expect(result.success).toBe(true)
    })

    it('should accept valid input with all optional fields', async () => {
      const { getSealedAuditEntries } = await import('./getSealedAuditEntries')

      const request = {
        auth: {
          uid: 'legal-agent-123',
          token: { isLegalTeam: true },
        },
        data: {
          familyId: 'family-123',
          dateRange: {
            start: '2025-12-01T00:00:00.000Z',
            end: '2025-12-15T23:59:59.999Z',
          },
          actionTypes: ['escape-action', 'device-unenrollment'],
          limit: 50,
          justification: 'This is a detailed justification that meets the 50 character minimum requirement for compliance.',
          legalReference: 'Court Order #12345',
        },
      }

      const result = await getSealedAuditEntries(request as never)
      expect(result.success).toBe(true)
    })
  })

  describe('access logging', () => {
    it('should log access to complianceAccessLog when entries are returned', async () => {
      const { getSealedAuditEntries } = await import('./getSealedAuditEntries')

      // Mock sealed entries query with entries
      mockGet.mockResolvedValue({
        docs: [
          {
            id: 'entry-1',
            data: () => ({
              action: 'escape-action',
              resourceId: 'resource-1',
              familyId: 'family-123',
              sealed: true,
              sealedAt: { toDate: () => new Date('2025-12-10') },
              timestamp: { toDate: () => new Date('2025-12-10') },
              integrityHash: 'a'.repeat(64),
            }),
          },
          {
            id: 'entry-2',
            data: () => ({
              action: 'device-unenrollment',
              resourceId: 'resource-2',
              familyId: 'family-123',
              sealed: true,
              sealedAt: { toDate: () => new Date('2025-12-11') },
              timestamp: { toDate: () => new Date('2025-12-11') },
              integrityHash: 'b'.repeat(64),
            }),
          },
        ],
        empty: false,
      })

      const request = {
        auth: {
          uid: 'compliance-agent-123',
          token: { isComplianceTeam: true },
        },
        data: {
          familyId: 'family-123',
          justification: 'Investigating compliance issue for family audit. This requires access to sealed records.',
        },
      }

      const result = await getSealedAuditEntries(request as never)

      expect(result.success).toBe(true)
      expect(result.count).toBe(2)

      // Should log access using batch writes (not individual adds anymore)
      expect(mockBatchCommit).toHaveBeenCalled()
    })
  })

  describe('integrity verification', () => {
    it('should verify hash matches entry data', async () => {
      const { getSealedAuditEntries } = await import('./getSealedAuditEntries')

      // Mock entry with a hash that won't match (integrity verification now actually computes and compares)
      // A 64-char hex string that doesn't match the computed hash is invalid
      mockGet.mockResolvedValue({
        docs: [
          {
            id: 'entry-1',
            data: () => ({
              action: 'escape-action',
              resourceType: 'test-resource',
              resourceId: 'resource-1',
              performedBy: 'user-123',
              familyId: 'family-123',
              sealed: true,
              sealedBy: 'admin-123',
              sealReason: 'escape-action',
              sealedAt: { toDate: () => new Date('2025-12-10') },
              timestamp: { toDate: () => new Date('2025-12-10') },
              integrityHash: 'a'.repeat(64), // Hash that won't match computed hash
            }),
          },
        ],
        empty: false,
      })

      const request = {
        auth: {
          uid: 'compliance-agent-123',
          token: { isComplianceTeam: true },
        },
        data: {
          familyId: 'family-123',
          justification: 'This is a detailed justification that meets the 50 character minimum requirement.',
        },
      }

      const result = await getSealedAuditEntries(request as never)

      // Hash verification now actually computes and compares, so mismatched hash returns false
      expect(result.entries[0].integrityVerified).toBe(false)
    })

    it('should mark entries without valid hash as not verified', async () => {
      const { getSealedAuditEntries } = await import('./getSealedAuditEntries')

      // Mock entry with invalid/missing hash
      mockGet.mockResolvedValue({
        docs: [
          {
            id: 'entry-1',
            data: () => ({
              action: 'escape-action',
              resourceId: 'resource-1',
              familyId: 'family-123',
              sealed: true,
              sealedAt: { toDate: () => new Date('2025-12-10') },
              timestamp: { toDate: () => new Date('2025-12-10') },
              integrityHash: 'short', // Invalid hash
            }),
          },
        ],
        empty: false,
      })

      const request = {
        auth: {
          uid: 'compliance-agent-123',
          token: { isComplianceTeam: true },
        },
        data: {
          familyId: 'family-123',
          justification: 'This is a detailed justification that meets the 50 character minimum requirement.',
        },
      }

      const result = await getSealedAuditEntries(request as never)

      expect(result.entries[0].integrityVerified).toBe(false)
    })
  })
})
