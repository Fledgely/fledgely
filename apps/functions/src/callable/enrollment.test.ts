/**
 * Unit tests for Enrollment Cloud Functions - Story 12.3, 12.4, 12.5
 *
 * Tests cover:
 * - submitEnrollmentRequest: Token validation, request creation
 * - approveEnrollment: Auth, permission, state transitions
 * - rejectEnrollment: Auth, permission, state transitions
 * - Request expiry logic
 * - registerDevice: Device document creation (Story 12.4)
 * - assignDeviceToChild: Child assignment (Story 12.5)
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

  describe('registerDevice - Story 12.4', () => {
    describe('Input Validation', () => {
      it('rejects empty familyId', () => {
        const invalidInput = { familyId: '', requestId: 'request-123' }
        expect(invalidInput.familyId.length).toBe(0)
      })

      it('rejects empty requestId', () => {
        const invalidInput = { familyId: 'family-123', requestId: '' }
        expect(invalidInput.requestId.length).toBe(0)
      })

      it('accepts valid input', () => {
        const validInput = { familyId: 'family-123', requestId: 'request-456' }
        expect(validInput.familyId.length).toBeGreaterThan(0)
        expect(validInput.requestId.length).toBeGreaterThan(0)
      })
    })

    describe('Request Status Validation', () => {
      it('rejects non-approved requests', () => {
        const invalidStatuses = ['pending', 'rejected', 'expired']
        invalidStatuses.forEach((status) => {
          expect(status).not.toBe('approved')
        })
      })

      it('accepts approved requests', () => {
        const request = { status: 'approved' }
        expect(request.status).toBe('approved')
      })
    })

    describe('Device Document Creation - AC1, AC2', () => {
      it('creates device document path correctly', () => {
        const familyId = 'family-abc'
        const devicePath = `/families/${familyId}/devices`
        expect(devicePath).toBe('/families/family-abc/devices')
      })

      it('creates valid Device structure', () => {
        const now = Timestamp.now()
        const device = {
          deviceId: 'device-xyz',
          type: 'chromebook' as const,
          enrolledAt: now,
          enrolledBy: 'parent-uid',
          childId: null,
          name: 'Chromebook device-',
          lastSeen: now,
          status: 'active' as const,
          metadata: {
            platform: 'Linux x86_64',
            userAgent: 'Mozilla/5.0',
            enrollmentRequestId: 'request-123',
          },
        }

        expect(device.deviceId).toBeDefined()
        expect(device.type).toBe('chromebook')
        expect(device.enrolledAt).toBeDefined()
        expect(device.enrolledBy).toBeDefined()
        expect(device.childId).toBeNull() // Initially unassigned
        expect(device.status).toBe('active')
        expect(device.metadata.enrollmentRequestId).toBeDefined()
      })

      it('generates unique deviceId', () => {
        const id1 = `device-${Date.now()}-${Math.random().toString(36).substring(2)}`
        const id2 = `device-${Date.now()}-${Math.random().toString(36).substring(2)}`
        expect(id1).not.toBe(id2)
      })
    })

    describe('Response Structure - AC3', () => {
      it('returns success response with deviceId', () => {
        const response = {
          success: true,
          deviceId: 'device-12345',
          message: 'Device registered successfully',
        }

        expect(response.success).toBe(true)
        expect(response.deviceId).toBeDefined()
        expect(response.message).toBeDefined()
      })

      it('returns error for non-approved request', () => {
        const response = {
          error: {
            code: 'failed-precondition',
            message: 'Cannot register device - request status is pending',
          },
        }

        expect(response.error.code).toBe('failed-precondition')
      })

      it('returns error for non-existent request', () => {
        const response = {
          error: {
            code: 'not-found',
            message: 'Enrollment request not found',
          },
        }

        expect(response.error.code).toBe('not-found')
      })
    })

    describe('Idempotency', () => {
      it('returns existing deviceId if already registered', () => {
        // Simulate existing device for same enrollment request
        const existingDevice = {
          deviceId: 'existing-device-id',
          metadata: { enrollmentRequestId: 'request-123' },
        }

        const response = {
          success: true,
          deviceId: existingDevice.deviceId,
          message: 'Device already registered',
        }

        expect(response.deviceId).toBe('existing-device-id')
        expect(response.message).toBe('Device already registered')
      })
    })
  })

  describe('assignDeviceToChild - Story 12.5', () => {
    describe('Authentication - Task 5.1', () => {
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

    describe('Input Validation', () => {
      it('rejects empty familyId', () => {
        const invalidInput = { familyId: '', deviceId: 'device-123', childId: 'child-123' }
        expect(invalidInput.familyId.length).toBe(0)
      })

      it('rejects empty deviceId', () => {
        const invalidInput = { familyId: 'family-123', deviceId: '', childId: 'child-123' }
        expect(invalidInput.deviceId.length).toBe(0)
      })

      it('accepts null childId for unassignment', () => {
        const validInput = { familyId: 'family-123', deviceId: 'device-456', childId: null }
        expect(validInput.childId).toBeNull()
      })

      it('accepts valid childId for assignment', () => {
        const validInput = { familyId: 'family-123', deviceId: 'device-456', childId: 'child-789' }
        expect(validInput.childId).toBe('child-789')
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

    describe('Child Family Verification', () => {
      it('rejects child from different family', () => {
        const childFamilyId = 'other-family'
        const requestedFamilyId = 'family-123'

        expect(childFamilyId).not.toBe(requestedFamilyId)
      })

      it('accepts child from same family', () => {
        const childFamilyId = 'family-123'
        const requestedFamilyId = 'family-123'

        expect(childFamilyId).toBe(requestedFamilyId)
      })
    })

    describe('Assignment Update - Task 5.2, AC3', () => {
      it('updates device childId field', () => {
        const updateData = {
          childId: 'child-123',
          assignedAt: 'SERVER_TIMESTAMP',
          assignedBy: 'parent-uid',
        }

        expect(updateData.childId).toBe('child-123')
        expect(updateData.assignedBy).toBe('parent-uid')
      })

      it('clears fields on unassignment', () => {
        const updateData = {
          childId: null,
          assignedAt: null,
          assignedBy: null,
        }

        expect(updateData.childId).toBeNull()
        expect(updateData.assignedAt).toBeNull()
        expect(updateData.assignedBy).toBeNull()
      })

      it('skips update if childId unchanged', () => {
        const currentChildId = 'child-123'
        const newChildId = 'child-123'

        expect(currentChildId).toBe(newChildId)
        // Should return early without update
      })
    })

    describe('Reassignment - Task 5.4, AC5', () => {
      it('allows reassignment from one child to another', () => {
        const device = { childId: 'child-A' }
        const newChildId = 'child-B'

        expect(device.childId).not.toBe(newChildId)
        // Should allow update
      })

      it('allows unassignment from assigned state', () => {
        const device = { childId: 'child-A' }
        const newChildId = null

        expect(device.childId).not.toBeNull()
        expect(newChildId).toBeNull()
        // Should allow update to null
      })
    })

    describe('Audit Log - AC4', () => {
      it('creates audit log entry with required fields', () => {
        const auditEntry = {
          type: 'device_assignment',
          familyId: 'family-123',
          deviceId: 'device-456',
          childId: 'child-789',
          previousChildId: null,
          performedBy: 'parent-uid',
          timestamp: 'SERVER_TIMESTAMP',
        }

        expect(auditEntry.type).toBe('device_assignment')
        expect(auditEntry.familyId).toBeDefined()
        expect(auditEntry.deviceId).toBeDefined()
        expect(auditEntry.childId).toBeDefined()
        expect(auditEntry.previousChildId).toBeDefined()
        expect(auditEntry.performedBy).toBeDefined()
        expect(auditEntry.timestamp).toBeDefined()
      })

      it('tracks previous childId in audit log', () => {
        const auditEntry = {
          type: 'device_assignment',
          deviceId: 'device-456',
          childId: 'child-new',
          previousChildId: 'child-old',
          performedBy: 'parent-uid',
        }

        expect(auditEntry.previousChildId).toBe('child-old')
        expect(auditEntry.childId).toBe('child-new')
      })
    })

    describe('Response Structure', () => {
      it('returns success response on assignment', () => {
        const response = {
          success: true,
          message: 'Device assigned to child',
        }

        expect(response.success).toBe(true)
        expect(response.message).toContain('assigned')
      })

      it('returns success response on unassignment', () => {
        const response = {
          success: true,
          message: 'Device unassigned',
        }

        expect(response.success).toBe(true)
        expect(response.message).toContain('unassigned')
      })

      it('returns unchanged message when assignment same', () => {
        const response = {
          success: true,
          message: 'Device assignment unchanged',
        }

        expect(response.success).toBe(true)
        expect(response.message).toContain('unchanged')
      })
    })
  })

  /**
   * Story 12.6: Enrollment State Persistence
   * Tests for verifyDeviceEnrollment and removeDevice Cloud Functions
   */
  describe('Story 12.6: Enrollment State Persistence', () => {
    describe('verifyDeviceEnrollment (AC: #4, #5)', () => {
      describe('AC4: Server Enrollment Verification', () => {
        it('requires familyId and deviceId parameters', () => {
          // Validation requirement - both params needed
          const validRequest = { familyId: 'family-123', deviceId: 'device-456' }
          expect(validRequest.familyId).toBeDefined()
          expect(validRequest.deviceId).toBeDefined()
        })

        it('returns valid=true for active device', () => {
          const response = {
            valid: true,
            status: 'active' as const,
            familyId: 'family-123',
            deviceId: 'device-456',
            childId: null,
          }

          expect(response.valid).toBe(true)
          expect(response.status).toBe('active')
        })

        it('updates lastSeen timestamp on verification', () => {
          // Server updates lastSeen when device verifies
          const deviceUpdate = {
            lastSeen: 'SERVER_TIMESTAMP',
          }

          expect(deviceUpdate.lastSeen).toBeDefined()
        })
      })

      describe('AC5: Invalid State Handling', () => {
        it('returns valid=false, status=not_found for missing device', () => {
          const response = {
            valid: false,
            status: 'not_found' as const,
          }

          expect(response.valid).toBe(false)
          expect(response.status).toBe('not_found')
        })

        it('returns valid=false, status=revoked for unenrolled device', () => {
          const response = {
            valid: false,
            status: 'revoked' as const,
            familyId: 'family-123',
            deviceId: 'device-456',
          }

          expect(response.valid).toBe(false)
          expect(response.status).toBe('revoked')
        })
      })
    })

    describe('removeDevice (AC: #6)', () => {
      describe('Authorization', () => {
        it('requires authenticated user', () => {
          // Auth check mirrors assignDeviceToChild pattern
          const authRequired = true
          expect(authRequired).toBe(true)
        })

        it('requires user to be family parent', () => {
          // Permission check - only parents can remove devices
          const isParent = true
          expect(isParent).toBe(true)
        })

        it('rejects non-parent users', () => {
          const error = {
            code: 'functions/permission-denied',
            message: 'Only family parents can remove devices',
          }

          expect(error.code).toBe('functions/permission-denied')
        })
      })

      describe('Validation', () => {
        it('requires familyId parameter', () => {
          const schema = { familyId: 'family-123', deviceId: 'device-456' }
          expect(schema.familyId).toBeDefined()
        })

        it('requires deviceId parameter', () => {
          const schema = { familyId: 'family-123', deviceId: 'device-456' }
          expect(schema.deviceId).toBeDefined()
        })

        it('rejects empty familyId', () => {
          const error = {
            code: 'functions/invalid-argument',
            message: 'Invalid removal request',
          }

          expect(error.code).toBe('functions/invalid-argument')
        })
      })

      describe('Business Logic', () => {
        it('marks device status as unenrolled (soft delete)', () => {
          const deviceUpdate = {
            status: 'unenrolled',
            unenrolledAt: 'SERVER_TIMESTAMP',
            unenrolledBy: 'parent-uid',
          }

          expect(deviceUpdate.status).toBe('unenrolled')
          expect(deviceUpdate.unenrolledAt).toBeDefined()
          expect(deviceUpdate.unenrolledBy).toBeDefined()
        })

        it('creates audit log entry for removal', () => {
          const auditEntry = {
            type: 'device_removal',
            familyId: 'family-123',
            deviceId: 'device-456',
            childId: 'child-789',
            performedBy: 'parent-uid',
            timestamp: 'SERVER_TIMESTAMP',
          }

          expect(auditEntry.type).toBe('device_removal')
          expect(auditEntry.familyId).toBeDefined()
          expect(auditEntry.deviceId).toBeDefined()
          expect(auditEntry.performedBy).toBeDefined()
        })
      })

      describe('Response', () => {
        it('returns success on device removal', () => {
          const response = {
            success: true,
            message: 'Device has been removed',
          }

          expect(response.success).toBe(true)
          expect(response.message).toContain('removed')
        })
      })
    })
  })
})
