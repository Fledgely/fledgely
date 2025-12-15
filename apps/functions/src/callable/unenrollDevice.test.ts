import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock firebase-admin/firestore
const mockGet = vi.fn()
const mockUpdate = vi.fn()
const mockAdd = vi.fn()
const mockSet = vi.fn()
const mockCommit = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockBatch = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
    batch: mockBatch,
  }),
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
  Timestamp: {
    now: () => ({
      toDate: () => new Date('2024-01-15T10:00:00Z'),
    }),
    fromDate: (date: Date) => ({
      toDate: () => date,
    }),
  },
}))

// Mock firebase-functions/v2/https - MUST come before importing the module
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

// Import after mocks
import {
  unenrollDevice,
  unenrollDevices,
  unenrollDeviceInputSchema,
  unenrollDevicesInputSchema,
  DeviceStatus,
} from './unenrollDevice'
import { HttpsError } from 'firebase-functions/v2/https'
import type { CallableRequest } from 'firebase-functions/v2/https'

type CallableFunction = (request: CallableRequest) => Promise<unknown>

describe('unenrollDevice', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock implementations
    mockCollection.mockImplementation((collectionName: string) => ({
      doc: mockDoc,
      add: mockAdd,
    }))

    mockDoc.mockImplementation(() => ({
      get: mockGet,
      update: mockUpdate,
    }))

    mockBatch.mockReturnValue({
      update: vi.fn(),
      set: vi.fn(),
      commit: mockCommit,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Input Validation', () => {
    it('should validate required fields', () => {
      const validInput = {
        requestId: 'request-123',
        deviceId: 'device-456',
        familyId: 'family-789',
        childId: 'child-012',
        reason: 'Safety request from verified victim requiring device unenrollment',
      }

      const result = unenrollDeviceInputSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should reject missing requestId', () => {
      const input = {
        deviceId: 'device-456',
        familyId: 'family-789',
        childId: 'child-012',
        reason: 'Safety request from verified victim',
      }

      const result = unenrollDeviceInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject missing deviceId', () => {
      const input = {
        requestId: 'request-123',
        familyId: 'family-789',
        childId: 'child-012',
        reason: 'Safety request from verified victim',
      }

      const result = unenrollDeviceInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject reason under 20 characters', () => {
      const input = {
        requestId: 'request-123',
        deviceId: 'device-456',
        familyId: 'family-789',
        childId: 'child-012',
        reason: 'Too short reason',
      }

      const result = unenrollDeviceInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should accept reason with exactly 20 characters', () => {
      const input = {
        requestId: 'request-123',
        deviceId: 'device-456',
        familyId: 'family-789',
        childId: 'child-012',
        reason: '12345678901234567890', // Exactly 20 chars
      }

      const result = unenrollDeviceInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const request = {
        data: {
          requestId: 'request-123',
          deviceId: 'device-456',
          familyId: 'family-789',
          childId: 'child-012',
          reason: 'Safety request from verified victim requiring device unenrollment',
        },
        auth: null,
      } as unknown as CallableRequest

      await expect(
        (unenrollDevice as CallableFunction)(request)
      ).rejects.toThrow('Authentication required')
    })

    it('should reject users without safety-team role', async () => {
      const request = {
        data: {
          requestId: 'request-123',
          deviceId: 'device-456',
          familyId: 'family-789',
          childId: 'child-012',
          reason: 'Safety request from verified victim requiring device unenrollment',
        },
        auth: {
          uid: 'user-123',
          token: { isSafetyTeam: false },
        },
      } as unknown as CallableRequest

      await expect(
        (unenrollDevice as CallableFunction)(request)
      ).rejects.toThrow('Safety team access required')
    })

    it('should reject admin users without safety-team role', async () => {
      const request = {
        data: {
          requestId: 'request-123',
          deviceId: 'device-456',
          familyId: 'family-789',
          childId: 'child-012',
          reason: 'Safety request from verified victim requiring device unenrollment',
        },
        auth: {
          uid: 'admin-user',
          token: { isSafetyTeam: false, isAdmin: true },
        },
      } as unknown as CallableRequest

      // CRITICAL: Admin role alone is NOT sufficient
      await expect(
        (unenrollDevice as CallableFunction)(request)
      ).rejects.toThrow('Safety team access required')
    })
  })

  describe('Safety Request Validation', () => {
    it('should reject non-existent safety request', async () => {
      mockGet.mockResolvedValueOnce({ exists: false })

      const request = {
        data: {
          requestId: 'nonexistent-request',
          deviceId: 'device-456',
          familyId: 'family-789',
          childId: 'child-012',
          reason: 'Safety request from verified victim requiring device unenrollment',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await expect(
        (unenrollDevice as CallableFunction)(request)
      ).rejects.toThrow('Safety request not found')
    })

    it('should reject pending safety request', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ status: 'pending' }),
      })

      const request = {
        data: {
          requestId: 'pending-request',
          deviceId: 'device-456',
          familyId: 'family-789',
          childId: 'child-012',
          reason: 'Safety request from verified victim requiring device unenrollment',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await expect(
        (unenrollDevice as CallableFunction)(request)
      ).rejects.toThrow('Safety request must be reviewed before unenrollment can proceed')
    })

    it('should reject safety request without verification', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          verificationChecklist: {
            accountOwnershipVerified: false,
            idMatched: false,
          },
        }),
      })

      const request = {
        data: {
          requestId: 'unverified-request',
          deviceId: 'device-456',
          familyId: 'family-789',
          childId: 'child-012',
          reason: 'Safety request from verified victim requiring device unenrollment',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await expect(
        (unenrollDevice as CallableFunction)(request)
      ).rejects.toThrow('Identity verification required before unenrollment')
    })
  })

  describe('Device Validation', () => {
    it('should reject non-existent device', async () => {
      // Safety request exists and verified
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })
      // Device does not exist
      mockGet.mockResolvedValueOnce({ exists: false })

      const request = {
        data: {
          requestId: 'request-123',
          deviceId: 'nonexistent-device',
          familyId: 'family-789',
          childId: 'child-012',
          reason: 'Safety request from verified victim requiring device unenrollment',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await expect(
        (unenrollDevice as CallableFunction)(request)
      ).rejects.toThrow('Device not found')
    })

    it('should reject device from wrong family', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'different-family',
          childId: 'child-012',
          status: 'active',
        }),
      })

      const request = {
        data: {
          requestId: 'request-123',
          deviceId: 'device-456',
          familyId: 'family-789',
          childId: 'child-012',
          reason: 'Safety request from verified victim requiring device unenrollment',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await expect(
        (unenrollDevice as CallableFunction)(request)
      ).rejects.toThrow('Device does not belong to specified family')
    })

    it('should reject device from wrong child', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'family-789',
          childId: 'different-child',
          status: 'active',
        }),
      })

      const request = {
        data: {
          requestId: 'request-123',
          deviceId: 'device-456',
          familyId: 'family-789',
          childId: 'child-012',
          reason: 'Safety request from verified victim requiring device unenrollment',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await expect(
        (unenrollDevice as CallableFunction)(request)
      ).rejects.toThrow('Device does not belong to specified child')
    })

    it('should reject already unenrolled device', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'family-789',
          childId: 'child-012',
          status: DeviceStatus.UNENROLLED,
        }),
      })

      const request = {
        data: {
          requestId: 'request-123',
          deviceId: 'device-456',
          familyId: 'family-789',
          childId: 'child-012',
          reason: 'Safety request from verified victim requiring device unenrollment',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await expect(
        (unenrollDevice as CallableFunction)(request)
      ).rejects.toThrow('Device has already been unenrolled')
    })
  })

  describe('Successful Unenrollment', () => {
    it('should successfully unenroll a device', async () => {
      // Safety request verified
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })
      // Device exists and active
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'family-789',
          childId: 'child-012',
          status: 'active',
          platform: 'chromebook',
        }),
      })
      mockUpdate.mockResolvedValueOnce({})
      mockAdd.mockResolvedValueOnce({ id: 'command-123' })
      mockAdd.mockResolvedValueOnce({ id: 'audit-123' })

      const request = {
        data: {
          requestId: 'request-123',
          deviceId: 'device-456',
          familyId: 'family-789',
          childId: 'child-012',
          reason: 'Safety request from verified victim requiring device unenrollment',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      const result = await (unenrollDevice as CallableFunction)(request)

      expect(result).toMatchObject({
        success: true,
        unenrolled: true,
        deviceId: 'device-456',
        familyId: 'family-789',
        childId: 'child-012',
      })

      // Verify device was updated
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: DeviceStatus.UNENROLLED,
          unenrolledBy: 'safety-user',
          unenrollmentSource: 'safety-request',
        })
      )

      // Verify command was created
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'device-456',
          command: 'unenroll',
          source: 'safety-request',
          safetyRequestId: 'request-123',
          sealed: true,
        })
      )
    })

    it('should create sealed audit entry', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          verificationChecklist: { idMatched: true },
        }),
      })
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'family-789',
          childId: 'child-012',
          status: 'active',
          platform: 'android',
        }),
      })
      mockUpdate.mockResolvedValueOnce({})
      mockAdd.mockResolvedValueOnce({ id: 'command-123' })
      mockAdd.mockResolvedValueOnce({ id: 'audit-123' })

      const request = {
        data: {
          requestId: 'request-123',
          deviceId: 'device-456',
          familyId: 'family-789',
          childId: 'child-012',
          reason: 'Safety request from verified victim requiring device unenrollment',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await (unenrollDevice as CallableFunction)(request)

      // Verify audit entry was created with sealed flag
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'device-unenrollment',
          resourceType: 'device',
          resourceId: 'device-456',
          performedBy: 'safety-user',
          affectedChildId: 'child-012',
          familyId: 'family-789',
          safetyRequestId: 'request-123',
          deviceType: 'android',
          sealed: true,
          integrityHash: expect.any(String),
        })
      )
    })

    it('should NOT include reason in response', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'family-789',
          childId: 'child-012',
          status: 'active',
          platform: 'chromebook',
        }),
      })
      mockUpdate.mockResolvedValueOnce({})
      mockAdd.mockResolvedValueOnce({ id: 'command-123' })
      mockAdd.mockResolvedValueOnce({ id: 'audit-123' })

      const request = {
        data: {
          requestId: 'request-123',
          deviceId: 'device-456',
          familyId: 'family-789',
          childId: 'child-012',
          reason: 'This sensitive reason should NOT be in response',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      const result = await (unenrollDevice as CallableFunction)(request) as Record<string, unknown>

      // Response should NOT contain reason
      expect(result).not.toHaveProperty('reason')
    })
  })

  describe('Device Command Creation', () => {
    it('should create command with 7-day expiration', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'family-789',
          childId: 'child-012',
          status: 'active',
          platform: 'chromebook',
        }),
      })
      mockUpdate.mockResolvedValueOnce({})
      mockAdd.mockResolvedValueOnce({ id: 'command-123' })
      mockAdd.mockResolvedValueOnce({ id: 'audit-123' })

      const request = {
        data: {
          requestId: 'request-123',
          deviceId: 'device-456',
          familyId: 'family-789',
          childId: 'child-012',
          reason: 'Safety request from verified victim requiring device unenrollment',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await (unenrollDevice as CallableFunction)(request)

      // Verify command has expiration
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'device-456',
          command: 'unenroll',
          expiresAt: expect.any(Object), // Timestamp
        })
      )
    })
  })
})

