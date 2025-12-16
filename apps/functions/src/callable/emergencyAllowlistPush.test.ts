/**
 * Emergency Allowlist Push Tests
 *
 * Story 7.4: Emergency Allowlist Push - Task 1.7
 *
 * Tests for the emergency allowlist push admin endpoint.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { CrisisUrlEntry } from '@fledgely/shared'

// Mock firebase-admin/firestore
vi.mock('firebase-admin/firestore', () => {
  const mockUpdate = vi.fn().mockResolvedValue(undefined)
  const mockBatchSet = vi.fn()
  const mockBatchCommit = vi.fn().mockResolvedValue(undefined)
  const mockAdd = vi.fn().mockResolvedValue({ id: 'test-audit-id' })
  const mockDoc = vi.fn().mockReturnValue({
    update: mockUpdate,
  })
  const mockCollection = vi.fn().mockImplementation((path: string) => {
    if (path === 'emergency-pushes' || path === 'crisis-allowlist-override') {
      return { doc: mockDoc }
    }
    return { add: mockAdd }
  })

  return {
    getFirestore: vi.fn().mockReturnValue({
      collection: mockCollection,
      batch: vi.fn().mockReturnValue({
        set: mockBatchSet,
        commit: mockBatchCommit,
      }),
    }),
    FieldValue: {
      serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
    },
    __mocks: {
      mockUpdate,
      mockBatchSet,
      mockBatchCommit,
      mockAdd,
      mockDoc,
      mockCollection,
    },
  }
})

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => '550e8400-e29b-41d4-a716-446655440099'),
}))

// Mock firebase-functions/v2/https
vi.mock('firebase-functions/v2/https', () => ({
  onCall: vi.fn((_options, handler) => handler),
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string,
      public details?: unknown
    ) {
      super(message)
      this.name = 'HttpsError'
    }
  },
}))

// Mock firebase-admin/app
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
}))

import * as firestoreMock from 'firebase-admin/firestore'

type CallableFunction = (request: {
  data: Record<string, unknown>
  auth?: { uid: string; token: Record<string, unknown> } | null
}) => Promise<unknown>

const validCrisisEntry: CrisisUrlEntry = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  domain: 'newcrisisresource.org',
  category: 'crisis',
  aliases: [],
  wildcardPatterns: [],
  name: 'New Crisis Resource',
  description: 'Emergency crisis support',
  region: 'us',
  contactMethods: ['phone', 'chat'],
  phoneNumber: '1-800-NEW-HELP',
}

// Access the internal mocks
const getMocks = () => (firestoreMock as unknown as { __mocks: {
  mockUpdate: ReturnType<typeof vi.fn>
  mockBatchSet: ReturnType<typeof vi.fn>
  mockBatchCommit: ReturnType<typeof vi.fn>
  mockAdd: ReturnType<typeof vi.fn>
  mockDoc: ReturnType<typeof vi.fn>
  mockCollection: ReturnType<typeof vi.fn>
} }).__mocks

describe('emergencyAllowlistPush', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication (AC: 4)', () => {
    it('rejects unauthenticated requests', async () => {
      const { emergencyAllowlistPush } = await import('./emergencyAllowlistPush')

      const request = {
        auth: null,
        data: {
          entries: [validCrisisEntry],
          reason: 'New crisis hotline identified for immediate protection',
        },
      }

      await expect(
        (emergencyAllowlistPush as CallableFunction)(request)
      ).rejects.toThrow('Authentication required')
    })

    it('rejects non-admin users', async () => {
      const { emergencyAllowlistPush } = await import('./emergencyAllowlistPush')

      const request = {
        auth: {
          uid: 'user-123',
          token: { isAdmin: false, email: 'user@example.com' },
        },
        data: {
          entries: [validCrisisEntry],
          reason: 'New crisis hotline identified for immediate protection',
        },
      }

      await expect(
        (emergencyAllowlistPush as CallableFunction)(request)
      ).rejects.toThrow('Admin access required')
    })

    it('accepts admin users', async () => {
      const { emergencyAllowlistPush } = await import('./emergencyAllowlistPush')

      const request = {
        auth: {
          uid: 'admin-123',
          token: { isAdmin: true, email: 'admin@fledgely.com' },
        },
        data: {
          entries: [validCrisisEntry],
          reason: 'New crisis hotline identified for immediate protection',
        },
      }

      const result = (await (emergencyAllowlistPush as CallableFunction)(
        request
      )) as { success: boolean }
      expect(result.success).toBe(true)
    })
  })

  describe('Input Validation (AC: 1, 3)', () => {
    it('rejects empty entries array', async () => {
      const { emergencyAllowlistPush } = await import('./emergencyAllowlistPush')

      const request = {
        auth: {
          uid: 'admin-123',
          token: { isAdmin: true, email: 'admin@fledgely.com' },
        },
        data: {
          entries: [],
          reason: 'New crisis hotline identified for immediate protection',
        },
      }

      await expect(
        (emergencyAllowlistPush as CallableFunction)(request)
      ).rejects.toThrow('Invalid input')
    })

    it('rejects short reason', async () => {
      const { emergencyAllowlistPush } = await import('./emergencyAllowlistPush')

      const request = {
        auth: {
          uid: 'admin-123',
          token: { isAdmin: true, email: 'admin@fledgely.com' },
        },
        data: {
          entries: [validCrisisEntry],
          reason: 'Short',
        },
      }

      await expect(
        (emergencyAllowlistPush as CallableFunction)(request)
      ).rejects.toThrow('Invalid input')
    })

    it('accepts valid payload', async () => {
      const { emergencyAllowlistPush } = await import('./emergencyAllowlistPush')

      const request = {
        auth: {
          uid: 'admin-123',
          token: { isAdmin: true, email: 'admin@fledgely.com' },
        },
        data: {
          entries: [validCrisisEntry],
          reason: 'New crisis hotline identified for immediate protection',
        },
      }

      const result = (await (emergencyAllowlistPush as CallableFunction)(
        request
      )) as { success: boolean; pushId: string }
      expect(result.success).toBe(true)
      expect(result.pushId).toBeDefined()
    })
  })

  describe('Firestore Storage (AC: 5)', () => {
    it('stores push record using batch', async () => {
      const { emergencyAllowlistPush } = await import('./emergencyAllowlistPush')
      const mocks = getMocks()

      const request = {
        auth: {
          uid: 'admin-123',
          token: { isAdmin: true, email: 'admin@fledgely.com' },
        },
        data: {
          entries: [validCrisisEntry],
          reason: 'New crisis hotline identified for immediate protection',
        },
      }

      await (emergencyAllowlistPush as CallableFunction)(request)

      // Batch set is called for push record and override entry
      expect(mocks.mockBatchSet).toHaveBeenCalled()
      expect(mocks.mockBatchCommit).toHaveBeenCalled()
    })
  })

  describe('Audit Trail (AC: 4, 6)', () => {
    it('includes operator email in push record', async () => {
      const { emergencyAllowlistPush } = await import('./emergencyAllowlistPush')
      const mocks = getMocks()

      const request = {
        auth: {
          uid: 'admin-123',
          token: { isAdmin: true, email: 'admin@fledgely.com' },
        },
        data: {
          entries: [validCrisisEntry],
          reason: 'New crisis hotline identified for immediate protection',
        },
      }

      await (emergencyAllowlistPush as CallableFunction)(request)

      // Check that batch set was called with operator
      expect(mocks.mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          operator: 'admin@fledgely.com',
        })
      )
    })

    it('includes reason in push record', async () => {
      const { emergencyAllowlistPush } = await import('./emergencyAllowlistPush')
      const mocks = getMocks()
      const reason = 'New crisis hotline identified for immediate protection'

      const request = {
        auth: {
          uid: 'admin-123',
          token: { isAdmin: true, email: 'admin@fledgely.com' },
        },
        data: {
          entries: [validCrisisEntry],
          reason,
        },
      }

      await (emergencyAllowlistPush as CallableFunction)(request)

      expect(mocks.mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          reason,
        })
      )
    })

    it('logs to admin audit on success', async () => {
      const { emergencyAllowlistPush } = await import('./emergencyAllowlistPush')
      const mocks = getMocks()

      const request = {
        auth: {
          uid: 'admin-123',
          token: { isAdmin: true, email: 'admin@fledgely.com' },
        },
        data: {
          entries: [validCrisisEntry],
          reason: 'New crisis hotline identified for immediate protection',
        },
      }

      await (emergencyAllowlistPush as CallableFunction)(request)

      expect(mocks.mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'emergency_allowlist_push',
          resourceType: 'crisisAllowlist',
        })
      )
    })
  })

  describe('Response (AC: 1)', () => {
    it('returns push ID in response', async () => {
      const { emergencyAllowlistPush } = await import('./emergencyAllowlistPush')

      const request = {
        auth: {
          uid: 'admin-123',
          token: { isAdmin: true, email: 'admin@fledgely.com' },
        },
        data: {
          entries: [validCrisisEntry],
          reason: 'New crisis hotline identified for immediate protection',
        },
      }

      const result = (await (emergencyAllowlistPush as CallableFunction)(
        request
      )) as { pushId: string }

      expect(result.pushId).toBe('550e8400-e29b-41d4-a716-446655440099')
    })

    it('returns entries count', async () => {
      const { emergencyAllowlistPush } = await import('./emergencyAllowlistPush')

      const request = {
        auth: {
          uid: 'admin-123',
          token: { isAdmin: true, email: 'admin@fledgely.com' },
        },
        data: {
          entries: [validCrisisEntry],
          reason: 'New crisis hotline identified for immediate protection',
        },
      }

      const result = (await (emergencyAllowlistPush as CallableFunction)(
        request
      )) as { entriesAdded: number }

      expect(result.entriesAdded).toBe(1)
    })

    it('returns estimated propagation time', async () => {
      const { emergencyAllowlistPush } = await import('./emergencyAllowlistPush')

      const request = {
        auth: {
          uid: 'admin-123',
          token: { isAdmin: true, email: 'admin@fledgely.com' },
        },
        data: {
          entries: [validCrisisEntry],
          reason: 'New crisis hotline identified for immediate protection',
        },
      }

      const result = (await (emergencyAllowlistPush as CallableFunction)(
        request
      )) as { estimatedPropagationMinutes: number }

      expect(result.estimatedPropagationMinutes).toBeLessThanOrEqual(30)
    })
  })

  describe('Multiple Entries', () => {
    it('handles multiple entries in single push', async () => {
      const { emergencyAllowlistPush } = await import('./emergencyAllowlistPush')

      const secondEntry = {
        ...validCrisisEntry,
        id: '550e8400-e29b-41d4-a716-446655440002',
        domain: 'anotherresource.org',
        name: 'Another Crisis Resource',
      }

      const request = {
        auth: {
          uid: 'admin-123',
          token: { isAdmin: true, email: 'admin@fledgely.com' },
        },
        data: {
          entries: [validCrisisEntry, secondEntry],
          reason: 'Multiple crisis resources identified for protection',
        },
      }

      const result = (await (emergencyAllowlistPush as CallableFunction)(
        request
      )) as { success: boolean; entriesAdded: number }

      expect(result.success).toBe(true)
      expect(result.entriesAdded).toBe(2)
    })
  })

  describe('Status (AC: 1)', () => {
    it('sets initial status to pending', async () => {
      const { emergencyAllowlistPush } = await import('./emergencyAllowlistPush')
      const mocks = getMocks()

      const request = {
        auth: {
          uid: 'admin-123',
          token: { isAdmin: true, email: 'admin@fledgely.com' },
        },
        data: {
          entries: [validCrisisEntry],
          reason: 'New crisis hotline identified for immediate protection',
        },
      }

      await (emergencyAllowlistPush as CallableFunction)(request)

      expect(mocks.mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'pending',
        })
      )
    })
  })
})
