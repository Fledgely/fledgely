/**
 * SafeAdultNotificationService Tests - Story 7.5.4 Task 3
 *
 * Tests for sending notifications to safe adults.
 * AC2: Safe adult message delivery
 * AC5: Fallback to external resources
 * AC6: Phone and email support
 *
 * CRITICAL: Messages do NOT mention fledgely or monitoring.
 * TDD approach: Write tests first, then implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  // Notification functions
  notifySafeAdult,
  sendSafeAdultSMS,
  sendSafeAdultEmail,
  getNotificationStatus,
  retryNotification,
  updateNotificationStatus,
  // Message template functions
  getSMSMessage,
  getEmailSubject,
  getEmailBody,
  // Validation
  validateNotificationMessage,
} from './safeAdultNotificationService'
import type { SafeAdultDesignation, SafeAdultNotification } from '../contracts/safeAdult'

// Mock Firestore
const mockGet = vi.fn()
const mockSet = vi.fn()
const mockUpdate = vi.fn()
const mockDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGet(...args),
  setDoc: (...args: unknown[]) => mockSet(...args),
  updateDoc: (...args: unknown[]) => mockUpdate(...args),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}))

// Mock SMS/Email providers (these would be real in production)
const mockSendSMS = vi.fn()
const mockSendEmail = vi.fn()

vi.mock('./providers/smsProvider', () => ({
  sendSMS: (...args: unknown[]) => mockSendSMS(...args),
}))

vi.mock('./providers/emailProvider', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

describe('SafeAdultNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendSMS.mockResolvedValue({ success: true, messageId: 'sms_123' })
    mockSendEmail.mockResolvedValue({ success: true, messageId: 'email_123' })
  })

  // ============================================
  // Message Template Tests
  // ============================================

  describe('getSMSMessage', () => {
    it('should include child name', () => {
      const message = getSMSMessage('Emma')
      expect(message).toContain('Emma')
    })

    it('should NOT mention fledgely', () => {
      const message = getSMSMessage('Emma')
      expect(message.toLowerCase()).not.toContain('fledgely')
    })

    it('should NOT mention monitoring', () => {
      const message = getSMSMessage('Emma')
      expect(message.toLowerCase()).not.toContain('monitoring')
      expect(message.toLowerCase()).not.toContain('tracked')
      expect(message.toLowerCase()).not.toContain('app')
    })

    it('should be under 160 characters', () => {
      const message = getSMSMessage('Emma')
      expect(message.length).toBeLessThanOrEqual(160)
    })

    it('should indicate need for help', () => {
      const message = getSMSMessage('Emma')
      expect(message.toLowerCase()).toContain('help')
    })

    it('should request contact', () => {
      const message = getSMSMessage('Emma')
      expect(message.toLowerCase()).toMatch(/reach out|contact/)
    })
  })

  describe('getEmailSubject', () => {
    it('should NOT include child name in subject', () => {
      const subject = getEmailSubject()
      expect(subject).not.toContain('Emma')
    })

    it('should NOT mention fledgely', () => {
      const subject = getEmailSubject()
      expect(subject.toLowerCase()).not.toContain('fledgely')
    })

    it('should be generic', () => {
      const subject = getEmailSubject()
      expect(subject).toBe('Someone you know needs help')
    })
  })

  describe('getEmailBody', () => {
    it('should include child name', () => {
      const body = getEmailBody('Emma')
      expect(body).toContain('Emma')
    })

    it('should NOT mention fledgely', () => {
      const body = getEmailBody('Emma')
      expect(body.toLowerCase()).not.toContain('fledgely')
    })

    it('should NOT mention monitoring or app', () => {
      const body = getEmailBody('Emma')
      expect(body.toLowerCase()).not.toContain('monitoring')
      expect(body.toLowerCase()).not.toContain('tracked')
      expect(body.toLowerCase()).not.toContain('app')
    })

    it('should indicate need for support', () => {
      const body = getEmailBody('Emma')
      expect(body.toLowerCase()).toMatch(/help|support/)
    })

    it('should indicate automated message', () => {
      const body = getEmailBody('Emma')
      expect(body.toLowerCase()).toContain('automated')
    })
  })

  describe('validateNotificationMessage', () => {
    it('should reject messages containing fledgely', () => {
      const result = validateNotificationMessage('Please use Fledgely to help')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('fledgely')
    })

    it('should reject messages containing monitoring', () => {
      const result = validateNotificationMessage('The monitoring app detected something')
      expect(result.valid).toBe(false)
    })

    it('should reject messages containing app references', () => {
      const result = validateNotificationMessage('This app is alerting you')
      expect(result.valid).toBe(false)
    })

    it('should accept clean messages', () => {
      const result = validateNotificationMessage('Emma needs help. Please reach out.')
      expect(result.valid).toBe(true)
    })
  })

  // ============================================
  // sendSafeAdultSMS Tests
  // ============================================

  describe('sendSafeAdultSMS', () => {
    it('should send SMS with correct message', async () => {
      const result = await sendSafeAdultSMS('+15551234567', 'Emma')

      expect(result.success).toBe(true)
      expect(result.messageId).toBeTruthy()
    })

    it('should use child name in message', async () => {
      await sendSafeAdultSMS('+15551234567', 'Emma')

      expect(mockSendSMS).toHaveBeenCalled()
      const call = mockSendSMS.mock.calls[0]
      expect(call[1]).toContain('Emma')
    })

    it('should NOT include fledgely in message', async () => {
      await sendSafeAdultSMS('+15551234567', 'Emma')

      const call = mockSendSMS.mock.calls[0]
      expect(call[1].toLowerCase()).not.toContain('fledgely')
    })

    it('should handle send failure', async () => {
      mockSendSMS.mockResolvedValue({ success: false, error: 'Network error' })

      const result = await sendSafeAdultSMS('+15551234567', 'Emma')

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should throw on empty phone', async () => {
      await expect(sendSafeAdultSMS('', 'Emma')).rejects.toThrow('phone')
    })

    it('should throw on empty child name', async () => {
      await expect(sendSafeAdultSMS('+15551234567', '')).rejects.toThrow('childName')
    })
  })

  // ============================================
  // sendSafeAdultEmail Tests
  // ============================================

  describe('sendSafeAdultEmail', () => {
    it('should send email with correct content', async () => {
      const result = await sendSafeAdultEmail('aunt@example.com', 'Emma')

      expect(result.success).toBe(true)
      expect(result.messageId).toBeTruthy()
    })

    it('should use generic subject', async () => {
      await sendSafeAdultEmail('aunt@example.com', 'Emma')

      expect(mockSendEmail).toHaveBeenCalled()
      const call = mockSendEmail.mock.calls[0]
      expect(call[1]).toBe('Someone you know needs help')
    })

    it('should include child name in body', async () => {
      await sendSafeAdultEmail('aunt@example.com', 'Emma')

      const call = mockSendEmail.mock.calls[0]
      expect(call[2]).toContain('Emma')
    })

    it('should NOT include fledgely in content', async () => {
      await sendSafeAdultEmail('aunt@example.com', 'Emma')

      const call = mockSendEmail.mock.calls[0]
      expect(call[1].toLowerCase()).not.toContain('fledgely')
      expect(call[2].toLowerCase()).not.toContain('fledgely')
    })

    it('should handle send failure', async () => {
      mockSendEmail.mockResolvedValue({ success: false, error: 'Invalid email' })

      const result = await sendSafeAdultEmail('aunt@example.com', 'Emma')

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should throw on empty email', async () => {
      await expect(sendSafeAdultEmail('', 'Emma')).rejects.toThrow('email')
    })

    it('should throw on empty child name', async () => {
      await expect(sendSafeAdultEmail('aunt@example.com', '')).rejects.toThrow('childName')
    })
  })

  // ============================================
  // notifySafeAdult Tests
  // ============================================

  describe('notifySafeAdult', () => {
    const mockDesignation: SafeAdultDesignation = {
      id: 'sa_123',
      childId: 'child_123',
      phoneNumber: '+15551234567',
      email: null,
      preferredMethod: 'sms',
      displayName: 'Aunt Jane',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPreConfigured: true,
      encryptionKeyId: 'sakey_123',
    }

    const mockSignal = {
      id: 'sig_123',
      childId: 'child_123',
      status: 'pending' as const,
    }

    it('should send SMS when preferred method is sms', async () => {
      mockSet.mockResolvedValue(undefined)

      const result = await notifySafeAdult(mockDesignation, mockSignal, 'Emma')

      expect(result.deliveryStatus).toBe('sent')
      expect(mockSendSMS).toHaveBeenCalled()
    })

    it('should send email when preferred method is email', async () => {
      const emailDesignation = {
        ...mockDesignation,
        phoneNumber: null,
        email: 'aunt@example.com',
        preferredMethod: 'email' as const,
      }
      mockSet.mockResolvedValue(undefined)

      const result = await notifySafeAdult(emailDesignation, mockSignal, 'Emma')

      expect(result.deliveryStatus).toBe('sent')
      expect(mockSendEmail).toHaveBeenCalled()
    })

    it('should create notification record', async () => {
      mockSet.mockResolvedValue(undefined)

      const result = await notifySafeAdult(mockDesignation, mockSignal, 'Emma')

      expect(result.id).toBeTruthy()
      expect(result.designationId).toBe('sa_123')
      expect(result.signalId).toBe('sig_123')
      expect(result.childName).toBe('Emma')
    })

    it('should store notification in Firestore', async () => {
      mockSet.mockResolvedValue(undefined)

      await notifySafeAdult(mockDesignation, mockSignal, 'Emma')

      expect(mockSet).toHaveBeenCalled()
    })

    it('should fallback to email if SMS fails and email available', async () => {
      const bothDesignation = {
        ...mockDesignation,
        email: 'aunt@example.com',
      }
      mockSendSMS.mockResolvedValue({ success: false, error: 'Failed' })
      mockSet.mockResolvedValue(undefined)

      const result = await notifySafeAdult(bothDesignation, mockSignal, 'Emma')

      expect(mockSendEmail).toHaveBeenCalled()
      expect(result.deliveryStatus).toBe('sent')
    })

    it('should mark as failed if all delivery attempts fail', async () => {
      mockSendSMS.mockResolvedValue({ success: false, error: 'Failed' })
      mockSet.mockResolvedValue(undefined)

      const result = await notifySafeAdult(mockDesignation, mockSignal, 'Emma')

      expect(result.deliveryStatus).toBe('failed')
      expect(result.failureReason).toBeTruthy()
    })
  })

  // ============================================
  // getNotificationStatus Tests
  // ============================================

  describe('getNotificationStatus', () => {
    it('should return notification when exists', async () => {
      const mockNotification: SafeAdultNotification = {
        id: 'notif_123',
        designationId: 'sa_123',
        signalId: 'sig_123',
        childName: 'Emma',
        sentAt: new Date(),
        deliveryStatus: 'delivered',
        deliveredAt: new Date(),
        failureReason: null,
        retryCount: 0,
      }
      mockGet.mockResolvedValue({ exists: () => true, data: () => mockNotification })

      const result = await getNotificationStatus('notif_123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('notif_123')
      expect(result?.deliveryStatus).toBe('delivered')
    })

    it('should return null when not exists', async () => {
      mockGet.mockResolvedValue({ exists: () => false })

      const result = await getNotificationStatus('notif_nonexistent')

      expect(result).toBeNull()
    })

    it('should throw on empty id', async () => {
      await expect(getNotificationStatus('')).rejects.toThrow('id')
    })
  })

  // ============================================
  // updateNotificationStatus Tests
  // ============================================

  describe('updateNotificationStatus', () => {
    it('should update to sent status', async () => {
      const mockNotification: SafeAdultNotification = {
        id: 'notif_123',
        designationId: 'sa_123',
        signalId: 'sig_123',
        childName: 'Emma',
        sentAt: new Date(),
        deliveryStatus: 'pending',
        deliveredAt: null,
        failureReason: null,
        retryCount: 0,
      }
      mockGet.mockResolvedValue({ exists: () => true, data: () => mockNotification })
      mockUpdate.mockResolvedValue(undefined)

      const result = await updateNotificationStatus('notif_123', 'sent')

      expect(result.deliveryStatus).toBe('sent')
    })

    it('should update to delivered with timestamp', async () => {
      const mockNotification: SafeAdultNotification = {
        id: 'notif_123',
        designationId: 'sa_123',
        signalId: 'sig_123',
        childName: 'Emma',
        sentAt: new Date(),
        deliveryStatus: 'sent',
        deliveredAt: null,
        failureReason: null,
        retryCount: 0,
      }
      mockGet.mockResolvedValue({ exists: () => true, data: () => mockNotification })
      mockUpdate.mockResolvedValue(undefined)

      const result = await updateNotificationStatus('notif_123', 'delivered')

      expect(result.deliveryStatus).toBe('delivered')
      expect(result.deliveredAt).toBeTruthy()
    })

    it('should update to failed with reason', async () => {
      const mockNotification: SafeAdultNotification = {
        id: 'notif_123',
        designationId: 'sa_123',
        signalId: 'sig_123',
        childName: 'Emma',
        sentAt: new Date(),
        deliveryStatus: 'pending',
        deliveredAt: null,
        failureReason: null,
        retryCount: 0,
      }
      mockGet.mockResolvedValue({ exists: () => true, data: () => mockNotification })
      mockUpdate.mockResolvedValue(undefined)

      const result = await updateNotificationStatus('notif_123', 'failed', 'Network timeout')

      expect(result.deliveryStatus).toBe('failed')
      expect(result.failureReason).toBe('Network timeout')
    })

    it('should throw when notification not found', async () => {
      mockGet.mockResolvedValue({ exists: () => false })

      await expect(updateNotificationStatus('notif_123', 'sent')).rejects.toThrow('not found')
    })
  })

  // ============================================
  // retryNotification Tests
  // ============================================

  describe('retryNotification', () => {
    const mockNotification: SafeAdultNotification = {
      id: 'notif_123',
      designationId: 'sa_123',
      signalId: 'sig_123',
      childName: 'Emma',
      sentAt: new Date(),
      deliveryStatus: 'failed',
      deliveredAt: null,
      failureReason: 'Network error',
      retryCount: 1,
    }

    const mockDesignation: SafeAdultDesignation = {
      id: 'sa_123',
      childId: 'child_123',
      phoneNumber: '+15551234567',
      email: null,
      preferredMethod: 'sms',
      displayName: 'Aunt Jane',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPreConfigured: true,
      encryptionKeyId: 'sakey_123',
    }

    it('should retry failed notification', async () => {
      mockGet.mockResolvedValueOnce({ exists: () => true, data: () => mockNotification })
      mockGet.mockResolvedValueOnce({ exists: () => true, data: () => mockDesignation })
      mockUpdate.mockResolvedValue(undefined)
      mockSendSMS.mockResolvedValue({ success: true, messageId: 'sms_retry' })

      const result = await retryNotification('notif_123')

      expect(result.deliveryStatus).toBe('sent')
      expect(result.retryCount).toBe(2)
    })

    it('should increment retry count', async () => {
      mockGet.mockResolvedValueOnce({ exists: () => true, data: () => mockNotification })
      mockGet.mockResolvedValueOnce({ exists: () => true, data: () => mockDesignation })
      mockUpdate.mockResolvedValue(undefined)

      await retryNotification('notif_123')

      expect(mockUpdate).toHaveBeenCalled()
    })

    it('should throw when notification not found', async () => {
      mockGet.mockResolvedValue({ exists: () => false })

      await expect(retryNotification('notif_nonexistent')).rejects.toThrow('not found')
    })

    it('should throw on empty id', async () => {
      await expect(retryNotification('')).rejects.toThrow('id')
    })
  })
})
