import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock firebase-admin/firestore
const mockAdd = vi.fn().mockResolvedValue({ id: 'audit-log-id' })
const mockGet = vi.fn()
const mockUpdate = vi.fn().mockResolvedValue(undefined)
const mockDoc = vi.fn().mockReturnValue({
  get: mockGet,
  update: mockUpdate,
})
const mockWhere = vi.fn().mockReturnThis()
const mockLimit = vi.fn().mockReturnThis()
const mockCollection = vi.fn().mockImplementation((name: string) => ({
  doc: mockDoc,
  add: mockAdd,
  where: mockWhere,
  limit: mockLimit,
  get: mockGet,
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
  Timestamp: {
    now: vi.fn(() => ({
      toDate: () => new Date('2025-12-15T10:00:00Z'),
    })),
  },
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}))

// Mock firebase-admin/auth
const mockGetUser = vi.fn().mockResolvedValue({
  uid: 'victim-123',
  email: 'victim@example.com',
})

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    getUser: mockGetUser,
  })),
}))

// Mock firebase-functions/v2/https
vi.mock('firebase-functions/v2/https', () => ({
  onCall: vi.fn((options, handler) => handler),
  HttpsError: class HttpsError extends Error {
    code: string
    details?: unknown
    constructor(code: string, message: string, details?: unknown) {
      super(message)
      this.code = code
      this.details = details
      this.name = 'HttpsError'
    }
  },
}))

// Mock emailService
vi.mock('../utils/emailService', () => ({
  queueResourceReferralEmail: vi.fn().mockResolvedValue('queue-id-123'),
  hasReferralBeenSent: vi.fn().mockResolvedValue(false),
  generateIntegrityHash: vi.fn().mockReturnValue('a'.repeat(64)),
}))

describe('triggerResourceReferral', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const { triggerResourceReferral } = await import('./triggerResourceReferral')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: null,
        data: { safetyRequestId: 'request-123' },
      }

      await expect(triggerResourceReferral(request as never)).rejects.toThrow(HttpsError)
      await expect(triggerResourceReferral(request as never)).rejects.toThrow('Authentication required')
    })

    it('should reject non-safety-team users', async () => {
      const { triggerResourceReferral } = await import('./triggerResourceReferral')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: {
          uid: 'user-123',
          token: {
            isAdmin: true,
            // Missing isSafetyTeam
          },
        },
        data: { safetyRequestId: 'request-123' },
      }

      await expect(triggerResourceReferral(request as never)).rejects.toThrow(HttpsError)
      await expect(triggerResourceReferral(request as never)).rejects.toThrow('Safety team access required')
    })
  })

  describe('safety request validation', () => {
    it('should reject if safety request not found', async () => {
      const { triggerResourceReferral } = await import('./triggerResourceReferral')
      const { HttpsError } = await import('firebase-functions/v2/https')

      mockGet.mockResolvedValueOnce({ exists: false })

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: { safetyRequestId: 'nonexistent-request' },
      }

      await expect(triggerResourceReferral(request as never)).rejects.toThrow('Safety request not found')
    })
  })

  describe('idempotency', () => {
    it('should return success if referral already sent', async () => {
      const { triggerResourceReferral } = await import('./triggerResourceReferral')
      const { hasReferralBeenSent } = await import('../utils/emailService')

      vi.mocked(hasReferralBeenSent).mockResolvedValueOnce(true)

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          safeContactEmail: 'safe@example.com',
        }),
      })

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: { safetyRequestId: 'request-123' },
      }

      const result = await triggerResourceReferral(request as never)

      expect(result.success).toBe(true)
      expect(result.alreadySent).toBe(true)
    })
  })

  describe('email recipient selection', () => {
    it('should use safe contact email when provided', async () => {
      const { triggerResourceReferral } = await import('./triggerResourceReferral')
      const { queueResourceReferralEmail, hasReferralBeenSent } = await import('../utils/emailService')

      // Mock hasReferralBeenSent to return false
      vi.mocked(hasReferralBeenSent).mockResolvedValueOnce(false)

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          safeContactEmail: 'safe@example.com',
          victimUserId: 'victim-123',
        }),
      })

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: { safetyRequestId: 'request-123' },
      }

      await triggerResourceReferral(request as never)

      expect(queueResourceReferralEmail).toHaveBeenCalledWith(
        'request-123',
        'safe@example.com',
        true // usedSafeContact
      )
    })

    it('should fall back to account email when no safe contact', async () => {
      // Import first, then set up mocks
      const { triggerResourceReferral } = await import('./triggerResourceReferral')
      const { queueResourceReferralEmail, hasReferralBeenSent } = await import('../utils/emailService')

      // Mock hasReferralBeenSent to return false
      vi.mocked(hasReferralBeenSent).mockResolvedValueOnce(false)

      // Mock safety request exists
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          victimUserId: 'victim-123',
          // No safeContactEmail
        }),
      })

      mockGetUser.mockResolvedValueOnce({
        uid: 'victim-123',
        email: 'victim@example.com',
      })

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: { safetyRequestId: 'request-123' },
      }

      await triggerResourceReferral(request as never)

      expect(queueResourceReferralEmail).toHaveBeenCalledWith(
        'request-123',
        'victim@example.com',
        false // NOT usedSafeContact
      )
    })

    it('should allow email override by safety team', async () => {
      const { triggerResourceReferral } = await import('./triggerResourceReferral')
      const { queueResourceReferralEmail, hasReferralBeenSent } = await import('../utils/emailService')

      // Mock hasReferralBeenSent to return false
      vi.mocked(hasReferralBeenSent).mockResolvedValueOnce(false)

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          safeContactEmail: 'safe@example.com',
          victimUserId: 'victim-123',
        }),
      })

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          safetyRequestId: 'request-123',
          recipientEmailOverride: 'override@example.com',
        },
      }

      await triggerResourceReferral(request as never)

      expect(queueResourceReferralEmail).toHaveBeenCalledWith(
        'request-123',
        'override@example.com',
        false // Override treated as not safe contact
      )
    })
  })

  describe('audit logging', () => {
    it('should log trigger to sealed admin audit', async () => {
      // Import first, then set up mocks
      const { triggerResourceReferral } = await import('./triggerResourceReferral')
      const { hasReferralBeenSent } = await import('../utils/emailService')

      // Mock hasReferralBeenSent to return false
      vi.mocked(hasReferralBeenSent).mockResolvedValueOnce(false)

      // Mock safety request exists
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          safeContactEmail: 'safe@example.com',
        }),
      })

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: { safetyRequestId: 'request-123' },
      }

      await triggerResourceReferral(request as never)

      expect(mockCollection).toHaveBeenCalledWith('adminAuditLog')
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'resource-referral-triggered',
          sealed: true,
        })
      )
    })
  })

  describe('successful completion', () => {
    it('should return success with queue ID', async () => {
      const { triggerResourceReferral } = await import('./triggerResourceReferral')
      const { hasReferralBeenSent } = await import('../utils/emailService')

      // Mock hasReferralBeenSent to return false
      vi.mocked(hasReferralBeenSent).mockResolvedValueOnce(false)

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          safeContactEmail: 'safe@example.com',
        }),
      })

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: { safetyRequestId: 'request-123' },
      }

      const result = await triggerResourceReferral(request as never)

      expect(result.success).toBe(true)
      expect(result.alreadySent).toBe(false)
      expect(result.emailQueueId).toBe('queue-id-123')
      expect(result.usedSafeContact).toBe(true)
    })
  })
})
