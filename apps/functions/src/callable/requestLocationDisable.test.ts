/**
 * Tests for requestLocationDisable callable function.
 * Story 40.5: AC6 - Request Disable Feature
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LOCATION_PRIVACY_MESSAGES, LOCATION_DISABLE_REQUEST_MESSAGES } from '@fledgely/shared'

// Mock firebase-admin/firestore
const mockGet = vi.fn()
const mockSet = vi.fn()
const mockWhere = vi.fn()
const mockLimit = vi.fn()
const mockCollection = vi.fn()
const mockDoc = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
  }),
  Timestamp: {
    now: () => ({ toDate: () => new Date() }),
  },
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

import { requestLocationDisable } from './requestLocationDisable'

describe('requestLocationDisable', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock chain
    mockCollection.mockReturnValue({ doc: mockDoc })
    mockDoc.mockReturnValue({
      id: 'request-123',
      get: mockGet,
      set: mockSet,
      collection: mockCollection,
    })
    mockWhere.mockReturnValue({ where: mockWhere, limit: mockLimit })
    mockLimit.mockReturnValue({ get: mockGet })
    mockSet.mockResolvedValue(undefined)
  })

  it('throws unauthenticated error if not logged in', async () => {
    await expect(
      requestLocationDisable({ auth: null, data: { familyId: 'fam-1' } } as never)
    ).rejects.toThrow('Must be logged in')
  })

  it('throws invalid-argument for invalid input', async () => {
    await expect(
      requestLocationDisable({ auth: { uid: 'user-1' }, data: {} } as never)
    ).rejects.toThrow('Invalid input')
  })

  it('throws not-found if family does not exist', async () => {
    mockGet.mockResolvedValueOnce({ exists: false })

    await expect(
      requestLocationDisable({
        auth: { uid: 'user-1' },
        data: { familyId: 'fam-1' },
      } as never)
    ).rejects.toThrow('Family not found')
  })

  it('throws permission-denied if caller is not a child', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: true,
        children: [{ id: 'child-1', uid: 'other-uid', name: 'Emma' }],
        guardians: [{ uid: 'parent-uid' }],
      }),
    })

    await expect(
      requestLocationDisable({
        auth: { uid: 'parent-uid' },
        data: { familyId: 'fam-1' },
      } as never)
    ).rejects.toThrow('Only children can request')
  })

  it('throws failed-precondition if location features not enabled', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: false,
        children: [{ id: 'child-1', uid: 'child-uid', name: 'Emma' }],
        guardians: [],
      }),
    })

    await expect(
      requestLocationDisable({
        auth: { uid: 'child-uid' },
        data: { familyId: 'fam-1' },
      } as never)
    ).rejects.toThrow('Location features are not enabled')
  })

  it('throws already-exists if pending request exists', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: true,
        children: [{ id: 'child-1', uid: 'child-uid', name: 'Emma' }],
        guardians: [],
      }),
    })

    mockCollection.mockImplementation((name: string) => {
      if (name === 'families') {
        return { doc: mockDoc }
      }
      if (name === 'locationDisableRequests') {
        return { where: mockWhere, doc: mockDoc }
      }
      return { doc: mockDoc }
    })

    // Existing pending request found
    mockGet.mockResolvedValueOnce({ empty: false })

    await expect(
      requestLocationDisable({
        auth: { uid: 'child-uid' },
        data: { familyId: 'fam-1' },
      } as never)
    ).rejects.toThrow('pending request already exists')
  })

  it('creates request without reason', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: true,
        children: [{ id: 'child-1', uid: 'child-uid', name: 'Emma' }],
        guardians: [{ uid: 'parent-uid', id: 'guardian-1' }],
      }),
    })

    mockCollection.mockImplementation((name: string) => {
      if (name === 'families') {
        return { doc: mockDoc }
      }
      if (name === 'locationDisableRequests') {
        return { where: mockWhere, doc: mockDoc }
      }
      if (name === 'notifications') {
        return { doc: mockDoc }
      }
      if (name === 'auditLog') {
        return { doc: mockDoc }
      }
      return { doc: mockDoc }
    })

    // No existing pending request
    mockGet.mockResolvedValueOnce({ empty: true })

    const result = await requestLocationDisable({
      auth: { uid: 'child-uid' },
      data: { familyId: 'fam-1' },
    } as never)

    expect(result.requestId).toBe('request-123')
    expect(result.message).toBe(LOCATION_PRIVACY_MESSAGES.requestSent)
    expect(result.status).toBe('pending')
    expect(mockSet).toHaveBeenCalledTimes(3) // request + notification + audit
  })

  it('creates request with reason', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: true,
        children: [{ id: 'child-1', uid: 'child-uid', name: 'Emma' }],
        guardians: [{ uid: 'parent-uid', id: 'guardian-1' }],
      }),
    })

    mockCollection.mockImplementation((name: string) => {
      if (name === 'families') {
        return { doc: mockDoc }
      }
      if (name === 'locationDisableRequests') {
        return { where: mockWhere, doc: mockDoc }
      }
      if (name === 'notifications') {
        return { doc: mockDoc }
      }
      if (name === 'auditLog') {
        return { doc: mockDoc }
      }
      return { doc: mockDoc }
    })

    mockGet.mockResolvedValueOnce({ empty: true })

    const result = await requestLocationDisable({
      auth: { uid: 'child-uid' },
      data: { familyId: 'fam-1', reason: 'I want more privacy' },
    } as never)

    expect(result.requestId).toBe('request-123')

    // Check notification was created with reason
    const notificationCall = mockSet.mock.calls.find(
      (call) => call[0]?.type === 'location_disable_request'
    )
    expect(notificationCall?.[0].message).toContain('I want more privacy')
  })

  it('notifies all guardians', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: true,
        children: [{ id: 'child-1', uid: 'child-uid', name: 'Emma' }],
        guardians: [
          { uid: 'mom-uid', id: 'guardian-1' },
          { uid: 'dad-uid', id: 'guardian-2' },
        ],
      }),
    })

    mockCollection.mockImplementation((name: string) => {
      if (name === 'families') {
        return { doc: mockDoc }
      }
      if (name === 'locationDisableRequests') {
        return { where: mockWhere, doc: mockDoc }
      }
      if (name === 'notifications') {
        return { doc: mockDoc }
      }
      if (name === 'auditLog') {
        return { doc: mockDoc }
      }
      return { doc: mockDoc }
    })

    mockGet.mockResolvedValueOnce({ empty: true })

    await requestLocationDisable({
      auth: { uid: 'child-uid' },
      data: { familyId: 'fam-1' },
    } as never)

    // request + 2 notifications + audit = 4 sets
    expect(mockSet).toHaveBeenCalledTimes(4)

    // Check both guardian notifications
    const notificationCalls = mockSet.mock.calls.filter(
      (call) => call[0]?.type === 'location_disable_request'
    )
    expect(notificationCalls).toHaveLength(2)
  })

  it('creates audit log entry', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: true,
        children: [{ id: 'child-1', uid: 'child-uid', name: 'Emma' }],
        guardians: [],
      }),
    })

    mockCollection.mockImplementation((name: string) => {
      if (name === 'families') {
        return { doc: mockDoc }
      }
      if (name === 'locationDisableRequests') {
        return { where: mockWhere, doc: mockDoc }
      }
      if (name === 'auditLog') {
        return { doc: mockDoc }
      }
      return { doc: mockDoc }
    })

    mockGet.mockResolvedValueOnce({ empty: true })

    await requestLocationDisable({
      auth: { uid: 'child-uid' },
      data: { familyId: 'fam-1' },
    } as never)

    const auditCall = mockSet.mock.calls.find(
      (call) => call[0]?.type === 'location_disable_requested'
    )
    expect(auditCall).toBeDefined()
    expect(auditCall?.[0].actorType).toBe('child')
    expect(auditCall?.[0].childId).toBe('child-1')
  })

  it('includes correct notification message format', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        locationFeaturesEnabled: true,
        children: [{ id: 'child-1', uid: 'child-uid', name: 'Emma' }],
        guardians: [{ uid: 'parent-uid', id: 'guardian-1' }],
      }),
    })

    mockCollection.mockImplementation((name: string) => {
      if (name === 'families') {
        return { doc: mockDoc }
      }
      if (name === 'locationDisableRequests') {
        return { where: mockWhere, doc: mockDoc }
      }
      if (name === 'notifications') {
        return { doc: mockDoc }
      }
      if (name === 'auditLog') {
        return { doc: mockDoc }
      }
      return { doc: mockDoc }
    })

    mockGet.mockResolvedValueOnce({ empty: true })

    await requestLocationDisable({
      auth: { uid: 'child-uid' },
      data: { familyId: 'fam-1' },
    } as never)

    const notificationCall = mockSet.mock.calls.find(
      (call) => call[0]?.type === 'location_disable_request'
    )
    expect(notificationCall?.[0].message).toBe(
      LOCATION_DISABLE_REQUEST_MESSAGES.requestReceived('Emma')
    )
  })
})
