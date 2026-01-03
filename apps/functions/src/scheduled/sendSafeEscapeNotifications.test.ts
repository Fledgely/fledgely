/**
 * Tests for Safe Escape Notification Scheduler - Story 40.3
 *
 * Acceptance Criteria:
 * - AC2: Silent operation - no notifications for 72 hours
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase Admin
const _mockGet = vi.fn()
const _mockSet = vi.fn().mockResolvedValue(undefined)
const mockUpdate = vi.fn().mockResolvedValue(undefined)
const mockBatchSet = vi.fn()
const mockBatchCommit = vi.fn().mockResolvedValue(undefined)
const mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockCollectionGroup = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
    collectionGroup: mockCollectionGroup,
    batch: () => ({
      set: mockBatchSet,
      commit: mockBatchCommit,
    }),
  }),
  Timestamp: {
    now: () => ({ toDate: () => new Date() }),
    fromDate: (date: Date) => ({ toDate: () => date }),
  },
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
}))

vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: (_config: unknown, handler: (...args: unknown[]) => unknown) => handler,
}))

vi.mock('../utils/adminAudit', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@fledgely/shared', () => ({
  SAFE_ESCAPE_SILENT_PERIOD_MS: 72 * 60 * 60 * 1000, // 72 hours
}))

// Import the module to get access to the handler
import { sendSafeEscapeNotifications } from './sendSafeEscapeNotifications'
import { logAdminAction } from '../utils/adminAudit'

describe('sendSafeEscapeNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock setup - no activations
    mockCollectionGroup.mockReturnValue({
      where: () => ({
        where: () => ({
          where: () => ({
            get: () => Promise.resolve({ docs: [] }),
          }),
        }),
      }),
    })

    mockCollection.mockImplementation((name: string) => {
      if (name === 'families') {
        return { doc: mockDoc }
      }
      if (name === 'notifications') {
        return { doc: () => ({ id: 'notif-123' }) }
      }
      return { doc: mockDoc }
    })
  })

  describe('No Pending Notifications', () => {
    it('logs no_pending_notifications when no activations exist', async () => {
      await sendSafeEscapeNotifications({} as any)

      expect(logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'send_safe_escape_notifications',
          metadata: expect.objectContaining({
            status: 'no_pending_notifications',
            activationsProcessed: 0,
          }),
        })
      )
    })
  })

  describe('72-Hour Silent Period (AC2)', () => {
    it('processes activations returned by collectionGroup query', async () => {
      // Activation from 73 hours ago - should trigger notification
      const seventyThreeHoursAgo = new Date(Date.now() - 73 * 60 * 60 * 1000)

      // Mock collectionGroup to return an activation
      mockCollectionGroup.mockReturnValue({
        where: () => ({
          where: () => ({
            where: () => ({
              get: () =>
                Promise.resolve({
                  docs: [
                    {
                      id: 'activation-123',
                      ref: { path: 'families/family-123/safeEscapeActivations/activation-123' },
                      data: () => ({
                        activatedBy: 'guardian-1',
                        activatedAt: { toDate: () => seventyThreeHoursAgo },
                        notificationSentAt: null,
                        reenabledAt: null,
                      }),
                    },
                  ],
                }),
            }),
          }),
        }),
      })

      const mockFamilyDocData = {
        exists: true,
        data: () => ({
          guardians: [{ id: 'guardian-1' }, { id: 'guardian-2' }],
          children: [{ id: 'child-1' }],
        }),
      }

      mockDoc.mockReturnValue({
        get: () => Promise.resolve(mockFamilyDocData),
        collection: () => ({
          doc: () => ({
            update: mockUpdate,
          }),
        }),
      })

      await sendSafeEscapeNotifications({} as any)

      // Should have sent notification
      expect(mockBatchSet).toHaveBeenCalled()
      expect(logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            status: 'completed',
            activationsProcessed: 1,
          }),
        })
      )
    })
  })

  describe('Notification Content (Safety)', () => {
    it('sends vague notification without revealing activator', async () => {
      const seventyThreeHoursAgo = new Date(Date.now() - 73 * 60 * 60 * 1000)

      mockCollectionGroup.mockReturnValue({
        where: () => ({
          where: () => ({
            where: () => ({
              get: () =>
                Promise.resolve({
                  docs: [
                    {
                      id: 'activation-123',
                      ref: { path: 'families/family-123/safeEscapeActivations/activation-123' },
                      data: () => ({
                        activatedBy: 'guardian-1',
                        activatedAt: { toDate: () => seventyThreeHoursAgo },
                        notificationSentAt: null,
                        reenabledAt: null,
                      }),
                    },
                  ],
                }),
            }),
          }),
        }),
      })

      const mockFamilyDocData = {
        exists: true,
        data: () => ({
          guardians: [{ id: 'guardian-1' }, { id: 'guardian-2' }],
          children: [],
        }),
      }

      mockDoc.mockReturnValue({
        get: () => Promise.resolve(mockFamilyDocData),
        collection: () => ({
          doc: () => ({
            update: mockUpdate,
          }),
        }),
      })

      await sendSafeEscapeNotifications({} as any)

      // Verify notification content is vague
      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'safe_escape_notification',
          title: 'Location Features Paused',
          message: 'Location features have been paused for your family.',
          // Should NOT contain activatedBy, reason, etc.
        })
      )
    })

    it('only notifies guardians, not children', async () => {
      const seventyThreeHoursAgo = new Date(Date.now() - 73 * 60 * 60 * 1000)

      mockCollectionGroup.mockReturnValue({
        where: () => ({
          where: () => ({
            where: () => ({
              get: () =>
                Promise.resolve({
                  docs: [
                    {
                      id: 'activation-123',
                      ref: { path: 'families/family-123/safeEscapeActivations/activation-123' },
                      data: () => ({
                        activatedBy: 'guardian-1',
                        activatedAt: { toDate: () => seventyThreeHoursAgo },
                        notificationSentAt: null,
                        reenabledAt: null,
                      }),
                    },
                  ],
                }),
            }),
          }),
        }),
      })

      const mockFamilyDocData = {
        exists: true,
        data: () => ({
          guardians: [{ id: 'guardian-1' }, { id: 'guardian-2' }],
          children: [{ id: 'child-1' }, { id: 'child-2' }],
        }),
      }

      mockDoc.mockReturnValue({
        get: () => Promise.resolve(mockFamilyDocData),
        collection: () => ({
          doc: () => ({
            update: mockUpdate,
          }),
        }),
      })

      await sendSafeEscapeNotifications({} as any)

      // Should only notify guardian-2 (not guardian-1 who activated, not children)
      expect(mockBatchSet).toHaveBeenCalledTimes(1)
      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'guardian-2',
        })
      )
    })

    it('does not notify the activator', async () => {
      const seventyThreeHoursAgo = new Date(Date.now() - 73 * 60 * 60 * 1000)

      mockCollectionGroup.mockReturnValue({
        where: () => ({
          where: () => ({
            where: () => ({
              get: () =>
                Promise.resolve({
                  docs: [
                    {
                      id: 'activation-123',
                      ref: { path: 'families/family-123/safeEscapeActivations/activation-123' },
                      data: () => ({
                        activatedBy: 'guardian-1',
                        activatedAt: { toDate: () => seventyThreeHoursAgo },
                        notificationSentAt: null,
                        reenabledAt: null,
                      }),
                    },
                  ],
                }),
            }),
          }),
        }),
      })

      // Only guardian-1 exists (who is the activator)
      const mockFamilyDocData = {
        exists: true,
        data: () => ({
          guardians: [{ id: 'guardian-1' }],
          children: [],
        }),
      }

      mockDoc.mockReturnValue({
        get: () => Promise.resolve(mockFamilyDocData),
        collection: () => ({
          doc: () => ({
            update: mockUpdate,
          }),
        }),
      })

      await sendSafeEscapeNotifications({} as any)

      // Should NOT have sent any notifications
      expect(mockBatchSet).not.toHaveBeenCalled()
    })
  })

  describe('Mark Notification Sent', () => {
    it('updates activation record with notificationSentAt', async () => {
      const seventyThreeHoursAgo = new Date(Date.now() - 73 * 60 * 60 * 1000)

      mockCollectionGroup.mockReturnValue({
        where: () => ({
          where: () => ({
            where: () => ({
              get: () =>
                Promise.resolve({
                  docs: [
                    {
                      id: 'activation-123',
                      ref: { path: 'families/family-123/safeEscapeActivations/activation-123' },
                      data: () => ({
                        activatedBy: 'guardian-1',
                        activatedAt: { toDate: () => seventyThreeHoursAgo },
                        notificationSentAt: null,
                        reenabledAt: null,
                      }),
                    },
                  ],
                }),
            }),
          }),
        }),
      })

      const mockFamilyDocData = {
        exists: true,
        data: () => ({
          guardians: [{ id: 'guardian-1' }, { id: 'guardian-2' }],
          children: [],
        }),
      }

      mockDoc.mockReturnValue({
        get: () => Promise.resolve(mockFamilyDocData),
        collection: () => ({
          doc: () => ({
            update: mockUpdate,
          }),
        }),
      })

      await sendSafeEscapeNotifications({} as any)

      expect(mockUpdate).toHaveBeenCalledWith({
        notificationSentAt: 'SERVER_TIMESTAMP',
      })
    })
  })
})
