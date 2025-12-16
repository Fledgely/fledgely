/**
 * Verify Emergency Pushes Tests
 *
 * Story 7.4: Emergency Allowlist Push - Task 5.6
 *
 * Tests for the emergency push verification scheduled function.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore
const mockGet = vi.fn()
const mockWhere = vi.fn()
const mockUpdate = vi.fn()
const mockAdd = vi.fn()
const mockCollection = vi.fn()
const mockRef = { update: mockUpdate }

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'mock-timestamp'),
  },
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() })),
  },
}))

// Mock firebase-functions/v2/scheduler
vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: vi.fn((_options, handler) => handler),
}))

// Mock @fledgely/shared - use importOriginal to get schema exports
vi.mock('@fledgely/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@fledgely/shared')>()
  return {
    ...actual,
    getCrisisAllowlist: vi.fn(() => ({
      version: '1.0.0-test',
      entries: [],
    })),
    getAllowlistVersion: vi.fn(() => '1.0.0-test'),
  }
})

import { __testing } from './verifyEmergencyPushes'
import type { EmergencyPushRecord } from '@fledgely/contracts'

const { verifyPushPropagation } = __testing

describe('verifyEmergencyPushes', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default collection mock behavior
    mockCollection.mockImplementation((name: string) => {
      if (name === 'crisis-allowlist-override') {
        return {
          where: mockWhere.mockReturnValue({
            get: mockGet,
          }),
        }
      }
      if (name === 'emergency-pushes') {
        return {
          where: mockWhere.mockReturnValue({
            get: mockGet,
          }),
        }
      }
      if (name === 'adminAuditLog') {
        return {
          add: mockAdd.mockResolvedValue({ id: 'audit-1' }),
        }
      }
      return {
        where: mockWhere,
        add: mockAdd,
      }
    })
  })

  describe('verifyPushPropagation', () => {
    it('returns verified:true when override entries exist and match count', async () => {
      const push: EmergencyPushRecord = {
        id: 'push-123',
        entries: [
          {
            id: 'entry-1',
            domain: 'test.org',
            category: 'crisis',
            aliases: [],
            wildcardPatterns: [],
            name: 'Test',
            description: 'Test',
            region: 'us',
            contactMethods: ['web'],
          },
        ],
        reason: 'Test push for verification',
        operator: 'admin@test.com',
        timestamp: new Date().toISOString(),
        status: 'propagated',
      }

      mockGet.mockResolvedValue({
        empty: false,
        size: 1,
      })

      const result = await verifyPushPropagation(push)

      expect(result.verified).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('returns verified:false when no override entries found', async () => {
      const push: EmergencyPushRecord = {
        id: 'push-456',
        entries: [
          {
            id: 'entry-1',
            domain: 'test.org',
            category: 'crisis',
            aliases: [],
            wildcardPatterns: [],
            name: 'Test',
            description: 'Test',
            region: 'us',
            contactMethods: ['web'],
          },
        ],
        reason: 'Test push for verification',
        operator: 'admin@test.com',
        timestamp: new Date().toISOString(),
        status: 'pending',
      }

      mockGet.mockResolvedValue({
        empty: true,
        size: 0,
      })

      const result = await verifyPushPropagation(push)

      expect(result.verified).toBe(false)
      expect(result.reason).toContain('No override entries found')
    })

    it('returns verified:false when entry count does not match', async () => {
      const push: EmergencyPushRecord = {
        id: 'push-789',
        entries: [
          {
            id: 'entry-1',
            domain: 'test1.org',
            category: 'crisis',
            aliases: [],
            wildcardPatterns: [],
            name: 'Test 1',
            description: 'Test',
            region: 'us',
            contactMethods: ['web'],
          },
          {
            id: 'entry-2',
            domain: 'test2.org',
            category: 'crisis',
            aliases: [],
            wildcardPatterns: [],
            name: 'Test 2',
            description: 'Test',
            region: 'us',
            contactMethods: ['web'],
          },
        ],
        reason: 'Test push for verification',
        operator: 'admin@test.com',
        timestamp: new Date().toISOString(),
        status: 'propagated',
      }

      // Only 1 entry found when 2 expected
      mockGet.mockResolvedValue({
        empty: false,
        size: 1,
      })

      const result = await verifyPushPropagation(push)

      expect(result.verified).toBe(false)
      expect(result.reason).toContain('Entry count mismatch')
      expect(result.reason).toContain('expected 2')
      expect(result.reason).toContain('found 1')
    })

    it('returns verified:false with error message on exception', async () => {
      const push: EmergencyPushRecord = {
        id: 'push-error',
        entries: [
          {
            id: 'entry-1',
            domain: 'test.org',
            category: 'crisis',
            aliases: [],
            wildcardPatterns: [],
            name: 'Test',
            description: 'Test',
            region: 'us',
            contactMethods: ['web'],
          },
        ],
        reason: 'Test push for verification',
        operator: 'admin@test.com',
        timestamp: new Date().toISOString(),
        status: 'pending',
      }

      mockGet.mockRejectedValue(new Error('Firestore connection error'))

      const result = await verifyPushPropagation(push)

      expect(result.verified).toBe(false)
      expect(result.reason).toContain('Firestore connection error')
    })
  })
})
