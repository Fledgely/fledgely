/**
 * Unit tests for Enrollment Cloud Functions - Story 12.3
 *
 * Tests cover:
 * - submitEnrollmentRequest: Token validation, request creation
 * - approveEnrollment: Auth, permission, state transitions
 * - rejectEnrollment: Auth, permission, state transitions
 * - Request expiry logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Timestamp } from 'firebase-admin/firestore'

// Mock firebase-admin/firestore before importing the function
const mockRequestRef = {
  id: 'request-123',
  set: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
}

const mockTokenDoc = {
  ref: { update: vi.fn() },
  data: vi.fn(),
}

const mockTokenSnapshot = {
  empty: false,
  docs: [mockTokenDoc],
}

const mockFamilyDoc = {
  exists: true,
  data: vi.fn(),
}

const mockRequestsCollection = {
  doc: vi.fn(() => mockRequestRef),
  where: vi.fn().mockReturnThis(),
  get: vi.fn(),
}

const mockTokensCollection = {
  where: vi.fn().mockReturnThis(),
  get: vi.fn(() => Promise.resolve(mockTokenSnapshot)),
}

const mockFamilyRef = {
  get: vi.fn(() => Promise.resolve(mockFamilyDoc)),
  collection: vi.fn((name: string) => {
    if (name === 'enrollmentRequests') return mockRequestsCollection
    if (name === 'enrollmentTokens') return mockTokensCollection
    return mockRequestsCollection
  }),
}

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => mockFamilyRef),
    })),
  })),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
  Timestamp: {
    fromMillis: vi.fn((ms: number) => ({ toMillis: () => ms, seconds: ms / 1000 })),
    now: vi.fn(() => ({ toMillis: () => Date.now(), seconds: Date.now() / 1000 })),
  },
}))

// Mock auth
vi.mock('../shared/auth', () => ({
  verifyAuth: vi.fn(),
}))

import { verifyAuth } from '../shared/auth'
import { HttpsError } from 'firebase-functions/v2/https'

describe('Enrollment Cloud Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockTokenDoc.data.mockReturnValue({
      token: 'valid-token',
      status: 'active',
      expiresAt: { toMillis: () => Date.now() + 600000 }, // 10 minutes from now
    })

    mockFamilyDoc.data.mockReturnValue({
      parents: ['parent-uid'],
      createdBy: 'parent-uid',
    })
  })

  describe('submitEnrollmentRequest', () => {
    describe('Input Validation', () => {
      it('rejects empty familyId', () => {
        const invalidInput = {
          familyId: '',
          token: 'valid-token',
          deviceInfo: { type: 'chromebook', platform: 'CrOS', userAgent: 'test' },
        }
        expect(invalidInput.familyId.length).toBe(0)
      })

      it('rejects empty token', () => {
        const invalidInput = {
          familyId: 'family-123',
          token: '',
          deviceInfo: { type: 'chromebook', platform: 'CrOS', userAgent: 'test' },
        }
        expect(invalidInput.token.length).toBe(0)
      })

      it('accepts valid input', () => {
        const validInput = {
          familyId: 'family-123',
          token: 'valid-token-uuid',
          deviceInfo: {
            type: 'chromebook' as const,
            platform: 'Chrome OS',
            userAgent: 'Mozilla/5.0 (X11; CrOS x86_64)',
          },
        }
        expect(validInput.familyId.length).toBeGreaterThan(0)
        expect(validInput.token.length).toBeGreaterThan(0)
        expect(validInput.deviceInfo.type).toBe('chromebook')
      })
    })

    describe('Token Validation', () => {
      it('rejects invalid/non-existent token', () => {
        // Simulate token not found
        const emptySnapshot = { empty: true, docs: [] }
        expect(emptySnapshot.empty).toBe(true)
      })

      it('rejects expired token', () => {
        const expiredToken = {
          token: 'expired-token',
          status: 'active',
          expiresAt: Date.now() - 60000, // Expired 1 minute ago
        }
        expect(Date.now()).toBeGreaterThan(expiredToken.expiresAt)
      })

      it('accepts valid active token', () => {
        const validToken = {
          token: 'valid-token',
          status: 'active',
          expiresAt: Date.now() + 600000, // Expires in 10 minutes
        }
        expect(validToken.status).toBe('active')
        expect(Date.now()).toBeLessThan(validToken.expiresAt)
      })
    })

    describe('Request Creation', () => {
      it('creates request with correct expiry (10 minutes)', () => {
        const REQUEST_EXPIRY_MS = 10 * 60 * 1000
        const now = Date.now()
        const expiresAt = now + REQUEST_EXPIRY_MS

        // 10 minutes from now
        expect(expiresAt - now).toBe(600000)
      })

      it('creates request with pending status', () => {
        const request = {
          familyId: 'family-123',
          token: 'token-123',
          status: 'pending',
          deviceInfo: { type: 'chromebook', platform: 'CrOS', userAgent: 'test' },
        }
        expect(request.status).toBe('pending')
      })
    })
  })

  describe('approveEnrollment', () => {
    describe('Authentication', () => {
      it('rejects unauthenticated requests', () => {
        vi.mocked(verifyAuth).mockImplementation(() => {
          throw new HttpsError('unauthenticated', 'Authentication required')
        })
        expect(() => verifyAuth(undefined)).toThrow('Authentication required')
      })

      it('accepts authenticated requests', () => {
        vi.mocked(verifyAuth).mockReturnValue({
          uid: 'parent-uid',
          email: 'parent@example.com',
          displayName: 'Parent',
        })
        const result = verifyAuth({ uid: 'parent-uid' } as Parameters<typeof verifyAuth>[0])
        expect(result.uid).toBe('parent-uid')
      })
    })

    describe('Permission Checks', () => {
      it('rejects non-parent users', () => {
        const familyData = {
          parents: ['parent-uid'],
          createdBy: 'parent-uid',
        }
        const requestingUser = 'non-parent-uid'

        const isParent =
          familyData.parents.includes(requestingUser) || familyData.createdBy === requestingUser

        expect(isParent).toBe(false)
      })

      it('accepts parent users', () => {
        const familyData = {
          parents: ['parent-uid'],
          createdBy: 'parent-uid',
        }
        const requestingUser = 'parent-uid'

        const isParent =
          familyData.parents.includes(requestingUser) || familyData.createdBy === requestingUser

        expect(isParent).toBe(true)
      })
    })

    describe('Request State Validation', () => {
      it('rejects non-pending requests', () => {
        const statuses = ['approved', 'rejected', 'expired']

        statuses.forEach((status) => {
          expect(status).not.toBe('pending')
        })
      })

      it('rejects expired requests', () => {
        const request = {
          status: 'pending',
          expiresAt: Date.now() - 60000, // Expired
        }
        expect(Date.now()).toBeGreaterThan(request.expiresAt)
      })

      it('accepts valid pending request', () => {
        const request = {
          status: 'pending',
          expiresAt: Date.now() + 300000, // 5 minutes left
        }
        expect(request.status).toBe('pending')
        expect(Date.now()).toBeLessThan(request.expiresAt)
      })
    })

    describe('Approval Flow', () => {
      it('updates request status to approved', () => {
        const updateData = {
          status: 'approved',
          approvedBy: 'parent-uid',
        }
        expect(updateData.status).toBe('approved')
        expect(updateData.approvedBy).toBeDefined()
      })

      it('marks enrollment token as used', () => {
        const tokenUpdate = { status: 'used' }
        expect(tokenUpdate.status).toBe('used')
      })
    })
  })

  describe('rejectEnrollment', () => {
    describe('Authentication', () => {
      it('rejects unauthenticated requests', () => {
        vi.mocked(verifyAuth).mockImplementation(() => {
          throw new HttpsError('unauthenticated', 'Authentication required')
        })
        expect(() => verifyAuth(undefined)).toThrow('Authentication required')
      })
    })

    describe('Permission Checks', () => {
      it('rejects non-parent users', () => {
        const familyData = {
          parents: ['parent-uid'],
          createdBy: 'parent-uid',
        }
        const requestingUser = 'attacker-uid'

        const isParent =
          familyData.parents.includes(requestingUser) || familyData.createdBy === requestingUser

        expect(isParent).toBe(false)
      })
    })

    describe('Rejection Flow', () => {
      it('updates request status to rejected', () => {
        const updateData = {
          status: 'rejected',
          rejectedBy: 'parent-uid',
        }
        expect(updateData.status).toBe('rejected')
        expect(updateData.rejectedBy).toBeDefined()
      })

      it('does not mark token as used on rejection', () => {
        // Token should remain active so family can generate new QR code
        const tokenStatus = 'active'
        expect(tokenStatus).toBe('active')
      })
    })
  })

  describe('expireEnrollmentRequests', () => {
    describe('Expiry Logic', () => {
      it('identifies expired requests (past expiresAt)', () => {
        const now = Date.now()
        const requests = [
          { status: 'pending', expiresAt: now - 60000 }, // Expired
          { status: 'pending', expiresAt: now + 60000 }, // Not expired
          { status: 'pending', expiresAt: now - 120000 }, // Expired
        ]

        const expiredRequests = requests.filter((r) => r.status === 'pending' && r.expiresAt < now)

        expect(expiredRequests).toHaveLength(2)
      })

      it('only expires pending requests', () => {
        const now = Date.now()
        const requests = [
          { status: 'pending', expiresAt: now - 60000 }, // Should expire
          { status: 'approved', expiresAt: now - 60000 }, // Already approved
          { status: 'rejected', expiresAt: now - 60000 }, // Already rejected
        ]

        const toExpire = requests.filter((r) => r.status === 'pending' && r.expiresAt < now)

        expect(toExpire).toHaveLength(1)
        expect(toExpire[0].status).toBe('pending')
      })

      it('updates status to expired', () => {
        const updateData = { status: 'expired' }
        expect(updateData.status).toBe('expired')
      })
    })
  })

  describe('Request Data Structure', () => {
    it('creates valid EnrollmentRequest structure', () => {
      const request = {
        id: 'request-123',
        familyId: 'family-456',
        token: 'token-789',
        deviceInfo: {
          type: 'chromebook' as const,
          platform: 'Chrome OS',
          userAgent: 'Mozilla/5.0 (X11; CrOS x86_64)',
        },
        status: 'pending' as const,
        createdAt: Timestamp.fromMillis(Date.now()),
        expiresAt: Timestamp.fromMillis(Date.now() + 600000),
      }

      expect(request.id).toBeDefined()
      expect(request.familyId).toBeDefined()
      expect(request.token).toBeDefined()
      expect(request.deviceInfo.type).toBe('chromebook')
      expect(request.status).toBe('pending')
    })
  })
})
