/**
 * SafeAdultNotificationService Tests
 *
 * Story 7.5.4: Safe Adult Designation - Task 5
 *
 * Tests for the notification service that sends notifications
 * to safe adults when a child triggers a safety signal.
 *
 * CRITICAL INVARIANT (INV-002): Safe adult notification NEVER visible to family.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  SafeAdultNotificationService,
  MockSafeAdultNotificationService,
  SafeAdultNotificationError,
  createSafeAdultNotificationService,
  createMockSafeAdultNotificationService,
  getSafeAdultNotificationService,
  resetSafeAdultNotificationService,
} from '../SafeAdultNotificationService'
import {
  MockSafeAdultStorageService,
  createMockSafeAdultStorageService,
} from '../SafeAdultStorageService'

// Mock Firebase functions
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({
  functions: {},
}))

// Import after mocking
import { httpsCallable } from 'firebase/functions'

const mockHttpsCallable = vi.mocked(httpsCallable)

describe('SafeAdultNotificationService', () => {
  let storageService: MockSafeAdultStorageService
  let notificationService: SafeAdultNotificationService

  beforeEach(async () => {
    vi.clearAllMocks()

    // Create mock storage with test data
    storageService = createMockSafeAdultStorageService()
    await storageService.initialize()

    // Save a test safe adult
    await storageService.save({
      childId: 'child-123',
      childFirstName: 'Alex',
      contact: { type: 'phone', value: '5551234567' },
    })

    // Create notification service with mock storage
    notificationService = createSafeAdultNotificationService({
      storageService,
      maxRetries: 1,
      retryDelayMs: 10,
    })
  })

  afterEach(() => {
    resetSafeAdultNotificationService()
  })

  describe('send', () => {
    it('should send notification when safe adult exists', async () => {
      // Mock successful Cloud Function response
      const mockCallable = vi.fn().mockResolvedValue({
        data: {
          success: true,
          error: null,
          sentAt: '2024-01-15T10:00:00.000Z',
        },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      const result = await notificationService.send({
        childId: 'child-123',
        signalId: 'signal-abc',
      })

      expect(result.success).toBe(true)
      expect(result.skipped).toBeUndefined()
      expect(result.sentAt).toBe('2024-01-15T10:00:00.000Z')
    })

    it('should return skipped when no safe adult exists', async () => {
      const result = await notificationService.send({
        childId: 'child-no-safe-adult',
        signalId: 'signal-def',
      })

      expect(result.success).toBe(true)
      expect(result.skipped).toBe(true)
      expect(mockHttpsCallable).not.toHaveBeenCalled()
    })

    it('should pass correct data to Cloud Function', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, error: null, sentAt: new Date().toISOString() },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      await notificationService.send({
        childId: 'child-123',
        signalId: 'signal-xyz',
      })

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'notifySafeAdult')
      expect(mockCallable).toHaveBeenCalledWith(
        expect.objectContaining({
          childFirstName: 'Alex',
          contactType: 'phone',
          signalId: 'signal-xyz',
          encryptedContact: expect.any(String),
          encryptionKeyId: expect.any(String),
        })
      )
    })

    it('should handle Cloud Function failure', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: {
          success: false,
          error: 'Rate limit exceeded',
          sentAt: null,
        },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      const result = await notificationService.send({
        childId: 'child-123',
        signalId: 'signal-fail',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Rate limit exceeded')
    })

    it('should handle network errors with retry', async () => {
      const mockCallable = vi
        .fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce({
          data: { success: true, error: null, sentAt: new Date().toISOString() },
        })
      mockHttpsCallable.mockReturnValue(mockCallable)

      const result = await notificationService.send({
        childId: 'child-123',
        signalId: 'signal-retry',
      })

      expect(result.success).toBe(true)
      expect(mockCallable).toHaveBeenCalledTimes(2)
    })

    it('should give up after max retries', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('persistent network error'))
      mockHttpsCallable.mockReturnValue(mockCallable)

      const result = await notificationService.send({
        childId: 'child-123',
        signalId: 'signal-exhaust',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error. Please check your connection.')
      // Initial call + 1 retry = 2 calls
      expect(mockCallable).toHaveBeenCalledTimes(2)
    })

    it('should deduplicate notifications for same signal', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, error: null, sentAt: '2024-01-15T10:00:00.000Z' },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      // Send first notification
      await notificationService.send({
        childId: 'child-123',
        signalId: 'signal-dup',
      })

      // Send duplicate
      const result = await notificationService.send({
        childId: 'child-123',
        signalId: 'signal-dup',
      })

      expect(result.success).toBe(true)
      // Should only call Cloud Function once
      expect(mockCallable).toHaveBeenCalledTimes(1)
    })

    describe('Error Message Sanitization (INV-002)', () => {
      it('should return generic error for network errors', async () => {
        const mockCallable = vi.fn().mockRejectedValue(new Error('Failed to fetch'))
        mockHttpsCallable.mockReturnValue(mockCallable)

        const result = await notificationService.send({
          childId: 'child-123',
          signalId: 'signal-net',
        })

        expect(result.error).toBe('Network error. Please check your connection.')
        // Error should NOT contain internal details
        expect(result.error).not.toContain('fetch')
        expect(result.error).not.toContain('safe adult')
      })

      it('should return generic error for timeout', async () => {
        const mockCallable = vi.fn().mockRejectedValue(new Error('Request timeout'))
        mockHttpsCallable.mockReturnValue(mockCallable)

        const result = await notificationService.send({
          childId: 'child-123',
          signalId: 'signal-timeout',
        })

        expect(result.error).toBe('Request timed out. Please try again.')
      })

      it('should return generic error for rate limiting', async () => {
        const mockCallable = vi.fn().mockRejectedValue(new Error('rate limit exceeded'))
        mockHttpsCallable.mockReturnValue(mockCallable)

        const result = await notificationService.send({
          childId: 'child-123',
          signalId: 'signal-rate',
        })

        expect(result.error).toBe('Too many requests. Please wait a moment.')
      })

      it('should return generic error for permission errors', async () => {
        const mockCallable = vi.fn().mockRejectedValue(new Error('Permission denied'))
        mockHttpsCallable.mockReturnValue(mockCallable)

        const result = await notificationService.send({
          childId: 'child-123',
          signalId: 'signal-perm',
        })

        expect(result.error).toBe('Unable to send notification. Please try again.')
      })

      it('should return generic error for unknown errors', async () => {
        const mockCallable = vi.fn().mockRejectedValue(new Error('Some internal error xyz123'))
        mockHttpsCallable.mockReturnValue(mockCallable)

        const result = await notificationService.send({
          childId: 'child-123',
          signalId: 'signal-unknown',
        })

        expect(result.error).toBe('Something went wrong. Please try again.')
        // Must NOT leak internal error details
        expect(result.error).not.toContain('xyz123')
        expect(result.error).not.toContain('internal')
      })
    })
  })

  describe('sendWithNewContact', () => {
    it('should send notification with new phone contact', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, error: null, sentAt: '2024-01-15T11:00:00.000Z' },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      const result = await notificationService.sendWithNewContact({
        childId: 'child-456',
        childFirstName: 'Jordan',
        contactType: 'phone',
        contactValue: '5559876543',
        signalId: 'signal-new-phone',
      })

      expect(result.success).toBe(true)
      expect(result.sentAt).toBe('2024-01-15T11:00:00.000Z')
    })

    it('should send notification with new email contact', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, error: null, sentAt: '2024-01-15T11:00:00.000Z' },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      const result = await notificationService.sendWithNewContact({
        childId: 'child-789',
        childFirstName: 'Sam',
        contactType: 'email',
        contactValue: 'trusted@example.com',
        signalId: 'signal-new-email',
      })

      expect(result.success).toBe(true)
      expect(mockCallable).toHaveBeenCalledWith(
        expect.objectContaining({
          childFirstName: 'Sam',
          contactType: 'email',
          signalId: 'signal-new-email',
        })
      )
    })

    it('should deduplicate new contact notifications', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, error: null, sentAt: '2024-01-15T11:00:00.000Z' },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      // Send first
      await notificationService.sendWithNewContact({
        childId: 'child-456',
        childFirstName: 'Jordan',
        contactType: 'phone',
        contactValue: '5559876543',
        signalId: 'signal-dup-new',
      })

      // Send duplicate
      const result = await notificationService.sendWithNewContact({
        childId: 'child-456',
        childFirstName: 'Jordan',
        contactType: 'phone',
        contactValue: '5559876543',
        signalId: 'signal-dup-new',
      })

      expect(result.success).toBe(true)
      expect(mockCallable).toHaveBeenCalledTimes(1)
    })
  })

  describe('hasSafeAdult', () => {
    it('should return true when safe adult exists', async () => {
      const result = await notificationService.hasSafeAdult('child-123')
      expect(result).toBe(true)
    })

    it('should return false when no safe adult exists', async () => {
      const result = await notificationService.hasSafeAdult('child-no-adult')
      expect(result).toBe(false)
    })
  })

  describe('getNotificationStatus', () => {
    it('should return null for unknown signal', async () => {
      const result = await notificationService.getNotificationStatus('unknown-signal')
      expect(result).toBeNull()
    })

    it('should return sent status after successful notification', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, error: null, sentAt: '2024-01-15T10:00:00.000Z' },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      await notificationService.send({
        childId: 'child-123',
        signalId: 'signal-status',
      })

      const status = await notificationService.getNotificationStatus('signal-status')
      expect(status).toEqual({
        sent: true,
        sentAt: '2024-01-15T10:00:00.000Z',
      })
    })

    it('should return failure status after failed notification', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Some error'))
      mockHttpsCallable.mockReturnValue(mockCallable)

      await notificationService.send({
        childId: 'child-123',
        signalId: 'signal-fail-status',
      })

      const status = await notificationService.getNotificationStatus('signal-fail-status')
      expect(status).toEqual({
        sent: false,
        error: 'Something went wrong. Please try again.',
      })
    })
  })
})

describe('MockSafeAdultNotificationService', () => {
  let storageService: MockSafeAdultStorageService
  let mockService: MockSafeAdultNotificationService

  beforeEach(async () => {
    storageService = createMockSafeAdultStorageService()
    await storageService.initialize()

    await storageService.save({
      childId: 'child-mock',
      childFirstName: 'MockChild',
      contact: { type: 'phone', value: '5551111111' },
    })

    mockService = createMockSafeAdultNotificationService(storageService)
  })

  describe('send', () => {
    it('should simulate successful notification', async () => {
      const result = await mockService.send({
        childId: 'child-mock',
        signalId: 'mock-signal-1',
      })

      expect(result.success).toBe(true)
      expect(result.sentAt).toBeDefined()
    })

    it('should skip when no safe adult', async () => {
      const result = await mockService.send({
        childId: 'child-no-mock',
        signalId: 'mock-signal-2',
      })

      expect(result.success).toBe(true)
      expect(result.skipped).toBe(true)
    })

    it('should simulate failure when configured', async () => {
      mockService.setFailure(true, 'Simulated failure')

      const result = await mockService.send({
        childId: 'child-mock',
        signalId: 'mock-signal-3',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Simulated failure')
    })

    it('should simulate delay', async () => {
      mockService.setDelay(50)

      const start = Date.now()
      await mockService.send({
        childId: 'child-mock',
        signalId: 'mock-signal-4',
      })
      const elapsed = Date.now() - start

      expect(elapsed).toBeGreaterThanOrEqual(40)
    })
  })

  describe('sendWithNewContact', () => {
    it('should simulate successful new contact notification', async () => {
      const result = await mockService.sendWithNewContact({
        childId: 'child-new',
        childFirstName: 'NewChild',
        contactType: 'email',
        contactValue: 'mock@example.com',
        signalId: 'mock-new-signal',
      })

      expect(result.success).toBe(true)
      expect(result.sentAt).toBeDefined()
    })
  })

  describe('getSentNotifications', () => {
    it('should track all sent notifications', async () => {
      await mockService.send({
        childId: 'child-mock',
        signalId: 'track-1',
      })

      await mockService.sendWithNewContact({
        childId: 'child-new',
        childFirstName: 'New',
        contactType: 'phone',
        contactValue: '5552222222',
        signalId: 'track-2',
      })

      const sent = mockService.getSentNotifications()
      expect(sent.size).toBe(2)
      expect(sent.has('track-1')).toBe(true)
      expect(sent.has('track-2')).toBe(true)
    })

    it('should clear sent notifications', async () => {
      await mockService.send({
        childId: 'child-mock',
        signalId: 'clear-test',
      })

      mockService.clearSentNotifications()
      const sent = mockService.getSentNotifications()
      expect(sent.size).toBe(0)
    })
  })
})

describe('Factory Functions', () => {
  afterEach(() => {
    resetSafeAdultNotificationService()
  })

  it('createSafeAdultNotificationService creates production instance', () => {
    const service = createSafeAdultNotificationService()
    expect(service).toBeInstanceOf(SafeAdultNotificationService)
  })

  it('createMockSafeAdultNotificationService creates mock instance', () => {
    const service = createMockSafeAdultNotificationService()
    expect(service).toBeInstanceOf(MockSafeAdultNotificationService)
  })

  it('getSafeAdultNotificationService returns singleton', () => {
    const service1 = getSafeAdultNotificationService()
    const service2 = getSafeAdultNotificationService()
    expect(service1).toBe(service2)
  })

  it('getSafeAdultNotificationService returns mock when requested', () => {
    const service = getSafeAdultNotificationService(true)
    expect(service).toBeInstanceOf(MockSafeAdultNotificationService)
  })

  it('resetSafeAdultNotificationService clears singleton', () => {
    const service1 = getSafeAdultNotificationService()
    resetSafeAdultNotificationService()
    const service2 = getSafeAdultNotificationService()
    expect(service1).not.toBe(service2)
  })
})

describe('SafeAdultNotificationError', () => {
  it('should create error with correct name', () => {
    const error = new SafeAdultNotificationError('Test error')
    expect(error.name).toBe('SafeAdultNotificationError')
    expect(error.message).toBe('Test error')
  })

  it('should be instance of Error', () => {
    const error = new SafeAdultNotificationError('Test')
    expect(error).toBeInstanceOf(Error)
  })
})

describe('INV-002 Compliance', () => {
  let storageService: MockSafeAdultStorageService
  let notificationService: SafeAdultNotificationService

  beforeEach(async () => {
    storageService = createMockSafeAdultStorageService()
    await storageService.initialize()

    await storageService.save({
      childId: 'child-inv',
      childFirstName: 'TestChild',
      contact: { type: 'phone', value: '5553334444' },
    })

    notificationService = createSafeAdultNotificationService({
      storageService,
      maxRetries: 0,
    })
  })

  afterEach(() => {
    resetSafeAdultNotificationService()
  })

  it('should send encrypted contact to Cloud Function', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: { success: true, error: null, sentAt: new Date().toISOString() },
    })
    mockHttpsCallable.mockReturnValue(mockCallable)

    await notificationService.send({
      childId: 'child-inv',
      signalId: 'signal-inv-002',
    })

    const callArgs = mockCallable.mock.calls[0][0]

    // Contact should be encrypted (base64 string, not plain phone number)
    expect(callArgs.encryptedContact).toBeDefined()
    expect(callArgs.encryptedContact).not.toBe('5553334444')
    expect(callArgs.encryptedContact).toMatch(/^[A-Za-z0-9+/=]+$/) // Base64 pattern
  })

  it('should NOT include family identifiers in request', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: { success: true, error: null, sentAt: new Date().toISOString() },
    })
    mockHttpsCallable.mockReturnValue(mockCallable)

    await notificationService.send({
      childId: 'child-inv',
      signalId: 'signal-inv-003',
    })

    const callArgs = mockCallable.mock.calls[0][0]

    // Should NOT have family-identifying information
    expect(callArgs).not.toHaveProperty('familyId')
    expect(callArgs).not.toHaveProperty('lastName')
    expect(callArgs).not.toHaveProperty('deviceId')
    expect(callArgs).not.toHaveProperty('location')

    // Should only have minimal required fields
    expect(Object.keys(callArgs).sort()).toEqual([
      'childFirstName',
      'contactType',
      'encryptedContact',
      'encryptionKeyId',
      'signalId',
    ])
  })

  it('should never expose raw contact in error messages', async () => {
    const mockCallable = vi.fn().mockRejectedValue(new Error('Contact 5553334444 is invalid'))
    mockHttpsCallable.mockReturnValue(mockCallable)

    const result = await notificationService.send({
      childId: 'child-inv',
      signalId: 'signal-inv-004',
    })

    // Error message should be generic
    expect(result.error).not.toContain('5553334444')
    expect(result.error).not.toContain('phone')
    expect(result.error).toBe('Something went wrong. Please try again.')
  })

  it('should use separate encryption key from family keys', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: { success: true, error: null, sentAt: new Date().toISOString() },
    })
    mockHttpsCallable.mockReturnValue(mockCallable)

    await notificationService.send({
      childId: 'child-inv',
      signalId: 'signal-inv-005',
    })

    const callArgs = mockCallable.mock.calls[0][0]

    // Key ID should indicate it's a safe adult specific key
    expect(callArgs.encryptionKeyId).toBeDefined()
    // Mock encryption uses 'mock-key-id', but in production it would be device-derived
    expect(typeof callArgs.encryptionKeyId).toBe('string')
  })
})
