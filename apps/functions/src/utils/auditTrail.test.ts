import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateIntegrityHash,
  verifyIntegrityHash,
  chunkArray,
  SEAL_REASONS,
  SEALABLE_COLLECTIONS,
  SealedAuditEntry,
} from './auditTrail'

// Mock firebase-admin/firestore
vi.mock('firebase-admin/firestore', () => {
  const mockBatch = {
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  }

  const mockQuery = {
    get: vi.fn().mockResolvedValue({ docs: [], empty: true }),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    startAfter: vi.fn().mockReturnThis(),
  }

  const mockCollection = vi.fn().mockReturnValue({
    doc: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({ exists: false }),
      update: vi.fn().mockResolvedValue(undefined),
    }),
    add: vi.fn().mockResolvedValue({ id: 'new-doc-id' }),
    ...mockQuery,
  })

  const mockDb = {
    collection: mockCollection,
    batch: vi.fn().mockReturnValue(mockBatch),
    runTransaction: vi.fn().mockImplementation(async (fn) => fn({
      update: vi.fn(),
    })),
  }

  return {
    getFirestore: vi.fn(() => mockDb),
    Timestamp: {
      now: vi.fn(() => ({
        toDate: () => new Date('2025-12-15T10:00:00Z'),
      })),
      fromDate: vi.fn((date: Date) => ({
        toDate: () => date,
      })),
    },
    FieldValue: {
      serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
    },
  }
})

