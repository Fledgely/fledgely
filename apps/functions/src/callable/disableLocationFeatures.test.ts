import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock firebase-admin/firestore
const mockGet = vi.fn()
const mockSet = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockAdd = vi.fn()
const mockCommit = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockWhere = vi.fn()
const mockBatch = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
    doc: mockDoc,
    batch: mockBatch,
  }),
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
  Timestamp: {
    now: () => ({
      toDate: () => new Date('2024-01-15T10:00:00Z'),
    }),
    fromDate: (date: Date) => ({
      toDate: () => date,
    }),
  },
}))

// Mock firebase-functions/v2/https - MUST come before importing the module
vi.mock('firebase-functions/v2/https', () => ({
  onCall: vi.fn((_config, handler) => handler),
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string,
      public details?: unknown
    ) {
      super(message)
    }
  },
}))

// Import after mocks
import { disableLocationFeatures, disableLocationFeaturesInputSchema } from './disableLocationFeatures'
import type { CallableRequest } from 'firebase-functions/v2/https'

type CallableFunction = (request: CallableRequest) => Promise<unknown>

describe('disableLocationFeaturesInputSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid input with all required fields', () => {
      const validInput = {
        requestId: 'safety-request-123',
        familyId: 'family-456',
        targetUserIds: ['user-789'],
        reason: 'Verified identity via ID match. Requester confirmed escape situation.',
      }

      const result = disableLocationFeaturesInputSchema.safeParse(validInput)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.requestId).toBe('safety-request-123')
        expect(result.data.familyId).toBe('family-456')
        expect(result.data.targetUserIds).toEqual(['user-789'])
        expect(result.data.reason).toBe('Verified identity via ID match. Requester confirmed escape situation.')
      }
    })

    it('accepts multiple target user IDs', () => {
      const validInput = {
        requestId: 'safety-request-123',
        familyId: 'family-456',
        targetUserIds: ['user-1', 'user-2', 'user-3'],
        reason: 'Multiple users in family need protection from tracking.',
      }

      const result = disableLocationFeaturesInputSchema.safeParse(validInput)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.targetUserIds).toHaveLength(3)
      }
    })

    it('accepts reason with exactly 20 characters', () => {
      const validInput = {
        requestId: 'req-123',
        familyId: 'fam-456',
        targetUserIds: ['user-1'],
        reason: '12345678901234567890', // exactly 20 chars
      }

      const result = disableLocationFeaturesInputSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('accepts reason up to 5000 characters', () => {
      const validInput = {
        requestId: 'req-123',
        familyId: 'fam-456',
        targetUserIds: ['user-1'],
        reason: 'a'.repeat(5000),
      }

      const result = disableLocationFeaturesInputSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('rejects empty requestId', () => {
      const invalidInput = {
        requestId: '',
        familyId: 'family-456',
        targetUserIds: ['user-789'],
        reason: 'Valid reason that is long enough for compliance.',
      }

      const result = disableLocationFeaturesInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects empty familyId', () => {
      const invalidInput = {
        requestId: 'safety-request-123',
        familyId: '',
        targetUserIds: ['user-789'],
        reason: 'Valid reason that is long enough for compliance.',
      }

      const result = disableLocationFeaturesInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects empty targetUserIds array', () => {
      const invalidInput = {
        requestId: 'safety-request-123',
        familyId: 'family-456',
        targetUserIds: [],
        reason: 'Valid reason that is long enough for compliance.',
      }

      const result = disableLocationFeaturesInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects targetUserIds with empty string', () => {
      const invalidInput = {
        requestId: 'safety-request-123',
        familyId: 'family-456',
        targetUserIds: [''],
        reason: 'Valid reason that is long enough for compliance.',
      }

      const result = disableLocationFeaturesInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects reason shorter than 20 characters', () => {
      const invalidInput = {
        requestId: 'safety-request-123',
        familyId: 'family-456',
        targetUserIds: ['user-789'],
        reason: 'Too short', // 9 chars
      }

      const result = disableLocationFeaturesInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.reason).toBeDefined()
      }
    })

    it('rejects reason longer than 5000 characters', () => {
      const invalidInput = {
        requestId: 'safety-request-123',
        familyId: 'family-456',
        targetUserIds: ['user-789'],
        reason: 'a'.repeat(5001),
      }

      const result = disableLocationFeaturesInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects missing requestId', () => {
      const invalidInput = {
        familyId: 'family-456',
        targetUserIds: ['user-789'],
        reason: 'Valid reason that is long enough for compliance.',
      }

      const result = disableLocationFeaturesInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects missing familyId', () => {
      const invalidInput = {
        requestId: 'safety-request-123',
        targetUserIds: ['user-789'],
        reason: 'Valid reason that is long enough for compliance.',
      }

      const result = disableLocationFeaturesInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects missing targetUserIds', () => {
      const invalidInput = {
        requestId: 'safety-request-123',
        familyId: 'family-456',
        reason: 'Valid reason that is long enough for compliance.',
      }

      const result = disableLocationFeaturesInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects missing reason', () => {
      const invalidInput = {
        requestId: 'safety-request-123',
        familyId: 'family-456',
        targetUserIds: ['user-789'],
      }

      const result = disableLocationFeaturesInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects non-string targetUserIds', () => {
      const invalidInput = {
        requestId: 'safety-request-123',
        familyId: 'family-456',
        targetUserIds: [123, 456],
        reason: 'Valid reason that is long enough for compliance.',
      }

      const result = disableLocationFeaturesInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })
})

