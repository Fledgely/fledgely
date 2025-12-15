import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  DEFAULT_ESCAPE_RESOURCES,
  RESOURCE_TYPES,
  clearResourceCache,
} from './resourceService'

// Mock firebase-admin/firestore
const mockGet = vi.fn()
const mockWhere = vi.fn().mockReturnThis()
const mockOrderBy = vi.fn().mockReturnThis()
const mockCollection = vi.fn().mockImplementation(() => ({
  where: mockWhere,
  orderBy: mockOrderBy,
  get: mockGet,
}))

// Helper to create mock timestamps that support comparison
const createMockTimestamp = (date: Date) => {
  const seconds = Math.floor(date.getTime() / 1000)
  return {
    seconds,
    nanoseconds: 0,
    toDate: () => date,
    toMillis: () => date.getTime(),
    // Support valueOf for comparison operations
    valueOf: () => seconds,
  }
}

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
  Timestamp: {
    now: vi.fn(() => createMockTimestamp(new Date('2025-12-15T10:00:00Z'))),
    fromDate: vi.fn((date: Date) => createMockTimestamp(date)),
    fromMillis: vi.fn((ms: number) => createMockTimestamp(new Date(ms))),
  },
}))

describe('resourceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearResourceCache()
  })

  afterEach(() => {
    vi.clearAllMocks()
    clearResourceCache()
  })

  describe('DEFAULT_ESCAPE_RESOURCES', () => {
    it('should contain essential crisis hotlines', () => {
      const hotlines = DEFAULT_ESCAPE_RESOURCES.filter(r => r.type === 'hotline')
      expect(hotlines.length).toBeGreaterThan(0)

      const nationalDVHotline = hotlines.find(r =>
        r.name.includes('National Domestic Violence Hotline')
      )
      expect(nationalDVHotline).toBeDefined()
      expect(nationalDVHotline?.value).toBe('1-800-799-7233')
    })

    it('should contain text support option', () => {
      const textLines = DEFAULT_ESCAPE_RESOURCES.filter(r => r.type === 'text-line')
      expect(textLines.length).toBeGreaterThan(0)

      const crisisText = textLines.find(r => r.name.includes('Crisis Text Line'))
      expect(crisisText).toBeDefined()
      expect(crisisText?.value).toContain('741741')
    })

    it('should contain safety planning resources', () => {
      const websites = DEFAULT_ESCAPE_RESOURCES.filter(r =>
        r.type === 'website' || r.type === 'guide'
      )
      expect(websites.length).toBeGreaterThan(0)
    })

    it('should contain legal aid resources', () => {
      const legalAid = DEFAULT_ESCAPE_RESOURCES.filter(r => r.type === 'legal-aid')
      expect(legalAid.length).toBeGreaterThan(0)
    })

    it('should have all resources marked as active', () => {
      for (const resource of DEFAULT_ESCAPE_RESOURCES) {
        expect(resource.isActive).toBe(true)
      }
    })

    it('should have displayOrder for proper sorting', () => {
      for (const resource of DEFAULT_ESCAPE_RESOURCES) {
        expect(typeof resource.displayOrder).toBe('number')
        expect(resource.displayOrder).toBeGreaterThan(0)
      }
    })
  })

  describe('RESOURCE_TYPES', () => {
    it('should contain expected resource types', () => {
      expect(RESOURCE_TYPES).toContain('hotline')
      expect(RESOURCE_TYPES).toContain('text-line')
      expect(RESOURCE_TYPES).toContain('website')
      expect(RESOURCE_TYPES).toContain('guide')
      expect(RESOURCE_TYPES).toContain('legal-aid')
    })
  })

  describe('getActiveResources', () => {
    it('should return resources from Firestore when available', async () => {
      const { getActiveResources } = await import('./resourceService')

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'resource-1',
            data: () => ({
              name: 'Test Hotline',
              type: 'hotline',
              value: '1-800-TEST',
              description: 'Test description',
              displayOrder: 1,
              isActive: true,
            }),
          },
        ],
      })

      const resources = await getActiveResources()

      expect(mockCollection).toHaveBeenCalledWith('escapeResources')
      expect(mockWhere).toHaveBeenCalledWith('isActive', '==', true)
      expect(mockOrderBy).toHaveBeenCalledWith('displayOrder', 'asc')
      expect(resources).toHaveLength(1)
      expect(resources[0].name).toBe('Test Hotline')
    })

    it('should return default resources when Firestore collection is empty', async () => {
      const { getActiveResources } = await import('./resourceService')

      mockGet.mockResolvedValueOnce({
        empty: true,
        docs: [],
      })

      const resources = await getActiveResources()

      expect(resources.length).toBe(DEFAULT_ESCAPE_RESOURCES.length)
    })

    it('should return default resources when Firestore query fails', async () => {
      const { getActiveResources } = await import('./resourceService')

      mockGet.mockRejectedValueOnce(new Error('Firestore error'))

      const resources = await getActiveResources()

      expect(resources.length).toBe(DEFAULT_ESCAPE_RESOURCES.length)
    })

    it('should use cache on subsequent calls', async () => {
      const { getActiveResources } = await import('./resourceService')

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'resource-1',
            data: () => ({
              name: 'Test Hotline',
              type: 'hotline',
              value: '1-800-TEST',
              description: 'Test description',
              displayOrder: 1,
              isActive: true,
            }),
          },
        ],
      })

      // First call
      await getActiveResources()
      // Second call should use cache
      await getActiveResources()

      // Should only query Firestore once
      expect(mockGet).toHaveBeenCalledTimes(1)
    })
  })

  describe('getResourcesByType', () => {
    it('should group resources by type', async () => {
      const { getResourcesByType, clearResourceCache } = await import('./resourceService')
      clearResourceCache()

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'hotline-1',
            data: () => ({
              name: 'Test Hotline',
              type: 'hotline',
              value: '1-800-TEST',
              description: 'Test',
              displayOrder: 1,
              isActive: true,
            }),
          },
          {
            id: 'website-1',
            data: () => ({
              name: 'Test Website',
              type: 'website',
              value: 'https://test.com',
              description: 'Test',
              displayOrder: 2,
              isActive: true,
            }),
          },
        ],
      })

      const grouped = await getResourcesByType()

      expect(grouped.hotline).toHaveLength(1)
      expect(grouped.website).toHaveLength(1)
      expect(grouped['text-line']).toHaveLength(0)
    })
  })

  describe('checkResourceStaleness', () => {
    it('should identify resources not verified in 90+ days', async () => {
      const { checkResourceStaleness, clearResourceCache } = await import('./resourceService')
      clearResourceCache()

      const ninetyOneDaysAgo = new Date()
      ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 91)

      const freshDate = new Date()

      mockGet.mockResolvedValueOnce({
        empty: false,
        size: 2,
        docs: [
          {
            id: 'stale-resource',
            data: () => ({
              name: 'Stale Resource',
              isActive: true,
              verifiedAt: createMockTimestamp(ninetyOneDaysAgo),
            }),
          },
          {
            id: 'fresh-resource',
            data: () => ({
              name: 'Fresh Resource',
              isActive: true,
              verifiedAt: createMockTimestamp(freshDate),
            }),
          },
        ],
      })

      const result = await checkResourceStaleness()

      expect(result.totalResources).toBe(2)
      expect(result.staleResources).toContain('Stale Resource')
      expect(result.staleResources).not.toContain('Fresh Resource')
    })
  })

  describe('clearResourceCache', () => {
    it('should clear the cache and force fresh fetch', async () => {
      const { getActiveResources, clearResourceCache } = await import('./resourceService')

      mockGet.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'resource-1',
            data: () => ({
              name: 'Test',
              type: 'hotline',
              value: '1-800-TEST',
              description: 'Test',
              displayOrder: 1,
              isActive: true,
            }),
          },
        ],
      })

      // First call
      await getActiveResources()
      expect(mockGet).toHaveBeenCalledTimes(1)

      // Clear cache
      clearResourceCache()

      // Next call should query again
      await getActiveResources()
      expect(mockGet).toHaveBeenCalledTimes(2)
    })
  })
})
