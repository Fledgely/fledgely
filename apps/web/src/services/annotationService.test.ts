/**
 * Annotation Service Tests - Story 23.2
 *
 * Tests for child annotation submission functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isValidAnnotationOption,
  sanitizeExplanation,
  hasAnnotationWindowExpired,
  getAnnotationRemainingTime,
  submitAnnotation,
  skipAnnotation,
  canChildAnnotate,
} from './annotationService'
import { MAX_ANNOTATION_EXPLANATION_LENGTH } from '@fledgely/shared'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ id: 'mock-doc-ref' })),
  updateDoc: vi.fn(),
  getDoc: vi.fn(),
}))

vi.mock('../lib/firebase', () => ({
  db: {},
}))

import { getDoc, updateDoc } from 'firebase/firestore'

describe('annotationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isValidAnnotationOption', () => {
    it('should return true for valid annotation options', () => {
      expect(isValidAnnotationOption('school_project')).toBe(true)
      expect(isValidAnnotationOption('friend_showing')).toBe(true)
      expect(isValidAnnotationOption('accident')).toBe(true)
      expect(isValidAnnotationOption('other')).toBe(true)
      expect(isValidAnnotationOption('skipped')).toBe(true)
    })

    it('should return false for invalid options', () => {
      expect(isValidAnnotationOption('invalid')).toBe(false)
      expect(isValidAnnotationOption('')).toBe(false)
      expect(isValidAnnotationOption('SCHOOL_PROJECT')).toBe(false)
    })
  })

  describe('sanitizeExplanation', () => {
    it('should return undefined for empty or whitespace-only input', () => {
      expect(sanitizeExplanation('')).toBeUndefined()
      expect(sanitizeExplanation('   ')).toBeUndefined()
      expect(sanitizeExplanation(undefined)).toBeUndefined()
    })

    it('should trim whitespace from explanation', () => {
      expect(sanitizeExplanation('  hello  ')).toBe('hello')
      expect(sanitizeExplanation('\n\ntest\n\n')).toBe('test')
    })

    it('should truncate explanation exceeding max length', () => {
      const longText = 'a'.repeat(MAX_ANNOTATION_EXPLANATION_LENGTH + 100)
      const result = sanitizeExplanation(longText)
      expect(result?.length).toBe(MAX_ANNOTATION_EXPLANATION_LENGTH)
    })

    it('should preserve valid explanations', () => {
      const validText = 'This is a valid explanation'
      expect(sanitizeExplanation(validText)).toBe(validText)
    })
  })

  describe('hasAnnotationWindowExpired', () => {
    it('should return true if deadline is undefined', () => {
      expect(hasAnnotationWindowExpired(undefined)).toBe(true)
    })

    it('should return true if deadline is in the past', () => {
      const pastDeadline = Date.now() - 1000
      expect(hasAnnotationWindowExpired(pastDeadline)).toBe(true)
    })

    it('should return false if deadline is in the future', () => {
      const futureDeadline = Date.now() + 60000
      expect(hasAnnotationWindowExpired(futureDeadline)).toBe(false)
    })
  })

  describe('getAnnotationRemainingTime', () => {
    it('should return 0 if deadline is undefined', () => {
      expect(getAnnotationRemainingTime(undefined)).toBe(0)
    })

    it('should return 0 if deadline is in the past', () => {
      const pastDeadline = Date.now() - 1000
      expect(getAnnotationRemainingTime(pastDeadline)).toBe(0)
    })

    it('should return positive value for future deadline', () => {
      const futureDeadline = Date.now() + 60000
      const remaining = getAnnotationRemainingTime(futureDeadline)
      expect(remaining).toBeGreaterThan(0)
      expect(remaining).toBeLessThanOrEqual(60000)
    })
  })

  describe('canChildAnnotate', () => {
    it('should return false if flag does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null,
      } as never)

      const result = await canChildAnnotate('child-123', 'flag-456')

      expect(result.canAnnotate).toBe(false)
      expect(result.reason).toBe('Flag not found')
    })

    it('should return false if flag belongs to different child', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'flag-456',
          childId: 'different-child',
          childNotificationStatus: 'notified',
        }),
      } as never)

      const result = await canChildAnnotate('child-123', 'flag-456')

      expect(result.canAnnotate).toBe(false)
      expect(result.reason).toBe('Flag does not belong to this child')
    })

    it('should return false if flag is not awaiting annotation', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'flag-456',
          childId: 'child-123',
          childNotificationStatus: 'annotated',
        }),
      } as never)

      const result = await canChildAnnotate('child-123', 'flag-456')

      expect(result.canAnnotate).toBe(false)
      expect(result.reason).toContain('not awaiting annotation')
    })

    it('should return true if child can annotate', async () => {
      const mockFlag = {
        id: 'flag-456',
        childId: 'child-123',
        childNotificationStatus: 'notified',
      }

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockFlag,
      } as never)

      const result = await canChildAnnotate('child-123', 'flag-456')

      expect(result.canAnnotate).toBe(true)
      expect(result.flag).toBeDefined()
    })
  })

  describe('submitAnnotation', () => {
    it('should reject invalid annotation options', async () => {
      const result = await submitAnnotation({
        flagId: 'flag-123',
        childId: 'child-456',
        annotation: 'invalid' as never,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid annotation option')
    })

    it('should update flag document on successful submission', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'flag-123',
          childId: 'child-456',
          childNotificationStatus: 'notified',
        }),
      } as never)

      vi.mocked(updateDoc).mockResolvedValue(undefined)

      const result = await submitAnnotation({
        flagId: 'flag-123',
        childId: 'child-456',
        annotation: 'school_project',
        explanation: 'For my science class',
      })

      expect(result.success).toBe(true)
      expect(result.annotatedAt).toBeDefined()
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          childAnnotation: 'school_project',
          childExplanation: 'For my science class',
          childNotificationStatus: 'annotated',
        })
      )
    })

    it('should submit without explanation', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'flag-123',
          childId: 'child-456',
          childNotificationStatus: 'notified',
        }),
      } as never)

      vi.mocked(updateDoc).mockResolvedValue(undefined)

      const result = await submitAnnotation({
        flagId: 'flag-123',
        childId: 'child-456',
        annotation: 'accident',
      })

      expect(result.success).toBe(true)
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          childAnnotation: 'accident',
          childNotificationStatus: 'annotated',
        })
      )
    })

    it('should handle update errors gracefully', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'flag-123',
          childId: 'child-456',
          childNotificationStatus: 'notified',
        }),
      } as never)

      vi.mocked(updateDoc).mockRejectedValue(new Error('Firestore error'))

      const result = await submitAnnotation({
        flagId: 'flag-123',
        childId: 'child-456',
        annotation: 'other',
        explanation: 'test',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Firestore error')
    })
  })

  describe('skipAnnotation', () => {
    it('should update flag with skipped status', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'flag-123',
          childId: 'child-456',
          childNotificationStatus: 'notified',
        }),
      } as never)

      vi.mocked(updateDoc).mockResolvedValue(undefined)

      const result = await skipAnnotation('child-456', 'flag-123')

      expect(result.success).toBe(true)
      expect(result.annotatedAt).toBeDefined()
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          childAnnotation: 'skipped',
          childNotificationStatus: 'skipped',
        })
      )
    })

    it('should reject if child cannot annotate', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null,
      } as never)

      const result = await skipAnnotation('child-456', 'flag-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Flag not found')
    })

    it('should handle skip errors gracefully', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'flag-123',
          childId: 'child-456',
          childNotificationStatus: 'notified',
        }),
      } as never)

      vi.mocked(updateDoc).mockRejectedValue(new Error('Network error'))

      const result = await skipAnnotation('child-456', 'flag-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })
})
