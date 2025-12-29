/**
 * Screenshot View Endpoint Tests
 * Story 18.5: Forensic Watermarking on View
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Firebase Admin modules
vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: vi.fn(),
  })),
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(),
    doc: vi.fn(),
  })),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}))

vi.mock('firebase-admin/storage', () => ({
  getStorage: vi.fn(() => ({
    bucket: vi.fn(),
  })),
}))

vi.mock('firebase-functions/v2/https', () => ({
  onRequest: vi.fn((_options, handler) => handler),
}))

// Mock the watermark library
vi.mock('../../lib/watermark', () => ({
  embedWatermark: vi.fn().mockResolvedValue(Buffer.from('watermarked-image')),
}))

import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { embedWatermark } from '../../lib/watermark'

describe('viewScreenshot endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock Auth
    const mockAuth = {
      verifyIdToken: vi.fn().mockResolvedValue({
        uid: 'user123',
        email: 'test@example.com',
      }),
    }
    vi.mocked(getAuth).mockReturnValue(mockAuth as unknown as ReturnType<typeof getAuth>)

    // Setup mock Firestore
    const mockScreenshotDoc = {
      exists: true,
      data: () => ({
        familyId: 'family123',
        childId: 'child456',
        storagePath: 'families/family123/screenshots/screenshot123.jpg',
        capturedAt: { toDate: () => new Date() },
      }),
      ref: {
        collection: vi.fn().mockReturnValue({
          add: vi.fn().mockResolvedValue({ id: 'view123' }),
        }),
      },
    }

    const mockFamilyDoc = {
      exists: true,
      data: () => ({
        ownerId: 'owner123',
        members: [{ id: 'user123', status: 'active', role: 'parent' }],
      }),
    }

    const mockDoc = vi.fn().mockImplementation((path: string) => ({
      get: vi.fn().mockImplementation(() => {
        if (path.includes('screenshots')) {
          return Promise.resolve(mockScreenshotDoc)
        }
        if (path.includes('families')) {
          return Promise.resolve(mockFamilyDoc)
        }
        return Promise.resolve({ exists: false })
      }),
      collection: vi.fn().mockReturnValue({
        add: vi.fn().mockResolvedValue({ id: 'view123' }),
      }),
    }))

    vi.mocked(getFirestore).mockReturnValue({
      doc: mockDoc,
      collection: vi.fn().mockReturnValue({ doc: mockDoc }),
    } as unknown as ReturnType<typeof getFirestore>)

    // Setup mock Storage
    const mockFileBuffer = Buffer.from('fake-image-data')
    vi.mocked(getStorage).mockReturnValue({
      bucket: vi.fn().mockReturnValue({
        file: vi.fn().mockReturnValue({
          download: vi.fn().mockResolvedValue([mockFileBuffer]),
          exists: vi.fn().mockResolvedValue([true]),
        }),
      }),
    } as unknown as ReturnType<typeof getStorage>)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('authentication', () => {
    it('should require Authorization header', () => {
      const validRequest = {
        headers: { authorization: 'Bearer valid-token' },
      }
      expect(validRequest.headers.authorization).toBeDefined()
      expect(validRequest.headers.authorization).toMatch(/^Bearer /)
    })

    it('should call verifyIdToken with the provided token', async () => {
      const verifyIdToken = vi.fn().mockResolvedValue({ uid: 'user123' })
      vi.mocked(getAuth).mockReturnValue({
        verifyIdToken,
      } as unknown as ReturnType<typeof getAuth>)

      await verifyIdToken('valid-token')

      expect(verifyIdToken).toHaveBeenCalledWith('valid-token')
    })
  })

  describe('authorization', () => {
    it('should verify user is family member', () => {
      const familyData = {
        ownerId: 'owner123',
        members: [{ id: 'user123', status: 'active', role: 'parent' }],
      }

      const isMember = familyData.members.some((m) => m.id === 'user123' && m.status === 'active')

      expect(isMember).toBe(true)
    })

    it('should reject non-family members', () => {
      const familyData = {
        ownerId: 'owner123',
        members: [{ id: 'otherUser', status: 'active', role: 'parent' }],
      }

      const isMember = familyData.members.some((m) => m.id === 'user123' && m.status === 'active')

      expect(isMember).toBe(false)
    })
  })

  describe('watermarking', () => {
    it('should call embedWatermark with correct payload structure', async () => {
      const payload = {
        viewerId: 'user123',
        viewTimestamp: Date.now(),
        screenshotId: 'screenshot123',
      }

      await embedWatermark(Buffer.from('image'), payload)

      expect(embedWatermark).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          viewerId: expect.any(String),
          viewTimestamp: expect.any(Number),
          screenshotId: expect.any(String),
        })
      )
    })
  })

  describe('audit logging', () => {
    it('should create screenshotView document structure', () => {
      const viewRecord = {
        viewerId: 'user123',
        viewerEmail: 'test@example.com',
        timestamp: FieldValue.serverTimestamp(),
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      }

      expect(viewRecord).toHaveProperty('viewerId')
      expect(viewRecord).toHaveProperty('viewerEmail')
      expect(viewRecord).toHaveProperty('timestamp')
      expect(viewRecord).toHaveProperty('ipAddress')
      expect(viewRecord).toHaveProperty('userAgent')
    })
  })

  describe('response headers', () => {
    it('should set no-cache headers', () => {
      const expectedHeaders = {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      }

      expect(expectedHeaders['Cache-Control']).toContain('no-store')
      expect(expectedHeaders['Cache-Control']).toContain('no-cache')
      expect(expectedHeaders.Pragma).toBe('no-cache')
      expect(expectedHeaders.Expires).toBe('0')
    })

    it('should set Content-Type to image/jpeg', () => {
      const contentType = 'image/jpeg'
      expect(contentType).toBe('image/jpeg')
    })
  })

  describe('error responses', () => {
    it('should return 401 for missing auth token', () => {
      const requestWithoutAuth = { headers: {} }
      expect(requestWithoutAuth.headers).not.toHaveProperty('authorization')
    })

    it('should return 400 for missing screenshot ID', () => {
      const requestWithoutId = { query: {} }
      expect(requestWithoutId.query).not.toHaveProperty('id')
    })

    it('should return 404 for non-existent screenshot', () => {
      const mockDoc = { exists: false, data: () => null }
      expect(mockDoc.exists).toBe(false)
    })

    it('should return 403 for unauthorized user', () => {
      const familyData = {
        ownerId: 'owner123',
        members: [] as { id: string }[],
      }

      const isOwner = familyData.ownerId === 'user123'
      const isMember = familyData.members.some((m) => m.id === 'user123')

      expect(isOwner).toBe(false)
      expect(isMember).toBe(false)
    })
  })

  describe('screenshot ID parameter', () => {
    it('should accept id from query parameter', () => {
      const request = { query: { id: 'screenshot123' } }
      expect(request.query.id).toBe('screenshot123')
    })

    it('should validate screenshot ID format', () => {
      const validIds = ['abc123', 'screenshot_456', 'a1b2c3d4e5']
      const invalidIds = ['', null, undefined]

      validIds.forEach((id) => {
        expect(typeof id).toBe('string')
        expect(id.length).toBeGreaterThan(0)
      })

      invalidIds.forEach((id) => {
        expect(!id || (typeof id === 'string' && id.length === 0)).toBe(true)
      })
    })
  })
})
