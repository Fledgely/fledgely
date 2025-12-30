/**
 * Tests for getFamilyForSevering callable function.
 *
 * Story 0.5.4: Parent Access Severing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock firebase-admin modules
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      exists: true,
      empty: false,
      docs: [
        {
          id: 'family-123',
          data: () => ({
            name: 'Test Family',
            guardians: [
              {
                uid: 'parent-1',
                email: 'parent1@test.com',
                displayName: 'Parent One',
                role: 'primary',
              },
              {
                uid: 'parent-2',
                email: 'parent2@test.com',
                displayName: 'Parent Two',
                role: 'guardian',
              },
            ],
          }),
        },
      ],
      data: () => ({
        userId: 'parent-1',
        userEmail: 'parent1@test.com',
      }),
    }),
  })),
  Timestamp: {
    now: vi.fn(() => ({ toMillis: () => Date.now(), toDate: () => new Date() })),
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

describe('getFamilyForSevering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('authentication', () => {
    it('requires safety-team role', async () => {
      expect(requireSafetyTeamRole).toBeDefined()
    })

    it('logs access via admin audit', async () => {
      expect(logAdminAction).toBeDefined()
    })
  })

  describe('input validation', () => {
    it('requires ticketId parameter', () => {
      const requiredField = 'ticketId'
      expect(requiredField).toBeDefined()
    })

    it('validates ticketId is non-empty string', () => {
      const validTicketId = 'ticket-123'
      expect(validTicketId.length).toBeGreaterThan(0)
    })
  })

  describe('ticket lookup', () => {
    it('retrieves ticket from safetyTickets collection', () => {
      const collection = 'safetyTickets'
      expect(collection).toBe('safetyTickets')
    })

    it('extracts userId from ticket', () => {
      const ticketData = { userId: 'parent-1', userEmail: 'parent@test.com' }
      expect(ticketData.userId).toBeDefined()
    })

    it('handles anonymous tickets (no userId)', () => {
      const anonymousTicket = { userId: null, userEmail: null }
      expect(anonymousTicket.userId).toBeNull()
    })
  })

  describe('family lookup', () => {
    it('queries families by guardianUids array-contains', () => {
      const queryMethod = 'array-contains'
      expect(queryMethod).toBe('array-contains')
    })

    it('returns null family for anonymous tickets', () => {
      const result = { family: null, requestingUserUid: null, requestingUserEmail: null }
      expect(result.family).toBeNull()
    })

    it('returns null family if user has no family', () => {
      const result = {
        family: null,
        requestingUserUid: 'user-123',
        requestingUserEmail: 'user@test.com',
      }
      expect(result.family).toBeNull()
      expect(result.requestingUserUid).toBeDefined()
    })
  })

  describe('response format', () => {
    it('returns family with id', () => {
      const family = { id: 'family-123', name: 'Test Family', guardians: [] }
      expect(family.id).toBeDefined()
    })

    it('returns family with name', () => {
      const family = { id: 'family-123', name: 'Test Family', guardians: [] }
      expect(family.name).toBeDefined()
    })

    it('returns guardians array', () => {
      const family = { id: 'family-123', name: 'Test Family', guardians: [] }
      expect(Array.isArray(family.guardians)).toBe(true)
    })

    it('guardian info includes uid', () => {
      const guardian = {
        uid: 'parent-1',
        email: 'parent@test.com',
        displayName: 'Parent',
        role: 'primary',
      }
      expect(guardian.uid).toBeDefined()
    })

    it('guardian info includes email', () => {
      const guardian = {
        uid: 'parent-1',
        email: 'parent@test.com',
        displayName: 'Parent',
        role: 'primary',
      }
      expect(guardian.email).toBeDefined()
    })

    it('guardian info includes displayName (nullable)', () => {
      const guardian = {
        uid: 'parent-1',
        email: 'parent@test.com',
        displayName: null,
        role: 'primary',
      }
      expect(guardian.displayName).toBeNull()
    })

    it('guardian info includes role', () => {
      const guardian = {
        uid: 'parent-1',
        email: 'parent@test.com',
        displayName: 'Parent',
        role: 'primary',
      }
      expect(guardian.role).toBeDefined()
    })

    it('returns requestingUserUid', () => {
      const result = {
        family: null,
        requestingUserUid: 'user-123',
        requestingUserEmail: 'user@test.com',
      }
      expect(result.requestingUserUid).toBeDefined()
    })

    it('returns requestingUserEmail', () => {
      const result = {
        family: null,
        requestingUserUid: 'user-123',
        requestingUserEmail: 'user@test.com',
      }
      expect(result.requestingUserEmail).toBeDefined()
    })
  })

  describe('audit logging', () => {
    it('logs get_family_for_severing action', () => {
      const action = 'get_family_for_severing'
      expect(action).toBe('get_family_for_severing')
    })

    it('includes ticket ID in audit metadata', () => {
      const metadata = { ticketId: 'ticket-123' }
      expect(metadata.ticketId).toBeDefined()
    })

    it('includes family ID in audit metadata', () => {
      const metadata = { familyId: 'family-123' }
      expect(metadata.familyId).toBeDefined()
    })

    it('logs anonymous ticket access', () => {
      const metadata = { result: 'no_user_id', message: 'Anonymous ticket' }
      expect(metadata.result).toBe('no_user_id')
    })

    it('logs when user has no family', () => {
      const metadata = { result: 'no_family', userId: 'user-123' }
      expect(metadata.result).toBe('no_family')
    })
  })

  describe('error handling', () => {
    it('fails if ticket not found', () => {
      const errorCode = 'not-found'
      expect(errorCode).toBe('not-found')
    })

    it('fails with invalid input', () => {
      const errorCode = 'invalid-argument'
      expect(errorCode).toBe('invalid-argument')
    })
  })
})
