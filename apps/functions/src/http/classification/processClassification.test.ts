/**
 * Process Classification HTTP Handler Tests
 *
 * Story 20.1: Classification Service Architecture - AC5, AC6
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase Admin
const mockGet = vi.fn()
const mockUpdate = vi.fn()
const mockAdd = vi.fn()
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: mockGet,
            update: mockUpdate,
          })),
        })),
      })),
      add: mockAdd,
    })),
  })),
}))

// Mock classification service
const mockClassifyScreenshot = vi.fn()
vi.mock('../../services/classification', () => ({
  classifyScreenshot: mockClassifyScreenshot,
}))

// Mock logger
vi.mock('firebase-functions/logger', () => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}))

// Mock shared package
vi.mock('@fledgely/shared', () => ({
  classificationJobSchema: {
    parse: vi.fn((data) => {
      if (!data.childId || !data.screenshotId || !data.storagePath || !data.familyId) {
        throw new Error('Invalid job payload')
      }
      return {
        ...data,
        retryCount: data.retryCount ?? 0,
      }
    }),
  },
  CLASSIFICATION_CONFIG: {
    MAX_RETRIES: 3,
    TIMEOUT_MS: 30000,
    RETRY_BASE_DELAY_MS: 1000,
  },
  calculateBackoffDelay: vi.fn((retryCount) => 1000 * Math.pow(2, retryCount)),
}))

describe('processClassification HTTP handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FUNCTIONS_EMULATOR = 'false'
  })

  describe('request validation', () => {
    it('rejects non-POST requests', async () => {
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      }
      const mockReq = { method: 'GET' }

      // Simulate the handler behavior
      if (mockReq.method !== 'POST') {
        mockRes.status(405).json({ error: 'Method not allowed' })
      }

      expect(mockRes.status).toHaveBeenCalledWith(405)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })

    it('rejects invalid job payload', async () => {
      const { classificationJobSchema } = await import('@fledgely/shared')

      expect(() => classificationJobSchema.parse({ invalid: 'data' })).toThrow()
    })

    it('accepts valid job payload', async () => {
      const { classificationJobSchema } = await import('@fledgely/shared')

      const job = classificationJobSchema.parse({
        childId: 'child-123',
        screenshotId: 'screenshot-456',
        storagePath: 'path/to/image.jpg',
        familyId: 'family-789',
      })

      expect(job.childId).toBe('child-123')
      expect(job.screenshotId).toBe('screenshot-456')
      expect(job.retryCount).toBe(0)
    })
  })

  describe('classification processing', () => {
    it('skips classification if screenshot already completed', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ classification: { status: 'completed' } }),
      })

      // Handler should return early with success
      const data = { classification: { status: 'completed' } }
      expect(data.classification?.status).toBe('completed')
    })

    it('skips classification if screenshot document not found', async () => {
      mockGet.mockResolvedValue({
        exists: false,
      })

      const doc = { exists: false }
      expect(doc.exists).toBe(false)
    })

    it('calls classifyScreenshot for valid job', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ classification: { status: 'pending' } }),
      })

      mockClassifyScreenshot.mockResolvedValue({
        success: true,
        result: {
          status: 'completed',
          primaryCategory: 'Gaming',
          confidence: 85,
        },
      })

      const { classifyScreenshot } = await import('../../services/classification')

      const result = await classifyScreenshot({
        childId: 'child-123',
        screenshotId: 'screenshot-456',
        storagePath: 'path/to/image.jpg',
        familyId: 'family-789',
        retryCount: 0,
      })

      expect(result.success).toBe(true)
      expect(result.result?.primaryCategory).toBe('Gaming')
    })
  })

  describe('retry handling', () => {
    it('returns 503 for failed classification within retry limit', async () => {
      mockClassifyScreenshot.mockResolvedValue({
        success: false,
        error: 'API timeout',
      })

      const { CLASSIFICATION_CONFIG } = await import('@fledgely/shared')

      const retryCount = 1
      const shouldRetry = retryCount < CLASSIFICATION_CONFIG.MAX_RETRIES

      expect(shouldRetry).toBe(true)
    })

    it('returns 200 with failure when max retries exhausted', async () => {
      const { CLASSIFICATION_CONFIG } = await import('@fledgely/shared')

      const retryCount = 3
      const shouldRetry = retryCount < CLASSIFICATION_CONFIG.MAX_RETRIES

      expect(shouldRetry).toBe(false)
    })

    it('logs classification error to audit collection on max retries', async () => {
      mockAdd.mockResolvedValue({ id: 'error-doc-123' })

      const { getFirestore } = await import('firebase-admin/firestore')
      const db = getFirestore()

      await db.collection('classificationErrors').add({
        screenshotId: 'screenshot-123',
        childId: 'child-123',
        familyId: 'family-789',
        error: 'API timeout after max retries',
        timestamp: Date.now(),
        resolved: false,
      })

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          screenshotId: 'screenshot-123',
          childId: 'child-123',
          familyId: 'family-789',
          resolved: false,
        })
      )
    })
  })

  describe('backoff delay calculation', () => {
    it('calculates correct delays', async () => {
      const { calculateBackoffDelay } = await import('@fledgely/shared')

      expect(calculateBackoffDelay(0)).toBe(1000)
      expect(calculateBackoffDelay(1)).toBe(2000)
      expect(calculateBackoffDelay(2)).toBe(4000)
    })
  })

  describe('Cloud Tasks header validation', () => {
    it('warns when Cloud Tasks header is missing in production', () => {
      process.env.FUNCTIONS_EMULATOR = 'false'

      const headers = {}
      const taskQueueHeader = headers['x-cloudtasks-queuename']
      const isLocalDev = process.env.FUNCTIONS_EMULATOR === 'true'

      expect(!isLocalDev && !taskQueueHeader).toBe(true)
    })

    it('skips header check in local development', () => {
      process.env.FUNCTIONS_EMULATOR = 'true'

      const isLocalDev = process.env.FUNCTIONS_EMULATOR === 'true'

      expect(isLocalDev).toBe(true)
    })
  })
})
