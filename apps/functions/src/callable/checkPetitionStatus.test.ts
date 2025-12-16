import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as admin from 'firebase-admin'

// Mock firebase-admin
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() })),
    fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
  },
}))

// Mock firebase-functions
vi.mock('firebase-functions/v2/https', () => ({
  onCall: vi.fn((options, handler) => handler),
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      public message: string,
      public details?: unknown
    ) {
      super(message)
      this.name = 'HttpsError'
    }
  },
}))

import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { checkPetitionStatus } from './checkPetitionStatus'

/**
 * checkPetitionStatus Function Tests
 *
 * Story 3.6: Legal Parent Petition for Access - Task 4
 *
 * Tests verify:
 * - Accepts reference number and email for verification
 * - Returns current status and support messages
 * - Does NOT reveal internal notes or support discussions
 * - Handles petition not found
 * - Handles email mismatch
 */

describe('checkPetitionStatus', () => {
  let mockDb: {
    collection: ReturnType<typeof vi.fn>
  }

  const validReferenceNumber = 'LP-20251215-A1B2C'
  const validEmail = 'jane.doe@example.com'

  const mockPetition = {
    id: 'petition-123',
    referenceNumber: validReferenceNumber,
    petitionerName: 'Jane Doe',
    petitionerEmail: validEmail,
    childName: 'Tommy Doe',
    childDOB: { toDate: () => new Date('2015-06-15') },
    claimedRelationship: 'parent',
    message: 'Test message',
    documents: [],
    status: 'reviewing',
    submittedAt: { toDate: () => new Date('2025-12-10') },
    updatedAt: { toDate: () => new Date('2025-12-12') },
    statusHistory: [
      {
        status: 'submitted',
        timestamp: { toDate: () => new Date('2025-12-10') },
        updatedBy: 'system',
      },
      {
        status: 'reviewing',
        timestamp: { toDate: () => new Date('2025-12-12') },
        updatedBy: 'support-agent-123',
        note: 'Documentation received, beginning review',
      },
    ],
    internalNotes: ['Internal note 1', 'Internal note 2'],
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-15T10:00:00Z'))

    mockDb = {
      collection: vi.fn(),
    }

    vi.mocked(getFirestore).mockReturnValue(mockDb as unknown as admin.firestore.Firestore)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // ============================================================================
  // Success Cases
  // ============================================================================

  describe('successful status check', () => {
    it('returns petition status with valid reference number and email', async () => {
      const mockQuerySnapshot = {
        empty: false,
        docs: [
          {
            data: () => mockPetition,
          },
        ],
      }

      const mockWhere = vi.fn().mockReturnThis()
      const mockGet = vi.fn().mockResolvedValue(mockQuerySnapshot)

      mockDb.collection.mockReturnValue({
        where: mockWhere,
        get: mockGet,
      })

      const request = {
        data: {
          referenceNumber: validReferenceNumber,
          petitionerEmail: validEmail,
        },
        auth: null,
      }

      const result = await checkPetitionStatus(request as any)

      expect(result.found).toBe(true)
      expect(result.status).toBe('reviewing')
      expect(result.statusLabel).toBe('Under Review')
    })

    it('returns submittedAt timestamp', async () => {
      const mockQuerySnapshot = {
        empty: false,
        docs: [
          {
            data: () => mockPetition,
          },
        ],
      }

      mockDb.collection.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockQuerySnapshot),
      })

      const request = {
        data: {
          referenceNumber: validReferenceNumber,
          petitionerEmail: validEmail,
        },
        auth: null,
      }

      const result = await checkPetitionStatus(request as any)

      expect(result.submittedAt).toBeDefined()
    })

    it('returns lastUpdatedAt timestamp', async () => {
      const mockQuerySnapshot = {
        empty: false,
        docs: [
          {
            data: () => mockPetition,
          },
        ],
      }

      mockDb.collection.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockQuerySnapshot),
      })

      const request = {
        data: {
          referenceNumber: validReferenceNumber,
          petitionerEmail: validEmail,
        },
        auth: null,
      }

      const result = await checkPetitionStatus(request as any)

      expect(result.lastUpdatedAt).toBeDefined()
    })

    it('returns support messages from status history notes', async () => {
      const mockQuerySnapshot = {
        empty: false,
        docs: [
          {
            data: () => mockPetition,
          },
        ],
      }

      mockDb.collection.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockQuerySnapshot),
      })

      const request = {
        data: {
          referenceNumber: validReferenceNumber,
          petitionerEmail: validEmail,
        },
        auth: null,
      }

      const result = await checkPetitionStatus(request as any)

      expect(result.supportMessages).toContain('Documentation received, beginning review')
    })
  })

  // ============================================================================
  // CRITICAL Security Tests - Internal Notes
  // ============================================================================

  describe('CRITICAL: internal notes never exposed', () => {
    it('does NOT return internal notes', async () => {
      const mockQuerySnapshot = {
        empty: false,
        docs: [
          {
            data: () => mockPetition,
          },
        ],
      }

      mockDb.collection.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockQuerySnapshot),
      })

      const request = {
        data: {
          referenceNumber: validReferenceNumber,
          petitionerEmail: validEmail,
        },
        auth: null,
      }

      const result = await checkPetitionStatus(request as any)

      // Internal notes should never be in the response
      expect(result).not.toHaveProperty('internalNotes')
      expect(JSON.stringify(result)).not.toContain('Internal note')
    })

    it('does NOT return support agent IDs', async () => {
      const mockQuerySnapshot = {
        empty: false,
        docs: [
          {
            data: () => mockPetition,
          },
        ],
      }

      mockDb.collection.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockQuerySnapshot),
      })

      const request = {
        data: {
          referenceNumber: validReferenceNumber,
          petitionerEmail: validEmail,
        },
        auth: null,
      }

      const result = await checkPetitionStatus(request as any)

      // Agent IDs should never be exposed
      expect(JSON.stringify(result)).not.toContain('support-agent-123')
      expect(result).not.toHaveProperty('assignedTo')
    })

    it('does NOT return target family ID', async () => {
      const petitionWithFamily = {
        ...mockPetition,
        targetFamilyId: 'family-456',
      }

      const mockQuerySnapshot = {
        empty: false,
        docs: [
          {
            data: () => petitionWithFamily,
          },
        ],
      }

      mockDb.collection.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockQuerySnapshot),
      })

      const request = {
        data: {
          referenceNumber: validReferenceNumber,
          petitionerEmail: validEmail,
        },
        auth: null,
      }

      const result = await checkPetitionStatus(request as any)

      // Family ID should never be exposed until access is granted
      expect(result).not.toHaveProperty('targetFamilyId')
      expect(JSON.stringify(result)).not.toContain('family-456')
    })
  })

  // ============================================================================
  // Not Found Cases
  // ============================================================================

  describe('petition not found', () => {
    it('returns found: false when petition does not exist', async () => {
      const mockQuerySnapshot = {
        empty: true,
        docs: [],
      }

      mockDb.collection.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockQuerySnapshot),
      })

      const request = {
        data: {
          referenceNumber: 'LP-20251215-XXXXX',
          petitionerEmail: validEmail,
        },
        auth: null,
      }

      const result = await checkPetitionStatus(request as any)

      expect(result.found).toBe(false)
      expect(result.errorCode).toBe('petition-not-found')
    })

    it('returns found: false when email does not match', async () => {
      const mockQuerySnapshot = {
        empty: true,
        docs: [],
      }

      mockDb.collection.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockQuerySnapshot),
      })

      const request = {
        data: {
          referenceNumber: validReferenceNumber,
          petitionerEmail: 'wrong.email@example.com',
        },
        auth: null,
      }

      const result = await checkPetitionStatus(request as any)

      expect(result.found).toBe(false)
    })
  })

  // ============================================================================
  // Validation Errors
  // ============================================================================

  describe('validation errors', () => {
    it('rejects invalid reference number format', async () => {
      const request = {
        data: {
          referenceNumber: 'INVALID-REF',
          petitionerEmail: validEmail,
        },
        auth: null,
      }

      await expect(checkPetitionStatus(request as any)).rejects.toThrow()
    })

    it('rejects invalid email format', async () => {
      const request = {
        data: {
          referenceNumber: validReferenceNumber,
          petitionerEmail: 'not-an-email',
        },
        auth: null,
      }

      await expect(checkPetitionStatus(request as any)).rejects.toThrow()
    })

    it('rejects missing reference number', async () => {
      const request = {
        data: {
          petitionerEmail: validEmail,
        },
        auth: null,
      }

      await expect(checkPetitionStatus(request as any)).rejects.toThrow()
    })

    it('rejects missing email', async () => {
      const request = {
        data: {
          referenceNumber: validReferenceNumber,
        },
        auth: null,
      }

      await expect(checkPetitionStatus(request as any)).rejects.toThrow()
    })
  })

  // ============================================================================
  // Query Construction
  // ============================================================================

  describe('query construction', () => {
    it('queries by both reference number AND email', async () => {
      const mockWhere = vi.fn().mockReturnThis()
      const mockGet = vi.fn().mockResolvedValue({ empty: true, docs: [] })

      mockDb.collection.mockReturnValue({
        where: mockWhere,
        get: mockGet,
      })

      const request = {
        data: {
          referenceNumber: validReferenceNumber,
          petitionerEmail: validEmail,
        },
        auth: null,
      }

      await checkPetitionStatus(request as any)

      // Should query with both conditions
      expect(mockWhere).toHaveBeenCalledWith('referenceNumber', '==', validReferenceNumber)
      expect(mockWhere).toHaveBeenCalledWith('petitionerEmail', '==', validEmail)
    })

    it('uses legalPetitions collection', async () => {
      mockDb.collection.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
      })

      const request = {
        data: {
          referenceNumber: validReferenceNumber,
          petitionerEmail: validEmail,
        },
        auth: null,
      }

      await checkPetitionStatus(request as any)

      expect(mockDb.collection).toHaveBeenCalledWith('legalPetitions')
    })
  })
})
