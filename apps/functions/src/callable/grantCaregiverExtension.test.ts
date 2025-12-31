/**
 * grantCaregiverExtension Cloud Function Tests
 *
 * Tests for the caregiver extension granting server-side function.
 *
 * Story 19D.4 Acceptance Criteria:
 * - AC4: Parent can grant one-time access extension
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock document references
const mockDocGet = vi.fn()
const mockDocUpdate = vi.fn()

const mockDocRef = {
  get: mockDocGet,
  update: mockDocUpdate,
}

// Mock collection add for audit logs
const mockCollectionAdd = vi.fn()

// Mock collection reference
const mockCollection = vi.fn((name: string) => {
  if (name === 'auditLogs') {
    return {
      add: mockCollectionAdd,
    }
  }
  return {
    doc: vi.fn(() => mockDocRef),
  }
})

// Mock Firebase Admin
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
  Timestamp: {
    now: () => ({
      toMillis: () => Date.now(),
      toDate: () => new Date(),
    }),
    fromMillis: (ms: number) => ({
      toMillis: () => ms,
      toDate: () => new Date(ms),
    }),
  },
}))

// Mock shared auth
vi.mock('../shared/auth', () => ({
  verifyAuth: vi.fn(),
}))

import { verifyAuth } from '../shared/auth'
import { grantCaregiverExtension } from './grantCaregiverExtension'

describe('grantCaregiverExtension', () => {
  const mockUser = {
    uid: 'parent-123',
    email: 'parent@example.com',
    displayName: 'Parent',
  }

  const mockFamilyData = {
    guardianUids: ['parent-123'],
    caregiverUids: ['caregiver-456'],
    caregivers: [{ uid: 'caregiver-456', email: 'grandpa@example.com' }],
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default auth mock
    vi.mocked(verifyAuth).mockReturnValue(mockUser)

    // Default family document mock
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => mockFamilyData,
    })

    // Default update mock
    mockDocUpdate.mockResolvedValue(undefined)

    // Audit log mock
    mockCollectionAdd.mockResolvedValue({ id: 'audit-123' })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication (Step 1)', () => {
    it('rejects unauthenticated requests', async () => {
      vi.mocked(verifyAuth).mockImplementation(() => {
        throw new Error('Authentication required')
      })

      const request = {
        data: {
          familyId: 'family-789',
          caregiverId: 'caregiver-456',
          durationMinutes: 60,
        },
        auth: null,
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      await expect(grantCaregiverExtension.run(request)).rejects.toThrow('Authentication required')
    })
  })

  describe('Validation (Step 2)', () => {
    it('rejects missing familyId', async () => {
      const request = {
        data: {
          familyId: '',
          caregiverId: 'caregiver-456',
          durationMinutes: 60,
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      await expect(grantCaregiverExtension.run(request)).rejects.toThrow('Invalid input')
    })

    it('rejects missing caregiverId', async () => {
      const request = {
        data: {
          familyId: 'family-789',
          caregiverId: '',
          durationMinutes: 60,
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      await expect(grantCaregiverExtension.run(request)).rejects.toThrow('Invalid input')
    })

    it('rejects invalid duration (negative)', async () => {
      const request = {
        data: {
          familyId: 'family-789',
          caregiverId: 'caregiver-456',
          durationMinutes: -10,
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      await expect(grantCaregiverExtension.run(request)).rejects.toThrow('Invalid input')
    })

    it('rejects invalid duration (too long)', async () => {
      const request = {
        data: {
          familyId: 'family-789',
          caregiverId: 'caregiver-456',
          durationMinutes: 2000, // Over 24 hours
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      await expect(grantCaregiverExtension.run(request)).rejects.toThrow('Invalid input')
    })
  })

  describe('Permission (Step 3)', () => {
    it('rejects non-guardian users', async () => {
      mockDocGet.mockReset()
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardianUids: ['other-parent'],
          caregiverUids: ['caregiver-456'],
        }),
      })

      const request = {
        data: {
          familyId: 'family-789',
          caregiverId: 'caregiver-456',
          durationMinutes: 60,
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      await expect(grantCaregiverExtension.run(request)).rejects.toThrow(
        'Only family guardians can grant extensions'
      )
    })

    it('rejects when family not found', async () => {
      mockDocGet.mockReset()
      mockDocGet.mockResolvedValue({
        exists: false,
        data: () => null,
      })

      const request = {
        data: {
          familyId: 'family-789',
          caregiverId: 'caregiver-456',
          durationMinutes: 60,
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      await expect(grantCaregiverExtension.run(request)).rejects.toThrow('Family not found')
    })

    it('rejects when caregiver not in family', async () => {
      mockDocGet.mockReset()
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardianUids: ['parent-123'],
          caregiverUids: [], // Caregiver not in family
        }),
      })

      const request = {
        data: {
          familyId: 'family-789',
          caregiverId: 'caregiver-456',
          durationMinutes: 60,
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      await expect(grantCaregiverExtension.run(request)).rejects.toThrow(
        'Caregiver not found in family'
      )
    })
  })

  describe('Business Logic (Step 4)', () => {
    it('returns success on valid extension grant', async () => {
      const request = {
        data: {
          familyId: 'family-789',
          caregiverId: 'caregiver-456',
          durationMinutes: 60,
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      const result = await grantCaregiverExtension.run(request)

      expect(result.success).toBe(true)
      expect(result.expiresAt).toBeDefined()
      expect(result.grantedAt).toBeDefined()
    })

    it('updates family document with extension', async () => {
      const request = {
        data: {
          familyId: 'family-789',
          caregiverId: 'caregiver-456',
          durationMinutes: 60,
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      await grantCaregiverExtension.run(request)

      expect(mockDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          'caregiverExtensions.caregiver-456': expect.objectContaining({
            grantedByUid: 'parent-123',
            grantedByName: 'Parent',
          }),
        })
      )
    })

    it('logs extension to audit trail', async () => {
      const request = {
        data: {
          familyId: 'family-789',
          caregiverId: 'caregiver-456',
          durationMinutes: 60,
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      await grantCaregiverExtension.run(request)

      expect(mockCollectionAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'caregiver_extension_granted',
          familyId: 'family-789',
          caregiverId: 'caregiver-456',
          grantedByUid: 'parent-123',
          durationMinutes: 60,
        })
      )
    })
  })
})
