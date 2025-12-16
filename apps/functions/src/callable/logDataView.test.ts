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

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logDataView, getViewAuditLog } from './logDataView'

/**
 * logDataView and getViewAuditLog Function Tests
 *
 * Story 3A.1: Data Symmetry Enforcement - Viewing Audit Trail
 *
 * Tests verify:
 * - Requires authentication
 * - Validates caller is a guardian of the child
 * - Creates audit entry in viewAuditLog subcollection
 * - Both parents can read the full audit trail (symmetry)
 * - Audit entries are immutable (no updates/deletes)
 */

describe('logDataView', () => {
  let mockDb: {
    collection: ReturnType<typeof vi.fn>
    doc: ReturnType<typeof vi.fn>
  }

  const validInput = {
    childId: 'child-123',
    dataType: 'screenshot',
    resourceId: 'screenshot-abc',
    itemCount: 1,
    sessionId: 'session-xyz',
    clientInfo: {
      platform: 'web',
      appVersion: '1.0.0',
    },
  }

  const mockChildDoc = {
    exists: true,
    data: () => ({
      guardians: [
        { uid: 'guardian-1', permissions: 'full' },
        { uid: 'guardian-2', permissions: 'full' },
      ],
      familyId: 'family-123',
    }),
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-15T10:00:00Z'))

    const mockAuditDocRef = {
      id: 'audit-123',
      set: vi.fn().mockResolvedValue(undefined),
    }

    // Rate limit mock - default to allowing (count = 0)
    const mockCountResult = {
      data: () => ({ count: 0 }),
    }

    mockDb = {
      collection: vi.fn().mockImplementation((collectionName: string) => {
        if (collectionName === 'children') {
          return {
            doc: vi.fn().mockImplementation((docId?: string) => {
              if (docId === undefined) {
                // Called without id - for generating new ID
                return { id: 'audit-generated-id' }
              }
              // Called with childId
              return {
                get: vi.fn().mockResolvedValue(mockChildDoc),
                collection: vi.fn().mockReturnValue({
                  doc: vi.fn().mockReturnValue(mockAuditDocRef),
                  // Rate limiting support
                  where: vi.fn().mockReturnThis(),
                  count: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue(mockCountResult),
                  }),
                }),
              }
            }),
          }
        }
        return {
          doc: vi.fn().mockReturnValue({ id: 'random-id' }),
        }
      }),
      doc: vi.fn().mockReturnValue({ id: 'random-id' }),
    }

    vi.mocked(getFirestore).mockReturnValue(mockDb as unknown as admin.firestore.Firestore)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // ============================================================================
  // Authentication Tests
  // ============================================================================

  describe('authentication', () => {
    it('rejects unauthenticated requests', async () => {
      const request = {
        data: validInput,
        auth: null,
      }

      await expect(logDataView(request as any)).rejects.toThrow('Authentication required')
    })

    it('accepts authenticated requests', async () => {
      const request = {
        data: validInput,
        auth: { uid: 'guardian-1' },
      }

      const result = await logDataView(request as any)
      expect(result.success).toBe(true)
    })
  })

  // ============================================================================
  // Authorization Tests
  // ============================================================================

  describe('authorization', () => {
    it('rejects non-guardians', async () => {
      const request = {
        data: validInput,
        auth: { uid: 'non-guardian' },
      }

      await expect(logDataView(request as any)).rejects.toThrow(
        'You must be a guardian to log views for this child'
      )
    })

    it('allows guardians to log views', async () => {
      const request = {
        data: validInput,
        auth: { uid: 'guardian-1' },
      }

      const result = await logDataView(request as any)
      expect(result.success).toBe(true)
      // auditId is returned from the function
      expect(typeof result.auditId).toBe('string')
    })

    it('allows co-parent (second guardian) to log views', async () => {
      const request = {
        data: validInput,
        auth: { uid: 'guardian-2' },
      }

      const result = await logDataView(request as any)
      expect(result.success).toBe(true)
    })
  })

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe('input validation', () => {
    it('rejects empty childId', async () => {
      const request = {
        data: { ...validInput, childId: '' },
        auth: { uid: 'guardian-1' },
      }

      await expect(logDataView(request as any)).rejects.toThrow('Invalid input')
    })

    it('rejects invalid dataType', async () => {
      const request = {
        data: { ...validInput, dataType: 'invalid_type' },
        auth: { uid: 'guardian-1' },
      }

      await expect(logDataView(request as any)).rejects.toThrow('Invalid input')
    })

    it('rejects negative itemCount', async () => {
      const request = {
        data: { ...validInput, itemCount: -1 },
        auth: { uid: 'guardian-1' },
      }

      await expect(logDataView(request as any)).rejects.toThrow('Invalid input')
    })

    it('accepts valid dataTypes', async () => {
      const validTypes = [
        'child_profile',
        'screenshot',
        'screenshot_list',
        'activity_log',
        'activity_summary',
        'device_status',
        'flag',
        'flag_list',
        'agreement',
        'trust_score',
      ]

      for (const dataType of validTypes) {
        const request = {
          data: { ...validInput, dataType },
          auth: { uid: 'guardian-1' },
        }

        const result = await logDataView(request as any)
        expect(result.success).toBe(true)
      }
    })

    it('accepts minimal input (only required fields)', async () => {
      const request = {
        data: { childId: 'child-123', dataType: 'screenshot' },
        auth: { uid: 'guardian-1' },
      }

      const result = await logDataView(request as any)
      expect(result.success).toBe(true)
    })
  })

  // ============================================================================
  // Audit Entry Creation Tests
  // ============================================================================

  describe('audit entry creation', () => {
    it('stores audit entry in viewAuditLog subcollection', async () => {
      const mockSet = vi.fn().mockResolvedValue(undefined)
      const mockViewAuditLogDoc = vi.fn().mockReturnValue({
        id: 'audit-123',
        set: mockSet,
      })
      const mockCountResult = { data: () => ({ count: 0 }) }
      const mockViewAuditLogCollection = vi.fn().mockReturnValue({
        doc: mockViewAuditLogDoc,
        where: vi.fn().mockReturnThis(),
        count: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(mockCountResult),
        }),
      })

      mockDb.collection = vi.fn().mockImplementation((collectionName: string) => {
        if (collectionName === 'children') {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(mockChildDoc),
              collection: mockViewAuditLogCollection,
              id: 'child-123',
            }),
          }
        }
        return {
          doc: vi.fn().mockReturnValue({ id: 'random-id' }),
        }
      })

      const request = {
        data: validInput,
        auth: { uid: 'guardian-1' },
      }

      await logDataView(request as any)

      expect(mockViewAuditLogCollection).toHaveBeenCalledWith('viewAuditLog')
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          childId: 'child-123',
          viewedBy: 'guardian-1',
          dataType: 'screenshot',
          resourceId: 'screenshot-abc',
          viewedAt: 'SERVER_TIMESTAMP',
        })
      )
    })

    it('includes all provided fields in audit entry', async () => {
      const mockSet = vi.fn().mockResolvedValue(undefined)
      const mockCountResult = { data: () => ({ count: 0 }) }

      mockDb.collection = vi.fn().mockImplementation((collectionName: string) => {
        if (collectionName === 'children') {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(mockChildDoc),
              collection: vi.fn().mockReturnValue({
                doc: vi.fn().mockReturnValue({
                  id: 'audit-123',
                  set: mockSet,
                }),
                where: vi.fn().mockReturnThis(),
                count: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue(mockCountResult),
                }),
              }),
              id: 'child-123',
            }),
          }
        }
        return {
          doc: vi.fn().mockReturnValue({ id: 'random-id' }),
        }
      })

      const request = {
        data: validInput,
        auth: { uid: 'guardian-1' },
      }

      await logDataView(request as any)

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          itemCount: 1,
          sessionId: 'session-xyz',
          clientInfo: {
            platform: 'web',
            appVersion: '1.0.0',
          },
        })
      )
    })

    it('returns audit entry ID and metadata', async () => {
      const request = {
        data: validInput,
        auth: { uid: 'guardian-1' },
      }

      const result = await logDataView(request as any)

      expect(result.success).toBe(true)
      expect(typeof result.auditId).toBe('string')
      expect(result.childId).toBe('child-123')
      expect(result.dataType).toBe('screenshot')
      expect(result.viewedAt).toBeDefined()
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    it('returns not-found for non-existent child', async () => {
      mockDb.collection = vi.fn().mockImplementation((collectionName: string) => {
        if (collectionName === 'children') {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ exists: false }),
            }),
          }
        }
        return {
          doc: vi.fn().mockReturnValue({ id: 'random-id' }),
        }
      })

      const request = {
        data: validInput,
        auth: { uid: 'guardian-1' },
      }

      await expect(logDataView(request as any)).rejects.toThrow('Child not found')
    })

    it('handles Firestore errors gracefully', async () => {
      mockDb.collection = vi.fn().mockImplementation((collectionName: string) => {
        if (collectionName === 'children') {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockRejectedValue(new Error('Firestore error')),
            }),
          }
        }
        return {
          doc: vi.fn().mockReturnValue({ id: 'random-id' }),
        }
      })

      const request = {
        data: validInput,
        auth: { uid: 'guardian-1' },
      }

      await expect(logDataView(request as any)).rejects.toThrow('Failed to log data view')
    })

    it('handles empty guardians array', async () => {
      const mockChildDocEmptyGuardians = {
        exists: true,
        data: () => ({
          guardians: [], // Empty guardians array
          familyId: 'family-123',
        }),
      }

      mockDb.collection = vi.fn().mockImplementation((collectionName: string) => {
        if (collectionName === 'children') {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(mockChildDocEmptyGuardians),
            }),
          }
        }
        return {
          doc: vi.fn().mockReturnValue({ id: 'random-id' }),
        }
      })

      const request = {
        data: validInput,
        auth: { uid: 'guardian-1' },
      }

      await expect(logDataView(request as any)).rejects.toThrow(
        'You must be a guardian to log views for this child'
      )
    })
  })

  // ============================================================================
  // Rate Limiting Tests
  // ============================================================================

  describe('rate limiting', () => {
    it('rejects requests when rate limit exceeded', async () => {
      const mockAuditDocRef = {
        id: 'audit-123',
        set: vi.fn().mockResolvedValue(undefined),
      }

      const mockCountResult = {
        data: () => ({ count: 500 }), // At the limit
      }

      mockDb.collection = vi.fn().mockImplementation((collectionName: string) => {
        if (collectionName === 'children') {
          return {
            doc: vi.fn().mockImplementation((docId?: string) => {
              if (docId === undefined) {
                return { id: 'audit-generated-id' }
              }
              return {
                get: vi.fn().mockResolvedValue(mockChildDoc),
                collection: vi.fn().mockReturnValue({
                  doc: vi.fn().mockReturnValue(mockAuditDocRef),
                  where: vi.fn().mockReturnThis(),
                  count: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue(mockCountResult),
                  }),
                }),
              }
            }),
          }
        }
        return {
          doc: vi.fn().mockReturnValue({ id: 'random-id' }),
        }
      })

      const request = {
        data: validInput,
        auth: { uid: 'guardian-1' },
      }

      await expect(logDataView(request as any)).rejects.toThrow('Rate limit exceeded')
    })

    it('allows requests when under rate limit', async () => {
      const mockAuditDocRef = {
        id: 'audit-123',
        set: vi.fn().mockResolvedValue(undefined),
      }

      const mockCountResult = {
        data: () => ({ count: 10 }), // Under the limit
      }

      mockDb.collection = vi.fn().mockImplementation((collectionName: string) => {
        if (collectionName === 'children') {
          return {
            doc: vi.fn().mockImplementation((docId?: string) => {
              if (docId === undefined) {
                return { id: 'audit-generated-id' }
              }
              return {
                get: vi.fn().mockResolvedValue(mockChildDoc),
                collection: vi.fn().mockReturnValue({
                  doc: vi.fn().mockReturnValue(mockAuditDocRef),
                  where: vi.fn().mockReturnThis(),
                  count: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue(mockCountResult),
                  }),
                }),
              }
            }),
          }
        }
        return {
          doc: vi.fn().mockReturnValue({ id: 'random-id' }),
        }
      })

      const request = {
        data: validInput,
        auth: { uid: 'guardian-1' },
      }

      const result = await logDataView(request as any)
      expect(result.success).toBe(true)
    })
  })
})

