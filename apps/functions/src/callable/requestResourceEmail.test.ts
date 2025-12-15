import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock firebase-admin/firestore
const mockAdd = vi.fn().mockResolvedValue({ id: 'queue-id-123' })
const mockGet = vi.fn()
const mockWhere = vi.fn().mockReturnThis()
const mockLimit = vi.fn().mockReturnThis()
const mockCollection = vi.fn().mockImplementation(() => ({
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
    fromMillis: vi.fn((ms: number) => ({
      toDate: () => new Date(ms),
    })),
  },
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
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

describe('requestResourceEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: no recent requests
    mockGet.mockResolvedValue({ empty: true, docs: [] })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const { requestResourceEmail } = await import('./requestResourceEmail')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: null,
        data: { email: 'test@example.com' },
      }

      await expect(requestResourceEmail(request as never)).rejects.toThrow(HttpsError)
      await expect(requestResourceEmail(request as never)).rejects.toThrow('Authentication required')
    })
  })

  describe('input validation', () => {
    it('should reject invalid email format', async () => {
      const { requestResourceEmail } = await import('./requestResourceEmail')
      const { HttpsError } = await import('firebase-functions/v2/https')

      const request = {
        auth: { uid: 'user-123', token: {} },
        data: { email: 'not-an-email' },
      }

      await expect(requestResourceEmail(request as never)).rejects.toThrow('Invalid email address')
    })

    it('should accept valid email address', async () => {
      const { requestResourceEmail } = await import('./requestResourceEmail')

      const request = {
        auth: { uid: 'user-123', token: {} },
        data: { email: 'valid@example.com' },
      }

      const result = await requestResourceEmail(request as never)

      expect(result.success).toBe(true)
    })
  })

  describe('rate limiting', () => {
    it('should reject if user requested email in last hour', async () => {
      const { requestResourceEmail } = await import('./requestResourceEmail')
      const { HttpsError } = await import('firebase-functions/v2/https')

      // Mock recent request exists - need to set for both assertion calls
      mockGet.mockResolvedValue({
        empty: false,
        docs: [{ id: 'recent-request' }],
      })

      const request = {
        auth: { uid: 'user-123', token: {} },
        data: { email: 'test@example.com' },
      }

      await expect(requestResourceEmail(request as never)).rejects.toThrow(HttpsError)

      // Reset for second assertion
      mockGet.mockResolvedValue({
        empty: false,
        docs: [{ id: 'recent-request' }],
      })
      await expect(requestResourceEmail(request as never)).rejects.toThrow('Please wait')
    })

    it('should allow request if no recent request exists', async () => {
      const { requestResourceEmail } = await import('./requestResourceEmail')

      mockGet.mockResolvedValueOnce({ empty: true, docs: [] })

      const request = {
        auth: { uid: 'user-123', token: {} },
        data: { email: 'test@example.com' },
      }

      const result = await requestResourceEmail(request as never)

      expect(result.success).toBe(true)
    })
  })

  describe('email queueing', () => {
    it('should add email to queue', async () => {
      const { requestResourceEmail } = await import('./requestResourceEmail')

      mockGet.mockResolvedValueOnce({ empty: true, docs: [] })

      const request = {
        auth: { uid: 'user-123', token: {} },
        data: { email: 'recipient@example.com' },
      }

      await requestResourceEmail(request as never)

      expect(mockCollection).toHaveBeenCalledWith('emailQueue')
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'resource-referral',
          recipient: 'recipient@example.com',
          status: 'pending',
          isSelfRequest: true,
        })
      )
    })
  })

  describe('audit logging', () => {
    it('should log request to sealed admin audit', async () => {
      const { requestResourceEmail } = await import('./requestResourceEmail')

      mockGet.mockResolvedValueOnce({ empty: true, docs: [] })

      const request = {
        auth: { uid: 'user-123', token: {} },
        data: { email: 'test@example.com' },
      }

      await requestResourceEmail(request as never)

      expect(mockCollection).toHaveBeenCalledWith('adminAuditLog')
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'self-resource-email-requested',
          sealed: true,
        })
      )
    })

    it('should NOT log user ID or email in audit', async () => {
      const { requestResourceEmail } = await import('./requestResourceEmail')

      mockGet.mockResolvedValueOnce({ empty: true, docs: [] })

      const request = {
        auth: { uid: 'user-123', token: {} },
        data: { email: 'sensitive@example.com' },
      }

      await requestResourceEmail(request as never)

      // Find the adminAuditLog add call
      const auditLogCalls = mockAdd.mock.calls.filter(
        call => call[0]?.action === 'self-resource-email-requested'
      )

      expect(auditLogCalls.length).toBe(1)
      const auditData = auditLogCalls[0][0]

      // Should NOT contain user ID or email for privacy
      expect(auditData.callerUid).toBeUndefined()
      expect(auditData.email).toBeUndefined()
      expect(auditData.recipient).toBeUndefined()
    })
  })

  describe('response', () => {
    it('should return success message', async () => {
      const { requestResourceEmail } = await import('./requestResourceEmail')

      mockGet.mockResolvedValueOnce({ empty: true, docs: [] })

      const request = {
        auth: { uid: 'user-123', token: {} },
        data: { email: 'test@example.com' },
      }

      const result = await requestResourceEmail(request as never)

      expect(result.success).toBe(true)
      expect(result.message).toContain('email')
    })
  })
})
