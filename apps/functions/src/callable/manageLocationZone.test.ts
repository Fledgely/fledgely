/**
 * Tests for manageLocationZone Cloud Functions.
 *
 * Story 40.2: Location-Specific Rule Configuration
 * - AC1: Location Definitions
 * - AC4: Geofence Configuration
 *
 * Tests cover:
 * - Authentication validation
 * - Permission validation (only guardians can manage zones)
 * - Location features enabled check
 * - Zone CRUD operations
 * - Geofence radius validation
 * - Audit logging
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @fledgely/shared
vi.mock('@fledgely/shared', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { z } = require('zod')
  return {
    createLocationZoneInputSchema: z.object({
      familyId: z.string().min(1),
      name: z.string().min(1).max(100),
      type: z.enum(['home_1', 'home_2', 'school', 'other']),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      radiusMeters: z.number().min(100).max(2000).optional(),
      address: z.string().max(500).optional(),
    }),
    updateLocationZoneInputSchema: z.object({
      familyId: z.string().min(1),
      zoneId: z.string().min(1),
      name: z.string().min(1).max(100).optional(),
      type: z.enum(['home_1', 'home_2', 'school', 'other']).optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      radiusMeters: z.number().min(100).max(2000).optional(),
      address: z.string().max(500).nullable().optional(),
    }),
    deleteLocationZoneInputSchema: z.object({
      familyId: z.string().min(1),
      zoneId: z.string().min(1),
    }),
    DEFAULT_GEOFENCE_RADIUS_METERS: 500,
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
import { createLocationZone, updateLocationZone, deleteLocationZone } from './manageLocationZone'

describe('createLocationZone', () => {
  const mockFamilyWithLocationEnabled = {
    exists: true,
    data: () => ({
      id: 'family-456',
      name: 'Test Family',
      guardianUids: ['guardian-1', 'guardian-2'],
      locationFeaturesEnabled: true,
    }),
  }

  const mockFamilyDoc = {
    get: mockDocGet,
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        id: 'zone-789',
      }),
    }),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockDocGet.mockResolvedValue(mockFamilyWithLocationEnabled)
    mockCollection.mockImplementation((path: string) => {
      if (path === 'families') {
        return {
          doc: vi.fn().mockReturnValue(mockFamilyDoc),
        }
      }
      return { doc: vi.fn() }
    })
    mockBatchCommit.mockResolvedValue(undefined)
  })

  describe('Authentication (Step 1)', () => {
    it('throws unauthenticated error when no auth provided', async () => {
      await expect(
        createLocationZone({
          auth: null,
          data: {
            familyId: 'family-456',
            name: "Mom's House",
            type: 'home_1',
            latitude: 40.7128,
            longitude: -74.006,
          },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Authentication required')
    })
  })

  describe('Validation (Step 2)', () => {
    it('throws invalid-argument error for missing familyId', async () => {
      await expect(
        createLocationZone({
          auth: { uid: 'guardian-1', token: {} as never },
          data: {
            name: "Mom's House",
            type: 'home_1',
            latitude: 40.7128,
            longitude: -74.006,
          } as never,
          rawRequest: {} as never,
        })
      ).rejects.toThrow()
    })

    it('throws invalid-argument error for invalid latitude', async () => {
      await expect(
        createLocationZone({
          auth: { uid: 'guardian-1', token: {} as never },
          data: {
            familyId: 'family-456',
            name: "Mom's House",
            type: 'home_1',
            latitude: 100, // Invalid
            longitude: -74.006,
          },
          rawRequest: {} as never,
        })
      ).rejects.toThrow()
    })

    it('throws invalid-argument error for radius below minimum', async () => {
      await expect(
        createLocationZone({
          auth: { uid: 'guardian-1', token: {} as never },
          data: {
            familyId: 'family-456',
            name: "Mom's House",
            type: 'home_1',
            latitude: 40.7128,
            longitude: -74.006,
            radiusMeters: 50, // Below 100m minimum
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
        createLocationZone({
          auth: { uid: 'guardian-1', token: {} as never },
          data: {
            familyId: 'family-456',
            name: "Mom's House",
            type: 'home_1',
            latitude: 40.7128,
            longitude: -74.006,
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
          locationFeaturesEnabled: true,
        }),
      })

      await expect(
        createLocationZone({
          auth: { uid: 'guardian-1', token: {} as never },
          data: {
            familyId: 'family-456',
            name: "Mom's House",
            type: 'home_1',
            latitude: 40.7128,
            longitude: -74.006,
          },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Only family guardians can manage location zones')
    })

    it('throws failed-precondition when location features not enabled', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardianUids: ['guardian-1', 'guardian-2'],
          locationFeaturesEnabled: false,
        }),
      })

      await expect(
        createLocationZone({
          auth: { uid: 'guardian-1', token: {} as never },
          data: {
            familyId: 'family-456',
            name: "Mom's House",
            type: 'home_1',
            latitude: 40.7128,
            longitude: -74.006,
          },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Location features must be enabled')
    })
  })

  describe('Business Logic (Step 4)', () => {
    it('creates zone successfully with required fields', async () => {
      const result = await createLocationZone({
        auth: { uid: 'guardian-1', token: {} as never },
        data: {
          familyId: 'family-456',
          name: "Mom's House",
          type: 'home_1',
          latitude: 40.7128,
          longitude: -74.006,
        },
        rawRequest: {} as never,
      })

      expect(result.success).toBe(true)
      expect(result.zoneId).toBeDefined()
    })

    it('uses default radius when not provided (AC4)', async () => {
      await createLocationZone({
        auth: { uid: 'guardian-1', token: {} as never },
        data: {
          familyId: 'family-456',
          name: "Mom's House",
          type: 'home_1',
          latitude: 40.7128,
          longitude: -74.006,
        },
        rawRequest: {} as never,
      })

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          radiusMeters: 500, // Default
        })
      )
    })

    it('uses provided radius when specified', async () => {
      await createLocationZone({
        auth: { uid: 'guardian-1', token: {} as never },
        data: {
          familyId: 'family-456',
          name: "Mom's House",
          type: 'home_1',
          latitude: 40.7128,
          longitude: -74.006,
          radiusMeters: 750,
        },
        rawRequest: {} as never,
      })

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          radiusMeters: 750,
        })
      )
    })

    it('creates audit log entry', async () => {
      await createLocationZone({
        auth: { uid: 'guardian-1', token: {} as never },
        data: {
          familyId: 'family-456',
          name: "Mom's House",
          type: 'home_1',
          latitude: 40.7128,
          longitude: -74.006,
        },
        rawRequest: {} as never,
      })

      // Should be 2 batch.set calls: zone + audit log
      expect(mockBatchSet).toHaveBeenCalledTimes(2)
      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'location_zone_created',
          performedByUid: 'guardian-1',
        })
      )
    })
  })
})

describe('updateLocationZone', () => {
  const mockFamilyWithLocationEnabled = {
    exists: true,
    data: () => ({
      id: 'family-456',
      name: 'Test Family',
      guardianUids: ['guardian-1', 'guardian-2'],
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
    ref: { id: 'zone-789' },
  }

  const mockFamilyDoc = {
    get: mockDocGet,
    collection: vi.fn().mockImplementation((subpath: string) => {
      if (subpath === 'locationZones') {
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(mockZoneDoc),
            id: 'zone-789',
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
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockDocGet.mockResolvedValue(mockFamilyWithLocationEnabled)
    mockCollection.mockImplementation((path: string) => {
      if (path === 'families') {
        return {
          doc: vi.fn().mockReturnValue(mockFamilyDoc),
        }
      }
      return { doc: vi.fn() }
    })
    mockBatchCommit.mockResolvedValue(undefined)
  })

  describe('Authentication (Step 1)', () => {
    it('throws unauthenticated error when no auth provided', async () => {
      await expect(
        updateLocationZone({
          auth: null,
          data: {
            familyId: 'family-456',
            zoneId: 'zone-789',
            name: 'Updated Name',
          },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Authentication required')
    })
  })

  describe('Validation (Step 2)', () => {
    it('throws invalid-argument error for missing zoneId', async () => {
      await expect(
        updateLocationZone({
          auth: { uid: 'guardian-1', token: {} as never },
          data: {
            familyId: 'family-456',
            name: 'Updated Name',
          } as never,
          rawRequest: {} as never,
        })
      ).rejects.toThrow()
    })
  })

  describe('Business Logic (Step 4)', () => {
    it('updates zone successfully', async () => {
      const result = await updateLocationZone({
        auth: { uid: 'guardian-1', token: {} as never },
        data: {
          familyId: 'family-456',
          zoneId: 'zone-789',
          name: 'Updated Name',
        },
        rawRequest: {} as never,
      })

      expect(result.success).toBe(true)
      expect(mockBatchUpdate).toHaveBeenCalled()
    })

    it('creates audit log entry for update', async () => {
      await updateLocationZone({
        auth: { uid: 'guardian-1', token: {} as never },
        data: {
          familyId: 'family-456',
          zoneId: 'zone-789',
          name: 'Updated Name',
        },
        rawRequest: {} as never,
      })

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'location_zone_updated',
          performedByUid: 'guardian-1',
        })
      )
    })
  })
})

describe('deleteLocationZone', () => {
  const mockFamilyWithLocationEnabled = {
    exists: true,
    data: () => ({
      id: 'family-456',
      name: 'Test Family',
      guardianUids: ['guardian-1', 'guardian-2'],
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
    ref: { id: 'zone-789' },
  }

  const mockFamilyDoc = {
    get: mockDocGet,
    collection: vi.fn().mockImplementation((subpath: string) => {
      if (subpath === 'locationZones') {
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(mockZoneDoc),
            id: 'zone-789',
          }),
        }
      }
      if (subpath === 'locationRules') {
        return {
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
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockDocGet.mockResolvedValue(mockFamilyWithLocationEnabled)
    mockWhere.mockReturnValue({ get: mockGetDocs })
    mockGetDocs.mockResolvedValue({ size: 0, docs: [] })
    mockCollection.mockImplementation((path: string) => {
      if (path === 'families') {
        return {
          doc: vi.fn().mockReturnValue(mockFamilyDoc),
        }
      }
      return { doc: vi.fn() }
    })
    mockBatchCommit.mockResolvedValue(undefined)
  })

  describe('Authentication (Step 1)', () => {
    it('throws unauthenticated error when no auth provided', async () => {
      await expect(
        deleteLocationZone({
          auth: null,
          data: {
            familyId: 'family-456',
            zoneId: 'zone-789',
          },
          rawRequest: {} as never,
        })
      ).rejects.toThrow('Authentication required')
    })
  })

  describe('Business Logic (Step 4)', () => {
    it('deletes zone successfully', async () => {
      const result = await deleteLocationZone({
        auth: { uid: 'guardian-1', token: {} as never },
        data: {
          familyId: 'family-456',
          zoneId: 'zone-789',
        },
        rawRequest: {} as never,
      })

      expect(result.success).toBe(true)
      expect(mockBatchDelete).toHaveBeenCalled()
    })

    it('deletes associated location rules', async () => {
      const mockRuleDoc = { ref: { id: 'rule-1' } }
      mockGetDocs.mockResolvedValue({
        size: 2,
        docs: [mockRuleDoc, mockRuleDoc],
      })

      await deleteLocationZone({
        auth: { uid: 'guardian-1', token: {} as never },
        data: {
          familyId: 'family-456',
          zoneId: 'zone-789',
        },
        rawRequest: {} as never,
      })

      // Zone + 2 rules = 3 deletes
      expect(mockBatchDelete).toHaveBeenCalledTimes(3)
    })

    it('creates audit log entry with deleted rules count', async () => {
      mockGetDocs.mockResolvedValue({
        size: 2,
        docs: [{ ref: { id: 'rule-1' } }, { ref: { id: 'rule-2' } }],
      })

      await deleteLocationZone({
        auth: { uid: 'guardian-1', token: {} as never },
        data: {
          familyId: 'family-456',
          zoneId: 'zone-789',
        },
        rawRequest: {} as never,
      })

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'location_zone_deleted',
          performedByUid: 'guardian-1',
          details: expect.objectContaining({
            deletedRulesCount: 2,
          }),
        })
      )
    })
  })
})
