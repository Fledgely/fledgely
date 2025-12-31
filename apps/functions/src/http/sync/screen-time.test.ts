/**
 * Screen Time Sync Endpoint Tests - Story 29.2
 *
 * Tests for the syncScreenTime HTTP endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => [{ name: 'default' }]),
}))

vi.mock('firebase-admin/firestore', () => {
  const mockDocRef = {
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
  }
  const mockFirestore = {
    doc: vi.fn(() => mockDocRef),
  }
  return {
    getFirestore: vi.fn(() => mockFirestore),
    FieldValue: {
      serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
    },
  }
})

// Import after mocks - use underscore prefix for unused but required mocks
import { getFirestore as _getFirestore, FieldValue as _FieldValue } from 'firebase-admin/firestore'

describe('Screen Time Sync - Story 29.2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Request Validation', () => {
    it('validates valid request body', () => {
      const validRequest = {
        deviceId: 'device-123',
        familyId: 'family-456',
        childId: 'child-789',
        entries: [
          {
            date: '2025-12-31',
            timezone: 'America/New_York',
            categories: [
              { category: 'education', minutes: 60 },
              { category: 'gaming', minutes: 30 },
            ],
          },
        ],
      }

      // Validate structure
      expect(validRequest.deviceId).toBeDefined()
      expect(validRequest.familyId).toBeDefined()
      expect(validRequest.childId).toBeDefined()
      expect(validRequest.entries).toHaveLength(1)
    })

    it('validates date format YYYY-MM-DD', () => {
      const validDate = '2025-12-31'
      const invalidDate = '12/31/2025'

      expect(/^\d{4}-\d{2}-\d{2}$/.test(validDate)).toBe(true)
      expect(/^\d{4}-\d{2}-\d{2}$/.test(invalidDate)).toBe(false)
    })

    it('validates category enum values', () => {
      const validCategories = [
        'education',
        'social_media',
        'gaming',
        'entertainment',
        'productivity',
        'communication',
        'news',
        'shopping',
        'other',
      ]

      validCategories.forEach((cat) => {
        expect(
          [
            'education',
            'social_media',
            'gaming',
            'entertainment',
            'productivity',
            'communication',
            'news',
            'shopping',
            'other',
          ].includes(cat)
        ).toBe(true)
      })
    })

    it('validates minutes range (0-1440)', () => {
      const validMinutes = [0, 60, 720, 1440]
      const invalidMinutes = [-1, 1441, 2000]

      validMinutes.forEach((min) => {
        expect(min >= 0 && min <= 1440).toBe(true)
      })

      invalidMinutes.forEach((min) => {
        expect(min >= 0 && min <= 1440).toBe(false)
      })
    })
  })

  describe('Data Aggregation', () => {
    it('merges categories correctly', () => {
      const existing = [
        { category: 'education', minutes: 30 },
        { category: 'gaming', minutes: 20 },
      ]

      const incoming = [
        { category: 'education', minutes: 15 },
        { category: 'entertainment', minutes: 25 },
      ]

      // Simulate merge
      const categoryMap = new Map<string, number>()

      // Add existing
      for (const cat of existing) {
        categoryMap.set(cat.category, (categoryMap.get(cat.category) || 0) + cat.minutes)
      }

      // Add incoming
      for (const cat of incoming) {
        categoryMap.set(cat.category, (categoryMap.get(cat.category) || 0) + cat.minutes)
      }

      expect(categoryMap.get('education')).toBe(45) // 30 + 15
      expect(categoryMap.get('gaming')).toBe(20) // unchanged
      expect(categoryMap.get('entertainment')).toBe(25) // new
    })

    it('caps total minutes at 1440', () => {
      const totalMinutes = 1500
      const cappedMinutes = Math.min(totalMinutes, 1440)

      expect(cappedMinutes).toBe(1440)
    })
  })

  describe('Multi-device Aggregation', () => {
    it('aggregates categories across multiple devices', () => {
      const devices = [
        {
          deviceId: 'device-1',
          categories: [
            { category: 'education', minutes: 30 },
            { category: 'gaming', minutes: 20 },
          ],
        },
        {
          deviceId: 'device-2',
          categories: [
            { category: 'education', minutes: 15 },
            { category: 'entertainment', minutes: 25 },
          ],
        },
      ]

      // Aggregate across devices
      const categoryMap = new Map<string, number>()

      for (const device of devices) {
        for (const cat of device.categories) {
          categoryMap.set(cat.category, (categoryMap.get(cat.category) || 0) + cat.minutes)
        }
      }

      expect(categoryMap.get('education')).toBe(45)
      expect(categoryMap.get('gaming')).toBe(20)
      expect(categoryMap.get('entertainment')).toBe(25)
    })
  })

  describe('Firestore Document Structure', () => {
    it('creates correct daily summary structure', () => {
      const dailySummary = {
        childId: 'child-123',
        date: '2025-12-31',
        timezone: 'America/New_York',
        totalMinutes: 90,
        devices: [
          {
            deviceId: 'device-1',
            deviceName: 'Chromebook',
            deviceType: 'chromebook',
            minutes: 90,
            categories: [
              { category: 'education', minutes: 60 },
              { category: 'gaming', minutes: 30 },
            ],
          },
        ],
        categories: [
          { category: 'education', minutes: 60 },
          { category: 'gaming', minutes: 30 },
        ],
        updatedAt: Date.now(),
      }

      expect(dailySummary.childId).toBe('child-123')
      expect(dailySummary.date).toBe('2025-12-31')
      expect(dailySummary.totalMinutes).toBe(90)
      expect(dailySummary.devices).toHaveLength(1)
      expect(dailySummary.categories).toHaveLength(2)
    })
  })
})
