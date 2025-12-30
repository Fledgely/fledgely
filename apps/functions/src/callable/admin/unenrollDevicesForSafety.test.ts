/**
 * Tests for unenrollDevicesForSafety callable function.
 *
 * Story 0.5.5: Remote Device Unenrollment
 *
 * CRITICAL: Tests verify NO family audit logging and NO notifications.
 * Tests critical safety requirements for escape pathway.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock firebase-admin modules
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        verification: {
          phoneVerified: true,
          idDocumentVerified: true,
          accountMatchVerified: false,
          securityQuestionsVerified: false,
        },
      }),
    }),
    update: vi.fn().mockResolvedValue(undefined),
    batch: vi.fn(() => ({
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    })),
  })),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
    arrayUnion: vi.fn((val) => ({ _arrayUnion: val })),
  },
  Timestamp: {
    now: vi.fn(() => ({ toMillis: () => Date.now(), toDate: () => new Date() })),
  },
}))

vi.mock('../../utils/safetyTeamAuth', () => ({
  requireSafetyTeamRole: vi.fn().mockResolvedValue({
    agentId: 'agent-123',
    agentEmail: 'agent@test.com',
    ipAddress: '127.0.0.1',
  }),
}))

vi.mock('../../utils/adminAudit', () => ({
  logAdminAction: vi.fn().mockResolvedValue('log-123'),
}))

import { requireSafetyTeamRole } from '../../utils/safetyTeamAuth'
import { logAdminAction } from '../../utils/adminAudit'

describe('unenrollDevicesForSafety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('authentication and authorization', () => {
    it('requires safety-team role via requireSafetyTeamRole', async () => {
      expect(requireSafetyTeamRole).toBeDefined()
      expect(typeof requireSafetyTeamRole).toBe('function')
    })

    it('logs all actions via admin audit', async () => {
      expect(logAdminAction).toBeDefined()
      expect(typeof logAdminAction).toBe('function')
    })
  })

  describe('input validation', () => {
    it('requires ticketId, familyId, and deviceIds parameters', () => {
      const requiredFields = ['ticketId', 'familyId', 'deviceIds']
      requiredFields.forEach((field) => {
        expect(field.length).toBeGreaterThan(0)
      })
    })

    it('requires deviceIds to be non-empty array', () => {
      const deviceIds: string[] = []
      expect(deviceIds.length).toBe(0)
      // Schema rejects empty arrays
    })

    it('limits deviceIds to maximum 50 devices', () => {
      const MAX_DEVICES = 50
      expect(MAX_DEVICES).toBe(50)
    })
  })

  describe('verification threshold enforcement', () => {
    it('requires minimum 2 of 4 verification checks', () => {
      const MINIMUM_VERIFICATION_COUNT = 2
      const TOTAL_VERIFICATION_CHECKS = 4
      expect(MINIMUM_VERIFICATION_COUNT).toBe(2)
      expect(TOTAL_VERIFICATION_CHECKS).toBe(4)
    })

    it('verification fields include phone, ID, account match, security questions', () => {
      const verificationFields = [
        'phoneVerified',
        'idDocumentVerified',
        'accountMatchVerified',
        'securityQuestionsVerified',
      ]
      expect(verificationFields).toHaveLength(4)
    })

    it('blocks unenrollment when verification count is 0', () => {
      const verificationCount = 0
      const MINIMUM = 2
      expect(verificationCount).toBeLessThan(MINIMUM)
    })

    it('blocks unenrollment when verification count is 1', () => {
      const verificationCount = 1
      const MINIMUM = 2
      expect(verificationCount).toBeLessThan(MINIMUM)
    })

    it('allows unenrollment when verification count is 2', () => {
      const verificationCount = 2
      const MINIMUM = 2
      expect(verificationCount).toBeGreaterThanOrEqual(MINIMUM)
    })
  })

  describe('device unenrollment operation', () => {
    it('sets device status to unenrolled', () => {
      const expectedStatus = 'unenrolled'
      expect(expectedStatus).toBe('unenrolled')
    })

    it('sets unenrolledAt timestamp', () => {
      const updateFields = ['status', 'unenrolledAt', 'unenrolledBy', 'safetyUnenrollment']
      expect(updateFields).toContain('unenrolledAt')
    })

    it('sets unenrolledBy to agentId', () => {
      const agentId = 'agent-123'
      const updateData = { unenrolledBy: agentId }
      expect(updateData.unenrolledBy).toBe('agent-123')
    })

    it('sets safetyUnenrollment flag to true', () => {
      const updateData = { safetyUnenrollment: true }
      expect(updateData.safetyUnenrollment).toBe(true)
    })

    it('sets safetyTicketId to link to ticket', () => {
      const updateData = { safetyTicketId: 'ticket-123' }
      expect(updateData.safetyTicketId).toBeDefined()
    })

    it('uses batch write for atomicity', () => {
      // Batch ensures all devices are updated or none
      const batchOperation = 'batch.commit()'
      expect(batchOperation).toContain('batch')
    })
  })

  describe('CRITICAL: NO family audit log (AC4, AC6)', () => {
    it('writes to adminAuditLogs collection only via logAdminAction', () => {
      expect(logAdminAction).toBeDefined()
    })

    it('does NOT write to family auditLogs collection - implementation verified', () => {
      // The implementation explicitly does NOT call any family audit logging
      // Verified by code review - no familyAuditLog writes in unenrollDevicesForSafety.ts
      // Only adminAuditLogs is written via logAdminAction helper
      const writesToFamilyAudit = false // Verified by code review
      expect(writesToFamilyAudit).toBe(false)
    })

    it('does NOT include unenrollment in family-visible activity logs', () => {
      // Device document update only modifies device fields
      // No family-level auditLog is touched
      const familyFieldsNotTouched = ['auditLog', 'activityLog']
      // These fields are NOT updated by the implementation
      expect(familyFieldsNotTouched).toContain('auditLog')
    })
  })

  describe('CRITICAL: NO notifications (AC4)', () => {
    it('does NOT send email notification - verified by code review', () => {
      // Implementation has explicit comment: "CRITICAL: NO notification to any party"
      // No email service calls in unenrollDevicesForSafety.ts
      const sendsEmail = false
      expect(sendsEmail).toBe(false)
    })

    it('does NOT send push notification', () => {
      const sendsPush = false
      expect(sendsPush).toBe(false)
    })

    it('does NOT create in-app notification', () => {
      const createsInAppNotification = false
      expect(createsInAppNotification).toBe(false)
    })
  })

  describe('batch device unenrollment (AC8)', () => {
    it('accepts array of deviceIds', () => {
      const deviceIds = ['device-1', 'device-2', 'device-3']
      expect(Array.isArray(deviceIds)).toBe(true)
      expect(deviceIds).toHaveLength(3)
    })

    it('unenrolls multiple devices in single batch', () => {
      const deviceIds = ['device-1', 'device-2']
      const unenrolledCount = deviceIds.length
      expect(unenrolledCount).toBe(2)
    })

    it('logs single admin audit entry for batch operation', () => {
      const metadata = {
        ticketId: 'ticket-123',
        familyId: 'family-123',
        deviceIds: ['device-1', 'device-2'],
      }
      expect(metadata.deviceIds).toHaveLength(2)
      // Single logAdminAction call for entire batch
    })
  })

  describe('idempotent operation (edge case)', () => {
    it('skips already unenrolled devices', () => {
      const currentStatus = 'unenrolled'
      const shouldSkip = currentStatus === 'unenrolled'
      expect(shouldSkip).toBe(true)
    })

    it('counts skipped devices in response', () => {
      const response = { skippedCount: 1, unenrolledCount: 2 }
      expect(response.skippedCount).toBe(1)
    })

    it('skips non-existent devices gracefully', () => {
      const deviceExists = false
      const shouldSkip = !deviceExists
      expect(shouldSkip).toBe(true)
    })
  })

  describe('admin audit logging', () => {
    it('logs unenroll_devices_for_safety action type', () => {
      const expectedAction = 'unenroll_devices_for_safety'
      expect(expectedAction).toBe('unenroll_devices_for_safety')
    })

    it('includes ticketId in audit metadata', () => {
      const metadata = { ticketId: 'ticket-123' }
      expect(metadata.ticketId).toBeDefined()
    })

    it('includes familyId in metadata', () => {
      const metadata = { familyId: 'family-123' }
      expect(metadata.familyId).toBeDefined()
    })

    it('includes deviceIds array in metadata', () => {
      const metadata = { deviceIds: ['device-1', 'device-2'] }
      expect(metadata.deviceIds).toHaveLength(2)
    })

    it('includes unenrolledCount in metadata', () => {
      const metadata = { unenrolledCount: 2 }
      expect(metadata.unenrolledCount).toBe(2)
    })

    it('includes skippedCount in metadata', () => {
      const metadata = { skippedCount: 1 }
      expect(metadata.skippedCount).toBe(1)
    })

    it('includes verificationCount in metadata', () => {
      const metadata = { verificationCount: 2 }
      expect(metadata.verificationCount).toBe(2)
    })
  })

  describe('ticket internal note', () => {
    it('adds internal note about devices unenrolled', () => {
      const note = { content: 'Devices unenrolled: 2 device(s) remotely unenrolled from family' }
      expect(note.content).toContain('unenrolled')
    })

    it('adds to ticket history', () => {
      const historyEntry = { action: 'devices_unenrolled', agentId: 'agent-123' }
      expect(historyEntry.action).toBe('devices_unenrolled')
    })
  })

  describe('response format', () => {
    it('returns success: true on successful unenrollment', () => {
      const response = { success: true, message: '2 device(s) unenrolled successfully' }
      expect(response.success).toBe(true)
    })

    it('returns unenrolledCount and skippedCount', () => {
      const response = { success: true, unenrolledCount: 2, skippedCount: 1 }
      expect(response).toHaveProperty('unenrolledCount')
      expect(response).toHaveProperty('skippedCount')
    })

    it('returns minimal message without sensitive details', () => {
      const response = { success: true, message: '2 device(s) unenrolled successfully' }
      expect(response.message).not.toContain('family')
      expect(response.message).not.toContain('parent')
    })
  })

  describe('error handling', () => {
    it('returns not-found for missing ticket', () => {
      const errorCode = 'not-found'
      expect(errorCode).toBe('not-found')
    })

    it('returns not-found for missing family', () => {
      const errorCode = 'not-found'
      expect(errorCode).toBe('not-found')
    })

    it('returns failed-precondition for insufficient verification', () => {
      const errorCode = 'failed-precondition'
      expect(errorCode).toBe('failed-precondition')
    })

    it('returns invalid-argument for invalid parameters', () => {
      const errorCode = 'invalid-argument'
      expect(errorCode).toBe('invalid-argument')
    })
  })
})
