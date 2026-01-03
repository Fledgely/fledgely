/**
 * Tests for removeCaregiverWithNotification Cloud Function.
 *
 * Story 39.7: Caregiver Removal
 * - AC1: Immediate Access Revocation
 * - AC3: Child Notification
 * - AC6: Optional Removal Reason
 *
 * Tests cover:
 * - Authentication validation
 * - Permission validation (only guardians can remove)
 * - Caregiver existence validation
 * - Caregiver removal from family
 * - Child notification creation
 * - Audit log with optional reason
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @fledgely/shared
vi.mock('@fledgely/shared', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { z } = require('zod')
  return {
    removeCaregiverWithNotificationInputSchema: z.object({
      familyId: z.string().min(1),
      caregiverUid: z.string().min(1),
      caregiverEmail: z.string().email(),
      reason: z.string().max(500).optional(),
    }),
  }
})

// Mock firebase-admin/firestore
const mockBatchSet = vi.fn()
const mockBatchUpdate = vi.fn()
const mockBatchDelete = vi.fn()
const mockBatchCommit = vi.fn()
const mockDocGet = vi.fn()
const _mockDoc = vi.fn()
const mockCollection = vi.fn()

vi.mock('firebase-admin/firestore', () => {
  return {
    getFirestore: () => ({
      collection: (...args: unknown[]) => mockCollection(...args),
      batch: () => ({
        set: mockBatchSet,
        update: mockBatchUpdate,
        delete: mockBatchDelete,
        commit: mockBatchCommit,
      }),
    }),
    FieldValue: {
      serverTimestamp: () => 'SERVER_TIMESTAMP',
    },
  }
})

// Mock firebase-functions
vi.mock('firebase-functions/v2/https', () => ({
  onCall: (handler: unknown) => handler,
  HttpsError: class HttpsError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
      this.name = 'HttpsError'
    }
  },
}))

// Mock auth verification
vi.mock('../shared/auth', () => ({
  verifyAuth: vi.fn((auth) => {
    if (!auth || !auth.uid) {
      const error = new Error('Authentication required')
      ;(error as unknown as { code: string }).code = 'unauthenticated'
      throw error
    }
    return { uid: auth.uid, email: auth.email || 'parent@example.com' }
  }),
}))

// Import after mocks
import { removeCaregiverWithNotification } from './removeCaregiverWithNotification'

describe('removeCaregiverWithNotification', () => {
  const mockCaregiver = {
    uid: 'caregiver-123',
    email: 'grandma@example.com',
    displayName: 'Grandma',
    role: 'status_viewer',
    relationship: 'grandparent',
    childIds: ['child-1', 'child-2'],
    permissions: {
      canExtendTime: false,
      canViewFlags: false,
    },
    addedAt: new Date(),
    addedByUid: 'parent-123',
  }

  const mockFamilyWithCaregiver = {
    exists: true,
    data: () => ({
      id: 'family-456',
      name: 'Test Family',
      guardianUids: ['parent-123'],
      caregivers: [mockCaregiver],
      caregiverUids: ['caregiver-123'],
    }),
  }

  const mockFamilyDoc = {
    get: mockDocGet,
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        id: 'notification-789',
      }),
    }),
  }

  const mockInvitationDoc = {
    exists: false,
    get: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default successful mocks
    mockDocGet.mockResolvedValue(mockFamilyWithCaregiver)

    mockCollection.mockImplementation((path: string) => {
      if (path === 'families') {
        return {
          doc: vi.fn().mockReturnValue(mockFamilyDoc),
        }
      }
      if (path === 'caregiverAuditLogs') {
        return {
          doc: vi.fn().mockReturnValue({ id: 'audit-101' }),
        }
      }
      if (path === 'caregiverInvitations') {
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(mockInvitationDoc),
          }),
        }
      }
      return { doc: vi.fn() }
    })

    mockBatchCommit.mockResolvedValue(undefined)
  })

  describe('Authentication (Step 1)', () => {
    it('throws unauthenticated error when no auth provided', async () => {
      await expect(
        removeCaregiverWithNotification({
          auth: null,
          data: {
            familyId: 'family-456',
            caregiverUid: 'caregiver-123',
            caregiverEmail: 'grandma@example.com',
          },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Authentication required')
    })
  })

  describe('Validation (Step 2)', () => {
    it('throws invalid-argument error for missing familyId', async () => {
      await expect(
        removeCaregiverWithNotification({
          auth: { uid: 'parent-123', token: {} as never },
          data: {
            caregiverUid: 'caregiver-123',
            caregiverEmail: 'grandma@example.com',
          } as never,
          rawRequest: {} as never,
        })
      ).rejects.toThrow()
    })

    it('throws invalid-argument error for invalid email', async () => {
      await expect(
        removeCaregiverWithNotification({
          auth: { uid: 'parent-123', token: {} as never },
          data: {
            familyId: 'family-456',
            caregiverUid: 'caregiver-123',
            caregiverEmail: 'not-an-email',
          },
          rawRequest: {} as never,
        })
      ).rejects.toThrow()
    })

    it('accepts valid input with optional reason', async () => {
      const result = await removeCaregiverWithNotification({
        auth: { uid: 'parent-123', token: {} as never },
        data: {
          familyId: 'family-456',
          caregiverUid: 'caregiver-123',
          caregiverEmail: 'grandma@example.com',
          reason: 'Moving out of state',
        },
        rawRequest: {} as never,
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Permission (Step 3)', () => {
    it('throws not-found error when family does not exist', async () => {
      mockDocGet.mockResolvedValue({ exists: false })

      await expect(
        removeCaregiverWithNotification({
          auth: { uid: 'parent-123', token: {} as never },
          data: {
            familyId: 'family-456',
            caregiverUid: 'caregiver-123',
            caregiverEmail: 'grandma@example.com',
          },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Family not found')
    })

    it('throws permission-denied error when caller is not guardian', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardianUids: ['other-parent'],
          caregivers: [mockCaregiver],
        }),
      })

      await expect(
        removeCaregiverWithNotification({
          auth: { uid: 'parent-123', token: {} as never },
          data: {
            familyId: 'family-456',
            caregiverUid: 'caregiver-123',
            caregiverEmail: 'grandma@example.com',
          },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Only family guardians can remove caregivers')
    })

    it('throws not-found error when caregiver not in family', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardianUids: ['parent-123'],
          caregivers: [], // Empty caregivers
        }),
      })

      await expect(
        removeCaregiverWithNotification({
          auth: { uid: 'parent-123', token: {} as never },
          data: {
            familyId: 'family-456',
            caregiverUid: 'caregiver-123',
            caregiverEmail: 'grandma@example.com',
          },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Caregiver not found in family')
    })
  })

  describe('Business Logic (Step 4)', () => {
    it('removes caregiver from family document', async () => {
      await removeCaregiverWithNotification({
        auth: { uid: 'parent-123', token: {} as never },
        data: {
          familyId: 'family-456',
          caregiverUid: 'caregiver-123',
          caregiverEmail: 'grandma@example.com',
        },
        rawRequest: {} as never,
      })

      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          caregivers: [],
          caregiverUids: [],
        })
      )
    })

    it('creates child notification with caregiver name', async () => {
      await removeCaregiverWithNotification({
        auth: { uid: 'parent-123', token: {} as never },
        data: {
          familyId: 'family-456',
          caregiverUid: 'caregiver-123',
          caregiverEmail: 'grandma@example.com',
        },
        rawRequest: {} as never,
      })

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'caregiver_removed',
          childUids: ['child-1', 'child-2'],
          message: 'Grandma is no longer a caregiver',
          caregiverName: 'Grandma',
          readBy: [],
        })
      )
    })

    it('creates audit log entry without reason', async () => {
      await removeCaregiverWithNotification({
        auth: { uid: 'parent-123', token: {} as never },
        data: {
          familyId: 'family-456',
          caregiverUid: 'caregiver-123',
          caregiverEmail: 'grandma@example.com',
        },
        rawRequest: {} as never,
      })

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          familyId: 'family-456',
          caregiverUid: 'caregiver-123',
          action: 'caregiver_removed',
          changedByUid: 'parent-123',
        })
      )
    })

    it('includes reason in audit log when provided (AC6)', async () => {
      await removeCaregiverWithNotification({
        auth: { uid: 'parent-123', token: {} as never },
        data: {
          familyId: 'family-456',
          caregiverUid: 'caregiver-123',
          caregiverEmail: 'grandma@example.com',
          reason: 'Moving out of state',
        },
        rawRequest: {} as never,
      })

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'caregiver_removed',
          changes: expect.objectContaining({
            removalReason: 'Moving out of state',
          }),
        })
      )
    })

    it('returns success with notification ID', async () => {
      const result = await removeCaregiverWithNotification({
        auth: { uid: 'parent-123', token: {} as never },
        data: {
          familyId: 'family-456',
          caregiverUid: 'caregiver-123',
          caregiverEmail: 'grandma@example.com',
        },
        rawRequest: {} as never,
      })

      expect(result.success).toBe(true)
      expect(result.notificationId).toBeDefined()
      expect(result.message).toContain('Grandma')
    })

    it('uses email as fallback when displayName is missing', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardianUids: ['parent-123'],
          caregivers: [
            {
              ...mockCaregiver,
              displayName: null,
            },
          ],
          caregiverUids: ['caregiver-123'],
        }),
      })

      await removeCaregiverWithNotification({
        auth: { uid: 'parent-123', token: {} as never },
        data: {
          familyId: 'family-456',
          caregiverUid: 'caregiver-123',
          caregiverEmail: 'grandma@example.com',
        },
        rawRequest: {} as never,
      })

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          message: 'grandma@example.com is no longer a caregiver',
        })
      )
    })
  })

  describe('Batch Commit', () => {
    it('commits all changes in a single batch', async () => {
      await removeCaregiverWithNotification({
        auth: { uid: 'parent-123', token: {} as never },
        data: {
          familyId: 'family-456',
          caregiverUid: 'caregiver-123',
          caregiverEmail: 'grandma@example.com',
        },
        rawRequest: {} as never,
      })

      expect(mockBatchCommit).toHaveBeenCalledTimes(1)
      expect(mockBatchUpdate).toHaveBeenCalledTimes(1) // Family update
      expect(mockBatchSet).toHaveBeenCalledTimes(2) // Notification + Audit log
    })
  })
})
