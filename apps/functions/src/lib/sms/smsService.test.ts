/**
 * Tests for SMS service.
 *
 * Story 41.6: Notification Delivery Channels - AC3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Store mock create function for per-test customization
let mockCreateFn = vi.fn()

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

import {
  sendSmsNotification,
  formatPhoneNumber,
  isValidE164,
  buildSmsMessage,
  isSmsConfigured,
  _resetClientForTesting,
  _setTwilioModuleForTesting,
  type SendSmsNotificationParams,
} from './smsService'

// Create mock Twilio module
const createMockTwilioModule = () => {
  return () => ({
    messages: {
      create: (...args: unknown[]) => mockCreateFn(...args),
    },
  })
}

describe('smsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetClientForTesting()
    // Reset mock function
    mockCreateFn = vi.fn().mockResolvedValue({
      sid: 'SM-mock-sid',
    })
    // Inject mock Twilio module
    _setTwilioModuleForTesting(createMockTwilioModule())
    // Clear env vars
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    delete process.env.TWILIO_PHONE_NUMBER
    delete process.env.APP_URL
  })

  afterEach(() => {
    _resetClientForTesting()
    _setTwilioModuleForTesting(null)
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    delete process.env.TWILIO_PHONE_NUMBER
    delete process.env.APP_URL
  })

  describe('formatPhoneNumber', () => {
    it('returns valid E.164 numbers unchanged', () => {
      expect(formatPhoneNumber('+12025551234')).toBe('+12025551234')
      expect(formatPhoneNumber('+442071234567')).toBe('+442071234567')
    })

    it('adds +1 prefix to 10-digit US numbers', () => {
      expect(formatPhoneNumber('2025551234')).toBe('+12025551234')
    })

    it('adds + prefix to numbers starting with 1', () => {
      expect(formatPhoneNumber('12025551234')).toBe('+12025551234')
    })

    it('removes formatting characters', () => {
      expect(formatPhoneNumber('(202) 555-1234')).toBe('+12025551234')
      expect(formatPhoneNumber('202.555.1234')).toBe('+12025551234')
      expect(formatPhoneNumber('202 555 1234')).toBe('+12025551234')
    })

    it('returns null for invalid numbers', () => {
      expect(formatPhoneNumber('123')).toBeNull()
      expect(formatPhoneNumber('invalid')).toBeNull()
      expect(formatPhoneNumber('')).toBeNull()
    })
  })

  describe('isValidE164', () => {
    it('returns true for valid E.164 numbers', () => {
      expect(isValidE164('+12025551234')).toBe(true)
      expect(isValidE164('+442071234567')).toBe(true)
      expect(isValidE164('+61412345678')).toBe(true)
    })

    it('returns false for invalid formats', () => {
      expect(isValidE164('2025551234')).toBe(false) // Missing +
      expect(isValidE164('+123')).toBe(false) // Too short
      expect(isValidE164('+1234567890123456')).toBe(false) // Too long
      expect(isValidE164('invalid')).toBe(false)
    })
  })

  describe('buildSmsMessage', () => {
    it('builds message with prefix for critical flags', () => {
      const message = buildSmsMessage(
        'criticalFlags',
        { title: 'Alert', body: 'Something happened' },
        false
      )

      expect(message).toBe('[Critical] Alert - Something happened')
    })

    it('includes app link when requested', () => {
      const message = buildSmsMessage('criticalFlags', { title: 'Alert', body: '' }, true)

      expect(message).toContain('[Critical] Alert')
      expect(message).toContain('View: https://app.fledgely.com')
    })

    it('uses custom APP_URL', () => {
      process.env.APP_URL = 'https://staging.fledgely.com'

      const message = buildSmsMessage('loginAlerts', { title: 'New Login', body: '' }, true)

      expect(message).toContain('View: https://staging.fledgely.com')
    })

    it('truncates long messages', () => {
      const longBody = 'A'.repeat(200)
      const message = buildSmsMessage('criticalFlags', { title: 'Alert', body: longBody }, false)

      expect(message.length).toBeLessThanOrEqual(160)
      expect(message).toContain('...')
    })

    it('uses correct prefix for each notification type', () => {
      expect(buildSmsMessage('loginAlerts', { title: 'Test', body: '' }, false)).toContain(
        '[Security]'
      )
      expect(buildSmsMessage('timeLimitWarnings', { title: 'Test', body: '' }, false)).toContain(
        '[Time Limit]'
      )
      expect(buildSmsMessage('deviceSyncAlerts', { title: 'Test', body: '' }, false)).toContain(
        '[Device]'
      )
      expect(buildSmsMessage('flagDigest', { title: 'Test', body: '' }, false)).toContain(
        '[Digest]'
      )
    })
  })

  describe('isSmsConfigured', () => {
    it('returns false when credentials are not set', () => {
      expect(isSmsConfigured()).toBe(false)
    })

    it('returns false when only some credentials are set', () => {
      process.env.TWILIO_ACCOUNT_SID = 'test-sid'
      expect(isSmsConfigured()).toBe(false)

      process.env.TWILIO_AUTH_TOKEN = 'test-token'
      expect(isSmsConfigured()).toBe(false)
    })

    it('returns true when all credentials are set', () => {
      process.env.TWILIO_ACCOUNT_SID = 'test-sid'
      process.env.TWILIO_AUTH_TOKEN = 'test-token'
      process.env.TWILIO_PHONE_NUMBER = '+15551234567'

      expect(isSmsConfigured()).toBe(true)
    })
  })

  describe('sendSmsNotification', () => {
    const baseParams: SendSmsNotificationParams = {
      to: '+12025551234',
      notificationType: 'criticalFlags',
      content: {
        title: 'Critical Flag',
        body: 'A flag was detected.',
      },
    }

    it('returns error for invalid phone number', async () => {
      const result = await sendSmsNotification({
        ...baseParams,
        to: 'invalid-number',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid phone number')
    })

    it('falls back to console logging when Twilio is not configured', async () => {
      const result = await sendSmsNotification(baseParams)

      expect(result.success).toBe(true)
      expect(result.messageSid).toMatch(/^dev-sms-\d+$/)
    })

    it('sends SMS via Twilio when configured', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'test-sid'
      process.env.TWILIO_AUTH_TOKEN = 'test-token'
      process.env.TWILIO_PHONE_NUMBER = '+15551234567'

      mockCreateFn.mockResolvedValue({ sid: 'SM123456' })

      const result = await sendSmsNotification(baseParams)

      expect(result.success).toBe(true)
      expect(result.messageSid).toBe('SM123456')

      expect(mockCreateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+12025551234',
          from: '+15551234567',
          body: expect.stringContaining('[Critical]'),
        })
      )
    })

    it('handles Twilio API errors', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'test-sid'
      process.env.TWILIO_AUTH_TOKEN = 'test-token'
      process.env.TWILIO_PHONE_NUMBER = '+15551234567'

      mockCreateFn.mockRejectedValue(new Error('Invalid phone number'))

      const result = await sendSmsNotification(baseParams)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid phone number')
    })

    it('includes app link by default', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'test-sid'
      process.env.TWILIO_AUTH_TOKEN = 'test-token'
      process.env.TWILIO_PHONE_NUMBER = '+15551234567'

      await sendSmsNotification(baseParams)

      expect(mockCreateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('View: https://app.fledgely.com'),
        })
      )
    })

    it('omits app link when disabled', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'test-sid'
      process.env.TWILIO_AUTH_TOKEN = 'test-token'
      process.env.TWILIO_PHONE_NUMBER = '+15551234567'

      await sendSmsNotification({
        ...baseParams,
        includeAppLink: false,
      })

      expect(mockCreateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.not.stringContaining('View:'),
        })
      )
    })
  })
})
