/**
 * Classify Screenshot Tests
 *
 * Story 20.1: Classification Service Architecture - AC2, AC3, AC4, AC6
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi } from 'vitest'
import { needsClassification, buildClassificationJob } from './classifyScreenshot'

// Mock logger
vi.mock('firebase-functions/logger', () => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}))

describe('classifyScreenshot helpers', () => {
  describe('needsClassification', () => {
    it('returns false for undefined document', () => {
      expect(needsClassification(undefined)).toBe(false)
    })

    it('returns false if already completed', () => {
      const doc = {
        classification: { status: 'completed' },
      }
      expect(needsClassification(doc)).toBe(false)
    })

    it('returns false if currently processing', () => {
      const doc = {
        classification: { status: 'processing' },
      }
      expect(needsClassification(doc)).toBe(false)
    })

    it('returns true if status is pending', () => {
      const doc = {
        classification: { status: 'pending' },
      }
      expect(needsClassification(doc)).toBe(true)
    })

    it('returns true if status is failed (for retry)', () => {
      const doc = {
        classification: { status: 'failed' },
      }
      expect(needsClassification(doc)).toBe(true)
    })

    it('returns true if no classification exists', () => {
      const doc = {
        storagePath: 'screenshots/child-1/2024-01-01/123.jpg',
      }
      expect(needsClassification(doc)).toBe(true)
    })
  })

  describe('buildClassificationJob', () => {
    it('returns null for undefined document', () => {
      expect(buildClassificationJob(undefined, 'screenshot-123')).toBeNull()
    })

    it('returns null if childId is missing', () => {
      const doc = {
        familyId: 'family-123',
        storagePath: 'path/to/image.jpg',
      }
      expect(buildClassificationJob(doc, 'screenshot-123')).toBeNull()
    })

    it('returns null if familyId is missing', () => {
      const doc = {
        childId: 'child-123',
        storagePath: 'path/to/image.jpg',
      }
      expect(buildClassificationJob(doc, 'screenshot-123')).toBeNull()
    })

    it('returns null if storagePath is missing', () => {
      const doc = {
        childId: 'child-123',
        familyId: 'family-123',
      }
      expect(buildClassificationJob(doc, 'screenshot-123')).toBeNull()
    })

    it('builds job with required fields', () => {
      const doc = {
        childId: 'child-123',
        familyId: 'family-123',
        storagePath: 'screenshots/child-123/2024-01-01/123.jpg',
      }

      const job = buildClassificationJob(doc, 'screenshot-123')

      expect(job).toEqual({
        childId: 'child-123',
        screenshotId: 'screenshot-123',
        storagePath: 'screenshots/child-123/2024-01-01/123.jpg',
        url: undefined,
        title: undefined,
        familyId: 'family-123',
        retryCount: 0,
      })
    })

    it('includes optional url and title', () => {
      const doc = {
        childId: 'child-123',
        familyId: 'family-123',
        storagePath: 'screenshots/child-123/2024-01-01/123.jpg',
        url: 'https://example.com',
        title: 'Example Page',
      }

      const job = buildClassificationJob(doc, 'screenshot-123')

      expect(job?.url).toBe('https://example.com')
      expect(job?.title).toBe('Example Page')
    })

    it('preserves existing retry count', () => {
      const doc = {
        childId: 'child-123',
        familyId: 'family-123',
        storagePath: 'screenshots/child-123/2024-01-01/123.jpg',
        classification: {
          status: 'failed',
          retryCount: 2,
        },
      }

      const job = buildClassificationJob(doc, 'screenshot-123')

      expect(job?.retryCount).toBe(2)
    })
  })
})
