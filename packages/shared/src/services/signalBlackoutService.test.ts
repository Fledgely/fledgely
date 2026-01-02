/**
 * Signal Blackout Service Tests - Story 7.5.2 Task 6
 *
 * TDD tests for family notification blackout period management.
 * AC5: No family notification for 48 hours.
 *
 * CRITICAL: Blackout prevents families from seeing signal-related activity
 * during initial crisis response period.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isSignalInBlackout,
  startBlackoutPeriod,
  extendBlackoutPeriod,
  getBlackoutStatus,
  cancelBlackout,
  getActiveBlackouts,
  cleanupExpiredBlackouts,
  DEFAULT_BLACKOUT_HOURS,
  MAX_EXTENSION_HOURS,
  type BlackoutStatus as _BlackoutStatus,
  type BlackoutStore,
} from './signalBlackoutService'
import type { BlackoutRecord } from '../contracts/crisisPartner'

describe('Signal Blackout Service', () => {
  let mockStore: BlackoutStore

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock store for testing
    mockStore = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(),
      getBySignalId: vi.fn(),
    }
  })

  // ============================================
  // Constants Tests
  // ============================================

  describe('Constants', () => {
    it('should have default blackout of 48 hours', () => {
      expect(DEFAULT_BLACKOUT_HOURS).toBe(48)
    })

    it('should have maximum extension of 72 hours', () => {
      expect(MAX_EXTENSION_HOURS).toBe(72)
    })
  })

  // ============================================
  // startBlackoutPeriod Tests
  // ============================================

  describe('startBlackoutPeriod', () => {
    it('should create a blackout record with default 48 hours', async () => {
      const signalId = 'sig_123'

      mockStore.getBySignalId.mockResolvedValue(null)
      mockStore.set.mockResolvedValue(undefined)

      const record = await startBlackoutPeriod(signalId, mockStore)

      expect(record.signalId).toBe(signalId)
      expect(record.active).toBe(true)
      expect(mockStore.set).toHaveBeenCalledWith(record.id, record)
    })

    it('should create blackout with custom duration', async () => {
      const signalId = 'sig_123'
      const durationHours = 24

      mockStore.getBySignalId.mockResolvedValue(null)
      mockStore.set.mockResolvedValue(undefined)

      const record = await startBlackoutPeriod(signalId, mockStore, durationHours)

      const durationMs = record.expiresAt.getTime() - record.startedAt.getTime()
      const durationInHours = durationMs / (1000 * 60 * 60)

      expect(durationInHours).toBeCloseTo(24, 1)
    })

    it('should reject if blackout already exists', async () => {
      const signalId = 'sig_123'
      const existingRecord: BlackoutRecord = {
        id: 'blackout_existing',
        signalId,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        extendedBy: null,
        active: true,
      }

      mockStore.getBySignalId.mockResolvedValue(existingRecord)

      await expect(startBlackoutPeriod(signalId, mockStore)).rejects.toThrow(
        'Active blackout already exists'
      )
    })

    it('should allow new blackout if previous expired', async () => {
      const signalId = 'sig_123'
      const expiredRecord: BlackoutRecord = {
        id: 'blackout_old',
        signalId,
        startedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        extendedBy: null,
        active: false,
      }

      mockStore.getBySignalId.mockResolvedValue(expiredRecord)
      mockStore.set.mockResolvedValue(undefined)

      const record = await startBlackoutPeriod(signalId, mockStore)

      expect(record.signalId).toBe(signalId)
      expect(record.active).toBe(true)
    })

    it('should generate unique blackout ID', async () => {
      mockStore.getBySignalId.mockResolvedValue(null)
      mockStore.set.mockResolvedValue(undefined)

      const record1 = await startBlackoutPeriod('sig_1', mockStore)
      const record2 = await startBlackoutPeriod('sig_2', mockStore)

      expect(record1.id).not.toBe(record2.id)
    })

    it('should reject negative duration', async () => {
      mockStore.getBySignalId.mockResolvedValue(null)

      await expect(startBlackoutPeriod('sig_123', mockStore, -1)).rejects.toThrow(
        'Duration must be positive'
      )
    })

    it('should reject zero duration', async () => {
      mockStore.getBySignalId.mockResolvedValue(null)

      await expect(startBlackoutPeriod('sig_123', mockStore, 0)).rejects.toThrow(
        'Duration must be positive'
      )
    })
  })

  // ============================================
  // isSignalInBlackout Tests
  // ============================================

  describe('isSignalInBlackout', () => {
    it('should return true for active blackout', async () => {
      const signalId = 'sig_123'
      const activeRecord: BlackoutRecord = {
        id: 'blackout_1',
        signalId,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        extendedBy: null,
        active: true,
      }

      mockStore.getBySignalId.mockResolvedValue(activeRecord)

      const result = await isSignalInBlackout(signalId, mockStore)

      expect(result).toBe(true)
    })

    it('should return false for expired blackout', async () => {
      const signalId = 'sig_123'
      const expiredRecord: BlackoutRecord = {
        id: 'blackout_1',
        signalId,
        startedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        extendedBy: null,
        active: true, // Still marked active but time expired
      }

      mockStore.getBySignalId.mockResolvedValue(expiredRecord)

      const result = await isSignalInBlackout(signalId, mockStore)

      expect(result).toBe(false)
    })

    it('should return false for inactive blackout', async () => {
      const signalId = 'sig_123'
      const inactiveRecord: BlackoutRecord = {
        id: 'blackout_1',
        signalId,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        extendedBy: null,
        active: false,
      }

      mockStore.getBySignalId.mockResolvedValue(inactiveRecord)

      const result = await isSignalInBlackout(signalId, mockStore)

      expect(result).toBe(false)
    })

    it('should return false for no blackout', async () => {
      mockStore.getBySignalId.mockResolvedValue(null)

      const result = await isSignalInBlackout('sig_123', mockStore)

      expect(result).toBe(false)
    })
  })

  // ============================================
  // extendBlackoutPeriod Tests
  // ============================================

  describe('extendBlackoutPeriod', () => {
    it('should extend an active blackout', async () => {
      const signalId = 'sig_123'
      const partnerId = 'partner_456'
      const additionalHours = 24
      const originalExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

      const existingRecord: BlackoutRecord = {
        id: 'blackout_1',
        signalId,
        startedAt: new Date(),
        expiresAt: originalExpiry,
        extendedBy: null,
        active: true,
      }

      mockStore.getBySignalId.mockResolvedValue(existingRecord)
      mockStore.set.mockResolvedValue(undefined)

      const extended = await extendBlackoutPeriod(signalId, additionalHours, partnerId, mockStore)

      expect(extended.extendedBy).toBe(partnerId)
      expect(extended.expiresAt.getTime()).toBeGreaterThan(originalExpiry.getTime())
    })

    it('should reject extension without partner authorization', async () => {
      await expect(extendBlackoutPeriod('sig_123', 24, '', mockStore)).rejects.toThrow(
        'Partner authorization required'
      )
    })

    it('should reject extension for non-existent blackout', async () => {
      mockStore.getBySignalId.mockResolvedValue(null)

      await expect(extendBlackoutPeriod('sig_123', 24, 'partner_456', mockStore)).rejects.toThrow(
        'No active blackout found'
      )
    })

    it('should reject extension for expired blackout', async () => {
      const expiredRecord: BlackoutRecord = {
        id: 'blackout_1',
        signalId: 'sig_123',
        startedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        extendedBy: null,
        active: true,
      }

      mockStore.getBySignalId.mockResolvedValue(expiredRecord)

      await expect(extendBlackoutPeriod('sig_123', 24, 'partner_456', mockStore)).rejects.toThrow(
        'Blackout has expired'
      )
    })

    it('should reject extension exceeding maximum', async () => {
      const existingRecord: BlackoutRecord = {
        id: 'blackout_1',
        signalId: 'sig_123',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        extendedBy: null,
        active: true,
      }

      mockStore.getBySignalId.mockResolvedValue(existingRecord)

      await expect(
        extendBlackoutPeriod('sig_123', MAX_EXTENSION_HOURS + 1, 'partner_456', mockStore)
      ).rejects.toThrow('Extension exceeds maximum')
    })

    it('should allow multiple extensions up to max', async () => {
      const signalId = 'sig_123'
      const partnerA = 'partner_A'
      const partnerB = 'partner_B'

      const existingRecord: BlackoutRecord = {
        id: 'blackout_1',
        signalId,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        extendedBy: null,
        active: true,
      }

      mockStore.getBySignalId.mockResolvedValue(existingRecord)
      mockStore.set.mockImplementation(async (_, record) => {
        mockStore.getBySignalId.mockResolvedValue(record as BlackoutRecord)
      })

      const first = await extendBlackoutPeriod(signalId, 24, partnerA, mockStore)
      expect(first.extendedBy).toBe(partnerA)

      const second = await extendBlackoutPeriod(signalId, 24, partnerB, mockStore)
      expect(second.extendedBy).toBe(partnerB)
    })
  })

  // ============================================
  // getBlackoutStatus Tests
  // ============================================

  describe('getBlackoutStatus', () => {
    it('should return active status for ongoing blackout', async () => {
      const signalId = 'sig_123'
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

      const record: BlackoutRecord = {
        id: 'blackout_1',
        signalId,
        startedAt: new Date(),
        expiresAt,
        extendedBy: null,
        active: true,
      }

      mockStore.getBySignalId.mockResolvedValue(record)

      const status = await getBlackoutStatus(signalId, mockStore)

      expect(status.inBlackout).toBe(true)
      expect(status.expiresAt).toEqual(expiresAt)
      expect(status.remainingHours).toBeGreaterThan(0)
    })

    it('should return inactive status for expired blackout', async () => {
      const signalId = 'sig_123'

      const record: BlackoutRecord = {
        id: 'blackout_1',
        signalId,
        startedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 1000),
        extendedBy: null,
        active: true,
      }

      mockStore.getBySignalId.mockResolvedValue(record)

      const status = await getBlackoutStatus(signalId, mockStore)

      expect(status.inBlackout).toBe(false)
      expect(status.remainingHours).toBe(0)
    })

    it('should return not-found status for no blackout', async () => {
      mockStore.getBySignalId.mockResolvedValue(null)

      const status = await getBlackoutStatus('sig_123', mockStore)

      expect(status.inBlackout).toBe(false)
      expect(status.blackoutId).toBeNull()
    })

    it('should include extension info', async () => {
      const signalId = 'sig_123'
      const partnerId = 'partner_456'

      const record: BlackoutRecord = {
        id: 'blackout_1',
        signalId,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        extendedBy: partnerId,
        active: true,
      }

      mockStore.getBySignalId.mockResolvedValue(record)

      const status = await getBlackoutStatus(signalId, mockStore)

      expect(status.extendedBy).toBe(partnerId)
    })
  })

  // ============================================
  // cancelBlackout Tests
  // ============================================

  describe('cancelBlackout', () => {
    it('should cancel an active blackout', async () => {
      const signalId = 'sig_123'
      const partnerId = 'partner_456'

      const record: BlackoutRecord = {
        id: 'blackout_1',
        signalId,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        extendedBy: null,
        active: true,
      }

      mockStore.getBySignalId.mockResolvedValue(record)
      mockStore.set.mockResolvedValue(undefined)

      const cancelled = await cancelBlackout(signalId, partnerId, mockStore)

      expect(cancelled.active).toBe(false)
      expect(mockStore.set).toHaveBeenCalled()
    })

    it('should reject cancellation without partner authorization', async () => {
      await expect(cancelBlackout('sig_123', '', mockStore)).rejects.toThrow(
        'Partner authorization required'
      )
    })

    it('should reject cancellation for non-existent blackout', async () => {
      mockStore.getBySignalId.mockResolvedValue(null)

      await expect(cancelBlackout('sig_123', 'partner_456', mockStore)).rejects.toThrow(
        'No blackout found'
      )
    })
  })

  // ============================================
  // getActiveBlackouts Tests
  // ============================================

  describe('getActiveBlackouts', () => {
    it('should return all active blackouts', async () => {
      const records: BlackoutRecord[] = [
        {
          id: 'blackout_1',
          signalId: 'sig_1',
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          extendedBy: null,
          active: true,
        },
        {
          id: 'blackout_2',
          signalId: 'sig_2',
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          extendedBy: null,
          active: true,
        },
        {
          id: 'blackout_3',
          signalId: 'sig_3',
          startedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          extendedBy: null,
          active: false,
        },
      ]

      mockStore.getAll.mockResolvedValue(records)

      const active = await getActiveBlackouts(mockStore)

      expect(active).toHaveLength(2)
      expect(active.map((r) => r.id)).toContain('blackout_1')
      expect(active.map((r) => r.id)).toContain('blackout_2')
    })

    it('should return empty array if no active blackouts', async () => {
      mockStore.getAll.mockResolvedValue([])

      const active = await getActiveBlackouts(mockStore)

      expect(active).toHaveLength(0)
    })

    it('should filter out expired but still marked active', async () => {
      const records: BlackoutRecord[] = [
        {
          id: 'blackout_1',
          signalId: 'sig_1',
          startedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
          extendedBy: null,
          active: true, // Still marked active
        },
      ]

      mockStore.getAll.mockResolvedValue(records)

      const active = await getActiveBlackouts(mockStore)

      expect(active).toHaveLength(0)
    })
  })

  // ============================================
  // cleanupExpiredBlackouts Tests
  // ============================================

  describe('cleanupExpiredBlackouts', () => {
    it('should mark expired blackouts as inactive', async () => {
      const records: BlackoutRecord[] = [
        {
          id: 'blackout_1',
          signalId: 'sig_1',
          startedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          extendedBy: null,
          active: true,
        },
        {
          id: 'blackout_2',
          signalId: 'sig_2',
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          extendedBy: null,
          active: true,
        },
      ]

      mockStore.getAll.mockResolvedValue(records)
      mockStore.set.mockResolvedValue(undefined)

      const cleaned = await cleanupExpiredBlackouts(mockStore)

      expect(cleaned).toBe(1)
      expect(mockStore.set).toHaveBeenCalledTimes(1)
    })

    it('should return 0 if no expired blackouts', async () => {
      const records: BlackoutRecord[] = [
        {
          id: 'blackout_1',
          signalId: 'sig_1',
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          extendedBy: null,
          active: true,
        },
      ]

      mockStore.getAll.mockResolvedValue(records)

      const cleaned = await cleanupExpiredBlackouts(mockStore)

      expect(cleaned).toBe(0)
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('should handle blackout expiring during check', async () => {
      const signalId = 'sig_123'

      // Blackout expires in 1ms
      const record: BlackoutRecord = {
        id: 'blackout_1',
        signalId,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 1),
        extendedBy: null,
        active: true,
      }

      mockStore.getBySignalId.mockResolvedValue(record)

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 10))

      const result = await isSignalInBlackout(signalId, mockStore)

      expect(result).toBe(false)
    })

    it('should handle concurrent extensions', async () => {
      const signalId = 'sig_123'

      const record: BlackoutRecord = {
        id: 'blackout_1',
        signalId,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        extendedBy: null,
        active: true,
      }

      mockStore.getBySignalId.mockResolvedValue(record)
      mockStore.set.mockResolvedValue(undefined)

      // Simulate concurrent extensions
      const [result1, result2] = await Promise.all([
        extendBlackoutPeriod(signalId, 12, 'partner_A', mockStore),
        extendBlackoutPeriod(signalId, 12, 'partner_B', mockStore),
      ])

      // Both should succeed (last write wins in mock)
      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
    })
  })
})
