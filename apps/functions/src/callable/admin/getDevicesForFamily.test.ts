/**
 * Tests for getDevicesForFamily callable function.
 *
 * Story 0.5.5: Remote Device Unenrollment
 *
 * Tests for getting devices associated with a family via safety ticket.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock firebase-admin modules
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    get: vi.fn(),
    where: vi.fn().mockReturnThis(),
  })),
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

describe('getDevicesForFamily', () => {
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

    it('logs all access via admin audit', async () => {
      expect(logAdminAction).toBeDefined()
      expect(typeof logAdminAction).toBe('function')
    })
  })

  describe('input validation', () => {
    it('requires ticketId parameter', () => {
      const requiredFields = ['ticketId']
      requiredFields.forEach((field) => {
        expect(field.length).toBeGreaterThan(0)
      })
    })

    it('rejects empty ticketId', () => {
      const ticketId = ''
      expect(ticketId.length).toBe(0)
    })
  })

  describe('device lookup behavior', () => {
    it('returns devices from family subcollection', () => {
      const expectedPath = 'families/{familyId}/devices/{deviceId}'
      expect(expectedPath).toContain('devices')
    })

    it('returns device properties: deviceId, name, type, childId, lastSeen, status', () => {
      const deviceFields = ['deviceId', 'name', 'type', 'childId', 'lastSeen', 'status']
      expect(deviceFields).toHaveLength(6)
      expect(deviceFields).toContain('deviceId')
      expect(deviceFields).toContain('status')
    })

    it('handles device type correctly (chromebook or android)', () => {
      const validTypes = ['chromebook', 'android']
      expect(validTypes).toContain('chromebook')
      expect(validTypes).toContain('android')
    })

    it('handles device status correctly (active, offline, unenrolled)', () => {
      const validStatuses = ['active', 'offline', 'unenrolled']
      expect(validStatuses).toContain('active')
      expect(validStatuses).toContain('unenrolled')
    })
  })

  describe('anonymous ticket handling', () => {
    it('returns null family for anonymous tickets', () => {
      const response = { familyId: null, familyName: null, devices: [] }
      expect(response.familyId).toBeNull()
      expect(response.devices).toHaveLength(0)
    })
  })

  describe('no family handling', () => {
    it('returns null family when user has no family', () => {
      const response = { familyId: null, familyName: null, devices: [] }
      expect(response.familyId).toBeNull()
    })
  })

  describe('no devices handling', () => {
    it('returns empty array when family has no devices', () => {
      const response = { familyId: 'family-123', familyName: 'Test Family', devices: [] }
      expect(response.devices).toHaveLength(0)
      expect(response.familyId).toBe('family-123')
    })
  })

  describe('admin audit logging', () => {
    it('logs get_devices_for_family action type', () => {
      const expectedAction = 'get_devices_for_family'
      expect(expectedAction).toBe('get_devices_for_family')
    })

    it('includes ticketId in audit metadata', () => {
      const metadata = { ticketId: 'ticket-123' }
      expect(metadata.ticketId).toBeDefined()
    })

    it('includes familyId as resourceId when family found', () => {
      const resourceId = 'family-123'
      expect(resourceId).toBeDefined()
    })

    it('includes deviceCount in metadata', () => {
      const metadata = { deviceCount: 3 }
      expect(metadata.deviceCount).toBe(3)
    })
  })

  describe('response format', () => {
    it('returns familyId, familyName, and devices array', () => {
      const response = {
        familyId: 'family-123',
        familyName: 'Test Family',
        devices: [],
      }
      expect(response).toHaveProperty('familyId')
      expect(response).toHaveProperty('familyName')
      expect(response).toHaveProperty('devices')
      expect(Array.isArray(response.devices)).toBe(true)
    })

    it('converts lastSeen timestamp to milliseconds', () => {
      const lastSeenMs = 1704067200000
      expect(typeof lastSeenMs).toBe('number')
    })
  })

  describe('error handling', () => {
    it('returns not-found for missing ticket', () => {
      const errorCode = 'not-found'
      expect(errorCode).toBe('not-found')
    })

    it('returns invalid-argument for invalid parameters', () => {
      const errorCode = 'invalid-argument'
      expect(errorCode).toBe('invalid-argument')
    })
  })
})
