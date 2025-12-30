/**
 * Storage Status Endpoint Tests
 * Story 18.8: Storage Quota Monitoring
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase modules
const mockVerifyIdToken = vi.fn()
const mockGet = vi.fn()
const mockCollection = vi.fn()
const mockDoc = vi.fn()

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

// Mock the storage library
vi.mock('../../lib/storage', () => ({
  getFamilyStorageUsage: vi.fn(),
}))

import { storageStatus } from './status'
import { getFamilyStorageUsage } from '../../lib/storage'

describe('Storage Status Endpoint', () => {
  let mockReq: {
    method: string
    headers: { authorization?: string }
    query: Record<string, string | undefined>
  }
  let mockRes: {
    status: ReturnType<typeof vi.fn>
    json: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockReq = {
      method: 'GET',
      headers: { authorization: 'Bearer valid-token' },
      query: { familyId: 'family123' },
    }

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }

    mockVerifyIdToken.mockResolvedValue({ uid: 'user123' })
    mockCollection.mockReturnValue({ doc: mockDoc })
    mockDoc.mockReturnValue({ get: mockGet })
  })

  describe('Authentication', () => {
    it('returns 405 for non-GET requests', async () => {
      mockReq.method = 'POST'

      // @ts-expect-error - partial mock
      await storageStatus(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(405)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })

    it('returns 401 when no auth header', async () => {
      mockReq.headers.authorization = undefined

      // @ts-expect-error - partial mock
      await storageStatus(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authorization header required' })
    })

    it('returns 401 when token is invalid', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'))

      // @ts-expect-error - partial mock
      await storageStatus(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid authentication token' })
    })
  })

  describe('Validation', () => {
    it('returns 400 when familyId is missing', async () => {
      mockReq.query = {}

      // @ts-expect-error - partial mock
      await storageStatus(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'familyId parameter required' })
    })
  })

  describe('Permission', () => {
    it('returns 404 when family not found', async () => {
      mockGet.mockResolvedValue({ exists: false })

      // @ts-expect-error - partial mock
      await storageStatus(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Family not found' })
    })

    it('returns 403 when user not in family', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ memberIds: ['other-user'] }),
      })

      // @ts-expect-error - partial mock
      await storageStatus(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Not authorized to view this family's storage",
      })
    })
  })

  describe('Success', () => {
    beforeEach(() => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ memberIds: ['user123'] }),
      })
    })

    it('returns storage status for authorized user', async () => {
      const mockUsage = {
        familyId: 'family123',
        usageBytes: 500 * 1024 * 1024, // 500 MB
        quotaBytes: 1024 * 1024 * 1024, // 1 GB
        percentUsed: 50,
        plan: 'free' as const,
        isWarningLevel: false,
        isQuotaExceeded: false,
      }

      vi.mocked(getFamilyStorageUsage).mockResolvedValue(mockUsage)

      // @ts-expect-error - partial mock
      await storageStatus(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      const response = mockRes.json.mock.calls[0][0]
      expect(response.familyId).toBe('family123')
      expect(response.usageBytes).toBe(500 * 1024 * 1024)
      expect(response.quotaBytes).toBe(1024 * 1024 * 1024)
      expect(response.percentUsed).toBe(50)
      expect(response.plan).toBe('free')
      expect(response.isWarningLevel).toBe(false)
      expect(response.isQuotaExceeded).toBe(false)
    })

    it('includes formatted usage strings', async () => {
      const mockUsage = {
        familyId: 'family123',
        usageBytes: 500 * 1024 * 1024, // 500 MB
        quotaBytes: 1024 * 1024 * 1024, // 1 GB
        percentUsed: 50,
        plan: 'free' as const,
        isWarningLevel: false,
        isQuotaExceeded: false,
      }

      vi.mocked(getFamilyStorageUsage).mockResolvedValue(mockUsage)

      // @ts-expect-error - partial mock
      await storageStatus(mockReq, mockRes)

      const response = mockRes.json.mock.calls[0][0]
      expect(response.usageFormatted).toBeDefined()
      expect(response.quotaFormatted).toBeDefined()
    })

    it('returns warning level status correctly', async () => {
      const mockUsage = {
        familyId: 'family123',
        usageBytes: 850 * 1024 * 1024, // 850 MB
        quotaBytes: 1024 * 1024 * 1024, // 1 GB
        percentUsed: 83,
        plan: 'free' as const,
        isWarningLevel: true,
        isQuotaExceeded: false,
      }

      vi.mocked(getFamilyStorageUsage).mockResolvedValue(mockUsage)

      // @ts-expect-error - partial mock
      await storageStatus(mockReq, mockRes)

      const response = mockRes.json.mock.calls[0][0]
      expect(response.isWarningLevel).toBe(true)
      expect(response.isQuotaExceeded).toBe(false)
    })

    it('returns quota exceeded status correctly', async () => {
      const mockUsage = {
        familyId: 'family123',
        usageBytes: 1024 * 1024 * 1024, // 1 GB
        quotaBytes: 1024 * 1024 * 1024, // 1 GB
        percentUsed: 100,
        plan: 'free' as const,
        isWarningLevel: true,
        isQuotaExceeded: true,
      }

      vi.mocked(getFamilyStorageUsage).mockResolvedValue(mockUsage)

      // @ts-expect-error - partial mock
      await storageStatus(mockReq, mockRes)

      const response = mockRes.json.mock.calls[0][0]
      expect(response.isQuotaExceeded).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('returns 500 on service error', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ memberIds: ['user123'] }),
      })

      vi.mocked(getFamilyStorageUsage).mockRejectedValue(new Error('Service error'))

      // @ts-expect-error - partial mock
      await storageStatus(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to retrieve storage status' })
    })
  })
})
