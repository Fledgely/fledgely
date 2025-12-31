/**
 * Update Family Settings Tests
 *
 * Story 21.3: False Positive Throttling - AC4
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock logger
vi.mock('firebase-functions/logger', () => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}))

// Mock Firestore
const mockUpdate = vi.fn().mockResolvedValue(undefined)
const mockAdd = vi.fn().mockResolvedValue({ id: 'audit-123' })
const mockAuditLogCollection = vi.fn().mockReturnValue({ add: mockAdd })
const mockFamilyGet = vi.fn()
const mockFamilyDoc = vi.fn().mockReturnValue({
  get: mockFamilyGet,
  update: mockUpdate,
  collection: mockAuditLogCollection,
})
const mockFamiliesCollection = vi.fn().mockReturnValue({ doc: mockFamilyDoc })

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockFamiliesCollection,
  })),
}))

// Import after mocks
import { updateFamilySettings, _resetDbForTesting } from './updateFamilySettings'
import { HttpsError } from 'firebase-functions/v2/https'

describe('updateFamilySettings (Story 21.3)', () => {
  const mockAuthContext = {
    uid: 'user-123',
    token: {
      email: 'user@example.com',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
  })

  describe('authentication', () => {
    it('throws unauthenticated error when no auth context', async () => {
      const request = {
        auth: null,
        data: {
          familyId: 'family-123',
          settings: { flagThrottleLevel: 'standard' },
        },
        rawRequest: {} as never,
      }

      await expect(updateFamilySettings.run(request)).rejects.toThrow(HttpsError)
      await expect(updateFamilySettings.run(request)).rejects.toMatchObject({
        code: 'unauthenticated',
      })
    })
  })

  describe('input validation', () => {
    it('throws error for missing familyId', async () => {
      const request = {
        auth: mockAuthContext,
        data: {
          familyId: '',
          settings: { flagThrottleLevel: 'standard' },
        },
        rawRequest: {} as never,
      }

      await expect(updateFamilySettings.run(request)).rejects.toThrow(HttpsError)
      await expect(updateFamilySettings.run(request)).rejects.toMatchObject({
        code: 'invalid-argument',
      })
    })

    it('throws error for invalid throttle level', async () => {
      mockFamilyGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardians: [{ uid: 'user-123' }],
        }),
      })

      const request = {
        auth: mockAuthContext,
        data: {
          familyId: 'family-123',
          settings: { flagThrottleLevel: 'invalid-level' },
        },
        rawRequest: {} as never,
      }

      await expect(updateFamilySettings.run(request)).rejects.toThrow(HttpsError)
      await expect(updateFamilySettings.run(request)).rejects.toMatchObject({
        code: 'invalid-argument',
      })
    })
  })

  describe('authorization', () => {
    it('throws not-found error when family does not exist', async () => {
      mockFamilyGet.mockResolvedValue({
        exists: false,
      })

      const request = {
        auth: mockAuthContext,
        data: {
          familyId: 'family-123',
          settings: { flagThrottleLevel: 'standard' },
        },
        rawRequest: {} as never,
      }

      await expect(updateFamilySettings.run(request)).rejects.toThrow(HttpsError)
      await expect(updateFamilySettings.run(request)).rejects.toMatchObject({
        code: 'not-found',
      })
    })

    it('throws permission-denied when user is not a guardian', async () => {
      mockFamilyGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardians: [{ uid: 'other-user' }],
        }),
      })

      const request = {
        auth: mockAuthContext,
        data: {
          familyId: 'family-123',
          settings: { flagThrottleLevel: 'standard' },
        },
        rawRequest: {} as never,
      }

      await expect(updateFamilySettings.run(request)).rejects.toThrow(HttpsError)
      await expect(updateFamilySettings.run(request)).rejects.toMatchObject({
        code: 'permission-denied',
      })
    })

    it('throws permission-denied when guardians array is empty', async () => {
      mockFamilyGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardians: [],
        }),
      })

      const request = {
        auth: mockAuthContext,
        data: {
          familyId: 'family-123',
          settings: { flagThrottleLevel: 'standard' },
        },
        rawRequest: {} as never,
      }

      await expect(updateFamilySettings.run(request)).rejects.toThrow(HttpsError)
      await expect(updateFamilySettings.run(request)).rejects.toMatchObject({
        code: 'permission-denied',
      })
    })

    it('throws permission-denied when guardians field is undefined', async () => {
      mockFamilyGet.mockResolvedValue({
        exists: true,
        data: () => ({}),
      })

      const request = {
        auth: mockAuthContext,
        data: {
          familyId: 'family-123',
          settings: { flagThrottleLevel: 'standard' },
        },
        rawRequest: {} as never,
      }

      await expect(updateFamilySettings.run(request)).rejects.toThrow(HttpsError)
      await expect(updateFamilySettings.run(request)).rejects.toMatchObject({
        code: 'permission-denied',
      })
    })
  })

  describe('settings update', () => {
    it('updates flagThrottleLevel to minimal', async () => {
      mockFamilyGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardians: [{ uid: 'user-123' }],
        }),
      })

      const request = {
        auth: mockAuthContext,
        data: {
          familyId: 'family-123',
          settings: { flagThrottleLevel: 'minimal' as const },
        },
        rawRequest: {} as never,
      }

      const result = await updateFamilySettings.run(request)

      expect(result.success).toBe(true)
      expect(result.updatedSettings.flagThrottleLevel).toBe('minimal')
      expect(mockUpdate).toHaveBeenCalledWith({
        'settings.flagThrottleLevel': 'minimal',
      })
    })

    it('updates flagThrottleLevel to all', async () => {
      mockFamilyGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardians: [{ uid: 'user-123' }],
        }),
      })

      const request = {
        auth: mockAuthContext,
        data: {
          familyId: 'family-123',
          settings: { flagThrottleLevel: 'all' as const },
        },
        rawRequest: {} as never,
      }

      const result = await updateFamilySettings.run(request)

      expect(result.success).toBe(true)
      expect(result.updatedSettings.flagThrottleLevel).toBe('all')
      expect(mockUpdate).toHaveBeenCalledWith({
        'settings.flagThrottleLevel': 'all',
      })
    })

    it('returns success with no changes when empty settings', async () => {
      mockFamilyGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardians: [{ uid: 'user-123' }],
        }),
      })

      const request = {
        auth: mockAuthContext,
        data: {
          familyId: 'family-123',
          settings: {},
        },
        rawRequest: {} as never,
      }

      const result = await updateFamilySettings.run(request)

      expect(result.success).toBe(true)
      expect(result.message).toBe('No settings to update')
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('audit logging', () => {
    it('logs settings change to audit trail', async () => {
      mockFamilyGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardians: [{ uid: 'user-123' }],
        }),
      })

      const request = {
        auth: mockAuthContext,
        data: {
          familyId: 'family-123',
          settings: { flagThrottleLevel: 'detailed' as const },
        },
        rawRequest: {} as never,
      }

      await updateFamilySettings.run(request)

      expect(mockAuditLogCollection).toHaveBeenCalledWith('auditLog')
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'family_settings_updated',
          familyId: 'family-123',
          actorUid: 'user-123',
          changes: { flagThrottleLevel: 'detailed' },
        })
      )
    })
  })

  describe('throttle level validation', () => {
    it.each(['minimal', 'standard', 'detailed', 'all'] as const)(
      'accepts valid throttle level: %s',
      async (level) => {
        mockFamilyGet.mockResolvedValue({
          exists: true,
          data: () => ({
            guardians: [{ uid: 'user-123' }],
          }),
        })

        const request = {
          auth: mockAuthContext,
          data: {
            familyId: 'family-123',
            settings: { flagThrottleLevel: level },
          },
          rawRequest: {} as never,
        }

        const result = await updateFamilySettings.run(request)
        expect(result.success).toBe(true)
        expect(result.updatedSettings.flagThrottleLevel).toBe(level)
      }
    )
  })
})
