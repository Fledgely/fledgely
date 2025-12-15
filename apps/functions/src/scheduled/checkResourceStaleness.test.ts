import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock firebase-admin/firestore
const mockAdd = vi.fn().mockResolvedValue({ id: 'audit-id' })
const mockCollection = vi.fn().mockImplementation(() => ({
  add: mockAdd,
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
  Timestamp: {
    now: vi.fn(() => ({
      toDate: () => new Date('2025-12-15T10:00:00Z'),
    })),
  },
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}))

// Mock firebase-functions/v2/scheduler
vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: vi.fn((options, handler) => handler),
}))

// Mock resourceService
const mockCheckStaleness = vi.fn()
vi.mock('../utils/resourceService', () => ({
  checkResourceStaleness: mockCheckStaleness,
}))

describe('checkResourceStaleness scheduled function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('staleness detection', () => {
    it('should log results when no stale resources', async () => {
      const { checkResourceStaleness } = await import('./checkResourceStaleness')

      mockCheckStaleness.mockResolvedValueOnce({
        staleResources: [],
        totalResources: 6,
      })

      await checkResourceStaleness({} as never)

      expect(mockCollection).toHaveBeenCalledWith('adminAuditLog')
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'resource-staleness-check',
          staleCount: 0,
          hasStaleResources: false,
        })
      )
    })

    it('should log warning when stale resources detected', async () => {
      const { checkResourceStaleness } = await import('./checkResourceStaleness')
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockCheckStaleness.mockResolvedValueOnce({
        staleResources: ['National DV Hotline', 'Crisis Text Line'],
        totalResources: 6,
      })

      await checkResourceStaleness({} as never)

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'resource-staleness-check',
          staleCount: 2,
          hasStaleResources: true,
          staleResourceNames: ['National DV Hotline', 'Crisis Text Line'],
        })
      )

      // Should output console warning for monitoring
      expect(consoleSpy).toHaveBeenCalledWith(
        'ALERT: Stale escape resources detected',
        expect.objectContaining({
          staleCount: 2,
        })
      )

      consoleSpy.mockRestore()
    })
  })

  describe('error handling', () => {
    it('should log error and rethrow for retry', async () => {
      const { checkResourceStaleness } = await import('./checkResourceStaleness')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockCheckStaleness.mockRejectedValueOnce(new Error('Firestore unavailable'))

      await expect(checkResourceStaleness({} as never)).rejects.toThrow('Firestore unavailable')

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'resource_staleness_check_error',
          error: 'Firestore unavailable',
        })
      )

      consoleSpy.mockRestore()
    })
  })
})
