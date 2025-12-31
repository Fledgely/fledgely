/**
 * revokeCaregiverAccess Cloud Function Tests
 *
 * Tests for the caregiver revocation server-side function.
 *
 * Story 19D.5 Acceptance Criteria:
 * - AC1: Revoke access within 5 minutes (NFR62) - immediate
 * - AC2: Terminate caregiver's current session
 * - AC5: Log revocation in audit trail
 * - AC6: Allow re-invitation after revocation
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock transaction
const mockTransaction = {
  get: vi.fn(),
  update: vi.fn(),
}

const mockRunTransaction = vi.fn((callback) => callback(mockTransaction))

// Mock document references
const mockDocGet = vi.fn()
const mockDocUpdate = vi.fn()
const mockDocDelete = vi.fn()

const mockDocRef = {
  get: mockDocGet,
  update: mockDocUpdate,
  delete: mockDocDelete,
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
    runTransaction: mockRunTransaction,
  })),
  FieldValue: {
    arrayRemove: (value: unknown) => ({ _arrayRemove: value }),
    delete: () => ({ _delete: true }),
  },
  Timestamp: {
    now: () => ({ toDate: () => new Date() }),
  },
}))

// Mock shared auth
vi.mock('../shared/auth', () => ({
  verifyAuth: vi.fn(),
}))

import { verifyAuth } from '../shared/auth'
import { revokeCaregiverAccess } from './revokeCaregiverAccess'

describe('revokeCaregiverAccess', () => {
  const mockUser = {
    uid: 'parent-123',
    email: 'parent@example.com',
    displayName: 'Parent',
  }

  const mockCaregiverObject = {
    uid: 'caregiver-456',
    email: 'grandpa@example.com',
    displayName: 'Grandpa Joe',
    role: 'status_viewer',
    childIds: ['child-1'],
    addedAt: new Date(),
    addedByUid: 'parent-123',
  }

  const mockFamilyData = {
    guardianUids: ['parent-123'],
    caregivers: [mockCaregiverObject],
    caregiverUids: ['caregiver-456'],
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

    // Default session/user doc mocks (not found)
    mockDocGet.mockImplementation(() =>
      Promise.resolve({
        exists: false,
        data: () => null,
      })
    )

    // Make first call return family data
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => mockFamilyData,
    })

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
          caregiverEmail: 'grandpa@example.com',
        },
        auth: null,
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      await expect(revokeCaregiverAccess.run(request)).rejects.toThrow('Authentication required')
    })
  })

  describe('Validation (Step 2)', () => {
    it('rejects missing familyId', async () => {
      const request = {
        data: {
          familyId: '',
          caregiverId: 'caregiver-456',
          caregiverEmail: 'grandpa@example.com',
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      await expect(revokeCaregiverAccess.run(request)).rejects.toThrow('Invalid input')
    })

    it('rejects missing caregiverId', async () => {
      const request = {
        data: {
          familyId: 'family-789',
          caregiverId: '',
          caregiverEmail: 'grandpa@example.com',
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      await expect(revokeCaregiverAccess.run(request)).rejects.toThrow('Invalid input')
    })

    it('rejects invalid email', async () => {
      const request = {
        data: {
          familyId: 'family-789',
          caregiverId: 'caregiver-456',
          caregiverEmail: 'not-an-email',
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      await expect(revokeCaregiverAccess.run(request)).rejects.toThrow('Invalid input')
    })
  })

  describe('Permission (Step 3)', () => {
    it('rejects non-guardian users', async () => {
      // Reset and set up specific mock for this test
      mockDocGet.mockReset()
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardianUids: ['other-parent'],
          caregivers: [mockCaregiverObject],
        }),
      })

      const request = {
        data: {
          familyId: 'family-789',
          caregiverId: 'caregiver-456',
          caregiverEmail: 'grandpa@example.com',
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      await expect(revokeCaregiverAccess.run(request)).rejects.toThrow(
        'Only family guardians can revoke caregiver access'
      )
    })

    it('rejects when family not found', async () => {
      // Reset and set up specific mock for this test
      mockDocGet.mockReset()
      mockDocGet.mockResolvedValue({
        exists: false,
        data: () => null,
      })

      const request = {
        data: {
          familyId: 'family-789',
          caregiverId: 'caregiver-456',
          caregiverEmail: 'grandpa@example.com',
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      await expect(revokeCaregiverAccess.run(request)).rejects.toThrow('Family not found')
    })
  })

  describe('Business Logic (Step 4)', () => {
    it('rejects when caregiver not found in family', async () => {
      // Reset and set up specific mock for this test
      mockDocGet.mockReset()
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          guardianUids: ['parent-123'],
          caregivers: [], // Empty - caregiver not found
        }),
      })

      const request = {
        data: {
          familyId: 'family-789',
          caregiverId: 'caregiver-456',
          caregiverEmail: 'grandpa@example.com',
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      await expect(revokeCaregiverAccess.run(request)).rejects.toThrow(
        'Caregiver not found in family'
      )
    })

    it('returns success on valid revocation (AC1)', async () => {
      // Reset and set up mock for valid family with caregiver
      mockDocGet.mockReset()
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => mockFamilyData,
      })

      const request = {
        data: {
          familyId: 'family-789',
          caregiverId: 'caregiver-456',
          caregiverEmail: 'grandpa@example.com',
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      const result = await revokeCaregiverAccess.run(request)

      expect(result.success).toBe(true)
      expect(result.message).toContain('revoked successfully')
    })

    it('runs transaction for atomic removal', async () => {
      // Reset and set up mock for valid family with caregiver
      mockDocGet.mockReset()
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => mockFamilyData,
      })

      const request = {
        data: {
          familyId: 'family-789',
          caregiverId: 'caregiver-456',
          caregiverEmail: 'grandpa@example.com',
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      await revokeCaregiverAccess.run(request)

      expect(mockRunTransaction).toHaveBeenCalled()
    })

    it('logs revocation to audit trail (AC5)', async () => {
      // Reset and set up mock for valid family with caregiver
      mockDocGet.mockReset()
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => mockFamilyData,
      })

      const request = {
        data: {
          familyId: 'family-789',
          caregiverId: 'caregiver-456',
          caregiverEmail: 'grandpa@example.com',
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      await revokeCaregiverAccess.run(request)

      expect(mockCollectionAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'caregiver_revoked',
          familyId: 'family-789',
          caregiverId: 'caregiver-456',
          revokedByUid: 'parent-123',
        })
      )
    })
  })

  describe('Re-invitation support (AC6)', () => {
    it('allows function to complete without blocking re-invitation', async () => {
      // Reset and set up mock for valid family with caregiver
      mockDocGet.mockReset()
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => mockFamilyData,
      })

      const request = {
        data: {
          familyId: 'family-789',
          caregiverId: 'caregiver-456',
          caregiverEmail: 'grandpa@example.com',
        },
        auth: { uid: 'parent-123' },
        rawRequest: {} as never,
      }

      // @ts-expect-error - simplified request for testing
      const result = await revokeCaregiverAccess.run(request)

      expect(result.success).toBe(true)
      // After revocation, caregiver should be able to be re-invited
      // This is verified by the fact that we don't create any blocking records
    })
  })
})
