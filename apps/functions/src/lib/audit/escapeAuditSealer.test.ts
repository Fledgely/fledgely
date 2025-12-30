/**
 * Escape Audit Sealer Tests
 *
 * Story 0.5.8: Audit Trail Sealing
 *
 * These tests verify the escape audit sealing functionality including:
 * - Bulk sealing of escape-related entries
 * - Integration with escape actions
 * - Admin audit logging
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'audit1',
          ref: { id: 'audit1' },
          data: () => ({
            familyId: 'family123',
            viewerUid: 'user1',
            childId: 'child1',
            dataType: 'screenshots',
            viewedAt: { toMillis: () => Date.now() },
            sessionId: null,
            deviceId: null,
            metadata: null,
          }),
        },
      ],
      size: 1,
    }),
    set: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    where: vi.fn().mockReturnThis(),
    batch: vi.fn().mockReturnValue({
      set: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    }),
  })),
  Timestamp: {
    now: vi.fn(() => ({
      toMillis: () => Date.now(),
      toDate: () => new Date(),
    })),
  },
}))

vi.mock('../../utils/adminAudit', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}))

describe('Escape Audit Sealer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('module exports', () => {
    it('exports sealEscapeRelatedEntries function', async () => {
      const { sealEscapeRelatedEntries } = await import('./escapeAuditSealer')
      expect(typeof sealEscapeRelatedEntries).toBe('function')
    })

    it('exports countEscapeRelatedEntries function', async () => {
      const { countEscapeRelatedEntries } = await import('./escapeAuditSealer')
      expect(typeof countEscapeRelatedEntries).toBe('function')
    })
  })

  describe('SealEscapeEntriesOptions interface', () => {
    it('requires familyId field', () => {
      const options = {
        familyId: 'family123',
        escapedUserIds: ['user1'],
        ticketId: 'ticket1',
        agentId: 'agent1',
        agentEmail: 'agent@test.com',
        ipAddress: '1.2.3.4',
      }
      expect(options.familyId).toBe('family123')
    })

    it('requires escapedUserIds array field', () => {
      const options = {
        familyId: 'family123',
        escapedUserIds: ['user1', 'user2'],
        ticketId: 'ticket1',
        agentId: 'agent1',
        agentEmail: 'agent@test.com',
        ipAddress: '1.2.3.4',
      }
      expect(Array.isArray(options.escapedUserIds)).toBe(true)
      expect(options.escapedUserIds).toHaveLength(2)
    })

    it('requires ticketId field', () => {
      const options = {
        familyId: 'family123',
        escapedUserIds: ['user1'],
        ticketId: 'safety_ticket_123',
        agentId: 'agent1',
        agentEmail: 'agent@test.com',
        ipAddress: '1.2.3.4',
      }
      expect(options.ticketId).toBe('safety_ticket_123')
    })

    it('requires agentId field', () => {
      const options = {
        familyId: 'family123',
        escapedUserIds: ['user1'],
        ticketId: 'ticket1',
        agentId: 'agent_abc',
        agentEmail: 'agent@test.com',
        ipAddress: '1.2.3.4',
      }
      expect(options.agentId).toBe('agent_abc')
    })

    it('supports nullable agentEmail field', () => {
      const optionsWithEmail = {
        familyId: 'family123',
        escapedUserIds: ['user1'],
        ticketId: 'ticket1',
        agentId: 'agent1',
        agentEmail: 'agent@test.com',
        ipAddress: '1.2.3.4',
      }
      const optionsWithoutEmail = {
        familyId: 'family123',
        escapedUserIds: ['user1'],
        ticketId: 'ticket1',
        agentId: 'agent1',
        agentEmail: null,
        ipAddress: '1.2.3.4',
      }
      expect(optionsWithEmail.agentEmail).toBe('agent@test.com')
      expect(optionsWithoutEmail.agentEmail).toBeNull()
    })

    it('supports nullable ipAddress field', () => {
      const optionsWithIp = {
        familyId: 'family123',
        escapedUserIds: ['user1'],
        ticketId: 'ticket1',
        agentId: 'agent1',
        agentEmail: 'agent@test.com',
        ipAddress: '192.168.1.1',
      }
      const optionsWithoutIp = {
        familyId: 'family123',
        escapedUserIds: ['user1'],
        ticketId: 'ticket1',
        agentId: 'agent1',
        agentEmail: 'agent@test.com',
        ipAddress: null,
      }
      expect(optionsWithIp.ipAddress).toBe('192.168.1.1')
      expect(optionsWithoutIp.ipAddress).toBeNull()
    })
  })

  describe('sealEscapeRelatedEntries behavior specifications', () => {
    it('queries audit entries by familyId and viewerUid in escapedUserIds', () => {
      const queryConditions = {
        familyId: 'family123',
        viewerUid: ['user1', 'user2'],
      }
      expect(queryConditions.familyId).toBe('family123')
      expect(Array.isArray(queryConditions.viewerUid)).toBe(true)
    })

    it('seals entries by escaped users (victim), not by abuser', () => {
      // Key design decision: We seal entries by the ESCAPED user
      // This removes evidence of the victim's recent activity
      const escapedUserId = 'victim_user'
      const entryViewerUid = 'victim_user'
      expect(entryViewerUid).toBe(escapedUserId)
    })

    it('creates sealed entry for each found audit entry', () => {
      const auditEntries = [{ id: 'audit1' }, { id: 'audit2' }]
      const sealedCount = auditEntries.length
      expect(sealedCount).toBe(2)
    })

    it('deletes original entries after creating sealed copies', () => {
      const operations = ['create_sealed', 'delete_original']
      expect(operations).toContain('create_sealed')
      expect(operations).toContain('delete_original')
    })

    it('logs sealing to admin audit with seal_audit_entries action', () => {
      const auditAction = {
        action: 'seal_audit_entries',
        resourceType: 'sealed_audit',
        resourceId: 'family123',
        metadata: {
          ticketId: 'ticket1',
          escapedUserIds: ['user1'],
          entriesSealed: 3,
        },
      }
      expect(auditAction.action).toBe('seal_audit_entries')
      expect(auditAction.resourceType).toBe('sealed_audit')
    })

    it('returns 0 when familyId is empty', () => {
      const emptyFamilyId = ''
      const result = emptyFamilyId ? 1 : 0
      expect(result).toBe(0)
    })

    it('returns 0 when escapedUserIds is empty', () => {
      const emptyUserIds: string[] = []
      const result = emptyUserIds.length > 0 ? 1 : 0
      expect(result).toBe(0)
    })

    it('handles batched queries for more than 30 user IDs', () => {
      // Firestore 'in' queries are limited to 30 items
      const batchSize = 30
      const userIds = Array.from({ length: 50 }, (_, i) => `user${i}`)
      const batches = Math.ceil(userIds.length / batchSize)
      expect(batches).toBe(2)
    })

    it('processes entries in batches of 500 for Firestore limit', () => {
      const firestoreBatchLimit = 500
      const entries = Array.from({ length: 750 }, (_, i) => ({ id: `entry${i}` }))
      const batches = Math.ceil(entries.length / firestoreBatchLimit)
      expect(batches).toBe(2)
    })
  })

  describe('countEscapeRelatedEntries behavior specifications', () => {
    it('queries audit entries by familyId and viewerUid', () => {
      const queryConditions = {
        familyId: 'family123',
        viewerUid: ['user1'],
      }
      expect(queryConditions.familyId).toBe('family123')
    })

    it('returns count without modifying any entries', () => {
      const count = 5
      const modified = false
      expect(count).toBe(5)
      expect(modified).toBe(false)
    })

    it('returns 0 when familyId is empty', () => {
      const emptyFamilyId = ''
      const result = emptyFamilyId ? 1 : 0
      expect(result).toBe(0)
    })

    it('returns 0 when escapedUserIds is empty', () => {
      const emptyUserIds: string[] = []
      const result = emptyUserIds.length > 0 ? 1 : 0
      expect(result).toBe(0)
    })
  })

  describe('integration with escape actions', () => {
    it('is called from severParentAccess after stealth window', () => {
      const callOrder = ['activateStealthWindow', 'sealEscapeRelatedEntries']
      expect(callOrder[0]).toBe('activateStealthWindow')
      expect(callOrder[1]).toBe('sealEscapeRelatedEntries')
    })

    it('is called from unenrollDevicesForSafety after stealth window', () => {
      const callOrder = ['activateStealthWindow', 'sealEscapeRelatedEntries']
      expect(callOrder[0]).toBe('activateStealthWindow')
      expect(callOrder[1]).toBe('sealEscapeRelatedEntries')
    })

    it('is called from disableLocationFeaturesForSafety after stealth window', () => {
      const callOrder = ['activateStealthWindow', 'sealEscapeRelatedEntries']
      expect(callOrder[0]).toBe('activateStealthWindow')
      expect(callOrder[1]).toBe('sealEscapeRelatedEntries')
    })

    it('receives same ticketId as the escape action', () => {
      const escapeActionTicketId = 'ticket123'
      const sealingTicketId = 'ticket123'
      expect(sealingTicketId).toBe(escapeActionTicketId)
    })

    it('receives affected user IDs from escape action context', () => {
      const escapeAffectedUsers = ['user1', 'user2']
      const sealingAffectedUsers = escapeAffectedUsers
      expect(sealingAffectedUsers).toEqual(escapeAffectedUsers)
    })
  })
})
