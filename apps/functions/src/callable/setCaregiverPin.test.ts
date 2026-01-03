/**
 * Tests for setCaregiverPin Cloud Function.
 *
 * Story 39.4: Caregiver PIN for Time Extension
 * - AC1: PIN setup by parent (4-6 digits, securely hashed)
 * - AC3: Extension limits configurable
 *
 * Tests cover:
 * - Authentication validation
 * - Input validation (PIN format)
 * - Permission validation (guardian only)
 * - PIN hashing with bcrypt
 * - Extension limits configuration
 * - Audit logging
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as bcrypt from 'bcryptjs'

// Mock @fledgely/shared - must use factory that doesn't reference external variables
vi.mock('@fledgely/shared', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { z } = require('zod')
  return {
    setCaregiverPinInputSchema: z.object({
      familyId: z.string().min(1, 'familyId is required'),
      caregiverUid: z.string().min(1, 'caregiverUid is required'),
      pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
      extensionLimits: z
        .object({
          maxDurationMinutes: z.union([z.literal(30), z.literal(60), z.literal(120)]).default(30),
          maxDailyExtensions: z.number().int().min(1).max(5).default(1),
        })
        .optional(),
    }),
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
const mockDoc = vi.fn()
const mockGet = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: () => ({
      doc: mockDoc,
    }),
    batch: () => ({
      set: mockBatchSet,
      update: mockBatchUpdate,
      commit: mockBatchCommit,
    }),
  }),
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
}))

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
import { setCaregiverPin } from './setCaregiverPin'

describe('setCaregiverPin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDoc.mockReturnValue({ id: 'mock-doc-id' })
    mockBatchCommit.mockResolvedValue(undefined)
  })

  const validInput = {
    familyId: 'family-123',
    caregiverUid: 'caregiver-456',
    pin: '1234',
  }

  const mockFamilyWithCaregiver = {
    exists: true,
    data: () => ({
      id: 'family-123',
      name: 'Test Family',
      guardians: [{ uid: 'guardian-123', role: 'primary_guardian' }],
      caregivers: [
        {
          uid: 'caregiver-456',
          email: 'grandma@example.com',
          displayName: 'Grandma',
          role: 'status_viewer',
          relationship: 'grandparent',
          childIds: ['child-1'],
          addedAt: new Date(),
          addedByUid: 'guardian-123',
        },
      ],
    }),
  }

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      await expect(
        setCaregiverPin({
          data: validInput,
          auth: null,
        } as Parameters<typeof setCaregiverPin>[0])
      ).rejects.toThrow('Authentication required')
    })

    it('should accept authenticated requests', async () => {
      mockGet.mockResolvedValue(mockFamilyWithCaregiver)
      mockDoc.mockImplementation(() => ({
        id: 'mock-doc-id',
        get: mockGet,
      }))

      const result = await setCaregiverPin({
        data: validInput,
        auth: { uid: 'guardian-123', email: 'parent@example.com' },
      } as Parameters<typeof setCaregiverPin>[0])

      expect(result.success).toBe(true)
    })
  })

  describe('Input Validation', () => {
    it('should reject PIN with fewer than 4 digits', async () => {
      await expect(
        setCaregiverPin({
          data: { ...validInput, pin: '123' },
          auth: { uid: 'guardian-123' },
        } as Parameters<typeof setCaregiverPin>[0])
      ).rejects.toThrow('Invalid input')
    })

    it('should reject PIN with more than 6 digits', async () => {
      await expect(
        setCaregiverPin({
          data: { ...validInput, pin: '1234567' },
          auth: { uid: 'guardian-123' },
        } as Parameters<typeof setCaregiverPin>[0])
      ).rejects.toThrow('Invalid input')
    })

    it('should reject PIN with non-digit characters', async () => {
      await expect(
        setCaregiverPin({
          data: { ...validInput, pin: '12ab' },
          auth: { uid: 'guardian-123' },
        } as Parameters<typeof setCaregiverPin>[0])
      ).rejects.toThrow('Invalid input')
    })

    it('should accept valid 4-digit PIN', async () => {
      mockGet.mockResolvedValue(mockFamilyWithCaregiver)
      mockDoc.mockImplementation(() => ({
        id: 'mock-doc-id',
        get: mockGet,
      }))

      const result = await setCaregiverPin({
        data: { ...validInput, pin: '1234' },
        auth: { uid: 'guardian-123' },
      } as Parameters<typeof setCaregiverPin>[0])

      expect(result.success).toBe(true)
    })

    it('should accept valid 6-digit PIN', async () => {
      mockGet.mockResolvedValue(mockFamilyWithCaregiver)
      mockDoc.mockImplementation(() => ({
        id: 'mock-doc-id',
        get: mockGet,
      }))

      const result = await setCaregiverPin({
        data: { ...validInput, pin: '123456' },
        auth: { uid: 'guardian-123' },
      } as Parameters<typeof setCaregiverPin>[0])

      expect(result.success).toBe(true)
    })

    it('should reject missing familyId', async () => {
      await expect(
        setCaregiverPin({
          data: { caregiverUid: 'caregiver-456', pin: '1234' },
          auth: { uid: 'guardian-123' },
        } as Parameters<typeof setCaregiverPin>[0])
      ).rejects.toThrow('Invalid input')
    })

    it('should reject missing caregiverUid', async () => {
      await expect(
        setCaregiverPin({
          data: { familyId: 'family-123', pin: '1234' },
          auth: { uid: 'guardian-123' },
        } as Parameters<typeof setCaregiverPin>[0])
      ).rejects.toThrow('Invalid input')
    })
  })

  describe('Permission Validation', () => {
    it('should reject non-guardian users', async () => {
      mockGet.mockResolvedValue(mockFamilyWithCaregiver)
      mockDoc.mockImplementation(() => ({
        id: 'mock-doc-id',
        get: mockGet,
      }))

      await expect(
        setCaregiverPin({
          data: validInput,
          auth: { uid: 'random-user-123' },
        } as Parameters<typeof setCaregiverPin>[0])
      ).rejects.toThrow('Only guardians can set caregiver PINs')
    })

    it('should reject if family not found', async () => {
      mockGet.mockResolvedValue({ exists: false })
      mockDoc.mockImplementation(() => ({
        id: 'mock-doc-id',
        get: mockGet,
      }))

      await expect(
        setCaregiverPin({
          data: validInput,
          auth: { uid: 'guardian-123' },
        } as Parameters<typeof setCaregiverPin>[0])
      ).rejects.toThrow('Family not found')
    })

    it('should reject if caregiver not found in family', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          ...mockFamilyWithCaregiver.data(),
          caregivers: [{ uid: 'other-caregiver', email: 'other@example.com' }],
        }),
      })
      mockDoc.mockImplementation(() => ({
        id: 'mock-doc-id',
        get: mockGet,
      }))

      await expect(
        setCaregiverPin({
          data: validInput,
          auth: { uid: 'guardian-123' },
        } as Parameters<typeof setCaregiverPin>[0])
      ).rejects.toThrow('Caregiver not found in this family')
    })
  })

  describe('PIN Hashing', () => {
    it('should hash PIN with bcrypt before storing', async () => {
      mockGet.mockResolvedValue(mockFamilyWithCaregiver)
      mockDoc.mockImplementation(() => ({
        id: 'mock-doc-id',
        get: mockGet,
      }))

      await setCaregiverPin({
        data: validInput,
        auth: { uid: 'guardian-123' },
      } as Parameters<typeof setCaregiverPin>[0])

      // Check that batch.update was called with hashed PIN
      expect(mockBatchUpdate).toHaveBeenCalled()
      const updateCall = mockBatchUpdate.mock.calls[0]
      const caregivers = updateCall[1].caregivers
      const updatedCaregiver = caregivers[0]

      // Verify PIN is hashed (bcrypt hashes start with $2)
      expect(updatedCaregiver.pinConfig.pinHash).toMatch(/^\$2[aby]?\$/)

      // Verify the hash can validate the original PIN
      const isValid = await bcrypt.compare('1234', updatedCaregiver.pinConfig.pinHash)
      expect(isValid).toBe(true)
    })

    it('should not store plain text PIN', async () => {
      mockGet.mockResolvedValue(mockFamilyWithCaregiver)
      mockDoc.mockImplementation(() => ({
        id: 'mock-doc-id',
        get: mockGet,
      }))

      await setCaregiverPin({
        data: validInput,
        auth: { uid: 'guardian-123' },
      } as Parameters<typeof setCaregiverPin>[0])

      const updateCall = mockBatchUpdate.mock.calls[0]
      const caregivers = updateCall[1].caregivers
      const updatedCaregiver = caregivers[0]

      // Verify plain PIN is not stored
      expect(updatedCaregiver.pinConfig.pinHash).not.toBe('1234')
      expect(JSON.stringify(updatedCaregiver)).not.toContain('"1234"')
    })
  })

  describe('Extension Limits', () => {
    it('should use default extension limits when not provided', async () => {
      mockGet.mockResolvedValue(mockFamilyWithCaregiver)
      mockDoc.mockImplementation(() => ({
        id: 'mock-doc-id',
        get: mockGet,
      }))

      const result = await setCaregiverPin({
        data: validInput,
        auth: { uid: 'guardian-123' },
      } as Parameters<typeof setCaregiverPin>[0])

      expect(result.extensionLimits).toEqual({
        maxDurationMinutes: 30,
        maxDailyExtensions: 1,
      })
    })

    it('should use custom extension limits when provided', async () => {
      mockGet.mockResolvedValue(mockFamilyWithCaregiver)
      mockDoc.mockImplementation(() => ({
        id: 'mock-doc-id',
        get: mockGet,
      }))

      const result = await setCaregiverPin({
        data: {
          ...validInput,
          extensionLimits: {
            maxDurationMinutes: 60,
            maxDailyExtensions: 3,
          },
        },
        auth: { uid: 'guardian-123' },
      } as Parameters<typeof setCaregiverPin>[0])

      expect(result.extensionLimits).toEqual({
        maxDurationMinutes: 60,
        maxDailyExtensions: 3,
      })
    })

    it('should store extension limits in caregiver document', async () => {
      mockGet.mockResolvedValue(mockFamilyWithCaregiver)
      mockDoc.mockImplementation(() => ({
        id: 'mock-doc-id',
        get: mockGet,
      }))

      await setCaregiverPin({
        data: {
          ...validInput,
          extensionLimits: {
            maxDurationMinutes: 120,
            maxDailyExtensions: 2,
          },
        },
        auth: { uid: 'guardian-123' },
      } as Parameters<typeof setCaregiverPin>[0])

      const updateCall = mockBatchUpdate.mock.calls[0]
      const caregivers = updateCall[1].caregivers
      const updatedCaregiver = caregivers[0]

      expect(updatedCaregiver.extensionLimits).toEqual({
        maxDurationMinutes: 120,
        maxDailyExtensions: 2,
      })
    })
  })

  describe('Permission Auto-Enable', () => {
    it('should enable canExtendTime permission when PIN is set', async () => {
      mockGet.mockResolvedValue(mockFamilyWithCaregiver)
      mockDoc.mockImplementation(() => ({
        id: 'mock-doc-id',
        get: mockGet,
      }))

      await setCaregiverPin({
        data: validInput,
        auth: { uid: 'guardian-123' },
      } as Parameters<typeof setCaregiverPin>[0])

      const updateCall = mockBatchUpdate.mock.calls[0]
      const caregivers = updateCall[1].caregivers
      const updatedCaregiver = caregivers[0]

      expect(updatedCaregiver.permissions.canExtendTime).toBe(true)
    })

    it('should preserve other permissions when enabling canExtendTime', async () => {
      const familyWithPermissions = {
        exists: true,
        data: () => ({
          ...mockFamilyWithCaregiver.data(),
          caregivers: [
            {
              ...mockFamilyWithCaregiver.data().caregivers[0],
              permissions: {
                canExtendTime: false,
                canViewFlags: true,
              },
            },
          ],
        }),
      }
      mockGet.mockResolvedValue(familyWithPermissions)
      mockDoc.mockImplementation(() => ({
        id: 'mock-doc-id',
        get: mockGet,
      }))

      await setCaregiverPin({
        data: validInput,
        auth: { uid: 'guardian-123' },
      } as Parameters<typeof setCaregiverPin>[0])

      const updateCall = mockBatchUpdate.mock.calls[0]
      const caregivers = updateCall[1].caregivers
      const updatedCaregiver = caregivers[0]

      expect(updatedCaregiver.permissions.canExtendTime).toBe(true)
      expect(updatedCaregiver.permissions.canViewFlags).toBe(true)
    })
  })

  describe('Audit Logging', () => {
    it('should create audit log entry for new PIN', async () => {
      mockGet.mockResolvedValue(mockFamilyWithCaregiver)
      mockDoc.mockImplementation(() => ({
        id: 'mock-doc-id',
        get: mockGet,
      }))

      await setCaregiverPin({
        data: validInput,
        auth: { uid: 'guardian-123' },
      } as Parameters<typeof setCaregiverPin>[0])

      expect(mockBatchSet).toHaveBeenCalled()
      const setCall = mockBatchSet.mock.calls[0]
      const auditLog = setCall[1]

      expect(auditLog.action).toBe('caregiver_pin_set')
      expect(auditLog.familyId).toBe('family-123')
      expect(auditLog.caregiverUid).toBe('caregiver-456')
      expect(auditLog.changedByUid).toBe('guardian-123')
      expect(auditLog.changes.pinSet).toBe(true)
    })

    it('should create audit log entry for PIN change', async () => {
      const familyWithExistingPin = {
        exists: true,
        data: () => ({
          ...mockFamilyWithCaregiver.data(),
          caregivers: [
            {
              ...mockFamilyWithCaregiver.data().caregivers[0],
              pinConfig: {
                pinHash: '$2b$10$existinghash',
                pinSetAt: new Date(),
                pinSetByUid: 'guardian-123',
                failedAttempts: 0,
              },
            },
          ],
        }),
      }
      mockGet.mockResolvedValue(familyWithExistingPin)
      mockDoc.mockImplementation(() => ({
        id: 'mock-doc-id',
        get: mockGet,
      }))

      await setCaregiverPin({
        data: validInput,
        auth: { uid: 'guardian-123' },
      } as Parameters<typeof setCaregiverPin>[0])

      const setCall = mockBatchSet.mock.calls[0]
      const auditLog = setCall[1]

      expect(auditLog.action).toBe('caregiver_pin_changed')
    })

    it('should log extension limits in audit', async () => {
      mockGet.mockResolvedValue(mockFamilyWithCaregiver)
      mockDoc.mockImplementation(() => ({
        id: 'mock-doc-id',
        get: mockGet,
      }))

      await setCaregiverPin({
        data: {
          ...validInput,
          extensionLimits: {
            maxDurationMinutes: 60,
            maxDailyExtensions: 2,
          },
        },
        auth: { uid: 'guardian-123' },
      } as Parameters<typeof setCaregiverPin>[0])

      const setCall = mockBatchSet.mock.calls[0]
      const auditLog = setCall[1]

      expect(auditLog.changes.extensionLimits).toEqual({
        maxDurationMinutes: 60,
        maxDailyExtensions: 2,
      })
    })
  })

  describe('PIN Config Structure', () => {
    it('should store complete pinConfig structure', async () => {
      mockGet.mockResolvedValue(mockFamilyWithCaregiver)
      mockDoc.mockImplementation(() => ({
        id: 'mock-doc-id',
        get: mockGet,
      }))

      await setCaregiverPin({
        data: validInput,
        auth: { uid: 'guardian-123' },
      } as Parameters<typeof setCaregiverPin>[0])

      const updateCall = mockBatchUpdate.mock.calls[0]
      const caregivers = updateCall[1].caregivers
      const pinConfig = caregivers[0].pinConfig

      expect(pinConfig).toHaveProperty('pinHash')
      expect(pinConfig).toHaveProperty('pinSetAt')
      expect(pinConfig).toHaveProperty('pinSetByUid')
      expect(pinConfig).toHaveProperty('failedAttempts')
      expect(pinConfig.pinSetByUid).toBe('guardian-123')
      expect(pinConfig.failedAttempts).toBe(0)
      expect(pinConfig.lockedUntil).toBeNull()
    })

    it('should reset failed attempts when PIN is changed', async () => {
      const familyWithFailedAttempts = {
        exists: true,
        data: () => ({
          ...mockFamilyWithCaregiver.data(),
          caregivers: [
            {
              ...mockFamilyWithCaregiver.data().caregivers[0],
              pinConfig: {
                pinHash: '$2b$10$existinghash',
                pinSetAt: new Date(),
                pinSetByUid: 'guardian-123',
                failedAttempts: 2,
                lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
              },
            },
          ],
        }),
      }
      mockGet.mockResolvedValue(familyWithFailedAttempts)
      mockDoc.mockImplementation(() => ({
        id: 'mock-doc-id',
        get: mockGet,
      }))

      await setCaregiverPin({
        data: validInput,
        auth: { uid: 'guardian-123' },
      } as Parameters<typeof setCaregiverPin>[0])

      const updateCall = mockBatchUpdate.mock.calls[0]
      const caregivers = updateCall[1].caregivers
      const pinConfig = caregivers[0].pinConfig

      expect(pinConfig.failedAttempts).toBe(0)
      expect(pinConfig.lockedUntil).toBeNull()
    })
  })

  describe('Response', () => {
    it('should return success with correct structure', async () => {
      mockGet.mockResolvedValue(mockFamilyWithCaregiver)
      mockDoc.mockImplementation(() => ({
        id: 'mock-doc-id',
        get: mockGet,
      }))

      const result = await setCaregiverPin({
        data: validInput,
        auth: { uid: 'guardian-123' },
      } as Parameters<typeof setCaregiverPin>[0])

      expect(result).toEqual({
        success: true,
        caregiverUid: 'caregiver-456',
        pinSet: true,
        extensionLimits: {
          maxDurationMinutes: 30,
          maxDailyExtensions: 1,
        },
      })
    })
  })
})
