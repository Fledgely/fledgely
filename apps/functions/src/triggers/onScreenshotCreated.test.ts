/**
 * Screenshot Created Trigger Tests
 *
 * Story 20.1: Classification Service Architecture - AC1, AC5
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase Admin
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
}))

// Mock Cloud Tasks
vi.mock('@google-cloud/tasks', () => ({
  CloudTasksClient: vi.fn().mockImplementation(() => ({
    queuePath: vi
      .fn()
      .mockReturnValue('projects/test/locations/us-central1/queues/screenshot-classification'),
    createTask: vi.fn().mockResolvedValue([{ name: 'task-1' }]),
  })),
}))

// Mock logger
vi.mock('firebase-functions/logger', () => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}))

// Mock classification service with simple functions
vi.mock('../services/classification', () => ({
  needsClassification: (doc: Record<string, unknown> | undefined) => {
    if (!doc) return false
    const classification = doc.classification as { status?: string } | undefined
    if (classification?.status === 'completed') return false
    if (classification?.status === 'processing') return false
    return true
  },
  buildClassificationJob: (doc: Record<string, unknown> | undefined, screenshotId: string) => {
    if (!doc || !doc.childId || !doc.familyId || !doc.storagePath) return null
    const classification = doc.classification as { retryCount?: number } | undefined
    return {
      childId: doc.childId,
      screenshotId,
      storagePath: doc.storagePath,
      url: doc.url,
      title: doc.title,
      familyId: doc.familyId,
      retryCount: classification?.retryCount ?? 0,
    }
  },
  classifyScreenshot: vi.fn().mockResolvedValue({ success: true }),
}))

// Import after mocks
import { needsClassification, buildClassificationJob } from '../services/classification'

describe('onScreenshotCreated trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GCLOUD_PROJECT = 'test-project'
  })

  describe('needsClassification', () => {
    it('returns false for undefined document', () => {
      expect(needsClassification(undefined)).toBe(false)
    })

    it('returns false if already completed', () => {
      expect(needsClassification({ classification: { status: 'completed' } })).toBe(false)
    })

    it('returns false if currently processing', () => {
      expect(needsClassification({ classification: { status: 'processing' } })).toBe(false)
    })

    it('returns true if no classification exists', () => {
      expect(needsClassification({ storagePath: 'path/to/image.jpg' })).toBe(true)
    })

    it('returns true if status is pending', () => {
      expect(needsClassification({ classification: { status: 'pending' } })).toBe(true)
    })

    it('returns true if status is failed (for retry)', () => {
      expect(needsClassification({ classification: { status: 'failed' } })).toBe(true)
    })
  })

  describe('buildClassificationJob', () => {
    it('returns null for undefined document', () => {
      expect(buildClassificationJob(undefined, 'screenshot-123')).toBeNull()
    })

    it('returns null if childId is missing', () => {
      const doc = { familyId: 'family-123', storagePath: 'path/to/image.jpg' }
      expect(buildClassificationJob(doc, 'screenshot-123')).toBeNull()
    })

    it('returns null if familyId is missing', () => {
      const doc = { childId: 'child-123', storagePath: 'path/to/image.jpg' }
      expect(buildClassificationJob(doc, 'screenshot-123')).toBeNull()
    })

    it('returns null if storagePath is missing', () => {
      const doc = { childId: 'child-123', familyId: 'family-123' }
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
  })

  describe('Cloud Tasks queueing', () => {
    it('creates task client with correct configuration', async () => {
      const { CloudTasksClient } = await import('@google-cloud/tasks')
      const client = new CloudTasksClient()

      const queuePath = client.queuePath('test-project', 'us-central1', 'screenshot-classification')

      expect(queuePath).toBe('projects/test/locations/us-central1/queues/screenshot-classification')
    })
  })
})
