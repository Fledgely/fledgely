/**
 * Tests for Get Notification Preferences Function
 *
 * Story 41.1: Notification Preferences Configuration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @fledgely/shared
vi.mock('@fledgely/shared', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { z } = require('zod')

  const NOTIFICATION_DEFAULTS_MOCK = {
    criticalFlagsEnabled: true,
    mediumFlagsMode: 'digest' as const,
    lowFlagsEnabled: false,
    timeLimitWarningsEnabled: true,
    limitReachedEnabled: true,
    extensionRequestsEnabled: true,
    syncAlertsEnabled: true,
    syncThresholdHours: 4 as const,
    quietHoursEnabled: false,
  }

  const QUIET_HOURS_DEFAULTS_MOCK = {
    start: '22:00',
    end: '07:00',
  }

  return {
    getNotificationPreferencesInputSchema: z.object({
      familyId: z.string().min(1),
      childId: z.string().min(1).nullable().optional(),
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
    NOTIFICATION_DEFAULTS: NOTIFICATION_DEFAULTS_MOCK,
    QUIET_HOURS_DEFAULTS: QUIET_HOURS_DEFAULTS_MOCK,
  }
})

// Mock firebase-admin/firestore
const mockDocGet = vi.fn()
const mockCollectionDoc = vi.fn(() => ({
  get: mockDocGet,
  collection: vi.fn(() => ({
    doc: vi.fn(() => ({
      get: mockDocGet,
    })),
  })),
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: vi.fn(() => ({
      doc: mockCollectionDoc,
    })),
  }),
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
import { getNotificationPreferences } from './getNotificationPreferences'

// Constants for assertions
const NOTIFICATION_DEFAULTS = {
  criticalFlagsEnabled: true,
  mediumFlagsMode: 'digest' as const,
  lowFlagsEnabled: false,
  timeLimitWarningsEnabled: true,
  limitReachedEnabled: true,
  extensionRequestsEnabled: true,
  syncAlertsEnabled: true,
  syncThresholdHours: 4 as const,
  quietHoursEnabled: false,
}

const QUIET_HOURS_DEFAULTS = {
  start: '22:00',
  end: '07:00',
}

describe('getNotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated requests', async () => {
    await expect(
      getNotificationPreferences({
        data: { familyId: 'family-123' },
        auth: null,
      } as never)
    ).rejects.toThrow('Must be logged in')
  })

  it('rejects invalid input', async () => {
    await expect(
      getNotificationPreferences({
        data: {},
        auth: { uid: 'user-123' },
      } as never)
    ).rejects.toThrow('Invalid input')
  })

  it('rejects non-existent family', async () => {
    mockDocGet.mockResolvedValueOnce({ exists: false })

    await expect(
      getNotificationPreferences({
        data: { familyId: 'family-123' },
        auth: { uid: 'user-123' },
      } as never)
    ).rejects.toThrow('Family not found')
  })

  it('rejects non-guardian users', async () => {
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        guardians: [{ uid: 'other-user' }],
      }),
    })

    await expect(
      getNotificationPreferences({
        data: { familyId: 'family-123' },
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
      getNotificationPreferences({
        data: { familyId: 'family-123', childId: 'child-456' },
        auth: { uid: 'user-123' },
      } as never)
    ).rejects.toThrow('Child not found')
  })

  it('returns existing preferences', async () => {
    const mockPrefs = {
      id: 'user-123-default',
      userId: 'user-123',
      familyId: 'family-123',
      childId: null,
      criticalFlagsEnabled: false, // Non-default value
      mediumFlagsMode: 'immediate',
      lowFlagsEnabled: true,
      timeLimitWarningsEnabled: true,
      limitReachedEnabled: true,
      extensionRequestsEnabled: true,
      syncAlertsEnabled: true,
      syncThresholdHours: 4,
      quietHoursEnabled: true,
      quietHoursStart: '21:00',
      quietHoursEnd: '08:00',
      quietHoursWeekendDifferent: false,
      quietHoursWeekendStart: null,
      quietHoursWeekendEnd: null,
      updatedAt: { toDate: () => new Date() },
      createdAt: { toDate: () => new Date() },
    }

    mockDocGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardians: [{ uid: 'user-123' }],
        }),
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => mockPrefs,
      })

    const result = await getNotificationPreferences({
      data: { familyId: 'family-123' },
      auth: { uid: 'user-123' },
    } as never)

    expect(result.isDefault).toBe(false)
    expect(result.preferences.criticalFlagsEnabled).toBe(false)
    expect(result.preferences.mediumFlagsMode).toBe('immediate')
    expect(result.preferences.quietHoursEnabled).toBe(true)
  })

  it('returns defaults when no preferences exist', async () => {
    mockDocGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardians: [{ uid: 'user-123' }],
        }),
      })
      .mockResolvedValueOnce({
        exists: false,
      })

    const result = await getNotificationPreferences({
      data: { familyId: 'family-123' },
      auth: { uid: 'user-123' },
    } as never)

    expect(result.isDefault).toBe(true)
    expect(result.preferences.criticalFlagsEnabled).toBe(NOTIFICATION_DEFAULTS.criticalFlagsEnabled)
    expect(result.preferences.mediumFlagsMode).toBe(NOTIFICATION_DEFAULTS.mediumFlagsMode)
    expect(result.preferences.syncThresholdHours).toBe(NOTIFICATION_DEFAULTS.syncThresholdHours)
    expect(result.preferences.quietHoursStart).toBe(QUIET_HOURS_DEFAULTS.start)
  })

  it('returns child-specific defaults', async () => {
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

    const result = await getNotificationPreferences({
      data: { familyId: 'family-123', childId: 'child-456' },
      auth: { uid: 'user-123' },
    } as never)

    expect(result.isDefault).toBe(true)
    expect(result.preferences.childId).toBe('child-456')
    expect(result.preferences.id).toBe('user-123-child-456')
  })

  it('returns family-wide defaults when childId is null', async () => {
    mockDocGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardians: [{ uid: 'user-123' }],
        }),
      })
      .mockResolvedValueOnce({
        exists: false,
      })

    const result = await getNotificationPreferences({
      data: { familyId: 'family-123', childId: null },
      auth: { uid: 'user-123' },
    } as never)

    expect(result.isDefault).toBe(true)
    expect(result.preferences.childId).toBeNull()
    expect(result.preferences.id).toBe('user-123-default')
  })
})
