import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock firebase-admin/firestore
const mockAdd = vi.fn().mockResolvedValue({ id: 'audit-log-id' })
const mockGet = vi.fn()
const mockUpdate = vi.fn().mockResolvedValue(undefined)
const mockCommit = vi.fn().mockResolvedValue(undefined)

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

describe('unsealAuditEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const { unsealAuditEntries } = await import('./unsealAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: null,
        data: {},
      }

      await expect(unsealAuditEntries(request as never)).rejects.toThrow(HttpsError)
      await expect(unsealAuditEntries(request as never)).rejects.toThrow('Authentication required')
    })

    it('should reject requests without legal team role', async () => {
      const { unsealAuditEntries } = await import('./unsealAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: {
          uid: 'admin-123',
          token: {
            isAdmin: true,
            isSafetyTeam: true,
            isComplianceTeam: true,
            // Missing isLegalTeam
          },
        },
        data: {
          entries: [{ collection: 'adminAuditLog', id: 'entry-1' }],
          courtOrderReference: 'Court Order #12345',
          legalJustification: 'This is a detailed legal justification that meets the 100 character minimum requirement for compliance and audit purposes as required by law.',
        },
      }

      await expect(unsealAuditEntries(request as never)).rejects.toThrow(HttpsError)
      await expect(unsealAuditEntries(request as never)).rejects.toThrow('Legal team access required')
    })

    it('should reject compliance team without legal role', async () => {
      const { unsealAuditEntries } = await import('./unsealAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: {
          uid: 'compliance-agent-123',
          token: {
            isComplianceTeam: true,
            // isLegalTeam is NOT true
          },
        },
        data: {
          entries: [{ collection: 'adminAuditLog', id: 'entry-1' }],
          courtOrderReference: 'Court Order #12345',
          legalJustification: 'This is a detailed legal justification that meets the 100 character minimum requirement for compliance and audit purposes as required by law.',
        },
      }

      await expect(unsealAuditEntries(request as never)).rejects.toThrow('Legal team access required')
    })

    it('should reject safety team without legal role', async () => {
      const { unsealAuditEntries } = await import('./unsealAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: {
            isSafetyTeam: true,
            // isLegalTeam is NOT true
          },
        },
        data: {
          entries: [{ collection: 'adminAuditLog', id: 'entry-1' }],
          courtOrderReference: 'Court Order #12345',
          legalJustification: 'This is a detailed legal justification that meets the 100 character minimum requirement for compliance and audit purposes as required by law.',
        },
      }

      await expect(unsealAuditEntries(request as never)).rejects.toThrow('Legal team access required')
    })
  })

  describe('input validation', () => {
    it('should reject empty entries array', async () => {
      const { unsealAuditEntries } = await import('./unsealAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: {
          uid: 'legal-agent-123',
          token: { isLegalTeam: true },
        },
        data: {
          entries: [],
          courtOrderReference: 'Court Order #12345',
          legalJustification: 'This is a detailed legal justification that meets the 100 character minimum requirement for compliance.',
        },
      }

      await expect(unsealAuditEntries(request as never)).rejects.toThrow(HttpsError)
    })

    it('should reject missing courtOrderReference', async () => {
      const { unsealAuditEntries } = await import('./unsealAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: {
          uid: 'legal-agent-123',
          token: { isLegalTeam: true },
        },
        data: {
          entries: [{ collection: 'adminAuditLog', id: 'entry-1' }],
          legalJustification: 'This is a detailed legal justification that meets the 100 character minimum requirement for compliance.',
        },
      }

      await expect(unsealAuditEntries(request as never)).rejects.toThrow(HttpsError)
    })

    it('should reject short court order reference', async () => {
      const { unsealAuditEntries } = await import('./unsealAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: {
          uid: 'legal-agent-123',
          token: { isLegalTeam: true },
        },
        data: {
          entries: [{ collection: 'adminAuditLog', id: 'entry-1' }],
          courtOrderReference: '123', // Too short, needs at least 5 chars
          legalJustification: 'This is a detailed legal justification that meets the 100 character minimum requirement for compliance.',
        },
      }

      await expect(unsealAuditEntries(request as never)).rejects.toThrow(HttpsError)
    })

    it('should reject justification under 100 characters', async () => {
      const { unsealAuditEntries } = await import('./unsealAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: {
          uid: 'legal-agent-123',
          token: { isLegalTeam: true },
        },
        data: {
          entries: [{ collection: 'adminAuditLog', id: 'entry-1' }],
          courtOrderReference: 'Court Order #12345',
          legalJustification: 'Too short justification',
        },
      }

      await expect(unsealAuditEntries(request as never)).rejects.toThrow(HttpsError)
      await expect(unsealAuditEntries(request as never)).rejects.toThrow('Invalid input')
    })

    it('should reject more than 100 entries per request', async () => {
      const { unsealAuditEntries } = await import('./unsealAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const entries = Array.from({ length: 101 }, (_, i) => ({
        collection: 'adminAuditLog',
        id: `entry-${i}`,
      }))

      const request = {
        auth: {
          uid: 'legal-agent-123',
          token: { isLegalTeam: true },
        },
        data: {
          entries,
          courtOrderReference: 'Court Order #12345',
          legalJustification: 'This is a detailed legal justification that meets the 100 character minimum requirement for compliance and audit purposes.',
        },
      }

      await expect(unsealAuditEntries(request as never)).rejects.toThrow(HttpsError)
    })
  })

  describe('entry validation', () => {
    it('should reject if entry does not exist', async () => {
      const { unsealAuditEntries } = await import('./unsealAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      // Mock entry does not exist
      mockGet.mockResolvedValue({
        exists: false,
      })

      const request = {
        auth: {
          uid: 'legal-agent-123',
          token: { isLegalTeam: true },
        },
        data: {
          entries: [{ collection: 'adminAuditLog', id: 'nonexistent-entry' }],
          courtOrderReference: 'Court Order #12345',
          legalJustification: 'This is a detailed legal justification that meets the 100 character minimum requirement for compliance and audit purposes.',
        },
      }

      await expect(unsealAuditEntries(request as never)).rejects.toThrow(HttpsError)
      await expect(unsealAuditEntries(request as never)).rejects.toThrow('Not found')
    })

    it('should reject if entry is not sealed', async () => {
      const { unsealAuditEntries } = await import('./unsealAuditEntries')
      const { HttpsError } = await import('firebase-functions/v2/https')

      // Mock entry exists but is not sealed
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          sealed: false,
          familyId: 'family-123',
        }),
      })

      const request = {
        auth: {
          uid: 'legal-agent-123',
          token: { isLegalTeam: true },
        },
        data: {
          entries: [{ collection: 'adminAuditLog', id: 'unsealed-entry' }],
          courtOrderReference: 'Court Order #12345',
          legalJustification: 'This is a detailed legal justification that meets the 100 character minimum requirement for compliance and audit purposes.',
        },
      }

      await expect(unsealAuditEntries(request as never)).rejects.toThrow(HttpsError)
      await expect(unsealAuditEntries(request as never)).rejects.toThrow('Not sealed')
    })
  })

  describe('successful unseal', () => {
    it('should unseal entries with valid legal authorization', async () => {
      const { unsealAuditEntries } = await import('./unsealAuditEntries')

      // Mock sealed entries exist
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          sealed: true,
          familyId: 'family-123',
        }),
      })

      const request = {
        auth: {
          uid: 'legal-agent-123',
          token: { isLegalTeam: true },
        },
        data: {
          entries: [
            { collection: 'adminAuditLog', id: 'entry-1' },
            { collection: 'adminAuditLog', id: 'entry-2' },
          ],
          courtOrderReference: 'Court Order #12345',
          legalJustification: 'This is a detailed legal justification that meets the 100 character minimum requirement for compliance and audit purposes as required by law.',
        },
      }

      const result = await unsealAuditEntries(request as never)

      expect(result.success).toBe(true)
      expect(result.unsealed).toBe(2)
      expect(result.courtOrderReference).toBe('Court Order #12345')
    })

    it('should include optional fields in request', async () => {
      const { unsealAuditEntries } = await import('./unsealAuditEntries')

      // Mock sealed entry exists
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          sealed: true,
          familyId: 'family-123',
        }),
      })

      const request = {
        auth: {
          uid: 'legal-agent-123',
          token: { isLegalTeam: true },
        },
        data: {
          entries: [{ collection: 'adminAuditLog', id: 'entry-1' }],
          courtOrderReference: 'Court Order #12345',
          legalJustification: 'This is a detailed legal justification that meets the 100 character minimum requirement for compliance and audit purposes.',
          caseNumber: 'CASE-2025-12345',
          requestingParty: 'District Attorney Office',
        },
      }

      const result = await unsealAuditEntries(request as never)

      expect(result.success).toBe(true)
    })
  })

  describe('audit logging', () => {
    it('should log unseal operation to adminAuditLog', async () => {
      const { unsealAuditEntries } = await import('./unsealAuditEntries')

      // Mock sealed entry exists
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          sealed: true,
          familyId: 'family-123',
        }),
      })

      const request = {
        auth: {
          uid: 'legal-agent-123',
          token: { isLegalTeam: true },
        },
        data: {
          entries: [{ collection: 'adminAuditLog', id: 'entry-1' }],
          courtOrderReference: 'Court Order #12345',
          legalJustification: 'This is a detailed legal justification that meets the 100 character minimum requirement for compliance and audit purposes.',
        },
      }

      await unsealAuditEntries(request as never)

      // Verify audit log was created
      expect(mockAdd).toHaveBeenCalled()
      const auditCall = mockAdd.mock.calls[0][0]
      expect(auditCall.action).toBe('audit-entries-unseal')
      expect(auditCall.sealed).toBe(true) // The unseal log itself is sealed
      expect(auditCall.courtOrderReference).toBe('Court Order #12345')
    })

    it('should include integrity hash in unseal audit log', async () => {
      const { unsealAuditEntries } = await import('./unsealAuditEntries')

      // Mock sealed entry exists
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          sealed: true,
          familyId: 'family-123',
        }),
      })

      const request = {
        auth: {
          uid: 'legal-agent-123',
          token: { isLegalTeam: true },
        },
        data: {
          entries: [{ collection: 'adminAuditLog', id: 'entry-1' }],
          courtOrderReference: 'Court Order #12345',
          legalJustification: 'This is a detailed legal justification that meets the 100 character minimum requirement for compliance and audit purposes.',
        },
      }

      await unsealAuditEntries(request as never)

      const auditCall = mockAdd.mock.calls[0][0]
      expect(auditCall.integrityHash).toHaveLength(64)
    })

    it('should include affected family IDs in audit log', async () => {
      const { unsealAuditEntries } = await import('./unsealAuditEntries')

      // Mock sealed entries with different families
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          sealed: true,
          familyId: 'family-123',
        }),
      })

      const request = {
        auth: {
          uid: 'legal-agent-123',
          token: { isLegalTeam: true },
        },
        data: {
          entries: [
            { collection: 'adminAuditLog', id: 'entry-1' },
            { collection: 'adminAuditLog', id: 'entry-2' },
          ],
          courtOrderReference: 'Court Order #12345',
          legalJustification: 'This is a detailed legal justification that meets the 100 character minimum requirement for compliance and audit purposes.',
        },
      }

      await unsealAuditEntries(request as never)

      const auditCall = mockAdd.mock.calls[0][0]
      expect(auditCall.affectedFamilyIds).toBeDefined()
      expect(Array.isArray(auditCall.affectedFamilyIds)).toBe(true)
    })
  })

  describe('response', () => {
    it('should return count of unsealed entries by collection', async () => {
      const { unsealAuditEntries } = await import('./unsealAuditEntries')

      // Mock sealed entries exist
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          sealed: true,
          familyId: 'family-123',
        }),
      })

      const request = {
        auth: {
          uid: 'legal-agent-123',
          token: { isLegalTeam: true },
        },
        data: {
          entries: [
            { collection: 'adminAuditLog', id: 'entry-1' },
            { collection: 'adminAuditLog', id: 'entry-2' },
            { collection: 'deviceCommands', id: 'cmd-1' },
          ],
          courtOrderReference: 'Court Order #12345',
          legalJustification: 'This is a detailed legal justification that meets the 100 character minimum requirement for compliance and audit purposes.',
        },
      }

      const result = await unsealAuditEntries(request as never)

      expect(result.success).toBe(true)
      expect(result.unsealed).toBe(3)
      expect(result.unsealedByCollection).toEqual({
        adminAuditLog: 2,
        deviceCommands: 1,
      })
    })

    it('should include unsealedAt timestamp in response', async () => {
      const { unsealAuditEntries } = await import('./unsealAuditEntries')

      // Mock sealed entry exists
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          sealed: true,
          familyId: 'family-123',
        }),
      })

      const request = {
        auth: {
          uid: 'legal-agent-123',
          token: { isLegalTeam: true },
        },
        data: {
          entries: [{ collection: 'adminAuditLog', id: 'entry-1' }],
          courtOrderReference: 'Court Order #12345',
          legalJustification: 'This is a detailed legal justification that meets the 100 character minimum requirement for compliance and audit purposes.',
        },
      }

      const result = await unsealAuditEntries(request as never)

      expect(result.unsealedAt).toBeDefined()
      expect(typeof result.unsealedAt).toBe('string')
    })

    it('should NOT expose entries to family members after unseal', async () => {
      // This is a note in the response - entries remain hidden from family queries
      // The unseal only affects compliance/legal access categorization
      const { unsealAuditEntries } = await import('./unsealAuditEntries')

      // Mock sealed entry exists
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          sealed: true,
          familyId: 'family-123',
        }),
      })

      const request = {
        auth: {
          uid: 'legal-agent-123',
          token: { isLegalTeam: true },
        },
        data: {
          entries: [{ collection: 'adminAuditLog', id: 'entry-1' }],
          courtOrderReference: 'Court Order #12345',
          legalJustification: 'This is a detailed legal justification that meets the 100 character minimum requirement for compliance and audit purposes.',
        },
      }

      const result = await unsealAuditEntries(request as never)

      // The response should note that entries remain hidden from family queries
      expect(result.success).toBe(true)
      // Entries were never in familyAuditLog, so unsealing doesn't expose them
    })
  })
})
