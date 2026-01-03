/**
 * Tests for markFlagReviewedByCaregiver Cloud Function.
 *
 * Story 39.5: Caregiver Flag Viewing
 * - AC2: Reviewed Flag Marking
 * - AC3: Restricted Actions (cannot dismiss/escalate/resolve)
 * - AC5: Permission requirement (canViewFlags)
 * - AC6: Child privacy (only assigned children)
 *
 * Tests cover:
 * - Authentication validation
 * - Permission validation (caregiver with canViewFlags)
 * - Child assignment validation
 * - Flag update (caregiverReviewedAt, caregiverReviewedBy)
 * - Restricted actions (no status change, dismissal, escalation)
 * - Log entry creation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @fledgely/shared
vi.mock('@fledgely/shared', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { z } = require('zod')
  return {
    markFlagReviewedByCaregiverInputSchema: z.object({
      familyId: z.string().min(1),
      flagId: z.string().min(1),
      childUid: z.string().min(1),
    }),
  }
})

// Mock firebase-admin/firestore
const mockBatchSet = vi.fn()
const mockBatchUpdate = vi.fn()
const mockBatchCommit = vi.fn()
const mockCollection = vi.fn()
const _mockDocGet = vi.fn()

vi.mock('firebase-admin/firestore', () => {
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
    return { uid: auth.uid, email: auth.email || 'caregiver@example.com' }
  }),
}))

// Import after mocks
import { markFlagReviewedByCaregiver } from './markFlagReviewedByCaregiver'

describe('markFlagReviewedByCaregiver', () => {
  const mockCaregiverWithFlagPermission = {
    uid: 'caregiver-123',
    email: 'grandma@example.com',
    displayName: 'Grandma',
    role: 'status_viewer',
    relationship: 'grandparent',
    childIds: ['child-1', 'child-2'],
    permissions: {
      canExtendTime: false,
      canViewFlags: true,
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
      caregivers: [mockCaregiverWithFlagPermission],
    }),
  }

  const mockFlag = {
    exists: true,
    id: 'flag-456',
    data: () => ({
      id: 'flag-456',
      familyId: 'family-123',
      childUid: 'child-1',
      category: 'Violence',
      severity: 'high',
      status: 'pending',
      createdAt: new Date(),
    }),
  }

  const mockChild = {
    exists: true,
    data: () => ({
      displayName: 'Emma',
    }),
  }

  let mockFlagRef: { id: string; get: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    mockBatchCommit.mockResolvedValue(undefined)

    mockFlagRef = {
      id: 'flag-456',
      get: vi.fn().mockResolvedValue(mockFlag),
    }

    // Setup collection mock with proper chaining
    mockCollection.mockImplementation((path: string) => {
      if (path === 'families') {
        return {
          doc: (id: string) => {
            if (id === 'family-123') {
              return {
                id: 'family-123',
                get: vi.fn().mockResolvedValue(mockFamilyWithCaregiver),
                collection: (subPath: string) => {
                  if (subPath === 'children') {
                    return {
                      doc: () => ({
                        get: vi.fn().mockResolvedValue(mockChild),
                      }),
                    }
                  }
                  if (subPath === 'caregiverFlagViewLogs') {
                    return {
                      doc: () => ({ id: 'log-id' }),
                    }
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
      // Flags are stored at children/{childId}/flags/{flagId}
      if (path === 'children') {
        return {
          doc: (childId: string) => {
            if (childId === 'child-1' || childId === 'child-2') {
              return {
                collection: (subPath: string) => {
                  if (subPath === 'flags') {
                    return {
                      doc: (flagId: string) => {
                        if (flagId === 'flag-456') {
                          return mockFlagRef
                        }
                        return {
                          get: vi.fn().mockResolvedValue({ exists: false }),
                        }
                      },
                    }
                  }
                  return { doc: () => ({ id: 'doc-id' }) }
                },
              }
            }
            return {
              collection: () => ({
                doc: () => ({
                  get: vi.fn().mockResolvedValue({ exists: false }),
                }),
              }),
            }
          },
        }
      }
      if (path === 'caregiverAuditLogs') {
        return {
          doc: () => ({ id: 'audit-log-id' }),
        }
      }
      return { doc: () => ({ id: 'doc-id' }) }
    })
  })

  const validInput = {
    familyId: 'family-123',
    flagId: 'flag-456',
    childUid: 'child-1',
  }

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      await expect(
        markFlagReviewedByCaregiver({
          data: validInput,
          auth: null,
        } as Parameters<typeof markFlagReviewedByCaregiver>[0])
      ).rejects.toThrow('Authentication required')
    })
  })

  describe('Validation', () => {
    it('should reject missing familyId', async () => {
      await expect(
        markFlagReviewedByCaregiver({
          data: { ...validInput, familyId: '' },
          auth: { uid: 'caregiver-123' },
        } as Parameters<typeof markFlagReviewedByCaregiver>[0])
      ).rejects.toThrow('Invalid input')
    })

    it('should reject missing flagId', async () => {
      await expect(
        markFlagReviewedByCaregiver({
          data: { ...validInput, flagId: '' },
          auth: { uid: 'caregiver-123' },
        } as Parameters<typeof markFlagReviewedByCaregiver>[0])
      ).rejects.toThrow('Invalid input')
    })

    it('should reject missing childUid', async () => {
      await expect(
        markFlagReviewedByCaregiver({
          data: { ...validInput, childUid: '' },
          auth: { uid: 'caregiver-123' },
        } as Parameters<typeof markFlagReviewedByCaregiver>[0])
      ).rejects.toThrow('Invalid input')
    })
  })

  describe('Permission Validation (AC5)', () => {
    it('should reject if family not found', async () => {
      mockCollection.mockImplementation((path: string) => {
        if (path === 'families') {
          return {
            doc: () => ({
              get: vi.fn().mockResolvedValue({ exists: false }),
            }),
          }
        }
        return { doc: () => ({ id: 'doc-id' }) }
      })

      await expect(
        markFlagReviewedByCaregiver({
          data: validInput,
          auth: { uid: 'caregiver-123' },
        } as Parameters<typeof markFlagReviewedByCaregiver>[0])
      ).rejects.toThrow('Family not found')
    })

    it('should reject non-caregivers', async () => {
      await expect(
        markFlagReviewedByCaregiver({
          data: validInput,
          auth: { uid: 'random-user-123' },
        } as Parameters<typeof markFlagReviewedByCaregiver>[0])
      ).rejects.toThrow('You are not a caregiver in this family')
    })

    it('should reject caregivers without canViewFlags permission', async () => {
      const caregiverWithoutPermission = {
        ...mockCaregiverWithFlagPermission,
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
        markFlagReviewedByCaregiver({
          data: validInput,
          auth: { uid: 'caregiver-123' },
        } as Parameters<typeof markFlagReviewedByCaregiver>[0])
      ).rejects.toThrow('You do not have permission to view flags')
    })
  })

  describe('Flag Validation', () => {
    it('should reject if flag not found', async () => {
      mockFlagRef.get.mockResolvedValue({ exists: false })

      await expect(
        markFlagReviewedByCaregiver({
          data: validInput,
          auth: { uid: 'caregiver-123' },
        } as Parameters<typeof markFlagReviewedByCaregiver>[0])
      ).rejects.toThrow('Flag not found')
    })
  })

  describe('Child Privacy (AC6)', () => {
    it('should reject if caregiver not assigned to child', async () => {
      // childUid is not in caregiver's childIds (child-1, child-2)
      await expect(
        markFlagReviewedByCaregiver({
          data: { ...validInput, childUid: 'child-not-assigned' },
          auth: { uid: 'caregiver-123' },
        } as Parameters<typeof markFlagReviewedByCaregiver>[0])
      ).rejects.toThrow('You are not assigned to this child')
    })
  })

  describe('Restricted Actions (AC3)', () => {
    it('should NOT change flag status', async () => {
      await markFlagReviewedByCaregiver({
        data: validInput,
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof markFlagReviewedByCaregiver>[0])

      // Check that batch.update was called but does NOT include status change
      const updateCalls = mockBatchUpdate.mock.calls
      const flagUpdate = updateCalls.find((call) => call[0]?.id === 'flag-456')

      if (flagUpdate) {
        expect(flagUpdate[1].status).toBeUndefined()
      }
    })

    it('should only set caregiverReviewedAt and caregiverReviewedBy', async () => {
      await markFlagReviewedByCaregiver({
        data: validInput,
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof markFlagReviewedByCaregiver>[0])

      expect(mockBatchUpdate).toHaveBeenCalled()
      const updateCall = mockBatchUpdate.mock.calls.find((call) => call[0]?.id === 'flag-456')
      expect(updateCall).toBeDefined()
      const updateData = updateCall![1]

      expect(updateData.caregiverReviewedAt).toBe('SERVER_TIMESTAMP')
      expect(updateData.caregiverReviewedBy).toEqual({
        uid: 'caregiver-123',
        displayName: 'Grandma',
      })
      // Ensure no status change
      expect(updateData.status).toBeUndefined()
      // Ensure no dismissal fields
      expect(updateData.dismissedAt).toBeUndefined()
      expect(updateData.dismissedBy).toBeUndefined()
      // Ensure no escalation fields
      expect(updateData.escalatedAt).toBeUndefined()
      expect(updateData.escalatedBy).toBeUndefined()
    })
  })

  describe('Logging Success (AC2, AC4)', () => {
    it('should create flag view log with marked_reviewed action', async () => {
      await markFlagReviewedByCaregiver({
        data: validInput,
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof markFlagReviewedByCaregiver>[0])

      expect(mockBatchSet).toHaveBeenCalled()
      const setCallArgs = mockBatchSet.mock.calls.map((call) => call[1])
      const logEntry = setCallArgs.find((arg) => arg.action === 'marked_reviewed')
      expect(logEntry).toBeDefined()
      expect(logEntry.caregiverUid).toBe('caregiver-123')
      expect(logEntry.flagId).toBe('flag-456')
    })

    it('should create audit log entry', async () => {
      await markFlagReviewedByCaregiver({
        data: validInput,
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof markFlagReviewedByCaregiver>[0])

      expect(mockBatchSet).toHaveBeenCalled()
      const setCallArgs = mockBatchSet.mock.calls.map((call) => call[1])
      const auditLog = setCallArgs.find((arg) => arg.action === 'flag_marked_reviewed')
      expect(auditLog).toBeDefined()
      expect(auditLog.caregiverUid).toBe('caregiver-123')
      expect(auditLog.changes.flagId).toBe('flag-456')
    })

    it('should return success with flag info', async () => {
      const result = await markFlagReviewedByCaregiver({
        data: validInput,
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof markFlagReviewedByCaregiver>[0])

      expect(result.success).toBe(true)
      expect(result.flagId).toBe('flag-456')
      expect(result.message).toContain('marked as reviewed')
    })

    it('should include child name in log entry', async () => {
      await markFlagReviewedByCaregiver({
        data: validInput,
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof markFlagReviewedByCaregiver>[0])

      const setCallArgs = mockBatchSet.mock.calls.map((call) => call[1])
      const logEntry = setCallArgs.find((arg) => arg.action === 'marked_reviewed')
      expect(logEntry.childName).toBe('Emma')
    })

    it('should include caregiver name in log entry', async () => {
      await markFlagReviewedByCaregiver({
        data: validInput,
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof markFlagReviewedByCaregiver>[0])

      const setCallArgs = mockBatchSet.mock.calls.map((call) => call[1])
      const logEntry = setCallArgs.find((arg) => arg.action === 'marked_reviewed')
      expect(logEntry.caregiverName).toBe('Grandma')
    })
  })

  describe('Edge Cases', () => {
    it('should allow marking flag for second assigned child', async () => {
      // child-2 is in caregiver's childIds
      const result = await markFlagReviewedByCaregiver({
        data: { ...validInput, childUid: 'child-2' },
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof markFlagReviewedByCaregiver>[0])

      expect(result.success).toBe(true)
    })

    it('should handle already reviewed flag', async () => {
      mockFlagRef.get.mockResolvedValue({
        exists: true,
        id: 'flag-456',
        data: () => ({
          ...mockFlag.data(),
          caregiverReviewedAt: new Date(),
          caregiverReviewedBy: { uid: 'caregiver-123', displayName: 'Grandma' },
        }),
      })

      // Should still succeed (update the timestamp again)
      const result = await markFlagReviewedByCaregiver({
        data: validInput,
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof markFlagReviewedByCaregiver>[0])

      expect(result.success).toBe(true)
    })
  })
})
