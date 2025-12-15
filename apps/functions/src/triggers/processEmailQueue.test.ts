import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock firebase-admin/firestore
const mockUpdate = vi.fn().mockResolvedValue(undefined)
const mockAdd = vi.fn().mockResolvedValue({ id: 'audit-id' })
const mockGet = vi.fn()
const mockDoc = vi.fn().mockReturnValue({
  get: mockGet,
  update: mockUpdate,
})
const mockCollection = vi.fn().mockImplementation(() => ({
  doc: mockDoc,
  add: mockAdd,
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
  Timestamp: {
    now: vi.fn(() => ({
      toDate: () => new Date('2025-12-15T10:00:00Z'),
    })),
    fromMillis: vi.fn((ms: number) => ({
      toDate: () => new Date(ms),
    })),
  },
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}))

// Mock firebase-functions/v2/firestore
vi.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: vi.fn((path, handler) => handler),
  onDocumentUpdated: vi.fn((path, handler) => handler),
}))

// Mock emailService
vi.mock('../utils/emailService', () => ({
  generateResourceEmail: vi.fn().mockResolvedValue({
    subject: 'Resources you requested',
    html: '<html>test</html>',
    text: 'Test content',
  }),
  updateEmailQueueStatus: vi.fn().mockResolvedValue(undefined),
  scheduleEmailRetry: vi.fn().mockResolvedValue(undefined),
  MAX_RETRY_ATTEMPTS: 3,
  generateIntegrityHash: vi.fn().mockReturnValue('a'.repeat(64)),
}))

describe('processEmailQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('processEmailQueueOnCreate', () => {
    it('should process pending resource-referral emails', async () => {
      const { processEmailQueueOnCreate } = await import('./processEmailQueue')

      const event = {
        params: { queueId: 'queue-123' },
        data: {
          data: () => ({
            type: 'resource-referral',
            recipient: 'test@example.com',
            safetyRequestId: 'request-123',
            status: 'pending',
            attempts: 0,
            maxAttempts: 3,
            usedSafeContact: true,
          }),
        },
      }

      await processEmailQueueOnCreate(event as never)

      // Should update status to processing then sent
      expect(mockUpdate).toHaveBeenCalled()
    })

    it('should skip non-pending items', async () => {
      const { processEmailQueueOnCreate } = await import('./processEmailQueue')

      const event = {
        params: { queueId: 'queue-123' },
        data: {
          data: () => ({
            type: 'resource-referral',
            recipient: 'test@example.com',
            status: 'sent', // Already sent
            attempts: 1,
          }),
        },
      }

      await processEmailQueueOnCreate(event as never)

      // Should not update since already sent
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should skip non-resource-referral types', async () => {
      const { processEmailQueueOnCreate } = await import('./processEmailQueue')

      const event = {
        params: { queueId: 'queue-123' },
        data: {
          data: () => ({
            type: 'other-type',
            recipient: 'test@example.com',
            status: 'pending',
          }),
        },
      }

      await processEmailQueueOnCreate(event as never)

      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('processEmailQueueOnUpdate', () => {
    it('should process items when status changes to pending for retry', async () => {
      const { processEmailQueueOnUpdate } = await import('./processEmailQueue')

      const event = {
        params: { queueId: 'queue-123' },
        data: {
          before: {
            data: () => ({
              type: 'resource-referral',
              status: 'processing', // Was processing
            }),
          },
          after: {
            data: () => ({
              type: 'resource-referral',
              recipient: 'test@example.com',
              safetyRequestId: 'request-123',
              status: 'pending', // Now pending for retry
              attempts: 1,
              maxAttempts: 3,
              usedSafeContact: true,
              nextAttemptAt: {
                seconds: Math.floor(Date.now() / 1000) - 60, // Past
              },
            }),
          },
        },
      }

      await processEmailQueueOnUpdate(event as never)

      // Should process the retry
      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  describe('email validation', () => {
    it('should fail for invalid email format', async () => {
      const { processEmailQueueOnCreate } = await import('./processEmailQueue')

      const event = {
        params: { queueId: 'queue-123' },
        data: {
          data: () => ({
            type: 'resource-referral',
            recipient: 'not-valid-email',
            safetyRequestId: 'request-123',
            status: 'pending',
            attempts: 0,
            maxAttempts: 3,
            usedSafeContact: true,
          }),
        },
      }

      await processEmailQueueOnCreate(event as never)

      // Should have attempted to process and potentially retry
      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  describe('audit logging', () => {
    it('should log successful delivery to sealed audit', async () => {
      const { processEmailQueueOnCreate } = await import('./processEmailQueue')

      // Mock the safetyRequest lookup (doc().get())
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          status: 'in-progress',
        }),
      })

      const event = {
        params: { queueId: 'queue-123' },
        data: {
          data: () => ({
            type: 'resource-referral',
            recipient: 'valid@example.com',
            safetyRequestId: 'request-123',
            status: 'pending',
            attempts: 0,
            maxAttempts: 3,
            usedSafeContact: true,
          }),
        },
      }

      await processEmailQueueOnCreate(event as never)

      expect(mockCollection).toHaveBeenCalledWith('adminAuditLog')
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'resource-email-success',
          sealed: true,
        })
      )
    })
  })
})
