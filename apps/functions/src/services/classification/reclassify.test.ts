/**
 * Re-classification Tests
 *
 * Story 20.5: Classification Metadata Storage - AC5
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  markForReclassification,
  findScreenshotsByModelVersion,
  findScreenshotsByTaxonomyVersion,
  batchMarkForReclassification,
} from './reclassify'

// Mock firebase-admin/firestore
const mockUpdate = vi.fn()
const mockWhere = vi.fn()
const mockLimit = vi.fn()
const mockGet = vi.fn()
const mockCollection = vi.fn()
const mockDoc = vi.fn()
const mockCollectionGroup = vi.fn()
const mockBatch = vi.fn()
const mockBatchUpdate = vi.fn()
const mockBatchCommit = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
    collectionGroup: mockCollectionGroup,
    batch: mockBatch,
  }),
}))

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}))

describe('reclassify', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock chain for document operations
    mockCollection.mockReturnValue({ doc: mockDoc })
    mockDoc.mockReturnValue({
      collection: mockCollection,
      update: mockUpdate,
    })

    // Setup mock chain for query operations
    mockCollectionGroup.mockReturnValue({ where: mockWhere })
    mockWhere.mockReturnValue({ where: mockWhere, limit: mockLimit })
    mockLimit.mockReturnValue({ get: mockGet })

    // Setup mock batch
    mockBatch.mockReturnValue({
      update: mockBatchUpdate,
      commit: mockBatchCommit,
    })
  })

  describe('markForReclassification', () => {
    it('marks screenshot for re-classification', async () => {
      mockUpdate.mockResolvedValue({})

      const result = await markForReclassification('child-123', 'screenshot-456')

      expect(result).toBe(true)
      expect(mockCollection).toHaveBeenCalledWith('children')
      expect(mockDoc).toHaveBeenCalledWith('child-123')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          'classification.status': 'pending',
        })
      )
    })

    it('sets markedForReclassAt timestamp', async () => {
      mockUpdate.mockResolvedValue({})
      const beforeCall = Date.now()

      await markForReclassification('child-123', 'screenshot-456')

      const afterCall = Date.now()
      const calledWith = mockUpdate.mock.calls[0][0]
      expect(calledWith['classification.markedForReclassAt']).toBeGreaterThanOrEqual(beforeCall)
      expect(calledWith['classification.markedForReclassAt']).toBeLessThanOrEqual(afterCall)
    })

    it('returns false on error', async () => {
      mockUpdate.mockRejectedValue(new Error('Firestore error'))

      const result = await markForReclassification('child-123', 'screenshot-456')

      expect(result).toBe(false)
    })
  })

  describe('findScreenshotsByModelVersion', () => {
    it('queries screenshots by model version', async () => {
      const mockSnapshot = { docs: [], empty: true }
      mockGet.mockResolvedValue(mockSnapshot)

      await findScreenshotsByModelVersion('gemini-1.5-flash')

      expect(mockCollectionGroup).toHaveBeenCalledWith('screenshots')
      expect(mockWhere).toHaveBeenCalledWith(
        'classification.modelVersion',
        '==',
        'gemini-1.5-flash'
      )
      expect(mockWhere).toHaveBeenCalledWith('classification.status', '==', 'completed')
    })

    it('applies limit', async () => {
      const mockSnapshot = { docs: [], empty: true }
      mockGet.mockResolvedValue(mockSnapshot)

      await findScreenshotsByModelVersion('gemini-1.5-flash', 50)

      expect(mockLimit).toHaveBeenCalledWith(50)
    })

    it('uses default limit of 100', async () => {
      const mockSnapshot = { docs: [], empty: true }
      mockGet.mockResolvedValue(mockSnapshot)

      await findScreenshotsByModelVersion('gemini-1.5-flash')

      expect(mockLimit).toHaveBeenCalledWith(100)
    })
  })

  describe('findScreenshotsByTaxonomyVersion', () => {
    it('queries screenshots by taxonomy version', async () => {
      const mockSnapshot = { docs: [], empty: true }
      mockGet.mockResolvedValue(mockSnapshot)

      await findScreenshotsByTaxonomyVersion('1.0.0')

      expect(mockCollectionGroup).toHaveBeenCalledWith('screenshots')
      expect(mockWhere).toHaveBeenCalledWith('classification.taxonomyVersion', '==', '1.0.0')
      expect(mockWhere).toHaveBeenCalledWith('classification.status', '==', 'completed')
    })

    it('applies limit', async () => {
      const mockSnapshot = { docs: [], empty: true }
      mockGet.mockResolvedValue(mockSnapshot)

      await findScreenshotsByTaxonomyVersion('1.0.0', 25)

      expect(mockLimit).toHaveBeenCalledWith(25)
    })
  })

  describe('batchMarkForReclassification', () => {
    it('returns 0 for empty array', async () => {
      const result = await batchMarkForReclassification([])

      expect(result).toBe(0)
      expect(mockBatch).not.toHaveBeenCalled()
    })

    it('batch marks multiple screenshots', async () => {
      mockBatchCommit.mockResolvedValue({})

      const screenshots = [
        { childId: 'child-1', screenshotId: 'ss-1' },
        { childId: 'child-2', screenshotId: 'ss-2' },
      ]

      const result = await batchMarkForReclassification(screenshots)

      expect(result).toBe(2)
      expect(mockBatchUpdate).toHaveBeenCalledTimes(2)
      expect(mockBatchCommit).toHaveBeenCalled()
    })

    it('returns 0 on batch error', async () => {
      mockBatchCommit.mockRejectedValue(new Error('Batch error'))

      const screenshots = [{ childId: 'child-1', screenshotId: 'ss-1' }]

      const result = await batchMarkForReclassification(screenshots)

      expect(result).toBe(0)
    })
  })
})
