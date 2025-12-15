import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore
const mockGet = vi.fn()
const mockAdd = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockWhere = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
    doc: mockDoc,
  }),
  FieldValue: {
    serverTimestamp: () => ({ _serverTimestamp: true }),
  },
  Timestamp: {
    now: () => ({
      toDate: () => new Date('2025-01-15T12:00:00Z'),
    }),
    fromDate: (date: Date) => ({
      toDate: () => date,
    }),
  },
}))

// Import after mocks
import {
  STEALTH_EXEMPT_NOTIFICATION_TYPES,
  STEALTH_SUPPRESSED_NOTIFICATION_TYPES,
  isNotificationExempt,
  generateIntegrityHash,
  chunkArray,
  FIRESTORE_BATCH_LIMIT,
} from './notificationStealth'

describe('notificationStealth utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockCollection.mockReturnValue({
      doc: mockDoc,
      add: mockAdd,
      where: mockWhere,
    })

    mockWhere.mockReturnValue({
      where: mockWhere,
      get: mockGet,
    })

    mockDoc.mockReturnValue({
      get: mockGet,
      collection: mockCollection,
    })
  })

  describe('STEALTH_EXEMPT_NOTIFICATION_TYPES', () => {
    it('should include crisis-resource-access', () => {
      expect(STEALTH_EXEMPT_NOTIFICATION_TYPES).toContain('crisis-resource-access')
    })

    it('should include mandatory-report', () => {
      expect(STEALTH_EXEMPT_NOTIFICATION_TYPES).toContain('mandatory-report')
    })

    it('should include legal-compliance', () => {
      expect(STEALTH_EXEMPT_NOTIFICATION_TYPES).toContain('legal-compliance')
    })

    it('should include account-security', () => {
      expect(STEALTH_EXEMPT_NOTIFICATION_TYPES).toContain('account-security')
    })

    it('should include child-safety-flag', () => {
      expect(STEALTH_EXEMPT_NOTIFICATION_TYPES).toContain('child-safety-flag')
    })

    it('should include law-enforcement-request', () => {
      expect(STEALTH_EXEMPT_NOTIFICATION_TYPES).toContain('law-enforcement-request')
    })
  })

  describe('STEALTH_SUPPRESSED_NOTIFICATION_TYPES', () => {
    it('should include device-unenrolled', () => {
      expect(STEALTH_SUPPRESSED_NOTIFICATION_TYPES).toContain('device-unenrolled')
    })

    it('should include member-removed', () => {
      expect(STEALTH_SUPPRESSED_NOTIFICATION_TYPES).toContain('member-removed')
    })

    it('should include location-rules-disabled', () => {
      expect(STEALTH_SUPPRESSED_NOTIFICATION_TYPES).toContain('location-rules-disabled')
    })

    it('should include device-location-disabled', () => {
      expect(STEALTH_SUPPRESSED_NOTIFICATION_TYPES).toContain('device-location-disabled')
    })

    it('should NOT include any exempt types', () => {
      for (const exemptType of STEALTH_EXEMPT_NOTIFICATION_TYPES) {
        expect(STEALTH_SUPPRESSED_NOTIFICATION_TYPES).not.toContain(exemptType)
      }
    })
  })

  describe('isNotificationExempt', () => {
    it('should return true for crisis-resource-access', () => {
      expect(isNotificationExempt('crisis-resource-access')).toBe(true)
    })

    it('should return true for mandatory-report', () => {
      expect(isNotificationExempt('mandatory-report')).toBe(true)
    })

    it('should return true for legal-compliance', () => {
      expect(isNotificationExempt('legal-compliance')).toBe(true)
    })

    it('should return true for account-security', () => {
      expect(isNotificationExempt('account-security')).toBe(true)
    })

    it('should return true for child-safety-flag', () => {
      expect(isNotificationExempt('child-safety-flag')).toBe(true)
    })

    it('should return true for law-enforcement-request', () => {
      expect(isNotificationExempt('law-enforcement-request')).toBe(true)
    })

    it('should return false for device-unenrolled', () => {
      expect(isNotificationExempt('device-unenrolled')).toBe(false)
    })

    it('should return false for member-removed', () => {
      expect(isNotificationExempt('member-removed')).toBe(false)
    })

    it('should return false for location-rules-disabled', () => {
      expect(isNotificationExempt('location-rules-disabled')).toBe(false)
    })

    it('should return false for unknown notification type', () => {
      expect(isNotificationExempt('random-notification-type')).toBe(false)
    })
  })

  describe('generateIntegrityHash', () => {
    it('should generate a consistent hash for same data', () => {
      const data = {
        action: 'test-action',
        resourceType: 'test-resource',
        timestamp: '2025-01-15T12:00:00Z',
      }

      const hash1 = generateIntegrityHash(data)
      const hash2 = generateIntegrityHash(data)

      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different data', () => {
      const data1 = { action: 'action1', timestamp: '2025-01-15T12:00:00Z' }
      const data2 = { action: 'action2', timestamp: '2025-01-15T12:00:00Z' }

      const hash1 = generateIntegrityHash(data1)
      const hash2 = generateIntegrityHash(data2)

      expect(hash1).not.toBe(hash2)
    })

    it('should produce hash regardless of key order', () => {
      const data1 = { a: 1, b: 2, c: 3 }
      const data2 = { c: 3, a: 1, b: 2 }

      const hash1 = generateIntegrityHash(data1)
      const hash2 = generateIntegrityHash(data2)

      expect(hash1).toBe(hash2)
    })

    it('should return a 64-character hex string (SHA-256)', () => {
      const data = { test: 'data' }
      const hash = generateIntegrityHash(data)

      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[0-9a-f]+$/)
    })
  })

  describe('chunkArray', () => {
    it('should chunk array into smaller arrays', () => {
      const array = [1, 2, 3, 4, 5, 6, 7]
      const chunks = chunkArray(array, 3)

      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]])
    })

    it('should return single chunk for small array', () => {
      const array = [1, 2, 3]
      const chunks = chunkArray(array, 5)

      expect(chunks).toEqual([[1, 2, 3]])
    })

    it('should return empty array for empty input', () => {
      const array: number[] = []
      const chunks = chunkArray(array, 5)

      expect(chunks).toEqual([])
    })

    it('should handle exact chunk size', () => {
      const array = [1, 2, 3, 4]
      const chunks = chunkArray(array, 2)

      expect(chunks).toEqual([[1, 2], [3, 4]])
    })

    it('should handle chunk size of 1', () => {
      const array = [1, 2, 3]
      const chunks = chunkArray(array, 1)

      expect(chunks).toEqual([[1], [2], [3]])
    })
  })

  describe('FIRESTORE_BATCH_LIMIT', () => {
    it('should be 500', () => {
      expect(FIRESTORE_BATCH_LIMIT).toBe(500)
    })
  })
})