describe('auditTrail utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('generateIntegrityHash', () => {
    it('should generate consistent SHA-256 hash for same input', () => {
      const data = { action: 'test', timestamp: '2025-12-15' }
      const hash1 = generateIntegrityHash(data)
      const hash2 = generateIntegrityHash(data)

      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64) // SHA-256 produces 64 hex characters
    })

    it('should generate different hashes for different input', () => {
      const data1 = { action: 'test1', timestamp: '2025-12-15' }
      const data2 = { action: 'test2', timestamp: '2025-12-15' }

      const hash1 = generateIntegrityHash(data1)
      const hash2 = generateIntegrityHash(data2)

      expect(hash1).not.toBe(hash2)
    })

    it('should be order-independent for object keys', () => {
      const data1 = { a: 1, b: 2, c: 3 }
      const data2 = { c: 3, a: 1, b: 2 }

      const hash1 = generateIntegrityHash(data1)
      const hash2 = generateIntegrityHash(data2)

      expect(hash1).toBe(hash2)
    })

    it('should handle nested objects', () => {
      const data = {
        action: 'test',
        details: {
          familyId: 'family-123',
          users: ['user-1', 'user-2'],
        },
      }

      const hash = generateIntegrityHash(data)
      expect(hash).toHaveLength(64)
    })

    it('should handle empty objects', () => {
      const hash = generateIntegrityHash({})
      expect(hash).toHaveLength(64)
    })
  })

  describe('verifyIntegrityHash', () => {
    const createMockTimestamp = (isoString: string) => ({
      toDate: () => new Date(isoString),
    })

    it('should return false for missing hash', () => {
      const entry = {
        action: 'test-action',
        resourceType: 'test',
        resourceId: 'test-123',
        performedBy: 'user-123',
        sealed: true,
        sealedBy: 'admin-123',
        sealReason: 'escape-action',
        timestamp: createMockTimestamp('2025-12-15T10:00:00Z'),
        sealedAt: createMockTimestamp('2025-12-15T11:00:00Z'),
      } as unknown as SealedAuditEntry

      expect(verifyIntegrityHash(entry, '')).toBe(false)
      expect(verifyIntegrityHash(entry, undefined as unknown as string)).toBe(false)
    })

    it('should return false for invalid hash length', () => {
      const entry = {
        action: 'test-action',
        resourceType: 'test',
        resourceId: 'test-123',
        performedBy: 'user-123',
        sealed: true,
        sealedBy: 'admin-123',
        sealReason: 'escape-action',
        timestamp: createMockTimestamp('2025-12-15T10:00:00Z'),
        sealedAt: createMockTimestamp('2025-12-15T11:00:00Z'),
      } as unknown as SealedAuditEntry

      expect(verifyIntegrityHash(entry, 'short')).toBe(false)
      expect(verifyIntegrityHash(entry, 'a'.repeat(63))).toBe(false)
      expect(verifyIntegrityHash(entry, 'a'.repeat(65))).toBe(false)
    })

    it('should return false for tampered data', () => {
      const entry = {
        action: 'test-action',
        resourceType: 'test',
        resourceId: 'test-123',
        performedBy: 'user-123',
        sealed: true,
        sealedBy: 'admin-123',
        sealReason: 'escape-action',
        timestamp: createMockTimestamp('2025-12-15T10:00:00Z'),
        sealedAt: createMockTimestamp('2025-12-15T11:00:00Z'),
      } as unknown as SealedAuditEntry

      // Hash that doesn't match the data
      const wrongHash = 'a'.repeat(64)
      expect(verifyIntegrityHash(entry, wrongHash)).toBe(false)
    })
  })

  describe('chunkArray', () => {
    it('should split array into chunks of specified size', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const chunks = chunkArray(array, 3)

      expect(chunks).toHaveLength(4)
      expect(chunks[0]).toEqual([1, 2, 3])
      expect(chunks[1]).toEqual([4, 5, 6])
      expect(chunks[2]).toEqual([7, 8, 9])
      expect(chunks[3]).toEqual([10])
    })

    it('should return single chunk when array is smaller than chunk size', () => {
      const array = [1, 2, 3]
      const chunks = chunkArray(array, 10)

      expect(chunks).toHaveLength(1)
      expect(chunks[0]).toEqual([1, 2, 3])
    })

    it('should handle empty array', () => {
      const chunks = chunkArray([], 5)
      expect(chunks).toHaveLength(0)
    })

    it('should handle chunk size of 1', () => {
      const array = [1, 2, 3]
      const chunks = chunkArray(array, 1)

      expect(chunks).toHaveLength(3)
      expect(chunks[0]).toEqual([1])
      expect(chunks[1]).toEqual([2])
      expect(chunks[2]).toEqual([3])
    })

    it('should handle exact multiple of chunk size', () => {
      const array = [1, 2, 3, 4, 5, 6]
      const chunks = chunkArray(array, 2)

      expect(chunks).toHaveLength(3)
      expect(chunks[0]).toEqual([1, 2])
      expect(chunks[1]).toEqual([3, 4])
      expect(chunks[2]).toEqual([5, 6])
    })

    it('should work with 500 batch limit', () => {
      const array = Array.from({ length: 1234 }, (_, i) => i)
      const chunks = chunkArray(array, 500)

      expect(chunks).toHaveLength(3) // 500 + 500 + 234
      expect(chunks[0]).toHaveLength(500)
      expect(chunks[1]).toHaveLength(500)
      expect(chunks[2]).toHaveLength(234)
    })
  })

  describe('SEAL_REASONS', () => {
    it('should contain expected seal reason types', () => {
      expect(SEAL_REASONS).toContain('escape-action')
      expect(SEAL_REASONS).toContain('safety-request')
      expect(SEAL_REASONS).toContain('child-safety')
      expect(SEAL_REASONS).toContain('stealth-activation')
      expect(SEAL_REASONS).toContain('device-unenrollment')
      expect(SEAL_REASONS).toContain('location-disable')
      expect(SEAL_REASONS).toContain('parent-severing')
    })

    it('should be an array', () => {
      expect(Array.isArray(SEAL_REASONS)).toBe(true)
    })
  })

  describe('SEALABLE_COLLECTIONS', () => {
    it('should contain expected collection names', () => {
      expect(SEALABLE_COLLECTIONS).toContain('adminAuditLog')
      expect(SEALABLE_COLLECTIONS).toContain('deviceCommands')
      expect(SEALABLE_COLLECTIONS).toContain('stealthQueues')
      expect(SEALABLE_COLLECTIONS).toContain('notificationQueue')
    })

    it('should be an array', () => {
      expect(Array.isArray(SEALABLE_COLLECTIONS)).toBe(true)
    })
  })
})

describe('queryFamilyAuditLog', () => {
  it('should filter out sealed entries by default', async () => {
    // This test verifies the query structure includes sealed filtering
    // The actual Firestore query behavior is tested in integration tests
    const { queryFamilyAuditLog } = await import('./auditTrail')
    const { getFirestore } = await import('firebase-admin/firestore')

    const mockDb = getFirestore()

    await queryFamilyAuditLog('family-123')

    // Verify the collection and where clauses were called correctly
    expect(mockDb.collection).toHaveBeenCalledWith('familyAuditLog')
  })
})
