import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import type { User as FirebaseUser } from 'firebase/auth'

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _type: 'serverTimestamp' })),
  runTransaction: vi.fn(),
}))

// Mock firebase config
vi.mock('@/lib/firebase', () => ({
  db: {},
}))

// Import after mocks are set up
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
} from 'firebase/firestore'
import {
  createUser,
  getUser,
  userExists,
  updateLastLogin,
  getOrCreateUser,
  isSessionExpired,
} from './userService'

describe('userService', () => {
  const mockFirebaseUser: Partial<FirebaseUser> = {
    uid: 'test-uid-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
  }

  const mockUserDoc = {
    uid: 'test-uid-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
    createdAt: { toDate: () => new Date('2025-01-01T00:00:00Z') },
    lastLoginAt: { toDate: () => new Date('2025-01-01T00:00:00Z') },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementations
    ;(doc as Mock).mockReturnValue({ id: 'test-uid-123' })
  })

  describe('createUser', () => {
    it('creates a new user document in Firestore', async () => {
      ;(setDoc as Mock).mockResolvedValue(undefined)
      ;(getDoc as Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockUserDoc,
      })

      const result = await createUser(mockFirebaseUser as FirebaseUser)

      expect(setDoc).toHaveBeenCalledTimes(1)
      expect(result.uid).toBe('test-uid-123')
      expect(result.email).toBe('test@example.com')
      expect(result.displayName).toBe('Test User')
    })

    it('handles null displayName and photoURL', async () => {
      const userWithNulls: Partial<FirebaseUser> = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: null,
        photoURL: null,
      }

      const mockDocWithNulls = {
        ...mockUserDoc,
        displayName: null,
        photoURL: null,
      }

      ;(setDoc as Mock).mockResolvedValue(undefined)
      ;(getDoc as Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockDocWithNulls,
      })

      const result = await createUser(userWithNulls as FirebaseUser)

      expect(result.displayName).toBeNull()
      expect(result.photoURL).toBeNull()
    })

    it('throws error if document creation fails', async () => {
      ;(setDoc as Mock).mockResolvedValue(undefined)
      ;(getDoc as Mock).mockResolvedValue({
        exists: () => false,
        data: () => null,
      })

      await expect(createUser(mockFirebaseUser as FirebaseUser)).rejects.toThrow()
    })

    it('throws error on Firestore write failure', async () => {
      ;(setDoc as Mock).mockRejectedValue(new Error('Write failed'))

      await expect(createUser(mockFirebaseUser as FirebaseUser)).rejects.toThrow()
    })

    it('validates input and rejects invalid email', async () => {
      const invalidUser: Partial<FirebaseUser> = {
        uid: 'test-uid-123',
        email: 'invalid-email',
        displayName: 'Test User',
        photoURL: null,
      }

      await expect(createUser(invalidUser as FirebaseUser)).rejects.toThrow()
    })
  })

  describe('getUser', () => {
    it('returns user when document exists', async () => {
      ;(getDoc as Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockUserDoc,
      })

      const result = await getUser('test-uid-123')

      expect(result).not.toBeNull()
      expect(result?.uid).toBe('test-uid-123')
      expect(result?.email).toBe('test@example.com')
    })

    it('returns null when document does not exist', async () => {
      ;(getDoc as Mock).mockResolvedValue({
        exists: () => false,
        data: () => null,
      })

      const result = await getUser('nonexistent-uid')

      expect(result).toBeNull()
    })

    it('throws error on Firestore read failure', async () => {
      ;(getDoc as Mock).mockRejectedValue(new Error('Read failed'))

      await expect(getUser('test-uid-123')).rejects.toThrow()
    })
  })

  describe('userExists', () => {
    it('returns true when user exists', async () => {
      ;(getDoc as Mock).mockResolvedValue({
        exists: () => true,
      })

      const result = await userExists('test-uid-123')

      expect(result).toBe(true)
    })

    it('returns false when user does not exist', async () => {
      ;(getDoc as Mock).mockResolvedValue({
        exists: () => false,
      })

      const result = await userExists('nonexistent-uid')

      expect(result).toBe(false)
    })

    it('returns false on error (fail-safe)', async () => {
      ;(getDoc as Mock).mockRejectedValue(new Error('Read failed'))

      const result = await userExists('test-uid-123')

      expect(result).toBe(false)
    })
  })

  describe('updateLastLogin', () => {
    it('updates lastLoginAt timestamp', async () => {
      ;(updateDoc as Mock).mockResolvedValue(undefined)

      await updateLastLogin('test-uid-123')

      expect(updateDoc).toHaveBeenCalledTimes(1)
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          lastLoginAt: expect.anything(),
        })
      )
    })

    it('does not throw on error (non-critical operation)', async () => {
      ;(updateDoc as Mock).mockRejectedValue(new Error('Update failed'))

      // Should not throw
      await expect(updateLastLogin('test-uid-123')).resolves.toBeUndefined()
    })
  })

  describe('getOrCreateUser', () => {
    it('creates new user when they do not exist', async () => {
      // Mock transaction that creates new user
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({ exists: () => false }),
          set: vi.fn(),
          update: vi.fn(),
        }
        return callback(mockTransaction)
      })

      // Mock getDoc for fetching user after transaction
      ;(getDoc as Mock).mockResolvedValue({ exists: () => true, data: () => mockUserDoc })

      const result = await getOrCreateUser(mockFirebaseUser as FirebaseUser)

      expect(result.isNewUser).toBe(true)
      expect(result.user.uid).toBe('test-uid-123')
      expect(result.originalLastLoginAt).toBeUndefined() // No original for new users
      expect(runTransaction).toHaveBeenCalled()
    })

    it('returns existing user and updates lastLoginAt', async () => {
      // Mock transaction that finds existing user
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({ exists: () => true, data: () => mockUserDoc }),
          set: vi.fn(),
          update: vi.fn(),
        }
        return callback(mockTransaction)
      })

      const result = await getOrCreateUser(mockFirebaseUser as FirebaseUser)

      expect(result.isNewUser).toBe(false)
      expect(result.user.uid).toBe('test-uid-123')
      expect(result.originalLastLoginAt).toEqual(new Date('2025-01-01T00:00:00Z')) // Original timestamp
      expect(runTransaction).toHaveBeenCalled()
    })

    it('throws error when transaction fails', async () => {
      ;(runTransaction as Mock).mockRejectedValue(new Error('Transaction failed'))

      await expect(getOrCreateUser(mockFirebaseUser as FirebaseUser)).rejects.toThrow()
    })

    it('throws error when user creation verification fails', async () => {
      // Mock transaction that creates new user
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({ exists: () => false }),
          set: vi.fn(),
          update: vi.fn(),
        }
        return callback(mockTransaction)
      })

      // Mock getDoc to return non-existent after transaction (verification failure)
      ;(getDoc as Mock).mockResolvedValue({ exists: () => false })

      await expect(getOrCreateUser(mockFirebaseUser as FirebaseUser)).rejects.toThrow()
    })
  })

  describe('isSessionExpired', () => {
    it('returns false for lastLoginAt within 30 days', () => {
      // 10 days ago - should not be expired
      const recentLogin = new Date(Date.now() - 1000 * 60 * 60 * 24 * 10)
      expect(isSessionExpired(recentLogin)).toBe(false)
    })

    it('returns false for lastLoginAt just now', () => {
      const justNow = new Date()
      expect(isSessionExpired(justNow)).toBe(false)
    })

    it('returns false for lastLoginAt 29 days ago', () => {
      // 29 days ago - should not be expired
      const almostExpired = new Date(Date.now() - 1000 * 60 * 60 * 24 * 29)
      expect(isSessionExpired(almostExpired)).toBe(false)
    })

    it('returns true for lastLoginAt older than 30 days', () => {
      // 31 days ago - should be expired
      const oldLogin = new Date(Date.now() - 1000 * 60 * 60 * 24 * 31)
      expect(isSessionExpired(oldLogin)).toBe(true)
    })

    it('returns true for exactly 30 days plus 1ms (boundary)', () => {
      // Exactly 30 days + 1ms ago - should be expired
      const exactlyThirtyDaysPlusOne = new Date(Date.now() - (1000 * 60 * 60 * 24 * 30 + 1))
      expect(isSessionExpired(exactlyThirtyDaysPlusOne)).toBe(true)
    })

    it('returns false for exactly 30 days (boundary)', () => {
      // Exactly 30 days ago - should NOT be expired (we use > not >=)
      const exactlyThirtyDays = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)
      expect(isSessionExpired(exactlyThirtyDays)).toBe(false)
    })

    it('returns true for very old lastLoginAt', () => {
      // 1 year ago - should be expired
      const veryOld = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365)
      expect(isSessionExpired(veryOld)).toBe(true)
    })
  })
})
