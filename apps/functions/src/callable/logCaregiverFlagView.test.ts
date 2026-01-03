/**
 * Tests for logCaregiverFlagView Cloud Function.
 *
 * Story 39.5: Caregiver Flag Viewing
 * - AC4: Flag viewing audit log
 * - AC5: Permission requirement (canViewFlags)
 * - AC6: Child privacy (only assigned children)
 *
 * Tests cover:
 * - Authentication validation
 * - Permission validation (caregiver with canViewFlags)
 * - Child assignment validation
 * - Log entry creation
 * - Audit log creation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @fledgely/shared
vi.mock('@fledgely/shared', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { z } = require('zod')
  return {
    logCaregiverFlagViewInputSchema: z.object({
      familyId: z.string().min(1),
      flagId: z.string().min(1),
      childUid: z.string().min(1),
      action: z.enum(['viewed', 'marked_reviewed']),
      flagCategory: z.string().min(1),
      flagSeverity: z.string().min(1),
    }),
  }
})

// Mock firebase-admin/firestore
const mockBatchSet = vi.fn()
const mockBatchCommit = vi.fn()
const mockCollection = vi.fn()

vi.mock('firebase-admin/firestore', () => {
  return {
    getFirestore: () => ({
      collection: (...args: unknown[]) => mockCollection(...args),
      batch: () => ({
        set: mockBatchSet,
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
import { logCaregiverFlagView } from './logCaregiverFlagView'

describe('logCaregiverFlagView', () => {
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

  const mockChild = {
    exists: true,
    data: () => ({
      displayName: 'Emma',
    }),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockBatchCommit.mockResolvedValue(undefined)

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
    action: 'viewed',
    flagCategory: 'Violence',
    flagSeverity: 'high',
  }

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      await expect(
        logCaregiverFlagView({
          data: validInput,
          auth: null,
        } as Parameters<typeof logCaregiverFlagView>[0])
      ).rejects.toThrow('Authentication required')
    })
  })

  describe('Validation', () => {
    it('should reject missing familyId', async () => {
      await expect(
        logCaregiverFlagView({
          data: { ...validInput, familyId: '' },
          auth: { uid: 'caregiver-123' },
        } as Parameters<typeof logCaregiverFlagView>[0])
      ).rejects.toThrow('Invalid input')
    })

    it('should reject missing flagId', async () => {
      await expect(
        logCaregiverFlagView({
          data: { ...validInput, flagId: '' },
          auth: { uid: 'caregiver-123' },
        } as Parameters<typeof logCaregiverFlagView>[0])
      ).rejects.toThrow('Invalid input')
    })

    it('should reject invalid action', async () => {
      await expect(
        logCaregiverFlagView({
          data: { ...validInput, action: 'dismissed' },
          auth: { uid: 'caregiver-123' },
        } as Parameters<typeof logCaregiverFlagView>[0])
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
        logCaregiverFlagView({
          data: validInput,
          auth: { uid: 'caregiver-123' },
        } as Parameters<typeof logCaregiverFlagView>[0])
      ).rejects.toThrow('Family not found')
    })

    it('should reject non-caregivers', async () => {
      await expect(
        logCaregiverFlagView({
          data: validInput,
          auth: { uid: 'random-user-123' },
        } as Parameters<typeof logCaregiverFlagView>[0])
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
        logCaregiverFlagView({
          data: validInput,
          auth: { uid: 'caregiver-123' },
        } as Parameters<typeof logCaregiverFlagView>[0])
      ).rejects.toThrow('You do not have permission to view flags')
    })
  })

  describe('Child Privacy (AC6)', () => {
    it('should reject if caregiver not assigned to child', async () => {
      await expect(
        logCaregiverFlagView({
          data: { ...validInput, childUid: 'child-not-assigned' },
          auth: { uid: 'caregiver-123' },
        } as Parameters<typeof logCaregiverFlagView>[0])
      ).rejects.toThrow('You are not assigned to this child')
    })

    it('should allow viewing flags for assigned children', async () => {
      const result = await logCaregiverFlagView({
        data: { ...validInput, childUid: 'child-2' }, // child-2 is in childIds
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof logCaregiverFlagView>[0])

      expect(result.success).toBe(true)
    })
  })

  describe('Logging Success (AC4)', () => {
    it('should create log entry for viewed action', async () => {
      const result = await logCaregiverFlagView({
        data: validInput,
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof logCaregiverFlagView>[0])

      expect(result.success).toBe(true)
      expect(result.logId).toBeDefined()
      expect(result.message).toContain('viewed')
    })

    it('should create log entry for marked_reviewed action', async () => {
      const result = await logCaregiverFlagView({
        data: { ...validInput, action: 'marked_reviewed' },
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof logCaregiverFlagView>[0])

      expect(result.success).toBe(true)
      expect(result.message).toContain('marked as reviewed')
    })

    it('should create flag view log entry', async () => {
      await logCaregiverFlagView({
        data: validInput,
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof logCaregiverFlagView>[0])

      expect(mockBatchSet).toHaveBeenCalled()
      const setCallArgs = mockBatchSet.mock.calls.map((call) => call[1])
      const logEntry = setCallArgs.find((arg) => arg.flagId === 'flag-456')
      expect(logEntry).toBeDefined()
      expect(logEntry.caregiverUid).toBe('caregiver-123')
      expect(logEntry.action).toBe('viewed')
      expect(logEntry.flagCategory).toBe('Violence')
    })

    it('should create audit log entry', async () => {
      await logCaregiverFlagView({
        data: validInput,
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof logCaregiverFlagView>[0])

      expect(mockBatchSet).toHaveBeenCalled()
      const setCallArgs = mockBatchSet.mock.calls.map((call) => call[1])
      const auditLog = setCallArgs.find((arg) => arg.action === 'flag_viewed')
      expect(auditLog).toBeDefined()
      expect(auditLog.caregiverUid).toBe('caregiver-123')
      expect(auditLog.changes.flagId).toBe('flag-456')
    })

    it('should include child name in log entry', async () => {
      await logCaregiverFlagView({
        data: validInput,
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof logCaregiverFlagView>[0])

      const setCallArgs = mockBatchSet.mock.calls.map((call) => call[1])
      const logEntry = setCallArgs.find((arg) => arg.flagId === 'flag-456')
      expect(logEntry.childName).toBe('Emma')
    })

    it('should include caregiver name in log entry', async () => {
      await logCaregiverFlagView({
        data: validInput,
        auth: { uid: 'caregiver-123' },
      } as Parameters<typeof logCaregiverFlagView>[0])

      const setCallArgs = mockBatchSet.mock.calls.map((call) => call[1])
      const logEntry = setCallArgs.find((arg) => arg.flagId === 'flag-456')
      expect(logEntry.caregiverName).toBe('Grandma')
    })
  })
})
