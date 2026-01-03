/**
 * Tests for Update Notification Preferences Function
 *
 * Story 41.1: Notification Preferences Configuration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @fledgely/shared
vi.mock('@fledgely/shared', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { z } = require('zod')

  const mediumFlagsModeSchema = z.enum(['immediate', 'digest', 'off'])
  const syncThresholdHoursSchema = z.union([
    z.literal(1),
    z.literal(4),
    z.literal(12),
    z.literal(24),
  ])
  const timeFormatSchema = z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format')

  const notificationPreferencesUpdateSchema = z.object({
    childId: z.string().min(1).nullable().optional(),
    applyToAllChildren: z.boolean().optional(),
    criticalFlagsEnabled: z.boolean().optional(),
    mediumFlagsMode: mediumFlagsModeSchema.optional(),
    lowFlagsEnabled: z.boolean().optional(),
    timeLimitWarningsEnabled: z.boolean().optional(),
    limitReachedEnabled: z.boolean().optional(),
    extensionRequestsEnabled: z.boolean().optional(),
    syncAlertsEnabled: z.boolean().optional(),
    syncThresholdHours: syncThresholdHoursSchema.optional(),
    quietHoursEnabled: z.boolean().optional(),
    quietHoursStart: timeFormatSchema.optional(),
    quietHoursEnd: timeFormatSchema.optional(),
    quietHoursWeekendDifferent: z.boolean().optional(),
    quietHoursWeekendStart: timeFormatSchema.nullable().optional(),
    quietHoursWeekendEnd: timeFormatSchema.nullable().optional(),
  })

  return {
    updateNotificationPreferencesInputSchema: z.object({
      familyId: z.string().min(1),
      preferences: notificationPreferencesUpdateSchema,
    }),
    createDefaultNotificationPreferences: (
      userId: string,
      familyId: string,
      childId: string | null = null
    ) => {
      const now = new Date()
      return {
        id: childId ? `${userId}-${childId}` : `${userId}-default`,
        userId,
        familyId,
        childId,
        criticalFlagsEnabled: true,
        mediumFlagsMode: 'digest',
        lowFlagsEnabled: false,
        timeLimitWarningsEnabled: true,
        limitReachedEnabled: true,
        extensionRequestsEnabled: true,
        syncAlertsEnabled: true,
        syncThresholdHours: 4,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        quietHoursWeekendDifferent: false,
        quietHoursWeekendStart: null,
        quietHoursWeekendEnd: null,
        updatedAt: now,
        createdAt: now,
      }
    },
    applyPreferencesUpdate: (
      existing: Record<string, unknown>,
      update: Record<string, unknown>
    ) => {
      return {
        ...existing,
        criticalFlagsEnabled: update.criticalFlagsEnabled ?? existing.criticalFlagsEnabled,
        mediumFlagsMode: update.mediumFlagsMode ?? existing.mediumFlagsMode,
        lowFlagsEnabled: update.lowFlagsEnabled ?? existing.lowFlagsEnabled,
        timeLimitWarningsEnabled:
          update.timeLimitWarningsEnabled ?? existing.timeLimitWarningsEnabled,
        limitReachedEnabled: update.limitReachedEnabled ?? existing.limitReachedEnabled,
        extensionRequestsEnabled:
          update.extensionRequestsEnabled ?? existing.extensionRequestsEnabled,
        syncAlertsEnabled: update.syncAlertsEnabled ?? existing.syncAlertsEnabled,
        syncThresholdHours: update.syncThresholdHours ?? existing.syncThresholdHours,
        quietHoursEnabled: update.quietHoursEnabled ?? existing.quietHoursEnabled,
        quietHoursStart: update.quietHoursStart ?? existing.quietHoursStart,
        quietHoursEnd: update.quietHoursEnd ?? existing.quietHoursEnd,
        quietHoursWeekendDifferent:
          update.quietHoursWeekendDifferent ?? existing.quietHoursWeekendDifferent,
        quietHoursWeekendStart:
          update.quietHoursWeekendStart !== undefined
            ? update.quietHoursWeekendStart
            : existing.quietHoursWeekendStart,
        quietHoursWeekendEnd:
          update.quietHoursWeekendEnd !== undefined
            ? update.quietHoursWeekendEnd
            : existing.quietHoursWeekendEnd,
        updatedAt: new Date(),
      }
    },
  }
})

// Mock firebase-admin/firestore
const mockBatchSet = vi.fn()
const mockBatchCommit = vi.fn().mockResolvedValue(undefined)
const mockDocGet = vi.fn()
const mockDoc = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: vi.fn(() => ({
      doc: mockDoc,
    })),
    batch: () => ({
      set: mockBatchSet,
      commit: mockBatchCommit,
    }),
  }),
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
  Timestamp: {
    now: () => ({ toDate: () => new Date() }),
  },
}))

// Mock firebase-functions/v2/https
vi.mock('firebase-functions/v2/https', () => ({
  onCall: vi.fn((_, handler) => handler),
  HttpsError: class HttpsError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  },
}))

// Import after mocks
import { updateNotificationPreferences } from './updateNotificationPreferences'

describe('updateNotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockDoc.mockImplementation(() => ({
      get: mockDocGet,
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: mockDocGet,
        })),
      })),
    }))
  })

  it('rejects unauthenticated requests', async () => {
    await expect(
      updateNotificationPreferences({
        data: {
          familyId: 'family-123',
          preferences: { criticalFlagsEnabled: false },
        },
        auth: null,
      } as never)
    ).rejects.toThrow('Must be logged in')
  })

  it('rejects invalid input', async () => {
    await expect(
      updateNotificationPreferences({
        data: {},
        auth: { uid: 'user-123' },
      } as never)
    ).rejects.toThrow('Invalid input')
  })

  it('rejects non-existent family', async () => {
    mockDocGet.mockResolvedValueOnce({ exists: false })

    await expect(
      updateNotificationPreferences({
        data: {
          familyId: 'family-123',
          preferences: { criticalFlagsEnabled: false },
        },
        auth: { uid: 'user-123' },
      } as never)
    ).rejects.toThrow('Family not found')
  })

  it('rejects non-guardian users', async () => {
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        guardians: [{ uid: 'other-user' }],
        children: [],
      }),
    })

    await expect(
      updateNotificationPreferences({
        data: {
          familyId: 'family-123',
          preferences: { criticalFlagsEnabled: false },
        },
        auth: { uid: 'user-123' },
      } as never)
    ).rejects.toThrow('Not a guardian')
  })

  it('rejects non-existent child', async () => {
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        guardians: [{ uid: 'user-123' }],
        children: [{ id: 'other-child' }],
      }),
    })

    await expect(
      updateNotificationPreferences({
        data: {
          familyId: 'family-123',
          preferences: { childId: 'child-456', criticalFlagsEnabled: false },
        },
        auth: { uid: 'user-123' },
      } as never)
    ).rejects.toThrow('Child not found')
  })

  it('updates existing preferences', async () => {
    mockDocGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardians: [{ uid: 'user-123' }],
          children: [],
        }),
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: 'user-123-default',
          userId: 'user-123',
          familyId: 'family-123',
          childId: null,
          criticalFlagsEnabled: true,
          mediumFlagsMode: 'digest',
          lowFlagsEnabled: false,
          timeLimitWarningsEnabled: true,
          limitReachedEnabled: true,
          extensionRequestsEnabled: true,
          syncAlertsEnabled: true,
          syncThresholdHours: 4,
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
          quietHoursWeekendDifferent: false,
          quietHoursWeekendStart: null,
          quietHoursWeekendEnd: null,
          updatedAt: { toDate: () => new Date() },
          createdAt: { toDate: () => new Date() },
        }),
      })

    const result = await updateNotificationPreferences({
      data: {
        familyId: 'family-123',
        preferences: { criticalFlagsEnabled: false },
      },
      auth: { uid: 'user-123' },
    } as never)

    expect(result.success).toBe(true)
    expect(result.preferences.criticalFlagsEnabled).toBe(false)
    expect(mockBatchCommit).toHaveBeenCalled()
  })

  it('creates preferences from defaults when none exist', async () => {
    mockDocGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardians: [{ uid: 'user-123' }],
          children: [],
        }),
      })
      .mockResolvedValueOnce({
        exists: false,
      })

    const result = await updateNotificationPreferences({
      data: {
        familyId: 'family-123',
        preferences: { quietHoursEnabled: true },
      },
      auth: { uid: 'user-123' },
    } as never)

    expect(result.success).toBe(true)
    expect(result.preferences.quietHoursEnabled).toBe(true)
    // Should preserve defaults for other fields
    expect(result.preferences.criticalFlagsEnabled).toBe(true)
  })

  it('updates child-specific preferences', async () => {
    mockDocGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardians: [{ uid: 'user-123' }],
          children: [{ id: 'child-456' }],
        }),
      })
      .mockResolvedValueOnce({
        exists: false,
      })

    const result = await updateNotificationPreferences({
      data: {
        familyId: 'family-123',
        preferences: {
          childId: 'child-456',
          syncThresholdHours: 1,
        },
      },
      auth: { uid: 'user-123' },
    } as never)

    expect(result.success).toBe(true)
    expect(result.preferences.childId).toBe('child-456')
    expect(result.preferences.syncThresholdHours).toBe(1)
    expect(result.updatedChildren).toContain('child-456')
  })

  it('applies preferences to all children', async () => {
    mockDocGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardians: [{ uid: 'user-123' }],
          children: [{ id: 'child-1' }, { id: 'child-2' }, { id: 'child-3' }],
        }),
      })
      .mockResolvedValue({
        exists: false,
      })

    const result = await updateNotificationPreferences({
      data: {
        familyId: 'family-123',
        preferences: {
          applyToAllChildren: true,
          mediumFlagsMode: 'immediate',
        },
      },
      auth: { uid: 'user-123' },
    } as never)

    expect(result.success).toBe(true)
    expect(result.preferences.mediumFlagsMode).toBe('immediate')
    expect(result.updatedChildren).toHaveLength(3)
    expect(result.updatedChildren).toContain('child-1')
    expect(result.updatedChildren).toContain('child-2')
    expect(result.updatedChildren).toContain('child-3')
  })

  it('creates audit log entry', async () => {
    mockDocGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardians: [{ uid: 'user-123' }],
          children: [],
        }),
      })
      .mockResolvedValueOnce({
        exists: false,
      })

    await updateNotificationPreferences({
      data: {
        familyId: 'family-123',
        preferences: { lowFlagsEnabled: true },
      },
      auth: { uid: 'user-123' },
    } as never)

    // Should have set audit log entry
    expect(mockBatchSet).toHaveBeenCalled()
    const calls = mockBatchSet.mock.calls
    const auditCall = calls.find((call) => call[1]?.type === 'notification_preferences_update')
    expect(auditCall).toBeDefined()
    expect(auditCall[1].userId).toBe('user-123')
    expect(auditCall[1].familyId).toBe('family-123')
    expect(auditCall[1].changes.lowFlagsEnabled).toBe(true)
  })
})
