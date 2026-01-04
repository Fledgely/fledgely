/**
 * Tests for Update Child Notification Preferences Callable
 *
 * Story 41.7: Child Notification Preferences - AC4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firestore for family validation
const mockChildDocGet = vi.fn()
const mockFirestoreCollection = vi.fn(() => ({
  doc: vi.fn(() => ({
    get: mockChildDocGet,
  })),
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockFirestoreCollection,
  })),
}))

// Mock @fledgely/shared
vi.mock('@fledgely/shared', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { z } = require('zod')

  const timeFormatSchema = z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format')

  return {
    updateChildNotificationPreferencesInputSchema: z.object({
      childId: z.string().min(1),
      familyId: z.string().min(1),
      preferences: z.object({
        trustScoreChangesEnabled: z.boolean().optional(),
        weeklySummaryEnabled: z.boolean().optional(),
        quietHoursEnabled: z.boolean().optional(),
        quietHoursStart: timeFormatSchema.optional(),
        quietHoursEnd: timeFormatSchema.optional(),
      }),
    }),
  }
})

// Mock service
const mockUpdateChildNotificationPreferences = vi.fn()

vi.mock('../lib/notifications/childNotificationPreferencesService', () => ({
  updateChildNotificationPreferences: (...args: unknown[]) =>
    mockUpdateChildNotificationPreferences(...args),
}))

// Mock firebase-functions/v2/https
vi.mock('firebase-functions/v2/https', () => ({
  onCall: vi.fn((_, handler) => handler),
  HttpsError: class HttpsError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
      this.name = 'HttpsError'
    }
  },
}))

import {
  updateChildNotificationPreferences,
  _resetDbForTesting,
} from './updateChildNotificationPreferences'

describe('updateChildNotificationPreferences', () => {
  const mockPreferences = {
    id: 'child-123',
    childId: 'child-123',
    familyId: 'family-456',
    timeLimitWarningsEnabled: true,
    agreementChangesEnabled: true,
    trustScoreChangesEnabled: true,
    weeklySummaryEnabled: true,
    quietHoursEnabled: true,
    quietHoursStart: '20:00',
    quietHoursEnd: '08:00',
    updatedAt: new Date(),
    createdAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
    mockUpdateChildNotificationPreferences.mockResolvedValue(mockPreferences)
    // Default: child exists and belongs to the correct family
    mockChildDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ familyId: 'family-456' }),
    })
  })

  it('rejects unauthenticated requests', async () => {
    const request = {
      auth: null,
      data: {
        childId: 'child-123',
        familyId: 'family-456',
        preferences: { trustScoreChangesEnabled: true },
      },
    }

    await expect(updateChildNotificationPreferences(request as never)).rejects.toMatchObject({
      code: 'unauthenticated',
    })
  })

  it('rejects invalid input', async () => {
    const request = {
      auth: { uid: 'child-123' },
      data: { childId: '', familyId: 'family-456', preferences: {} }, // Empty childId
    }

    await expect(updateChildNotificationPreferences(request as never)).rejects.toMatchObject({
      code: 'invalid-argument',
    })
  })

  it('rejects parent trying to update child preferences (privacy barrier)', async () => {
    const request = {
      auth: { uid: 'parent-uid' }, // Parent's UID
      data: {
        childId: 'child-123',
        familyId: 'family-456',
        preferences: { trustScoreChangesEnabled: true },
      },
    }

    await expect(updateChildNotificationPreferences(request as never)).rejects.toMatchObject({
      code: 'permission-denied',
      message: expect.stringContaining('Only children can update'),
    })
  })

  it('allows child to update their own preferences', async () => {
    const request = {
      auth: { uid: 'child-123' }, // Child's own UID
      data: {
        childId: 'child-123',
        familyId: 'family-456',
        preferences: { trustScoreChangesEnabled: true, weeklySummaryEnabled: true },
      },
    }

    const result = await updateChildNotificationPreferences(request as never)

    expect(result).toEqual({
      preferences: mockPreferences,
    })
    expect(mockUpdateChildNotificationPreferences).toHaveBeenCalledWith('child-123', 'family-456', {
      trustScoreChangesEnabled: true,
      weeklySummaryEnabled: true,
    })
  })

  it('allows child to update quiet hours', async () => {
    const request = {
      auth: { uid: 'child-123' },
      data: {
        childId: 'child-123',
        familyId: 'family-456',
        preferences: {
          quietHoursEnabled: true,
          quietHoursStart: '20:00',
          quietHoursEnd: '08:00',
        },
      },
    }

    await updateChildNotificationPreferences(request as never)

    expect(mockUpdateChildNotificationPreferences).toHaveBeenCalledWith('child-123', 'family-456', {
      quietHoursEnabled: true,
      quietHoursStart: '20:00',
      quietHoursEnd: '08:00',
    })
  })

  it('rejects another child trying to update preferences', async () => {
    const request = {
      auth: { uid: 'child-456' }, // Different child's UID
      data: {
        childId: 'child-123',
        familyId: 'family-456',
        preferences: { trustScoreChangesEnabled: true },
      },
    }

    await expect(updateChildNotificationPreferences(request as never)).rejects.toMatchObject({
      code: 'permission-denied',
    })
  })

  it('handles service errors', async () => {
    mockUpdateChildNotificationPreferences.mockRejectedValue(new Error('Database error'))

    const request = {
      auth: { uid: 'child-123' },
      data: {
        childId: 'child-123',
        familyId: 'family-456',
        preferences: { trustScoreChangesEnabled: true },
      },
    }

    await expect(updateChildNotificationPreferences(request as never)).rejects.toMatchObject({
      code: 'internal',
      message: 'Database error',
    })
  })

  it('accepts empty preferences update', async () => {
    const request = {
      auth: { uid: 'child-123' },
      data: {
        childId: 'child-123',
        familyId: 'family-456',
        preferences: {},
      },
    }

    await updateChildNotificationPreferences(request as never)

    expect(mockUpdateChildNotificationPreferences).toHaveBeenCalledWith(
      'child-123',
      'family-456',
      {}
    )
  })

  describe('family validation', () => {
    it('rejects when child does not exist', async () => {
      mockChildDocGet.mockResolvedValue({
        exists: false,
      })

      const request = {
        auth: { uid: 'child-123' },
        data: {
          childId: 'child-123',
          familyId: 'family-456',
          preferences: { trustScoreChangesEnabled: true },
        },
      }

      await expect(updateChildNotificationPreferences(request as never)).rejects.toMatchObject({
        code: 'not-found',
        message: 'Child not found',
      })
    })

    it('rejects when child belongs to different family', async () => {
      mockChildDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ familyId: 'different-family' }),
      })

      const request = {
        auth: { uid: 'child-123' },
        data: {
          childId: 'child-123',
          familyId: 'family-456',
          preferences: { trustScoreChangesEnabled: true },
        },
      }

      await expect(updateChildNotificationPreferences(request as never)).rejects.toMatchObject({
        code: 'permission-denied',
        message: 'Child does not belong to this family',
      })
    })

    it('allows update when child belongs to correct family', async () => {
      mockChildDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ familyId: 'family-456' }),
      })

      const request = {
        auth: { uid: 'child-123' },
        data: {
          childId: 'child-123',
          familyId: 'family-456',
          preferences: { trustScoreChangesEnabled: true },
        },
      }

      const result = await updateChildNotificationPreferences(request as never)

      expect(result).toEqual({
        preferences: mockPreferences,
      })
    })
  })
})