describe('Notification Interception Logic', () => {
  // Note: These tests would require more complex mocking of the
  // getActiveStealthQueue and shouldInterceptNotification functions
  // For now, we test the pure utility functions above

  describe('Exemption handling', () => {
    it('should never suppress crisis resource notifications', () => {
      // This is enforced by isNotificationExempt returning true
      expect(isNotificationExempt('crisis-resource-access')).toBe(true)
    })

    it('should never suppress mandatory report notifications', () => {
      expect(isNotificationExempt('mandatory-report')).toBe(true)
    })

    it('should never suppress child safety flag notifications', () => {
      expect(isNotificationExempt('child-safety-flag')).toBe(true)
    })
  })

  describe('Suppression handling', () => {
    it('should suppress device unenrollment notifications', () => {
      expect(isNotificationExempt('device-unenrolled')).toBe(false)
      expect(STEALTH_SUPPRESSED_NOTIFICATION_TYPES).toContain('device-unenrolled')
    })

    it('should suppress location disable notifications', () => {
      expect(isNotificationExempt('location-rules-disabled')).toBe(false)
      expect(STEALTH_SUPPRESSED_NOTIFICATION_TYPES).toContain('location-rules-disabled')
    })

    it('should suppress member removal notifications', () => {
      expect(isNotificationExempt('member-removed')).toBe(false)
      expect(STEALTH_SUPPRESSED_NOTIFICATION_TYPES).toContain('member-removed')
    })
  })
})
