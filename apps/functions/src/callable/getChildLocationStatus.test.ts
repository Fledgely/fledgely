/**
 * Tests for getChildLocationStatus callable function.
 * Story 40.5: AC2 - Current Location Status Display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LOCATION_PRIVACY_MESSAGES } from '@fledgely/shared'

// Mock firebase-admin/firestore
const mockGet = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockLimit = vi.fn()
const mockCollection = vi.fn()
const mockDoc = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
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

import { getChildLocationStatus } from './getChildLocationStatus'

describe('getChildLocationStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock chain
    mockCollection.mockReturnValue({ doc: mockDoc })
    mockDoc.mockReturnValue({
      get: mockGet,
      collection: mockCollection,
    })
    mockWhere.mockReturnValue({ orderBy: mockOrderBy })
    mockOrderBy.mockReturnValue({ limit: mockLimit })
    mockLimit.mockReturnValue({ get: mockGet })
  })

  it('throws unauthenticated error if not logged in', async () => {
    await expect(
      getChildLocationStatus({
        auth: null,
        data: { familyId: 'fam-1', childId: 'child-1' },
      } as never)
    ).rejects.toThrow('Must be logged in')
  })

  it('throws invalid-argument for invalid input', async () => {
    await expect(
      getChildLocationStatus({ auth: { uid: 'user-1' }, data: {} } as never)
    ).rejects.toThrow('Invalid input')
  })

  it('throws not-found if family does not exist', async () => {
    mockGet.mockResolvedValueOnce({ exists: false })

    await expect(
      getChildLocationStatus({
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
      getChildLocationStatus({
        auth: { uid: 'unauthorized-uid' },
        data: { familyId: 'fam-1', childId: 'child-1' },
      } as never)
    ).rejects.toThrow('Not authorized')
  })

  it('returns locationOff message when location features disabled', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: false,
        children: [{ id: 'child-1', uid: 'child-uid' }],
        guardians: [],
      }),
    })

    const result = await getChildLocationStatus({
      auth: { uid: 'child-uid' },
      data: { familyId: 'fam-1', childId: 'child-1' },
    } as never)

    expect(result.status.locationFeaturesEnabled).toBe(false)
    expect(result.message).toBe(LOCATION_PRIVACY_MESSAGES.locationOff)
  })

  it('returns unknownLocation when no device locations exist', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: true,
        children: [{ id: 'child-1', uid: 'child-uid' }],
        guardians: [],
      }),
    })

    // Mock collection chain for deviceLocations
    mockCollection.mockImplementation((name: string) => {
      if (name === 'families') {
        return { doc: mockDoc }
      }
      if (name === 'deviceLocations') {
        return { where: mockWhere }
      }
      return { doc: mockDoc }
    })

    mockGet.mockResolvedValueOnce({ empty: true, docs: [] })

    const result = await getChildLocationStatus({
      auth: { uid: 'child-uid' },
      data: { familyId: 'fam-1', childId: 'child-1' },
    } as never)

    expect(result.status.currentZoneId).toBeNull()
    expect(result.message).toBe(LOCATION_PRIVACY_MESSAGES.unknownLocation)
  })

  it('returns unknownLocation when device has no zone', async () => {
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
      if (name === 'deviceLocations') {
        return { where: mockWhere }
      }
      return { doc: mockDoc }
    })

    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          data: () => ({
            childId: 'child-1',
            zoneId: null,
            updatedAt: { toDate: () => new Date() },
          }),
        },
      ],
    })

    const result = await getChildLocationStatus({
      auth: { uid: 'child-uid' },
      data: { familyId: 'fam-1', childId: 'child-1' },
    } as never)

    expect(result.status.currentZoneId).toBeNull()
    expect(result.message).toBe(LOCATION_PRIVACY_MESSAGES.unknownLocation)
  })

  it('returns zone with owner name when in a zone', async () => {
    const mockDate = new Date('2024-01-15T10:00:00Z')

    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: true,
        children: [{ id: 'child-1', uid: 'child-uid' }],
        guardians: [{ uid: 'mom-uid', name: 'Mom' }],
      }),
    })

    mockCollection.mockImplementation((name: string) => {
      if (name === 'families') {
        return { doc: mockDoc }
      }
      if (name === 'deviceLocations') {
        return { where: mockWhere }
      }
      if (name === 'locationZones') {
        return { doc: mockDoc }
      }
      return { doc: mockDoc }
    })

    // Device location
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          data: () => ({
            childId: 'child-1',
            zoneId: 'zone-home',
            updatedAt: { toDate: () => mockDate },
          }),
        },
      ],
    })

    // Zone document
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        name: 'Home',
        createdByUid: 'mom-uid',
      }),
    })

    const result = await getChildLocationStatus({
      auth: { uid: 'child-uid' },
      data: { familyId: 'fam-1', childId: 'child-1' },
    } as never)

    expect(result.status.currentZoneId).toBe('zone-home')
    expect(result.status.currentZoneName).toBe('Home')
    expect(result.status.zoneOwnerName).toBe('Mom')
    expect(result.status.locationFeaturesEnabled).toBe(true)
    expect(result.message).toBe("At: Home (Mom's)")
  })

  it('allows guardian to view child status', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: true,
        children: [{ id: 'child-1', uid: 'child-uid' }],
        guardians: [{ uid: 'guardian-uid', name: 'Mom' }],
      }),
    })

    mockCollection.mockImplementation((name: string) => {
      if (name === 'families') {
        return { doc: mockDoc }
      }
      if (name === 'deviceLocations') {
        return { where: mockWhere }
      }
      if (name === 'locationZones') {
        return { doc: mockDoc }
      }
      return { doc: mockDoc }
    })

    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          data: () => ({
            childId: 'child-1',
            zoneId: 'zone-school',
            updatedAt: { toDate: () => new Date() },
          }),
        },
      ],
    })

    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        name: 'School',
        createdByUid: 'guardian-uid',
      }),
    })

    const result = await getChildLocationStatus({
      auth: { uid: 'guardian-uid' },
      data: { familyId: 'fam-1', childId: 'child-1' },
    } as never)

    expect(result.status.currentZoneName).toBe('School')
  })

  it('returns zone name without owner when owner not found', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: true,
        children: [{ id: 'child-1', uid: 'child-uid' }],
        guardians: [{ uid: 'mom-uid', name: 'Mom' }],
      }),
    })

    mockCollection.mockImplementation((name: string) => {
      if (name === 'families') {
        return { doc: mockDoc }
      }
      if (name === 'deviceLocations') {
        return { where: mockWhere }
      }
      if (name === 'locationZones') {
        return { doc: mockDoc }
      }
      return { doc: mockDoc }
    })

    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          data: () => ({
            childId: 'child-1',
            zoneId: 'zone-1',
            updatedAt: { toDate: () => new Date() },
          }),
        },
      ],
    })

    // Zone with unknown owner
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        name: 'Library',
        createdByUid: 'unknown-uid',
      }),
    })

    const result = await getChildLocationStatus({
      auth: { uid: 'child-uid' },
      data: { familyId: 'fam-1', childId: 'child-1' },
    } as never)

    expect(result.status.currentZoneName).toBe('Library')
    expect(result.status.zoneOwnerName).toBeNull()
    expect(result.message).toBe('At: Library')
  })

  it('handles zone document not found', async () => {
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
      if (name === 'deviceLocations') {
        return { where: mockWhere }
      }
      if (name === 'locationZones') {
        return { doc: mockDoc }
      }
      return { doc: mockDoc }
    })

    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          data: () => ({
            childId: 'child-1',
            zoneId: 'deleted-zone',
            updatedAt: { toDate: () => new Date() },
          }),
        },
      ],
    })

    // Zone not found
    mockGet.mockResolvedValueOnce({ exists: false })

    const result = await getChildLocationStatus({
      auth: { uid: 'child-uid' },
      data: { familyId: 'fam-1', childId: 'child-1' },
    } as never)

    expect(result.status.currentZoneId).toBe('deleted-zone')
    expect(result.status.currentZoneName).toBeNull()
    expect(result.message).toBe(LOCATION_PRIVACY_MESSAGES.unknownLocation)
  })
})
