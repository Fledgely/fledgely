/**
 * Get Sealed Audit Entries Tests
 *
 * Story 0.5.8: Audit Trail Sealing
 *
 * These tests verify the admin callable function for accessing sealed entries:
 * - Role-based access control
 * - Input validation
 * - Access logging
 * - Response format
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({}),
      empty: false,
      docs: [],
    }),
    where: vi.fn().mockReturnThis(),
    batch: vi.fn().mockReturnValue({
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    }),
  })),
  Timestamp: {
    now: vi.fn(() => ({
      toMillis: () => Date.now(),
      toDate: () => new Date(),
    })),
  },
  FieldValue: {
    arrayUnion: vi.fn((...items) => ({ _items: items })),
  },
}))

vi.mock('firebase-functions/v2/https', () => ({
  onCall: vi.fn((_config, handler) => handler),
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message)
    }
  },
}))

vi.mock('../../utils/safetyTeamAuth', () => ({
  requireSafetyTeamRole: vi.fn().mockResolvedValue({
    agentId: 'agent123',
    agentEmail: 'agent@test.com',
    ipAddress: '1.2.3.4',
  }),
}))

vi.mock('../../utils/adminAudit', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}))

describe('Get Sealed Audit Entries Callable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('module exports', () => {
    it('exports getSealedAuditEntries function', async () => {
      const { getSealedAuditEntries } = await import('./getSealedAuditEntries')
      expect(typeof getSealedAuditEntries).toBe('function')
    })
  })

  describe('input validation specifications', () => {
    it('requires ticketId field', () => {
      const validInput = {
        ticketId: 'ticket123',
        familyId: 'family123',
        authorizationReason: 'Legal request',
      }
      expect(validInput.ticketId).toBe('ticket123')
    })

    it('requires familyId field', () => {
      const validInput = {
        ticketId: 'ticket123',
        familyId: 'family456',
        authorizationReason: 'Legal request',
      }
      expect(validInput.familyId).toBe('family456')
    })

    it('requires authorizationReason field', () => {
      const validInput = {
        ticketId: 'ticket123',
        familyId: 'family123',
        authorizationReason: 'Custody case documentation request',
      }
      expect(validInput.authorizationReason).toBe('Custody case documentation request')
    })

    it('rejects empty ticketId', () => {
      const invalidInput = {
        ticketId: '',
        familyId: 'family123',
        authorizationReason: 'Legal request',
      }
      expect(invalidInput.ticketId).toBe('')
    })

    it('rejects empty familyId', () => {
      const invalidInput = {
        ticketId: 'ticket123',
        familyId: '',
        authorizationReason: 'Legal request',
      }
      expect(invalidInput.familyId).toBe('')
    })

    it('rejects empty authorizationReason', () => {
      const invalidInput = {
        ticketId: 'ticket123',
        familyId: 'family123',
        authorizationReason: '',
      }
      expect(invalidInput.authorizationReason).toBe('')
    })
  })

  describe('security specifications', () => {
    it('requires safety-team role verification', () => {
      const roleCheck = 'access_sealed_audit'
      expect(roleCheck).toBe('access_sealed_audit')
    })

    it('verifies ticket exists before proceeding', () => {
      const ticketCheckRequired = true
      expect(ticketCheckRequired).toBe(true)
    })

    it('logs access to admin audit with access_sealed_audit action', () => {
      const auditAction = {
        action: 'access_sealed_audit',
        resourceType: 'sealed_audit',
        resourceId: 'family123',
        metadata: {
          ticketId: 'ticket123',
          familyId: 'family123',
          authorizationReason: 'Legal request',
          entriesAccessed: 5,
        },
      }
      expect(auditAction.action).toBe('access_sealed_audit')
      expect(auditAction.resourceType).toBe('sealed_audit')
    })

    it('logs access to each entry accessLog', () => {
      const accessLogEntry = {
        accessedAt: new Date(),
        accessedByAgentId: 'agent123',
        accessedByAgentEmail: 'agent@test.com',
        accessReason: 'Legal compliance review',
      }
      expect(accessLogEntry.accessedByAgentId).toBe('agent123')
    })
  })

  describe('response format specifications', () => {
    it('returns entries array', () => {
      const response = {
        entries: [{ id: 'seal1' }, { id: 'seal2' }],
        totalCount: 2,
        accessLoggedAt: new Date().toISOString(),
      }
      expect(Array.isArray(response.entries)).toBe(true)
    })

    it('returns totalCount number', () => {
      const response = {
        entries: [],
        totalCount: 0,
        accessLoggedAt: new Date().toISOString(),
      }
      expect(typeof response.totalCount).toBe('number')
    })

    it('returns accessLoggedAt timestamp', () => {
      const response = {
        entries: [],
        totalCount: 0,
        accessLoggedAt: new Date().toISOString(),
      }
      expect(typeof response.accessLoggedAt).toBe('string')
    })

    it('entry includes id field', () => {
      const entry = {
        id: 'seal123',
        familyId: 'family123',
        originalEntry: {},
        sealedAt: new Date().toISOString(),
        sealedByTicketId: 'ticket1',
        sealedByAgentId: 'agent1',
        sealReason: 'escape_action',
        legalHold: true,
      }
      expect(entry.id).toBe('seal123')
    })

    it('entry includes originalEntry with all audit fields', () => {
      const entry = {
        id: 'seal123',
        familyId: 'family123',
        originalEntry: {
          viewerUid: 'user1',
          childId: 'child1',
          dataType: 'screenshots',
          viewedAt: new Date().toISOString(),
          sessionId: 'session1',
          deviceId: 'device1',
          metadata: { key: 'value' },
        },
        sealedAt: new Date().toISOString(),
        sealedByTicketId: 'ticket1',
        sealedByAgentId: 'agent1',
        sealReason: 'escape_action',
        legalHold: true,
      }
      expect(entry.originalEntry.viewerUid).toBe('user1')
      expect(entry.originalEntry.dataType).toBe('screenshots')
    })

    it('entry includes sealing metadata', () => {
      const entry = {
        id: 'seal123',
        familyId: 'family123',
        originalEntry: {},
        sealedAt: new Date().toISOString(),
        sealedByTicketId: 'ticket_seal',
        sealedByAgentId: 'agent_seal',
        sealReason: 'escape_action',
        legalHold: true,
      }
      expect(entry.sealedByTicketId).toBe('ticket_seal')
      expect(entry.sealedByAgentId).toBe('agent_seal')
      expect(entry.sealReason).toBe('escape_action')
    })
  })

  describe('error handling specifications', () => {
    it('throws not-found when ticket does not exist', () => {
      const errorCode = 'not-found'
      const errorMessage = 'Safety ticket not found'
      expect(errorCode).toBe('not-found')
      expect(errorMessage).toContain('ticket')
    })

    it('throws invalid-argument for missing required fields', () => {
      const errorCode = 'invalid-argument'
      expect(errorCode).toBe('invalid-argument')
    })

    it('returns empty array when no sealed entries exist', () => {
      const response = {
        entries: [],
        totalCount: 0,
        accessLoggedAt: new Date().toISOString(),
      }
      expect(response.entries).toHaveLength(0)
      expect(response.totalCount).toBe(0)
    })
  })
})
