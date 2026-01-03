/**
 * Tests for approveExtensionWithPin Cloud Function.
 *
 * Story 39.4: Caregiver PIN for Time Extension
 * - AC2: Extension approval with PIN (correct/wrong PIN, lockout)
 * - AC4: Extension logging
 * - AC6: Child notification
 * - AC7: Permission requirement
 *
 * Tests cover:
 * - Authentication validation
 * - Permission validation (caregiver with canExtendTime)
 * - PIN verification and lockout
 * - Extension limit enforcement
 * - Daily limit enforcement
 * - Extension logging
 * - Child notification creation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as bcrypt from 'bcryptjs'

// Mock @fledgely/shared
vi.mock('@fledgely/shared', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { z } = require('zod')
  return {
    approveExtensionWithPinInputSchema: z.object({
      familyId: z.string().min(1),
      childUid: z.string().min(1),
      pin: z.string().regex(/^\d{4,6}$/),
      extensionMinutes: z.number().int().min(1).max(120).optional(),
      requestId: z.string().optional(),
    }),
    MAX_PIN_ATTEMPTS: 3,
    PIN_LOCKOUT_MINUTES: 15,
    DEFAULT_EXTENSION_LIMITS: {
      maxDurationMinutes: 30,
      maxDailyExtensions: 1,
    },
  }
})

// Mock firebase-admin/firestore
const mockBatchSet = vi.fn()
const mockBatchUpdate = vi.fn()
const mockBatchCommit = vi.fn()
const _mockDoc = vi.fn()
const _mockGet = vi.fn()
const mockAdd = vi.fn()
const mockCollection = vi.fn()
const _mockWhere = vi.fn()

// Create chainable mock (used in setup)
const _createQueryMock = (docs: unknown[]) => ({
  get: vi.fn().mockResolvedValue({ docs, size: docs.length }),
  where: vi.fn().mockReturnThis(),
})

vi.mock('firebase-admin/firestore', () => {
  // Create Timestamp class inside factory to avoid hoisting issues
  class MockTimestamp {
    private _date: Date
    constructor(date: Date) {
      this._date = date
    }
    toDate() {
      return this._date
    }
    static fromDate(date: Date) {
      return new MockTimestamp(date)
    }
  }

  return {
    getFirestore: () => ({
      collection: (...args: unknown[]) => mockCollection(...args),
      batch: () => ({
        set: mockBatchSet,
        update: mockBatchUpdate,
        commit: mockBatchCommit,
      }),
    }),
    FieldValue: {
      serverTimestamp: () => 'SERVER_TIMESTAMP',
    },
    Timestamp: MockTimestamp,
  }
})

// Mock firebase-functions
vi.mock('firebase-functions/v2/https', () => ({
  onCall: (handler: unknown) => handler,
  HttpsError: class HttpsError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
      this.name = 'HttpsError'
    }
  },
}))

// Mock auth verification
vi.mock('../shared/auth', () => ({
  verifyAuth: vi.fn((auth) => {
    if (!auth || !auth.uid) {
      const error = new Error('Authentication required')
      ;(error as unknown as { code: string }).code = 'unauthenticated'
      throw error
    }
    return { uid: auth.uid, email: auth.email || 'test@example.com' }
  }),
}))

// Import after mocks
import { approveExtensionWithPin } from './approveExtensionWithPin'

describe('approveExtensionWithPin', () => {
  const validPinHash = bcrypt.hashSync('1234', 10)

  const mockCaregiverWithPin = {
    uid: 'caregiver-123',
    email: 'grandma@example.com',
    displayName: 'Grandma',
    role: 'status_viewer',
    relationship: 'grandparent',
    childIds: ['child-1'],
    permissions: {
      canExtendTime: true,
      canViewFlags: false,
    },
    pinConfig: {
      pinHash: validPinHash,
      pinSetAt: new Date(),
      pinSetByUid: 'parent-123',
      failedAttempts: 0,
    },
    extensionLimits: {
      maxDurationMinutes: 60,
      maxDailyExtensions: 2,
    },
    addedAt: new Date(),
    addedByUid: 'parent-123',
  }

  const mockFamilyWithCaregiver = {
    exists: true,
    data: () => ({
      id: 'family-123',
      name: 'Test Family',
      guardians: [{ uid: 'parent-123', role: 'primary_guardian' }],
      caregivers: [mockCaregiverWithPin],
    }),
  }

  const mockChild = {
    exists: true,
    data: () => ({
      displayName: 'Mateo',
      timeBalanceMinutes: 30,
    }),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockBatchCommit.mockResolvedValue(undefined)
    mockAdd.mockResolvedValue({ id: 'audit-log-id' })

    // Setup collection mock with proper chaining
    mockCollection.mockImplementation((path: string) => {
      if (path === 'families') {
        return {
          doc: (id: string) => {
            if (id === 'family-123') {
              return {
                id: 'family-123',
                get: vi.fn().mockResolvedValue(mockFamilyWithCaregiver),
                update: vi.fn().mockResolvedValue(undefined),
                collection: (subPath: string) => {
                  if (subPath === 'children') {
                    return {
                      doc: (childId: string) => ({
                        id: childId,
                        get: vi.fn().mockResolvedValue(mockChild),
                        collection: (notifPath: string) => {
                          if (notifPath === 'notifications') {
                            return { doc: () => ({ id: 'notification-id' }) }
                          }
                          return { doc: () => ({ id: 'doc-id' }) }
                        },
                      }),
                    }
                  }
                  if (subPath === 'caregiverExtensionLogs') {
                    const chainableWhere = {
                      where: vi.fn().mockReturnThis(),
                      get: vi.fn().mockResolvedValue({ docs: [], size: 0 }),
                    }
                    return {
                      doc: () => ({ id: 'log-id' }),
                      where: () => chainableWhere,
                    }
                  }
                  if (subPath === 'timeExtensionRequests') {
                    return { doc: () => ({ id: 'request-id' }) }
                  }
                  return { doc: () => ({ id: 'doc-id' }) }
                },
              }
            }
            return {
              get: vi.fn().mockResolvedValue({ exists: false }),
            }
          },
        }
      }
      if (path === 'caregiverAuditLogs') {
        return {
          doc: () => ({ id: 'audit-log-id' }),
          add: mockAdd,
        }
      }
      return { doc: () => ({ id: 'doc-id' }) }
    })
  })

  const validInput = {
    familyId: 'family-123',
    childUid: 'child-1',
    pin: '1234',
  }

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      await expect(
        approveExtensionWithPin({
          data: validInput,
          auth: null,
        } as Parameters<typeof approveExtensionWithPin>[0])
      ).rejects.toThrow('Authentication required')
    })
  })

  describe('Permission Validation (AC7)', () => {
    it('should reject non-caregivers', async () => {
      mockCollection.mockImplementation((path: string) => {
        if (path === 'families') {
          return {
            doc: () => ({
              get: vi.fn().mockResolvedValue(mockFamilyWithCaregiver),
            }),
          }
        }
        return { doc: () => ({ id: 'doc-id' }) }
      })

      await expect(
        approveExtensionWithPin({
          data: validInput,
          auth: { uid: 'random-user-123' },
        } as Parameters<typeof approveExtensionWithPin>[0])
      ).rejects.toThrow('You are not a caregiver in this family')
    })

    it('should reject caregivers without canExtendTime permission', async () => {
      const caregiverWithoutPermission = {
        ...mockCaregiverWithPin,
        permissions: { canExtendTime: false, canViewFlags: false },
      }
      mockCollection.mockImplementation((path: string) => {
        if (path === 'families') {
          return {
            doc: () => ({
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  ...mockFamilyWithCaregiver.data(),
                  caregivers: [caregiverWithoutPermission],
                }),
              }),
            }),
          }
        }
        return { doc: () => ({ id: 'doc-id' }) }
      })

      await expect(
        approveExtensionWithPin({
          data: validInput,
          auth: { uid: 'caregiver-123' },
        } as Parameters<typeof approveExtensionWithPin>[0])
      ).rejects.toThrow('You do not have permission to extend time')
    })

    it('should reject if PIN not configured', async () => {
      const caregiverWithoutPin = {
        ...mockCaregiverWithPin,
        pinConfig: undefined,
      }
      mockCollection.mockImplementation((path: string) => {
        if (path === 'families') {
          return {
            doc: () => ({
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  ...mockFamilyWithCaregiver.data(),
                  caregivers: [caregiverWithoutPin],
                }),
              }),
            }),
          }
        }
        return { doc: () => ({ id: 'doc-id' }) }
      })

      await expect(
        approveExtensionWithPin({
          data: validInput,
          auth: { uid: 'caregiver-123' },
        } as Parameters<typeof approveExtensionWithPin>[0])
      ).rejects.toThrow('PIN not configured')
    })
  })

  describe('PIN Verification (AC2)', () => {
    it('should return error for incorrect PIN', async () => {
      const result = await approveExtensionWithPin({
        data: { ...validInput, pin: '9999' },
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof approveExtensionWithPin>[0])

      expect(result.success).toBe(false)
      expect((result as { error: string }).error).toContain('Incorrect PIN')
      expect((result as { remainingAttempts: number }).remainingAttempts).toBe(2)
    })

    it('should accept correct PIN', async () => {
      const result = await approveExtensionWithPin({
        data: validInput,
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof approveExtensionWithPin>[0])

      expect(result.success).toBe(true)
    })

    it('should lockout after 3 failed attempts', async () => {
      const caregiverWith2Failures = {
        ...mockCaregiverWithPin,
        pinConfig: {
          ...mockCaregiverWithPin.pinConfig,
          failedAttempts: 2,
        },
      }

      mockCollection.mockImplementation((path: string) => {
        if (path === 'families') {
          return {
            doc: () => ({
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  ...mockFamilyWithCaregiver.data(),
                  caregivers: [caregiverWith2Failures],
                }),
              }),
              update: vi.fn().mockResolvedValue(undefined),
            }),
          }
        }
        if (path === 'caregiverAuditLogs') {
          return { add: mockAdd }
        }
        return { doc: () => ({ id: 'doc-id' }) }
      })

      const result = await approveExtensionWithPin({
        data: { ...validInput, pin: '9999' },
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof approveExtensionWithPin>[0])

      expect(result.success).toBe(false)
      expect((result as { error: string }).error).toContain('Locked out')
      expect((result as { remainingAttempts: number }).remainingAttempts).toBe(0)
      expect((result as { lockedUntil: Date }).lockedUntil).toBeDefined()
    })

    it('should reject if currently locked out', async () => {
      const caregiverLockedOut = {
        ...mockCaregiverWithPin,
        pinConfig: {
          ...mockCaregiverWithPin.pinConfig,
          failedAttempts: 3,
          lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
        },
      }
      mockCollection.mockImplementation((path: string) => {
        if (path === 'families') {
          return {
            doc: () => ({
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  ...mockFamilyWithCaregiver.data(),
                  caregivers: [caregiverLockedOut],
                }),
              }),
            }),
          }
        }
        return { doc: () => ({ id: 'doc-id' }) }
      })

      const result = await approveExtensionWithPin({
        data: validInput,
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof approveExtensionWithPin>[0])

      expect(result.success).toBe(false)
      expect((result as { error: string }).error).toContain('Try again in')
    })
  })

  describe('Extension Limits (AC3)', () => {
    it('should use default extension amount if not provided', async () => {
      const result = await approveExtensionWithPin({
        data: { familyId: 'family-123', childUid: 'child-1', pin: '1234' },
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof approveExtensionWithPin>[0])

      expect(result.success).toBe(true)
      expect((result as { extensionMinutes: number }).extensionMinutes).toBe(60) // caregiver's max
    })

    it('should reject extension exceeding limit', async () => {
      await expect(
        approveExtensionWithPin({
          data: { ...validInput, extensionMinutes: 120 },
          auth: { uid: 'caregiver-123' },
        } as Parameters<typeof approveExtensionWithPin>[0])
      ).rejects.toThrow('Extension exceeds your limit')
    })
  })

  describe('Extension Success', () => {
    it('should return correct response on success', async () => {
      const result = await approveExtensionWithPin({
        data: { ...validInput, extensionMinutes: 30 },
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof approveExtensionWithPin>[0])

      expect(result.success).toBe(true)
      expect((result as { extensionMinutes: number }).extensionMinutes).toBe(30)
      expect((result as { newTimeBalanceMinutes: number }).newTimeBalanceMinutes).toBe(60) // 30 + 30
      expect((result as { childName: string }).childName).toBe('Mateo')
    })

    it('should create extension log (AC4)', async () => {
      await approveExtensionWithPin({
        data: validInput,
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof approveExtensionWithPin>[0])

      expect(mockBatchSet).toHaveBeenCalled()
      // Verify log entry was created
      const setCallArgs = mockBatchSet.mock.calls.map((call) => call[1])
      const logEntry = setCallArgs.find((arg) => arg.caregiverUid === 'caregiver-123')
      expect(logEntry).toBeDefined()
    })

    it('should create child notification (AC6)', async () => {
      await approveExtensionWithPin({
        data: validInput,
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof approveExtensionWithPin>[0])

      expect(mockBatchSet).toHaveBeenCalled()
      // Verify notification was created
      const setCallArgs = mockBatchSet.mock.calls.map((call) => call[1])
      const notification = setCallArgs.find((arg) => arg.type === 'caregiver_extension')
      expect(notification).toBeDefined()
      expect(notification.message).toContain('Grandma')
      expect(notification.message).toContain('more minutes')
    })

    it('should create audit log entry', async () => {
      await approveExtensionWithPin({
        data: validInput,
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof approveExtensionWithPin>[0])

      expect(mockBatchSet).toHaveBeenCalled()
      const setCallArgs = mockBatchSet.mock.calls.map((call) => call[1])
      const auditLog = setCallArgs.find((arg) => arg.action === 'caregiver_extension_granted')
      expect(auditLog).toBeDefined()
      expect(auditLog.childUid).toBe('child-1')
    })

    it('should update request status if requestId provided', async () => {
      await approveExtensionWithPin({
        data: { ...validInput, requestId: 'req-123' },
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof approveExtensionWithPin>[0])

      expect(mockBatchUpdate).toHaveBeenCalled()
    })
  })
})
