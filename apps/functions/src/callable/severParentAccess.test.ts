import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'

// Mock safety request data (verified)
const mockSafetyRequestData = {
  status: 'in-progress',
  verificationChecklist: {
    phoneVerified: true,
    idMatched: true,
    accountOwnershipVerified: true,
    safeContactConfirmed: true,
  },
}

// Mock family membership data (active parent)
const mockMembershipData = {
  userId: 'target-parent-123',
  familyId: 'family-456',
  role: 'parent',
  joinedAt: { seconds: 1700000000, nanoseconds: 0 },
  isActive: true,
}

// Track which collections were accessed
const collectionAccessLog: string[] = []

const mockSafetyRequestUpdate = vi.fn().mockResolvedValue(undefined)

vi.mock('firebase-admin/firestore', () => {
  const mockSafetyRequestGet = vi.fn().mockResolvedValue({
    exists: true,
    id: 'request-123',
    data: () => mockSafetyRequestData,
  })

  const mockMembershipGet = vi.fn().mockResolvedValue({
    exists: true,
    id: 'target-parent-123_family-456',
    data: () => mockMembershipData,
  })

  const mockMembershipUpdate = vi.fn().mockResolvedValue(undefined)
  const mockAuditAdd = vi.fn().mockResolvedValue({ id: 'audit-log-id' })

  const mockCollection = vi.fn().mockImplementation((name: string) => {
    collectionAccessLog.push(name)

    if (name === 'safetyRequests') {
      return {
        doc: vi.fn().mockReturnValue({
          get: mockSafetyRequestGet,
          update: mockSafetyRequestUpdate,
        }),
      }
    }
    if (name === 'familyMemberships') {
      return {
        doc: vi.fn().mockReturnValue({
          get: mockMembershipGet,
          update: mockMembershipUpdate,
        }),
      }
    }
    if (name === 'adminAuditLog') {
      return { add: mockAuditAdd }
    }
    if (name === 'emailQueue') {
      return { add: vi.fn().mockResolvedValue({ id: 'email-queue-id' }) }
    }
    return {
      doc: vi.fn().mockReturnValue({
        get: vi.fn(),
        update: vi.fn(),
      }),
      add: vi.fn(),
    }
  })

  return {
    getFirestore: vi.fn().mockReturnValue({
      collection: mockCollection,
    }),
    FieldValue: {
      serverTimestamp: vi.fn().mockReturnValue('SERVER_TIMESTAMP'),
    },
    Timestamp: {
      now: vi.fn().mockReturnValue({
        seconds: Date.now() / 1000,
        nanoseconds: 0,
        toDate: () => new Date(),
      }),
    },
  }
})

vi.mock('firebase-functions/v2/https', () => ({
  onCall: vi.fn((_config, handler) => handler),
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string,
      public details?: unknown
    ) {
      super(message)
    }
  },
}))

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
}))

// Mock email service functions
vi.mock('../utils/emailService', () => ({
  queueResourceReferralEmail: vi.fn().mockResolvedValue('queue-id-123'),
  hasReferralBeenSent: vi.fn().mockResolvedValue(false),
}))

// Mock firebase-admin/auth
const mockGetUser = vi.fn().mockResolvedValue({
  uid: 'victim-user-123',
  email: 'victim@example.com',
})

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    getUser: mockGetUser,
  })),
}))

import { getFirestore } from 'firebase-admin/firestore'
import { queueResourceReferralEmail, hasReferralBeenSent } from '../utils/emailService'

type CallableFunction = (request: {
  data: Record<string, unknown>
  auth?: { uid: string; token: Record<string, unknown> }
}) => Promise<unknown>

