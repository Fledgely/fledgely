/**
 * Calendar Integration HTTP Handler Tests - Story 33.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoist mocks so they're available before module evaluation
const {
  mockGet,
  mockSet,
  mockUpdate,
  mockDelete,
  mockDoc,
  mockDb,
  mockVerifyIdToken,
  mockAuth,
  mockOAuth2Client,
  mockOAuth2,
  mockGenerateAuthUrl,
  mockGetToken,
  mockSetCredentials,
  mockRevokeCredentials,
  mockUserinfoGet,
} = vi.hoisted(() => {
  const mockGet = vi.fn()
  const mockSet = vi.fn().mockResolvedValue(undefined)
  const mockUpdate = vi.fn().mockResolvedValue(undefined)
  const mockDelete = vi.fn().mockResolvedValue(undefined)
  const mockDoc = vi.fn(() => ({
    get: mockGet,
    set: mockSet,
    update: mockUpdate,
    delete: mockDelete,
  }))
  const mockDb = { doc: mockDoc }
  const mockVerifyIdToken = vi.fn()
  const mockAuth = { verifyIdToken: mockVerifyIdToken }

  // OAuth2 client mocks
  const mockGenerateAuthUrl = vi.fn()
  const mockGetToken = vi.fn()
  const mockSetCredentials = vi.fn()
  const mockRevokeCredentials = vi.fn()
  const mockUserinfoGet = vi.fn()
  const mockOAuth2Client = vi.fn(() => ({
    generateAuthUrl: mockGenerateAuthUrl,
    getToken: mockGetToken,
    setCredentials: mockSetCredentials,
    revokeCredentials: mockRevokeCredentials,
  }))
  const mockOAuth2 = vi.fn(() => ({
    userinfo: { get: mockUserinfoGet },
  }))

  return {
    mockGet,
    mockSet,
    mockUpdate,
    mockDelete,
    mockDoc,
    mockDb,
    mockVerifyIdToken,
    mockAuth,
    mockOAuth2Client,
    mockOAuth2,
    mockGenerateAuthUrl,
    mockGetToken,
    mockSetCredentials,
    mockRevokeCredentials,
    mockUserinfoGet,
  }
})

// Mock firebase-admin modules
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => mockAuth,
}))

// Mock firebase-functions
vi.mock('firebase-functions/v2/https', () => ({
  onRequest: (_config: unknown, handler: unknown) => handler,
}))

vi.mock('firebase-functions/params', () => ({
  defineSecret: (name: string) => ({
    value: () => `mock-${name}-value`,
  }),
}))

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: mockOAuth2Client,
    },
    oauth2: mockOAuth2,
  },
}))

// Import after mocks are set up
import {
  initiateCalendarOAuth,
  calendarOAuthCallback,
  disconnectCalendar,
  getCalendarStatus,
} from './index'

describe('Calendar Integration HTTP Handlers - Story 33.4', () => {
  let mockReq: {
    method: string
    headers: { authorization?: string }
    body: Record<string, unknown>
    query: Record<string, string>
    hostname: string
  }
  let mockRes: {
    status: ReturnType<typeof vi.fn>
    json: ReturnType<typeof vi.fn>
    redirect: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockReq = {
      method: 'POST',
      headers: {},
      body: {},
      query: {},
      hostname: 'us-central1-fledgely-dev.cloudfunctions.net',
    }

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      redirect: vi.fn(),
    }
  })

  describe('initiateCalendarOAuth', () => {
    it('rejects non-POST requests', async () => {
      mockReq.method = 'GET'

      await initiateCalendarOAuth(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(405)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })

    it('returns 401 if no authentication provided', async () => {
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }

      await initiateCalendarOAuth(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' })
    })

    it('returns 401 if token verification fails', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token'
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'))

      await initiateCalendarOAuth(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid token' })
    })

    it('returns 400 if childId is missing', async () => {
      mockReq.headers.authorization = 'Bearer valid-token'
      mockReq.body = { familyId: 'family-1' }
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-1' })

      await initiateCalendarOAuth(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing childId or familyId' })
    })

    it('returns 400 if familyId is missing', async () => {
      mockReq.headers.authorization = 'Bearer valid-token'
      mockReq.body = { childId: 'child-1' }
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-1' })

      await initiateCalendarOAuth(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing childId or familyId' })
    })

    it('returns 404 if family not found', async () => {
      mockReq.headers.authorization = 'Bearer valid-token'
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-1' })
      mockGet.mockResolvedValue({ exists: false })

      await initiateCalendarOAuth(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Family not found' })
    })

    it('returns 403 if user is not authorized', async () => {
      mockReq.headers.authorization = 'Bearer valid-token'
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-1' })
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ parentIds: ['other-user'] }),
      })

      await initiateCalendarOAuth(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not authorized to connect calendar for this child',
      })
    })

    it('generates OAuth URL for authorized parent', async () => {
      mockReq.headers.authorization = 'Bearer valid-token'
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }
      mockVerifyIdToken.mockResolvedValue({ uid: 'parent-1' })
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })
      mockGenerateAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/auth?...')

      await initiateCalendarOAuth(mockReq as never, mockRes as never)

      expect(mockOAuth2Client).toHaveBeenCalled()
      expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.readonly'],
        state: expect.any(String),
        prompt: 'consent',
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        authUrl: 'https://accounts.google.com/o/oauth2/auth?...',
        state: expect.any(String),
      })
    })

    it('generates OAuth URL for authorized child', async () => {
      mockReq.headers.authorization = 'Bearer valid-token'
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }
      mockVerifyIdToken.mockResolvedValue({ uid: 'child-1' })
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })
      mockGenerateAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/auth?...')

      await initiateCalendarOAuth(mockReq as never, mockRes as never)

      expect(mockRes.json).toHaveBeenCalledWith({
        authUrl: expect.stringContaining('https://'),
        state: expect.any(String),
      })
    })

    it('stores OAuth state in Firestore', async () => {
      mockReq.headers.authorization = 'Bearer valid-token'
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }
      mockVerifyIdToken.mockResolvedValue({ uid: 'parent-1' })
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })
      mockGenerateAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/auth?...')

      await initiateCalendarOAuth(mockReq as never, mockRes as never)

      expect(mockDoc).toHaveBeenCalledWith(expect.stringContaining('calendarOAuthStates/'))
      expect(mockSet).toHaveBeenCalledWith({
        childId: 'child-1',
        familyId: 'family-1',
        userId: 'parent-1',
        redirectUri: expect.any(String),
        createdAt: 'SERVER_TIMESTAMP',
        expiresAt: expect.any(Number),
      })
    })
  })

  describe('calendarOAuthCallback', () => {
    it('redirects with error if OAuth error returned', async () => {
      mockReq.method = 'GET'
      mockReq.query = { error: 'access_denied' }

      await calendarOAuthCallback(mockReq as never, mockRes as never)

      expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining('error=access_denied'))
    })

    it('returns 400 if code is missing', async () => {
      mockReq.method = 'GET'
      mockReq.query = { state: 'some-state' }

      await calendarOAuthCallback(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing code or state' })
    })

    it('returns 400 if state is missing', async () => {
      mockReq.method = 'GET'
      mockReq.query = { code: 'some-code' }

      await calendarOAuthCallback(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing code or state' })
    })

    it('returns 400 if state does not exist', async () => {
      mockReq.method = 'GET'
      mockReq.query = { code: 'some-code', state: 'invalid-state' }
      mockGet.mockResolvedValue({ exists: false })

      await calendarOAuthCallback(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid or expired OAuth state' })
    })

    it('returns 400 if state has expired', async () => {
      mockReq.method = 'GET'
      mockReq.query = { code: 'some-code', state: 'expired-state' }
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          childId: 'child-1',
          familyId: 'family-1',
          userId: 'user-1',
          redirectUri: 'https://example.com/callback',
          expiresAt: Date.now() - 1000, // Expired
        }),
      })

      await calendarOAuthCallback(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'OAuth state expired' })
    })

    it('exchanges code for tokens and stores them', async () => {
      mockReq.method = 'GET'
      mockReq.query = { code: 'auth-code', state: 'valid-state' }
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          childId: 'child-1',
          familyId: 'family-1',
          userId: 'user-1',
          redirectUri: 'https://example.com/callback',
          expiresAt: Date.now() + 60000,
        }),
      })
      mockGetToken.mockResolvedValue({
        tokens: {
          access_token: 'access-token-123',
          refresh_token: 'refresh-token-456',
          expiry_date: Date.now() + 3600000,
        },
      })
      mockUserinfoGet.mockResolvedValue({
        data: { email: 'child@example.com' },
      })

      await calendarOAuthCallback(mockReq as never, mockRes as never)

      expect(mockGetToken).toHaveBeenCalledWith('auth-code')
      expect(mockSetCredentials).toHaveBeenCalled()
      expect(mockUserinfoGet).toHaveBeenCalled()
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          childId: 'child-1',
          familyId: 'family-1',
          isEnabled: true,
          provider: 'google',
          connectionStatus: 'connected',
          connectedEmail: 'child@example.com',
        }),
        { merge: true }
      )
      expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining('status=success'))
    })

    it('redirects to failure page on token exchange error', async () => {
      mockReq.method = 'GET'
      mockReq.query = { code: 'auth-code', state: 'valid-state' }
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          childId: 'child-1',
          familyId: 'family-1',
          userId: 'user-1',
          redirectUri: 'https://example.com/callback',
          expiresAt: Date.now() + 60000,
        }),
      })
      mockGetToken.mockRejectedValue(new Error('Token exchange failed'))

      await calendarOAuthCallback(mockReq as never, mockRes as never)

      expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining('status=failed'))
    })
  })

  describe('disconnectCalendar', () => {
    it('rejects non-POST requests', async () => {
      mockReq.method = 'GET'

      await disconnectCalendar(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(405)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })

    it('returns 401 if no authentication provided', async () => {
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }

      await disconnectCalendar(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' })
    })

    it('returns 403 if user is not authorized', async () => {
      mockReq.headers.authorization = 'Bearer valid-token'
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }
      mockVerifyIdToken.mockResolvedValue({ uid: 'other-user' })
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })

      await disconnectCalendar(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not authorized to disconnect calendar for this child',
      })
    })

    it('disconnects calendar for authorized user', async () => {
      mockReq.headers.authorization = 'Bearer valid-token'
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }
      mockVerifyIdToken.mockResolvedValue({ uid: 'child-1' })

      let callIndex = 0
      mockGet.mockImplementation(() => {
        callIndex++
        if (callIndex === 1) {
          // Family doc
          return Promise.resolve({
            exists: true,
            data: () => ({ parentIds: ['parent-1'] }),
          })
        } else {
          // Config doc
          return Promise.resolve({
            exists: true,
            data: () => ({
              accessToken: 'encrypted-token',
              connectionStatus: 'connected',
            }),
          })
        }
      })
      mockRevokeCredentials.mockResolvedValue({})

      await disconnectCalendar(mockReq as never, mockRes as never)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          isEnabled: false,
          provider: null,
          connectionStatus: 'disconnected',
          connectedEmail: null,
          accessToken: null,
          refreshToken: null,
        })
      )
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Calendar disconnected',
      })
    })

    it('clears cached calendar events on disconnect', async () => {
      mockReq.headers.authorization = 'Bearer valid-token'
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }
      mockVerifyIdToken.mockResolvedValue({ uid: 'child-1' })

      let callIndex = 0
      mockGet.mockImplementation(() => {
        callIndex++
        if (callIndex === 1) {
          return Promise.resolve({
            exists: true,
            data: () => ({ parentIds: ['parent-1'] }),
          })
        } else {
          return Promise.resolve({ exists: false })
        }
      })

      await disconnectCalendar(mockReq as never, mockRes as never)

      expect(mockDoc).toHaveBeenCalledWith('families/family-1/calendarEvents/child-1')
      expect(mockDelete).toHaveBeenCalled()
    })
  })

  describe('getCalendarStatus', () => {
    it('rejects non-POST requests', async () => {
      mockReq.method = 'GET'

      await getCalendarStatus(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(405)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })

    it('returns 401 if no authentication provided', async () => {
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }

      await getCalendarStatus(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' })
    })

    it('returns default status if no config exists', async () => {
      mockReq.headers.authorization = 'Bearer valid-token'
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }
      mockVerifyIdToken.mockResolvedValue({ uid: 'child-1' })

      let callIndex = 0
      mockGet.mockImplementation(() => {
        callIndex++
        if (callIndex === 1) {
          return Promise.resolve({
            exists: true,
            data: () => ({ parentIds: ['parent-1'] }),
          })
        } else {
          return Promise.resolve({ exists: false })
        }
      })

      await getCalendarStatus(mockReq as never, mockRes as never)

      expect(mockRes.json).toHaveBeenCalledWith({
        isConnected: false,
        connectionStatus: 'disconnected',
        connectedEmail: null,
        connectedAt: null,
        lastSyncAt: null,
        lastSyncError: null,
        autoActivateFocusMode: false,
        syncFrequencyMinutes: 30,
      })
    })

    it('returns calendar status for connected calendar', async () => {
      mockReq.headers.authorization = 'Bearer valid-token'
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }
      mockVerifyIdToken.mockResolvedValue({ uid: 'child-1' })

      const connectedAt = Date.now() - 86400000
      const lastSyncAt = Date.now() - 3600000

      let callIndex = 0
      mockGet.mockImplementation(() => {
        callIndex++
        if (callIndex === 1) {
          return Promise.resolve({
            exists: true,
            data: () => ({ parentIds: ['parent-1'] }),
          })
        } else {
          return Promise.resolve({
            exists: true,
            data: () => ({
              connectionStatus: 'connected',
              connectedEmail: 'child@example.com',
              connectedAt,
              lastSyncAt,
              lastSyncError: null,
              autoActivateFocusMode: true,
              syncFrequencyMinutes: 15,
              focusTriggerKeywords: ['study', 'homework'],
            }),
          })
        }
      })

      await getCalendarStatus(mockReq as never, mockRes as never)

      expect(mockRes.json).toHaveBeenCalledWith({
        isConnected: true,
        connectionStatus: 'connected',
        connectedEmail: 'child@example.com',
        connectedAt,
        lastSyncAt,
        lastSyncError: null,
        autoActivateFocusMode: true,
        syncFrequencyMinutes: 15,
        focusTriggerKeywords: ['study', 'homework'],
      })
    })

    it('returns 403 if user is not authorized', async () => {
      mockReq.headers.authorization = 'Bearer valid-token'
      mockReq.body = { childId: 'child-1', familyId: 'family-1' }
      mockVerifyIdToken.mockResolvedValue({ uid: 'other-user' })
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })

      await getCalendarStatus(mockReq as never, mockRes as never)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not authorized to view calendar status',
      })
    })
  })
})
