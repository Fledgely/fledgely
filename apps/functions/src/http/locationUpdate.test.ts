/**
 * Tests for Location Update HTTP Handler - Story 40.4
 *
 * Acceptance Criteria:
 * - AC1: Transition Detection
 * - AC6: Location Detection (GPS + WiFi)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

// Separate mock functions for each query path
const mockAuthGet = vi.fn() // For collectionGroup auth query
const mockLocationGet = vi.fn() // For deviceLocations doc
const mockZonesGet = vi.fn() // For locationZones collection
const mockSet = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: (name: string) => {
      if (name === 'families') {
        return {
          doc: () => ({
            collection: (subName: string) => {
              if (subName === 'deviceLocations') {
                return {
                  doc: () => ({
                    get: mockLocationGet,
                    set: mockSet,
                  }),
                }
              }
              if (subName === 'locationZones') {
                return { get: mockZonesGet }
              }
              if (subName === 'locationTransitions') {
                return {
                  doc: () => ({
                    id: 'transition-new',
                    set: mockSet,
                  }),
                }
              }
              return { doc: () => ({ get: mockLocationGet, set: mockSet }) }
            },
          }),
        }
      }
      return { doc: () => ({ get: mockLocationGet, set: mockSet }) }
    },
    collectionGroup: () => ({
      where: () => ({
        where: () => ({
          limit: () => ({
            get: mockAuthGet,
          }),
        }),
      }),
    }),
  }),
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
  Timestamp: {
    fromDate: (date: Date) => ({ toDate: () => date }),
  },
}))

// Mock firebase-functions/v2/https
vi.mock('firebase-functions/v2/https', () => ({
  onRequest: (_options: unknown, handler: (req: Request, res: Response) => Promise<void>) =>
    handler,
}))

// Import after mocks
import { locationUpdate } from './locationUpdate'

describe('locationUpdate HTTP Handler', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let jsonFn: ReturnType<typeof vi.fn>
  let statusFn: ReturnType<typeof vi.fn>

  // Helper to create authenticated device response
  const createAuthResponse = () => ({
    empty: false,
    docs: [
      {
        id: 'device-123',
        data: () => ({
          familyId: 'family-456',
          childId: 'child-789',
        }),
      },
    ],
  })

  // Helper to create location doc response
  const createLocationDoc = (data: Record<string, unknown> | null) => ({
    exists: data !== null,
    data: data ? () => data : () => null,
  })

  // Helper to create zones snapshot
  const createZonesSnapshot = (zones: Array<{ id: string; data: Record<string, unknown> }>) => ({
    empty: zones.length === 0,
    docs: zones.map((z) => ({
      id: z.id,
      data: () => z.data,
    })),
  })

  beforeEach(() => {
    vi.clearAllMocks()

    jsonFn = vi.fn()
    statusFn = vi.fn().mockReturnValue({ json: jsonFn })

    mockReq = {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-device-token',
      },
      body: {
        deviceId: 'device-123',
        latitude: 37.7749,
        longitude: -122.4194,
        accuracyMeters: 50,
      },
    }

    mockRes = {
      status: statusFn,
      json: jsonFn,
    }

    mockSet.mockResolvedValue(undefined)
  })

  describe('HTTP Method Validation', () => {
    it('rejects non-POST requests', async () => {
      mockReq.method = 'GET'

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(statusFn).toHaveBeenCalledWith(405)
      expect(jsonFn).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })

    it('accepts POST requests (proceeds to auth check)', async () => {
      // Mock device authentication to fail
      mockAuthGet.mockResolvedValueOnce({ empty: true })

      await locationUpdate(mockReq as Request, mockRes as Response)

      // Should not be 405, should be 401 (failed auth)
      expect(statusFn).not.toHaveBeenCalledWith(405)
      expect(statusFn).toHaveBeenCalledWith(401)
    })
  })

  describe('Device Authentication', () => {
    it('rejects requests without authorization header', async () => {
      mockReq.headers = {}

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(statusFn).toHaveBeenCalledWith(401)
      expect(jsonFn).toHaveBeenCalledWith({
        error: 'Unauthorized: Invalid or missing device token',
      })
    })

    it('rejects requests with invalid authorization format', async () => {
      mockReq.headers = { authorization: 'InvalidFormat' }

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(statusFn).toHaveBeenCalledWith(401)
    })

    it('rejects requests with non-existent device token', async () => {
      mockAuthGet.mockResolvedValueOnce({ empty: true })

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(statusFn).toHaveBeenCalledWith(401)
    })
  })

  describe('Input Validation', () => {
    beforeEach(() => {
      // Mock successful device authentication
      mockAuthGet.mockResolvedValue(createAuthResponse())
    })

    it('rejects invalid latitude (out of bounds)', async () => {
      mockReq.body = {
        ...mockReq.body,
        latitude: 100, // Invalid: > 90
      }

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(statusFn).toHaveBeenCalledWith(400)
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid input'),
        })
      )
    })

    it('rejects invalid longitude (out of bounds)', async () => {
      mockReq.body = {
        ...mockReq.body,
        longitude: 200, // Invalid: > 180
      }

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(statusFn).toHaveBeenCalledWith(400)
    })

    it('rejects negative accuracy', async () => {
      mockReq.body = {
        ...mockReq.body,
        accuracyMeters: -10,
      }

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(statusFn).toHaveBeenCalledWith(400)
    })
  })

  describe('Rate Limiting', () => {
    beforeEach(() => {
      // Mock successful device authentication
      mockAuthGet.mockResolvedValue(createAuthResponse())
    })

    it('rate limits updates within 1 minute', async () => {
      // Recent location update (30 seconds ago)
      const recentUpdate = new Date(Date.now() - 30 * 1000)
      mockLocationGet.mockResolvedValueOnce(
        createLocationDoc({
          updatedAt: { toDate: () => recentUpdate },
        })
      )

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(statusFn).toHaveBeenCalledWith(429)
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Rate limited'),
        })
      )
    })

    it('allows updates after 1 minute', async () => {
      // Old location update (2 minutes ago)
      const oldUpdate = new Date(Date.now() - 2 * 60 * 1000)
      mockLocationGet
        .mockResolvedValueOnce(
          createLocationDoc({
            updatedAt: { toDate: () => oldUpdate },
          })
        )
        .mockResolvedValueOnce(createLocationDoc(null)) // Current zone lookup

      mockZonesGet.mockResolvedValueOnce(createZonesSnapshot([]))

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(statusFn).not.toHaveBeenCalledWith(429)
      expect(statusFn).toHaveBeenCalledWith(200)
    })

    it('allows first update from device', async () => {
      mockLocationGet
        .mockResolvedValueOnce(createLocationDoc(null)) // No previous location
        .mockResolvedValueOnce(createLocationDoc(null)) // No current zone

      mockZonesGet.mockResolvedValueOnce(createZonesSnapshot([]))

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(statusFn).toHaveBeenCalledWith(200)
    })
  })

  describe('Location Accuracy (AC5)', () => {
    beforeEach(() => {
      mockAuthGet.mockResolvedValue(createAuthResponse())
    })

    it('accepts location with accuracy <= 500m', async () => {
      mockReq.body = {
        ...mockReq.body,
        accuracyMeters: 500,
      }

      mockLocationGet
        .mockResolvedValueOnce(createLocationDoc(null)) // Rate limit
        .mockResolvedValueOnce(createLocationDoc(null)) // Current zone

      mockZonesGet.mockResolvedValueOnce(createZonesSnapshot([]))

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(statusFn).toHaveBeenCalledWith(200)
    })

    it('handles inaccurate location (> 500m) without zone matching', async () => {
      mockReq.body = {
        ...mockReq.body,
        accuracyMeters: 600,
      }

      mockLocationGet.mockResolvedValueOnce(createLocationDoc(null)) // Rate limit

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(statusFn).toHaveBeenCalledWith(200)
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          zoneId: null,
          message: 'Location accuracy too low to determine zone',
        })
      )
    })
  })

  describe('Zone Matching', () => {
    beforeEach(() => {
      mockAuthGet.mockResolvedValue(createAuthResponse())
    })

    it('matches location to zone within radius', async () => {
      mockLocationGet
        .mockResolvedValueOnce(createLocationDoc(null)) // Rate limit
        .mockResolvedValueOnce(createLocationDoc(null)) // No current zone

      mockZonesGet.mockResolvedValueOnce(
        createZonesSnapshot([
          {
            id: 'zone-home',
            data: {
              name: 'Home',
              latitude: 37.7749,
              longitude: -122.4194,
              radiusMeters: 500,
            },
          },
        ])
      )

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          zoneId: 'zone-home',
          zoneName: 'Home',
        })
      )
    })

    it('returns null zone when no zones match', async () => {
      mockLocationGet
        .mockResolvedValueOnce(createLocationDoc(null)) // Rate limit
        .mockResolvedValueOnce(createLocationDoc(null)) // Current zone

      mockZonesGet.mockResolvedValueOnce(
        createZonesSnapshot([
          {
            id: 'zone-far',
            data: {
              name: 'Far Away',
              latitude: 40.7128, // New York
              longitude: -74.006,
              radiusMeters: 500,
            },
          },
        ])
      )

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          zoneId: null,
          zoneName: null,
        })
      )
    })

    it('returns null zone when no zones configured', async () => {
      mockLocationGet
        .mockResolvedValueOnce(createLocationDoc(null)) // Rate limit
        .mockResolvedValueOnce(createLocationDoc(null)) // Current zone

      mockZonesGet.mockResolvedValueOnce(createZonesSnapshot([]))

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          zoneId: null,
          zoneName: null,
        })
      )
    })
  })

  describe('Transition Detection (AC1)', () => {
    beforeEach(() => {
      mockAuthGet.mockResolvedValue(createAuthResponse())
    })

    it('creates transition when zone changes', async () => {
      mockLocationGet
        .mockResolvedValueOnce(createLocationDoc(null)) // Rate limit
        .mockResolvedValueOnce(createLocationDoc({ zoneId: 'zone-home' })) // Current zone different

      mockZonesGet.mockResolvedValueOnce(
        createZonesSnapshot([
          {
            id: 'zone-school',
            data: {
              name: 'School',
              latitude: 37.7749,
              longitude: -122.4194,
              radiusMeters: 500,
            },
          },
        ])
      )

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          zoneId: 'zone-school',
          transitionTriggered: true,
        })
      )
    })

    it('does not create transition when zone unchanged', async () => {
      mockLocationGet
        .mockResolvedValueOnce(createLocationDoc(null)) // Rate limit
        .mockResolvedValueOnce(createLocationDoc({ zoneId: 'zone-school' })) // Same zone

      mockZonesGet.mockResolvedValueOnce(
        createZonesSnapshot([
          {
            id: 'zone-school',
            data: {
              name: 'School',
              latitude: 37.7749,
              longitude: -122.4194,
              radiusMeters: 500,
            },
          },
        ])
      )

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          zoneId: 'zone-school',
          transitionTriggered: false,
        })
      )
    })

    it('creates transition when leaving all zones', async () => {
      mockLocationGet
        .mockResolvedValueOnce(createLocationDoc(null)) // Rate limit
        .mockResolvedValueOnce(createLocationDoc({ zoneId: 'zone-home' })) // Was in zone

      mockZonesGet.mockResolvedValueOnce(createZonesSnapshot([])) // No matching zones

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          zoneId: null,
          transitionTriggered: true,
        })
      )
    })

    it('creates transition when entering first zone', async () => {
      mockLocationGet
        .mockResolvedValueOnce(createLocationDoc(null)) // Rate limit
        .mockResolvedValueOnce(createLocationDoc(null)) // No current zone

      mockZonesGet.mockResolvedValueOnce(
        createZonesSnapshot([
          {
            id: 'zone-home',
            data: {
              name: 'Home',
              latitude: 37.7749,
              longitude: -122.4194,
              radiusMeters: 500,
            },
          },
        ])
      )

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          zoneId: 'zone-home',
          transitionTriggered: true,
        })
      )
    })
  })

  describe('Location Update Storage', () => {
    beforeEach(() => {
      mockAuthGet.mockResolvedValue(createAuthResponse())
    })

    it('stores location in deviceLocations collection', async () => {
      mockLocationGet
        .mockResolvedValueOnce(createLocationDoc(null)) // Rate limit
        .mockResolvedValueOnce(createLocationDoc(null)) // Current zone

      mockZonesGet.mockResolvedValueOnce(createZonesSnapshot([]))

      await locationUpdate(mockReq as Request, mockRes as Response)

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'device-123',
          familyId: 'family-456',
          childId: 'child-789',
          latitude: 37.7749,
          longitude: -122.4194,
          accuracyMeters: 50,
          zoneId: null,
        }),
        { merge: true }
      )
    })
  })
})
