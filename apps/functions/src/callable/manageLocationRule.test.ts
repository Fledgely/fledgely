/**
 * Tests for manageLocationRule Cloud Functions.
 *
 * Story 40.2: Location-Specific Rule Configuration
 * - AC2: Per-Location Time Limits
 * - AC3: Per-Location Category Rules
 *
 * Tests cover:
 * - Authentication validation
 * - Permission validation (only guardians can manage rules)
 * - Location features enabled check
 * - Rule CRUD operations
 * - Education-only mode default for school zones
 * - Audit logging
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @fledgely/shared
vi.mock('@fledgely/shared', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { z } = require('zod')
  return {
    setLocationRuleInputSchema: z.object({
      familyId: z.string().min(1),
      zoneId: z.string().min(1),
      childId: z.string().min(1),
      dailyTimeLimitMinutes: z.number().min(0).max(1440).nullable().optional(),
      categoryOverrides: z.record(z.string(), z.enum(['allowed', 'blocked'])).optional(),
      educationOnlyMode: z.boolean().optional(),
    }),
    deleteLocationRuleInputSchema: z.object({
      familyId: z.string().min(1),
      ruleId: z.string().min(1),
    }),
  }
})

// Mock firebase-admin/firestore
const mockBatchSet = vi.fn()
const mockBatchUpdate = vi.fn()
const mockBatchDelete = vi.fn()
const mockBatchCommit = vi.fn()
const mockDocGet = vi.fn()
const mockCollection = vi.fn()
const mockWhere = vi.fn()
const mockLimit = vi.fn()
const mockGetDocs = vi.fn()

vi.mock('firebase-admin/firestore', () => {
  return {
    getFirestore: () => ({
      collection: (...args: unknown[]) => mockCollection(...args),
      batch: () => ({
        set: mockBatchSet,
        update: mockBatchUpdate,
        delete: mockBatchDelete,
        commit: mockBatchCommit,
      }),
    }),
    FieldValue: {
      serverTimestamp: () => 'SERVER_TIMESTAMP',
    },
  }
})

// Mock firebase-functions
vi.mock('firebase-functions/v2/https', () => ({
  onCall: (handler: unknown) => handler,
  HttpsError: class HttpsError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
      this.name = 'HttpsError'
    }
  },
}))

// Mock auth verification
vi.mock('../shared/auth', () => ({
  verifyAuth: vi.fn((auth) => {
    if (!auth || !auth.uid) {
      const error = new Error('Authentication required')
      ;(error as unknown as { code: string }).code = 'unauthenticated'
      throw error
    }
    return { uid: auth.uid, email: auth.email || 'guardian@example.com' }
  }),
}))

// Import after mocks
import { setLocationRule, deleteLocationRule } from './manageLocationRule'

describe('setLocationRule', () => {
  const mockFamilyWithLocationEnabled = {
    exists: true,
    data: () => ({
      id: 'family-456',
      name: 'Test Family',
      guardianUids: ['guardian-1', 'guardian-2'],
      childIds: ['child-1', 'child-2'],
      locationFeaturesEnabled: true,
    }),
  }

  const mockZoneDoc = {
    exists: true,
    data: () => ({
      id: 'zone-789',
      name: "Mom's House",
      type: 'home_1',
    }),
  }

  const mockSchoolZoneDoc = {
    exists: true,
    data: () => ({
      id: 'zone-school',
      name: 'Lincoln Elementary',
      type: 'school',
    }),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock chain
    mockWhere.mockReturnValue({ where: mockWhere, limit: mockLimit })
    mockLimit.mockReturnValue({ get: mockGetDocs })
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] })
    mockBatchCommit.mockResolvedValue(undefined)

    mockCollection.mockImplementation((path: string) => {
      if (path === 'families') {
        return {
          doc: vi.fn().mockReturnValue({
            get: mockDocGet,
            collection: vi.fn().mockImplementation((subpath: string) => {
              if (subpath === 'locationZones') {
                return {
                  doc: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue(mockZoneDoc),
                  }),
                }
              }
              if (subpath === 'locationRules') {
                return {
                  doc: vi.fn().mockReturnValue({ id: 'rule-new' }),
                  where: mockWhere,
                }
              }
              if (subpath === 'auditLog') {
                return {
                  doc: vi.fn().mockReturnValue({ id: 'audit-123' }),
                }
              }
              return { doc: vi.fn() }
            }),
          }),
        }
      }
      return { doc: vi.fn() }
    })

    mockDocGet.mockResolvedValue(mockFamilyWithLocationEnabled)
  })

  describe('Authentication (Step 1)', () => {
    it('throws unauthenticated error when no auth provided', async () => {
      await expect(
        setLocationRule({
          auth: null,
          data: {
            familyId: 'family-456',
            zoneId: 'zone-789',
            childId: 'child-1',
          },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Authentication required')
    })
  })

  describe('Validation (Step 2)', () => {
    it('throws invalid-argument error for missing zoneId', async () => {
      await expect(
        setLocationRule({
          auth: { uid: 'guardian-1', token: {} as never },
          data: {
            familyId: 'family-456',
            childId: 'child-1',
          } as never,
          rawRequest: {} as never,
        })
      ).rejects.toThrow()
    })

    it('throws invalid-argument error for invalid time limit', async () => {
      await expect(
        setLocationRule({
          auth: { uid: 'guardian-1', token: {} as never },
          data: {
            familyId: 'family-456',
            zoneId: 'zone-789',
            childId: 'child-1',
            dailyTimeLimitMinutes: 2000, // Over max
          },
          rawRequest: {} as never,
        })
      ).rejects.toThrow()
    })
  })

  describe('Permission (Step 3)', () => {
    it('throws not-found error when family does not exist', async () => {
      mockDocGet.mockResolvedValue({ exists: false })

      await expect(
        setLocationRule({
          auth: { uid: 'guardian-1', token: {} as never },
          data: {
            familyId: 'family-456',
            zoneId: 'zone-789',
            childId: 'child-1',
          },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Family not found')
    })

    it('throws permission-denied error when caller is not guardian', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardianUids: ['other-guardian'],
          childIds: ['child-1'],
          locationFeaturesEnabled: true,
        }),
      })

      await expect(
        setLocationRule({
          auth: { uid: 'guardian-1', token: {} as never },
          data: {
            familyId: 'family-456',
            zoneId: 'zone-789',
            childId: 'child-1',
          },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Only family guardians can manage location rules')
    })

    it('throws failed-precondition when location features not enabled', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardianUids: ['guardian-1', 'guardian-2'],
          childIds: ['child-1'],
          locationFeaturesEnabled: false,
        }),
      })

      await expect(
        setLocationRule({
          auth: { uid: 'guardian-1', token: {} as never },
          data: {
            familyId: 'family-456',
            zoneId: 'zone-789',
            childId: 'child-1',
          },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Location features must be enabled')
    })
  })

  describe('Business Logic (Step 4)', () => {
    it('creates new rule successfully', async () => {
      const result = await setLocationRule({
        auth: { uid: 'guardian-1', token: {} as never },
        data: {
          familyId: 'family-456',
          zoneId: 'zone-789',
          childId: 'child-1',
          dailyTimeLimitMinutes: 120,
        },
        rawRequest: {} as never,
      })

      expect(result.success).toBe(true)
      expect(result.isNew).toBe(true)
      expect(result.ruleId).toBeDefined()
    })

    it('updates existing rule', async () => {
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            ref: { id: 'existing-rule' },
            data: () => ({
              id: 'existing-rule',
              zoneId: 'zone-789',
              childId: 'child-1',
            }),
          },
        ],
      })

      const result = await setLocationRule({
        auth: { uid: 'guardian-1', token: {} as never },
        data: {
          familyId: 'family-456',
          zoneId: 'zone-789',
          childId: 'child-1',
          dailyTimeLimitMinutes: 180,
        },
        rawRequest: {} as never,
      })

      expect(result.success).toBe(true)
      expect(result.isNew).toBe(false)
      expect(mockBatchUpdate).toHaveBeenCalled()
    })

    it('defaults education-only mode to true for school zones (AC3)', async () => {
      // Set up school zone mock
      mockCollection.mockImplementation((path: string) => {
        if (path === 'families') {
          return {
            doc: vi.fn().mockReturnValue({
              get: mockDocGet,
              collection: vi.fn().mockImplementation((subpath: string) => {
                if (subpath === 'locationZones') {
                  return {
                    doc: vi.fn().mockReturnValue({
                      get: vi.fn().mockResolvedValue(mockSchoolZoneDoc),
                    }),
                  }
                }
                if (subpath === 'locationRules') {
                  return {
                    doc: vi.fn().mockReturnValue({ id: 'rule-new' }),
                    where: mockWhere,
                  }
                }
                if (subpath === 'auditLog') {
                  return {
                    doc: vi.fn().mockReturnValue({ id: 'audit-123' }),
                  }
                }
                return { doc: vi.fn() }
              }),
            }),
          }
        }
        return { doc: vi.fn() }
      })

      await setLocationRule({
        auth: { uid: 'guardian-1', token: {} as never },
        data: {
          familyId: 'family-456',
          zoneId: 'zone-school',
          childId: 'child-1',
        },
        rawRequest: {} as never,
      })

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          educationOnlyMode: true,
        })
      )
    })

    it('defaults education-only mode to false for home zones', async () => {
      await setLocationRule({
        auth: { uid: 'guardian-1', token: {} as never },
        data: {
          familyId: 'family-456',
          zoneId: 'zone-789',
          childId: 'child-1',
        },
        rawRequest: {} as never,
      })

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          educationOnlyMode: false,
        })
      )
    })

    it('allows overriding education-only mode', async () => {
      await setLocationRule({
        auth: { uid: 'guardian-1', token: {} as never },
        data: {
          familyId: 'family-456',
          zoneId: 'zone-789',
          childId: 'child-1',
          educationOnlyMode: true,
        },
        rawRequest: {} as never,
      })

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          educationOnlyMode: true,
        })
      )
    })

    it('creates audit log entry', async () => {
      await setLocationRule({
        auth: { uid: 'guardian-1', token: {} as never },
        data: {
          familyId: 'family-456',
          zoneId: 'zone-789',
          childId: 'child-1',
        },
        rawRequest: {} as never,
      })

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'location_rule_created',
          performedByUid: 'guardian-1',
        })
      )
    })
  })
})

describe('deleteLocationRule', () => {
  const mockFamilyWithLocationEnabled = {
    exists: true,
    data: () => ({
      id: 'family-456',
      name: 'Test Family',
      guardianUids: ['guardian-1', 'guardian-2'],
      childIds: ['child-1'],
      locationFeaturesEnabled: true,
    }),
  }

  const mockRuleDoc = {
    exists: true,
    data: () => ({
      id: 'rule-123',
      zoneId: 'zone-789',
      childId: 'child-1',
    }),
    ref: { id: 'rule-123' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockBatchCommit.mockResolvedValue(undefined)

    mockCollection.mockImplementation((path: string) => {
      if (path === 'families') {
        return {
          doc: vi.fn().mockReturnValue({
            get: mockDocGet,
            collection: vi.fn().mockImplementation((subpath: string) => {
              if (subpath === 'locationRules') {
                return {
                  doc: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue(mockRuleDoc),
                    id: 'rule-123',
                  }),
                }
              }
              if (subpath === 'auditLog') {
                return {
                  doc: vi.fn().mockReturnValue({ id: 'audit-123' }),
                }
              }
              return { doc: vi.fn() }
            }),
          }),
        }
      }
      return { doc: vi.fn() }
    })

    mockDocGet.mockResolvedValue(mockFamilyWithLocationEnabled)
  })

  describe('Authentication (Step 1)', () => {
    it('throws unauthenticated error when no auth provided', async () => {
      await expect(
        deleteLocationRule({
          auth: null,
          data: {
            familyId: 'family-456',
            ruleId: 'rule-123',
          },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Authentication required')
    })
  })

  describe('Validation (Step 2)', () => {
    it('throws invalid-argument error for missing ruleId', async () => {
      await expect(
        deleteLocationRule({
          auth: { uid: 'guardian-1', token: {} as never },
          data: {
            familyId: 'family-456',
          } as never,
          rawRequest: {} as never,
        })
      ).rejects.toThrow()
    })
  })

  describe('Business Logic (Step 4)', () => {
    it('deletes rule successfully', async () => {
      const result = await deleteLocationRule({
        auth: { uid: 'guardian-1', token: {} as never },
        data: {
          familyId: 'family-456',
          ruleId: 'rule-123',
        },
        rawRequest: {} as never,
      })

      expect(result.success).toBe(true)
      expect(mockBatchDelete).toHaveBeenCalled()
    })

    it('creates audit log entry for deletion', async () => {
      await deleteLocationRule({
        auth: { uid: 'guardian-1', token: {} as never },
        data: {
          familyId: 'family-456',
          ruleId: 'rule-123',
        },
        rawRequest: {} as never,
      })

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'location_rule_deleted',
          performedByUid: 'guardian-1',
          targetRuleId: 'rule-123',
        })
      )
    })
  })
})
