import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createCoParentInvitation,
  getExistingPendingInvitation,
  getInvitation,
  revokeInvitation,
  verifyInvitationToken,
} from './invitationService'

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-token-12345'),
}))

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
  writeBatch: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

// Mock Web Crypto API
const mockDigest = vi.fn()
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: mockDigest,
    },
  },
})

// Import mocked functions after mocking
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'

const mockDoc = vi.mocked(doc)
const mockGetDoc = vi.mocked(getDoc)
const mockGetDocs = vi.mocked(getDocs)
const mockCollection = vi.mocked(collection)
const mockQuery = vi.mocked(query)
const mockWhere = vi.mocked(where)
const mockWriteBatch = vi.mocked(writeBatch)

/**
 * Invitation Service Tests
 *
 * Story 3.1: Co-Parent Invitation Generation
 *
 * Tests verify:
 * - Invitation creation with proper validation
 * - Guardian permission verification
 * - Family children prerequisite check
 * - Single pending invitation limit
 * - Token generation and hashing
 * - Firestore operations
 */

describe('invitationService', () => {
  const mockBatch = {
    set: vi.fn(),
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockWriteBatch.mockReturnValue(mockBatch as unknown as ReturnType<typeof writeBatch>)

    // Setup crypto mock to return a predictable hash
    mockDigest.mockResolvedValue(new ArrayBuffer(32))
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createCoParentInvitation', () => {
    const userId = 'user-123'
    const familyId = 'family-456'
    const invitationId = 'invitation-789'

    const setupSuccessfulMocks = () => {
      // Mock collection and doc
      mockCollection.mockReturnValue({ id: 'invitations' } as ReturnType<typeof collection>)
      mockDoc.mockReturnValue({ id: invitationId } as ReturnType<typeof doc>)
      mockQuery.mockReturnValue({} as ReturnType<typeof query>)
      mockWhere.mockReturnValue({} as ReturnType<typeof where>)

      // Mock family document (guardian check)
      const familyDocMock = {
        exists: () => true,
        data: () => ({
          name: 'Smith Family',
          guardians: [
            { uid: userId, role: 'primary', permissions: 'full' },
          ],
        }),
      }

      // Mock user document
      const userDocMock = {
        exists: () => true,
        data: () => ({
          displayName: 'Jane Smith',
        }),
      }

      // Mock children query (has children)
      const childrenQueryMock = {
        empty: false,
        docs: [{ id: 'child-1' }],
      }

      // Mock no existing pending invitation
      const invitationQueryMock = {
        empty: true,
        docs: [],
      }

      let getDocCallCount = 0
      mockGetDoc.mockImplementation(() => {
        getDocCallCount++
        if (getDocCallCount === 1) {
          return Promise.resolve(familyDocMock as unknown as Awaited<ReturnType<typeof getDoc>>)
        }
        return Promise.resolve(userDocMock as unknown as Awaited<ReturnType<typeof getDoc>>)
      })

      let getDocsCallCount = 0
      mockGetDocs.mockImplementation(() => {
        getDocsCallCount++
        if (getDocsCallCount === 1) {
          return Promise.resolve(childrenQueryMock as ReturnType<typeof getDocs>)
        }
        return Promise.resolve(invitationQueryMock as ReturnType<typeof getDocs>)
      })
    }

    it('creates invitation successfully with all prerequisites met', async () => {
      setupSuccessfulMocks()

      const result = await createCoParentInvitation(
        { familyId, expiryDays: '7' },
        userId
      )

      expect(result.invitation).toBeDefined()
      expect(result.invitation.familyId).toBe(familyId)
      expect(result.invitation.status).toBe('pending')
      expect(result.invitation.invitedBy).toBe(userId)
      expect(result.token).toBe('mock-uuid-token-12345')
      expect(result.invitationLink).toContain('/join/')
      expect(result.invitationLink).toContain('token=mock-uuid-token-12345')
      expect(mockBatch.set).toHaveBeenCalled()
      expect(mockBatch.commit).toHaveBeenCalled()
    })

    it('uses default expiry of 7 days when not specified', async () => {
      setupSuccessfulMocks()

      const result = await createCoParentInvitation(
        { familyId },
        userId
      )

      // Expiry should be 7 days from now
      const expectedExpiry = new Date()
      expectedExpiry.setDate(expectedExpiry.getDate() + 7)

      const actualExpiry = result.invitation.expiresAt
      // Allow 1 minute tolerance for test execution time
      expect(actualExpiry.getTime()).toBeGreaterThan(
        expectedExpiry.getTime() - 60000
      )
      expect(actualExpiry.getTime()).toBeLessThan(
        expectedExpiry.getTime() + 60000
      )
    })

    it('throws error when family not found', async () => {
      mockCollection.mockReturnValue({ id: 'families' } as ReturnType<typeof collection>)
      mockDoc.mockReturnValue({ id: familyId } as ReturnType<typeof doc>)
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as unknown as Awaited<ReturnType<typeof getDoc>>)

      await expect(
        createCoParentInvitation({ familyId }, userId)
      ).rejects.toThrow()
    })

    it('throws error when user is not a guardian', async () => {
      mockCollection.mockReturnValue({ id: 'families' } as ReturnType<typeof collection>)
      mockDoc.mockReturnValue({ id: familyId } as ReturnType<typeof doc>)
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [
            { uid: 'other-user', role: 'primary', permissions: 'full' },
          ],
        }),
      } as unknown as Awaited<ReturnType<typeof getDoc>>)

      await expect(
        createCoParentInvitation({ familyId }, userId)
      ).rejects.toThrow()
    })

    it('throws error when guardian does not have full permissions', async () => {
      mockCollection.mockReturnValue({ id: 'families' } as ReturnType<typeof collection>)
      mockDoc.mockReturnValue({ id: familyId } as ReturnType<typeof doc>)
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [
            { uid: userId, role: 'secondary', permissions: 'limited' },
          ],
        }),
      } as unknown as Awaited<ReturnType<typeof getDoc>>)

      await expect(
        createCoParentInvitation({ familyId }, userId)
      ).rejects.toThrow()
    })

    it('throws error when family has no children', async () => {
      mockCollection.mockReturnValue({ id: 'families' } as ReturnType<typeof collection>)
      mockDoc.mockReturnValue({ id: familyId } as ReturnType<typeof doc>)
      mockQuery.mockReturnValue({} as ReturnType<typeof query>)
      mockWhere.mockReturnValue({} as ReturnType<typeof where>)

      // Mock family with guardian
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [
            { uid: userId, role: 'primary', permissions: 'full' },
          ],
        }),
      } as unknown as Awaited<ReturnType<typeof getDoc>>)

      // Mock no children
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: [],
      } as unknown as ReturnType<typeof getDocs>)

      await expect(
        createCoParentInvitation({ familyId }, userId)
      ).rejects.toThrow()
    })

    it('throws error when pending invitation already exists', async () => {
      mockCollection.mockReturnValue({ id: 'invitations' } as ReturnType<typeof collection>)
      mockDoc.mockReturnValue({ id: invitationId } as ReturnType<typeof doc>)
      mockQuery.mockReturnValue({} as ReturnType<typeof query>)
      mockWhere.mockReturnValue({} as ReturnType<typeof where>)

      // Mock family with guardian
      const familyDocMock = {
        exists: () => true,
        data: () => ({
          name: 'Smith Family',
          guardians: [
            { uid: userId, role: 'primary', permissions: 'full' },
          ],
        }),
      }

      const userDocMock = {
        exists: () => true,
        data: () => ({ displayName: 'Jane Smith' }),
      }

      let getDocCallCount = 0
      mockGetDoc.mockImplementation(() => {
        getDocCallCount++
        if (getDocCallCount === 1) {
          return Promise.resolve(familyDocMock as unknown as Awaited<ReturnType<typeof getDoc>>)
        }
        return Promise.resolve(userDocMock as unknown as Awaited<ReturnType<typeof getDoc>>)
      })

      // Mock has children, then has existing invitation
      const futureDate = new Date(Date.now() + 86400000)
      let getDocsCallCount = 0
      mockGetDocs.mockImplementation(() => {
        getDocsCallCount++
        if (getDocsCallCount === 1) {
          // Children query - has children
          return Promise.resolve({
            empty: false,
            docs: [{ id: 'child-1' }],
          } as unknown as ReturnType<typeof getDocs>)
        }
        // Invitations query - has existing pending
        return Promise.resolve({
          empty: false,
          docs: [{
            id: 'existing-invitation',
            data: () => ({
              id: 'existing-invitation',
              familyId,
              familyName: 'Smith Family',
              invitedBy: userId,
              invitedByName: 'Jane Smith',
              tokenHash: 'existing-hash',
              status: 'pending',
              createdAt: { toDate: () => new Date() },
              expiresAt: { toDate: () => futureDate },
              acceptedAt: null,
              acceptedBy: null,
            }),
          }],
        } as unknown as ReturnType<typeof getDocs>)
      })

      await expect(
        createCoParentInvitation({ familyId }, userId)
      ).rejects.toThrow()
    })

    it('validates input and throws for empty familyId', async () => {
      await expect(
        createCoParentInvitation({ familyId: '' }, userId)
      ).rejects.toThrow()
    })

    it('validates input and throws for invalid expiryDays', async () => {
      await expect(
        createCoParentInvitation(
          { familyId, expiryDays: '5' as '1' | '3' | '7' | '14' | '30' },
          userId
        )
      ).rejects.toThrow()
    })
  })

  describe('getExistingPendingInvitation', () => {
    const familyId = 'family-456'

    it('returns invitation when pending invitation exists', async () => {
      mockQuery.mockReturnValue({} as ReturnType<typeof query>)
      mockWhere.mockReturnValue({} as ReturnType<typeof where>)
      mockCollection.mockReturnValue({ id: 'invitations' } as ReturnType<typeof collection>)

      const futureDate = new Date(Date.now() + 86400000)
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          id: 'existing-invitation',
          data: () => ({
            id: 'existing-invitation',
            familyId,
            familyName: 'Smith Family',
            invitedBy: 'user-123',
            invitedByName: 'Jane Smith',
            tokenHash: 'hash-123',
            status: 'pending',
            createdAt: { toDate: () => new Date() },
            expiresAt: { toDate: () => futureDate },
            acceptedAt: null,
            acceptedBy: null,
          }),
        }],
      } as unknown as ReturnType<typeof getDocs>)

      const result = await getExistingPendingInvitation(familyId)

      expect(result.exists).toBe(true)
      expect(result.invitation).not.toBeNull()
      expect(result.invitation?.familyId).toBe(familyId)
      expect(result.invitation?.status).toBe('pending')
    })

    it('returns no invitation when none exists', async () => {
      mockQuery.mockReturnValue({} as ReturnType<typeof query>)
      mockWhere.mockReturnValue({} as ReturnType<typeof where>)
      mockCollection.mockReturnValue({ id: 'invitations' } as ReturnType<typeof collection>)

      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: [],
      } as unknown as ReturnType<typeof getDocs>)

      const result = await getExistingPendingInvitation(familyId)

      expect(result.exists).toBe(false)
      expect(result.invitation).toBeNull()
    })

    it('returns no invitation when pending invitation is expired', async () => {
      mockQuery.mockReturnValue({} as ReturnType<typeof query>)
      mockWhere.mockReturnValue({} as ReturnType<typeof where>)
      mockCollection.mockReturnValue({ id: 'invitations' } as ReturnType<typeof collection>)
      mockDoc.mockReturnValue({ id: 'expired-invitation' } as ReturnType<typeof doc>)

      const pastDate = new Date(Date.now() - 86400000)
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          id: 'expired-invitation',
          data: () => ({
            id: 'expired-invitation',
            familyId,
            familyName: 'Smith Family',
            invitedBy: 'user-123',
            invitedByName: 'Jane Smith',
            tokenHash: 'hash-123',
            status: 'pending',
            createdAt: { toDate: () => new Date() },
            expiresAt: { toDate: () => pastDate }, // Expired
            acceptedAt: null,
            acceptedBy: null,
          }),
        }],
      } as unknown as ReturnType<typeof getDocs>)

      const result = await getExistingPendingInvitation(familyId)

      expect(result.exists).toBe(false)
      expect(result.invitation).toBeNull()
    })
  })

  describe('getInvitation', () => {
    it('returns invitation when found', async () => {
      const invitationId = 'invitation-123'
      mockDoc.mockReturnValue({ id: invitationId } as ReturnType<typeof doc>)

      const futureDate = new Date(Date.now() + 86400000)
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: invitationId,
        data: () => ({
          id: invitationId,
          familyId: 'family-456',
          familyName: 'Smith Family',
          invitedBy: 'user-123',
          invitedByName: 'Jane Smith',
          tokenHash: 'hash-123',
          status: 'pending',
          createdAt: { toDate: () => new Date() },
          expiresAt: { toDate: () => futureDate },
          acceptedAt: null,
          acceptedBy: null,
        }),
      } as unknown as Awaited<ReturnType<typeof getDoc>>)

      const result = await getInvitation(invitationId)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(invitationId)
    })

    it('returns null when invitation not found', async () => {
      mockDoc.mockReturnValue({ id: 'non-existent' } as ReturnType<typeof doc>)
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as unknown as Awaited<ReturnType<typeof getDoc>>)

      const result = await getInvitation('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('revokeInvitation', () => {
    const userId = 'user-123'
    const invitationId = 'invitation-789'
    const familyId = 'family-456'

    it('revokes pending invitation successfully', async () => {
      mockDoc.mockReturnValue({ id: invitationId } as ReturnType<typeof doc>)
      mockCollection.mockReturnValue({ id: 'auditLog' } as ReturnType<typeof collection>)

      const futureDate = new Date(Date.now() + 86400000)

      let getDocCallCount = 0
      mockGetDoc.mockImplementation(() => {
        getDocCallCount++
        if (getDocCallCount === 1) {
          // Get invitation
          return Promise.resolve({
            exists: () => true,
            id: invitationId,
            data: () => ({
              id: invitationId,
              familyId,
              familyName: 'Smith Family',
              invitedBy: userId,
              invitedByName: 'Jane Smith',
              tokenHash: 'hash-123',
              status: 'pending',
              createdAt: { toDate: () => new Date() },
              expiresAt: { toDate: () => futureDate },
              acceptedAt: null,
              acceptedBy: null,
            }),
          } as unknown as Awaited<ReturnType<typeof getDoc>>)
        }
        if (getDocCallCount === 2) {
          // Get family for permission check
          return Promise.resolve({
            exists: () => true,
            data: () => ({
              guardians: [
                { uid: userId, role: 'primary', permissions: 'full' },
              ],
            }),
          } as unknown as Awaited<ReturnType<typeof getDoc>>)
        }
        // Get user
        return Promise.resolve({
          exists: () => true,
          data: () => ({ displayName: 'Jane Smith' }),
        } as unknown as Awaited<ReturnType<typeof getDoc>>)
      })

      const result = await revokeInvitation(invitationId, userId)

      expect(result.status).toBe('revoked')
      expect(mockBatch.update).toHaveBeenCalled()
      expect(mockBatch.set).toHaveBeenCalled() // Audit entry
      expect(mockBatch.commit).toHaveBeenCalled()
    })

    it('throws error when invitation not found', async () => {
      mockDoc.mockReturnValue({ id: 'non-existent' } as ReturnType<typeof doc>)
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as unknown as Awaited<ReturnType<typeof getDoc>>)

      await expect(
        revokeInvitation('non-existent', userId)
      ).rejects.toThrow()
    })

    it('throws error when invitation is already accepted', async () => {
      mockDoc.mockReturnValue({ id: invitationId } as ReturnType<typeof doc>)

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: invitationId,
        data: () => ({
          id: invitationId,
          familyId,
          familyName: 'Smith Family',
          invitedBy: userId,
          invitedByName: 'Jane Smith',
          tokenHash: 'hash-123',
          status: 'accepted', // Already accepted
          createdAt: { toDate: () => new Date() },
          expiresAt: { toDate: () => new Date() },
          acceptedAt: { toDate: () => new Date() },
          acceptedBy: 'other-user',
        }),
      } as unknown as Awaited<ReturnType<typeof getDoc>>)

      await expect(
        revokeInvitation(invitationId, userId)
      ).rejects.toThrow()
    })
  })

  describe('verifyInvitationToken', () => {
    const invitationId = 'invitation-123'
    const token = 'test-token'

    it('returns valid when token matches hash and invitation is pending', async () => {
      mockDoc.mockReturnValue({ id: invitationId } as ReturnType<typeof doc>)

      const futureDate = new Date(Date.now() + 86400000)

      // Mock the hash that would be generated for 'test-token'
      // Since our mock returns empty ArrayBuffer, we get a predictable hash of all zeros
      const expectedHash = '0'.repeat(64)

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: invitationId,
        data: () => ({
          id: invitationId,
          familyId: 'family-456',
          familyName: 'Smith Family',
          invitedBy: 'user-123',
          invitedByName: 'Jane Smith',
          tokenHash: expectedHash, // Matches what our mocked hash produces
          status: 'pending',
          createdAt: { toDate: () => new Date() },
          expiresAt: { toDate: () => futureDate },
          acceptedAt: null,
          acceptedBy: null,
        }),
      } as unknown as Awaited<ReturnType<typeof getDoc>>)

      const result = await verifyInvitationToken(invitationId, token)

      expect(result.valid).toBe(true)
      expect(result.invitation).not.toBeNull()
      expect(result.errorCode).toBeUndefined()
    })

    it('returns invalid with error code when token does not match hash', async () => {
      mockDoc.mockReturnValue({ id: invitationId } as ReturnType<typeof doc>)

      const futureDate = new Date(Date.now() + 86400000)
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: invitationId,
        data: () => ({
          id: invitationId,
          familyId: 'family-456',
          familyName: 'Smith Family',
          invitedBy: 'user-123',
          invitedByName: 'Jane Smith',
          tokenHash: 'different-hash-with-64-chars'.padEnd(64, '0'), // Does not match
          status: 'pending',
          createdAt: { toDate: () => new Date() },
          expiresAt: { toDate: () => futureDate },
          acceptedAt: null,
          acceptedBy: null,
        }),
      } as unknown as Awaited<ReturnType<typeof getDoc>>)

      const result = await verifyInvitationToken(invitationId, token)

      expect(result.valid).toBe(false)
      expect(result.invitation).toBeNull()
      expect(result.errorCode).toBe('invalid-token')
    })

    it('returns invalid with not-found error when invitation not found', async () => {
      mockDoc.mockReturnValue({ id: 'non-existent' } as ReturnType<typeof doc>)
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as unknown as Awaited<ReturnType<typeof getDoc>>)

      const result = await verifyInvitationToken('non-existent', token)

      expect(result.valid).toBe(false)
      expect(result.invitation).toBeNull()
      expect(result.errorCode).toBe('not-found')
    })

    it('returns invalid with expired error when invitation is expired', async () => {
      mockDoc.mockReturnValue({ id: invitationId } as ReturnType<typeof doc>)

      const pastDate = new Date(Date.now() - 86400000) // Yesterday
      const expectedHash = '0'.repeat(64)

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: invitationId,
        data: () => ({
          id: invitationId,
          familyId: 'family-456',
          familyName: 'Smith Family',
          invitedBy: 'user-123',
          invitedByName: 'Jane Smith',
          tokenHash: expectedHash,
          status: 'pending',
          createdAt: { toDate: () => new Date() },
          expiresAt: { toDate: () => pastDate }, // Expired
          acceptedAt: null,
          acceptedBy: null,
        }),
      } as unknown as Awaited<ReturnType<typeof getDoc>>)

      const result = await verifyInvitationToken(invitationId, token)

      expect(result.valid).toBe(false)
      expect(result.invitation).toBeNull()
      expect(result.errorCode).toBe('expired')
    })

    it('returns invalid with already-used error when invitation is not pending', async () => {
      mockDoc.mockReturnValue({ id: invitationId } as ReturnType<typeof doc>)

      const futureDate = new Date(Date.now() + 86400000)
      const expectedHash = '0'.repeat(64)

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: invitationId,
        data: () => ({
          id: invitationId,
          familyId: 'family-456',
          familyName: 'Smith Family',
          invitedBy: 'user-123',
          invitedByName: 'Jane Smith',
          tokenHash: expectedHash,
          status: 'accepted', // Already used
          createdAt: { toDate: () => new Date() },
          expiresAt: { toDate: () => futureDate },
          acceptedAt: { toDate: () => new Date() },
          acceptedBy: 'user-456',
        }),
      } as unknown as Awaited<ReturnType<typeof getDoc>>)

      const result = await verifyInvitationToken(invitationId, token)

      expect(result.valid).toBe(false)
      expect(result.invitation).toBeNull()
      expect(result.errorCode).toBe('already-used')
    })
  })
})
