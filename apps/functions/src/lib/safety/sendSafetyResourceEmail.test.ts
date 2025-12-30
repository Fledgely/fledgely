/**
 * Safety Resource Email Service Tests
 *
 * Story 0.5.9: Domestic Abuse Resource Referral
 *
 * Tests verify:
 * - AC1: Email sent immediately after escape completion
 * - AC3: Email sent to safe contact address (not account email)
 * - AC6: Admin audit logging on success and failure
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock firebase-admin/firestore - MUST be before imports
const mockGet = vi.fn()
const mockDoc = vi.fn(() => ({ get: mockGet }))
const mockCollection = vi.fn(() => ({ doc: mockDoc }))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
  }),
  Firestore: vi.fn(),
}))

// Mock Resend - MUST be before imports
const mockSend = vi.fn()
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: mockSend,
    },
  })),
}))

// Mock admin audit logging
const mockLogAdminAction = vi.fn()
vi.mock('../../utils/adminAudit', () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
}))

// Mock email template functions
vi.mock('../../templates/safetyResourceEmail', () => ({
  generateSafetyResourceEmailHtml: () => '<html>Safety Resources</html>',
  generateSafetyResourceEmailText: () => 'Safety Resources',
  SAFETY_RESOURCE_EMAIL_SUBJECT: 'Important Resources',
}))

// Import AFTER mocks
import {
  sendSafetyResourceEmail,
  _resetDbForTesting,
  type SendSafetyResourceEmailParams,
} from './sendSafetyResourceEmail'

describe('sendSafetyResourceEmail', () => {
  const defaultParams: SendSafetyResourceEmailParams = {
    ticketId: 'ticket-123',
    agentId: 'agent-456',
    agentEmail: 'agent@example.com',
    ipAddress: '192.168.1.1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
    // Set environment variable
    process.env.RESEND_API_KEY = 'test-api-key'
  })

  describe('successful email sending', () => {
    it('sends email to safe contact address from ticket', async () => {
      // Arrange
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          safeContactInfo: {
            email: 'safe@example.com',
            phone: null,
            preferredMethod: 'email',
          },
        }),
      })
      mockSend.mockResolvedValue({
        data: { id: 'resend-message-123' },
        error: null,
      })

      // Act
      const result = await sendSafetyResourceEmail(defaultParams)

      // Assert
      expect(result.success).toBe(true)
      expect(result.messageId).toBe('resend-message-123')
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'safe@example.com',
          subject: 'Important Resources',
        })
      )
    })

    it('logs success to admin audit with hashed recipient', async () => {
      // Arrange
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          safeContactInfo: { email: 'victim@safe.com' },
        }),
      })
      mockSend.mockResolvedValue({
        data: { id: 'msg-456' },
        error: null,
      })

      // Act
      await sendSafetyResourceEmail(defaultParams)

      // Assert
      expect(mockLogAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'agent-456',
          agentEmail: 'agent@example.com',
          action: 'send_safety_resource_email',
          resourceType: 'safety_resource_email',
          resourceId: 'ticket-123',
          metadata: expect.objectContaining({
            status: 'sent',
            messageId: 'msg-456',
            recipientHash: expect.any(String),
          }),
        })
      )
    })

    it('returns messageId on success', async () => {
      // Arrange
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          safeContactInfo: { email: 'test@safe.com' },
        }),
      })
      mockSend.mockResolvedValue({
        data: { id: 'unique-msg-id' },
        error: null,
      })

      // Act
      const result = await sendSafetyResourceEmail(defaultParams)

      // Assert
      expect(result.messageId).toBe('unique-msg-id')
    })
  })

  describe('skipped email - no safe contact', () => {
    it('skips when safeContactInfo is null', async () => {
      // Arrange
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          safeContactInfo: null,
        }),
      })

      // Act
      const result = await sendSafetyResourceEmail(defaultParams)

      // Assert
      expect(result.success).toBe(false)
      expect(result.skipped).toBe(true)
      expect(result.skipReason).toContain('No safe contact email')
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('skips when safe email is missing', async () => {
      // Arrange
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          safeContactInfo: {
            phone: '555-1234',
            email: null,
          },
        }),
      })

      // Act
      const result = await sendSafetyResourceEmail(defaultParams)

      // Assert
      expect(result.success).toBe(false)
      expect(result.skipped).toBe(true)
    })

    it('logs skip to admin audit for review', async () => {
      // Arrange
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          safeContactInfo: { phone: '555-0000' },
        }),
      })

      // Act
      await sendSafetyResourceEmail(defaultParams)

      // Assert
      expect(mockLogAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'send_safety_resource_email',
          metadata: expect.objectContaining({
            status: 'skipped',
            reason: 'No safe contact email provided',
          }),
        })
      )
    })
  })

  describe('error handling', () => {
    it('returns error when ticket not found', async () => {
      // Arrange
      mockGet.mockResolvedValue({
        exists: false,
      })

      // Act
      const result = await sendSafetyResourceEmail(defaultParams)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Safety ticket not found')
    })

    it('logs ticket not found to admin audit', async () => {
      // Arrange
      mockGet.mockResolvedValue({ exists: false })

      // Act
      await sendSafetyResourceEmail(defaultParams)

      // Assert
      expect(mockLogAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            status: 'failed',
            error: 'Ticket not found',
          }),
        })
      )
    })

    it('returns error when Resend API fails', async () => {
      // Arrange
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          safeContactInfo: { email: 'test@safe.com' },
        }),
      })
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Rate limited' },
      })

      // Act
      const result = await sendSafetyResourceEmail(defaultParams)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to send safety resource email')
    })

    it('logs Resend API failure to admin audit', async () => {
      // Arrange
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          safeContactInfo: { email: 'test@safe.com' },
        }),
      })
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Invalid recipient' },
      })

      // Act
      await sendSafetyResourceEmail(defaultParams)

      // Assert
      expect(mockLogAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            status: 'failed',
            error: 'Invalid recipient',
          }),
        })
      )
    })

    it('handles unexpected exceptions gracefully', async () => {
      // Arrange
      mockGet.mockRejectedValue(new Error('Database connection lost'))

      // Act
      const result = await sendSafetyResourceEmail(defaultParams)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection lost')
    })

    it('logs unexpected exceptions to admin audit', async () => {
      // Arrange
      mockGet.mockRejectedValue(new Error('Unexpected error'))

      // Act
      await sendSafetyResourceEmail(defaultParams)

      // Assert
      expect(mockLogAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            status: 'failed',
            error: 'Unexpected error',
          }),
        })
      )
    })

    it('does not throw even when audit logging fails', async () => {
      // Arrange
      mockGet.mockRejectedValue(new Error('DB error'))
      mockLogAdminAction.mockRejectedValue(new Error('Audit failed'))

      // Act
      const result = await sendSafetyResourceEmail(defaultParams)

      // Assert - should still return result without throwing
      expect(result.success).toBe(false)
      expect(result.error).toBe('DB error')
    })
  })

  describe('security requirements', () => {
    it('never sends to account email, only safe contact email', async () => {
      // Arrange - ticket has both account email and safe contact email
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          userEmail: 'monitored@account.com', // Account email (may be monitored)
          safeContactInfo: {
            email: 'secret@safe.com', // Safe contact email
          },
        }),
      })
      mockSend.mockResolvedValue({ data: { id: 'msg' }, error: null })

      // Act
      await sendSafetyResourceEmail(defaultParams)

      // Assert - must send to safe email, NOT account email
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'secret@safe.com',
        })
      )
      expect(mockSend).not.toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'monitored@account.com',
        })
      )
    })

    it('hashes recipient email in audit logs', async () => {
      // Arrange
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          safeContactInfo: { email: 'actual-email@test.com' },
        }),
      })
      mockSend.mockResolvedValue({ data: { id: 'msg' }, error: null })

      // Act
      await sendSafetyResourceEmail(defaultParams)

      // Assert - recipient should be hashed, not plain text
      expect(mockLogAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            recipientHash: expect.not.stringContaining('@'),
          }),
        })
      )
    })

    it('uses neutral subject line', async () => {
      // Arrange
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          safeContactInfo: { email: 'test@safe.com' },
        }),
      })
      mockSend.mockResolvedValue({ data: { id: 'msg' }, error: null })

      // Act
      await sendSafetyResourceEmail(defaultParams)

      // Assert
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Important Resources',
        })
      )
    })
  })

  describe('edge cases', () => {
    it('handles empty string email as missing', async () => {
      // Arrange - ensure mocks are resolved (not rejected from previous tests)
      mockLogAdminAction.mockResolvedValue(undefined)
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          safeContactInfo: { email: '' },
        }),
      })

      // Act
      const result = await sendSafetyResourceEmail(defaultParams)

      // Assert
      expect(result.success).toBe(false)
      expect(result.skipped).toBe(true)
    })

    it('handles whitespace-only email as missing', async () => {
      // Arrange
      mockLogAdminAction.mockResolvedValue(undefined)
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          safeContactInfo: { email: '   ' },
        }),
      })

      // Act
      const result = await sendSafetyResourceEmail(defaultParams)

      // Assert
      expect(result.success).toBe(false)
      expect(result.skipped).toBe(true)
    })

    it('works with minimal params (no ipAddress)', async () => {
      // Arrange - ensure mocks are resolved (not rejected from previous tests)
      mockLogAdminAction.mockResolvedValue(undefined)
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          safeContactInfo: { email: 'test@safe.com' },
        }),
      })
      mockSend.mockResolvedValue({ data: { id: 'msg' }, error: null })

      const minimalParams: SendSafetyResourceEmailParams = {
        ticketId: 'ticket-1',
        agentId: 'agent-1',
        agentEmail: null,
      }

      // Act
      const result = await sendSafetyResourceEmail(minimalParams)

      // Assert
      expect(result.success).toBe(true)
    })
  })
})
