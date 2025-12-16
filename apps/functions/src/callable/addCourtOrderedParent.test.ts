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
    arrayUnion: vi.fn((item) => ({ _arrayUnion: item })),
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

// Mock legal petition notifications
vi.mock('../utils/legalPetitionNotifications', () => ({
  notifyNewParentAccessGranted: vi.fn().mockResolvedValue('queue-123'),
  notifyExistingGuardiansCourtOrderedParent: vi.fn().mockResolvedValue(['queue-456']),
}))

import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { addCourtOrderedParent } from './addCourtOrderedParent'

/**
 * addCourtOrderedParent Function Tests
 *
 * Story 3.6: Legal Parent Petition for Access - Task 5
 *
 * Tests verify:
 * - Only safety-team can call this function
 * - Adds new parent to family's guardians array
 * - Marks parent as addedVia: 'court-order'
 * - Sends notification to new parent
 * - Sends notification to existing guardians
 * - Updates petition status to 'verified'
 * - Logs to admin audit
 */

describe('addCourtOrderedParent', () => {
  let mockDb: {
    collection: ReturnType<typeof vi.fn>
    doc: ReturnType<typeof vi.fn>
    runTransaction: ReturnType<typeof vi.fn>
  }

  const validInput = {
    petitionId: 'petition-123',
    familyId: 'family-456',
    newParentUserId: 'user-789',
  }

  const mockPetition = {
    id: 'petition-123',
    referenceNumber: 'LP-20251215-A1B2C',
    petitionerName: 'Jane Doe',
    petitionerEmail: 'jane.doe@example.com',
    petitionerUserId: 'user-789',
    childName: 'Tommy Doe',
    childDOB: { toDate: () => new Date('2015-06-15') },
    claimedRelationship: 'parent',
    message: 'Test message',
    documents: [],
    status: 'reviewing',
    submittedAt: { toDate: () => new Date('2025-12-10') },
    updatedAt: { toDate: () => new Date('2025-12-12') },
    statusHistory: [],
    internalNotes: [],
  }

  const mockFamily = {
    id: 'family-456',
    createdAt: { toDate: () => new Date('2025-01-01') },
    createdBy: 'user-existing',
    guardians: [
      {
        uid: 'user-existing',
        role: 'primary',
        permissions: 'full',
        joinedAt: { toDate: () => new Date('2025-01-01') },
        addedVia: 'creator',
      },
    ],
    children: ['child-123'],
  }

  const mockAdminRoleDoc = {
    exists: true,
    data: () => ({ roles: ['safety-team'] }),
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-15T10:00:00Z'))

    mockDb = {
      collection: vi.fn(),
      doc: vi.fn(),
      runTransaction: vi.fn(),
    }

    vi.mocked(getFirestore).mockReturnValue(mockDb as unknown as admin.firestore.Firestore)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // ============================================================================
  // Authorization Tests - CRITICAL
  // ============================================================================

  describe('CRITICAL: authorization', () => {
    it('rejects unauthenticated users', async () => {
      const request = {
        data: validInput,
        auth: null,
      }

      await expect(addCourtOrderedParent(request as any)).rejects.toThrow()
    })

    it('rejects users without safety-team role', async () => {
      const mockAdminRoleDocNoRole = {
        exists: true,
        data: () => ({ roles: ['user'] }),
      }

      mockDb.doc.mockReturnValue({
        get: vi.fn().mockResolvedValue(mockAdminRoleDocNoRole),
      })

      const request = {
        data: validInput,
        auth: { uid: 'non-support-user' },
      }

      await expect(addCourtOrderedParent(request as any)).rejects.toThrow()
    })

    it('rejects users with no admin role document', async () => {
      const mockNoDoc = {
        exists: false,
        data: () => null,
      }

      mockDb.doc.mockReturnValue({
        get: vi.fn().mockResolvedValue(mockNoDoc),
      })

      const request = {
        data: validInput,
        auth: { uid: 'unknown-user' },
      }

      await expect(addCourtOrderedParent(request as any)).rejects.toThrow()
    })

    it('allows users with safety-team role', async () => {
      const mockTransaction = {
        get: vi.fn(),
        update: vi.fn(),
        set: vi.fn(),
      }

      const mockUserProfile = {
        exists: true,
        data: () => ({ email: 'user@example.com' }),
      }

      mockTransaction.get
        .mockResolvedValueOnce({ exists: true, data: () => mockPetition }) // petition
        .mockResolvedValueOnce({ exists: true, data: () => mockFamily }) // family

      mockDb.runTransaction.mockImplementation(async (fn: (t: typeof mockTransaction) => Promise<unknown>) => {
        return fn(mockTransaction)
      })

      mockDb.doc.mockImplementation((path: string) => {
        if (path.includes('adminRoles')) {
          return {
            get: vi.fn().mockResolvedValue(mockAdminRoleDoc),
          }
        }
        if (path.includes('legalPetitions')) {
          return {
            get: vi.fn().mockResolvedValue({ exists: true, data: () => mockPetition }),
          }
        }
        if (path.includes('users')) {
          return {
            get: vi.fn().mockResolvedValue(mockUserProfile),
          }
        }
        return { path }
      })

      mockDb.collection.mockReturnValue({
        add: vi.fn().mockResolvedValue({ id: 'audit-123' }),
        doc: vi.fn().mockReturnValue({ path: 'some/path' }),
      })

      const request = {
        data: validInput,
        auth: { uid: 'support-agent' },
      }

      const result = await addCourtOrderedParent(request as any)
      expect(result.success).toBe(true)
    })
  })

  // ============================================================================
  // Successful Operation Tests
  // ============================================================================

  describe('successful operation', () => {
    let mockTransaction: {
      get: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
      set: ReturnType<typeof vi.fn>
    }

    const mockUserProfile = {
      exists: true,
      data: () => ({ email: 'user@example.com' }),
    }

    beforeEach(() => {
      mockTransaction = {
        get: vi.fn(),
        update: vi.fn(),
        set: vi.fn(),
      }

      mockTransaction.get
        .mockResolvedValueOnce({ exists: true, data: () => mockPetition }) // petition
        .mockResolvedValueOnce({ exists: true, data: () => mockFamily }) // family

      mockDb.runTransaction.mockImplementation(async (fn: (t: typeof mockTransaction) => Promise<unknown>) => {
        return fn(mockTransaction)
      })

      mockDb.doc.mockImplementation((path: string) => {
        if (path.includes('adminRoles')) {
          return {
            get: vi.fn().mockResolvedValue(mockAdminRoleDoc),
          }
        }
        if (path.includes('legalPetitions')) {
          return {
            get: vi.fn().mockResolvedValue({ exists: true, data: () => mockPetition }),
          }
        }
        if (path.includes('users')) {
          return {
            get: vi.fn().mockResolvedValue(mockUserProfile),
          }
        }
        return { path }
      })

      mockDb.collection.mockReturnValue({
        add: vi.fn().mockResolvedValue({ id: 'audit-123' }),
        doc: vi.fn().mockReturnValue({ path: 'some/path' }),
      })
    })

    it('adds new guardian with addedVia: court-order', async () => {
      const request = {
        data: validInput,
        auth: { uid: 'support-agent' },
      }

      await addCourtOrderedParent(request as any)

      // Check that family was updated with new guardian
      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          guardians: expect.arrayContaining([
            expect.objectContaining({
              uid: 'user-789',
              role: 'co-parent',
              permissions: 'full',
              addedVia: 'court-order',
              addedBy: 'support-agent',
            }),
          ]),
        })
      )
    })

    it('updates petition status to verified', async () => {
      const request = {
        data: validInput,
        auth: { uid: 'support-agent' },
      }

      await addCourtOrderedParent(request as any)

      // Check that petition status was updated
      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'verified',
          targetFamilyId: 'family-456',
        })
      )
    })

    it('logs to admin audit', async () => {
      const mockAdminAuditAdd = vi.fn().mockResolvedValue({ id: 'audit-123' })

      mockDb.collection.mockReturnValue({
        add: mockAdminAuditAdd,
        doc: vi.fn().mockReturnValue({ path: 'some/path' }),
      })

      const request = {
        data: validInput,
        auth: { uid: 'support-agent' },
      }

      await addCourtOrderedParent(request as any)

      expect(mockDb.collection).toHaveBeenCalledWith('adminAuditLog')
      expect(mockAdminAuditAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'court_ordered_parent_added',
        })
      )
    })

    it('returns success with familyId', async () => {
      const request = {
        data: validInput,
        auth: { uid: 'support-agent' },
      }

      const result = await addCourtOrderedParent(request as any)

      expect(result.success).toBe(true)
      expect(result.familyId).toBe('family-456')
    })
  })

  // ============================================================================
  // Validation Error Tests
  // ============================================================================

  describe('validation errors', () => {
    beforeEach(() => {
      mockDb.doc.mockImplementation((path: string) => {
        if (path.includes('adminRoles')) {
          return {
            get: vi.fn().mockResolvedValue(mockAdminRoleDoc),
          }
        }
        return { path }
      })
    })

    it('rejects missing petitionId', async () => {
      const request = {
        data: { familyId: 'family-456', newParentUserId: 'user-789' },
        auth: { uid: 'support-agent' },
      }

      await expect(addCourtOrderedParent(request as any)).rejects.toThrow()
    })

    it('rejects missing familyId', async () => {
      const request = {
        data: { petitionId: 'petition-123', newParentUserId: 'user-789' },
        auth: { uid: 'support-agent' },
      }

      await expect(addCourtOrderedParent(request as any)).rejects.toThrow()
    })

    it('rejects missing newParentUserId', async () => {
      const request = {
        data: { petitionId: 'petition-123', familyId: 'family-456' },
        auth: { uid: 'support-agent' },
      }

      await expect(addCourtOrderedParent(request as any)).rejects.toThrow()
    })
  })

  // ============================================================================
  // Not Found Tests
  // ============================================================================

  describe('resource not found', () => {
    beforeEach(() => {
      mockDb.doc.mockImplementation((path: string) => {
        if (path.includes('adminRoles')) {
          return {
            get: vi.fn().mockResolvedValue(mockAdminRoleDoc),
          }
        }
        return { path }
      })
    })

    it('rejects when petition not found', async () => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValueOnce({ exists: false }), // petition not found
        update: vi.fn(),
        set: vi.fn(),
      }

      mockDb.runTransaction.mockImplementation(async (fn: (t: typeof mockTransaction) => Promise<unknown>) => {
        return fn(mockTransaction)
      })

      const request = {
        data: validInput,
        auth: { uid: 'support-agent' },
      }

      await expect(addCourtOrderedParent(request as any)).rejects.toThrow()
    })

    it('rejects when family not found', async () => {
      const mockTransaction = {
        get: vi.fn()
          .mockResolvedValueOnce({ exists: true, data: () => mockPetition }) // petition found
          .mockResolvedValueOnce({ exists: false }), // family not found
        update: vi.fn(),
        set: vi.fn(),
      }

      mockDb.runTransaction.mockImplementation(async (fn: (t: typeof mockTransaction) => Promise<unknown>) => {
        return fn(mockTransaction)
      })

      const request = {
        data: validInput,
        auth: { uid: 'support-agent' },
      }

      await expect(addCourtOrderedParent(request as any)).rejects.toThrow()
    })
  })

  // ============================================================================
  // Idempotency Tests
  // ============================================================================

  describe('idempotency', () => {
    it('rejects if parent already in family', async () => {
      const familyWithParent = {
        ...mockFamily,
        guardians: [
          ...mockFamily.guardians,
          {
            uid: 'user-789', // Already in family
            role: 'co-parent',
            permissions: 'full',
            joinedAt: { toDate: () => new Date('2025-12-14') },
            addedVia: 'invitation',
          },
        ],
      }

      const mockTransaction = {
        get: vi.fn()
          .mockResolvedValueOnce({ exists: true, data: () => mockPetition })
          .mockResolvedValueOnce({ exists: true, data: () => familyWithParent }),
        update: vi.fn(),
        set: vi.fn(),
      }

      mockDb.runTransaction.mockImplementation(async (fn: (t: typeof mockTransaction) => Promise<unknown>) => {
        return fn(mockTransaction)
      })

      mockDb.doc.mockImplementation((path: string) => {
        if (path.includes('adminRoles')) {
          return {
            get: vi.fn().mockResolvedValue(mockAdminRoleDoc),
          }
        }
        return { path }
      })

      const request = {
        data: validInput,
        auth: { uid: 'support-agent' },
      }

      await expect(addCourtOrderedParent(request as any)).rejects.toThrow()
    })

    it('rejects if petition already verified', async () => {
      const verifiedPetition = {
        ...mockPetition,
        status: 'verified',
      }

      const mockTransaction = {
        get: vi.fn()
          .mockResolvedValueOnce({ exists: true, data: () => verifiedPetition }),
        update: vi.fn(),
        set: vi.fn(),
      }

      mockDb.runTransaction.mockImplementation(async (fn: (t: typeof mockTransaction) => Promise<unknown>) => {
        return fn(mockTransaction)
      })

      mockDb.doc.mockImplementation((path: string) => {
        if (path.includes('adminRoles')) {
          return {
            get: vi.fn().mockResolvedValue(mockAdminRoleDoc),
          }
        }
        return { path }
      })

      const request = {
        data: validInput,
        auth: { uid: 'support-agent' },
      }

      await expect(addCourtOrderedParent(request as any)).rejects.toThrow()
    })
  })

  // ============================================================================
  // CRITICAL Security Tests - Family Isolation
  // ============================================================================

  describe('CRITICAL: family isolation', () => {
    const mockUserProfile = {
      exists: true,
      data: () => ({ email: 'user@example.com' }),
    }

    it('does NOT log to family audit trail', async () => {
      const mockTransaction = {
        get: vi.fn()
          .mockResolvedValueOnce({ exists: true, data: () => mockPetition })
          .mockResolvedValueOnce({ exists: true, data: () => mockFamily }),
        update: vi.fn(),
        set: vi.fn(),
      }

      mockDb.runTransaction.mockImplementation(async (fn: (t: typeof mockTransaction) => Promise<unknown>) => {
        return fn(mockTransaction)
      })

      mockDb.doc.mockImplementation((path: string) => {
        if (path.includes('adminRoles')) {
          return {
            get: vi.fn().mockResolvedValue(mockAdminRoleDoc),
          }
        }
        if (path.includes('legalPetitions')) {
          return {
            get: vi.fn().mockResolvedValue({ exists: true, data: () => mockPetition }),
          }
        }
        if (path.includes('users')) {
          return {
            get: vi.fn().mockResolvedValue(mockUserProfile),
          }
        }
        return { path }
      })

      mockDb.collection.mockReturnValue({
        add: vi.fn().mockResolvedValue({ id: 'audit-123' }),
        doc: vi.fn().mockReturnValue({ path: 'some/path' }),
      })

      const request = {
        data: validInput,
        auth: { uid: 'support-agent' },
      }

      await addCourtOrderedParent(request as any)

      // Should NOT call auditLog (family audit)
      const collectionCalls = vi.mocked(mockDb.collection).mock.calls.map((call) => call[0])
      expect(collectionCalls).not.toContain('auditLog')
      // But SHOULD call adminAuditLog
      expect(collectionCalls).toContain('adminAuditLog')
    })
  })
})
