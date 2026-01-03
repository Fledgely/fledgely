/**
 * Tests for Track Location Access Callable Function
 *
 * Story 40.6: Location Feature Abuse Prevention
 * - AC1: Asymmetric location check detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trackLocationAccessInputSchema } from '@fledgely/shared'
import { calculateAsymmetry } from './trackLocationAccess'

// Mock Firebase Admin
vi.mock('firebase-admin/firestore', () => {
  const mockTimestamp = {
    fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
    now: vi.fn(() => ({ toDate: () => new Date() })),
  }

  return {
    getFirestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn(),
          set: vi.fn(),
          collection: vi.fn(() => ({
            doc: vi.fn(() => ({
              set: vi.fn(),
              id: 'mock-log-id',
            })),
            where: vi.fn(() => ({
              where: vi.fn(() => ({
                get: vi.fn(),
              })),
              limit: vi.fn(() => ({
                get: vi.fn(),
              })),
            })),
          })),
        })),
      })),
    })),
    Timestamp: mockTimestamp,
    FieldValue: {
      serverTimestamp: vi.fn(),
    },
  }
})

describe('trackLocationAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateAsymmetry', () => {
    it('detects asymmetry when ratio exceeds 10x', () => {
      const counts = new Map([
        ['user-1', 100],
        ['user-2', 10],
      ])

      const result = calculateAsymmetry(counts)

      expect(result.detected).toBe(true)
      expect(result.ratio).toBe(10)
      expect(result.higherUid).toBe('user-1')
      expect(result.higherCount).toBe(100)
      expect(result.lowerUid).toBe('user-2')
      expect(result.lowerCount).toBe(10)
    })

    it('does not detect asymmetry when ratio is below 10x', () => {
      const counts = new Map([
        ['user-1', 50],
        ['user-2', 10],
      ])

      const result = calculateAsymmetry(counts)

      expect(result.detected).toBe(false)
      expect(result.ratio).toBe(5)
    })

    it('handles equal counts', () => {
      const counts = new Map([
        ['user-1', 50],
        ['user-2', 50],
      ])

      const result = calculateAsymmetry(counts)

      expect(result.detected).toBe(false)
      expect(result.ratio).toBe(1)
    })

    it('handles zero counts for lower user', () => {
      const counts = new Map([
        ['user-1', 100],
        ['user-2', 0],
      ])

      const result = calculateAsymmetry(counts)

      expect(result.detected).toBe(true)
      // Infinite ratio is capped for display
      expect(result.ratio).toBeGreaterThan(10)
    })

    it('handles single guardian', () => {
      const counts = new Map([['user-1', 50]])

      const result = calculateAsymmetry(counts)

      expect(result.detected).toBe(false)
      expect(result.ratio).toBe(0)
      expect(result.higherUid).toBe('user-1')
      expect(result.lowerUid).toBeNull()
    })

    it('handles empty counts', () => {
      const counts = new Map<string, number>()

      const result = calculateAsymmetry(counts)

      expect(result.detected).toBe(false)
      expect(result.ratio).toBe(0)
      expect(result.higherUid).toBeNull()
      expect(result.lowerUid).toBeNull()
    })

    it('handles more than two guardians', () => {
      const counts = new Map([
        ['user-1', 100],
        ['user-2', 50],
        ['user-3', 5],
      ])

      const result = calculateAsymmetry(counts)

      // Should compare highest to lowest
      expect(result.detected).toBe(true)
      expect(result.ratio).toBe(20)
      expect(result.higherUid).toBe('user-1')
      expect(result.lowerUid).toBe('user-3')
    })

    it('detects exact 10x ratio threshold', () => {
      const counts = new Map([
        ['user-1', 100],
        ['user-2', 10],
      ])

      const result = calculateAsymmetry(counts)

      expect(result.detected).toBe(true)
      expect(result.ratio).toBe(10)
    })

    it('does not detect at 9.9x ratio', () => {
      const counts = new Map([
        ['user-1', 99],
        ['user-2', 10],
      ])

      const result = calculateAsymmetry(counts)

      expect(result.detected).toBe(false)
      expect(result.ratio).toBe(9.9)
    })

    it('handles both users having zero counts', () => {
      const counts = new Map([
        ['user-1', 0],
        ['user-2', 0],
      ])

      const result = calculateAsymmetry(counts)

      expect(result.detected).toBe(false)
      expect(result.ratio).toBe(0)
    })
  })

  describe('Input validation', () => {
    it('requires familyId', () => {
      const input = {
        childId: 'child-123',
        accessType: 'status_check',
      }

      const result = trackLocationAccessInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('requires childId', () => {
      const input = {
        familyId: 'family-123',
        accessType: 'status_check',
      }

      const result = trackLocationAccessInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('validates accessType enum', () => {
      const input = {
        familyId: 'family-123',
        childId: 'child-456',
        accessType: 'invalid_type',
      }

      const result = trackLocationAccessInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('accepts valid input', () => {
      const input = {
        familyId: 'family-123',
        childId: 'child-456',
        accessType: 'status_check',
      }

      const result = trackLocationAccessInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('accepts history_view access type', () => {
      const input = {
        familyId: 'family-123',
        childId: 'child-456',
        accessType: 'history_view',
      }

      const result = trackLocationAccessInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('accepts zone_view access type', () => {
      const input = {
        familyId: 'family-123',
        childId: 'child-456',
        accessType: 'zone_view',
      }

      const result = trackLocationAccessInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })
})
