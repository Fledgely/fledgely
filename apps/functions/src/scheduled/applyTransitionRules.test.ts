/**
 * Apply Transition Rules Scheduled Function Tests - Story 40.4
 *
 * Tests for the scheduled function that applies location rules after grace period.
 *
 * Acceptance Criteria:
 * - AC2: 5-minute Grace Period
 * - AC4: Rules Applied After Grace Period
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Create mock functions
const mockCollectionGroupGet = vi.fn()
const mockZoneGet = vi.fn()
const mockRulesGet = vi.fn()
const mockSettingsGet = vi.fn()
const mockSettingsSet = vi.fn()
const mockNotificationSet = vi.fn()
const mockTransitionUpdate = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collectionGroup: () => ({
      where: () => ({
        where: () => ({
          get: mockCollectionGroupGet,
        }),
      }),
    }),
    collection: (name: string) => {
      if (name === 'families') {
        return {
          doc: () => ({
            collection: (subName: string) => {
              if (subName === 'locationZones') {
                return {
                  doc: () => ({
                    get: mockZoneGet,
                  }),
                }
              }
              if (subName === 'locationRules') {
                return {
                  where: () => ({
                    where: () => ({
                      limit: () => ({
                        get: mockRulesGet,
                      }),
                    }),
                  }),
                }
              }
              if (subName === 'childSettings') {
                return {
                  doc: () => ({
                    get: mockSettingsGet,
                    set: mockSettingsSet,
                  }),
                }
              }
              if (subName === 'notifications') {
                return {
                  doc: () => ({
                    set: mockNotificationSet,
                  }),
                }
              }
              return { doc: vi.fn() }
            },
          }),
        }
      }
      return { doc: vi.fn() }
    },
  }),
  Timestamp: {
    now: () => ({ toDate: () => new Date(), seconds: Math.floor(Date.now() / 1000) }),
    fromDate: (d: Date) => ({ toDate: () => d, seconds: Math.floor(d.getTime() / 1000) }),
  },
}))

// Mock firebase-functions/v2/scheduler
vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: (_schedule: string, handler: () => Promise<void>) => handler,
}))

import { applyTransitionRules } from './applyTransitionRules'

describe('applyTransitionRules Scheduled Function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when no expired transitions', () => {
    it('should return early without processing', async () => {
      mockCollectionGroupGet.mockResolvedValueOnce({ empty: true, docs: [] })

      await applyTransitionRules()

      // Should not query for zones
      expect(mockZoneGet).not.toHaveBeenCalled()
    })
  })

  describe('when grace period not yet expired', () => {
    it('should skip transition with future grace period', async () => {
      const futureDate = new Date(Date.now() + 5 * 60 * 1000)

      const transitionDoc = {
        id: 'trans-1',
        ref: {
          path: 'families/family-123/locationTransitions/trans-1',
          update: mockTransitionUpdate,
        },
        data: () => ({
          childId: 'child-789',
          deviceId: 'device-456',
          toZoneId: 'zone-school',
          fromZoneId: null,
          gracePeriodEndsAt: { toDate: () => futureDate },
        }),
      }

      mockCollectionGroupGet.mockResolvedValueOnce({
        empty: false,
        size: 1,
        docs: [transitionDoc],
      })

      await applyTransitionRules()

      // Should not update transition (grace period not expired)
      expect(mockTransitionUpdate).not.toHaveBeenCalled()
    })
  })

  describe('when transitioning to a zone with rules', () => {
    it('should apply zone rules to child settings', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000)

      const transitionDoc = {
        id: 'trans-1',
        ref: {
          path: 'families/family-123/locationTransitions/trans-1',
          update: mockTransitionUpdate,
        },
        data: () => ({
          childId: 'child-789',
          deviceId: 'device-456',
          toZoneId: 'zone-school',
          fromZoneId: null,
          gracePeriodEndsAt: { toDate: () => pastDate },
        }),
      }

      mockCollectionGroupGet.mockResolvedValueOnce({
        empty: false,
        size: 1,
        docs: [transitionDoc],
      })

      mockZoneGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'School' }),
      })

      mockRulesGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            data: () => ({
              dailyTimeLimitMinutes: 60,
              educationOnlyMode: true,
              categoryOverrides: { gaming: 'blocked' },
            }),
          },
        ],
      })

      mockSettingsGet.mockResolvedValueOnce({
        data: () => ({ dailyTimeLimitMinutes: 120 }),
      })

      mockSettingsSet.mockResolvedValueOnce(undefined)
      mockNotificationSet.mockResolvedValueOnce(undefined)

      await applyTransitionRules()

      // Should mark transition as applied with rules
      expect(mockTransitionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          appliedAt: expect.anything(),
          rulesApplied: expect.objectContaining({
            dailyTimeLimitMinutes: 60,
            educationOnlyMode: true,
          }),
        })
      )
    })

    it('should send rules applied notification to child', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000)

      const transitionDoc = {
        id: 'trans-1',
        ref: {
          path: 'families/family-123/locationTransitions/trans-1',
          update: mockTransitionUpdate,
        },
        data: () => ({
          childId: 'child-789',
          deviceId: 'device-456',
          toZoneId: 'zone-school',
          fromZoneId: null,
          gracePeriodEndsAt: { toDate: () => pastDate },
        }),
      }

      mockCollectionGroupGet.mockResolvedValueOnce({
        empty: false,
        size: 1,
        docs: [transitionDoc],
      })

      mockZoneGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'School' }),
      })

      mockRulesGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            data: () => ({
              dailyTimeLimitMinutes: 60,
              educationOnlyMode: true,
              categoryOverrides: {},
            }),
          },
        ],
      })

      mockSettingsGet.mockResolvedValueOnce({
        data: () => ({}),
      })

      await applyTransitionRules()

      // Should create notification
      expect(mockNotificationSet).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rules_applied',
          recipientType: 'child',
          recipientId: 'child-789',
          message: expect.stringContaining('School'),
        })
      )
    })
  })

  describe('when transitioning to a zone without rules', () => {
    it('should apply null rules', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000)

      const transitionDoc = {
        id: 'trans-1',
        ref: {
          path: 'families/family-123/locationTransitions/trans-1',
          update: mockTransitionUpdate,
        },
        data: () => ({
          childId: 'child-789',
          deviceId: 'device-456',
          toZoneId: 'zone-school',
          fromZoneId: null,
          gracePeriodEndsAt: { toDate: () => pastDate },
        }),
      }

      mockCollectionGroupGet.mockResolvedValueOnce({
        empty: false,
        size: 1,
        docs: [transitionDoc],
      })

      mockZoneGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'School' }),
      })

      mockRulesGet.mockResolvedValueOnce({
        empty: true,
        docs: [],
      })

      await applyTransitionRules()

      // Should mark transition as applied with null rules
      expect(mockTransitionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          appliedAt: expect.anything(),
          rulesApplied: null,
        })
      )
    })
  })

  describe('when zone does not exist', () => {
    it('should mark transition as applied without applying rules', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000)

      const transitionDoc = {
        id: 'trans-1',
        ref: {
          path: 'families/family-123/locationTransitions/trans-1',
          update: mockTransitionUpdate,
        },
        data: () => ({
          childId: 'child-789',
          deviceId: 'device-456',
          toZoneId: 'zone-deleted',
          fromZoneId: null,
          gracePeriodEndsAt: { toDate: () => pastDate },
        }),
      }

      mockCollectionGroupGet.mockResolvedValueOnce({
        empty: false,
        size: 1,
        docs: [transitionDoc],
      })

      mockZoneGet.mockResolvedValueOnce({
        exists: false,
      })

      await applyTransitionRules()

      // Should mark transition as applied
      expect(mockTransitionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          appliedAt: expect.anything(),
        })
      )
    })
  })

  describe('when transitioning to unknown location (null toZoneId)', () => {
    it('should mark transition as applied without applying rules', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000)

      const transitionDoc = {
        id: 'trans-1',
        ref: {
          path: 'families/family-123/locationTransitions/trans-1',
          update: mockTransitionUpdate,
        },
        data: () => ({
          childId: 'child-789',
          deviceId: 'device-456',
          toZoneId: null,
          fromZoneId: 'zone-school',
          gracePeriodEndsAt: { toDate: () => pastDate },
        }),
      }

      mockCollectionGroupGet.mockResolvedValueOnce({
        empty: false,
        size: 1,
        docs: [transitionDoc],
      })

      await applyTransitionRules()

      // Should mark transition as applied with null rules
      expect(mockTransitionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          appliedAt: expect.anything(),
          rulesApplied: null,
        })
      )
    })
  })

  describe('error handling', () => {
    it('should continue processing other transitions on error', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000)

      const transitionDoc1 = {
        id: 'trans-1',
        ref: {
          path: 'families/family-123/locationTransitions/trans-1',
          update: vi.fn().mockRejectedValue(new Error('Update failed')),
        },
        data: () => ({
          childId: 'child-789',
          toZoneId: null,
          gracePeriodEndsAt: { toDate: () => pastDate },
        }),
      }

      const transitionDoc2 = {
        id: 'trans-2',
        ref: {
          path: 'families/family-456/locationTransitions/trans-2',
          update: mockTransitionUpdate,
        },
        data: () => ({
          childId: 'child-abc',
          toZoneId: null,
          gracePeriodEndsAt: { toDate: () => pastDate },
        }),
      }

      mockCollectionGroupGet.mockResolvedValueOnce({
        empty: false,
        size: 2,
        docs: [transitionDoc1, transitionDoc2],
      })

      // Should not throw
      await expect(applyTransitionRules()).resolves.not.toThrow()

      // Second transition should still be processed
      expect(mockTransitionUpdate).toHaveBeenCalled()
    })
  })

  describe('time limit application', () => {
    it('should use more restrictive time limit', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000)

      const transitionDoc = {
        id: 'trans-1',
        ref: {
          path: 'families/family-123/locationTransitions/trans-1',
          update: mockTransitionUpdate,
        },
        data: () => ({
          childId: 'child-789',
          deviceId: 'device-456',
          toZoneId: 'zone-school',
          fromZoneId: null,
          gracePeriodEndsAt: { toDate: () => pastDate },
        }),
      }

      mockCollectionGroupGet.mockResolvedValueOnce({
        empty: false,
        size: 1,
        docs: [transitionDoc],
      })

      mockZoneGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'School' }),
      })

      mockRulesGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            data: () => ({
              dailyTimeLimitMinutes: 60, // Location limit is more restrictive
              educationOnlyMode: false,
              categoryOverrides: {},
            }),
          },
        ],
      })

      mockSettingsGet.mockResolvedValueOnce({
        data: () => ({ dailyTimeLimitMinutes: 120 }), // Current limit is higher
      })

      await applyTransitionRules()

      // Should apply settings with the location override
      expect(mockSettingsSet).toHaveBeenCalledWith(
        expect.objectContaining({
          dailyTimeLimitMinutes: 60, // Should use the more restrictive limit
        }),
        { merge: true }
      )
    })
  })
})
