/**
 * Tests for caregiverAuditService.
 *
 * Story 39.2: Caregiver Permission Configuration
 *
 * Tests cover:
 * - AC5: Permission change audit logging
 * - NFR62: Caregiver access audit logging (within 5 minutes)
 * - Time extension logging
 * - Flag viewed logging
 * - Audit log retrieval
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore before importing
const mockSet = vi.fn().mockResolvedValue(undefined)
const mockGet = vi.fn()
const mockDoc = vi.fn(() => ({
  set: mockSet,
}))
const mockCollection = vi.fn(() => ({
  doc: mockDoc,
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(() => ({
    get: mockGet,
  })),
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}))

vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
}))

import {
  logPermissionChange,
  logTimeExtension,
  logFlagViewed,
  getAuditLogsForCaregiver,
  getAuditLogsForFamily,
  _resetDbForTesting,
  type LogPermissionChangeInput,
  type LogTimeExtensionInput,
  type LogFlagViewedInput,
} from './caregiverAuditService'

describe('caregiverAuditService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
  })

  describe('logPermissionChange', () => {
    const validInput: LogPermissionChangeInput = {
      familyId: 'family-123',
      caregiverUid: 'caregiver-456',
      changedByUid: 'guardian-789',
      oldPermissions: {
        canExtendTime: false,
        canViewFlags: false,
      },
      newPermissions: {
        canExtendTime: true,
        canViewFlags: false,
      },
    }

    it('creates audit log in caregiverAuditLogs collection', async () => {
      await logPermissionChange(validInput)

      expect(mockCollection).toHaveBeenCalledWith('caregiverAuditLogs')
    })

    it('returns audit log ID', async () => {
      const result = await logPermissionChange(validInput)

      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result).toMatch(/^cgaudit_/)
    })

    it('sets correct action type', async () => {
      await logPermissionChange(validInput)

      const setCall = mockSet.mock.calls[0][0]
      expect(setCall.action).toBe('permission_change')
    })

    it('includes familyId in log entry', async () => {
      await logPermissionChange(validInput)

      const setCall = mockSet.mock.calls[0][0]
      expect(setCall.familyId).toBe('family-123')
    })

    it('includes caregiverUid in log entry', async () => {
      await logPermissionChange(validInput)

      const setCall = mockSet.mock.calls[0][0]
      expect(setCall.caregiverUid).toBe('caregiver-456')
    })

    it('includes changedByUid in log entry', async () => {
      await logPermissionChange(validInput)

      const setCall = mockSet.mock.calls[0][0]
      expect(setCall.changedByUid).toBe('guardian-789')
    })

    it('includes old permissions in changes', async () => {
      await logPermissionChange(validInput)

      const setCall = mockSet.mock.calls[0][0]
      expect(setCall.changes.oldPermissions).toEqual({
        canExtendTime: false,
        canViewFlags: false,
      })
    })

    it('includes new permissions in changes', async () => {
      await logPermissionChange(validInput)

      const setCall = mockSet.mock.calls[0][0]
      expect(setCall.changes.newPermissions).toEqual({
        canExtendTime: true,
        canViewFlags: false,
      })
    })

    it('includes server timestamp in createdAt', async () => {
      await logPermissionChange(validInput)

      const setCall = mockSet.mock.calls[0][0]
      expect(setCall.createdAt).toBe('SERVER_TIMESTAMP')
    })

    it('throws error when Firestore write fails', async () => {
      mockSet.mockRejectedValueOnce(new Error('Write failed'))

      await expect(logPermissionChange(validInput)).rejects.toThrow('Write failed')
    })
  })

  describe('logTimeExtension', () => {
    const validInput: LogTimeExtensionInput = {
      familyId: 'family-123',
      caregiverUid: 'caregiver-456',
      childId: 'child-789',
      extensionMinutes: 30,
      reason: 'Homework completion',
    }

    it('creates audit log for time extension', async () => {
      await logTimeExtension(validInput)

      expect(mockCollection).toHaveBeenCalledWith('caregiverAuditLogs')
      expect(mockSet).toHaveBeenCalled()
    })

    it('sets correct action type', async () => {
      await logTimeExtension(validInput)

      const setCall = mockSet.mock.calls[0][0]
      expect(setCall.action).toBe('time_extension')
    })

    it('includes childId in changes', async () => {
      await logTimeExtension(validInput)

      const setCall = mockSet.mock.calls[0][0]
      expect(setCall.changes.childId).toBe('child-789')
    })

    it('includes extensionMinutes in changes', async () => {
      await logTimeExtension(validInput)

      const setCall = mockSet.mock.calls[0][0]
      expect(setCall.changes.extensionMinutes).toBe(30)
    })

    it('includes reason in changes when provided', async () => {
      await logTimeExtension(validInput)

      const setCall = mockSet.mock.calls[0][0]
      expect(setCall.changes.reason).toBe('Homework completion')
    })

    it('sets reason to null when not provided', async () => {
      const inputWithoutReason = { ...validInput }
      delete inputWithoutReason.reason

      await logTimeExtension(inputWithoutReason)

      const setCall = mockSet.mock.calls[0][0]
      expect(setCall.changes.reason).toBeNull()
    })

    it('caregiver is the changedBy for time extensions', async () => {
      await logTimeExtension(validInput)

      const setCall = mockSet.mock.calls[0][0]
      expect(setCall.changedByUid).toBe('caregiver-456')
    })
  })

  describe('logFlagViewed', () => {
    const validInput: LogFlagViewedInput = {
      familyId: 'family-123',
      caregiverUid: 'caregiver-456',
      childId: 'child-789',
      flagId: 'flag-abc',
    }

    it('creates audit log for flag view', async () => {
      await logFlagViewed(validInput)

      expect(mockCollection).toHaveBeenCalledWith('caregiverAuditLogs')
      expect(mockSet).toHaveBeenCalled()
    })

    it('sets correct action type', async () => {
      await logFlagViewed(validInput)

      const setCall = mockSet.mock.calls[0][0]
      expect(setCall.action).toBe('flag_viewed')
    })

    it('includes childId in changes', async () => {
      await logFlagViewed(validInput)

      const setCall = mockSet.mock.calls[0][0]
      expect(setCall.changes.childId).toBe('child-789')
    })

    it('includes flagId in changes', async () => {
      await logFlagViewed(validInput)

      const setCall = mockSet.mock.calls[0][0]
      expect(setCall.changes.flagId).toBe('flag-abc')
    })

    it('caregiver is the changedBy for flag views', async () => {
      await logFlagViewed(validInput)

      const setCall = mockSet.mock.calls[0][0]
      expect(setCall.changedByUid).toBe('caregiver-456')
    })
  })

  describe('getAuditLogsForCaregiver', () => {
    it('queries caregiverAuditLogs collection', async () => {
      mockGet.mockResolvedValue({ docs: [] })

      await getAuditLogsForCaregiver('family-123', 'caregiver-456')

      expect(mockCollection).toHaveBeenCalledWith('caregiverAuditLogs')
    })

    it('returns array of audit logs', async () => {
      const mockLogs = [
        {
          data: () => ({
            id: 'log-1',
            action: 'permission_change',
            familyId: 'family-123',
            caregiverUid: 'caregiver-456',
          }),
        },
        {
          data: () => ({
            id: 'log-2',
            action: 'time_extension',
            familyId: 'family-123',
            caregiverUid: 'caregiver-456',
          }),
        },
      ]
      mockGet.mockResolvedValue({ docs: mockLogs })

      const result = await getAuditLogsForCaregiver('family-123', 'caregiver-456')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('log-1')
      expect(result[1].id).toBe('log-2')
    })

    it('returns empty array when no logs found', async () => {
      mockGet.mockResolvedValue({ docs: [] })

      const result = await getAuditLogsForCaregiver('family-123', 'caregiver-456')

      expect(result).toEqual([])
    })
  })

  describe('getAuditLogsForFamily', () => {
    it('queries caregiverAuditLogs collection', async () => {
      mockGet.mockResolvedValue({ docs: [] })

      await getAuditLogsForFamily('family-123')

      expect(mockCollection).toHaveBeenCalledWith('caregiverAuditLogs')
    })

    it('returns array of all family audit logs', async () => {
      const mockLogs = [
        {
          data: () => ({
            id: 'log-1',
            familyId: 'family-123',
            caregiverUid: 'caregiver-1',
          }),
        },
        {
          data: () => ({
            id: 'log-2',
            familyId: 'family-123',
            caregiverUid: 'caregiver-2',
          }),
        },
      ]
      mockGet.mockResolvedValue({ docs: mockLogs })

      const result = await getAuditLogsForFamily('family-123')

      expect(result).toHaveLength(2)
    })
  })

  describe('Audit Log ID Generation', () => {
    it('generates unique IDs for multiple logs', async () => {
      const ids: string[] = []

      for (let i = 0; i < 5; i++) {
        const id = await logPermissionChange({
          familyId: 'family-123',
          caregiverUid: 'caregiver-456',
          changedByUid: 'guardian-789',
          oldPermissions: { canExtendTime: false, canViewFlags: false },
          newPermissions: { canExtendTime: true, canViewFlags: false },
        })
        ids.push(id)
      }

      // All IDs should be unique
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(5)
    })

    it('ID starts with cgaudit_ prefix', async () => {
      const id = await logPermissionChange({
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        changedByUid: 'guardian-789',
        oldPermissions: { canExtendTime: false, canViewFlags: false },
        newPermissions: { canExtendTime: true, canViewFlags: false },
      })

      expect(id).toMatch(/^cgaudit_/)
    })
  })
})