describe('getViewAuditLog', () => {
  let mockDb: {
    collection: ReturnType<typeof vi.fn>
    doc: ReturnType<typeof vi.fn>
  }

  const mockChildDoc = {
    exists: true,
    data: () => ({
      guardians: [
        { uid: 'guardian-1', permissions: 'full' },
        { uid: 'guardian-2', permissions: 'full' },
      ],
      familyId: 'family-123',
    }),
  }

  const mockAuditEntries = [
    {
      id: 'audit-1',
      data: () => ({
        childId: 'child-123',
        viewedBy: 'guardian-1',
        dataType: 'screenshot',
        resourceId: 'screenshot-abc',
        viewedAt: { toDate: () => new Date('2025-12-15T09:00:00Z') },
        itemCount: 1,
        sessionId: 'session-1',
      }),
    },
    {
      id: 'audit-2',
      data: () => ({
        childId: 'child-123',
        viewedBy: 'guardian-2',
        dataType: 'activity_log',
        resourceId: null,
        viewedAt: { toDate: () => new Date('2025-12-15T08:00:00Z') },
        itemCount: 10,
        sessionId: 'session-2',
      }),
    },
  ]

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-15T10:00:00Z'))

    const mockQuerySnapshot = {
      docs: mockAuditEntries,
    }

    mockDb = {
      collection: vi.fn().mockImplementation((collectionName: string) => {
        if (collectionName === 'children') {
          return {
            doc: vi.fn().mockImplementation((childId: string) => ({
              get: vi.fn().mockResolvedValue(mockChildDoc),
              collection: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                startAfter: vi.fn().mockReturnThis(),
                get: vi.fn().mockResolvedValue(mockQuerySnapshot),
                doc: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue({ exists: true }),
                }),
              }),
            })),
          }
        }
        return {}
      }),
      doc: vi.fn(),
    }

    vi.mocked(getFirestore).mockReturnValue(mockDb as unknown as admin.firestore.Firestore)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // ============================================================================
  // Authentication Tests
  // ============================================================================

  describe('authentication', () => {
    it('rejects unauthenticated requests', async () => {
      const request = {
        data: { childId: 'child-123' },
        auth: null,
      }

      await expect(getViewAuditLog(request as any)).rejects.toThrow('Authentication required')
    })
  })

  // ============================================================================
  // Authorization Tests (SYMMETRY ENFORCEMENT)
  // ============================================================================

  describe('authorization - symmetry enforcement', () => {
    it('allows guardian-1 to read audit log', async () => {
      const request = {
        data: { childId: 'child-123' },
        auth: { uid: 'guardian-1' },
      }

      const result = await getViewAuditLog(request as any)
      expect(result.success).toBe(true)
      expect(result.entries).toHaveLength(2)
    })

    it('allows guardian-2 (co-parent) to read SAME audit log - SYMMETRY', async () => {
      const request = {
        data: { childId: 'child-123' },
        auth: { uid: 'guardian-2' },
      }

      const result = await getViewAuditLog(request as any)
      expect(result.success).toBe(true)
      expect(result.entries).toHaveLength(2)
    })

    it('shows both guardians viewing history to each other - TRANSPARENCY', async () => {
      const request = {
        data: { childId: 'child-123' },
        auth: { uid: 'guardian-1' },
      }

      const result = await getViewAuditLog(request as any)

      // Guardian-1 should see guardian-2's views
      const guardian2Views = result.entries.filter((e: any) => e.viewedBy === 'guardian-2')
      expect(guardian2Views.length).toBeGreaterThan(0)
    })

    it('rejects non-guardians', async () => {
      const request = {
        data: { childId: 'child-123' },
        auth: { uid: 'non-guardian' },
      }

      await expect(getViewAuditLog(request as any)).rejects.toThrow(
        'You must be a guardian to view audit logs for this child'
      )
    })
  })

  // ============================================================================
  // Query Tests
  // ============================================================================

  describe('query functionality', () => {
    it('returns entries in descending order by viewedAt', async () => {
      const request = {
        data: { childId: 'child-123' },
        auth: { uid: 'guardian-1' },
      }

      const result = await getViewAuditLog(request as any)

      expect(result.entries[0].viewedAt).toBeDefined()
      // First entry should be more recent
      expect(new Date(result.entries[0].viewedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(result.entries[1].viewedAt).getTime()
      )
    })

    it('supports pagination with limit', async () => {
      const request = {
        data: { childId: 'child-123', limit: 10 },
        auth: { uid: 'guardian-1' },
      }

      const result = await getViewAuditLog(request as any)
      expect(result.success).toBe(true)
      expect(result.count).toBeLessThanOrEqual(10)
    })

    it('supports pagination with startAfter cursor', async () => {
      const request = {
        data: { childId: 'child-123', startAfter: 'audit-1' },
        auth: { uid: 'guardian-1' },
      }

      const result = await getViewAuditLog(request as any)
      expect(result.success).toBe(true)
    })

    it('returns hasMore flag when at limit', async () => {
      const request = {
        data: { childId: 'child-123', limit: 2 },
        auth: { uid: 'guardian-1' },
      }

      const result = await getViewAuditLog(request as any)
      expect(result.hasMore).toBe(true)
    })

    it('returns lastEntryId for pagination', async () => {
      const request = {
        data: { childId: 'child-123' },
        auth: { uid: 'guardian-1' },
      }

      const result = await getViewAuditLog(request as any)
      expect(result.lastEntryId).toBe('audit-2')
    })
  })

  // ============================================================================
  // Response Format Tests
  // ============================================================================

  describe('response format', () => {
    it('returns entries with correct structure', async () => {
      const request = {
        data: { childId: 'child-123' },
        auth: { uid: 'guardian-1' },
      }

      const result = await getViewAuditLog(request as any)

      const entry = result.entries[0]
      expect(entry).toHaveProperty('id')
      expect(entry).toHaveProperty('childId')
      expect(entry).toHaveProperty('viewedBy')
      expect(entry).toHaveProperty('dataType')
      expect(entry).toHaveProperty('viewedAt')
    })

    it('converts Firestore Timestamp to ISO string', async () => {
      const request = {
        data: { childId: 'child-123' },
        auth: { uid: 'guardian-1' },
      }

      const result = await getViewAuditLog(request as any)

      const entry = result.entries[0]
      expect(typeof entry.viewedAt).toBe('string')
      expect(entry.viewedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    it('returns not-found for non-existent child', async () => {
      mockDb.collection = vi.fn().mockImplementation((collectionName: string) => {
        if (collectionName === 'children') {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ exists: false }),
            }),
          }
        }
        return {}
      })

      const request = {
        data: { childId: 'non-existent-child' },
        auth: { uid: 'guardian-1' },
      }

      await expect(getViewAuditLog(request as any)).rejects.toThrow('Child not found')
    })

    it('handles Firestore errors gracefully', async () => {
      mockDb.collection = vi.fn().mockImplementation((collectionName: string) => {
        if (collectionName === 'children') {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockRejectedValue(new Error('Firestore error')),
            }),
          }
        }
        return {}
      })

      const request = {
        data: { childId: 'child-123' },
        auth: { uid: 'guardian-1' },
      }

      await expect(getViewAuditLog(request as any)).rejects.toThrow(
        'Failed to retrieve view audit log'
      )
    })
  })

  // ============================================================================
  // CRITICAL Symmetry Tests
  // ============================================================================

  describe('CRITICAL symmetry requirements', () => {
    it('both parents see IDENTICAL data', async () => {
      // Guardian 1 request
      const request1 = {
        data: { childId: 'child-123' },
        auth: { uid: 'guardian-1' },
      }

      // Guardian 2 request
      const request2 = {
        data: { childId: 'child-123' },
        auth: { uid: 'guardian-2' },
      }

      const result1 = await getViewAuditLog(request1 as any)
      const result2 = await getViewAuditLog(request2 as any)

      // Both should see the exact same entries
      expect(result1.entries).toEqual(result2.entries)
      expect(result1.count).toBe(result2.count)
    })

    it('audit entries include views from ALL guardians', async () => {
      const request = {
        data: { childId: 'child-123' },
        auth: { uid: 'guardian-1' },
      }

      const result = await getViewAuditLog(request as any)

      const viewerIds = new Set(result.entries.map((e: any) => e.viewedBy))
      expect(viewerIds.has('guardian-1')).toBe(true)
      expect(viewerIds.has('guardian-2')).toBe(true)
    })

    it('no filtering based on who is viewing', async () => {
      // This is the key symmetry requirement - both parents see all data
      // We verify this by checking that guardian-1 sees guardian-2's views
      // and vice versa

      const request = {
        data: { childId: 'child-123' },
        auth: { uid: 'guardian-1' },
      }

      const result = await getViewAuditLog(request as any)

      // Guardian-1 should see guardian-2's activity log view
      const guardian2ActivityView = result.entries.find(
        (e: any) => e.viewedBy === 'guardian-2' && e.dataType === 'activity_log'
      )
      expect(guardian2ActivityView).toBeDefined()
    })
  })
})
