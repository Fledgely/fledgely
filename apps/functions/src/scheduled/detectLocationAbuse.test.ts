/**
 * Tests for Detect Location Abuse Scheduled Function
 *
 * Story 40.6: Location Feature Abuse Prevention
 * - AC1: Asymmetric location check detection
 * - AC2: Frequent rule change detection
 * - AC3: Cross-custody restriction detection
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import {
  detectAsymmetricChecks,
  detectFrequentRuleChanges,
  detectCrossCustodyRestriction,
  isDuplicatePattern,
} from './detectLocationAbuse'
import { getGuardianAccessCounts, calculateAsymmetry } from '../callable/trackLocationAccess'

// Mock the trackLocationAccess module
vi.mock('../callable/trackLocationAccess', () => ({
  getGuardianAccessCounts: vi.fn(),
  calculateAsymmetry: vi.fn(),
}))

// Mock Firebase Admin - using vi.hoisted to define mocks
const { mockDocGet, mockCollectionGet, mockWhere } = vi.hoisted(() => ({
  mockDocGet: vi.fn(),
  mockCollectionGet: vi.fn(),
  mockWhere: vi.fn(),
}))

vi.mock('firebase-admin/firestore', () => {
  const mockTimestamp = {
    fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
    now: vi.fn(() => ({ toDate: () => new Date() })),
  }

  // Setup mockWhere chain
  mockWhere.mockImplementation(() => ({
    where: mockWhere,
    get: mockCollectionGet,
    limit: vi.fn(() => ({ get: mockCollectionGet })),
  }))

  return {
    getFirestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: mockDocGet,
          set: vi.fn(),
          collection: vi.fn(() => ({
            doc: vi.fn(() => ({
              id: 'mock-pattern-id',
              set: vi.fn(),
            })),
            where: mockWhere,
            get: mockCollectionGet,
          })),
        })),
        where: mockWhere,
      })),
    })),
    Timestamp: mockTimestamp,
  }
})

// Cast mocked functions for use in tests
const mockedGetGuardianAccessCounts = getGuardianAccessCounts as Mock
const mockedCalculateAsymmetry = calculateAsymmetry as Mock

describe('detectLocationAbuse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('detectAsymmetricChecks', () => {
    it('returns null when no asymmetry detected', async () => {
      mockedGetGuardianAccessCounts.mockResolvedValue(
        new Map([
          ['user-1', 50],
          ['user-2', 40],
        ])
      )
      mockedCalculateAsymmetry.mockReturnValue({
        detected: false,
        ratio: 1.25,
        higherUid: 'user-1',
        higherCount: 50,
        lowerUid: 'user-2',
        lowerCount: 40,
      })

      const result = await detectAsymmetricChecks('family-123')

      expect(result).toBeNull()
    })

    it('returns pattern when asymmetry detected', async () => {
      mockedGetGuardianAccessCounts.mockResolvedValue(
        new Map([
          ['user-1', 100],
          ['user-2', 10],
        ])
      )
      mockedCalculateAsymmetry.mockReturnValue({
        detected: true,
        ratio: 10,
        higherUid: 'user-1',
        higherCount: 100,
        lowerUid: 'user-2',
        lowerCount: 10,
      })

      const result = await detectAsymmetricChecks('family-123')

      expect(result).not.toBeNull()
      expect(result?.patternType).toBe('asymmetric_checks')
      expect(result?.familyId).toBe('family-123')
      expect(result?.metadata).toEqual({
        higherUid: 'user-1',
        higherCount: 100,
        lowerUid: 'user-2',
        lowerCount: 10,
        ratio: 10,
      })
    })

    it('includes correct window dates', async () => {
      mockedGetGuardianAccessCounts.mockResolvedValue(
        new Map([
          ['user-1', 100],
          ['user-2', 5],
        ])
      )
      mockedCalculateAsymmetry.mockReturnValue({
        detected: true,
        ratio: 20,
        higherUid: 'user-1',
        higherCount: 100,
        lowerUid: 'user-2',
        lowerCount: 5,
      })

      const result = await detectAsymmetricChecks('family-123')

      expect(result?.windowStart).toBeInstanceOf(Date)
      expect(result?.windowEnd).toBeInstanceOf(Date)
      expect(result?.detectedAt).toBeInstanceOf(Date)

      // Window should be 7 days
      const windowMs = result!.windowEnd.getTime() - result!.windowStart.getTime()
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
      expect(Math.abs(windowMs - sevenDaysMs)).toBeLessThan(1000) // Within 1 second tolerance
    })
  })

  describe('detectFrequentRuleChanges', () => {
    it('returns null when changes below threshold', async () => {
      // Mock the audit log query
      mockCollectionGet.mockResolvedValueOnce({
        size: 2,
        empty: false,
        docs: [
          { id: 'change-1', data: () => ({ changeType: 'update', ruleId: 'rule-1' }) },
          { id: 'change-2', data: () => ({ changeType: 'update', ruleId: 'rule-2' }) },
        ],
      })

      const result = await detectFrequentRuleChanges('family-123')

      expect(result).toBeNull()
    })

    it('returns pattern when changes at threshold', async () => {
      // Mock the audit log query
      mockCollectionGet.mockResolvedValueOnce({
        size: 3,
        empty: false,
        docs: [
          { id: 'change-1', data: () => ({ changeType: 'create', ruleId: 'rule-1' }) },
          { id: 'change-2', data: () => ({ changeType: 'update', ruleId: 'rule-2' }) },
          { id: 'change-3', data: () => ({ changeType: 'delete', ruleId: 'rule-3' }) },
        ],
      })
      // Mock the family doc get for custody schedule
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ custodySchedule: null }),
      })

      const result = await detectFrequentRuleChanges('family-123')

      expect(result).not.toBeNull()
      expect(result?.patternType).toBe('frequent_rule_changes')
      expect(result?.metadata.changeCount).toBe(3)
    })

    it('collects unique change types', async () => {
      // Mock the audit log query
      mockCollectionGet.mockResolvedValueOnce({
        size: 4,
        empty: false,
        docs: [
          { id: '1', data: () => ({ changeType: 'create', ruleId: 'r1' }) },
          { id: '2', data: () => ({ changeType: 'update', ruleId: 'r2' }) },
          { id: '3', data: () => ({ changeType: 'update', ruleId: 'r3' }) },
          { id: '4', data: () => ({ changeType: 'delete', ruleId: 'r4' }) },
        ],
      })
      // Mock the family doc get for custody schedule
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ custodySchedule: null }),
      })

      const result = await detectFrequentRuleChanges('family-123')

      expect(result?.metadata.changeTypes).toContain('create')
      expect(result?.metadata.changeTypes).toContain('update')
      expect(result?.metadata.changeTypes).toContain('delete')
      expect(result?.metadata.changeTypes.length).toBe(3)
    })

    it('returns null when no changes exist', async () => {
      mockCollectionGet.mockResolvedValue({
        size: 0,
        empty: true,
        docs: [],
      })

      const result = await detectFrequentRuleChanges('family-123')

      expect(result).toBeNull()
    })
  })

  describe('detectCrossCustodyRestriction', () => {
    it('returns null when no rules exist', async () => {
      mockCollectionGet.mockResolvedValueOnce({
        empty: true,
        docs: [],
      })

      const result = await detectCrossCustodyRestriction('family-123')

      expect(result).toBeNull()
    })

    it('returns null when no custody schedule exists', async () => {
      mockCollectionGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'rule-1', data: () => ({ restrictive: true }) }],
      })
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ custodySchedule: null }),
      })

      const result = await detectCrossCustodyRestriction('family-123')

      expect(result).toBeNull()
    })
  })

  describe('isDuplicatePattern', () => {
    it('returns false when no recent patterns exist', async () => {
      mockCollectionGet.mockResolvedValue({
        empty: true,
        docs: [],
      })

      const result = await isDuplicatePattern('family-123', 'asymmetric_checks')

      expect(result).toBe(false)
    })

    it('returns true when recent pattern exists', async () => {
      mockCollectionGet.mockResolvedValue({
        empty: false,
        docs: [{ id: 'pattern-1' }],
      })

      const result = await isDuplicatePattern('family-123', 'asymmetric_checks')

      expect(result).toBe(true)
    })
  })
})