describe('severParentAccess Cloud Function', () => {
  let mockDb: ReturnType<typeof getFirestore>

  beforeAll(() => {
    mockDb = getFirestore()
  })

  afterEach(() => {
    vi.clearAllMocks()
    collectionAccessLog.length = 0
  })

  describe('authentication and authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: undefined,
      }

      await expect(
        (severParentAccess as CallableFunction)(request)
      ).rejects.toThrow('Authentication required')
    })

    it('should reject users without safety-team role', async () => {
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'regular-user',
          token: { isSafetyTeam: false, isAdmin: false },
        },
      }

      await expect(
        (severParentAccess as CallableFunction)(request)
      ).rejects.toThrow('Safety team access required')
    })

    it('should allow safety-team users', async () => {
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true, isAdmin: false },
        },
      }

      const result = await (severParentAccess as CallableFunction)(request)

      expect(result).toHaveProperty('success', true)
      expect(result).toHaveProperty('severed', true)
    })

    it('should reject admin users without safety-team role', async () => {
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'admin-user',
          token: { isSafetyTeam: false, isAdmin: true },
        },
      }

      // CRITICAL: Admin role alone is NOT sufficient for this life-safety operation
      await expect(
        (severParentAccess as CallableFunction)(request)
      ).rejects.toThrow('Safety team access required')
    })
  })

  describe('input validation', () => {
    it('should reject missing requestId', async () => {
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await expect(
        (severParentAccess as CallableFunction)(request)
      ).rejects.toThrow('Invalid input')
    })

    it('should reject missing targetUserId', async () => {
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await expect(
        (severParentAccess as CallableFunction)(request)
      ).rejects.toThrow('Invalid input')
    })

    it('should reject missing familyId', async () => {
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await expect(
        (severParentAccess as CallableFunction)(request)
      ).rejects.toThrow('Invalid input')
    })

    it('should reject empty reason', async () => {
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: '',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await expect(
        (severParentAccess as CallableFunction)(request)
      ).rejects.toThrow('Invalid input')
    })

    it('should reject reason under 20 characters', async () => {
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Too short reason', // Only 16 characters
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await expect(
        (severParentAccess as CallableFunction)(request)
      ).rejects.toThrow('Invalid input')
    })

    it('should reject reason over 5000 characters', async () => {
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'a'.repeat(5001),
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await expect(
        (severParentAccess as CallableFunction)(request)
      ).rejects.toThrow('Invalid input')
    })
  })

  describe('safety request verification', () => {
    it('should reject if safety request not found', async () => {
      vi.mocked(mockDb.collection('safetyRequests').doc('').get).mockResolvedValueOnce({
        exists: false,
        id: 'missing-request',
        data: () => null,
      } as never)

      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'non-existent-request',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await expect(
        (severParentAccess as CallableFunction)(request)
      ).rejects.toThrow('Safety request not found')
    })

    it('should reject if safety request is still pending', async () => {
      vi.mocked(mockDb.collection('safetyRequests').doc('').get).mockResolvedValueOnce({
        exists: true,
        id: 'pending-request',
        data: () => ({
          status: 'pending',
          verificationChecklist: { idMatched: true },
        }),
      } as never)

      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'pending-request',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await expect(
        (severParentAccess as CallableFunction)(request)
      ).rejects.toThrow('Safety request must be reviewed before severing can proceed')
    })

    it('should reject if no identity verification completed', async () => {
      vi.mocked(mockDb.collection('safetyRequests').doc('').get).mockResolvedValueOnce({
        exists: true,
        id: 'unverified-request',
        data: () => ({
          status: 'in-progress',
          verificationChecklist: {
            phoneVerified: false,
            idMatched: false,
            accountOwnershipVerified: false,
            safeContactConfirmed: true, // Not enough
          },
        }),
      } as never)

      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'unverified-request',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await expect(
        (severParentAccess as CallableFunction)(request)
      ).rejects.toThrow('Identity verification required before severing')
    })
  })

  describe('family membership validation', () => {
    it('should reject if parent is not a member of the family', async () => {
      vi.mocked(mockDb.collection('familyMemberships').doc('').get).mockResolvedValueOnce({
        exists: false,
        id: 'missing-membership',
        data: () => null,
      } as never)

      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'non-member',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await expect(
        (severParentAccess as CallableFunction)(request)
      ).rejects.toThrow('Parent is not a member of this family')
    })

    it('should reject if parent is already severed', async () => {
      vi.mocked(mockDb.collection('familyMemberships').doc('').get).mockResolvedValueOnce({
        exists: true,
        id: 'already-severed',
        data: () => ({
          ...mockMembershipData,
          isActive: false,
          severedAt: { seconds: 1700000000, nanoseconds: 0 },
        }),
      } as never)

      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await expect(
        (severParentAccess as CallableFunction)(request)
      ).rejects.toThrow('Parent access has already been severed')
    })

    it('should reject if target is a child not a parent', async () => {
      vi.mocked(mockDb.collection('familyMemberships').doc('').get).mockResolvedValueOnce({
        exists: true,
        id: 'child-membership',
        data: () => ({
          ...mockMembershipData,
          role: 'child',
        }),
      } as never)

      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'child-user',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await expect(
        (severParentAccess as CallableFunction)(request)
      ).rejects.toThrow('Can only sever parent access, not child access')
    })
  })

  describe('successful severing operation', () => {
    it('should update membership to inactive', async () => {
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (severParentAccess as CallableFunction)(request)

      const membershipRef = mockDb.collection('familyMemberships').doc('target-parent-123_family-456')
      expect(membershipRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          severedBy: 'safety-user',
          severedReason: 'Verified abuse victim extraction',
        })
      )
    })

    it('should return success response without revealing reason', async () => {
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'SENSITIVE: Verified abuse victim extraction',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      const result = (await (severParentAccess as CallableFunction)(request)) as Record<string, unknown>

      expect(result.success).toBe(true)
      expect(result.severed).toBe(true)
      expect(result.targetUserId).toBe('target-parent-123')
      expect(result.familyId).toBe('family-456')
      expect(result.severedAt).toBeDefined()
      // CRITICAL: Reason should NOT be in response
      expect(result.reason).toBeUndefined()
    })
  })

  describe('sealed audit logging', () => {
    it('should create sealed audit log entry', async () => {
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (severParentAccess as CallableFunction)(request)

      expect(mockDb.collection).toHaveBeenCalledWith('adminAuditLog')
      const auditCollection = mockDb.collection('adminAuditLog')
      expect(auditCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'parent-severing',
          resourceType: 'familyMembership',
          resourceId: 'target-parent-123_family-456',
          performedBy: 'safety-user',
          affectedUserId: 'target-parent-123',
          familyId: 'family-456',
          safetyRequestId: 'request-123',
          sealed: true, // CRITICAL: Must be sealed
        })
      )
    })

    it('should include integrity hash in audit entry', async () => {
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (severParentAccess as CallableFunction)(request)

      const auditCollection = mockDb.collection('adminAuditLog')
      expect(auditCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          integrityHash: expect.stringMatching(/^[a-f0-9]{64}$/), // SHA-256 hex
        })
      )
    })
  })

  describe('CRITICAL: safety isolation tests', () => {
    it('should NEVER access family audit trail collection', async () => {
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (severParentAccess as CallableFunction)(request)

      // CRITICAL: Should never access family audit trail
      expect(collectionAccessLog).not.toContain('auditLog')
      expect(collectionAccessLog).not.toContain('familyAuditLog')
    })

    it('should NEVER send notifications', async () => {
      // This test verifies that no notification-related collections are accessed
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (severParentAccess as CallableFunction)(request)

      // Should never touch notification collections
      expect(collectionAccessLog).not.toContain('notifications')
      expect(collectionAccessLog).not.toContain('pushNotifications')
      expect(collectionAccessLog).not.toContain('emailQueue')
    })

    it('should ONLY modify allowed collections', async () => {
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (severParentAccess as CallableFunction)(request)

      // Only these collections should be accessed
      const allowedCollections = ['safetyRequests', 'familyMemberships', 'adminAuditLog']

      for (const collection of collectionAccessLog) {
        expect(allowedCollections).toContain(collection)
      }
    })

    it('should preserve severed parent authentication', async () => {
      // This test verifies we don't touch auth-related collections
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (severParentAccess as CallableFunction)(request)

      // Should never modify user authentication
      expect(collectionAccessLog).not.toContain('users')
      expect(collectionAccessLog).not.toContain('authUsers')
    })
  })

  describe('error handling', () => {
    it('should log errors to sealed audit', async () => {
      // Force an error by rejecting the membership update
      vi.mocked(mockDb.collection('familyMemberships').doc('').update).mockRejectedValueOnce(
        new Error('Firestore write failed')
      )

      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await expect(
        (severParentAccess as CallableFunction)(request)
      ).rejects.toThrow('Failed to sever parent access')

      // Error should be logged to sealed audit
      const auditCollection = mockDb.collection('adminAuditLog')
      expect(auditCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'parent_severing_error',
          sealed: true,
          error: expect.any(String),
        })
      )
    })
  })

  describe('triggerResourceReferral integration (AC #7)', () => {
    beforeEach(() => {
      vi.mocked(hasReferralBeenSent).mockResolvedValue(false)
      vi.mocked(queueResourceReferralEmail).mockResolvedValue('queue-id-123')
      mockGetUser.mockResolvedValue({
        uid: 'victim-user-123',
        email: 'victim@example.com',
      })
    })

    it('should not queue email when triggerResourceReferral is false', async () => {
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
          triggerResourceReferral: false,
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      const result = (await (severParentAccess as CallableFunction)(request)) as Record<string, unknown>

      expect(result.success).toBe(true)
      expect(result.resourceReferralQueued).toBe(false)
      expect(queueResourceReferralEmail).not.toHaveBeenCalled()
    })

    it('should not queue email when triggerResourceReferral is not provided', async () => {
      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
          // triggerResourceReferral not provided
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      const result = (await (severParentAccess as CallableFunction)(request)) as Record<string, unknown>

      expect(result.success).toBe(true)
      expect(result.resourceReferralQueued).toBe(false)
      expect(queueResourceReferralEmail).not.toHaveBeenCalled()
    })

    it('should queue email when triggerResourceReferral is true', async () => {
      // Update mock to include victimUserId
      vi.mocked(mockDb.collection('safetyRequests').doc('').get).mockResolvedValueOnce({
        exists: true,
        id: 'request-123',
        data: () => ({
          ...mockSafetyRequestData,
          status: 'resolved',
          submittedBy: 'victim-user-123',
        }),
      } as never)

      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
          triggerResourceReferral: true,
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      const result = (await (severParentAccess as CallableFunction)(request)) as Record<string, unknown>

      expect(result.success).toBe(true)
      expect(result.resourceReferralQueued).toBe(true)
      expect(result.resourceReferralQueueId).toBe('queue-id-123')
      expect(queueResourceReferralEmail).toHaveBeenCalledWith(
        'request-123',
        'victim@example.com',
        false // usedSafeContact = false when using account email
      )
    })

    it('should use safe contact email when available', async () => {
      vi.mocked(mockDb.collection('safetyRequests').doc('').get).mockResolvedValueOnce({
        exists: true,
        id: 'request-123',
        data: () => ({
          ...mockSafetyRequestData,
          status: 'resolved',
          safeContactEmail: 'safe-contact@private.com',
          submittedBy: 'victim-user-123',
        }),
      } as never)

      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
          triggerResourceReferral: true,
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      const result = (await (severParentAccess as CallableFunction)(request)) as Record<string, unknown>

      expect(result.resourceReferralQueued).toBe(true)
      expect(queueResourceReferralEmail).toHaveBeenCalledWith(
        'request-123',
        'safe-contact@private.com',
        true // usedSafeContact = true
      )
    })

    it('should skip if referral has already been sent (idempotency)', async () => {
      vi.mocked(hasReferralBeenSent).mockResolvedValueOnce(true)

      vi.mocked(mockDb.collection('safetyRequests').doc('').get).mockResolvedValueOnce({
        exists: true,
        id: 'request-123',
        data: () => ({
          ...mockSafetyRequestData,
          status: 'resolved',
          submittedBy: 'victim-user-123',
        }),
      } as never)

      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
          triggerResourceReferral: true,
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      const result = (await (severParentAccess as CallableFunction)(request)) as Record<string, unknown>

      expect(result.success).toBe(true)
      expect(result.resourceReferralQueued).toBe(false)
      expect(queueResourceReferralEmail).not.toHaveBeenCalled()
    })

    it('should still succeed if email queueing fails', async () => {
      vi.mocked(queueResourceReferralEmail).mockRejectedValueOnce(new Error('Queue failed'))

      vi.mocked(mockDb.collection('safetyRequests').doc('').get).mockResolvedValueOnce({
        exists: true,
        id: 'request-123',
        data: () => ({
          ...mockSafetyRequestData,
          status: 'resolved',
          submittedBy: 'victim-user-123',
        }),
      } as never)

      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
          triggerResourceReferral: true,
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      // Should NOT throw - severing must succeed even if email fails
      const result = (await (severParentAccess as CallableFunction)(request)) as Record<string, unknown>

      expect(result.success).toBe(true)
      expect(result.severed).toBe(true)
      expect(result.resourceReferralQueued).toBe(false)
    })

    it('should update safetyRequest with referral status', async () => {
      vi.mocked(mockDb.collection('safetyRequests').doc('').get).mockResolvedValueOnce({
        exists: true,
        id: 'request-123',
        data: () => ({
          ...mockSafetyRequestData,
          status: 'resolved',
          submittedBy: 'victim-user-123',
        }),
      } as never)

      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
          triggerResourceReferral: true,
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (severParentAccess as CallableFunction)(request)

      // Verify safety request was updated with referral status
      expect(mockSafetyRequestUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceReferralTriggered: true,
          resourceReferralTriggeredBy: 'safety-user',
          resourceReferralQueueId: 'queue-id-123',
          resourceReferralStatus: 'pending',
        })
      )
    })

    it('should access emailQueue collection when triggerResourceReferral is true', async () => {
      vi.mocked(mockDb.collection('safetyRequests').doc('').get).mockResolvedValueOnce({
        exists: true,
        id: 'request-123',
        data: () => ({
          ...mockSafetyRequestData,
          status: 'resolved',
          submittedBy: 'victim-user-123',
        }),
      } as never)

      const { severParentAccess } = await import('./severParentAccess')

      const request = {
        data: {
          requestId: 'request-123',
          targetUserId: 'target-parent-123',
          familyId: 'family-456',
          reason: 'Verified abuse victim extraction',
          triggerResourceReferral: true,
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      }

      await (severParentAccess as CallableFunction)(request)

      // emailQueue is accessed indirectly through queueResourceReferralEmail
      // but we verify the function was called
      expect(queueResourceReferralEmail).toHaveBeenCalled()
    })
  })
})
