/**
 * Screenshot Rate Alert Tests
 * Story 18.6: View Rate Limiting
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getActiveRateLimitAlert,
  createRateLimitAlert,
  getOtherGuardians,
  dismissAlert,
  ALERT_TYPE_SCREENSHOT_RATE,
  type ScreenshotRateAlert,
} from './screenshot-rate-alert'

// Mock Firestore
const mockCollection = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
  }),
}))

describe('Screenshot Rate Alert Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getActiveRateLimitAlert', () => {
    it('returns null when no active alert exists', async () => {
      mockCollection.mockReturnValue({
        doc: () => ({
          collection: () => ({
            where: () => ({
              where: () => ({
                where: () => ({
                  where: () => ({
                    where: () => ({
                      limit: () => ({
                        get: () => Promise.resolve({ empty: true, docs: [] }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getActiveRateLimitAlert('family123', 'viewer456', 'child789')

      expect(result).toBeNull()
    })

    it('returns existing alert when found', async () => {
      const existingAlert: ScreenshotRateAlert = {
        alertId: 'alert123',
        type: ALERT_TYPE_SCREENSHOT_RATE,
        familyId: 'family123',
        childId: 'child789',
        viewerId: 'viewer456',
        viewerEmail: 'test@example.com',
        count: 55,
        threshold: 50,
        windowMs: 3600000,
        createdAt: Date.now() - 1000,
        dismissed: false,
      }

      mockCollection.mockReturnValue({
        doc: () => ({
          collection: () => ({
            where: () => ({
              where: () => ({
                where: () => ({
                  where: () => ({
                    where: () => ({
                      limit: () => ({
                        get: () =>
                          Promise.resolve({
                            empty: false,
                            docs: [{ data: () => existingAlert }],
                          }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await getActiveRateLimitAlert('family123', 'viewer456', 'child789')

      expect(result).toEqual(existingAlert)
    })

    it('uses custom window size for deduplication', async () => {
      const customWindowMs = 1800000
      let capturedCutoff = 0

      mockCollection.mockReturnValue({
        doc: () => ({
          collection: () => ({
            where: () => ({
              where: () => ({
                where: () => ({
                  where: () => ({
                    where: (field: string, _op: string, value: unknown) => {
                      if (field === 'createdAt') {
                        capturedCutoff = value as number
                      }
                      return {
                        limit: () => ({
                          get: () => Promise.resolve({ empty: true, docs: [] }),
                        }),
                      }
                    },
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const beforeCall = Date.now()
      await getActiveRateLimitAlert('family123', 'viewer456', 'child789', customWindowMs)
      const afterCall = Date.now()

      expect(capturedCutoff).toBeGreaterThanOrEqual(beforeCall - customWindowMs)
      expect(capturedCutoff).toBeLessThanOrEqual(afterCall - customWindowMs)
    })
  })

  describe('createRateLimitAlert', () => {
    it('creates alert with correct fields', async () => {
      let capturedAlert: ScreenshotRateAlert | null = null
      const mockAlertId = 'generated-alert-id'

      mockCollection.mockReturnValue({
        doc: () => ({
          collection: () => ({
            doc: () => ({
              id: mockAlertId,
              set: (data: ScreenshotRateAlert) => {
                capturedAlert = data
                return Promise.resolve()
              },
            }),
          }),
        }),
      })

      const params = {
        familyId: 'family123',
        childId: 'child789',
        viewerId: 'viewer456',
        viewerEmail: 'test@example.com',
        count: 55,
        threshold: 50,
      }

      await createRateLimitAlert(params)

      expect(capturedAlert).not.toBeNull()
      expect(capturedAlert!.alertId).toBe(mockAlertId)
      expect(capturedAlert!.type).toBe(ALERT_TYPE_SCREENSHOT_RATE)
      expect(capturedAlert!.familyId).toBe(params.familyId)
      expect(capturedAlert!.childId).toBe(params.childId)
      expect(capturedAlert!.viewerId).toBe(params.viewerId)
      expect(capturedAlert!.viewerEmail).toBe(params.viewerEmail)
      expect(capturedAlert!.count).toBe(params.count)
      expect(capturedAlert!.threshold).toBe(params.threshold)
      expect(capturedAlert!.dismissed).toBe(false)
      expect(capturedAlert!.createdAt).toBeGreaterThan(0)
    })

    it('uses default windowMs when not provided', async () => {
      let capturedAlert: ScreenshotRateAlert | null = null

      mockCollection.mockReturnValue({
        doc: () => ({
          collection: () => ({
            doc: () => ({
              id: 'alert-id',
              set: (data: ScreenshotRateAlert) => {
                capturedAlert = data
                return Promise.resolve()
              },
            }),
          }),
        }),
      })

      await createRateLimitAlert({
        familyId: 'family123',
        childId: 'child789',
        viewerId: 'viewer456',
        viewerEmail: null,
        count: 55,
        threshold: 50,
      })

      expect(capturedAlert!.windowMs).toBe(3600000)
    })

    it('uses custom windowMs when provided', async () => {
      let capturedAlert: ScreenshotRateAlert | null = null
      const customWindowMs = 7200000

      mockCollection.mockReturnValue({
        doc: () => ({
          collection: () => ({
            doc: () => ({
              id: 'alert-id',
              set: (data: ScreenshotRateAlert) => {
                capturedAlert = data
                return Promise.resolve()
              },
            }),
          }),
        }),
      })

      await createRateLimitAlert({
        familyId: 'family123',
        childId: 'child789',
        viewerId: 'viewer456',
        viewerEmail: null,
        count: 55,
        threshold: 50,
        windowMs: customWindowMs,
      })

      expect(capturedAlert!.windowMs).toBe(customWindowMs)
    })

    it('returns the created alert', async () => {
      mockCollection.mockReturnValue({
        doc: () => ({
          collection: () => ({
            doc: () => ({
              id: 'alert-id',
              set: () => Promise.resolve(),
            }),
          }),
        }),
      })

      const result = await createRateLimitAlert({
        familyId: 'family123',
        childId: 'child789',
        viewerId: 'viewer456',
        viewerEmail: 'test@example.com',
        count: 55,
        threshold: 50,
      })

      expect(result.alertId).toBe('alert-id')
      expect(result.type).toBe(ALERT_TYPE_SCREENSHOT_RATE)
    })
  })

  describe('getOtherGuardians', () => {
    it('returns empty array when family does not exist', async () => {
      mockCollection.mockReturnValue({
        doc: () => ({
          get: () => Promise.resolve({ exists: false }),
        }),
      })

      const result = await getOtherGuardians('family123', 'viewer456')

      expect(result).toEqual([])
    })

    it('returns empty array when family has no members', async () => {
      mockCollection.mockReturnValue({
        doc: () => ({
          get: () =>
            Promise.resolve({
              exists: true,
              data: () => ({}),
            }),
        }),
      })

      const result = await getOtherGuardians('family123', 'viewer456')

      expect(result).toEqual([])
    })

    it('excludes the viewer from guardians list', async () => {
      const memberIds = ['viewer456', 'guardian1', 'guardian2']

      mockCollection.mockReturnValue({
        doc: () => ({
          get: () =>
            Promise.resolve({
              exists: true,
              data: () => ({ memberIds }),
            }),
        }),
      })

      const result = await getOtherGuardians('family123', 'viewer456')

      expect(result).toEqual(['guardian1', 'guardian2'])
      expect(result).not.toContain('viewer456')
    })

    it('returns all members when viewer not in list', async () => {
      const memberIds = ['guardian1', 'guardian2', 'guardian3']

      mockCollection.mockReturnValue({
        doc: () => ({
          get: () =>
            Promise.resolve({
              exists: true,
              data: () => ({ memberIds }),
            }),
        }),
      })

      const result = await getOtherGuardians('family123', 'other-user')

      expect(result).toEqual(memberIds)
    })
  })

  describe('dismissAlert', () => {
    it('updates alert with dismissed fields', async () => {
      let capturedUpdate: Record<string, unknown> | null = null

      mockCollection.mockReturnValue({
        doc: () => ({
          collection: () => ({
            doc: () => ({
              update: (data: Record<string, unknown>) => {
                capturedUpdate = data
                return Promise.resolve()
              },
            }),
          }),
        }),
      })

      const dismissedBy = 'guardian123'
      const beforeDismiss = Date.now()

      await dismissAlert('family123', 'alert456', dismissedBy)

      expect(capturedUpdate).not.toBeNull()
      expect(capturedUpdate!.dismissed).toBe(true)
      expect(capturedUpdate!.dismissedBy).toBe(dismissedBy)
      expect(capturedUpdate!.dismissedAt).toBeGreaterThanOrEqual(beforeDismiss)
    })
  })

  describe('ALERT_TYPE_SCREENSHOT_RATE', () => {
    it('has correct value', () => {
      expect(ALERT_TYPE_SCREENSHOT_RATE).toBe('screenshot_rate')
    })
  })
})
