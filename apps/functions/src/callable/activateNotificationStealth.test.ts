import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CallableRequest } from 'firebase-functions/v2/https'

// Mock firebase-admin/firestore
const mockGet = vi.fn()
const mockAdd = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockWhere = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
    doc: mockDoc,
  }),
  FieldValue: {
    serverTimestamp: () => ({ _serverTimestamp: true }),
    delete: () => ({ _delete: true }),
    increment: (n: number) => ({ _increment: n }),
  },
  Timestamp: {
    now: () => ({
      toDate: () => new Date('2025-01-15T12:00:00Z'),
    }),
    fromDate: (date: Date) => ({
      toDate: () => date,
    }),
  },
}))

// Mock firebase-functions/v2/https
vi.mock('firebase-functions/v2/https', () => ({
  onCall: (_config: unknown, handler: (request: CallableRequest) => unknown) => handler,
  HttpsError: class HttpsError extends Error {
    code: string
    details?: unknown
    constructor(code: string, message: string, details?: unknown) {
      super(message)
      this.code = code
      this.details = details
    }
  },
}))

// Import after mocks
import { activateNotificationStealth } from './activateNotificationStealth'

// Type helper
type CallableFunction = (request: CallableRequest) => Promise<unknown>

describe('activateNotificationStealth', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockCollection.mockReturnValue({
      doc: mockDoc,
      add: mockAdd,
      where: mockWhere,
    })

    mockWhere.mockReturnValue({
      where: mockWhere,
      get: mockGet,
    })

    mockDoc.mockReturnValue({
      get: mockGet,
      collection: mockCollection,
    })

    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({}),
    })

    mockAdd.mockResolvedValue({ id: 'new-stealth-queue-id' })
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const request = {
        auth: null,
        data: {
          requestId: 'safety-req-123',
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          reason: 'Protecting victim from domestic abuse situation',
        },
      } as unknown as CallableRequest

      await expect(
        (activateNotificationStealth as CallableFunction)(request)
      ).rejects.toThrow('Authentication required')
    })

    it('should reject non-safety-team users', async () => {
      const request = {
        auth: {
          uid: 'admin-user-123',
          token: {
            isAdmin: true,
            isSafetyTeam: false,
          },
        },
        data: {
          requestId: 'safety-req-123',
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          reason: 'Protecting victim from domestic abuse situation',
        },
      } as unknown as CallableRequest

      await expect(
        (activateNotificationStealth as CallableFunction)(request)
      ).rejects.toThrow('Safety team access required')
    })
  })

  describe('Input Validation', () => {
    it('should reject empty requestId', async () => {
      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: '',
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          reason: 'Protecting victim from domestic abuse situation',
        },
      } as unknown as CallableRequest

      await expect(
        (activateNotificationStealth as CallableFunction)(request)
      ).rejects.toThrow('Invalid input')
    })

    it('should reject empty familyId', async () => {
      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: 'safety-req-123',
          familyId: '',
          targetUserIds: ['user-456'],
          reason: 'Protecting victim from domestic abuse situation',
        },
      } as unknown as CallableRequest

      await expect(
        (activateNotificationStealth as CallableFunction)(request)
      ).rejects.toThrow('Invalid input')
    })

    it('should reject empty targetUserIds array', async () => {
      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: 'safety-req-123',
          familyId: 'family-123',
          targetUserIds: [],
          reason: 'Protecting victim from domestic abuse situation',
        },
      } as unknown as CallableRequest

      await expect(
        (activateNotificationStealth as CallableFunction)(request)
      ).rejects.toThrow('Invalid input')
    })

    it('should reject reason shorter than 20 characters', async () => {
      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: 'safety-req-123',
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          reason: 'Too short',
        },
      } as unknown as CallableRequest

      await expect(
        (activateNotificationStealth as CallableFunction)(request)
      ).rejects.toThrow('Invalid input')
    })

    it('should reject durationHours less than 24', async () => {
      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: 'safety-req-123',
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          reason: 'Protecting victim from domestic abuse situation',
          durationHours: 12,
        },
      } as unknown as CallableRequest

      await expect(
        (activateNotificationStealth as CallableFunction)(request)
      ).rejects.toThrow('Invalid input')
    })

    it('should reject durationHours greater than 168', async () => {
      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: 'safety-req-123',
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          reason: 'Protecting victim from domestic abuse situation',
          durationHours: 200,
        },
      } as unknown as CallableRequest

      await expect(
        (activateNotificationStealth as CallableFunction)(request)
      ).rejects.toThrow('Invalid input')
    })
  })

  describe('Safety Request Validation', () => {
    it('should reject non-existent safety request', async () => {
      mockGet.mockReset().mockResolvedValueOnce({ exists: false }) // Safety request

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: 'nonexistent-req',
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          reason: 'Protecting victim from domestic abuse situation',
        },
      } as unknown as CallableRequest

      await expect(
        (activateNotificationStealth as CallableFunction)(request)
      ).rejects.toThrow('Safety request not found')
    })

    it('should reject pending safety request', async () => {
      mockGet.mockReset().mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'pending',
          familyId: 'family-123',
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: 'safety-req-123',
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          reason: 'Protecting victim from domestic abuse situation',
        },
      } as unknown as CallableRequest

      await expect(
        (activateNotificationStealth as CallableFunction)(request)
      ).rejects.toThrow('Safety request must be reviewed')
    })

    it('should reject unverified safety request', async () => {
      mockGet.mockReset().mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          familyId: 'family-123',
          verificationChecklist: {
            accountOwnershipVerified: false,
            idMatched: false,
          },
        }),
      })

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: 'safety-req-123',
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          reason: 'Protecting victim from domestic abuse situation',
        },
      } as unknown as CallableRequest

      await expect(
        (activateNotificationStealth as CallableFunction)(request)
      ).rejects.toThrow('Identity verification required')
    })

    it('should reject safety request for different family', async () => {
      mockGet.mockReset().mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          familyId: 'different-family',
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: 'safety-req-123',
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          reason: 'Protecting victim from domestic abuse situation',
        },
      } as unknown as CallableRequest

      await expect(
        (activateNotificationStealth as CallableFunction)(request)
      ).rejects.toThrow('Safety request does not match the specified family')
    })
  })

  describe('Family and User Validation', () => {
    it('should reject non-existent family', async () => {
      mockGet
        .mockReset()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            status: 'in-progress',
            familyId: 'family-123',
            verificationChecklist: { accountOwnershipVerified: true },
          }),
        }) // Safety request
        .mockResolvedValueOnce({ exists: false }) // Family

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: 'safety-req-123',
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          reason: 'Protecting victim from domestic abuse situation',
        },
      } as unknown as CallableRequest

      await expect(
        (activateNotificationStealth as CallableFunction)(request)
      ).rejects.toThrow('Family not found')
    })

    it('should reject non-existent user', async () => {
      mockGet
        .mockReset()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            status: 'in-progress',
            familyId: 'family-123',
            verificationChecklist: { accountOwnershipVerified: true },
          }),
        }) // Safety request
        .mockResolvedValueOnce({ exists: true, data: () => ({}) }) // Family
        .mockResolvedValueOnce({ exists: false }) // User

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: 'safety-req-123',
          familyId: 'family-123',
          targetUserIds: ['nonexistent-user'],
          reason: 'Protecting victim from domestic abuse situation',
        },
      } as unknown as CallableRequest

      await expect(
        (activateNotificationStealth as CallableFunction)(request)
      ).rejects.toThrow('One or more users not found')
    })

    it('should reject user not in specified family', async () => {
      mockGet
        .mockReset()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            status: 'in-progress',
            familyId: 'family-123',
            verificationChecklist: { accountOwnershipVerified: true },
          }),
        }) // Safety request
        .mockResolvedValueOnce({ exists: true, data: () => ({}) }) // Family
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ familyId: 'other-family' }),
        }) // User

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: 'safety-req-123',
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          reason: 'Protecting victim from domestic abuse situation',
        },
      } as unknown as CallableRequest

      // Generic error message to prevent information leakage
      await expect(
        (activateNotificationStealth as CallableFunction)(request)
      ).rejects.toThrow('One or more users not found or do not belong')
    })
  })

  describe('Successful Activation', () => {
    beforeEach(() => {
      mockGet
        .mockReset()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            status: 'in-progress',
            familyId: 'family-123',
            verificationChecklist: { accountOwnershipVerified: true },
          }),
        }) // Safety request
        .mockResolvedValueOnce({ exists: true, data: () => ({}) }) // Family
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ familyId: 'family-123' }),
        }) // User
        .mockResolvedValueOnce({ empty: true, docs: [] }) // Existing stealth query - empty
    })

    it('should activate stealth mode with default 72 hour duration', async () => {
      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: 'safety-req-123',
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          reason: 'Protecting victim from domestic abuse situation',
        },
      } as unknown as CallableRequest

      const result = await (activateNotificationStealth as CallableFunction)(request)

      expect(result).toMatchObject({
        success: true,
        activated: true,
        queueId: 'new-stealth-queue-id',
        familyId: 'family-123',
        targetUserIds: ['user-456'],
        durationHours: 72,
      })

      // Verify stealth queue was created
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          sealed: true,
        })
      )

      // Verify admin audit log was created
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'notification-stealth-activate',
          resourceType: 'stealth-queue',
          sealed: true,
        })
      )
    })

    it('should activate stealth with custom duration', async () => {
      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: 'safety-req-123',
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          reason: 'Protecting victim from domestic abuse situation',
          durationHours: 48,
        },
      } as unknown as CallableRequest

      const result = await (activateNotificationStealth as CallableFunction)(request)

      expect(result).toMatchObject({
        success: true,
        activated: true,
        durationHours: 48,
      })
    })

    it('should NOT include reason in response', async () => {
      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: 'safety-req-123',
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          reason: 'This sensitive reason should not appear in response',
        },
      } as unknown as CallableRequest

      const result = await (activateNotificationStealth as CallableFunction)(request)

      expect(result).not.toHaveProperty('reason')
    })
  })

  describe('Idempotent Activation', () => {
    it('should return existing stealth queue if already active', async () => {
      mockGet
        .mockReset()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            status: 'in-progress',
            familyId: 'family-123',
            verificationChecklist: { accountOwnershipVerified: true },
          }),
        }) // Safety request
        .mockResolvedValueOnce({ exists: true, data: () => ({}) }) // Family
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ familyId: 'family-123' }),
        }) // User
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            {
              id: 'existing-stealth-queue',
              data: () => ({
                familyId: 'family-123',
                targetUserIds: ['user-456'],
                expiresAt: { toDate: () => new Date('2025-01-18T12:00:00Z') },
              }),
            },
          ],
        }) // Existing stealth query - found active

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: 'safety-req-123',
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          reason: 'Protecting victim from domestic abuse situation',
        },
      } as unknown as CallableRequest

      const result = await (activateNotificationStealth as CallableFunction)(request)

      expect(result).toMatchObject({
        success: true,
        activated: false,
        alreadyActive: true,
        queueId: 'existing-stealth-queue',
      })

      // Should NOT create new stealth queue
      expect(mockAdd).not.toHaveBeenCalledWith(
        expect.objectContaining({
          familyId: 'family-123',
          notificationTypesToSuppress: expect.any(Array),
        })
      )
    })
  })

  describe('Sealed Admin Audit', () => {
    beforeEach(() => {
      mockGet
        .mockReset()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            status: 'in-progress',
            familyId: 'family-123',
            verificationChecklist: { accountOwnershipVerified: true },
          }),
        }) // Safety request
        .mockResolvedValueOnce({ exists: true, data: () => ({}) }) // Family
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ familyId: 'family-123' }),
        }) // User
        .mockResolvedValueOnce({ empty: true, docs: [] }) // Stealth query - empty
    })

    it('should create sealed audit log entry', async () => {
      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: 'safety-req-123',
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          reason: 'Protecting victim from domestic abuse situation',
        },
      } as unknown as CallableRequest

      await (activateNotificationStealth as CallableFunction)(request)

      // Check that adminAuditLog.add was called with sealed entry
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'notification-stealth-activate',
          resourceType: 'stealth-queue',
          performedBy: 'safety-agent-123',
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          safetyRequestId: 'safety-req-123',
          sealed: true,
          integrityHash: expect.any(String),
        })
      )
    })

    it('should include reason in audit log', async () => {
      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: 'safety-req-123',
          familyId: 'family-123',
          targetUserIds: ['user-456'],
          reason: 'Protecting victim from domestic abuse situation',
        },
      } as unknown as CallableRequest

      await (activateNotificationStealth as CallableFunction)(request)

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'Protecting victim from domestic abuse situation',
        })
      )
    })
  })

  describe('Multiple Users', () => {
    it('should handle multiple target users', async () => {
      mockGet
        .mockReset()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            status: 'in-progress',
            familyId: 'family-123',
            verificationChecklist: { accountOwnershipVerified: true },
          }),
        }) // Safety request
        .mockResolvedValueOnce({ exists: true, data: () => ({}) }) // Family
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ familyId: 'family-123' }),
        }) // User 1
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ familyId: 'family-123' }),
        }) // User 2
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ familyId: 'family-123' }),
        }) // User 3
        .mockResolvedValueOnce({ empty: true, docs: [] }) // Stealth query - empty

      const request = {
        auth: {
          uid: 'safety-agent-123',
          token: { isSafetyTeam: true },
        },
        data: {
          requestId: 'safety-req-123',
          familyId: 'family-123',
          targetUserIds: ['user-1', 'user-2', 'user-3'],
          reason: 'Protecting victim from domestic abuse situation',
        },
      } as unknown as CallableRequest

      const result = await (activateNotificationStealth as CallableFunction)(request)

      expect(result).toMatchObject({
        success: true,
        activated: true,
        targetUserIds: ['user-1', 'user-2', 'user-3'],
      })
    })
  })
})
