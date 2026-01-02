/**
 * EscalationNotificationService Tests - Story 34.5.2 Task 5
 *
 * Tests for parent escalation notification service.
 * AC6: Parent Escalation Notification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getParentNotificationMessage,
  createParentEscalationNotification,
  processEscalationNotification,
} from './escalationNotificationService'

// Mock Firebase
const mockGetDoc = vi.fn()
const mockSetDoc = vi.fn()
const mockUpdateDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(() => 'mock-doc-ref'),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  collection: vi.fn(() => 'mock-collection'),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}))

describe('escalationNotificationService - Story 34.5.2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDoc.mockReset()
    mockSetDoc.mockReset()
    mockUpdateDoc.mockReset()
  })

  // ============================================
  // getParentNotificationMessage Tests
  // ============================================

  describe('getParentNotificationMessage', () => {
    it('should return title and body', () => {
      const message = getParentNotificationMessage('Emma')

      expect(message.title).toBeTruthy()
      expect(message.body).toBeTruthy()
    })

    it('should include child name in body', () => {
      const message = getParentNotificationMessage('Emma')

      expect(message.body).toContain('Emma')
    })

    it('should be non-punitive toward parent', () => {
      const message = getParentNotificationMessage('Emma')
      const fullText = `${message.title} ${message.body}`.toLowerCase()

      // Should not blame parent
      expect(fullText).not.toContain('your fault')
      expect(fullText).not.toContain('blame')
      expect(fullText).not.toContain('failed')
      expect(fullText).not.toContain('wrong')
      expect(fullText).not.toContain('bad parent')
    })

    it('should be supportive and constructive', () => {
      const message = getParentNotificationMessage('Emma')
      const fullText = `${message.title} ${message.body}`.toLowerCase()

      // Should have supportive messaging
      const hasSupportiveTerms =
        fullText.includes('conversation') ||
        fullText.includes('communication') ||
        fullText.includes('help') ||
        fullText.includes('support') ||
        fullText.includes('resource') ||
        fullText.includes('consider')

      expect(hasSupportiveTerms).toBe(true)
    })

    it('should mention resources are available', () => {
      const message = getParentNotificationMessage('Emma')
      const fullText = `${message.title} ${message.body}`.toLowerCase()

      expect(fullText).toContain('resource')
    })

    it('should handle empty child name', () => {
      const message = getParentNotificationMessage('')

      expect(message.title).toBeTruthy()
      expect(message.body).toBeTruthy()
      expect(message.body).toContain('Your child')
    })

    it('should sanitize child name', () => {
      const message = getParentNotificationMessage('<script>alert("xss")</script>')

      // HTML tags should be removed
      expect(message.body).not.toContain('<script>')
      expect(message.body).not.toContain('</script>')
    })

    it('should handle very long child names', () => {
      const longName = 'A'.repeat(200)
      const message = getParentNotificationMessage(longName)

      expect(message.body.length).toBeLessThan(500)
    })
  })

  // ============================================
  // createParentEscalationNotification Tests
  // ============================================

  describe('createParentEscalationNotification', () => {
    it('should be a function', () => {
      expect(typeof createParentEscalationNotification).toBe('function')
    })

    it('should return a promise', () => {
      mockSetDoc.mockResolvedValue(undefined)

      const result = createParentEscalationNotification('family-123', 'child-456', 'Emma')

      expect(result).toBeInstanceOf(Promise)
    })

    it('should resolve without throwing', async () => {
      mockSetDoc.mockResolvedValue(undefined)

      await expect(
        createParentEscalationNotification('family-123', 'child-456', 'Emma')
      ).resolves.not.toThrow()
    })
  })

  // ============================================
  // processEscalationNotification Tests
  // ============================================

  describe('processEscalationNotification', () => {
    it('should be a function', () => {
      expect(typeof processEscalationNotification).toBe('function')
    })

    it('should return a promise', () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => null,
      })

      const result = processEscalationNotification('notification-123')

      expect(result).toBeInstanceOf(Promise)
    })

    it('should handle non-existent notification', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => null,
      })

      await expect(processEscalationNotification('notification-123')).resolves.not.toThrow()
    })

    it('should skip already processed notifications', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          status: 'sent',
          familyId: 'family-123',
          childId: 'child-456',
          childName: 'Emma',
        }),
      })

      await processEscalationNotification('notification-123')

      // Should not try to process again
      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })

    it('should process pending notifications', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          status: 'pending',
          familyId: 'family-123',
          childId: 'child-456',
          childName: 'Emma',
        }),
      })
      mockUpdateDoc.mockResolvedValue(undefined)

      await processEscalationNotification('notification-123')

      expect(mockUpdateDoc).toHaveBeenCalled()
    })
  })

  // ============================================
  // Message Tone Tests
  // ============================================

  describe('Message Tone - AC6', () => {
    it('should use empathetic language', () => {
      const message = getParentNotificationMessage('Emma')
      const fullText = `${message.title} ${message.body}`.toLowerCase()

      // Should convey understanding
      const hasEmpatheticTerms =
        fullText.includes('may') ||
        fullText.includes('might') ||
        fullText.includes('feel') ||
        fullText.includes('consider')

      expect(hasEmpatheticTerms).toBe(true)
    })

    it('should focus on child feelings, not child behavior', () => {
      const message = getParentNotificationMessage('Emma')
      const body = message.body.toLowerCase()

      // Should not suggest child is misbehaving
      expect(body).not.toContain('misbehav')
      expect(body).not.toContain('disobey')
      expect(body).not.toContain('defiant')
      expect(body).not.toContain('problem')
    })

    it('should suggest conversation, not punishment', () => {
      const message = getParentNotificationMessage('Emma')
      const body = message.body.toLowerCase()

      // Should not suggest punitive action
      expect(body).not.toContain('punish')
      expect(body).not.toContain('discipline')
      expect(body).not.toContain('consequence')
    })
  })
})
