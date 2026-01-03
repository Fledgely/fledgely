/**
 * Tests for getChildLocationHistory callable function.
 * Story 40.5: AC3 - Location History Access (bilateral transparency)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LOCATION_PRIVACY_MESSAGES } from '@fledgely/shared'

// Mock firebase-admin/firestore
const mockGet = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockOffset = vi.fn()
const mockLimit = vi.fn()
const mockCount = vi.fn()
const mockCollection = vi.fn()
const mockDoc = vi.fn()
const mockGetAll = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
    getAll: mockGetAll,
  }),
}))

vi.mock('firebase-functions/v2/https', () => ({
  onCall: (_handler: (request: unknown) => Promise<unknown>) => _handler,
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message)
    }
  },
}))

import { getChildLocationHistory } from './getChildLocationHistory'

describe('getChildLocationHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock chain
    mockCollection.mockReturnValue({ doc: mockDoc })
    mockDoc.mockReturnValue({
      get: mockGet,
      collection: mockCollection,
    })
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, count: mockCount })
    mockOrderBy.mockReturnValue({ offset: mockOffset })
    mockOffset.mockReturnValue({ limit: mockLimit })
    mockLimit.mockReturnValue({ get: mockGet })
    mockCount.mockReturnValue({ get: mockGet })
    mockGetAll.mockResolvedValue([])
  })

  it('throws unauthenticated error if not logged in', async () => {
    await expect(
      getChildLocationHistory({
        auth: null,
        data: { familyId: 'fam-1', childId: 'child-1' },
      } as never)
    ).rejects.toThrow('Must be logged in')
  })

  it('throws invalid-argument for invalid input', async () => {
    await expect(
      getChildLocationHistory({ auth: { uid: 'user-1' }, data: {} } as never)
    ).rejects.toThrow('Invalid input')
  })

  it('throws not-found if family does not exist', async () => {
    mockGet.mockResolvedValueOnce({ exists: false })

    await expect(
      getChildLocationHistory({
        auth: { uid: 'user-1' },
        data: { familyId: 'fam-1', childId: 'child-1' },
      } as never)
    ).rejects.toThrow('Family not found')
  })

  it('throws permission-denied if caller is not child or guardian', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        children: [{ id: 'child-1', uid: 'other-uid' }],
        guardians: [{ uid: 'guardian-uid' }],
      }),
    })

    await expect(
      getChildLocationHistory({
        auth: { uid: 'unauthorized-uid' },
        data: { familyId: 'fam-1', childId: 'child-1' },
      } as never)
    ).rejects.toThrow('Not authorized')
  })

  it('returns empty history when location features disabled', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: false,
        children: [{ id: 'child-1', uid: 'child-uid' }],
        guardians: [],
      }),
    })

    const result = await getChildLocationHistory({
      auth: { uid: 'child-uid' },
      data: { familyId: 'fam-1', childId: 'child-1' },
    } as never)

    expect(result.history).toEqual([])
    expect(result.totalCount).toBe(0)
    expect(result.transparencyNote).toBe(LOCATION_PRIVACY_MESSAGES.locationOff)
  })

  it('returns empty history when no transitions exist', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: true,
        children: [{ id: 'child-1', uid: 'child-uid' }],
        guardians: [],
      }),
    })

    mockCollection.mockImplementation((name: string) => {
      if (name === 'families') {
        return { doc: mockDoc }
      }
      if (name === 'locationTransitions') {
        return { where: mockWhere }
      }
      return { doc: mockDoc }
    })

    // Count query
    mockGet.mockResolvedValueOnce({ data: () => ({ count: 0 }) })
    // Transitions query
    mockGet.mockResolvedValueOnce({ docs: [] })

    const result = await getChildLocationHistory({
      auth: { uid: 'child-uid' },
      data: { familyId: 'fam-1', childId: 'child-1' },
    } as never)

    expect(result.history).toEqual([])
    expect(result.totalCount).toBe(0)
    expect(result.hasMore).toBe(false)
    expect(result.transparencyNote).toBe(LOCATION_PRIVACY_MESSAGES.transparencyNote)
  })

  it('returns paginated history with zone names', async () => {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: true,
        children: [{ id: 'child-1', uid: 'child-uid' }],
        guardians: [],
      }),
    })

    mockCollection.mockImplementation((name: string) => {
      if (name === 'families') {
        return { doc: mockDoc }
      }
      if (name === 'locationTransitions') {
        return { where: mockWhere }
      }
      if (name === 'locationZones') {
        return { doc: mockDoc }
      }
      return { doc: mockDoc }
    })

    // Count query
    mockGet.mockResolvedValueOnce({ data: () => ({ count: 2 }) })

    // Transitions query
    mockGet.mockResolvedValueOnce({
      docs: [
        {
          id: 'trans-1',
          data: () => ({
            childId: 'child-1',
            fromZoneId: 'zone-home',
            toZoneId: 'zone-school',
            detectedAt: { toDate: () => now },
          }),
        },
        {
          id: 'trans-2',
          data: () => ({
            childId: 'child-1',
            fromZoneId: null,
            toZoneId: 'zone-home',
            detectedAt: { toDate: () => oneHourAgo },
          }),
        },
      ],
    })

    // Zone documents (getAll batch)
    mockGetAll.mockResolvedValueOnce([
      { id: 'zone-home', exists: true, data: () => ({ name: 'Home' }) },
      { id: 'zone-school', exists: true, data: () => ({ name: 'School' }) },
    ])

    const result = await getChildLocationHistory({
      auth: { uid: 'child-uid' },
      data: { familyId: 'fam-1', childId: 'child-1' },
    } as never)

    expect(result.history).toHaveLength(2)
    expect(result.history[0].fromZoneName).toBe('Home')
    expect(result.history[0].toZoneName).toBe('School')
    expect(result.history[1].fromZoneName).toBeNull()
    expect(result.history[1].toZoneName).toBe('Home')
    expect(result.totalCount).toBe(2)
    expect(result.hasMore).toBe(false)
  })

  it('calculates duration between transitions', async () => {
    const now = new Date()
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000)

    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: true,
        children: [{ id: 'child-1', uid: 'child-uid' }],
        guardians: [],
      }),
    })

    mockCollection.mockImplementation((name: string) => {
      if (name === 'families') {
        return { doc: mockDoc }
      }
      if (name === 'locationTransitions') {
        return { where: mockWhere }
      }
      return { doc: mockDoc }
    })

    mockGet.mockResolvedValueOnce({ data: () => ({ count: 2 }) })

    mockGet.mockResolvedValueOnce({
      docs: [
        {
          id: 'trans-1',
          data: () => ({
            childId: 'child-1',
            fromZoneId: null,
            toZoneId: null,
            detectedAt: { toDate: () => now },
          }),
        },
        {
          id: 'trans-2',
          data: () => ({
            childId: 'child-1',
            fromZoneId: null,
            toZoneId: null,
            detectedAt: { toDate: () => thirtyMinAgo },
          }),
        },
      ],
    })

    const result = await getChildLocationHistory({
      auth: { uid: 'child-uid' },
      data: { familyId: 'fam-1', childId: 'child-1' },
    } as never)

    // First transition has duration (time since previous)
    expect(result.history[0].durationMinutes).toBe(30)
    // Last transition has no duration
    expect(result.history[1].durationMinutes).toBeNull()
  })

  it('handles pagination correctly', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: true,
        children: [{ id: 'child-1', uid: 'child-uid' }],
        guardians: [],
      }),
    })

    mockCollection.mockImplementation((name: string) => {
      if (name === 'families') {
        return { doc: mockDoc }
      }
      if (name === 'locationTransitions') {
        return { where: mockWhere }
      }
      return { doc: mockDoc }
    })

    // Total count is 50
    mockGet.mockResolvedValueOnce({ data: () => ({ count: 50 }) })

    // Page 2 with 20 items per page
    mockGet.mockResolvedValueOnce({
      docs: Array(20)
        .fill(null)
        .map((_, i) => ({
          id: `trans-${i + 20}`,
          data: () => ({
            childId: 'child-1',
            fromZoneId: null,
            toZoneId: null,
            detectedAt: { toDate: () => new Date() },
          }),
        })),
    })

    const result = await getChildLocationHistory({
      auth: { uid: 'child-uid' },
      data: { familyId: 'fam-1', childId: 'child-1', page: 2, pageSize: 20 },
    } as never)

    expect(result.page).toBe(2)
    expect(result.pageSize).toBe(20)
    expect(result.totalCount).toBe(50)
    expect(result.hasMore).toBe(true) // 40 items viewed, 10 remaining
  })

  it('allows guardian to view child history', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: true,
        children: [{ id: 'child-1', uid: 'child-uid' }],
        guardians: [{ uid: 'guardian-uid' }],
      }),
    })

    mockCollection.mockImplementation((name: string) => {
      if (name === 'families') {
        return { doc: mockDoc }
      }
      if (name === 'locationTransitions') {
        return { where: mockWhere }
      }
      return { doc: mockDoc }
    })

    mockGet.mockResolvedValueOnce({ data: () => ({ count: 0 }) })
    mockGet.mockResolvedValueOnce({ docs: [] })

    const result = await getChildLocationHistory({
      auth: { uid: 'guardian-uid' },
      data: { familyId: 'fam-1', childId: 'child-1' },
    } as never)

    expect(result.totalCount).toBe(0)
    expect(result.transparencyNote).toBe(LOCATION_PRIVACY_MESSAGES.transparencyNote)
  })

  it('includes time description for each item', async () => {
    const now = new Date()

    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: true,
        children: [{ id: 'child-1', uid: 'child-uid' }],
        guardians: [],
      }),
    })

    mockCollection.mockImplementation((name: string) => {
      if (name === 'families') {
        return { doc: mockDoc }
      }
      if (name === 'locationTransitions') {
        return { where: mockWhere }
      }
      return { doc: mockDoc }
    })

    mockGet.mockResolvedValueOnce({ data: () => ({ count: 1 }) })
    mockGet.mockResolvedValueOnce({
      docs: [
        {
          id: 'trans-1',
          data: () => ({
            childId: 'child-1',
            fromZoneId: null,
            toZoneId: null,
            detectedAt: { toDate: () => now },
          }),
        },
      ],
    })

    const result = await getChildLocationHistory({
      auth: { uid: 'child-uid' },
      data: { familyId: 'fam-1', childId: 'child-1' },
    } as never)

    expect(result.history[0].timeDescription).toBe('just now')
  })
})
