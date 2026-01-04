/**
 * Tests for Get Child Notification Preferences Callable
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

  return {
    getChildNotificationPreferencesInputSchema: z.object({
      childId: z.string().min(1),
      familyId: z.string().min(1),
    }),
  }
})

// Mock service
const mockGetChildNotificationPreferences = vi.fn()

vi.mock('../lib/notifications/childNotificationPreferencesService', () => ({
  getChildNotificationPreferences: (...args: unknown[]) =>
    mockGetChildNotificationPreferences(...args),
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
  getChildNotificationPreferences,
  _resetDbForTesting,
} from './getChildNotificationPreferences'

describe('getChildNotificationPreferences', () => {
  const mockPreferences = {
    id: 'child-123',
    childId: 'child-123',
    familyId: 'family-456',
    timeLimitWarningsEnabled: true,
    agreementChangesEnabled: true,
    trustScoreChangesEnabled: false,
    weeklySummaryEnabled: false,
    quietHoursEnabled: false,
    quietHoursStart: '21:00',
    quietHoursEnd: '07:00',
    updatedAt: new Date(),
    createdAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
    mockGetChildNotificationPreferences.mockResolvedValue(mockPreferences)
    // Default: child exists and belongs to the correct family
    mockChildDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ familyId: 'family-456' }),
    })
  })

  it('rejects unauthenticated requests', async () => {
    const request = {
      auth: null,
      data: { childId: 'child-123', familyId: 'family-456' },
    }

    await expect(getChildNotificationPreferences(request as never)).rejects.toMatchObject({
      code: 'unauthenticated',
    })
  })

  it('rejects invalid input', async () => {
    const request = {
      auth: { uid: 'child-123' },
      data: { childId: '' }, // Missing familyId
    }

    await expect(getChildNotificationPreferences(request as never)).rejects.toMatchObject({
      code: 'invalid-argument',
    })
  })

  it('rejects parent trying to access child preferences (privacy barrier)', async () => {
    const request = {
      auth: { uid: 'parent-uid' }, // Parent's UID
      data: { childId: 'child-123', familyId: 'family-456' },
    }

    await expect(getChildNotificationPreferences(request as never)).rejects.toMatchObject({
      code: 'permission-denied',
      message: expect.stringContaining('Only children can access'),
    })
  })

  it('allows child to access their own preferences', async () => {
    const request = {
      auth: { uid: 'child-123' }, // Child's own UID
      data: { childId: 'child-123', familyId: 'family-456' },
    }

    const result = await getChildNotificationPreferences(request as never)

    expect(result).toEqual({
      preferences: mockPreferences,
    })
    expect(mockGetChildNotificationPreferences).toHaveBeenCalledWith('child-123', 'family-456')
  })

  it('rejects another child trying to access preferences', async () => {
    const request = {
      auth: { uid: 'child-456' }, // Different child's UID
      data: { childId: 'child-123', familyId: 'family-456' },
    }

    await expect(getChildNotificationPreferences(request as never)).rejects.toMatchObject({
      code: 'permission-denied',
    })
  })

  it('handles service errors', async () => {
    mockGetChildNotificationPreferences.mockRejectedValue(new Error('Database error'))

    const request = {
      auth: { uid: 'child-123' },
      data: { childId: 'child-123', familyId: 'family-456' },
    }

    await expect(getChildNotificationPreferences(request as never)).rejects.toMatchObject({
      code: 'internal',
      message: 'Database error',
    })
  })

  describe('family validation', () => {
    it('rejects when child does not exist', async () => {
      mockChildDocGet.mockResolvedValue({
        exists: false,
      })

      const request = {
        auth: { uid: 'child-123' },
        data: { childId: 'child-123', familyId: 'family-456' },
      }

      await expect(getChildNotificationPreferences(request as never)).rejects.toMatchObject({
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
        data: { childId: 'child-123', familyId: 'family-456' },
      }

      await expect(getChildNotificationPreferences(request as never)).rejects.toMatchObject({
        code: 'permission-denied',
        message: 'Child does not belong to this family',
      })
    })

    it('allows access when child belongs to correct family', async () => {
      mockChildDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ familyId: 'family-456' }),
      })

      const request = {
        auth: { uid: 'child-123' },
        data: { childId: 'child-123', familyId: 'family-456' },
      }

      const result = await getChildNotificationPreferences(request as never)

      expect(result).toEqual({
        preferences: mockPreferences,
      })
    })
  })
})