describe('unenrollDevices (Bulk)', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockCollection.mockImplementation((collectionName: string) => ({
      doc: mockDoc,
      add: mockAdd,
    }))

    mockDoc.mockImplementation(() => ({
      get: mockGet,
      update: mockUpdate,
    }))

    const batchInstance = {
      update: vi.fn(),
      set: vi.fn(),
      commit: mockCommit,
    }
    mockBatch.mockReturnValue(batchInstance)
  })

  describe('Input Validation', () => {
    it('should validate bulk input', () => {
      const validInput = {
        requestId: 'request-123',
        devices: [
          { deviceId: 'device-1', familyId: 'family-1', childId: 'child-1' },
          { deviceId: 'device-2', familyId: 'family-1', childId: 'child-2' },
        ],
        reason: 'Safety request requiring multi-device unenrollment',
      }

      const result = unenrollDevicesInputSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should reject empty devices array', () => {
      const input = {
        requestId: 'request-123',
        devices: [],
        reason: 'Safety request requiring multi-device unenrollment',
      }

      const result = unenrollDevicesInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject more than 50 devices', () => {
      const devices = Array(51)
        .fill(null)
        .map((_, i) => ({
          deviceId: `device-${i}`,
          familyId: 'family-1',
          childId: 'child-1',
        }))

      const input = {
        requestId: 'request-123',
        devices,
        reason: 'Safety request requiring multi-device unenrollment',
      }

      const result = unenrollDevicesInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('Authentication', () => {
    it('should reject unauthenticated bulk requests', async () => {
      const request = {
        data: {
          requestId: 'request-123',
          devices: [
            { deviceId: 'device-1', familyId: 'family-1', childId: 'child-1' },
          ],
          reason: 'Safety request requiring multi-device unenrollment',
        },
        auth: null,
      } as unknown as CallableRequest

      await expect(
        (unenrollDevices as CallableFunction)(request)
      ).rejects.toThrow('Authentication required')
    })

    it('should reject non-safety-team users for bulk', async () => {
      const request = {
        data: {
          requestId: 'request-123',
          devices: [
            { deviceId: 'device-1', familyId: 'family-1', childId: 'child-1' },
          ],
          reason: 'Safety request requiring multi-device unenrollment',
        },
        auth: {
          uid: 'user-123',
          token: { isSafetyTeam: false, isAdmin: true },
        },
      } as unknown as CallableRequest

      await expect(
        (unenrollDevices as CallableFunction)(request)
      ).rejects.toThrow('Safety team access required')
    })
  })

  describe('Bulk Unenrollment', () => {
    it('should handle partial success in bulk operations', async () => {
      // Safety request verified
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })

      // First device exists
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'family-1',
          childId: 'child-1',
          status: 'active',
          platform: 'chromebook',
        }),
      })

      // Second device does not exist
      mockGet.mockResolvedValueOnce({ exists: false })

      mockCommit.mockResolvedValueOnce({})
      mockAdd.mockResolvedValueOnce({ id: 'audit-123' })

      const request = {
        data: {
          requestId: 'request-123',
          devices: [
            { deviceId: 'device-1', familyId: 'family-1', childId: 'child-1' },
            { deviceId: 'device-2', familyId: 'family-1', childId: 'child-1' },
          ],
          reason: 'Safety request requiring multi-device unenrollment',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      const result = await (unenrollDevices as CallableFunction)(request) as Record<string, unknown>

      expect(result).toMatchObject({
        success: true,
        totalRequested: 2,
        totalUnenrolled: 1,
      })

      const results = result.results as Array<{ deviceId: string; success: boolean; error?: string }>
      expect(results).toHaveLength(2)
      expect(results[0]).toEqual({ deviceId: 'device-1', success: true })
      expect(results[1]).toEqual({ deviceId: 'device-2', success: false, error: 'Device not found' })
    })

    it('should create single sealed audit entry for bulk operation', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'in-progress',
          verificationChecklist: { accountOwnershipVerified: true },
        }),
      })
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'family-1',
          childId: 'child-1',
          status: 'active',
          platform: 'chromebook',
        }),
      })
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          familyId: 'family-1',
          childId: 'child-2',
          status: 'active',
          platform: 'android',
        }),
      })
      mockCommit.mockResolvedValueOnce({})
      mockAdd.mockResolvedValueOnce({ id: 'audit-123' })

      const request = {
        data: {
          requestId: 'request-123',
          devices: [
            { deviceId: 'device-1', familyId: 'family-1', childId: 'child-1' },
            { deviceId: 'device-2', familyId: 'family-1', childId: 'child-2' },
          ],
          reason: 'Safety request requiring multi-device unenrollment',
        },
        auth: {
          uid: 'safety-user',
          token: { isSafetyTeam: true },
        },
      } as unknown as CallableRequest

      await (unenrollDevices as CallableFunction)(request)

      // Verify single audit entry for bulk operation
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'device-unenrollment-bulk',
          deviceCount: 2,
          deviceIds: ['device-1', 'device-2'],
          sealed: true,
          integrityHash: expect.any(String),
        })
      )
    })
  })
})

