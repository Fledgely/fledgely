/**
 * Tests for email service.
 *
 * Story 41.6: Notification Delivery Channels - AC2, AC5, AC6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Store mock send function for per-test customization
let mockSendFn = vi.fn()

// Mock Resend - uses mockSendFn which can be customized per test
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: (...args: unknown[]) => mockSendFn(...args),
    },
  })),
}))

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

import {
  sendNotificationEmail,
  generateUnsubscribeUrl,
  validateUnsubscribeToken,
  isEmailConfigured,
  _resetClientForTesting,
  type SendNotificationEmailParams,
} from './emailService'

describe('emailService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetClientForTesting()
    // Reset mock send function
    mockSendFn = vi.fn().mockResolvedValue({
      data: { id: 'mock-msg-id' },
      error: null,
    })
    // Clear env vars
    delete process.env.RESEND_API_KEY
    delete process.env.JWT_SECRET
    delete process.env.APP_URL
  })

  afterEach(() => {
    _resetClientForTesting()
    delete process.env.RESEND_API_KEY
    delete process.env.APP_URL
  })

  describe('generateUnsubscribeUrl', () => {
    it('generates a valid URL with token', () => {
      const url = generateUnsubscribeUrl('user-123', 'criticalFlags')

      expect(url).toContain('https://app.fledgely.com/unsubscribe?token=')
      expect(url).toContain('token=')
    })

    it('uses custom APP_URL if set', () => {
      process.env.APP_URL = 'https://staging.fledgely.com'

      const url = generateUnsubscribeUrl('user-123', 'flagDigest')

      expect(url).toContain('https://staging.fledgely.com/unsubscribe?token=')
    })
  })

  describe('validateUnsubscribeToken', () => {
    it('returns payload for valid token', () => {
      const url = generateUnsubscribeUrl('user-456', 'timeLimitWarnings')
      const token = new URL(url).searchParams.get('token')!

      const payload = validateUnsubscribeToken(token)

      expect(payload).not.toBeNull()
      expect(payload?.userId).toBe('user-456')
      expect(payload?.notificationType).toBe('timeLimitWarnings')
    })

    it('returns null for invalid token', () => {
      const payload = validateUnsubscribeToken('invalid-token')

      expect(payload).toBeNull()
    })

    it('returns null for tampered token', () => {
      const url = generateUnsubscribeUrl('user-123', 'criticalFlags')
      const token = new URL(url).searchParams.get('token')!
      const tamperedToken = token.slice(0, -5) + 'xxxxx'

      const payload = validateUnsubscribeToken(tamperedToken)

      expect(payload).toBeNull()
    })
  })

  describe('isEmailConfigured', () => {
    it('returns false when RESEND_API_KEY is not set', () => {
      expect(isEmailConfigured()).toBe(false)
    })

    it('returns true when RESEND_API_KEY is set', () => {
      process.env.RESEND_API_KEY = 'test-key'

      expect(isEmailConfigured()).toBe(true)
    })
  })

  describe('sendNotificationEmail', () => {
    const baseParams: SendNotificationEmailParams = {
      to: 'parent@example.com',
      notificationType: 'criticalFlags',
      content: {
        title: 'Critical Flag Detected',
        body: 'A critical flag was detected on your child device.',
        actionUrl: 'https://app.fledgely.com/flags/123',
      },
      includeUnsubscribe: true,
      userId: 'user-123',
    }

    it('falls back to console logging when Resend is not configured', async () => {
      const result = await sendNotificationEmail(baseParams)

      expect(result.success).toBe(true)
      expect(result.messageId).toMatch(/^dev-\d+$/)
    })

    it('sends email via Resend when configured', async () => {
      process.env.RESEND_API_KEY = 'test-api-key'
      mockSendFn.mockResolvedValue({
        data: { id: 'msg-123' },
        error: null,
      })

      const result = await sendNotificationEmail(baseParams)

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg-123')

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'parent@example.com',
          subject: expect.stringContaining('Critical'),
          html: expect.stringContaining('Critical Flag Detected'),
          text: expect.stringContaining('CRITICAL FLAG DETECTED'), // Title is uppercase in text version
        })
      )
    })

    it('includes List-Unsubscribe header when unsubscribe is enabled', async () => {
      process.env.RESEND_API_KEY = 'test-api-key'

      await sendNotificationEmail(baseParams)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'List-Unsubscribe': expect.stringContaining('unsubscribe?token='),
          }),
        })
      )
    })

    it('does not include unsubscribe when disabled', async () => {
      process.env.RESEND_API_KEY = 'test-api-key'

      await sendNotificationEmail({
        ...baseParams,
        notificationType: 'loginAlerts',
        includeUnsubscribe: false,
      })

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {},
        })
      )
    })

    it('handles Resend API errors', async () => {
      process.env.RESEND_API_KEY = 'test-api-key'
      mockSendFn.mockResolvedValue({
        data: null,
        error: { message: 'Invalid email address' },
      })

      const result = await sendNotificationEmail(baseParams)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid email address')
    })

    it('handles exceptions during send', async () => {
      process.env.RESEND_API_KEY = 'test-api-key'
      mockSendFn.mockRejectedValue(new Error('Network error'))

      const result = await sendNotificationEmail(baseParams)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('includes fallback message when provided', async () => {
      process.env.RESEND_API_KEY = 'test-api-key'

      await sendNotificationEmail({
        ...baseParams,
        fallbackMessage: 'You may have missed this notification',
      })

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('may have missed'),
          text: expect.stringContaining('may have missed'),
        })
      )
    })

    it('generates correct subject for different notification types', async () => {
      process.env.RESEND_API_KEY = 'test-api-key'

      await sendNotificationEmail({
        ...baseParams,
        notificationType: 'loginAlerts',
        content: { title: 'New Login Detected', body: 'test' },
        includeUnsubscribe: false,
      })

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '[Security] New Login Detected',
        })
      )
    })

    it('generates correct subject for time limit warnings', async () => {
      process.env.RESEND_API_KEY = 'test-api-key'

      await sendNotificationEmail({
        ...baseParams,
        notificationType: 'timeLimitWarnings',
        content: { title: 'Time Limit Approaching', body: 'test' },
      })

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '[Time Limit] Time Limit Approaching',
        })
      )
    })

    it('generates correct subject for flag digest', async () => {
      process.env.RESEND_API_KEY = 'test-api-key'

      await sendNotificationEmail({
        ...baseParams,
        notificationType: 'flagDigest',
        content: { title: 'Daily Flag Summary', body: 'test' },
      })

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '[Digest] Daily Flag Summary',
        })
      )
    })
  })
})
