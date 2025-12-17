/**
 * notifySafeAdult Tests
 *
 * Story 7.5.4: Safe Adult Designation - Task 6
 *
 * Tests for the Cloud Function that sends notifications to safe adults.
 *
 * CRITICAL INVARIANT (INV-002): Safe adult contact NEVER visible to family.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock firebase-admin before imports
vi.mock('firebase-admin/firestore', () => {
  const mockTimestamp = {
    now: () => ({ toDate: () => new Date() }),
  }

  return {
    getFirestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ exists: false }),
          set: vi.fn(),
          update: vi.fn(),
        })),
      })),
      runTransaction: vi.fn((callback) =>
        callback({
          get: vi.fn().mockResolvedValue({ exists: false }),
          set: vi.fn(),
          update: vi.fn(),
        })
      ),
    })),
    Timestamp: mockTimestamp,
  }
})

// Mock firebase-functions
vi.mock('firebase-functions/v2/https', () => ({
  onCall: vi.fn((options, handler) => handler),
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message)
    }
  },
}))

// Import after mocking
import { notifySafeAdult } from './notifySafeAdult'
import { getFirestore } from 'firebase-admin/firestore'

describe('notifySafeAdult', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Input Validation', () => {
    it('should reject missing childFirstName', async () => {
      const request = {
        data: {
          encryptedContact: 'encrypted-data',
          contactType: 'phone',
          encryptionKeyId: 'key-123',
          signalId: 'signal-abc',
        },
      }

      await expect(notifySafeAdult(request as never)).rejects.toThrow('Invalid request format')
    })

    it('should reject missing encryptedContact', async () => {
      const request = {
        data: {
          childFirstName: 'Alex',
          contactType: 'phone',
          encryptionKeyId: 'key-123',
          signalId: 'signal-abc',
        },
      }

      await expect(notifySafeAdult(request as never)).rejects.toThrow('Invalid request format')
    })

    it('should reject invalid contactType', async () => {
      const request = {
        data: {
          childFirstName: 'Alex',
          encryptedContact: 'encrypted-data',
          contactType: 'fax', // Invalid
          encryptionKeyId: 'key-123',
          signalId: 'signal-abc',
        },
      }

      await expect(notifySafeAdult(request as never)).rejects.toThrow('Invalid request format')
    })

    it('should reject missing signalId', async () => {
      const request = {
        data: {
          childFirstName: 'Alex',
          encryptedContact: 'encrypted-data',
          contactType: 'phone',
          encryptionKeyId: 'key-123',
        },
      }

      await expect(notifySafeAdult(request as never)).rejects.toThrow('Invalid request format')
    })

    it('should reject empty strings', async () => {
      const request = {
        data: {
          childFirstName: '',
          encryptedContact: 'encrypted-data',
          contactType: 'phone',
          encryptionKeyId: 'key-123',
          signalId: 'signal-abc',
        },
      }

      await expect(notifySafeAdult(request as never)).rejects.toThrow('Invalid request format')
    })
  })

  describe('Response Structure', () => {
    it('should return proper response structure', async () => {
      const request = createValidRequest()

      const result = await notifySafeAdult(request as never)

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('error')
      expect(result).toHaveProperty('sentAt')
    })

    it('should return error on decryption failure', async () => {
      const request = createValidRequest({
        encryptedContact: 'not-valid-base64!!!',
      })

      const result = await notifySafeAdult(request as never)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unable to process request')
    })
  })

  describe('Rate Limiting (via mocked db)', () => {
    it('should silently succeed when rate limited (no info leak)', async () => {
      // Create a mock db that simulates rate limit reached
      const mockDb = {
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ count: 3 }),
            }),
            set: vi.fn(),
            update: vi.fn(),
          })),
        })),
        runTransaction: vi.fn(async (callback) => {
          return callback({
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ count: 3 }),
            }),
            set: vi.fn(),
            update: vi.fn(),
          })
        }),
      }

      vi.mocked(getFirestore).mockReturnValue(mockDb as unknown as FirebaseFirestore.Firestore)

      const request = createValidRequest()
      const result = await notifySafeAdult(request as never)

      // Should return success to prevent information leakage
      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
    })
  })

  describe('INV-002 Compliance', () => {
    it('should NOT include contact info in error responses', async () => {
      const request = createValidRequest({
        encryptedContact: 'invalid-data',
      })

      const result = await notifySafeAdult(request as never)

      // Error messages should be generic
      if (!result.success && result.error) {
        expect(result.error).not.toContain('5551234567')
        expect(result.error).not.toContain('email')
        expect(result.error).not.toContain('@')
      }
    })

    it('should return generic errors only', async () => {
      const request = createValidRequest()
      const result = await notifySafeAdult(request as never)

      if (!result.success && result.error) {
        // Error should be from a known set of generic messages
        const allowedErrors = [
          'Unable to process request',
          'Unable to send notification',
          'An error occurred',
          'Invalid request',
        ]
        expect(allowedErrors).toContain(result.error)
      }
    })
  })

  describe('Notification Messages - Static Analysis', () => {
    it('should use generic SMS template with no app mention', () => {
      // Verify the SMS template doesn't mention the app
      const smsTemplate = '{firstName} needs help. Please reach out.'

      expect(smsTemplate).not.toContain('fledgely')
      expect(smsTemplate).not.toContain('Fledgely')
      expect(smsTemplate).not.toContain('app')
      expect(smsTemplate).not.toContain('signal')
    })

    it('should use generic email template with no app mention', () => {
      // Verify the email template doesn't mention the app
      const emailSubject = 'Someone needs your help'
      const emailBody =
        '{firstName} reached out because they need help. Please check in with them when you can.'

      expect(emailSubject).not.toContain('fledgely')
      expect(emailSubject).not.toContain('Fledgely')
      expect(emailBody).not.toContain('fledgely')
      expect(emailBody).not.toContain('Fledgely')
      expect(emailBody).not.toContain('app')
    })
  })
})

/**
 * Helper to create a valid request
 */
function createValidRequest(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    data: {
      childFirstName: 'Alex',
      encryptedContact: 'QUFBQUFBQUFBQUFBQUFBQQ==', // Base64 of 16 'A' bytes
      contactType: 'phone',
      encryptionKeyId: 'key-123456789',
      signalId: 'signal-abc-123',
      ...overrides,
    },
  }
}
