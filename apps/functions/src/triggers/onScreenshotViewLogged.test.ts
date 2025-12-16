import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SCREENSHOT_VIEWING_RATE_LIMITS } from '@fledgely/contracts'

// Mock setup for nested Firestore collections
const mockSet = vi.fn().mockResolvedValue(undefined)
const mockGetDoc = vi.fn()
const mockCountGet = vi.fn()

// Subcollection mock
const mockSubcollectionDoc = vi.fn()
const mockSubcollectionWhere = vi.fn()
const mockSubcollectionLimit = vi.fn()
const mockSubcollectionCount = vi.fn()

// Setup chaining for subcollections
mockSubcollectionWhere.mockReturnValue({
  where: mockSubcollectionWhere,
  limit: mockSubcollectionLimit,
  count: mockSubcollectionCount,
  get: mockGetDoc,
})

mockSubcollectionLimit.mockReturnValue({
  get: mockGetDoc,
})

mockSubcollectionCount.mockReturnValue({
  get: mockCountGet,
})

mockSubcollectionDoc.mockImplementation(() => ({
  get: mockGetDoc,
  set: mockSet,
  id: 'mock-doc-id',
}))

const mockSubcollection = vi.fn().mockImplementation(() => ({
  doc: mockSubcollectionDoc,
  where: mockSubcollectionWhere,
  limit: mockSubcollectionLimit,
  count: mockSubcollectionCount,
}))

// Main doc mock that returns subcollection
const mockDoc = vi.fn().mockImplementation(() => ({
  get: mockGetDoc,
  set: mockSet,
  collection: mockSubcollection,
  id: 'mock-doc-id',
}))

const mockCollection = vi.fn().mockImplementation(() => ({
  doc: mockDoc,
  where: mockSubcollectionWhere,
  add: vi.fn().mockResolvedValue({ id: 'new-doc-id' }),
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
  Timestamp: {
    now: vi.fn(() => ({
      toDate: () => new Date('2025-12-15T10:00:00Z'),
      seconds: 1734260400,
      nanoseconds: 0,
    })),
    fromDate: vi.fn((date: Date) => ({
      toDate: () => date,
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
    })),
  },
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}))

// Mock firebase-functions/v2/firestore
vi.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: vi.fn((path, handler) => handler),
}))

