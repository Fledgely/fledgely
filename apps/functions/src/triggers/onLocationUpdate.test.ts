/**
 * onLocationUpdate Trigger Tests - Story 40.4
 *
 * Tests for the Firestore trigger that handles location transition notifications.
 *
 * Acceptance Criteria:
 * - AC2: 5-minute Grace Period
 * - AC3: Transition Notification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore
const mockGet = vi.fn()
const mockSet = vi.fn()
const mockUpdate = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockLimit = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
  }),
  Timestamp: {
    now: () => ({ toDate: () => new Date(), seconds: Math.floor(Date.now() / 1000) }),
    fromDate: (d: Date) => ({ toDate: () => d, seconds: Math.floor(d.getTime() / 1000) }),
  },
}))

// Mock firebase-functions/v2/firestore
vi.mock('firebase-functions/v2/firestore', () => ({
  onDocumentWritten: (_path: string, handler: (event: unknown) => Promise<void>) => handler,
}))

import { onLocationUpdate } from './onLocationUpdate'

describe('onLocationUpdate Trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock chain setup
    mockCollection.mockReturnValue({
      doc: mockDoc,
    })
    mockDoc.mockReturnValue({
      collection: mockCollection,
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
      ref: { update: mockUpdate },
    })
    mockWhere.mockReturnValue({
      where: mockWhere,
      orderBy: mockOrderBy,
      limit: mockLimit,
      get: mockGet,
    })
    mockOrderBy.mockReturnValue({ limit: mockLimit, get: mockGet })
    mockLimit.mockReturnValue({ get: mockGet })
  })

  describe('when document is deleted', () => {
    it('should return early without processing', async () => {
      const event = {
        params: { familyId: 'family-123', deviceId: 'device-456' },
        data: { after: null },
      }

      await onLocationUpdate(event as any)

      // Should not query for transitions
      expect(mockCollection).not.toHaveBeenCalled()
    })
  })

  describe('when no pending transitions', () => {
    it('should return early without sending notifications', async () => {
      const event = {
        params: { familyId: 'family-123', deviceId: 'device-456' },
        data: {
          after: {
            data: () => ({
              deviceId: 'device-456',
              familyId: 'family-123',
              childId: 'child-789',
              latitude: 37.7749,
              longitude: -122.4194,
              accuracyMeters: 50,
              zoneId: 'zone-abc',
            }),
          },
        },
      }

      // Mock transitions query returning empty
      mockCollection.mockImplementation((name: string) => {
        if (name === 'families') {
          return {
            doc: () => ({
              collection: (subName: string) => {
                if (subName === 'locationTransitions') {
                  return {
                    where: () => ({
                      where: () => ({
                        orderBy: () => ({
                          limit: () => ({
                            get: () => Promise.resolve({ empty: true, docs: [] }),
                          }),
                        }),
                      }),
                    }),
                  }
                }
                return { doc: mockDoc }
              },
              get: mockGet,
            }),
          }
        }
        return { doc: mockDoc }
      })

      await onLocationUpdate(event as any)

      // Should not create notifications
      expect(mockSet).not.toHaveBeenCalled()
    })
  })

  describe('when notification already sent', () => {
    it('should return early without sending duplicate', async () => {
      const event = {
        params: { familyId: 'family-123', deviceId: 'device-456' },
        data: {
          after: {
            data: () => ({
              deviceId: 'device-456',
              familyId: 'family-123',
              childId: 'child-789',
              latitude: 37.7749,
              longitude: -122.4194,
              accuracyMeters: 50,
              zoneId: 'zone-abc',
            }),
          },
        },
      }

      // Mock transitions query returning transition with notification already sent
      mockCollection.mockImplementation((name: string) => {
        if (name === 'families') {
          return {
            doc: () => ({
              collection: (subName: string) => {
                if (subName === 'locationTransitions') {
                  return {
                    where: () => ({
                      where: () => ({
                        orderBy: () => ({
                          limit: () => ({
                            get: () =>
                              Promise.resolve({
                                empty: false,
                                docs: [
                                  {
                                    id: 'trans-1',
                                    data: () => ({
                                      deviceId: 'device-456',
                                      childId: 'child-789',
                                      toZoneId: 'zone-abc',
                                      fromZoneId: null,
                                      notificationSentAt: new Date(), // Already sent
                                      gracePeriodEndsAt: {
                                        toDate: () => new Date(Date.now() + 5 * 60 * 1000),
                                      },
                                    }),
                                    ref: { update: mockUpdate },
                                  },
                                ],
                              }),
                          }),
                        }),
                      }),
                    }),
                  }
                }
                return { doc: mockDoc }
              },
              get: mockGet,
            }),
          }
        }
        return { doc: mockDoc }
      })

      await onLocationUpdate(event as any)

      // Should not create notifications or update transition
      expect(mockSet).not.toHaveBeenCalled()
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('when entering a zone', () => {
    it('should send child-friendly notification', async () => {
      const gracePeriodEndsAt = new Date(Date.now() + 5 * 60 * 1000)

      const event = {
        params: { familyId: 'family-123', deviceId: 'device-456' },
        data: {
          after: {
            data: () => ({
              deviceId: 'device-456',
              familyId: 'family-123',
              childId: 'child-789',
              latitude: 37.7749,
              longitude: -122.4194,
              accuracyMeters: 50,
              zoneId: 'zone-school',
            }),
          },
        },
      }

      // Build mock chain for this test
      const transitionDoc = {
        id: 'trans-1',
        data: () => ({
          deviceId: 'device-456',
          childId: 'child-789',
          toZoneId: 'zone-school',
          fromZoneId: null,
          notificationSentAt: null,
          gracePeriodEndsAt: { toDate: () => gracePeriodEndsAt },
        }),
        ref: { update: mockUpdate },
      }

      const familyData = {
        children: [{ id: 'child-789', name: 'Emma' }],
        guardians: [{ id: 'parent-1' }, { id: 'parent-2' }],
      }

      const zoneData = { name: 'School' }

      let notificationCount = 0

      mockCollection.mockImplementation((name: string) => {
        if (name === 'families') {
          return {
            doc: (_id: string) => ({
              collection: (subName: string) => {
                if (subName === 'locationTransitions') {
                  return {
                    where: () => ({
                      where: () => ({
                        orderBy: () => ({
                          limit: () => ({
                            get: () => Promise.resolve({ empty: false, docs: [transitionDoc] }),
                          }),
                        }),
                      }),
                    }),
                  }
                }
                if (subName === 'locationZones') {
                  return {
                    doc: () => ({
                      get: () => Promise.resolve({ exists: true, data: () => zoneData }),
                    }),
                  }
                }
                if (subName === 'notifications') {
                  return {
                    doc: () => ({
                      set: (data: any) => {
                        notificationCount++
                        mockSet(data)
                        return Promise.resolve()
                      },
                    }),
                  }
                }
                return { doc: mockDoc }
              },
              get: () => Promise.resolve({ exists: true, data: () => familyData }),
            }),
          }
        }
        return { doc: mockDoc }
      })

      await onLocationUpdate(event as any)

      // Should have created 3 notifications (1 child + 2 parents)
      expect(notificationCount).toBe(3)

      // Check child notification
      const childNotification = mockSet.mock.calls.find((call) => call[0].recipientType === 'child')
      expect(childNotification).toBeDefined()
      expect(childNotification[0].message).toContain('School')
      expect(childNotification[0].message).toContain('5 minutes')

      // Should mark notification as sent
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ notificationSentAt: expect.anything() })
      )
    })

    it('should use singular minute for 1 minute remaining', async () => {
      const gracePeriodEndsAt = new Date(Date.now() + 1 * 60 * 1000) // 1 minute

      const event = {
        params: { familyId: 'family-123', deviceId: 'device-456' },
        data: {
          after: {
            data: () => ({
              deviceId: 'device-456',
              familyId: 'family-123',
              childId: 'child-789',
              zoneId: 'zone-school',
            }),
          },
        },
      }

      const transitionDoc = {
        id: 'trans-1',
        data: () => ({
          toZoneId: 'zone-school',
          fromZoneId: null,
          notificationSentAt: null,
          gracePeriodEndsAt: { toDate: () => gracePeriodEndsAt },
        }),
        ref: { update: mockUpdate },
      }

      mockCollection.mockImplementation((name: string) => {
        if (name === 'families') {
          return {
            doc: () => ({
              collection: (subName: string) => {
                if (subName === 'locationTransitions') {
                  return {
                    where: () => ({
                      where: () => ({
                        orderBy: () => ({
                          limit: () => ({
                            get: () => Promise.resolve({ empty: false, docs: [transitionDoc] }),
                          }),
                        }),
                      }),
                    }),
                  }
                }
                if (subName === 'locationZones') {
                  return {
                    doc: () => ({
                      get: () =>
                        Promise.resolve({ exists: true, data: () => ({ name: 'School' }) }),
                    }),
                  }
                }
                if (subName === 'notifications') {
                  return { doc: () => ({ set: mockSet }) }
                }
                return { doc: mockDoc }
              },
              get: () =>
                Promise.resolve({
                  exists: true,
                  data: () => ({
                    children: [{ id: 'child-789', name: 'Emma' }],
                    guardians: [],
                  }),
                }),
            }),
          }
        }
        return { doc: mockDoc }
      })

      await onLocationUpdate(event as any)

      const childNotification = mockSet.mock.calls.find((call) => call[0].recipientType === 'child')
      expect(childNotification[0].message).toContain('1 minute.')
      expect(childNotification[0].message).not.toContain('1 minutes')
    })
  })

  describe('when leaving a zone', () => {
    it('should send leaving zone notification', async () => {
      const event = {
        params: { familyId: 'family-123', deviceId: 'device-456' },
        data: {
          after: {
            data: () => ({
              deviceId: 'device-456',
              familyId: 'family-123',
              childId: 'child-789',
              zoneId: null, // Left all zones
            }),
          },
        },
      }

      const transitionDoc = {
        id: 'trans-1',
        data: () => ({
          toZoneId: null,
          fromZoneId: 'zone-school',
          notificationSentAt: null,
          gracePeriodEndsAt: { toDate: () => new Date(Date.now() + 5 * 60 * 1000) },
        }),
        ref: { update: mockUpdate },
      }

      mockCollection.mockImplementation((name: string) => {
        if (name === 'families') {
          return {
            doc: () => ({
              collection: (subName: string) => {
                if (subName === 'locationTransitions') {
                  return {
                    where: () => ({
                      where: () => ({
                        orderBy: () => ({
                          limit: () => ({
                            get: () => Promise.resolve({ empty: false, docs: [transitionDoc] }),
                          }),
                        }),
                      }),
                    }),
                  }
                }
                if (subName === 'locationZones') {
                  return {
                    doc: () => ({
                      get: () =>
                        Promise.resolve({ exists: true, data: () => ({ name: 'School' }) }),
                    }),
                  }
                }
                if (subName === 'notifications') {
                  return { doc: () => ({ set: mockSet }) }
                }
                return { doc: mockDoc }
              },
              get: () =>
                Promise.resolve({
                  exists: true,
                  data: () => ({
                    children: [{ id: 'child-789', name: 'Emma' }],
                    guardians: [{ id: 'parent-1' }],
                  }),
                }),
            }),
          }
        }
        return { doc: mockDoc }
      })

      await onLocationUpdate(event as any)

      const childNotification = mockSet.mock.calls.find((call) => call[0].recipientType === 'child')
      expect(childNotification[0].message).toContain('left School')
      expect(childNotification[0].message).toContain('normal rules')
    })
  })

  describe('when location is unknown', () => {
    it('should send unknown location notification', async () => {
      const event = {
        params: { familyId: 'family-123', deviceId: 'device-456' },
        data: {
          after: {
            data: () => ({
              deviceId: 'device-456',
              familyId: 'family-123',
              childId: 'child-789',
              zoneId: null,
            }),
          },
        },
      }

      const transitionDoc = {
        id: 'trans-1',
        data: () => ({
          toZoneId: null, // Unknown destination
          fromZoneId: null, // Unknown origin
          notificationSentAt: null,
          gracePeriodEndsAt: { toDate: () => new Date(Date.now() + 5 * 60 * 1000) },
        }),
        ref: { update: mockUpdate },
      }

      mockCollection.mockImplementation((name: string) => {
        if (name === 'families') {
          return {
            doc: () => ({
              collection: (subName: string) => {
                if (subName === 'locationTransitions') {
                  return {
                    where: () => ({
                      where: () => ({
                        orderBy: () => ({
                          limit: () => ({
                            get: () => Promise.resolve({ empty: false, docs: [transitionDoc] }),
                          }),
                        }),
                      }),
                    }),
                  }
                }
                if (subName === 'notifications') {
                  return { doc: () => ({ set: mockSet }) }
                }
                return { doc: mockDoc }
              },
              get: () =>
                Promise.resolve({
                  exists: true,
                  data: () => ({
                    children: [{ id: 'child-789', name: 'Emma' }],
                    guardians: [],
                  }),
                }),
            }),
          }
        }
        return { doc: mockDoc }
      })

      await onLocationUpdate(event as any)

      const childNotification = mockSet.mock.calls.find((call) => call[0].recipientType === 'child')
      expect(childNotification[0].message).toContain("can't tell where you are")
      expect(childNotification[0].message).toContain('normal rules')
    })
  })

  describe('when family not found', () => {
    it('should return early without error', async () => {
      const event = {
        params: { familyId: 'family-123', deviceId: 'device-456' },
        data: {
          after: {
            data: () => ({
              deviceId: 'device-456',
              familyId: 'family-123',
              childId: 'child-789',
              zoneId: 'zone-school',
            }),
          },
        },
      }

      const transitionDoc = {
        id: 'trans-1',
        data: () => ({
          toZoneId: 'zone-school',
          fromZoneId: null,
          notificationSentAt: null,
          gracePeriodEndsAt: { toDate: () => new Date(Date.now() + 5 * 60 * 1000) },
        }),
        ref: { update: mockUpdate },
      }

      mockCollection.mockImplementation((name: string) => {
        if (name === 'families') {
          return {
            doc: () => ({
              collection: (subName: string) => {
                if (subName === 'locationTransitions') {
                  return {
                    where: () => ({
                      where: () => ({
                        orderBy: () => ({
                          limit: () => ({
                            get: () => Promise.resolve({ empty: false, docs: [transitionDoc] }),
                          }),
                        }),
                      }),
                    }),
                  }
                }
                return { doc: mockDoc }
              },
              get: () => Promise.resolve({ exists: true, data: () => null }), // Family data is null
            }),
          }
        }
        return { doc: mockDoc }
      })

      // Should not throw
      await expect(onLocationUpdate(event as any)).resolves.not.toThrow()

      // Should not create notifications
      expect(mockSet).not.toHaveBeenCalled()
    })
  })

  describe('notification content', () => {
    it('should include transition type in notification', async () => {
      const event = {
        params: { familyId: 'family-123', deviceId: 'device-456' },
        data: {
          after: {
            data: () => ({
              deviceId: 'device-456',
              familyId: 'family-123',
              childId: 'child-789',
              zoneId: 'zone-school',
            }),
          },
        },
      }

      const transitionDoc = {
        id: 'trans-1',
        data: () => ({
          toZoneId: 'zone-school',
          fromZoneId: null,
          notificationSentAt: null,
          gracePeriodEndsAt: { toDate: () => new Date(Date.now() + 5 * 60 * 1000) },
        }),
        ref: { update: mockUpdate },
      }

      mockCollection.mockImplementation((name: string) => {
        if (name === 'families') {
          return {
            doc: () => ({
              collection: (subName: string) => {
                if (subName === 'locationTransitions') {
                  return {
                    where: () => ({
                      where: () => ({
                        orderBy: () => ({
                          limit: () => ({
                            get: () => Promise.resolve({ empty: false, docs: [transitionDoc] }),
                          }),
                        }),
                      }),
                    }),
                  }
                }
                if (subName === 'locationZones') {
                  return {
                    doc: () => ({
                      get: () =>
                        Promise.resolve({ exists: true, data: () => ({ name: 'School' }) }),
                    }),
                  }
                }
                if (subName === 'notifications') {
                  return { doc: () => ({ set: mockSet }) }
                }
                return { doc: mockDoc }
              },
              get: () =>
                Promise.resolve({
                  exists: true,
                  data: () => ({
                    children: [{ id: 'child-789', name: 'Emma' }],
                    guardians: [],
                  }),
                }),
            }),
          }
        }
        return { doc: mockDoc }
      })

      await onLocationUpdate(event as any)

      const notification = mockSet.mock.calls[0][0]
      expect(notification.type).toBe('location_transition')
      expect(notification.transitionId).toBe('trans-1')
    })
  })
})
