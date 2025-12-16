import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { deleteChildData, DataDeletionError } from './dataDeletionService'

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDocs: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => ({ toDate: () => new Date() })),
  writeBatch: vi.fn(),
}))

// Mock Firebase Storage
vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  listAll: vi.fn(),
  deleteObject: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({
  db: {},
  storage: {},
}))

// Import mocked functions for test control
import { doc, getDocs, collection, writeBatch } from 'firebase/firestore'
import { ref, listAll, deleteObject } from 'firebase/storage'

describe('dataDeletionService', () => {
  const mockUserId = 'test-user-123'
  const mockFamilyId = 'test-family-456'
  const mockChildId = 'test-child-789'

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset console.error, warn, and debug to prevent test output noise
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'debug').mockImplementation(() => {})
  })

  describe('deleteChildData', () => {
    it('deletes all child data successfully when data exists', async () => {
      const mockBatch = {
        delete: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }

      // Mock storage screenshots
      const mockStorageItems = [{ name: 'screenshot1.png' }, { name: 'screenshot2.png' }]

      ;(ref as Mock).mockReturnValue({})
      ;(listAll as Mock).mockResolvedValue({ items: mockStorageItems })
      ;(deleteObject as Mock).mockResolvedValue(undefined)
      ;(collection as Mock).mockReturnValue({})
      ;(doc as Mock).mockReturnValue({ id: 'audit-123' })
      ;(writeBatch as Mock).mockReturnValue(mockBatch)

      // Mock empty Firestore collections (future-proofed)
      ;(getDocs as Mock).mockResolvedValue({ docs: [], forEach: () => {} })

      const result = await deleteChildData(mockChildId, mockFamilyId, mockUserId)

      expect(result.success).toBe(true)
      expect(result.childId).toBe(mockChildId)
      expect(result.familyId).toBe(mockFamilyId)
      expect(result.screenshotsDeleted).toBe(2)
      expect(deleteObject).toHaveBeenCalledTimes(2)
      expect(mockBatch.set).toHaveBeenCalledTimes(1) // Audit log
      expect(mockBatch.commit).toHaveBeenCalled()
    })

    it('handles case when no screenshots exist', async () => {
      const mockBatch = {
        delete: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }

      ;(ref as Mock).mockReturnValue({})
      ;(listAll as Mock).mockResolvedValue({ items: [] })
      ;(collection as Mock).mockReturnValue({})
      ;(doc as Mock).mockReturnValue({ id: 'audit-123' })
      ;(writeBatch as Mock).mockReturnValue(mockBatch)
      ;(getDocs as Mock).mockResolvedValue({ docs: [], forEach: () => {} })

      const result = await deleteChildData(mockChildId, mockFamilyId, mockUserId)

      expect(result.success).toBe(true)
      expect(result.screenshotsDeleted).toBe(0)
      expect(deleteObject).not.toHaveBeenCalled()
    })

    it('handles storage object-not-found error gracefully', async () => {
      const mockBatch = {
        delete: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }

      const storageError = new Error('Object not found')
      ;(storageError as { code?: string }).code = 'storage/object-not-found'

      ;(ref as Mock).mockReturnValue({})
      ;(listAll as Mock).mockRejectedValue(storageError)
      ;(collection as Mock).mockReturnValue({})
      ;(doc as Mock).mockReturnValue({ id: 'audit-123' })
      ;(writeBatch as Mock).mockReturnValue(mockBatch)
      ;(getDocs as Mock).mockResolvedValue({ docs: [], forEach: () => {} })

      const result = await deleteChildData(mockChildId, mockFamilyId, mockUserId)

      // Should complete successfully despite storage error
      expect(result.success).toBe(true)
      expect(result.screenshotsDeleted).toBe(0)
    })

    it('logs warning for non-object-not-found storage errors', async () => {
      const mockBatch = {
        delete: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }

      const storageError = new Error('Permission denied')
      ;(storageError as { code?: string }).code = 'storage/permission-denied'

      ;(ref as Mock).mockReturnValue({})
      ;(listAll as Mock).mockRejectedValue(storageError)
      ;(collection as Mock).mockReturnValue({})
      ;(doc as Mock).mockReturnValue({ id: 'audit-123' })
      ;(writeBatch as Mock).mockReturnValue(mockBatch)
      ;(getDocs as Mock).mockResolvedValue({ docs: [], forEach: () => {} })

      await deleteChildData(mockChildId, mockFamilyId, mockUserId)

      // Should log warning for non-object-not-found errors
      expect(console.warn).toHaveBeenCalled()
    })

    it('throws error when childId is empty', async () => {
      await expect(deleteChildData('', mockFamilyId, mockUserId)).rejects.toThrow()
    })

    it('throws error when familyId is empty', async () => {
      await expect(deleteChildData(mockChildId, '', mockUserId)).rejects.toThrow()
    })

    it('creates audit log entry with deletion counts', async () => {
      const mockBatch = {
        delete: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }

      ;(ref as Mock).mockReturnValue({})
      ;(listAll as Mock).mockResolvedValue({ items: [{ name: 'screenshot1.png' }] })
      ;(deleteObject as Mock).mockResolvedValue(undefined)
      ;(collection as Mock).mockReturnValue({})
      ;(doc as Mock).mockReturnValue({ id: 'audit-123' })
      ;(writeBatch as Mock).mockReturnValue(mockBatch)
      ;(getDocs as Mock).mockResolvedValue({ docs: [], forEach: () => {} })

      await deleteChildData(mockChildId, mockFamilyId, mockUserId)

      // Verify audit log was created with correct data
      expect(mockBatch.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'child_data_deleted',
          entityId: mockChildId,
          entityType: 'child',
          performedBy: mockUserId,
          metadata: expect.objectContaining({
            screenshotsDeleted: 1,
            activityLogsDeleted: 0,
            agreementsDeleted: 0,
            reason: 'child_removed',
          }),
        })
      )
    })

    it('handles batch commit failure', async () => {
      const mockBatch = {
        delete: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockRejectedValue(new Error('Batch commit failed')),
      }

      ;(ref as Mock).mockReturnValue({})
      ;(listAll as Mock).mockResolvedValue({ items: [] })
      ;(collection as Mock).mockReturnValue({})
      ;(doc as Mock).mockReturnValue({ id: 'audit-123' })
      ;(writeBatch as Mock).mockReturnValue(mockBatch)
      ;(getDocs as Mock).mockResolvedValue({ docs: [], forEach: () => {} })

      await expect(
        deleteChildData(mockChildId, mockFamilyId, mockUserId)
      ).rejects.toThrow('Something went wrong')
    })

    it('deletes activity logs when they exist (future-proofed)', async () => {
      const mockBatch = {
        delete: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }

      const mockActivityLogs = [
        { id: 'log-1', data: () => ({ childId: mockChildId }) },
        { id: 'log-2', data: () => ({ childId: mockChildId }) },
      ]

      ;(ref as Mock).mockReturnValue({})
      ;(listAll as Mock).mockResolvedValue({ items: [] })
      ;(collection as Mock).mockReturnValue({})
      ;(doc as Mock).mockReturnValue({ id: 'audit-123' })
      ;(writeBatch as Mock).mockReturnValue(mockBatch)

      // First call for screenshots metadata, second for activity logs, third for agreements
      ;(getDocs as Mock)
        .mockResolvedValueOnce({
          docs: [],
          forEach: vi.fn(),
        })
        .mockResolvedValueOnce({
          docs: mockActivityLogs,
          forEach: (callback: (doc: { id: string }) => void) => {
            mockActivityLogs.forEach(callback)
          },
        })
        .mockResolvedValueOnce({
          docs: [],
          forEach: vi.fn(),
        })

      const result = await deleteChildData(mockChildId, mockFamilyId, mockUserId)

      expect(result.activityLogsDeleted).toBe(2)
    })

    it('deletes agreements when they exist (future-proofed)', async () => {
      const mockBatch = {
        delete: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }

      const mockAgreements = [
        { id: 'agreement-1', data: () => ({ childId: mockChildId }) },
      ]

      ;(ref as Mock).mockReturnValue({})
      ;(listAll as Mock).mockResolvedValue({ items: [] })
      ;(collection as Mock).mockReturnValue({})
      ;(doc as Mock).mockReturnValue({ id: 'audit-123' })
      ;(writeBatch as Mock).mockReturnValue(mockBatch)

      // First call for screenshots metadata, second for activity logs, third for agreements
      ;(getDocs as Mock)
        .mockResolvedValueOnce({
          docs: [],
          forEach: vi.fn(),
        })
        .mockResolvedValueOnce({
          docs: [],
          forEach: vi.fn(),
        })
        .mockResolvedValueOnce({
          docs: mockAgreements,
          forEach: (callback: (doc: { id: string }) => void) => {
            mockAgreements.forEach(callback)
          },
        })

      const result = await deleteChildData(mockChildId, mockFamilyId, mockUserId)

      expect(result.agreementsDeleted).toBe(1)
    })
  })

  describe('DataDeletionError', () => {
    it('creates error with code and message', () => {
      const error = new DataDeletionError('test-code', 'Test message')

      expect(error.code).toBe('test-code')
      expect(error.message).toBe('Test message')
      expect(error.name).toBe('DataDeletionError')
    })
  })
})
