/**
 * Tests for notification throttling
 *
 * Story 19A.4: Status Push Notifications (AC: #4)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock firebase-admin/firestore with proper chaining
const mockGet = vi.fn()
const mockSet = vi.fn()

// Create mock that supports chaining: collection().doc().collection().doc()
const mockDoc = vi.fn()
const mockCollection = vi.fn()

// Set up chaining - doc returns an object with get, set, and collection
mockDoc.mockImplementation(() => ({
  get: mockGet,
  set: mockSet,
  collection: mockCollection,
}))

// collection returns an object with doc
mockCollection.mockImplementation(() => ({
  doc: mockDoc,
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
}))

import {
  shouldSendNotification,
  updateThrottleTimestamp,
  _resetDbForTesting,
} from './notificationThrottle'
import { THROTTLE_DURATION_MS } from './statusTypes'

describe('notificationThrottle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
  })

  afterEach(() => {
    _resetDbForTesting()
  })

  describe('shouldSendNotification', () => {
    it('should always allow urgent (to_action) notifications', async () => {
      // Don't even check the database for urgent notifications
      const result = await shouldSendNotification('family-1', 'child-1', 'good_to_action')
      expect(result).toBe(true)
    })

    it('should always allow attention_to_action notifications', async () => {
      const result = await shouldSendNotification('family-1', 'child-1', 'attention_to_action')
      expect(result).toBe(true)
    })

    it('should allow if no previous notification state exists', async () => {
      mockGet.mockResolvedValue({ exists: false })

      const result = await shouldSendNotification('family-1', 'child-1', 'good_to_attention')
      expect(result).toBe(true)
    })

    it('should allow if last notification was more than 1 hour ago', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          lastNotificationSent: { toDate: () => twoHoursAgo },
        }),
      })

      const result = await shouldSendNotification('family-1', 'child-1', 'good_to_attention')
      expect(result).toBe(true)
    })

    it('should block if last notification was less than 1 hour ago', async () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          lastNotificationSent: { toDate: () => thirtyMinutesAgo },
        }),
      })

      const result = await shouldSendNotification('family-1', 'child-1', 'good_to_attention')
      expect(result).toBe(false)
    })

    it('should allow if lastNotificationSent is null', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          lastNotificationSent: null,
        }),
      })

      const result = await shouldSendNotification('family-1', 'child-1', 'attention_to_good')
      expect(result).toBe(true)
    })

    it('should query correct Firestore path', async () => {
      mockGet.mockResolvedValue({ exists: false })

      await shouldSendNotification('family-123', 'child-456', 'good_to_attention')

      expect(mockCollection).toHaveBeenCalledWith('families')
      expect(mockDoc).toHaveBeenCalledWith('family-123')
      expect(mockCollection).toHaveBeenCalledWith('notificationState')
      expect(mockDoc).toHaveBeenCalledWith('child-456')
    })
  })

  describe('updateThrottleTimestamp', () => {
    it('should update the notification state document', async () => {
      mockSet.mockResolvedValue(undefined)

      await updateThrottleTimestamp('family-1', 'child-1', 'good_to_attention')

      expect(mockSet).toHaveBeenCalledWith(
        {
          lastNotificationSent: 'SERVER_TIMESTAMP',
          lastTransition: 'good_to_attention',
        },
        { merge: true }
      )
    })

    it('should query correct Firestore path', async () => {
      mockSet.mockResolvedValue(undefined)

      await updateThrottleTimestamp('family-123', 'child-456', 'action_to_good')

      expect(mockCollection).toHaveBeenCalledWith('families')
      expect(mockDoc).toHaveBeenCalledWith('family-123')
      expect(mockCollection).toHaveBeenCalledWith('notificationState')
      expect(mockDoc).toHaveBeenCalledWith('child-456')
    })
  })

  describe('THROTTLE_DURATION_MS constant', () => {
    it('should be 1 hour', () => {
      expect(THROTTLE_DURATION_MS).toBe(60 * 60 * 1000)
    })
  })
})
