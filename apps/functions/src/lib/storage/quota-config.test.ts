/**
 * Storage Quota Configuration Tests
 * Story 18.8: Storage Quota Monitoring
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getFamilyQuota,
  isAtWarningLevel,
  wouldExceedQuota,
  calculatePercentUsed,
  PLAN_QUOTAS,
  STORAGE_WARNING_THRESHOLD,
} from './quota-config'

// Mock Firestore
const mockGet = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
  }),
}))

describe('Storage Quota Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCollection.mockReturnValue({ doc: mockDoc })
    mockDoc.mockReturnValue({ get: mockGet })
  })

  describe('PLAN_QUOTAS', () => {
    it('has correct free tier quota (1GB)', () => {
      expect(PLAN_QUOTAS.free).toBe(1 * 1024 * 1024 * 1024)
    })

    it('has correct paid tier quota (10GB)', () => {
      expect(PLAN_QUOTAS.paid).toBe(10 * 1024 * 1024 * 1024)
    })
  })

  describe('STORAGE_WARNING_THRESHOLD', () => {
    it('is 80%', () => {
      expect(STORAGE_WARNING_THRESHOLD).toBe(0.8)
    })
  })

  describe('getFamilyQuota', () => {
    it('returns free tier defaults when family not found', async () => {
      mockGet.mockResolvedValue({ exists: false })

      const result = await getFamilyQuota('family123')

      expect(result).toEqual({
        quotaBytes: PLAN_QUOTAS.free,
        plan: 'free',
        isCustom: false,
      })
    })

    it('returns custom quota when set on family', async () => {
      const customQuota = 5 * 1024 * 1024 * 1024 // 5GB
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          storageQuotaBytes: customQuota,
          storagePlan: 'paid',
        }),
      })

      const result = await getFamilyQuota('family123')

      expect(result).toEqual({
        quotaBytes: customQuota,
        plan: 'paid',
        isCustom: true,
      })
    })

    it('returns paid tier quota for paid plan', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ storagePlan: 'paid' }),
      })

      const result = await getFamilyQuota('family123')

      expect(result).toEqual({
        quotaBytes: PLAN_QUOTAS.paid,
        plan: 'paid',
        isCustom: false,
      })
    })

    it('returns free tier quota when plan not set', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({}),
      })

      const result = await getFamilyQuota('family123')

      expect(result).toEqual({
        quotaBytes: PLAN_QUOTAS.free,
        plan: 'free',
        isCustom: false,
      })
    })

    it('returns free tier defaults on error', async () => {
      mockGet.mockRejectedValue(new Error('Firestore error'))

      const result = await getFamilyQuota('family123')

      expect(result).toEqual({
        quotaBytes: PLAN_QUOTAS.free,
        plan: 'free',
        isCustom: false,
      })
    })

    it('ignores invalid custom quota (non-number)', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          storageQuotaBytes: 'invalid',
          storagePlan: 'free',
        }),
      })

      const result = await getFamilyQuota('family123')

      expect(result.isCustom).toBe(false)
      expect(result.quotaBytes).toBe(PLAN_QUOTAS.free)
    })

    it('ignores zero custom quota', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          storageQuotaBytes: 0,
          storagePlan: 'paid',
        }),
      })

      const result = await getFamilyQuota('family123')

      expect(result.isCustom).toBe(false)
      expect(result.quotaBytes).toBe(PLAN_QUOTAS.paid)
    })
  })

  describe('isAtWarningLevel', () => {
    const quota = 1000

    it('returns false when below 80%', () => {
      expect(isAtWarningLevel(700, quota)).toBe(false)
      expect(isAtWarningLevel(799, quota)).toBe(false)
    })

    it('returns true when at exactly 80%', () => {
      expect(isAtWarningLevel(800, quota)).toBe(true)
    })

    it('returns true when above 80%', () => {
      expect(isAtWarningLevel(850, quota)).toBe(true)
      expect(isAtWarningLevel(1000, quota)).toBe(true)
    })
  })

  describe('wouldExceedQuota', () => {
    const quota = 1000

    it('returns false when within quota', () => {
      expect(wouldExceedQuota(500, 400, quota)).toBe(false)
      expect(wouldExceedQuota(999, 1, quota)).toBe(false)
    })

    it('returns false when exactly at quota', () => {
      expect(wouldExceedQuota(500, 500, quota)).toBe(false)
    })

    it('returns true when would exceed quota', () => {
      expect(wouldExceedQuota(500, 501, quota)).toBe(true)
      expect(wouldExceedQuota(900, 200, quota)).toBe(true)
    })
  })

  describe('calculatePercentUsed', () => {
    it('returns 0 when usage is 0', () => {
      expect(calculatePercentUsed(0, 1000)).toBe(0)
    })

    it('returns 100 when usage equals quota', () => {
      expect(calculatePercentUsed(1000, 1000)).toBe(100)
    })

    it('caps at 100 when over quota', () => {
      expect(calculatePercentUsed(1500, 1000)).toBe(100)
    })

    it('rounds to nearest integer', () => {
      expect(calculatePercentUsed(333, 1000)).toBe(33)
      expect(calculatePercentUsed(337, 1000)).toBe(34)
    })

    it('returns 100 when quota is 0', () => {
      expect(calculatePercentUsed(100, 0)).toBe(100)
    })
  })
})
