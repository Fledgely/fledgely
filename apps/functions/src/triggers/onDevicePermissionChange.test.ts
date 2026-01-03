/**
 * Tests for Device Permission Change Trigger
 *
 * Story 41.4: Device Sync Status Notifications - AC5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hasPermissionsReduced, hasPermissionsRestored } from './onDevicePermissionChange'

// Mock notification service
vi.mock('../lib/notifications/deviceSyncNotification', () => ({
  sendPermissionRevokedNotification: vi.fn().mockResolvedValue({
    notificationGenerated: true,
    parentsNotified: ['parent-1'],
    parentsSkipped: [],
    delayedForQuietHours: false,
    deviceId: 'device-123',
  }),
  sendSyncRestoredNotification: vi.fn().mockResolvedValue({
    notificationGenerated: true,
    parentsNotified: ['parent-1'],
    parentsSkipped: [],
    delayedForQuietHours: false,
    deviceId: 'device-123',
  }),
}))

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}))

describe('onDevicePermissionChange', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('hasPermissionsReduced', () => {
    it('returns false when both are undefined', () => {
      expect(hasPermissionsReduced(undefined, undefined)).toBe(false)
    })

    it('returns false when before is undefined', () => {
      expect(hasPermissionsReduced(undefined, { permissionsGranted: false })).toBe(false)
    })

    it('returns false when after is undefined', () => {
      expect(hasPermissionsReduced({ permissionsGranted: true }, undefined)).toBe(false)
    })

    it('returns true when permissionsGranted goes from true to false', () => {
      const before = { permissionsGranted: true }
      const after = { permissionsGranted: false }
      expect(hasPermissionsReduced(before, after)).toBe(true)
    })

    it('returns false when permissionsGranted stays true', () => {
      const before = { permissionsGranted: true }
      const after = { permissionsGranted: true }
      expect(hasPermissionsReduced(before, after)).toBe(false)
    })

    it('returns false when permissionsGranted stays false', () => {
      const before = { permissionsGranted: false }
      const after = { permissionsGranted: false }
      expect(hasPermissionsReduced(before, after)).toBe(false)
    })

    it('returns true when tabs permission is revoked', () => {
      const before = {
        extensionPermissions: {
          tabs: true,
          history: true,
          webNavigation: true,
          contentScripts: true,
        },
      }
      const after = {
        extensionPermissions: {
          tabs: false,
          history: true,
          webNavigation: true,
          contentScripts: true,
        },
      }
      expect(hasPermissionsReduced(before, after)).toBe(true)
    })

    it('returns true when history permission is revoked', () => {
      const before = {
        extensionPermissions: {
          tabs: true,
          history: true,
          webNavigation: true,
          contentScripts: true,
        },
      }
      const after = {
        extensionPermissions: {
          tabs: true,
          history: false,
          webNavigation: true,
          contentScripts: true,
        },
      }
      expect(hasPermissionsReduced(before, after)).toBe(true)
    })

    it('returns true when webNavigation permission is revoked', () => {
      const before = {
        extensionPermissions: {
          tabs: true,
          history: true,
          webNavigation: true,
          contentScripts: true,
        },
      }
      const after = {
        extensionPermissions: {
          tabs: true,
          history: true,
          webNavigation: false,
          contentScripts: true,
        },
      }
      expect(hasPermissionsReduced(before, after)).toBe(true)
    })

    it('returns true when contentScripts permission is revoked', () => {
      const before = {
        extensionPermissions: {
          tabs: true,
          history: true,
          webNavigation: true,
          contentScripts: true,
        },
      }
      const after = {
        extensionPermissions: {
          tabs: true,
          history: true,
          webNavigation: true,
          contentScripts: false,
        },
      }
      expect(hasPermissionsReduced(before, after)).toBe(true)
    })

    it('returns false when storage permission is revoked (non-critical)', () => {
      const before = {
        extensionPermissions: {
          tabs: true,
          history: true,
          webNavigation: true,
          contentScripts: true,
          storage: true,
        },
      }
      const after = {
        extensionPermissions: {
          tabs: true,
          history: true,
          webNavigation: true,
          contentScripts: true,
          storage: false,
        },
      }
      expect(hasPermissionsReduced(before, after)).toBe(false)
    })

    it('returns false when all critical permissions stay true', () => {
      const before = {
        extensionPermissions: {
          tabs: true,
          history: true,
          webNavigation: true,
          contentScripts: true,
        },
      }
      const after = {
        extensionPermissions: {
          tabs: true,
          history: true,
          webNavigation: true,
          contentScripts: true,
        },
      }
      expect(hasPermissionsReduced(before, after)).toBe(false)
    })

    it('returns false when no extensionPermissions in either', () => {
      const before = { name: 'Device' }
      const after = { name: 'Device' }
      expect(hasPermissionsReduced(before, after)).toBe(false)
    })
  })

  describe('hasPermissionsRestored', () => {
    it('returns false when both are undefined', () => {
      expect(hasPermissionsRestored(undefined, undefined)).toBe(false)
    })

    it('returns false when before is undefined', () => {
      expect(hasPermissionsRestored(undefined, { permissionsGranted: true })).toBe(false)
    })

    it('returns false when after is undefined', () => {
      expect(hasPermissionsRestored({ permissionsGranted: false }, undefined)).toBe(false)
    })

    it('returns true when permissionsGranted goes from false to true', () => {
      const before = { permissionsGranted: false }
      const after = { permissionsGranted: true }
      expect(hasPermissionsRestored(before, after)).toBe(true)
    })

    it('returns false when permissionsGranted stays true', () => {
      const before = { permissionsGranted: true }
      const after = { permissionsGranted: true }
      expect(hasPermissionsRestored(before, after)).toBe(false)
    })

    it('returns false when permissionsGranted stays false', () => {
      const before = { permissionsGranted: false }
      const after = { permissionsGranted: false }
      expect(hasPermissionsRestored(before, after)).toBe(false)
    })

    it('returns false when permissionsGranted goes from true to false', () => {
      const before = { permissionsGranted: true }
      const after = { permissionsGranted: false }
      expect(hasPermissionsRestored(before, after)).toBe(false)
    })
  })
})
