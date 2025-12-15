import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createFamily,
  getFamily,
  getFamilyForUser,
  userHasFamily,
} from './familyService'

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
  runTransaction: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

// Import mocked functions after mocking
import {
  doc,
  getDoc,
  collection,
  runTransaction,
} from 'firebase/firestore'

const mockDoc = vi.mocked(doc)
const mockGetDoc = vi.mocked(getDoc)
const mockCollection = vi.mocked(collection)
const mockRunTransaction = vi.mocked(runTransaction)

describe('familyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createFamily', () => {
    it('creates a family successfully', async () => {
      const userId = 'test-user-123'
      const familyId = 'new-family-456'

      // Mock collection and doc for family reference
      mockCollection.mockReturnValue({ id: 'families' } as ReturnType<typeof collection>)
      mockDoc.mockReturnValue({ id: familyId } as ReturnType<typeof doc>)

      // Mock transaction
      mockRunTransaction.mockImplementation(async (_, transactionFn) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ uid: userId, email: 'test@example.com' }),
          }),
          set: vi.fn(),
          update: vi.fn(),
        }
        await transactionFn(mockTransaction as unknown as Parameters<typeof runTransaction>[1] extends (t: infer T) => unknown ? T : never)
      })

      const result = await createFamily(userId)

      // Optimistic return - data is constructed from known values
      expect(result.id).toBe(familyId)
      expect(result.createdBy).toBe(userId)
      expect(result.guardians).toHaveLength(1)
      expect(result.guardians[0].uid).toBe(userId)
      expect(result.guardians[0].role).toBe('primary')
      expect(result.guardians[0].permissions).toBe('full')
      expect(result.children).toEqual([])
      // createdAt and joinedAt should be Date objects (optimistic timestamps)
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.guardians[0].joinedAt).toBeInstanceOf(Date)
    })

    it('throws error if user already has a family', async () => {
      const userId = 'test-user-123'

      mockCollection.mockReturnValue({ id: 'families' } as ReturnType<typeof collection>)
      mockDoc.mockReturnValue({ id: 'new-family' } as ReturnType<typeof doc>)

      // Mock transaction where user already has familyId
      mockRunTransaction.mockImplementation(async (_, transactionFn) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              uid: userId,
              email: 'test@example.com',
              familyId: 'existing-family-123', // User already has family
            }),
          }),
          set: vi.fn(),
          update: vi.fn(),
        }
        await transactionFn(mockTransaction as unknown as Parameters<typeof runTransaction>[1] extends (t: infer T) => unknown ? T : never)
      })

      await expect(createFamily(userId)).rejects.toThrow(
        'You already have a family'
      )
    })

    it('throws error if user not found', async () => {
      const userId = 'non-existent-user'

      mockCollection.mockReturnValue({ id: 'families' } as ReturnType<typeof collection>)
      mockDoc.mockReturnValue({ id: 'new-family' } as ReturnType<typeof doc>)

      // Mock transaction where user doesn't exist
      mockRunTransaction.mockImplementation(async (_, transactionFn) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => false,
          }),
          set: vi.fn(),
          update: vi.fn(),
        }
        await transactionFn(mockTransaction as unknown as Parameters<typeof runTransaction>[1] extends (t: infer T) => unknown ? T : never)
      })

      await expect(createFamily(userId)).rejects.toThrow(
        'Something went wrong. Please try signing in again.'
      )
    })

    it('validates input and throws for empty userId', async () => {
      await expect(createFamily('')).rejects.toThrow()
    })
  })

  describe('getFamily', () => {
    it('returns family when found', async () => {
      const familyId = 'test-family-123'
      const now = new Date()

      mockDoc.mockReturnValue({ id: familyId } as ReturnType<typeof doc>)
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: familyId,
        data: () => ({
          id: familyId,
          createdAt: { toDate: () => now },
          createdBy: 'user-123',
          guardians: [
            {
              uid: 'user-123',
              role: 'primary',
              permissions: 'full',
              joinedAt: { toDate: () => now },
            },
          ],
          children: [],
        }),
      } as ReturnType<typeof getDoc>)

      const result = await getFamily(familyId)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(familyId)
    })

    it('returns null when family not found', async () => {
      mockDoc.mockReturnValue({ id: 'non-existent' } as ReturnType<typeof doc>)
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as ReturnType<typeof getDoc>)

      const result = await getFamily('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getFamilyForUser', () => {
    it('returns family when user has familyId', async () => {
      const userId = 'test-user-123'
      const familyId = 'test-family-456'
      const now = new Date()

      // First call: get user document
      // Second call: get family document
      let callCount = 0
      mockDoc.mockReturnValue({ id: userId } as ReturnType<typeof doc>)
      mockGetDoc.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // User document
          return Promise.resolve({
            exists: () => true,
            data: () => ({ familyId }),
          } as ReturnType<typeof getDoc>)
        }
        // Family document
        return Promise.resolve({
          exists: () => true,
          id: familyId,
          data: () => ({
            id: familyId,
            createdAt: { toDate: () => now },
            createdBy: userId,
            guardians: [
              {
                uid: userId,
                role: 'primary',
                permissions: 'full',
                joinedAt: { toDate: () => now },
              },
            ],
            children: [],
          }),
        } as ReturnType<typeof getDoc>)
      })

      const result = await getFamilyForUser(userId)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(familyId)
    })

    it('returns null when user has no familyId', async () => {
      mockDoc.mockReturnValue({ id: 'user-123' } as ReturnType<typeof doc>)
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ uid: 'user-123' }), // No familyId
      } as ReturnType<typeof getDoc>)

      const result = await getFamilyForUser('user-123')

      expect(result).toBeNull()
    })

    it('returns null when user not found', async () => {
      mockDoc.mockReturnValue({ id: 'user-123' } as ReturnType<typeof doc>)
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as ReturnType<typeof getDoc>)

      const result = await getFamilyForUser('user-123')

      expect(result).toBeNull()
    })
  })

  describe('userHasFamily', () => {
    it('returns true when user has familyId', async () => {
      mockDoc.mockReturnValue({ id: 'user-123' } as ReturnType<typeof doc>)
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ familyId: 'family-123' }),
      } as ReturnType<typeof getDoc>)

      const result = await userHasFamily('user-123')

      expect(result).toBe(true)
    })

    it('returns false when user has no familyId', async () => {
      mockDoc.mockReturnValue({ id: 'user-123' } as ReturnType<typeof doc>)
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ uid: 'user-123' }), // No familyId
      } as ReturnType<typeof getDoc>)

      const result = await userHasFamily('user-123')

      expect(result).toBe(false)
    })

    it('returns false when user not found', async () => {
      mockDoc.mockReturnValue({ id: 'user-123' } as ReturnType<typeof doc>)
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as ReturnType<typeof getDoc>)

      const result = await userHasFamily('user-123')

      expect(result).toBe(false)
    })

    it('returns false on error', async () => {
      mockDoc.mockReturnValue({ id: 'user-123' } as ReturnType<typeof doc>)
      mockGetDoc.mockRejectedValue(new Error('Network error'))

      const result = await userHasFamily('user-123')

      expect(result).toBe(false)
    })
  })

  // ============================================
  // ADVERSARIAL TESTS - Security validation
  // ============================================
  // These tests verify that the service layer correctly validates
  // inputs and enforces security constraints before Firestore writes.
  // Note: True Firestore rules tests require the Firebase Emulator Suite.

  describe('adversarial: input validation', () => {
    it('rejects createFamily with whitespace-only userId', async () => {
      await expect(createFamily('   ')).rejects.toThrow()
    })

    it('rejects createFamily with very long userId', async () => {
      // Firestore document IDs have a max length
      const longId = 'a'.repeat(2000)
      await expect(createFamily(longId)).rejects.toThrow()
    })

    it('rejects createFamily with special characters that could break paths', async () => {
      // Document IDs cannot contain forward slashes
      await expect(createFamily('user/with/slashes')).rejects.toThrow()
    })
  })

  describe('adversarial: race condition prevention', () => {
    it('prevents double family creation for same user via transaction check', async () => {
      const userId = 'race-condition-user'

      mockCollection.mockReturnValue({ id: 'families' } as ReturnType<typeof collection>)
      mockDoc.mockReturnValue({ id: 'new-family' } as ReturnType<typeof doc>)

      // Simulate first request finding no familyId, but second request in transaction finding one
      mockRunTransaction.mockImplementation(async (_, transactionFn) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              uid: userId,
              email: 'test@example.com',
              familyId: 'created-by-other-request', // Family was created between check and write
            }),
          }),
          set: vi.fn(),
          update: vi.fn(),
        }
        await transactionFn(mockTransaction as unknown as Parameters<typeof runTransaction>[1] extends (t: infer T) => unknown ? T : never)
      })

      // Should reject because transaction found existing familyId
      await expect(createFamily(userId)).rejects.toThrow(
        'You already have a family'
      )
    })
  })

  describe('adversarial: cross-family isolation (contract verification)', () => {
    it('getFamily only returns family data - no user data leakage', async () => {
      const familyId = 'test-family-123'
      const now = new Date()

      mockDoc.mockReturnValue({ id: familyId } as ReturnType<typeof doc>)
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: familyId,
        data: () => ({
          id: familyId,
          createdAt: { toDate: () => now },
          createdBy: 'user-123',
          guardians: [
            {
              uid: 'user-123',
              role: 'primary',
              permissions: 'full',
              joinedAt: { toDate: () => now },
            },
          ],
          children: [],
          // Attacker tries to inject extra fields
          secretData: 'should-not-be-exposed',
          adminNotes: 'internal only',
        }),
      } as ReturnType<typeof getDoc>)

      const result = await getFamily(familyId)

      // Zod schema strips extra fields
      expect(result).not.toBeNull()
      expect(result).not.toHaveProperty('secretData')
      expect(result).not.toHaveProperty('adminNotes')
      // Only expected fields present
      expect(Object.keys(result!)).toEqual(['id', 'createdAt', 'createdBy', 'guardians', 'children'])
    })

    it('getFamilyForUser isolates user data - cannot access other user familyId', async () => {
      const attackerUserId = 'attacker-user'
      const victimUserId = 'victim-user'

      // Attacker tries to get victim's family by querying their own user doc
      // The function only queries the provided userId, not others
      mockDoc.mockReturnValue({ id: attackerUserId } as ReturnType<typeof doc>)
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ uid: attackerUserId }), // No familyId for attacker
      } as ReturnType<typeof getDoc>)

      const result = await getFamilyForUser(attackerUserId)

      // Verify we get null (no family) and didn't somehow access victim's data
      expect(result).toBeNull()
      // Verify only queried attacker's doc, not victim's
      expect(mockDoc).not.toHaveBeenCalledWith(expect.anything(), 'users', victimUserId)
    })
  })

  describe('adversarial: permission level enforcement', () => {
    it('createFamily always creates with primary role and full permissions', async () => {
      const userId = 'test-user-123'
      const familyId = 'new-family-456'

      mockCollection.mockReturnValue({ id: 'families' } as ReturnType<typeof collection>)
      mockDoc.mockReturnValue({ id: familyId } as ReturnType<typeof doc>)

      let capturedFamilyData: Record<string, unknown> | null = null

      mockRunTransaction.mockImplementation(async (_, transactionFn) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ uid: userId, email: 'test@example.com' }),
          }),
          set: vi.fn((_, data) => {
            capturedFamilyData = data
          }),
          update: vi.fn(),
        }
        await transactionFn(mockTransaction as unknown as Parameters<typeof runTransaction>[1] extends (t: infer T) => unknown ? T : never)
      })

      await createFamily(userId)

      // Verify the data sent to Firestore has correct guardian setup
      expect(capturedFamilyData).not.toBeNull()
      const guardians = capturedFamilyData!.guardians as Array<Record<string, unknown>>
      expect(guardians).toHaveLength(1)
      expect(guardians[0].uid).toBe(userId)
      expect(guardians[0].role).toBe('primary') // Cannot be changed to 'co-parent'
      expect(guardians[0].permissions).toBe('full') // Cannot be 'readonly'
    })
  })
})
