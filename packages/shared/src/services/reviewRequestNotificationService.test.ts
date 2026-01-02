/**
 * ReviewRequestNotificationService Tests - Story 34.5.3 Task 3
 *
 * Tests for parent review request notifications.
 * AC2: Review Request Notification to Parent
 * AC5: Invitation, Not Demand
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getReviewRequestNotificationMessage,
  sanitizeChildNameForNotification,
  createReviewRequestNotification,
} from './reviewRequestNotificationService'

// ============================================
// Mock Firebase
// ============================================

const mockAddDoc = vi.fn()
const mockCollection = vi.fn()

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: (...args: unknown[]) => mockCollection(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  serverTimestamp: vi.fn(() => new Date()),
}))

describe('reviewRequestNotificationService - Story 34.5.3', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCollection.mockReturnValue({ id: 'mock-collection' })
    mockAddDoc.mockResolvedValue({ id: 'notification-123' })
  })

  // ============================================
  // sanitizeChildNameForNotification Tests
  // ============================================

  describe('sanitizeChildNameForNotification', () => {
    it('should return child name unchanged for normal input', () => {
      expect(sanitizeChildNameForNotification('Alex')).toBe('Alex')
    })

    it('should return "Your child" for empty string', () => {
      expect(sanitizeChildNameForNotification('')).toBe('Your child')
    })

    it('should return "Your child" for whitespace only', () => {
      expect(sanitizeChildNameForNotification('   ')).toBe('Your child')
    })

    it('should return "Your child" for null/undefined-like input', () => {
      expect(sanitizeChildNameForNotification(null as unknown as string)).toBe('Your child')
      expect(sanitizeChildNameForNotification(undefined as unknown as string)).toBe('Your child')
    })

    it('should trim whitespace from name', () => {
      expect(sanitizeChildNameForNotification('  Alex  ')).toBe('Alex')
    })

    it('should remove HTML tags', () => {
      expect(sanitizeChildNameForNotification('<script>Alex</script>')).toBe('Alex')
      expect(sanitizeChildNameForNotification('<b>Alex</b>')).toBe('Alex')
    })

    it('should remove control characters', () => {
      expect(sanitizeChildNameForNotification('Alex\x00\x1F')).toBe('Alex')
    })

    it('should limit name to 50 characters', () => {
      const longName = 'A'.repeat(100)
      const result = sanitizeChildNameForNotification(longName)
      expect(result.length).toBe(50)
    })

    it('should handle mixed HTML and normal text', () => {
      expect(sanitizeChildNameForNotification('Hello <b>Alex</b> World')).toBe('Hello Alex World')
    })
  })

  // ============================================
  // getReviewRequestNotificationMessage Tests
  // ============================================

  describe('getReviewRequestNotificationMessage', () => {
    it('should return invitation-style message', () => {
      const message = getReviewRequestNotificationMessage('Alex', [])

      expect(message.title).toBe('Agreement discussion invitation')
      expect(message.body).toContain('Alex')
      expect(message.body).toContain('inviting')
    })

    it('should include suggested areas when provided', () => {
      const message = getReviewRequestNotificationMessage('Alex', ['Screen time', 'Bedtime'])

      expect(message.suggestedAreas).toContain('Screen time')
      expect(message.suggestedAreas).toContain('Bedtime')
    })

    it('should sanitize child name', () => {
      const message = getReviewRequestNotificationMessage('<script>Alex</script>', [])

      expect(message.body).toContain('Alex')
      expect(message.body).not.toContain('<script>')
    })

    it('should use non-confrontational language (AC5)', () => {
      const message = getReviewRequestNotificationMessage('Alex', [])

      // Should NOT contain demanding/confrontational language
      expect(message.body.toLowerCase()).not.toContain('demand')
      expect(message.body.toLowerCase()).not.toContain('require')
      expect(message.body.toLowerCase()).not.toContain('must')
      expect(message.body.toLowerCase()).not.toContain('urgent')
      expect(message.body.toLowerCase()).not.toContain('immediately')
    })

    it('should use invitation language (AC5)', () => {
      const message = getReviewRequestNotificationMessage('Alex', [])

      // Should contain invitation-style language
      const bodyLower = message.body.toLowerCase()
      const hasInvitationLanguage =
        bodyLower.includes('invit') ||
        bodyLower.includes('discuss') ||
        bodyLower.includes('conversation') ||
        bodyLower.includes('together') ||
        bodyLower.includes('opportunity')
      expect(hasInvitationLanguage).toBe(true)
    })

    it('should handle empty child name gracefully', () => {
      const message = getReviewRequestNotificationMessage('', [])

      expect(message.body).toContain('Your child')
    })
  })

  // ============================================
  // createReviewRequestNotification Tests
  // ============================================

  describe('createReviewRequestNotification', () => {
    it('should create notification with correct data', async () => {
      await createReviewRequestNotification('family-123', 'request-456', 'Alex', ['Screen time'])

      expect(mockAddDoc).toHaveBeenCalledTimes(1)
      const callArgs = mockAddDoc.mock.calls[0][1]
      expect(callArgs.familyId).toBe('family-123')
      expect(callArgs.requestId).toBe('request-456')
      expect(callArgs.childName).toBe('Alex')
      expect(callArgs.suggestedAreas).toEqual(['Screen time'])
    })

    it('should set status to pending', async () => {
      await createReviewRequestNotification('family-123', 'request-456', 'Alex', [])

      const callArgs = mockAddDoc.mock.calls[0][1]
      expect(callArgs.status).toBe('pending')
    })

    it('should include invitation-style title and body', async () => {
      await createReviewRequestNotification('family-123', 'request-456', 'Alex', [])

      const callArgs = mockAddDoc.mock.calls[0][1]
      expect(callArgs.title).toBe('Agreement discussion invitation')
      expect(callArgs.body).toContain('inviting')
    })

    it('should sanitize child name in notification', async () => {
      await createReviewRequestNotification(
        'family-123',
        'request-456',
        '<script>Alex</script>',
        []
      )

      const callArgs = mockAddDoc.mock.calls[0][1]
      expect(callArgs.childName).toBe('Alex')
      expect(callArgs.body).not.toContain('<script>')
    })

    it('should throw error for empty familyId', async () => {
      await expect(createReviewRequestNotification('', 'request-456', 'Alex', [])).rejects.toThrow(
        'familyId is required'
      )
    })

    it('should throw error for empty requestId', async () => {
      await expect(createReviewRequestNotification('family-123', '', 'Alex', [])).rejects.toThrow(
        'requestId is required'
      )
    })
  })

  // ============================================
  // Messaging Tone Validation Tests
  // ============================================

  describe('messaging tone validation', () => {
    const testCases = ['Alex', 'Jordan', 'Emma-Rose', "O'Connor", 'Björk']

    testCases.forEach((name) => {
      it(`should use supportive language for "${name}"`, () => {
        const message = getReviewRequestNotificationMessage(name, [])

        // Title should be welcoming
        expect(message.title.toLowerCase()).not.toContain('alert')
        expect(message.title.toLowerCase()).not.toContain('warning')
        expect(message.title.toLowerCase()).not.toContain('urgent')

        // Body should be supportive
        const bodyLower = message.body.toLowerCase()
        expect(bodyLower).not.toContain('fail')
        expect(bodyLower).not.toContain('refuse')
        expect(bodyLower).not.toContain('demand')
      })
    })

    it('should frame review as positive opportunity', () => {
      const message = getReviewRequestNotificationMessage('Alex', ['Screen time'])

      // Should emphasize positive framing
      const bodyLower = message.body.toLowerCase()
      const hasPositiveFraming =
        bodyLower.includes('opportunity') ||
        bodyLower.includes('together') ||
        bodyLower.includes('conversation') ||
        bodyLower.includes('discuss') ||
        bodyLower.includes('check in')
      expect(hasPositiveFraming).toBe(true)
    })
  })
})
