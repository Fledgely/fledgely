/**
 * Screenshot Audit Log Endpoint Tests
 * Story 18.7: Screenshot Access Audit Log
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase modules before importing
const mockVerifyIdToken = vi.fn()
const mockGet = vi.fn()
const mockCollection = vi.fn()
const mockDoc = vi.fn()
const mockOrderBy = vi.fn()
const mockWhere = vi.fn()
const mockLimit = vi.fn()
const mockStartAfter = vi.fn()

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: mockVerifyIdToken,
  }),
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
  }),
}))

vi.mock('firebase-functions/v2/https', () => ({
  onRequest: vi.fn((_options, handler) => handler),
}))

vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

// Import after mocks
import { auditLog } from './audit-log'

describe('Screenshot Audit Log Endpoint', () => {
  let mockReq: {
    method: string
    headers: { authorization?: string }
    query: Record<string, string | undefined>
  }
  let mockRes: {
    status: ReturnType<typeof vi.fn>
    json: ReturnType<typeof vi.fn>
    set: ReturnType<typeof vi.fn>
    send: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockReq = {
      method: 'GET',
      headers: { authorization: 'Bearer valid-token' },
      query: { childId: 'child123' },
    }

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    }

    // Default mock setup
    mockVerifyIdToken.mockResolvedValue({ uid: 'parent123', email: 'parent@example.com' })

    // Setup default chain
    mockCollection.mockReturnValue({ doc: mockDoc })
    mockDoc.mockReturnValue({
      get: mockGet,
      collection: mockCollection,
    })
    mockOrderBy.mockReturnValue({
      where: mockWhere,
      limit: mockLimit,
      startAfter: mockStartAfter,
      get: mockGet,
    })
    mockWhere.mockReturnValue({
      where: mockWhere,
      limit: mockLimit,
      get: mockGet,
    })
    mockLimit.mockReturnValue({
      get: mockGet,
      startAfter: mockStartAfter,
    })
    mockStartAfter.mockReturnValue({
      limit: mockLimit,
      get: mockGet,
    })
  })

  describe('Authentication', () => {
    it('returns 405 for non-GET requests', async () => {
      mockReq.method = 'POST'

      // @ts-expect-error - partial mock
      await auditLog(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(405)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })

    it('returns 401 when no auth header', async () => {
      mockReq.headers.authorization = undefined

      // @ts-expect-error - partial mock
      await auditLog(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authorization header required' })
    })

    it('returns 401 when auth header is not Bearer', async () => {
      mockReq.headers.authorization = 'Basic credentials'

      // @ts-expect-error - partial mock
      await auditLog(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authorization header required' })
    })

    it('returns 401 when token is invalid', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'))

      // @ts-expect-error - partial mock
      await auditLog(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid authentication token' })
    })
  })

  describe('Validation', () => {
    it('returns 400 when childId is missing', async () => {
      mockReq.query = {}

      // @ts-expect-error - partial mock
      await auditLog(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'childId parameter required' })
    })
  })

  describe('Permission', () => {
    it('returns 404 when child not found', async () => {
      mockDoc.mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
        collection: mockCollection,
      })

      // @ts-expect-error - partial mock
      await auditLog(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Child not found' })
    })

    it('returns 500 when child has no familyId', async () => {
      mockDoc.mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
        collection: mockCollection,
      })

      // @ts-expect-error - partial mock
      await auditLog(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Child has no family association' })
    })

    it('returns 404 when family not found', async () => {
      let callCount = 0
      mockDoc.mockImplementation(() => ({
        get: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            // Child doc
            return Promise.resolve({ exists: true, data: () => ({ familyId: 'family123' }) })
          }
          // Family doc
          return Promise.resolve({ exists: false })
        }),
        collection: mockCollection,
      }))

      // @ts-expect-error - partial mock
      await auditLog(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Family not found' })
    })

    it('returns 403 when user not in family', async () => {
      let callCount = 0
      mockDoc.mockImplementation(() => ({
        get: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({ exists: true, data: () => ({ familyId: 'family123' }) })
          }
          return Promise.resolve({
            exists: true,
            data: () => ({ memberIds: ['other-user'] }),
          })
        }),
        collection: mockCollection,
      }))

      // @ts-expect-error - partial mock
      await auditLog(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Not authorized to view this child's audit log",
      })
    })
  })

  describe('Summary Mode', () => {
    const setupSuccessfulAuth = () => {
      let docCallCount = 0
      mockDoc.mockImplementation((id?: string) => {
        if (id === 'child123') {
          return {
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ familyId: 'family123' }),
            }),
            collection: () => ({
              doc: mockDoc,
              orderBy: mockOrderBy,
            }),
          }
        }
        docCallCount++
        if (docCallCount === 1) {
          // Family doc
          return {
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ memberIds: ['parent123'] }),
            }),
          }
        }
        // Cursor doc for pagination
        return {
          get: vi.fn().mockResolvedValue({ exists: false }),
        }
      })
    }

    it('returns empty summary when no audit records exist', async () => {
      setupSuccessfulAuth()
      mockGet.mockResolvedValue({ docs: [] })

      // @ts-expect-error - partial mock
      await auditLog(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        mode: 'summary',
        childId: 'child123',
        summary: [],
        hasMore: false,
        nextCursor: undefined,
      })
    })

    it('returns aggregated summary by viewer', async () => {
      setupSuccessfulAuth()
      const now = Date.now()
      mockGet.mockResolvedValue({
        docs: [
          {
            id: 'view1',
            data: () => ({
              viewerId: 'viewer1',
              viewerEmail: 'viewer1@example.com',
              screenshotId: 'ss1',
              childId: 'child123',
              timestamp: now,
            }),
          },
          {
            id: 'view2',
            data: () => ({
              viewerId: 'viewer1',
              viewerEmail: 'viewer1@example.com',
              screenshotId: 'ss2',
              childId: 'child123',
              timestamp: now - 1000,
            }),
          },
          {
            id: 'view3',
            data: () => ({
              viewerId: 'viewer2',
              viewerEmail: 'viewer2@example.com',
              screenshotId: 'ss3',
              childId: 'child123',
              timestamp: now - 2000,
            }),
          },
        ],
      })

      // @ts-expect-error - partial mock
      await auditLog(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      const response = mockRes.json.mock.calls[0][0]
      expect(response.mode).toBe('summary')
      expect(response.summary).toHaveLength(2)
      expect(response.summary[0].viewerId).toBe('viewer1')
      expect(response.summary[0].totalViews).toBe(2)
      expect(response.summary[1].viewerId).toBe('viewer2')
      expect(response.summary[1].totalViews).toBe(1)
    })

    it('groups views by date in summary', async () => {
      setupSuccessfulAuth()
      const today = new Date('2024-12-14T10:00:00Z').getTime()
      const yesterday = new Date('2024-12-13T10:00:00Z').getTime()

      mockGet.mockResolvedValue({
        docs: [
          {
            id: 'view1',
            data: () => ({
              viewerId: 'viewer1',
              viewerEmail: 'viewer1@example.com',
              screenshotId: 'ss1',
              childId: 'child123',
              timestamp: today,
            }),
          },
          {
            id: 'view2',
            data: () => ({
              viewerId: 'viewer1',
              viewerEmail: 'viewer1@example.com',
              screenshotId: 'ss2',
              childId: 'child123',
              timestamp: today + 1000,
            }),
          },
          {
            id: 'view3',
            data: () => ({
              viewerId: 'viewer1',
              viewerEmail: 'viewer1@example.com',
              screenshotId: 'ss3',
              childId: 'child123',
              timestamp: yesterday,
            }),
          },
        ],
      })

      // @ts-expect-error - partial mock
      await auditLog(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      const response = mockRes.json.mock.calls[0][0]
      expect(response.summary[0].totalViews).toBe(3)
      expect(response.summary[0].viewsByDate).toHaveLength(2)
    })
  })

  describe('Detail Mode', () => {
    const setupSuccessfulAuth = () => {
      let docCallCount = 0
      mockDoc.mockImplementation((id?: string) => {
        if (id === 'child123') {
          return {
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ familyId: 'family123' }),
            }),
            collection: () => ({
              doc: mockDoc,
              orderBy: mockOrderBy,
            }),
          }
        }
        docCallCount++
        if (docCallCount === 1) {
          return {
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ memberIds: ['parent123'] }),
            }),
          }
        }
        return {
          get: vi.fn().mockResolvedValue({ exists: false }),
        }
      })
    }

    it('returns detailed records when mode=detail', async () => {
      setupSuccessfulAuth()
      mockReq.query.mode = 'detail'
      const now = Date.now()

      mockGet.mockResolvedValue({
        docs: [
          {
            id: 'view1',
            data: () => ({
              viewerId: 'viewer1',
              viewerEmail: 'viewer1@example.com',
              screenshotId: 'ss1',
              childId: 'child123',
              timestamp: now,
            }),
          },
        ],
      })

      // @ts-expect-error - partial mock
      await auditLog(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      const response = mockRes.json.mock.calls[0][0]
      expect(response.mode).toBe('detail')
      expect(response.records).toHaveLength(1)
      expect(response.records[0].viewId).toBe('view1')
      expect(response.records[0].screenshotId).toBe('ss1')
    })
  })

  describe('Pagination', () => {
    const setupSuccessfulAuth = () => {
      let docCallCount = 0
      mockDoc.mockImplementation((id?: string) => {
        if (id === 'child123') {
          return {
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ familyId: 'family123' }),
            }),
            collection: () => ({
              doc: mockDoc,
              orderBy: mockOrderBy,
            }),
          }
        }
        docCallCount++
        if (docCallCount === 1) {
          return {
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ memberIds: ['parent123'] }),
            }),
          }
        }
        return {
          get: vi.fn().mockResolvedValue({ exists: false }),
        }
      })
    }

    it('indicates hasMore when more results exist', async () => {
      setupSuccessfulAuth()
      mockReq.query.limit = '2'
      mockReq.query.mode = 'detail'

      // Return 3 docs (limit+1 to indicate more)
      mockGet.mockResolvedValue({
        docs: [
          { id: 'view1', data: () => ({ viewerId: 'v1', timestamp: 100 }) },
          { id: 'view2', data: () => ({ viewerId: 'v1', timestamp: 99 }) },
          { id: 'view3', data: () => ({ viewerId: 'v1', timestamp: 98 }) },
        ],
      })

      // @ts-expect-error - partial mock
      await auditLog(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      const response = mockRes.json.mock.calls[0][0]
      expect(response.hasMore).toBe(true)
      expect(response.records).toHaveLength(2) // Limited to 2
      expect(response.nextCursor).toBe('view2')
    })

    it('hasMore is false when no more results', async () => {
      setupSuccessfulAuth()
      mockReq.query.limit = '10'
      mockReq.query.mode = 'detail'

      mockGet.mockResolvedValue({
        docs: [
          { id: 'view1', data: () => ({ viewerId: 'v1', timestamp: 100 }) },
          { id: 'view2', data: () => ({ viewerId: 'v1', timestamp: 99 }) },
        ],
      })

      // @ts-expect-error - partial mock
      await auditLog(mockReq, mockRes)

      const response = mockRes.json.mock.calls[0][0]
      expect(response.hasMore).toBe(false)
      expect(response.nextCursor).toBeUndefined()
    })

    it('limits query to max 500', async () => {
      setupSuccessfulAuth()
      mockReq.query.limit = '1000'
      mockGet.mockResolvedValue({ docs: [] })

      // @ts-expect-error - partial mock
      await auditLog(mockReq, mockRes)

      // Verify limit was called with 501 (500+1)
      expect(mockLimit).toHaveBeenCalledWith(501)
    })
  })

  describe('Error Handling', () => {
    it('returns 500 on query error', async () => {
      let docCallCount = 0
      mockDoc.mockImplementation((id?: string) => {
        if (id === 'child123') {
          return {
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ familyId: 'family123' }),
            }),
            collection: () => ({
              doc: mockDoc,
              orderBy: () => ({
                limit: () => ({
                  get: vi.fn().mockRejectedValue(new Error('Query failed')),
                }),
              }),
            }),
          }
        }
        docCallCount++
        if (docCallCount === 1) {
          return {
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ memberIds: ['parent123'] }),
            }),
          }
        }
        return {
          get: vi.fn().mockResolvedValue({ exists: false }),
        }
      })

      // @ts-expect-error - partial mock
      await auditLog(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to retrieve audit log' })
    })
  })
})
