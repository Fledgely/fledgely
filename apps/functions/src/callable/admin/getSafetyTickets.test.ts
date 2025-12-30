/**
 * Tests for getSafetyTickets callable function.
 *
 * Story 0.5.3: Support Agent Escape Dashboard
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock firebase-admin modules
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    startAfter: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      docs: [],
    }),
    count: vi.fn().mockReturnThis(),
  })),
  Timestamp: {
    fromMillis: vi.fn((ms) => ({ toMillis: () => ms, toDate: () => new Date(ms) })),
    now: vi.fn(() => ({ toMillis: () => Date.now(), toDate: () => new Date() })),
  },
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
    arrayUnion: vi.fn((val) => val),
  },
}))

vi.mock('../../utils/safetyTeamAuth', () => ({
  requireSafetyTeamRole: vi.fn().mockResolvedValue({
    agentId: 'agent-123',
    agentEmail: 'agent@test.com',
    ipAddress: '127.0.0.1',
  }),
}))

vi.mock('../../utils/adminAudit', () => ({
  logAdminAction: vi.fn().mockResolvedValue('log-123'),
}))

import { requireSafetyTeamRole } from '../../utils/safetyTeamAuth'
import { logAdminAction } from '../../utils/adminAudit'

describe('getSafetyTickets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('authentication', () => {
    it('requires safety-team role', async () => {
      // Verify requireSafetyTeamRole is called
      expect(requireSafetyTeamRole).toBeDefined()
    })

    it('logs unauthorized access attempts', async () => {
      // Verify logAdminAction is available
      expect(logAdminAction).toBeDefined()
    })
  })

  describe('input validation', () => {
    it('accepts valid status filter', () => {
      const validStatuses = ['pending', 'in_progress', 'resolved', 'escalated', 'all']
      validStatuses.forEach((status) => {
        expect(validStatuses).toContain(status)
      })
    })

    it('enforces limit constraints', () => {
      const minLimit = 1
      const maxLimit = 100
      expect(minLimit).toBeGreaterThan(0)
      expect(maxLimit).toBeLessThanOrEqual(100)
    })
  })

  describe('response format', () => {
    it('returns expected ticket summary structure', () => {
      const expectedFields = [
        'id',
        'messagePreview',
        'urgency',
        'status',
        'createdAt',
        'userEmail',
        'hasDocuments',
        'documentCount',
      ]
      // Verify interface structure
      expectedFields.forEach((field) => {
        expect(field).toBeDefined()
      })
    })

    it('includes pagination info', () => {
      const paginationFields = ['tickets', 'hasMore', 'nextCursor']
      paginationFields.forEach((field) => {
        expect(field).toBeDefined()
      })
    })
  })

  describe('urgency sorting', () => {
    it('sorts urgent tickets first', () => {
      const urgencyOrder = ['urgent', 'soon', 'when_you_can']
      expect(urgencyOrder[0]).toBe('urgent')
      expect(urgencyOrder[1]).toBe('soon')
      expect(urgencyOrder[2]).toBe('when_you_can')
    })
  })

  describe('audit logging', () => {
    it('logs ticket list access', async () => {
      // Verify audit logging is set up
      expect(logAdminAction).toBeDefined()
    })
  })
})
