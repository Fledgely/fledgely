/**
 * getActiveOfflineException Tests - Story 32.5
 *
 * Tests for the getActiveOfflineException HTTP endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore
const mockGet = vi.fn()
const mockUpdate = vi.fn()
const mockLimit = vi.fn(() => ({ get: mockGet }))
const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }))
const mockCollection = vi.fn()
const mockDoc = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: (name: string) => {
      mockCollection(name)
      return {
        doc: (id: string) => {
          mockDoc(id)
          return {
            collection: (subName: string) => {
              mockCollection(subName)
              return {
                where: mockWhere,
              }
            },
          }
        },
      }
    },
  }),
}))

vi.mock('firebase-functions/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

vi.mock('firebase-functions/v2/https', () => ({
  onRequest: vi.fn((_config, handler) => handler),
}))

// Import after mocks
import { getActiveOfflineException } from './getActiveOfflineException'

describe('getActiveOfflineException - Story 32.5', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock chain
    mockWhere.mockReturnValue({ orderBy: mockOrderBy })
    mockOrderBy.mockReturnValue({ limit: mockLimit })
    mockLimit.mockReturnValue({ get: mockGet })
  })

  describe('request validation', () => {
    it('rejects non-POST requests', async () => {
      const req = { method: 'GET', body: {} } as never
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as never

      await (getActiveOfflineException as (req: never, res: never) => Promise<void>)(req, res)

      expect(res.status).toHaveBeenCalledWith(405)
      expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })

    it('rejects request without familyId', async () => {
      const req = { method: 'POST', body: {} } as never
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as never

      await (getActiveOfflineException as (req: never, res: never) => Promise<void>)(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid request' }))
    })

    it('rejects request with empty familyId', async () => {
      const req = { method: 'POST', body: { familyId: '' } } as never
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as never

      await (getActiveOfflineException as (req: never, res: never) => Promise<void>)(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('exception fetching', () => {
    it('returns 404 when no active exception exists', async () => {
      mockGet.mockResolvedValue({ empty: true, docs: [] })

      const req = { method: 'POST', body: { familyId: 'family-123' } } as never
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as never

      await (getActiveOfflineException as (req: never, res: never) => Promise<void>)(req, res)

      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'active')
      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: 'No active exception' })
    })

    it('returns active exception when one exists', async () => {
      const mockException = {
        familyId: 'family-123',
        type: 'pause',
        requestedBy: 'parent-1',
        requestedByName: 'Mom',
        startTime: Date.now(),
        endTime: null,
        status: 'active',
        createdAt: Date.now(),
      }

      mockGet.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'exc-123',
            ref: { update: mockUpdate },
            data: () => mockException,
          },
        ],
      })

      const req = { method: 'POST', body: { familyId: 'family-123' } } as never
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as never

      await (getActiveOfflineException as (req: never, res: never) => Promise<void>)(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'exc-123',
          familyId: 'family-123',
          type: 'pause',
          status: 'active',
        })
      )
    })

    it('auto-completes expired exceptions and returns 404', async () => {
      const expiredTime = Date.now() - 3600000 // 1 hour ago

      const mockException = {
        familyId: 'family-123',
        type: 'skip',
        requestedBy: 'parent-1',
        startTime: expiredTime - 3600000,
        endTime: expiredTime, // Expired
        status: 'active',
        createdAt: expiredTime - 3600000,
      }

      mockUpdate.mockResolvedValue(undefined)

      mockGet.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'exc-expired',
            ref: { update: mockUpdate },
            data: () => mockException,
          },
        ],
      })

      const req = { method: 'POST', body: { familyId: 'family-123' } } as never
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as never

      await (getActiveOfflineException as (req: never, res: never) => Promise<void>)(req, res)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        })
      )
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns exception with whitelisted URLs for work type', async () => {
      const mockException = {
        familyId: 'family-123',
        type: 'work',
        requestedBy: 'parent-1',
        requestedByName: 'Dad',
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        status: 'active',
        createdAt: Date.now(),
        whitelistedUrls: ['slack.com', 'github.com'],
      }

      mockGet.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'exc-work',
            ref: { update: mockUpdate },
            data: () => mockException,
          },
        ],
      })

      const req = { method: 'POST', body: { familyId: 'family-123' } } as never
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as never

      await (getActiveOfflineException as (req: never, res: never) => Promise<void>)(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'work',
          whitelistedUrls: ['slack.com', 'github.com'],
        })
      )
    })

    it('returns exception with whitelisted categories for homework type', async () => {
      const mockException = {
        familyId: 'family-123',
        type: 'homework',
        requestedBy: 'child-1',
        requestedByName: 'Emma',
        approvedBy: 'parent-1',
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        status: 'active',
        createdAt: Date.now(),
        whitelistedCategories: ['education', 'reference'],
      }

      mockGet.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'exc-homework',
            ref: { update: mockUpdate },
            data: () => mockException,
          },
        ],
      })

      const req = { method: 'POST', body: { familyId: 'family-123' } } as never
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as never

      await (getActiveOfflineException as (req: never, res: never) => Promise<void>)(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'homework',
          approvedBy: 'parent-1',
          whitelistedCategories: ['education', 'reference'],
        })
      )
    })
  })

  describe('error handling', () => {
    it('returns 500 on Firestore error', async () => {
      mockGet.mockRejectedValue(new Error('Firestore error'))

      const req = { method: 'POST', body: { familyId: 'family-123' } } as never
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as never

      await (getActiveOfflineException as (req: never, res: never) => Promise<void>)(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
    })
  })
})
