import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as admin from 'firebase-admin'

// Mock firebase-admin
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() })),
    fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
  },
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
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

import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { submitLegalPetition } from './submitLegalPetition'

/**
 * submitLegalPetition Function Tests
 *
 * Story 3.6: Legal Parent Petition for Access - Task 3
 *
 * Tests verify:
 * - Validates input against schema
 * - Generates unique reference number
 * - Stores petition in legalPetitions collection
 * - Does NOT notify family members (CRITICAL)
 * - Does NOT log to family audit trail (CRITICAL)
 * - Logs to admin audit only
 * - Returns reference number to petitioner
 * - Handles errors gracefully
 */

describe('submitLegalPetition', () => {
  let mockDb: {
    collection: ReturnType<typeof vi.fn>
    doc: ReturnType<typeof vi.fn>
    set: ReturnType<typeof vi.fn>
    add: ReturnType<typeof vi.fn>
  }

  const validInput = {
    petitionerName: 'Jane Doe',
    petitionerEmail: 'jane.doe@example.com',
    petitionerPhone: '+1-555-123-4567',
    childName: 'Tommy Doe',
    childDOB: new Date('2015-06-15'),
    claimedRelationship: 'parent',
    message: 'I am requesting access to monitoring of my child.',
    documents: [],
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-15T10:00:00Z'))

    const mockDocRef = {
      id: 'petition-123',
      set: vi.fn().mockResolvedValue(undefined),
    }

    const mockAdminAuditRef = {
      add: vi.fn().mockResolvedValue({ id: 'audit-123' }),
    }

    mockDb = {
      collection: vi.fn((collectionName: string) => {
        if (collectionName === 'legalPetitions') {
          return {
            doc: vi.fn(() => mockDocRef),
          }
        }
        if (collectionName === 'adminAuditLog') {
          return mockAdminAuditRef
        }
        return {}
      }),
      doc: vi.fn(() => mockDocRef),
      set: mockDocRef.set,
      add: mockAdminAuditRef.add,
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

  describe('successful submission', () => {
    it('creates petition with valid input', async () => {
      const request = {
        data: validInput,
        auth: { uid: 'user-123' },
      }

      const result = await submitLegalPetition(request as any)

      expect(result.success).toBe(true)
      expect(result.referenceNumber).toMatch(/^LP-\d{8}-[A-Z0-9]{5}$/)
      expect(result.petitionId).toBe('petition-123')
    })

    it('stores petition in legalPetitions collection (not family collection)', async () => {
      const request = {
        data: validInput,
        auth: { uid: 'user-123' },
      }

      await submitLegalPetition(request as any)

      expect(mockDb.collection).toHaveBeenCalledWith('legalPetitions')
      // CRITICAL: Should NOT call families or children collections
      expect(mockDb.collection).not.toHaveBeenCalledWith('families')
      expect(mockDb.collection).not.toHaveBeenCalledWith('children')
    })

    it('logs to adminAuditLog (not family audit)', async () => {
      const request = {
        data: validInput,
        auth: { uid: 'user-123' },
      }

      await submitLegalPetition(request as any)

      expect(mockDb.collection).toHaveBeenCalledWith('adminAuditLog')
      // CRITICAL: Should NOT call auditLog (family audit)
      const collectionCalls = vi.mocked(mockDb.collection).mock.calls
      const hasAuditLogCall = collectionCalls.some(
        (call) => call[0] === 'auditLog' || call[0].includes('auditLog')
      )
      expect(hasAuditLogCall).toBe(false)
    })

    it('returns reference number in correct format', async () => {
      const request = {
        data: validInput,
        auth: { uid: 'user-123' },
      }

      const result = await submitLegalPetition(request as any)

      expect(result.referenceNumber).toMatch(/^LP-20251215-[A-Z0-9]{5}$/)
    })

    it('stores petitioner user ID when authenticated', async () => {
      const mockDocRef = {
        id: 'petition-123',
        set: vi.fn().mockResolvedValue(undefined),
      }

      vi.mocked(mockDb.collection).mockImplementation((collectionName: string) => {
        if (collectionName === 'legalPetitions') {
          return {
            doc: vi.fn(() => mockDocRef),
          } as any
        }
        return {
          add: vi.fn().mockResolvedValue({ id: 'audit-123' }),
        } as any
      })

      const request = {
        data: validInput,
        auth: { uid: 'user-123' },
      }

      await submitLegalPetition(request as any)

      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          petitionerUserId: 'user-123',
        })
      )
    })

    it('works without authentication (allows anonymous petition)', async () => {
      const mockDocRef = {
        id: 'petition-123',
        set: vi.fn().mockResolvedValue(undefined),
      }

      vi.mocked(mockDb.collection).mockImplementation((collectionName: string) => {
        if (collectionName === 'legalPetitions') {
          return {
            doc: vi.fn(() => mockDocRef),
          } as any
        }
        return {
          add: vi.fn().mockResolvedValue({ id: 'audit-123' }),
        } as any
      })

      const request = {
        data: validInput,
        auth: null, // No authentication
      }

      const result = await submitLegalPetition(request as any)

      expect(result.success).toBe(true)
      // Should not have petitionerUserId since not authenticated
      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.not.objectContaining({
          petitionerUserId: expect.any(String),
        })
      )
    })

    it('stores initial status as submitted', async () => {
      const mockDocRef = {
        id: 'petition-123',
        set: vi.fn().mockResolvedValue(undefined),
      }

      vi.mocked(mockDb.collection).mockImplementation((collectionName: string) => {
        if (collectionName === 'legalPetitions') {
          return {
            doc: vi.fn(() => mockDocRef),
          } as any
        }
        return {
          add: vi.fn().mockResolvedValue({ id: 'audit-123' }),
        } as any
      })

      const request = {
        data: validInput,
        auth: { uid: 'user-123' },
      }

      await submitLegalPetition(request as any)

      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'submitted',
        })
      )
    })

    it('stores empty internalNotes array', async () => {
      const mockDocRef = {
        id: 'petition-123',
        set: vi.fn().mockResolvedValue(undefined),
      }

      vi.mocked(mockDb.collection).mockImplementation((collectionName: string) => {
        if (collectionName === 'legalPetitions') {
          return {
            doc: vi.fn(() => mockDocRef),
          } as any
        }
        return {
          add: vi.fn().mockResolvedValue({ id: 'audit-123' }),
        } as any
      })

      const request = {
        data: validInput,
        auth: { uid: 'user-123' },
      }

      await submitLegalPetition(request as any)

      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          internalNotes: [],
        })
      )
    })

    it('stores initial statusHistory entry', async () => {
      const mockDocRef = {
        id: 'petition-123',
        set: vi.fn().mockResolvedValue(undefined),
      }

      vi.mocked(mockDb.collection).mockImplementation((collectionName: string) => {
        if (collectionName === 'legalPetitions') {
          return {
            doc: vi.fn(() => mockDocRef),
          } as any
        }
        return {
          add: vi.fn().mockResolvedValue({ id: 'audit-123' }),
        } as any
      })

      const request = {
        data: validInput,
        auth: { uid: 'user-123' },
      }

      await submitLegalPetition(request as any)

      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          statusHistory: expect.arrayContaining([
            expect.objectContaining({
              status: 'submitted',
              updatedBy: 'system',
            }),
          ]),
        })
      )
    })
  })

  // ============================================================================
  // Validation Error Cases
  // ============================================================================

  describe('validation errors', () => {
    it('rejects missing petitioner name', async () => {
      const request = {
        data: { ...validInput, petitionerName: '' },
        auth: { uid: 'user-123' },
      }

      await expect(submitLegalPetition(request as any)).rejects.toThrow()
    })

    it('rejects invalid email', async () => {
      const request = {
        data: { ...validInput, petitionerEmail: 'not-an-email' },
        auth: { uid: 'user-123' },
      }

      await expect(submitLegalPetition(request as any)).rejects.toThrow()
    })

    it('rejects missing child name', async () => {
      const request = {
        data: { ...validInput, childName: '' },
        auth: { uid: 'user-123' },
      }

      await expect(submitLegalPetition(request as any)).rejects.toThrow()
    })

    it('rejects invalid claimed relationship', async () => {
      const request = {
        data: { ...validInput, claimedRelationship: 'grandparent' },
        auth: { uid: 'user-123' },
      }

      await expect(submitLegalPetition(request as any)).rejects.toThrow()
    })

    it('rejects future child DOB', async () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const request = {
        data: { ...validInput, childDOB: futureDate },
        auth: { uid: 'user-123' },
      }

      await expect(submitLegalPetition(request as any)).rejects.toThrow()
    })

    it('rejects more than 5 documents', async () => {
      const sixDocuments = Array.from({ length: 6 }, (_, i) => ({
        id: `550e8400-e29b-41d4-a716-44665544000${i}`,
        fileName: `doc-${i}.pdf`,
        fileType: 'application/pdf',
        storagePath: `/path/doc-${i}.pdf`,
        uploadedAt: new Date(),
        sizeBytes: 1024,
      }))

      const request = {
        data: { ...validInput, documents: sixDocuments },
        auth: { uid: 'user-123' },
      }

      await expect(submitLegalPetition(request as any)).rejects.toThrow()
    })
  })

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('error handling', () => {
    it('handles Firestore errors gracefully', async () => {
      const mockDocRef = {
        id: 'petition-123',
        set: vi.fn().mockRejectedValue(new Error('Firestore error')),
      }

      vi.mocked(mockDb.collection).mockImplementation((collectionName: string) => {
        if (collectionName === 'legalPetitions') {
          return {
            doc: vi.fn(() => mockDocRef),
          } as any
        }
        return {
          add: vi.fn().mockResolvedValue({ id: 'audit-123' }),
        } as any
      })

      const request = {
        data: validInput,
        auth: { uid: 'user-123' },
      }

      await expect(submitLegalPetition(request as any)).rejects.toThrow()
    })

    it('logs error to admin audit on failure', async () => {
      const mockDocRef = {
        id: 'petition-123',
        set: vi.fn().mockRejectedValue(new Error('Firestore error')),
      }

      const mockAdminAuditAdd = vi.fn().mockResolvedValue({ id: 'audit-123' })

      vi.mocked(mockDb.collection).mockImplementation((collectionName: string) => {
        if (collectionName === 'legalPetitions') {
          return {
            doc: vi.fn(() => mockDocRef),
          } as any
        }
        return {
          add: mockAdminAuditAdd,
        } as any
      })

      const request = {
        data: validInput,
        auth: { uid: 'user-123' },
      }

      try {
        await submitLegalPetition(request as any)
      } catch {
        // Expected
      }

      // Should log error to admin audit
      expect(mockAdminAuditAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'legal_petition_error',
        })
      )
    })
  })

  // ============================================================================
  // CRITICAL Security Tests
  // ============================================================================

  describe('CRITICAL security requirements', () => {
    it('does NOT send any notifications', async () => {
      const request = {
        data: validInput,
        auth: { uid: 'user-123' },
      }

      await submitLegalPetition(request as any)

      // Should not call any notification-related collections
      expect(mockDb.collection).not.toHaveBeenCalledWith('notifications')
      expect(mockDb.collection).not.toHaveBeenCalledWith('mail')
      expect(mockDb.collection).not.toHaveBeenCalledWith('pushNotifications')
    })

    it('stores in isolated legalPetitions collection', async () => {
      const request = {
        data: validInput,
        auth: { uid: 'user-123' },
      }

      await submitLegalPetition(request as any)

      const collectionCalls = vi.mocked(mockDb.collection).mock.calls.map((call) => call[0])

      // Should ONLY access legalPetitions and adminAuditLog
      expect(collectionCalls).toContain('legalPetitions')
      expect(collectionCalls).toContain('adminAuditLog')
      expect(collectionCalls).not.toContain('families')
      expect(collectionCalls).not.toContain('children')
      expect(collectionCalls).not.toContain('users')
    })
  })
})
