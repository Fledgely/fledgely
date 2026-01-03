/**
 * Get Location Transitions Callable Function Tests - Story 40.4
 *
 * Tests for the callable function that returns location transition history.
 *
 * Acceptance Criteria:
 * - AC7: Audit trail for parents
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore
const mockGet = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockLimit = vi.fn()
const mockOffset = vi.fn()
const mockCount = vi.fn()

const mockGetAll = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
    getAll: mockGetAll,
  }),
  Timestamp: {
    fromDate: (d: Date) => ({ toDate: () => d, seconds: Math.floor(d.getTime() / 1000) }),
  },
}))

// Mock firebase-functions/v2/https
vi.mock('firebase-functions/v2/https', () => ({
  onCall: (_options: unknown, handler: (request: unknown) => Promise<unknown>) => handler,
  HttpsError: class HttpsError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  },
}))

import { getLocationTransitions } from './getLocationTransitions'
import { HttpsError } from 'firebase-functions/v2/https'

describe('getLocationTransitions Callable Function', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock chain setup
    mockCollection.mockReturnValue({ doc: mockDoc })
    mockDoc.mockReturnValue({
      collection: mockCollection,
      get: mockGet,
    })
    mockWhere.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy })
    mockOrderBy.mockReturnValue({
      where: mockWhere,
      limit: mockLimit,
      offset: mockOffset,
      count: mockCount,
    })
    mockLimit.mockReturnValue({ offset: mockOffset, get: mockGet })
    mockOffset.mockReturnValue({ get: mockGet })
    mockCount.mockReturnValue({ get: mockGet })
    mockGetAll.mockResolvedValue([])
  })

  describe('authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const request = {
        auth: null,
        data: { familyId: 'family-123' },
      }

      await expect(getLocationTransitions(request as any)).rejects.toThrow(HttpsError)
      await expect(getLocationTransitions(request as any)).rejects.toThrow('Must be signed in')
    })

    it('should reject requests without uid', async () => {
      const request = {
        auth: {},
        data: { familyId: 'family-123' },
      }

      await expect(getLocationTransitions(request as any)).rejects.toThrow(HttpsError)
    })
  })

  describe('input validation', () => {
    it('should reject missing familyId', async () => {
      const request = {
        auth: { uid: 'user-123' },
        data: {},
      }

      await expect(getLocationTransitions(request as any)).rejects.toThrow(HttpsError)
      await expect(getLocationTransitions(request as any)).rejects.toThrow('Invalid input')
    })

    it('should reject invalid pageSize', async () => {
      const request = {
        auth: { uid: 'user-123' },
        data: { familyId: 'family-123', pageSize: 101 },
      }

      await expect(getLocationTransitions(request as any)).rejects.toThrow(HttpsError)
    })
  })

  describe('authorization', () => {
    it('should reject users not in family', async () => {
      const request = {
        auth: { uid: 'outsider-123' },
        data: { familyId: 'family-123' },
      }

      mockCollection.mockImplementation((name: string) => {
        if (name === 'families') {
          return {
            doc: () => ({
              get: () =>
                Promise.resolve({
                  exists: true,
                  data: () => ({
                    guardians: [{ id: 'parent-1' }],
                    children: [{ id: 'child-1' }],
                  }),
                }),
              collection: mockCollection,
            }),
          }
        }
        return { doc: mockDoc }
      })

      await expect(getLocationTransitions(request as any)).rejects.toThrow(HttpsError)
      await expect(getLocationTransitions(request as any)).rejects.toThrow('Not a member')
    })

    it('should allow guardians to access', async () => {
      const request = {
        auth: { uid: 'parent-1' },
        data: { familyId: 'family-123' },
      }

      mockCollection.mockImplementation((name: string) => {
        if (name === 'families') {
          return {
            doc: () => ({
              get: () =>
                Promise.resolve({
                  exists: true,
                  data: () => ({
                    guardians: [{ id: 'parent-1' }],
                    children: [{ id: 'child-1' }],
                  }),
                }),
              collection: (subName: string) => {
                if (subName === 'locationTransitions') {
                  return {
                    orderBy: () => ({
                      where: mockWhere,
                      limit: () => ({
                        offset: () => ({
                          get: () => Promise.resolve({ docs: [] }),
                        }),
                      }),
                      count: () => ({
                        get: () => Promise.resolve({ data: () => ({ count: 0 }) }),
                      }),
                    }),
                  }
                }
                return { doc: mockDoc }
              },
            }),
          }
        }
        return { doc: mockDoc }
      })

      const result = await getLocationTransitions(request as any)
      expect(result).toBeDefined()
      expect(result.transitions).toEqual([])
    })

    it('should restrict children to only see their own transitions', async () => {
      const request = {
        auth: { uid: 'child-1' },
        data: { familyId: 'family-123', childId: 'child-2' }, // Trying to see another child
      }

      let queriedChildId: string | null = null

      mockCollection.mockImplementation((name: string) => {
        if (name === 'families') {
          return {
            doc: () => ({
              get: () =>
                Promise.resolve({
                  exists: true,
                  data: () => ({
                    guardians: [{ id: 'parent-1' }],
                    children: [{ id: 'child-1' }, { id: 'child-2' }],
                  }),
                }),
              collection: (subName: string) => {
                if (subName === 'locationTransitions') {
                  return {
                    orderBy: () => ({
                      where: (field: string, _op: string, value: string) => {
                        if (field === 'childId') {
                          queriedChildId = value
                        }
                        return {
                          where: mockWhere,
                          limit: () => ({
                            offset: () => ({
                              get: () => Promise.resolve({ docs: [] }),
                            }),
                          }),
                          count: () => ({
                            get: () => Promise.resolve({ data: () => ({ count: 0 }) }),
                          }),
                        }
                      },
                      limit: () => ({
                        offset: () => ({
                          get: () => Promise.resolve({ docs: [] }),
                        }),
                      }),
                      count: () => ({
                        get: () => Promise.resolve({ data: () => ({ count: 0 }) }),
                      }),
                    }),
                  }
                }
                return { doc: mockDoc }
              },
            }),
          }
        }
        return { doc: mockDoc }
      })

      await getLocationTransitions(request as any)

      // Should have overridden childId to the requesting child's ID
      expect(queriedChildId).toBe('child-1')
    })
  })

  describe('pagination', () => {
    it('should return paginated results', async () => {
      const request = {
        auth: { uid: 'parent-1' },
        data: { familyId: 'family-123', page: 2, pageSize: 10 },
      }

      const transitionDoc = {
        id: 'trans-1',
        data: () => ({
          familyId: 'family-123',
          childId: 'child-1',
          deviceId: 'device-1',
          fromZoneId: null,
          toZoneId: 'zone-school',
          detectedAt: { toDate: () => new Date() },
          gracePeriodEndsAt: { toDate: () => new Date() },
          appliedAt: { toDate: () => new Date() },
          notificationSentAt: null,
          rulesApplied: null,
        }),
      }

      // Mock getAll for zone lookup
      mockGetAll.mockResolvedValueOnce([
        { id: 'zone-school', exists: true, data: () => ({ name: 'School' }) },
      ])

      mockCollection.mockImplementation((name: string) => {
        if (name === 'families') {
          return {
            doc: () => ({
              get: () =>
                Promise.resolve({
                  exists: true,
                  data: () => ({
                    guardians: [{ id: 'parent-1' }],
                    children: [],
                  }),
                }),
              collection: (subName: string) => {
                if (subName === 'locationTransitions') {
                  return {
                    orderBy: () => ({
                      limit: () => ({
                        offset: () => ({
                          get: () => Promise.resolve({ docs: [transitionDoc] }),
                        }),
                      }),
                      count: () => ({
                        get: () => Promise.resolve({ data: () => ({ count: 25 }) }),
                      }),
                    }),
                  }
                }
                if (subName === 'locationZones') {
                  return {
                    doc: () => ({
                      // Returns a doc ref for getAll
                    }),
                  }
                }
                return { doc: mockDoc }
              },
            }),
          }
        }
        return { doc: mockDoc }
      })

      const result = await getLocationTransitions(request as any)

      expect(result.page).toBe(2)
      expect(result.pageSize).toBe(10)
      expect(result.totalCount).toBe(25)
      expect(result.hasMore).toBe(true)
    })

    it('should use default pagination values', async () => {
      const request = {
        auth: { uid: 'parent-1' },
        data: { familyId: 'family-123' },
      }

      mockCollection.mockImplementation((name: string) => {
        if (name === 'families') {
          return {
            doc: () => ({
              get: () =>
                Promise.resolve({
                  exists: true,
                  data: () => ({
                    guardians: [{ id: 'parent-1' }],
                    children: [],
                  }),
                }),
              collection: (subName: string) => {
                if (subName === 'locationTransitions') {
                  return {
                    orderBy: () => ({
                      limit: () => ({
                        offset: () => ({
                          get: () => Promise.resolve({ docs: [] }),
                        }),
                      }),
                      count: () => ({
                        get: () => Promise.resolve({ data: () => ({ count: 0 }) }),
                      }),
                    }),
                  }
                }
                return { doc: mockDoc }
              },
            }),
          }
        }
        return { doc: mockDoc }
      })

      const result = await getLocationTransitions(request as any)

      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
    })
  })

  describe('zone name resolution', () => {
    it('should include zone names in response', async () => {
      const request = {
        auth: { uid: 'parent-1' },
        data: { familyId: 'family-123' },
      }

      const transitionDoc = {
        id: 'trans-1',
        data: () => ({
          familyId: 'family-123',
          childId: 'child-1',
          deviceId: 'device-1',
          fromZoneId: 'zone-home',
          toZoneId: 'zone-school',
          detectedAt: { toDate: () => new Date() },
          gracePeriodEndsAt: { toDate: () => new Date() },
          appliedAt: null,
          notificationSentAt: null,
          rulesApplied: null,
        }),
      }

      // Mock getAll to return zone documents
      mockGetAll.mockResolvedValueOnce([
        { id: 'zone-home', exists: true, data: () => ({ name: 'Home' }) },
        { id: 'zone-school', exists: true, data: () => ({ name: 'School' }) },
      ])

      mockCollection.mockImplementation((name: string) => {
        if (name === 'families') {
          return {
            doc: () => ({
              get: () =>
                Promise.resolve({
                  exists: true,
                  data: () => ({
                    guardians: [{ id: 'parent-1' }],
                    children: [],
                  }),
                }),
              collection: (subName: string) => {
                if (subName === 'locationTransitions') {
                  return {
                    orderBy: () => ({
                      limit: () => ({
                        offset: () => ({
                          get: () => Promise.resolve({ docs: [transitionDoc] }),
                        }),
                      }),
                      count: () => ({
                        get: () => Promise.resolve({ data: () => ({ count: 1 }) }),
                      }),
                    }),
                  }
                }
                if (subName === 'locationZones') {
                  return {
                    doc: (_zoneId: string) => ({
                      // Returns a doc ref for getAll
                    }),
                  }
                }
                return { doc: mockDoc }
              },
            }),
          }
        }
        return { doc: mockDoc }
      })

      const result = await getLocationTransitions(request as any)

      expect(result.transitions[0].fromZoneName).toBe('Home')
      expect(result.transitions[0].toZoneName).toBe('School')
    })

    it('should handle deleted zones', async () => {
      const request = {
        auth: { uid: 'parent-1' },
        data: { familyId: 'family-123' },
      }

      const transitionDoc = {
        id: 'trans-1',
        data: () => ({
          familyId: 'family-123',
          childId: 'child-1',
          deviceId: 'device-1',
          fromZoneId: null,
          toZoneId: 'zone-deleted',
          detectedAt: { toDate: () => new Date() },
          gracePeriodEndsAt: { toDate: () => new Date() },
          appliedAt: null,
          notificationSentAt: null,
          rulesApplied: null,
        }),
      }

      // Mock getAll to return zone as not existing
      mockGetAll.mockResolvedValueOnce([{ id: 'zone-deleted', exists: false }])

      mockCollection.mockImplementation((name: string) => {
        if (name === 'families') {
          return {
            doc: () => ({
              get: () =>
                Promise.resolve({
                  exists: true,
                  data: () => ({
                    guardians: [{ id: 'parent-1' }],
                    children: [],
                  }),
                }),
              collection: (subName: string) => {
                if (subName === 'locationTransitions') {
                  return {
                    orderBy: () => ({
                      limit: () => ({
                        offset: () => ({
                          get: () => Promise.resolve({ docs: [transitionDoc] }),
                        }),
                      }),
                      count: () => ({
                        get: () => Promise.resolve({ data: () => ({ count: 1 }) }),
                      }),
                    }),
                  }
                }
                if (subName === 'locationZones') {
                  return {
                    doc: () => ({
                      // Returns a doc ref for getAll
                    }),
                  }
                }
                return { doc: mockDoc }
              },
            }),
          }
        }
        return { doc: mockDoc }
      })

      const result = await getLocationTransitions(request as any)

      // Should return null for deleted zone name
      expect(result.transitions[0].toZoneName).toBeNull()
    })
  })

  describe('date filtering', () => {
    it('should filter by date range', async () => {
      const request = {
        auth: { uid: 'parent-1' },
        data: {
          familyId: 'family-123',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
      }

      let startDateFilter: Date | null = null
      let endDateFilter: Date | null = null

      mockCollection.mockImplementation((name: string) => {
        if (name === 'families') {
          return {
            doc: () => ({
              get: () =>
                Promise.resolve({
                  exists: true,
                  data: () => ({
                    guardians: [{ id: 'parent-1' }],
                    children: [],
                  }),
                }),
              collection: (subName: string) => {
                if (subName === 'locationTransitions') {
                  return {
                    orderBy: () => ({
                      where: (field: string, op: string, value: any) => {
                        if (field === 'detectedAt' && op === '>=') {
                          startDateFilter = value.toDate()
                        }
                        if (field === 'detectedAt' && op === '<=') {
                          endDateFilter = value.toDate()
                        }
                        return {
                          where: (f: string, o: string, v: any) => {
                            if (f === 'detectedAt' && o === '<=') {
                              endDateFilter = v.toDate()
                            }
                            return {
                              limit: () => ({
                                offset: () => ({
                                  get: () => Promise.resolve({ docs: [] }),
                                }),
                              }),
                              count: () => ({
                                get: () => Promise.resolve({ data: () => ({ count: 0 }) }),
                              }),
                            }
                          },
                          limit: () => ({
                            offset: () => ({
                              get: () => Promise.resolve({ docs: [] }),
                            }),
                          }),
                          count: () => ({
                            get: () => Promise.resolve({ data: () => ({ count: 0 }) }),
                          }),
                        }
                      },
                      limit: () => ({
                        offset: () => ({
                          get: () => Promise.resolve({ docs: [] }),
                        }),
                      }),
                      count: () => ({
                        get: () => Promise.resolve({ data: () => ({ count: 0 }) }),
                      }),
                    }),
                  }
                }
                return { doc: mockDoc }
              },
            }),
          }
        }
        return { doc: mockDoc }
      })

      await getLocationTransitions(request as any)

      expect(startDateFilter).toEqual(new Date('2024-01-01'))
      expect(endDateFilter).toEqual(new Date('2024-12-31'))
    })
  })

  describe('family not found', () => {
    it('should throw not-found error', async () => {
      const request = {
        auth: { uid: 'parent-1' },
        data: { familyId: 'nonexistent-family' },
      }

      mockCollection.mockImplementation((name: string) => {
        if (name === 'families') {
          return {
            doc: () => ({
              get: () => Promise.resolve({ exists: false }),
            }),
          }
        }
        return { doc: mockDoc }
      })

      await expect(getLocationTransitions(request as any)).rejects.toThrow(HttpsError)
      await expect(getLocationTransitions(request as any)).rejects.toThrow('Family not found')
    })
  })
})
