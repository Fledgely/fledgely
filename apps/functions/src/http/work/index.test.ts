/**
 * Work Mode HTTP Handler Tests - Story 33.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoist mocks so they're available before module evaluation
const { mockGet, mockDoc, mockDb, mockVerifyIdToken, mockAuth } = vi.hoisted(() => {
  const mockGet = vi.fn()
  const mockDoc = vi.fn(() => ({ get: mockGet }))
  const mockDb = { doc: mockDoc }
  const mockVerifyIdToken = vi.fn()
  const mockAuth = { verifyIdToken: mockVerifyIdToken }
  return { mockGet, mockDoc, mockDb, mockVerifyIdToken, mockAuth }
})

// Mock firebase-admin modules
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
}))

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => mockAuth,
}))

vi.mock('firebase-functions/v2/https', () => ({
  onRequest: (_config: unknown, handler: unknown) => handler,
}))

// Import after mocks are set up
import { getWorkModeState, getWorkModeConfig } from './index'

describe('Work Mode HTTP Handlers - Story 33.3', () => {
  let mockReq: {
    method: string
    headers: { authorization?: string }
    body: Record<string, unknown>
  }
  let mockRes: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()

    mockReq = {
      method: 'POST',
      headers: {},
      body: {},
    }

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    }
  })

  describe('getWorkModeState', () => {
    it('rejects non-POST requests', async () => {
      mockReq.method = 'GET'

      await getWorkModeState(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(405)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })

    it('returns 400 if childId is missing', async () => {
      mockReq.body = { familyId: 'family-1' }

      await getWorkModeState(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing childId or familyId' })
    })

    it('returns 400 if familyId is missing', async () => {
      mockReq.body = { childId: 'child-1' }

      await getWorkModeState(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing childId or familyId' })
    })

    it('returns 400 if childId is not a string', async () => {
      mockReq.body = { childId: 123, familyId: 'family-1' }

      await getWorkModeState(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid childId or familyId format' })
    })

    it('returns 401 if no authentication provided', async () => {
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }

      await getWorkModeState(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' })
    })

    it('returns 401 if token verification fails', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token'
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'))

      await getWorkModeState(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid token' })
    })

    it('returns 403 if device is not enrolled', async () => {
      mockReq.body = { childId: 'child-1', familyId: 'family-1', deviceId: 'device-1' }
      mockGet.mockResolvedValue({ exists: false })

      await getWorkModeState(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Device not enrolled' })
    })

    it('returns default state when no work mode document exists', async () => {
      mockReq.headers.authorization = 'Bearer valid-token'
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-1' })
      mockGet.mockResolvedValue({ exists: false })

      await getWorkModeState(mockReq as never, mockRes as never)

      expect(mockRes.json).toHaveBeenCalledWith({
        isActive: false,
        currentSession: null,
        totalSessionsToday: 0,
        totalWorkTimeToday: 0,
      })
    })

    it('returns work mode state when document exists', async () => {
      mockReq.headers.authorization = 'Bearer valid-token'
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-1' })
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          isActive: true,
          currentSession: { id: 'session-1', activationType: 'manual' },
          totalSessionsToday: 2,
          totalWorkTimeToday: 7200000,
        }),
      })

      await getWorkModeState(mockReq as never, mockRes as never)

      expect(mockRes.json).toHaveBeenCalledWith({
        isActive: true,
        currentSession: { id: 'session-1', activationType: 'manual' },
        totalSessionsToday: 2,
        totalWorkTimeToday: 7200000,
      })
    })

    it('authenticates with device ID when no token provided', async () => {
      mockReq.body = { childId: 'child-1', familyId: 'family-1', deviceId: 'device-1' }
      mockGet
        .mockResolvedValueOnce({ exists: true }) // Device check
        .mockResolvedValueOnce({ exists: false }) // Work mode state

      await getWorkModeState(mockReq as never, mockRes as never)

      expect(mockDoc).toHaveBeenCalledWith('families/family-1/devices/device-1')
      expect(mockRes.json).toHaveBeenCalledWith({
        isActive: false,
        currentSession: null,
        totalSessionsToday: 0,
        totalWorkTimeToday: 0,
      })
    })
  })

  describe('getWorkModeConfig', () => {
    it('rejects non-POST requests', async () => {
      mockReq.method = 'GET'

      await getWorkModeConfig(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(405)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })

    it('returns 400 if childId is missing', async () => {
      mockReq.body = { familyId: 'family-1' }

      await getWorkModeConfig(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing childId or familyId' })
    })

    it('returns 401 if no authentication provided', async () => {
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }

      await getWorkModeConfig(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' })
    })

    it('returns default config when no config document exists', async () => {
      mockReq.headers.authorization = 'Bearer valid-token'
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-1' })
      mockGet.mockResolvedValue({ exists: false })

      await getWorkModeConfig(mockReq as never, mockRes as never)

      expect(mockRes.json).toHaveBeenCalledWith({
        schedules: [],
        useDefaultWorkApps: true,
        customWorkApps: [],
        pauseScreenshots: true,
        suspendTimeLimits: true,
        allowManualActivation: true,
      })
    })

    it('returns work mode config when document exists', async () => {
      mockReq.headers.authorization = 'Bearer valid-token'
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-1' })
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          schedules: [{ id: 'schedule-1', name: 'Coffee Shop' }],
          useDefaultWorkApps: false,
          customWorkApps: [{ pattern: 'custom.com', name: 'Custom' }],
          pauseScreenshots: false,
          suspendTimeLimits: false,
          allowManualActivation: false,
        }),
      })

      await getWorkModeConfig(mockReq as never, mockRes as never)

      expect(mockRes.json).toHaveBeenCalledWith({
        schedules: [{ id: 'schedule-1', name: 'Coffee Shop' }],
        useDefaultWorkApps: false,
        customWorkApps: [{ pattern: 'custom.com', name: 'Custom' }],
        pauseScreenshots: false,
        suspendTimeLimits: false,
        allowManualActivation: false,
      })
    })

    it('authenticates with device ID when no token provided', async () => {
      mockReq.body = { childId: 'child-1', familyId: 'family-1', deviceId: 'device-1' }
      mockGet
        .mockResolvedValueOnce({ exists: true }) // Device check
        .mockResolvedValueOnce({ exists: false }) // Config

      await getWorkModeConfig(mockReq as never, mockRes as never)

      expect(mockDoc).toHaveBeenCalledWith('families/family-1/devices/device-1')
      expect(mockRes.json).toHaveBeenCalledWith({
        schedules: [],
        useDefaultWorkApps: true,
        customWorkApps: [],
        pauseScreenshots: true,
        suspendTimeLimits: true,
        allowManualActivation: true,
      })
    })
  })
})
