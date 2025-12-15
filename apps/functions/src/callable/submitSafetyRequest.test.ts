import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'

// Mock firebase-admin before imports
vi.mock('firebase-admin/firestore', () => {
  const mockDoc = vi.fn()
  const mockSet = vi.fn().mockResolvedValue(undefined)
  const mockAdd = vi.fn().mockResolvedValue({ id: 'audit-log-id' })
  const mockCollection = vi.fn().mockImplementation((name: string) => {
    if (name === 'safetyRequests') {
      return {
        doc: mockDoc.mockReturnValue({
          id: 'test-request-id',
          set: mockSet,
        }),
      }
    }
    if (name === 'adminAuditLog') {
      return {
        add: mockAdd,
      }
    }
    // Return mock for any family-related collections to detect violations
    return {
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          add: vi.fn().mockImplementation(() => {
            throw new Error(
              `CRITICAL VIOLATION: Attempted to write to family collection ${name}`
            )
          }),
        }),
      }),
    }
  })

  return {
    getFirestore: vi.fn().mockReturnValue({
      collection: mockCollection,
    }),
    Timestamp: {
      now: vi.fn().mockReturnValue({ seconds: Date.now() / 1000, nanoseconds: 0 }),
    },
    FieldValue: {
      serverTimestamp: vi.fn().mockReturnValue('SERVER_TIMESTAMP'),
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

import { getFirestore } from 'firebase-admin/firestore'

describe('submitSafetyRequest Cloud Function', () => {
  let mockDb: ReturnType<typeof getFirestore>

  beforeAll(async () => {
    // Dynamically import after mocks are set up
    mockDb = getFirestore()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('successful submissions', () => {
    it('should create safety request with all fields when authenticated', async () => {
      const { submitSafetyRequest } = await import('./submitSafetyRequest')

      const request = {
        data: {
          message: 'I need help escaping a dangerous situation',
          safeEmail: 'safe@example.com',
          safePhone: '+1234567890',
          source: 'login-page',
        },
        auth: { uid: 'user123' },
      }

      const result = await (submitSafetyRequest as CallableFunction)(request)

      expect(result).toEqual({ success: true, requestId: 'test-request-id' })
      expect(mockDb.collection).toHaveBeenCalledWith('safetyRequests')
    })

    it('should create safety request without optional fields', async () => {
      const { submitSafetyRequest } = await import('./submitSafetyRequest')

      const request = {
        data: {
          message: 'I need help',
          source: 'settings',
        },
        auth: { uid: 'user456' },
      }

      const result = await (submitSafetyRequest as CallableFunction)(request)

      expect(result).toEqual({ success: true, requestId: 'test-request-id' })
    })

    it('should allow anonymous submissions (no auth)', async () => {
      const { submitSafetyRequest } = await import('./submitSafetyRequest')

      const request = {
        data: {
          message: 'Anonymous cry for help',
          source: 'login-page',
        },
        auth: undefined, // No authentication
      }

      const result = await (submitSafetyRequest as CallableFunction)(request)

      expect(result).toEqual({ success: true, requestId: 'test-request-id' })
    })
  })

  describe('validation', () => {
    it('should reject empty message', async () => {
      const { submitSafetyRequest } = await import('./submitSafetyRequest')

      const request = {
        data: {
          message: '',
          source: 'login-page',
        },
        auth: { uid: 'user123' },
      }

      await expect(
        (submitSafetyRequest as CallableFunction)(request)
      ).rejects.toThrow()
    })

    it('should reject invalid source', async () => {
      const { submitSafetyRequest } = await import('./submitSafetyRequest')

      const request = {
        data: {
          message: 'Help me',
          source: 'invalid-source',
        },
        auth: { uid: 'user123' },
      }

      await expect(
        (submitSafetyRequest as CallableFunction)(request)
      ).rejects.toThrow()
    })
  })

  describe('CRITICAL: safety isolation tests', () => {
    it('should ONLY log to adminAuditLog, not family audit trails', async () => {
      const { submitSafetyRequest } = await import('./submitSafetyRequest')

      const request = {
        data: {
          message: 'I need help',
          source: 'login-page',
        },
        auth: { uid: 'user123' },
      }

      await (submitSafetyRequest as CallableFunction)(request)

      // Should log to admin audit
      expect(mockDb.collection).toHaveBeenCalledWith('adminAuditLog')

      // Should NEVER access family-related collections
      const collectionCalls = (mockDb.collection as ReturnType<typeof vi.fn>).mock.calls.flat()
      expect(collectionCalls).not.toContain('children')
      expect(collectionCalls).not.toContain('families')
      expect(collectionCalls).not.toContain('auditLog')
    })

    it('should store in safetyRequests collection (isolated from family data)', async () => {
      const { submitSafetyRequest } = await import('./submitSafetyRequest')

      const request = {
        data: {
          message: 'I need help',
          source: 'settings',
        },
        auth: { uid: 'user123' },
      }

      await (submitSafetyRequest as CallableFunction)(request)

      expect(mockDb.collection).toHaveBeenCalledWith('safetyRequests')
    })
  })
})

type CallableFunction = (request: {
  data: Record<string, unknown>
  auth?: { uid: string }
}) => Promise<unknown>