describe('Critical Safety Invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockCollection.mockImplementation((collectionName: string) => ({
      doc: mockDoc,
      add: mockAdd,
    }))

    mockDoc.mockImplementation(() => ({
      get: mockGet,
      update: mockUpdate,
    }))

    mockBatch.mockReturnValue({
      update: vi.fn(),
      set: vi.fn(),
      commit: mockCommit,
    })
  })

  it('should NOT trigger any notifications', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        status: 'in-progress',
        verificationChecklist: { accountOwnershipVerified: true },
      }),
    })
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        familyId: 'family-789',
        childId: 'child-012',
        status: 'active',
        platform: 'chromebook',
      }),
    })
    mockUpdate.mockResolvedValueOnce({})
    mockAdd.mockResolvedValueOnce({ id: 'command-123' })
    mockAdd.mockResolvedValueOnce({ id: 'audit-123' })

    const request = {
      data: {
        requestId: 'request-123',
        deviceId: 'device-456',
        familyId: 'family-789',
        childId: 'child-012',
        reason: 'Safety request from verified victim requiring device unenrollment',
      },
      auth: {
        uid: 'safety-user',
        token: { isSafetyTeam: true },
      },
    } as unknown as CallableRequest

    await (unenrollDevice as CallableFunction)(request)

    // Verify no notification collections were written to
    const collectionCalls = mockCollection.mock.calls.map((call) => call[0])
    expect(collectionCalls).not.toContain('notifications')
    expect(collectionCalls).not.toContain('emails')
    expect(collectionCalls).not.toContain('pushNotifications')
  })

  it('should NOT create family audit trail entry', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        status: 'in-progress',
        verificationChecklist: { accountOwnershipVerified: true },
      }),
    })
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        familyId: 'family-789',
        childId: 'child-012',
        status: 'active',
        platform: 'chromebook',
      }),
    })
    mockUpdate.mockResolvedValueOnce({})
    mockAdd.mockResolvedValueOnce({ id: 'command-123' })
    mockAdd.mockResolvedValueOnce({ id: 'audit-123' })

    const request = {
      data: {
        requestId: 'request-123',
        deviceId: 'device-456',
        familyId: 'family-789',
        childId: 'child-012',
        reason: 'Safety request from verified victim requiring device unenrollment',
      },
      auth: {
        uid: 'safety-user',
        token: { isSafetyTeam: true },
      },
    } as unknown as CallableRequest

    await (unenrollDevice as CallableFunction)(request)

    // Verify family audit trail was NOT written to
    const collectionCalls = mockCollection.mock.calls.map((call) => call[0])
    expect(collectionCalls).not.toContain('familyAuditLog')
    expect(collectionCalls).not.toContain('auditLog')

    // Only adminAuditLog should be written
    expect(collectionCalls).toContain('adminAuditLog')
  })

  it('should seal the audit entry', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        status: 'in-progress',
        verificationChecklist: { accountOwnershipVerified: true },
      }),
    })
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        familyId: 'family-789',
        childId: 'child-012',
        status: 'active',
        platform: 'chromebook',
      }),
    })
    mockUpdate.mockResolvedValueOnce({})
    mockAdd.mockResolvedValueOnce({ id: 'command-123' })
    mockAdd.mockResolvedValueOnce({ id: 'audit-123' })

    const request = {
      data: {
        requestId: 'request-123',
        deviceId: 'device-456',
        familyId: 'family-789',
        childId: 'child-012',
        reason: 'Safety request from verified victim requiring device unenrollment',
      },
      auth: {
        uid: 'safety-user',
        token: { isSafetyTeam: true },
      },
    } as unknown as CallableRequest

    await (unenrollDevice as CallableFunction)(request)

    // Verify audit entry has sealed: true
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        sealed: true,
      })
    )
  })
})

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockCollection.mockImplementation((collectionName: string) => ({
      doc: mockDoc,
      add: mockAdd,
    }))

    mockDoc.mockImplementation(() => ({
      get: mockGet,
      update: mockUpdate,
    }))
  })

  it('should generate errorId and not log sensitive data', async () => {
    // Safety request verified
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        status: 'in-progress',
        verificationChecklist: { accountOwnershipVerified: true },
      }),
    })
    // Device lookup fails with unexpected error
    mockGet.mockRejectedValueOnce(new Error('Database connection failed'))
    mockAdd.mockResolvedValueOnce({ id: 'error-audit' })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const request = {
      data: {
        requestId: 'request-123',
        deviceId: 'device-456',
        familyId: 'family-789',
        childId: 'child-012',
        reason: 'Safety request from verified victim requiring device unenrollment',
      },
      auth: {
        uid: 'safety-user',
        token: { isSafetyTeam: true },
      },
    } as unknown as CallableRequest

    await expect(
      (unenrollDevice as CallableFunction)(request)
    ).rejects.toThrow(/Failed to unenroll device\. Error ID:/)

    // Verify error log does not contain sensitive data
    expect(consoleSpy).toHaveBeenCalledWith(
      'Device unenrollment failed',
      expect.objectContaining({
        errorId: expect.any(String),
        errorType: 'internal',
      })
    )

    // Verify sensitive data is NOT in log
    const loggedData = consoleSpy.mock.calls[0][1] as Record<string, unknown>
    expect(loggedData).not.toHaveProperty('requestId')
    expect(loggedData).not.toHaveProperty('deviceId')
    expect(loggedData).not.toHaveProperty('familyId')
    expect(loggedData).not.toHaveProperty('childId')
    expect(loggedData).not.toHaveProperty('reason')

    consoleSpy.mockRestore()
  })

  it('should log full error to sealed audit', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        status: 'in-progress',
        verificationChecklist: { accountOwnershipVerified: true },
      }),
    })
    mockGet.mockRejectedValueOnce(new Error('Database connection failed'))
    mockAdd.mockResolvedValueOnce({ id: 'error-audit' })

    vi.spyOn(console, 'error').mockImplementation(() => {})

    const request = {
      data: {
        requestId: 'request-123',
        deviceId: 'device-456',
        familyId: 'family-789',
        childId: 'child-012',
        reason: 'Safety request from verified victim requiring device unenrollment',
      },
      auth: {
        uid: 'safety-user',
        token: { isSafetyTeam: true },
      },
    } as unknown as CallableRequest

    await expect(
      (unenrollDevice as CallableFunction)(request)
    ).rejects.toThrow()

    // Verify error was logged to sealed audit
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'device_unenrollment_error',
        error: 'Database connection failed',
        sealed: true,
      })
    )
  })
})