describe('onScreenshotViewLogged', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('filtering behavior', () => {
    it('should ignore non-screenshot dataTypes', async () => {
      const { onScreenshotViewLogged } = await import('./onScreenshotViewLogged')

      const event = {
        params: { childId: 'child-123', logId: 'log-123' },
        data: {
          data: () => ({
            dataType: 'agreement', // Not screenshot
            viewedBy: 'guardian-123',
            viewedAt: new Date(),
          }),
        },
      }

      await onScreenshotViewLogged(event as never)

      // Should not query for screenshot count (no subcollection access for non-screenshot)
      expect(mockCountGet).not.toHaveBeenCalled()
    })

    it('should process screenshot dataType entries', async () => {
      const { onScreenshotViewLogged } = await import('./onScreenshotViewLogged')

      // Setup mocks for below-threshold scenario
      mockCountGet.mockResolvedValue({ data: () => ({ count: 10 }) })

      const event = {
        params: { childId: 'child-123', logId: 'log-123' },
        data: {
          data: () => ({
            dataType: 'screenshot',
            viewedBy: 'guardian-123',
            viewedAt: new Date(),
          }),
        },
      }

      await onScreenshotViewLogged(event as never)

      // Should query for screenshot views
      expect(mockSubcollectionWhere).toHaveBeenCalledWith('dataType', '==', 'screenshot')
    })

    it('should ignore entries without viewedBy', async () => {
      const { onScreenshotViewLogged } = await import('./onScreenshotViewLogged')

      const event = {
        params: { childId: 'child-123', logId: 'log-123' },
        data: {
          data: () => ({
            dataType: 'screenshot',
            // No viewedBy
            viewedAt: new Date(),
          }),
        },
      }

      await onScreenshotViewLogged(event as never)

      // Should not proceed with rate check
      expect(mockCountGet).not.toHaveBeenCalled()
    })
  })

  describe('threshold detection (AC1, AC6)', () => {
    it('should NOT create alert when count is below threshold (49 views)', async () => {
      const { onScreenshotViewLogged } = await import('./onScreenshotViewLogged')

      mockCountGet.mockResolvedValue({ data: () => ({ count: 49 }) })

      const event = {
        params: { childId: 'child-123', logId: 'log-123' },
        data: {
          data: () => ({
            dataType: 'screenshot',
            viewedBy: 'guardian-123',
            viewedAt: new Date(),
          }),
        },
      }

      await onScreenshotViewLogged(event as never)

      // Should not create alert (mockSet not called for screenshotRateAlerts)
      expect(mockSet).not.toHaveBeenCalled()
    })

    it('should create alert when count exactly equals threshold (50 views)', async () => {
      const { onScreenshotViewLogged } = await import('./onScreenshotViewLogged')

      // First count query returns 50
      mockCountGet.mockResolvedValueOnce({ data: () => ({ count: 50 }) })

      // Alert cooldown check returns empty (no recent alerts)
      mockGetDoc.mockResolvedValueOnce({ empty: true, docs: [] })

      // Child document lookup
      mockGetDoc.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardians: [
            { uid: 'guardian-123' }, // Triggering guardian
            { uid: 'guardian-456' }, // Other guardian to alert
          ],
        }),
      })

      const event = {
        params: { childId: 'child-123', logId: 'log-123' },
        data: {
          data: () => ({
            dataType: 'screenshot',
            viewedBy: 'guardian-123',
            viewedAt: new Date(),
          }),
        },
      }

      await onScreenshotViewLogged(event as never)

      // Should create alert
      expect(mockSet).toHaveBeenCalled()
    })

    it('should create alert when count exceeds threshold (75 views)', async () => {
      const { onScreenshotViewLogged } = await import('./onScreenshotViewLogged')

      mockCountGet.mockResolvedValueOnce({ data: () => ({ count: 75 }) })
      mockGetDoc.mockResolvedValueOnce({ empty: true, docs: [] })
      mockGetDoc.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardians: [
            { uid: 'guardian-123' },
            { uid: 'guardian-456' },
          ],
        }),
      })

      const event = {
        params: { childId: 'child-123', logId: 'log-123' },
        data: {
          data: () => ({
            dataType: 'screenshot',
            viewedBy: 'guardian-123',
            viewedAt: new Date(),
          }),
        },
      }

      await onScreenshotViewLogged(event as never)

      expect(mockSet).toHaveBeenCalled()
    })

    it('should use non-configurable threshold of 50/hour (AC6)', () => {
      // Verify the constant is what we expect
      expect(SCREENSHOT_VIEWING_RATE_LIMITS.THRESHOLD_PER_HOUR).toBe(50)
      // Verify it's frozen (not modifiable)
      expect(Object.isFrozen(SCREENSHOT_VIEWING_RATE_LIMITS)).toBe(true)
    })
  })

  describe('cooldown behavior', () => {
    it('should NOT create duplicate alert within cooldown period', async () => {
      const { onScreenshotViewLogged } = await import('./onScreenshotViewLogged')

      mockCountGet.mockResolvedValueOnce({ data: () => ({ count: 60 }) })

      // Alert cooldown check returns existing alert
      mockGetDoc.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'existing-alert' }],
      })

      const event = {
        params: { childId: 'child-123', logId: 'log-123' },
        data: {
          data: () => ({
            dataType: 'screenshot',
            viewedBy: 'guardian-123',
            viewedAt: new Date(),
          }),
        },
      }

      await onScreenshotViewLogged(event as never)

      // Should NOT create new alert
      expect(mockSet).not.toHaveBeenCalled()
    })
  })

  describe('guardian targeting (AC7)', () => {
    it('should alert OTHER guardians, NOT the triggering guardian', async () => {
      const { onScreenshotViewLogged } = await import('./onScreenshotViewLogged')

      mockCountGet.mockResolvedValueOnce({ data: () => ({ count: 55 }) })
      mockGetDoc.mockResolvedValueOnce({ empty: true, docs: [] })
      mockGetDoc.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardians: [
            { uid: 'triggering-guardian' },
            { uid: 'other-guardian-1' },
            { uid: 'other-guardian-2' },
          ],
        }),
      })

      const event = {
        params: { childId: 'child-123', logId: 'log-123' },
        data: {
          data: () => ({
            dataType: 'screenshot',
            viewedBy: 'triggering-guardian',
            viewedAt: new Date(),
          }),
        },
      }

      await onScreenshotViewLogged(event as never)

      // Verify alert was created with correct alertedTo
      const alertCall = mockSet.mock.calls.find(call => {
        const data = call[0]
        return data && data.triggeredBy === 'triggering-guardian'
      })

      expect(alertCall).toBeDefined()
      const alertData = alertCall![0]
      expect(alertData.alertedTo).toContain('other-guardian-1')
      expect(alertData.alertedTo).toContain('other-guardian-2')
      expect(alertData.alertedTo).not.toContain('triggering-guardian')
    })

    it('should NOT include child in notifications (AC7)', async () => {
      const { onScreenshotViewLogged } = await import('./onScreenshotViewLogged')

      mockCountGet.mockResolvedValueOnce({ data: () => ({ count: 50 }) })
      mockGetDoc.mockResolvedValueOnce({ empty: true, docs: [] })
      mockGetDoc.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardians: [
            { uid: 'guardian-1' },
            { uid: 'guardian-2' },
          ],
        }),
      })

      const event = {
        params: { childId: 'child-123', logId: 'log-123' },
        data: {
          data: () => ({
            dataType: 'screenshot',
            viewedBy: 'guardian-1',
            viewedAt: new Date(),
          }),
        },
      }

      await onScreenshotViewLogged(event as never)

      // All notification calls should be to guardians, never the child
      mockSet.mock.calls.forEach(call => {
        const data = call[0]
        if (data && data.type === 'screenshot_rate_alert') {
          expect(data.recipientUid).not.toBe('child-123')
        }
      })
    })

    it('should handle single-guardian scenario (no one to alert)', async () => {
      const { onScreenshotViewLogged } = await import('./onScreenshotViewLogged')

      mockCountGet.mockResolvedValueOnce({ data: () => ({ count: 50 }) })
      mockGetDoc.mockResolvedValueOnce({ empty: true, docs: [] })
      mockGetDoc.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardians: [
            { uid: 'solo-guardian' }, // Only one guardian
          ],
        }),
      })

      const event = {
        params: { childId: 'child-123', logId: 'log-123' },
        data: {
          data: () => ({
            dataType: 'screenshot',
            viewedBy: 'solo-guardian',
            viewedAt: new Date(),
          }),
        },
      }

      await onScreenshotViewLogged(event as never)

      // Alert should still be created for audit purposes
      const alertCall = mockSet.mock.calls.find(call => {
        const data = call[0]
        return data && data.alertedTo !== undefined
      })
      expect(alertCall).toBeDefined()
      expect(alertCall![0].alertedTo).toEqual([])

      // No notification should be created (no one to notify)
      const notificationCalls = mockSet.mock.calls.filter(call => {
        const data = call[0]
        return data && data.type === 'screenshot_rate_alert'
      })
      expect(notificationCalls.length).toBe(0)
    })
  })

  describe('alert content (AC2, AC3)', () => {
    it('should include count and timeframe but NOT screenshot IDs (AC2)', async () => {
      const { onScreenshotViewLogged } = await import('./onScreenshotViewLogged')

      mockCountGet.mockResolvedValueOnce({ data: () => ({ count: 55 }) })
      mockGetDoc.mockResolvedValueOnce({ empty: true, docs: [] })
      mockGetDoc.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardians: [
            { uid: 'guardian-1' },
            { uid: 'guardian-2' },
          ],
        }),
      })

      const event = {
        params: { childId: 'child-123', logId: 'log-123' },
        data: {
          data: () => ({
            dataType: 'screenshot',
            viewedBy: 'guardian-1',
            resourceId: 'screenshot-abc', // Specific screenshot ID
            viewedAt: new Date(),
          }),
        },
      }

      await onScreenshotViewLogged(event as never)

      const alertCall = mockSet.mock.calls.find(call => {
        const data = call[0]
        return data && data.triggeredBy !== undefined && data.screenshotCount !== undefined
      })

      expect(alertCall).toBeDefined()
      const alertData = alertCall![0]

      // Should have count
      expect(alertData.screenshotCount).toBe(55)
      // Should have timeframe
      expect(alertData.windowStart).toBeDefined()
      expect(alertData.windowEnd).toBeDefined()
      // Should NOT have screenshot IDs
      expect(alertData.screenshotIds).toBeUndefined()
      expect(alertData.resourceId).toBeUndefined()
    })

    it('should create informational notification with no action required (AC3)', async () => {
      const { onScreenshotViewLogged } = await import('./onScreenshotViewLogged')

      mockCountGet.mockResolvedValueOnce({ data: () => ({ count: 50 }) })
      mockGetDoc.mockResolvedValueOnce({ empty: true, docs: [] })
      mockGetDoc.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardians: [
            { uid: 'guardian-1' },
            { uid: 'guardian-2' },
          ],
        }),
      })

      const event = {
        params: { childId: 'child-123', logId: 'log-123' },
        data: {
          data: () => ({
            dataType: 'screenshot',
            viewedBy: 'guardian-1',
            viewedAt: new Date(),
          }),
        },
      }

      await onScreenshotViewLogged(event as never)

      const notificationCall = mockSet.mock.calls.find(call => {
        const data = call[0]
        return data && data.type === 'screenshot_rate_alert'
      })

      expect(notificationCall).toBeDefined()
      const notificationData = notificationCall![0]

      // AC3: Informational only
      expect(notificationData.actionRequired).toBe(false)
      expect(notificationData.message).toContain('50 screenshots')
      expect(notificationData.message).toContain('past hour')
    })
  })

  describe('viewing NOT blocked (AC4)', () => {
    it('trigger function completes successfully without blocking', async () => {
      const { onScreenshotViewLogged } = await import('./onScreenshotViewLogged')

      mockCountGet.mockResolvedValueOnce({ data: () => ({ count: 100 }) })
      mockGetDoc.mockResolvedValueOnce({ empty: true, docs: [] })
      mockGetDoc.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardians: [
            { uid: 'guardian-1' },
            { uid: 'guardian-2' },
          ],
        }),
      })

      const event = {
        params: { childId: 'child-123', logId: 'log-123' },
        data: {
          data: () => ({
            dataType: 'screenshot',
            viewedBy: 'guardian-1',
            viewedAt: new Date(),
          }),
        },
      }

      // Function should complete without throwing
      await expect(onScreenshotViewLogged(event as never)).resolves.toBeUndefined()

      // Alert is created (informational)
      expect(mockSet).toHaveBeenCalled()
      // But viewing was not blocked - function returns normally
    })
  })

  describe('audit trail (AC5)', () => {
    it('should store alert in audit trail with timestamps', async () => {
      const { onScreenshotViewLogged } = await import('./onScreenshotViewLogged')

      mockCountGet.mockResolvedValueOnce({ data: () => ({ count: 52 }) })
      mockGetDoc.mockResolvedValueOnce({ empty: true, docs: [] })
      mockGetDoc.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardians: [
            { uid: 'guardian-1' },
            { uid: 'guardian-2' },
          ],
        }),
      })

      const event = {
        params: { childId: 'child-123', logId: 'log-123' },
        data: {
          data: () => ({
            dataType: 'screenshot',
            viewedBy: 'guardian-1',
            viewedAt: new Date(),
          }),
        },
      }

      await onScreenshotViewLogged(event as never)

      // Verify collection path for alert storage
      expect(mockCollection).toHaveBeenCalledWith('children')
      expect(mockSubcollection).toHaveBeenCalledWith('screenshotRateAlerts')

      const alertCall = mockSet.mock.calls.find(call => {
        const data = call[0]
        return data && data.createdAt !== undefined && data.windowStart !== undefined
      })

      expect(alertCall).toBeDefined()
      const alertData = alertCall![0]
      expect(alertData.createdAt).toBeDefined()
      expect(alertData.windowStart).toBeDefined()
      expect(alertData.windowEnd).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should handle missing child document gracefully', async () => {
      const { onScreenshotViewLogged } = await import('./onScreenshotViewLogged')

      mockCountGet.mockResolvedValueOnce({ data: () => ({ count: 50 }) })
      mockGetDoc.mockResolvedValueOnce({ empty: true, docs: [] })
      mockGetDoc.mockResolvedValueOnce({
        exists: false, // Child not found
      })

      const event = {
        params: { childId: 'nonexistent-child', logId: 'log-123' },
        data: {
          data: () => ({
            dataType: 'screenshot',
            viewedBy: 'guardian-1',
            viewedAt: new Date(),
          }),
        },
      }

      // Should not throw
      await expect(onScreenshotViewLogged(event as never)).resolves.toBeUndefined()

      // Should not create alert for nonexistent child
      expect(mockSet).not.toHaveBeenCalled()
    })

    it('should handle empty event data gracefully', async () => {
      const { onScreenshotViewLogged } = await import('./onScreenshotViewLogged')

      const event = {
        params: { childId: 'child-123', logId: 'log-123' },
        data: {
          data: () => null,
        },
      }

      await expect(onScreenshotViewLogged(event as never)).resolves.toBeUndefined()
      expect(mockSet).not.toHaveBeenCalled()
    })
  })
})
