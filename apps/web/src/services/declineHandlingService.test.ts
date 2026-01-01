/**
 * declineHandlingService Tests - Story 34.5
 *
 * Tests for decline messaging and notification service.
 * AC3: Decline notification with supportive language
 * AC5, AC6: Positive messaging after decline
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'

// Mock shared package before importing service
vi.mock('@fledgely/shared', () => ({
  DECLINE_REASONS: [
    { id: 'not-ready', label: "I'm not ready for this change yet" },
    { id: 'need-discussion', label: "Let's discuss this together first" },
    { id: 'too-soon', label: "It's too soon since our last change" },
    { id: 'need-more-info', label: 'I need more information about this' },
    { id: 'prefer-different', label: "I'd prefer a different approach" },
    { id: 'custom', label: 'Other reason...' },
  ],
  AFTER_DECLINE_MESSAGES: {
    proposer: {
      title: 'Proposal Declined',
      body: "This isn't the end of the conversation.",
      tryAgain: 'You can propose again after some time has passed.',
      cooldownInfo: 'Wait 7 days before proposing the same change.',
      suggestions: [
        'Wait a few days and try a modified proposal',
        'Discuss in person to understand their concerns',
        'Consider a smaller step toward your goal',
      ],
    },
    responder: {
      title: 'You Declined the Proposal',
      body: 'Thank you for your thoughtful response.',
      next: 'Consider discussing this together to find common ground.',
    },
    notification: {
      title: 'Proposal Response',
      body: (responderName: string) => `${responderName} isn't ready for this change yet.`,
      supportive: 'You can discuss this together or propose something different later.',
    },
  },
}))

import {
  sendDeclineNotification,
  getSuggestionsAfterDecline,
  formatCooldownMessage,
  getDeclineReasonLabel,
} from './declineHandlingService'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

const { addDoc, collection } = await import('firebase/firestore')

describe('declineHandlingService - Story 34.5', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(collection as Mock).mockReturnValue('mock-collection')
    ;(addDoc as Mock).mockResolvedValue({ id: 'notification-123' })
  })

  describe('sendDeclineNotification', () => {
    const mockParams = {
      familyId: 'family-123',
      proposerId: 'parent-1',
      responderName: 'Emma',
      declineReason: "I'm not ready for this change yet",
    }

    it('should create notification document', async () => {
      await sendDeclineNotification(mockParams)

      expect(addDoc).toHaveBeenCalled()
    })

    it('should use supportive notification title', async () => {
      await sendDeclineNotification(mockParams)

      const callArgs = (addDoc as Mock).mock.calls[0][1]
      expect(callArgs.title).toBeDefined()
      expect(callArgs.title.toLowerCase()).not.toContain('rejected')
    })

    it('should include responder name in body', async () => {
      await sendDeclineNotification(mockParams)

      const callArgs = (addDoc as Mock).mock.calls[0][1]
      expect(callArgs.body).toContain('Emma')
    })

    it('should include decline reason', async () => {
      await sendDeclineNotification(mockParams)

      const callArgs = (addDoc as Mock).mock.calls[0][1]
      expect(callArgs.reason).toBe("I'm not ready for this change yet")
    })

    it('should include supportive message', async () => {
      await sendDeclineNotification(mockParams)

      const callArgs = (addDoc as Mock).mock.calls[0][1]
      expect(callArgs.supportive).toBeDefined()
      expect(callArgs.supportive.toLowerCase()).toContain('later')
    })

    it('should set correct recipient', async () => {
      await sendDeclineNotification(mockParams)

      const callArgs = (addDoc as Mock).mock.calls[0][1]
      expect(callArgs.recipientId).toBe('parent-1')
    })

    it('should return success with notification id', async () => {
      const result = await sendDeclineNotification(mockParams)

      expect(result.success).toBe(true)
      expect(result.notificationId).toBe('notification-123')
    })

    it('should return error on failure', async () => {
      ;(addDoc as Mock).mockRejectedValue(new Error('Network error'))

      const result = await sendDeclineNotification(mockParams)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('getSuggestionsAfterDecline', () => {
    it('should return array of suggestions', () => {
      const suggestions = getSuggestionsAfterDecline()

      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBeGreaterThanOrEqual(2)
    })

    it('should include try again suggestion', () => {
      const suggestions = getSuggestionsAfterDecline()

      const tryAgain = suggestions.some(
        (s) => s.toLowerCase().includes('try') || s.toLowerCase().includes('propose')
      )
      expect(tryAgain).toBe(true)
    })

    it('should include discussion suggestion', () => {
      const suggestions = getSuggestionsAfterDecline()

      const discuss = suggestions.some((s) => s.toLowerCase().includes('discuss'))
      expect(discuss).toBe(true)
    })
  })

  describe('formatCooldownMessage', () => {
    it('should format single day correctly', () => {
      const message = formatCooldownMessage(1)

      expect(message).toContain('1')
      expect(message.toLowerCase()).toContain('day')
    })

    it('should format multiple days correctly', () => {
      const message = formatCooldownMessage(5)

      expect(message).toContain('5')
      expect(message.toLowerCase()).toContain('days')
    })

    it('should handle 7 days', () => {
      const message = formatCooldownMessage(7)

      expect(message).toContain('7')
    })

    it('should be positive in tone', () => {
      const message = formatCooldownMessage(3)

      expect(message.toLowerCase()).not.toContain('cannot')
      expect(message.toLowerCase()).not.toContain('blocked')
    })
  })

  describe('getDeclineReasonLabel', () => {
    it('should return label for known reason id', () => {
      const label = getDeclineReasonLabel('not-ready')

      expect(label).toBe("I'm not ready for this change yet")
    })

    it('should return custom reason as-is', () => {
      const label = getDeclineReasonLabel('custom', 'My custom reason here')

      expect(label).toBe('My custom reason here')
    })

    it('should return fallback for unknown id', () => {
      const label = getDeclineReasonLabel('unknown-id' as never)

      expect(label).toBeDefined()
      expect(label.length).toBeGreaterThan(0)
    })
  })
})
