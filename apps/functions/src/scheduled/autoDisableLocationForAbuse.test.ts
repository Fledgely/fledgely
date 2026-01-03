/**
 * Tests for Auto-Disable Location for Abuse Scheduled Function
 *
 * Story 40.6: Location Feature Abuse Prevention
 * - AC6: Auto-disable capability
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkAutoDisableThreshold, isAlreadyAutoDisabled } from './autoDisableLocationForAbuse'
import { LOCATION_ABUSE_THRESHOLDS } from '@fledgely/shared'

// Mock Firebase Admin
const mockGet = vi.fn()
const mockWhere = vi.fn(() => ({
  where: mockWhere,
  get: mockGet,
  limit: vi.fn(() => ({ get: mockGet })),
}))

vi.mock('firebase-admin/firestore', () => {
  const mockTimestamp = {
    fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
    now: vi.fn(() => ({ toDate: () => new Date() })),
  }

  return {
    getFirestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: mockGet,
          set: vi.fn(),
          update: vi.fn(),
          collection: vi.fn(() => ({
            doc: vi.fn(() => ({
              id: 'mock-disable-id',
              set: vi.fn(),
            })),
            where: mockWhere,
          })),
        })),
        where: mockWhere,
      })),
      batch: vi.fn(() => ({
        set: vi.fn(),
        commit: vi.fn(),
      })),
    })),
    Timestamp: mockTimestamp,
  }
})

describe('autoDisableLocationForAbuse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkAutoDisableThreshold', () => {
    it('returns shouldDisable=false when alerts below threshold', async () => {
      mockGet.mockResolvedValue({
        docs: [{ id: 'alert-1' }, { id: 'alert-2' }],
      })

      const result = await checkAutoDisableThreshold('family-123')

      expect(result.shouldDisable).toBe(false)
      expect(result.alertCount).toBe(2)
      expect(result.alertIds).toEqual(['alert-1', 'alert-2'])
    })

    it('returns shouldDisable=true when alerts at threshold', async () => {
      mockGet.mockResolvedValue({
        docs: [{ id: 'alert-1' }, { id: 'alert-2' }, { id: 'alert-3' }],
      })

      const result = await checkAutoDisableThreshold('family-123')

      expect(result.shouldDisable).toBe(true)
      expect(result.alertCount).toBe(3)
      expect(result.alertIds).toEqual(['alert-1', 'alert-2', 'alert-3'])
    })

    it('returns shouldDisable=true when alerts above threshold', async () => {
      mockGet.mockResolvedValue({
        docs: [{ id: 'alert-1' }, { id: 'alert-2' }, { id: 'alert-3' }, { id: 'alert-4' }],
      })

      const result = await checkAutoDisableThreshold('family-123')

      expect(result.shouldDisable).toBe(true)
      expect(result.alertCount).toBe(4)
    })

    it('returns shouldDisable=false when no alerts', async () => {
      mockGet.mockResolvedValue({
        docs: [],
      })

      const result = await checkAutoDisableThreshold('family-123')

      expect(result.shouldDisable).toBe(false)
      expect(result.alertCount).toBe(0)
      expect(result.alertIds).toEqual([])
    })
  })

  describe('isAlreadyAutoDisabled', () => {
    it('returns false when no active disable exists', async () => {
      mockGet.mockResolvedValue({
        empty: true,
        docs: [],
      })

      const result = await isAlreadyAutoDisabled('family-123')

      expect(result).toBe(false)
    })

    it('returns true when active disable exists', async () => {
      mockGet.mockResolvedValue({
        empty: false,
        docs: [{ id: 'disable-1' }],
      })

      const result = await isAlreadyAutoDisabled('family-123')

      expect(result).toBe(true)
    })
  })

  describe('Threshold constants', () => {
    it('threshold is 3 alerts', () => {
      expect(LOCATION_ABUSE_THRESHOLDS.AUTO_DISABLE_ALERT_COUNT).toBe(3)
    })

    it('window is 30 days', () => {
      expect(LOCATION_ABUSE_THRESHOLDS.AUTO_DISABLE_WINDOW_DAYS).toBe(30)
    })
  })
})
