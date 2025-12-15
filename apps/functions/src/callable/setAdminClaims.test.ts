import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'

// Mock firebase-admin before imports
vi.mock('firebase-admin/firestore', () => {
  const mockSet = vi.fn().mockResolvedValue(undefined)
  const mockAdd = vi.fn().mockResolvedValue({ id: 'audit-log-id' })
  const mockCollection = vi.fn().mockImplementation((name: string) => {
    if (name === 'adminRoles') {
      return {
        doc: vi.fn().mockReturnValue({
          set: mockSet,
        }),
      }
    }
    if (name === 'adminAuditLog') {
      return {
        add: mockAdd,
      }
    }
    return { doc: vi.fn(), add: vi.fn() }
  })

  return {
    getFirestore: vi.fn().mockReturnValue({
      collection: mockCollection,
    }),
    FieldValue: {
      serverTimestamp: vi.fn().mockReturnValue('SERVER_TIMESTAMP'),
    },
  }
})

vi.mock('firebase-admin/auth', () => {
  const mockSetCustomUserClaims = vi.fn().mockResolvedValue(undefined)
  const mockGetUser = vi.fn().mockResolvedValue({
    uid: 'target-user-id',
    customClaims: {},
  })

  return {
    getAuth: vi.fn().mockReturnValue({
      setCustomUserClaims: mockSetCustomUserClaims,
      getUser: mockGetUser,
    }),
  }
})

vi.mock('firebase-functions/v2/https', () => ({
  onCall: vi.fn((_config, handler) => handler),
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string,
      public details?: unknown
    ) {
      super(message)
    }
  },
}))

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
}))

import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

type CallableFunction = (request: {
  data: Record<string, unknown>
  auth?: { uid: string; token: Record<string, unknown> }
}) => Promise<unknown>

describe('setAdminClaims Cloud Function', () => {
  let mockDb: ReturnType<typeof getFirestore>
  let mockAuth: ReturnType<typeof getAuth>

  beforeAll(() => {
    mockDb = getFirestore()
    mockAuth = getAuth()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const { setAdminClaims } = await import('./setAdminClaims')

      const request = {
        data: {
          targetUserId: 'target-user',
          roles: ['safety-team'],
          action: 'grant',
        },
        auth: undefined,
      }

      await expect(
        (setAdminClaims as CallableFunction)(request)
      ).rejects.toThrow('Authentication required')
    })

    it('should reject non-admin users', async () => {
      const { setAdminClaims } = await import('./setAdminClaims')

      const request = {
        data: {
          targetUserId: 'target-user',
          roles: ['safety-team'],
          action: 'grant',
        },
        auth: {
          uid: 'non-admin-user',
          token: { isAdmin: false },
        },
      }

      await expect(
        (setAdminClaims as CallableFunction)(request)
      ).rejects.toThrow('Only administrators can modify admin claims')
    })
  })

  describe('granting roles', () => {
    it('should grant safety-team role', async () => {
      const { setAdminClaims } = await import('./setAdminClaims')

      const request = {
        data: {
          targetUserId: 'target-user',
          roles: ['safety-team'],
          action: 'grant',
        },
        auth: {
          uid: 'admin-user',
          token: { isAdmin: true },
        },
      }

      const result = await (setAdminClaims as CallableFunction)(request)

      expect(result).toEqual({
        success: true,
        claims: { isSafetyTeam: true },
      })
      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('target-user', {
        isSafetyTeam: true,
      })
    })

    it('should grant multiple roles', async () => {
      const { setAdminClaims } = await import('./setAdminClaims')

      const request = {
        data: {
          targetUserId: 'target-user',
          roles: ['safety-team', 'admin', 'legal'],
          action: 'grant',
        },
        auth: {
          uid: 'admin-user',
          token: { isAdmin: true },
        },
      }

      await (setAdminClaims as CallableFunction)(request)

      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith(
        'target-user',
        expect.objectContaining({
          isSafetyTeam: true,
          isAdmin: true,
          isLegalTeam: true,
        })
      )
    })
  })

  describe('revoking roles', () => {
    it('should revoke roles', async () => {
      // Setup mock to return user with existing claims
      vi.mocked(mockAuth.getUser).mockResolvedValueOnce({
        uid: 'target-user',
        customClaims: { isSafetyTeam: true, isAdmin: true },
      } as never)

      const { setAdminClaims } = await import('./setAdminClaims')

      const request = {
        data: {
          targetUserId: 'target-user',
          roles: ['safety-team'],
          action: 'revoke',
        },
        auth: {
          uid: 'admin-user',
          token: { isAdmin: true },
        },
      }

      await (setAdminClaims as CallableFunction)(request)

      // Should have isAdmin but not isSafetyTeam
      expect(mockAuth.setCustomUserClaims).toHaveBeenCalled()
    })
  })

  describe('self-lockout prevention', () => {
    it('should prevent admin from revoking their own admin role', async () => {
      const { setAdminClaims } = await import('./setAdminClaims')

      const request = {
        data: {
          targetUserId: 'admin-user', // Same as caller
          roles: ['admin'],
          action: 'revoke',
        },
        auth: {
          uid: 'admin-user',
          token: { isAdmin: true },
        },
      }

      await expect(
        (setAdminClaims as CallableFunction)(request)
      ).rejects.toThrow('Cannot revoke your own admin role')
    })
  })

  describe('audit logging', () => {
    it('should log all admin claims changes to audit log', async () => {
      const { setAdminClaims } = await import('./setAdminClaims')

      const request = {
        data: {
          targetUserId: 'target-user',
          roles: ['safety-team'],
          action: 'grant',
        },
        auth: {
          uid: 'admin-user',
          token: { isAdmin: true },
        },
      }

      await (setAdminClaims as CallableFunction)(request)

      expect(mockDb.collection).toHaveBeenCalledWith('adminAuditLog')
    })
  })

  describe('validation', () => {
    it('should reject invalid roles', async () => {
      const { setAdminClaims } = await import('./setAdminClaims')

      const request = {
        data: {
          targetUserId: 'target-user',
          roles: ['invalid-role'],
          action: 'grant',
        },
        auth: {
          uid: 'admin-user',
          token: { isAdmin: true },
        },
      }

      await expect(
        (setAdminClaims as CallableFunction)(request)
      ).rejects.toThrow()
    })

    it('should reject invalid action', async () => {
      const { setAdminClaims } = await import('./setAdminClaims')

      const request = {
        data: {
          targetUserId: 'target-user',
          roles: ['safety-team'],
          action: 'invalid-action',
        },
        auth: {
          uid: 'admin-user',
          token: { isAdmin: true },
        },
      }

      await expect(
        (setAdminClaims as CallableFunction)(request)
      ).rejects.toThrow()
    })
  })
})
