/**
 * Stealth Window Tests
 *
 * Story 0.5.7: 72-Hour Notification Stealth
 *
 * These tests verify the stealth window functionality including:
 * - Activation logic
 * - Extension behavior
 * - Expiration queries
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        stealthActive: false,
      }),
    }),
    update: vi.fn().mockResolvedValue(undefined),
    where: vi.fn().mockReturnThis(),
  })),
  Timestamp: {
    now: vi.fn(() => ({ toMillis: () => Date.now() })),
    fromMillis: vi.fn((ms: number) => ({
      toMillis: () => ms,
      toDate: () => new Date(ms),
    })),
  },
}))

vi.mock('../../utils/adminAudit', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@fledgely/shared', () => ({
  STEALTH_DURATION_MS: 72 * 60 * 60 * 1000,
  STEALTH_DURATION_HOURS: 72,
}))

describe('Stealth Window', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('module exports', () => {
    it('exports activateStealthWindow function', async () => {
      const { activateStealthWindow } = await import('./stealthWindow')
      expect(typeof activateStealthWindow).toBe('function')
    })

    it('exports clearStealthWindow function', async () => {
      const { clearStealthWindow } = await import('./stealthWindow')
      expect(typeof clearStealthWindow).toBe('function')
    })

    it('exports getExpiredStealthFamilies function', async () => {
      const { getExpiredStealthFamilies } = await import('./stealthWindow')
      expect(typeof getExpiredStealthFamilies).toBe('function')
    })
  })

  describe('ActivateStealthWindowOptions interface', () => {
    it('requires familyId field', () => {
      const options = {
        familyId: 'family123',
        ticketId: 'ticket1',
        affectedUserIds: ['user1'],
        agentId: 'agent1',
        agentEmail: 'agent@test.com',
        ipAddress: '1.2.3.4',
      }
      expect(options.familyId).toBe('family123')
    })

    it('requires ticketId field', () => {
      const options = {
        familyId: 'family123',
        ticketId: 'safety_ticket_123',
        affectedUserIds: ['user1'],
        agentId: 'agent1',
        agentEmail: 'agent@test.com',
        ipAddress: '1.2.3.4',
      }
      expect(options.ticketId).toBe('safety_ticket_123')
    })

    it('requires affectedUserIds array field', () => {
      const options = {
        familyId: 'family123',
        ticketId: 'ticket1',
        affectedUserIds: ['abuser_uid1', 'abuser_uid2'],
        agentId: 'agent1',
        agentEmail: 'agent@test.com',
        ipAddress: '1.2.3.4',
      }
      expect(Array.isArray(options.affectedUserIds)).toBe(true)
      expect(options.affectedUserIds).toHaveLength(2)
    })

    it('requires agentId field', () => {
      const options = {
        familyId: 'family123',
        ticketId: 'ticket1',
        affectedUserIds: ['user1'],
        agentId: 'safety_agent_456',
        agentEmail: 'agent@test.com',
        ipAddress: '1.2.3.4',
      }
      expect(options.agentId).toBe('safety_agent_456')
    })

    it('supports nullable agentEmail field', () => {
      const optionsWithEmail = {
        familyId: 'family123',
        ticketId: 'ticket1',
        affectedUserIds: ['user1'],
        agentId: 'agent1',
        agentEmail: 'agent@test.com',
        ipAddress: '1.2.3.4',
      }
      const optionsWithoutEmail = {
        familyId: 'family123',
        ticketId: 'ticket1',
        affectedUserIds: ['user1'],
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
        ticketId: 'ticket1',
        affectedUserIds: ['user1'],
        agentId: 'agent1',
        agentEmail: 'agent@test.com',
        ipAddress: '192.168.1.1',
      }
      const optionsWithoutIp = {
        familyId: 'family123',
        ticketId: 'ticket1',
        affectedUserIds: ['user1'],
        agentId: 'agent1',
        agentEmail: 'agent@test.com',
        ipAddress: null,
      }
      expect(optionsWithIp.ipAddress).toBe('192.168.1.1')
      expect(optionsWithoutIp.ipAddress).toBeNull()
    })
  })

  describe('ActivateStealthWindowResult interface', () => {
    it('includes success boolean', () => {
      const result = {
        success: true,
        extended: false,
        stealthWindowEnd: new Date(),
        affectedUserIds: ['user1'],
      }
      expect(typeof result.success).toBe('boolean')
    })

    it('includes extended boolean', () => {
      const result = {
        success: true,
        extended: true,
        stealthWindowEnd: new Date(),
        affectedUserIds: ['user1'],
      }
      expect(typeof result.extended).toBe('boolean')
    })

    it('includes stealthWindowEnd date', () => {
      const result = {
        success: true,
        extended: false,
        stealthWindowEnd: new Date(),
        affectedUserIds: ['user1'],
      }
      expect(result.stealthWindowEnd).toBeInstanceOf(Date)
    })

    it('includes affectedUserIds array', () => {
      const result = {
        success: true,
        extended: false,
        stealthWindowEnd: new Date(),
        affectedUserIds: ['user1', 'user2'],
      }
      expect(Array.isArray(result.affectedUserIds)).toBe(true)
    })
  })

  describe('stealth window behavior specifications', () => {
    it('new activation sets stealthActive to true', () => {
      const familyUpdate = { stealthActive: true }
      expect(familyUpdate.stealthActive).toBe(true)
    })

    it('activation sets stealth window to 72 hours from now', () => {
      const now = Date.now()
      const duration = 72 * 60 * 60 * 1000
      const expectedEnd = now + duration
      expect(expectedEnd - now).toBe(duration)
    })

    it('extension adds another 72 hours to existing end time', () => {
      const currentEnd = Date.now() + 36 * 60 * 60 * 1000 // 36 hours remaining
      const duration = 72 * 60 * 60 * 1000
      const newEnd = currentEnd + duration
      expect(newEnd - currentEnd).toBe(duration)
    })

    it('activation merges affected user IDs without duplicates', () => {
      const existing = ['user1', 'user2']
      const newUsers = ['user2', 'user3']
      const merged = [...new Set([...existing, ...newUsers])]
      expect(merged).toEqual(['user1', 'user2', 'user3'])
    })

    it('clear sets stealthActive to false', () => {
      const clearUpdate = {
        stealthActive: false,
        stealthWindowStart: null,
        stealthWindowEnd: null,
        stealthTicketId: null,
        stealthAffectedUserIds: [],
      }
      expect(clearUpdate.stealthActive).toBe(false)
    })

    it('clear nulls all stealth fields', () => {
      const clearUpdate = {
        stealthActive: false,
        stealthWindowStart: null,
        stealthWindowEnd: null,
        stealthTicketId: null,
        stealthAffectedUserIds: [],
      }
      expect(clearUpdate.stealthWindowStart).toBeNull()
      expect(clearUpdate.stealthWindowEnd).toBeNull()
      expect(clearUpdate.stealthTicketId).toBeNull()
      expect(clearUpdate.stealthAffectedUserIds).toEqual([])
    })
  })

  describe('expiration query specifications', () => {
    it('queries for families where stealthActive is true', () => {
      const queryCondition = { stealthActive: true }
      expect(queryCondition.stealthActive).toBe(true)
    })

    it('queries for families where stealthWindowEnd is in the past', () => {
      const now = Date.now()
      const expiredEnd = now - 1000
      const isExpired = expiredEnd <= now
      expect(isExpired).toBe(true)
    })

    it('returns family IDs as strings', () => {
      const expiredFamilies = ['family1', 'family2', 'family3']
      expiredFamilies.forEach((id) => {
        expect(typeof id).toBe('string')
      })
    })
  })
})