describe('disableLocationFeatures Cloud Function', () => {
  // Track batch operations
  let batchOperations: { type: string; ref?: unknown; data?: unknown }[]

  beforeEach(() => {
    vi.clearAllMocks()
    batchOperations = []

    // Setup default mock implementations
    mockCollection.mockImplementation((collectionName: string) => ({
      doc: mockDoc,
      add: mockAdd,
      where: mockWhere,
    }))

    mockDoc.mockImplementation((docId?: string) => ({
      get: mockGet,
      update: mockUpdate,
      set: mockSet,
      collection: mockCollection,
    }))

    mockWhere.mockReturnValue({
      where: mockWhere,
      get: mockGet,
    })

    mockBatch.mockReturnValue({
      update: (ref: unknown, data: unknown) => {
        batchOperations.push({ type: 'update', ref, data })
      },
      set: (ref: unknown, data: unknown) => {
        batchOperations.push({ type: 'set', ref, data })
      },
      delete: (ref: unknown) => {
        batchOperations.push({ type: 'delete', ref })
      },
      commit: mockCommit,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const request = {
        data: {
          requestId: 'request-123',
          familyId: 'family-789',
          targetUserIds: ['user-012'],
          reason: 'Safety request from verified victim requiring location disable',
        },
        auth: null,
      } as unknown as CallableRequest

      await expect(
        (disableLocationFeatures as CallableFunction)(request)
      ).rejects.toThrow('Authentication required')
    })

    it('should reject users without safety-team role', async () => {
      const request = {
        data: {
          requestId: 'request-123',
          familyId: 'family-789',
          targetUserIds: ['user-012'],
          reason: 'Safety request from verified victim requiring location disable',
        },
        auth: {
          uid: 'user-123',
          token: { isSafetyTeam: false },
        },
      } as unknown as CallableRequest

      await expect(
        (disableLocationFeatures as CallableFunction)(request)
      ).rejects.toThrow('Safety team access required')
    })

    it('should reject admin users without safety-team role', async () => {
      const request = {
        data: {
          requestId: 'request-123',
          familyId: 'family-789',
          targetUserIds: ['user-012'],
          reason: 'Safety request from verified victim requiring location disable',
        },
        auth: {
          uid: 'admin-user',
          token: { isSafetyTeam: false, isAdmin: true },
        },
      } as unknown as CallableRequest

      // CRITICAL: Admin role alone is NOT sufficient
      await expect(
        (disableLocationFeatures as CallableFunction)(request)
      ).rejects.toThrow('Safety team access required')
    })
  })

  describe('Safety Request Validation', () => {
    it('should reject non-existent safety request', async () => {
      mockGet.mockResolvedValueOnce({ exists: false })

      const request = {
        data: {
          requestId: 'nonexistent-request',
          familyId: 'family-789',
          targetUserIds: ['user-012'],
          reason: 'Safety request from verified victim requiring location disable',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await expect(
        (disableLocationFeatures as CallableFunction)(request)
      ).rejects.toThrow('Safety request not found')
    })

    it('should reject pending safety request', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ status: 'pending' }),
      })

      const request = {
        data: {
          requestId: 'pending-request',
          familyId: 'family-789',
          targetUserIds: ['user-012'],
          reason: 'Safety request from verified victim requiring location disable',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await expect(
        (disableLocationFeatures as CallableFunction)(request)
      ).rejects.toThrow('Safety request must be reviewed before location disable can proceed')
    })

    it('should reject safety request without verification', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          verificationChecklist: {
            accountOwnershipVerified: false,
            idMatched: false,
          },
        }),
      })

      const request = {
        data: {
          requestId: 'unverified-request',
          familyId: 'family-789',
          targetUserIds: ['user-012'],
          reason: 'Safety request from verified victim requiring location disable',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await expect(
        (disableLocationFeatures as CallableFunction)(request)
      ).rejects.toThrow('Identity verification required before location disable')
    })

    it('should reject safety request for different family', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          familyId: 'different-family',
          verificationChecklist: {
            accountOwnershipVerified: true,
          },
        }),
      })

      const request = {
        data: {
          requestId: 'request-123',
          familyId: 'family-789',
          targetUserIds: ['user-012'],
          reason: 'Safety request from verified victim requiring location disable',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await expect(
        (disableLocationFeatures as CallableFunction)(request)
      ).rejects.toThrow('Safety request does not match the specified family')
    })
  })

  describe('Family and User Validation', () => {
    it('should reject if family not found', async () => {
      // Safety request exists and verified
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          familyId: 'family-789',
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })
      // Family does not exist
      mockGet.mockResolvedValueOnce({ exists: false })

      const request = {
        data: {
          requestId: 'request-123',
          familyId: 'family-789',
          targetUserIds: ['user-012'],
          reason: 'Safety request from verified victim requiring location disable',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await expect(
        (disableLocationFeatures as CallableFunction)(request)
      ).rejects.toThrow('Family not found')
    })

    it('should reject if user not found', async () => {
      // Safety request exists and verified
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          familyId: 'family-789',
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })
      // Family exists
      mockGet.mockResolvedValueOnce({ exists: true })
      // User does not exist
      mockGet.mockResolvedValueOnce({ exists: false })

      const request = {
        data: {
          requestId: 'request-123',
          familyId: 'family-789',
          targetUserIds: ['nonexistent-user'],
          reason: 'Safety request from verified victim requiring location disable',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await expect(
        (disableLocationFeatures as CallableFunction)(request)
      ).rejects.toThrow('User nonexistent-user not found')
    })

    it('should reject if user not in family', async () => {
      // Safety request exists and verified
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          familyId: 'family-789',
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })
      // Family exists
      mockGet.mockResolvedValueOnce({ exists: true })
      // User exists but in different family
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'different-family',
        }),
      })

      const request = {
        data: {
          requestId: 'request-123',
          familyId: 'family-789',
          targetUserIds: ['user-in-wrong-family'],
          reason: 'Safety request from verified victim requiring location disable',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await expect(
        (disableLocationFeatures as CallableFunction)(request)
      ).rejects.toThrow('User user-in-wrong-family does not belong to specified family')
    })
  })

  describe('Location Feature Disable Operations', () => {
    // Helper to setup successful pre-conditions
    const setupSuccessfulPreconditions = () => {
      // Safety request exists and verified
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          familyId: 'family-789',
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })
      // Family exists
      mockGet.mockResolvedValueOnce({ exists: true })
      // User exists in family
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ familyId: 'family-789' }),
      })
      // Pending notifications query - return empty
      mockGet.mockResolvedValueOnce({ docs: [] })
      // Device query - return empty
      mockGet.mockResolvedValueOnce({ docs: [] })
      // Location history query - return empty
      mockGet.mockResolvedValueOnce({ docs: [] })
      // Audit log add
      mockAdd.mockResolvedValueOnce({ id: 'audit-123' })
      // Batch commit
      mockCommit.mockResolvedValue(undefined)
    }

    it('should complete successfully with valid inputs and permissions', async () => {
      setupSuccessfulPreconditions()

      const request = {
        data: {
          requestId: 'request-123',
          familyId: 'family-789',
          targetUserIds: ['user-012'],
          reason: 'Safety request from verified victim requiring location disable',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      const result = await (disableLocationFeatures as CallableFunction)(request)

      expect(result).toMatchObject({
        success: true,
        disabled: true,
        familyId: 'family-789',
        affectedUserIds: ['user-012'],
      })
    })

    it('should accept safety request with idMatched verification', async () => {
      // Safety request verified via ID match (alternative verification)
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          familyId: 'family-789',
          verificationChecklist: {
            accountOwnershipVerified: false,
            idMatched: true, // Alternative verification method
          },
        }),
      })
      mockGet.mockResolvedValueOnce({ exists: true })
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ familyId: 'family-789' }),
      })
      mockGet.mockResolvedValueOnce({ docs: [] })
      mockGet.mockResolvedValueOnce({ docs: [] })
      mockGet.mockResolvedValueOnce({ docs: [] })
      mockAdd.mockResolvedValueOnce({ id: 'audit-123' })
      mockCommit.mockResolvedValue(undefined)

      const request = {
        data: {
          requestId: 'request-123',
          familyId: 'family-789',
          targetUserIds: ['user-012'],
          reason: 'Safety request from verified victim requiring location disable',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      const result = await (disableLocationFeatures as CallableFunction)(request)
      expect(result).toMatchObject({ success: true })
    })

    it('should accept user in family via familyIds array', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          familyId: 'family-789',
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })
      mockGet.mockResolvedValueOnce({ exists: true })
      // User has familyIds array instead of single familyId
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'other-family',
          familyIds: ['family-789', 'other-family'],
        }),
      })
      mockGet.mockResolvedValueOnce({ docs: [] })
      mockGet.mockResolvedValueOnce({ docs: [] })
      mockGet.mockResolvedValueOnce({ docs: [] })
      mockAdd.mockResolvedValueOnce({ id: 'audit-123' })
      mockCommit.mockResolvedValue(undefined)

      const request = {
        data: {
          requestId: 'request-123',
          familyId: 'family-789',
          targetUserIds: ['user-012'],
          reason: 'Safety request from verified victim requiring location disable',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      const result = await (disableLocationFeatures as CallableFunction)(request)
      expect(result).toMatchObject({ success: true })
    })
  })

  describe('Sealed Admin Audit', () => {
    it('should log to sealed admin audit on success', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          familyId: 'family-789',
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })
      mockGet.mockResolvedValueOnce({ exists: true })
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ familyId: 'family-789' }),
      })
      mockGet.mockResolvedValueOnce({ docs: [] })
      mockGet.mockResolvedValueOnce({ docs: [] })
      mockGet.mockResolvedValueOnce({ docs: [] })
      mockAdd.mockResolvedValueOnce({ id: 'audit-123' })
      mockCommit.mockResolvedValue(undefined)

      const request = {
        data: {
          requestId: 'request-123',
          familyId: 'family-789',
          targetUserIds: ['user-012'],
          reason: 'Safety request from verified victim requiring location disable',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await (disableLocationFeatures as CallableFunction)(request)

      // Verify audit log was created
      expect(mockAdd).toHaveBeenCalled()
      const addCall = mockAdd.mock.calls[0][0]
      expect(addCall).toMatchObject({
        action: 'location-features-disable',
        resourceType: 'location-settings',
        sealed: true,
        performedBy: 'safety-user',
        familyId: 'family-789',
        safetyRequestId: 'request-123',
        affectedUserIds: ['user-012'],
      })
      expect(addCall.integrityHash).toBeDefined()
      expect(addCall.integrityHash.length).toBe(64) // SHA-256 hex length
    })
  })

  describe('Error Handling', () => {
    it('should sanitize error logging (not expose sensitive IDs)', async () => {
      // Console spy to capture error logs
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Safety request with matching family ID
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          familyId: 'sensitive-family-id', // Must match request familyId
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })
      // Family exists
      mockGet.mockResolvedValueOnce({ exists: true })
      // User exists in family
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ familyId: 'sensitive-family-id' }),
      })
      // Simulate an error during notification query (after validation passes)
      mockGet.mockRejectedValueOnce(new Error('Database connection failed'))
      mockAdd.mockResolvedValueOnce({ id: 'error-audit-123' })

      const request = {
        data: {
          requestId: 'sensitive-request-id',
          familyId: 'sensitive-family-id',
          targetUserIds: ['sensitive-user-id'],
          reason: 'Safety request from verified victim requiring location disable',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await expect(
        (disableLocationFeatures as CallableFunction)(request)
      ).rejects.toThrow(/Failed to disable location features. Error ID:/)

      // Verify console.error was called but without sensitive data
      expect(consoleSpy).toHaveBeenCalled()
      const loggedArgs = consoleSpy.mock.calls[0]
      const loggedData = loggedArgs[1] as Record<string, unknown>

      // Should NOT contain sensitive IDs
      expect(JSON.stringify(loggedData)).not.toContain('sensitive-request-id')
      expect(JSON.stringify(loggedData)).not.toContain('sensitive-family-id')
      expect(JSON.stringify(loggedData)).not.toContain('sensitive-user-id')

      // Should contain error ID for correlation
      expect(loggedData.errorId).toBeDefined()

      consoleSpy.mockRestore()
    })
  })

  describe('Adversarial Tests', () => {
    it('should deny access to non-safety-team users (even with admin)', async () => {
      const request = {
        data: {
          requestId: 'request-123',
          familyId: 'family-789',
          targetUserIds: ['user-012'],
          reason: 'Attempting unauthorized location disable',
        },
        auth: {
          uid: 'admin-user',
          token: {
            isSafetyTeam: false,
            isAdmin: true,
            isSuperAdmin: true,
          },
        },
      } as unknown as CallableRequest

      await expect(
        (disableLocationFeatures as CallableFunction)(request)
      ).rejects.toThrow('Safety team access required')
    })

    it('should deny cross-family attacks with mismatched request/family', async () => {
      // Safety request exists but for a different family
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          familyId: 'attacker-family', // Different from request familyId
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })

      const request = {
        data: {
          requestId: 'request-for-different-family',
          familyId: 'victim-family', // Trying to affect a different family
          targetUserIds: ['victim-user'],
          reason: 'Attempting cross-family attack via location disable',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await expect(
        (disableLocationFeatures as CallableFunction)(request)
      ).rejects.toThrow('Safety request does not match the specified family')
    })

    it('should prevent users from disabling locations in families they do not belong to', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          familyId: 'target-family',
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })
      mockGet.mockResolvedValueOnce({ exists: true })
      // User exists but is not in the target family
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'unrelated-family',
          familyIds: ['unrelated-family', 'another-family'],
        }),
      })

      const request = {
        data: {
          requestId: 'request-123',
          familyId: 'target-family',
          targetUserIds: ['user-not-in-family'],
          reason: 'Attempting to disable location for non-family-member',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await expect(
        (disableLocationFeatures as CallableFunction)(request)
      ).rejects.toThrow('does not belong to specified family')
    })
  })
})
