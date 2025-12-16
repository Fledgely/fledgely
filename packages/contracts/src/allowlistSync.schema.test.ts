/**
 * Allowlist Sync Schema Tests
 *
 * Story 7.7: Allowlist Distribution & Sync - Task 1.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  // Schemas
  allowlistPlatformSchema,
  allowlistSyncStatusSchema,
  allowlistSyncAlertSchema,
  reportSyncStatusInputSchema,
  reportSyncStatusResponseSchema,
  getAllSyncStatusesResponseSchema,
  // Types
  type AllowlistPlatform,
  type AllowlistSyncStatus,
  type AllowlistSyncAlert,
  type ReportSyncStatusInput,
  // Constants
  ALLOWLIST_SYNC_CONSTANTS,
  ALLOWLIST_PLATFORM_LABELS,
  ALLOWLIST_PLATFORM_DESCRIPTIONS,
  // Helper functions
  getAllowlistPlatformLabel,
  getAllowlistPlatformDescription,
  isSyncStatusStale,
  calculateStaleDuration,
  formatStaleDuration,
  getTTLForVersion,
  shouldRefreshCache,
  createSyncStatus,
  safeParseSyncStatus,
  safeParseSyncAlert,
  validateReportSyncStatusInput,
  safeParseReportSyncStatusInput,
} from './allowlistSync.schema'

describe('allowlistPlatformSchema', () => {
  it('accepts valid platform values', () => {
    expect(allowlistPlatformSchema.parse('web')).toBe('web')
    expect(allowlistPlatformSchema.parse('chrome-extension')).toBe('chrome-extension')
    expect(allowlistPlatformSchema.parse('android')).toBe('android')
    expect(allowlistPlatformSchema.parse('ios')).toBe('ios')
  })

  it('rejects invalid platform values', () => {
    expect(() => allowlistPlatformSchema.parse('invalid')).toThrow()
    expect(() => allowlistPlatformSchema.parse('')).toThrow()
    expect(() => allowlistPlatformSchema.parse(null)).toThrow()
  })
})

describe('allowlistSyncStatusSchema', () => {
  const validSyncStatus: AllowlistSyncStatus = {
    platform: 'web',
    version: '1.0.0',
    lastSyncAt: '2025-12-16T00:00:00.000Z',
    isStale: false,
    cacheAge: 3600000,
    isEmergency: false,
  }

  it('accepts valid sync status', () => {
    const result = allowlistSyncStatusSchema.safeParse(validSyncStatus)
    expect(result.success).toBe(true)
    expect(result.data).toEqual(validSyncStatus)
  })

  it('accepts sync status with optional fields', () => {
    const withOptional = {
      ...validSyncStatus,
      deviceId: 'device-123',
      userAgent: 'Mozilla/5.0',
    }
    const result = allowlistSyncStatusSchema.safeParse(withOptional)
    expect(result.success).toBe(true)
    expect(result.data?.deviceId).toBe('device-123')
    expect(result.data?.userAgent).toBe('Mozilla/5.0')
  })

  it('accepts emergency version sync status', () => {
    const emergencyStatus = {
      ...validSyncStatus,
      version: '1.0.0-emergency-abc123',
      isEmergency: true,
    }
    const result = allowlistSyncStatusSchema.safeParse(emergencyStatus)
    expect(result.success).toBe(true)
    expect(result.data?.isEmergency).toBe(true)
  })

  it('rejects missing required fields', () => {
    const missingPlatform = { ...validSyncStatus }
    delete (missingPlatform as Record<string, unknown>).platform
    expect(allowlistSyncStatusSchema.safeParse(missingPlatform).success).toBe(false)

    const missingVersion = { ...validSyncStatus }
    delete (missingVersion as Record<string, unknown>).version
    expect(allowlistSyncStatusSchema.safeParse(missingVersion).success).toBe(false)
  })

  it('rejects empty version', () => {
    const emptyVersion = { ...validSyncStatus, version: '' }
    expect(allowlistSyncStatusSchema.safeParse(emptyVersion).success).toBe(false)
  })

  it('rejects invalid timestamp format', () => {
    const invalidTimestamp = { ...validSyncStatus, lastSyncAt: 'not-a-date' }
    expect(allowlistSyncStatusSchema.safeParse(invalidTimestamp).success).toBe(false)
  })

  it('rejects negative cache age', () => {
    const negativeCacheAge = { ...validSyncStatus, cacheAge: -1 }
    expect(allowlistSyncStatusSchema.safeParse(negativeCacheAge).success).toBe(false)
  })
})

describe('allowlistSyncAlertSchema', () => {
  const validAlert: AllowlistSyncAlert = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    platform: 'android',
    lastVersion: '1.0.0',
    lastSyncAt: '2025-12-14T00:00:00.000Z',
    staleDuration: 172800000, // 48 hours
    alertedAt: '2025-12-16T00:00:00.000Z',
    resolved: false,
  }

  it('accepts valid alert', () => {
    const result = allowlistSyncAlertSchema.safeParse(validAlert)
    expect(result.success).toBe(true)
    expect(result.data).toEqual(validAlert)
  })

  it('accepts resolved alert with resolution details', () => {
    const resolved = {
      ...validAlert,
      resolved: true,
      resolvedAt: '2025-12-16T01:00:00.000Z',
      resolvedBy: 'admin@example.com',
    }
    const result = allowlistSyncAlertSchema.safeParse(resolved)
    expect(result.success).toBe(true)
    expect(result.data?.resolved).toBe(true)
    expect(result.data?.resolvedBy).toBe('admin@example.com')
  })

  it('rejects invalid UUID', () => {
    const invalidId = { ...validAlert, id: 'not-a-uuid' }
    expect(allowlistSyncAlertSchema.safeParse(invalidId).success).toBe(false)
  })

  it('rejects invalid platform', () => {
    const invalidPlatform = { ...validAlert, platform: 'windows' }
    expect(allowlistSyncAlertSchema.safeParse(invalidPlatform).success).toBe(false)
  })
})

describe('reportSyncStatusInputSchema', () => {
  const validInput: ReportSyncStatusInput = {
    platform: 'web',
    version: '1.0.0',
    cacheAge: 3600000,
    isEmergency: false,
  }

  it('accepts valid input', () => {
    const result = reportSyncStatusInputSchema.safeParse(validInput)
    expect(result.success).toBe(true)
    expect(result.data).toEqual(validInput)
  })

  it('accepts input with optional fields', () => {
    const withOptional = {
      ...validInput,
      deviceId: 'device-123',
      userAgent: 'FledgelyApp/1.0',
    }
    const result = reportSyncStatusInputSchema.safeParse(withOptional)
    expect(result.success).toBe(true)
  })

  it('defaults isEmergency to false', () => {
    const withoutEmergency = {
      platform: 'web',
      version: '1.0.0',
      cacheAge: 0,
    }
    const result = reportSyncStatusInputSchema.safeParse(withoutEmergency)
    expect(result.success).toBe(true)
    expect(result.data?.isEmergency).toBe(false)
  })

  it('rejects missing required fields', () => {
    const missingPlatform = { version: '1.0.0', cacheAge: 0 }
    expect(reportSyncStatusInputSchema.safeParse(missingPlatform).success).toBe(false)
  })
})

describe('reportSyncStatusResponseSchema', () => {
  it('accepts valid response', () => {
    const validResponse = {
      success: true,
      serverVersion: '1.0.0',
      shouldResync: false,
      message: 'Status reported successfully',
    }
    const result = reportSyncStatusResponseSchema.safeParse(validResponse)
    expect(result.success).toBe(true)
  })

  it('rejects missing fields', () => {
    const incomplete = { success: true }
    expect(reportSyncStatusResponseSchema.safeParse(incomplete).success).toBe(false)
  })
})

describe('getAllSyncStatusesResponseSchema', () => {
  it('accepts valid response with multiple statuses', () => {
    const validResponse = {
      statuses: [
        {
          platform: 'web',
          version: '1.0.0',
          lastSyncAt: '2025-12-16T00:00:00.000Z',
          isStale: false,
          cacheAge: 3600000,
          isEmergency: false,
        },
        {
          platform: 'android',
          version: '1.0.0',
          lastSyncAt: '2025-12-14T00:00:00.000Z',
          isStale: true,
          cacheAge: 172800000,
          isEmergency: false,
        },
      ],
      stalePlatforms: ['android'],
      serverVersion: '1.0.0',
      generatedAt: '2025-12-16T00:00:00.000Z',
    }
    const result = getAllSyncStatusesResponseSchema.safeParse(validResponse)
    expect(result.success).toBe(true)
  })

  it('accepts response with empty statuses', () => {
    const emptyResponse = {
      statuses: [],
      stalePlatforms: [],
      serverVersion: '1.0.0',
      generatedAt: '2025-12-16T00:00:00.000Z',
    }
    const result = getAllSyncStatusesResponseSchema.safeParse(emptyResponse)
    expect(result.success).toBe(true)
  })
})

describe('ALLOWLIST_SYNC_CONSTANTS', () => {
  it('has correct TTL values', () => {
    // 24 hours in milliseconds
    expect(ALLOWLIST_SYNC_CONSTANTS.NORMAL_TTL_MS).toBe(24 * 60 * 60 * 1000)
    // 1 hour in milliseconds
    expect(ALLOWLIST_SYNC_CONSTANTS.EMERGENCY_TTL_MS).toBe(60 * 60 * 1000)
  })

  it('has correct staleness threshold (48 hours)', () => {
    expect(ALLOWLIST_SYNC_CONSTANTS.STALENESS_THRESHOLD_MS).toBe(48 * 60 * 60 * 1000)
  })

  it('has correct monitoring interval (12 hours)', () => {
    expect(ALLOWLIST_SYNC_CONSTANTS.MONITORING_INTERVAL_MS).toBe(12 * 60 * 60 * 1000)
  })

  it('has correct rate limit window (1 hour)', () => {
    expect(ALLOWLIST_SYNC_CONSTANTS.RATE_LIMIT_WINDOW_MS).toBe(60 * 60 * 1000)
  })

  it('defines collection names', () => {
    expect(ALLOWLIST_SYNC_CONSTANTS.SYNC_STATUS_COLLECTION).toBe('allowlist-sync-status')
    expect(ALLOWLIST_SYNC_CONSTANTS.SYNC_ALERTS_COLLECTION).toBe('allowlist-sync-alerts')
  })
})

describe('Platform label helpers', () => {
  it('getAllowlistPlatformLabel returns correct labels', () => {
    expect(getAllowlistPlatformLabel('web')).toBe('Web Application')
    expect(getAllowlistPlatformLabel('chrome-extension')).toBe('Chrome Extension')
    expect(getAllowlistPlatformLabel('android')).toBe('Android App')
    expect(getAllowlistPlatformLabel('ios')).toBe('iOS App')
  })

  it('getAllowlistPlatformDescription returns correct descriptions', () => {
    expect(getAllowlistPlatformDescription('web')).toContain('Next.js')
    expect(getAllowlistPlatformDescription('chrome-extension')).toContain('Chrome')
    expect(getAllowlistPlatformDescription('android')).toContain('Android')
    expect(getAllowlistPlatformDescription('ios')).toContain('iOS')
  })

  it('ALLOWLIST_PLATFORM_LABELS has all platforms', () => {
    const platforms: AllowlistPlatform[] = ['web', 'chrome-extension', 'android', 'ios']
    platforms.forEach((platform) => {
      expect(ALLOWLIST_PLATFORM_LABELS[platform]).toBeDefined()
      expect(ALLOWLIST_PLATFORM_DESCRIPTIONS[platform]).toBeDefined()
    })
  })
})

describe('isSyncStatusStale', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-16T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false for recent sync', () => {
    // 1 hour ago
    const recentSync = new Date('2025-12-15T23:00:00.000Z').toISOString()
    expect(isSyncStatusStale(recentSync)).toBe(false)
  })

  it('returns false at exactly 48 hours', () => {
    // Exactly 48 hours ago
    const atThreshold = new Date('2025-12-14T00:00:00.000Z').toISOString()
    expect(isSyncStatusStale(atThreshold)).toBe(false)
  })

  it('returns true after 48 hours', () => {
    // 49 hours ago
    const pastThreshold = new Date('2025-12-13T23:00:00.000Z').toISOString()
    expect(isSyncStatusStale(pastThreshold)).toBe(true)
  })

  it('returns true for very old sync', () => {
    // 7 days ago
    const veryOld = new Date('2025-12-09T00:00:00.000Z').toISOString()
    expect(isSyncStatusStale(veryOld)).toBe(true)
  })
})

describe('calculateStaleDuration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-16T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calculates correct duration for 1 hour ago', () => {
    const oneHourAgo = new Date('2025-12-15T23:00:00.000Z').toISOString()
    expect(calculateStaleDuration(oneHourAgo)).toBe(60 * 60 * 1000)
  })

  it('calculates correct duration for 48 hours ago', () => {
    const fortyEightHoursAgo = new Date('2025-12-14T00:00:00.000Z').toISOString()
    expect(calculateStaleDuration(fortyEightHoursAgo)).toBe(48 * 60 * 60 * 1000)
  })
})

describe('formatStaleDuration', () => {
  it('formats hours correctly', () => {
    expect(formatStaleDuration(60 * 60 * 1000)).toBe('1h')
    expect(formatStaleDuration(12 * 60 * 60 * 1000)).toBe('12h')
  })

  it('formats days and hours correctly', () => {
    expect(formatStaleDuration(25 * 60 * 60 * 1000)).toBe('1d 1h')
    expect(formatStaleDuration(48 * 60 * 60 * 1000)).toBe('2d')
    expect(formatStaleDuration(50 * 60 * 60 * 1000)).toBe('2d 2h')
  })

  it('formats days without remaining hours', () => {
    expect(formatStaleDuration(24 * 60 * 60 * 1000)).toBe('1d')
    expect(formatStaleDuration(72 * 60 * 60 * 1000)).toBe('3d')
  })
})

describe('getTTLForVersion', () => {
  it('returns normal TTL for regular version', () => {
    expect(getTTLForVersion('1.0.0')).toBe(ALLOWLIST_SYNC_CONSTANTS.NORMAL_TTL_MS)
    expect(getTTLForVersion('2.1.3')).toBe(ALLOWLIST_SYNC_CONSTANTS.NORMAL_TTL_MS)
    expect(getTTLForVersion('1.0.0-2025-12-16T00:00:00Z')).toBe(
      ALLOWLIST_SYNC_CONSTANTS.NORMAL_TTL_MS
    )
  })

  it('returns emergency TTL for emergency version', () => {
    expect(getTTLForVersion('1.0.0-emergency-abc123')).toBe(
      ALLOWLIST_SYNC_CONSTANTS.EMERGENCY_TTL_MS
    )
    expect(getTTLForVersion('2.0.0-emergency-def456')).toBe(
      ALLOWLIST_SYNC_CONSTANTS.EMERGENCY_TTL_MS
    )
  })
})

describe('shouldRefreshCache', () => {
  it('returns false for fresh cache with normal version', () => {
    // 1 hour old cache
    expect(shouldRefreshCache(60 * 60 * 1000, '1.0.0')).toBe(false)
    // 23 hours old cache
    expect(shouldRefreshCache(23 * 60 * 60 * 1000, '1.0.0')).toBe(false)
  })

  it('returns true for stale cache with normal version', () => {
    // 25 hours old cache (> 24h TTL)
    expect(shouldRefreshCache(25 * 60 * 60 * 1000, '1.0.0')).toBe(true)
  })

  it('returns true for old emergency cache', () => {
    // 2 hours old cache (> 1h emergency TTL)
    expect(shouldRefreshCache(2 * 60 * 60 * 1000, '1.0.0-emergency-abc123')).toBe(true)
  })

  it('returns false for fresh emergency cache', () => {
    // 30 minutes old cache (< 1h emergency TTL)
    expect(shouldRefreshCache(30 * 60 * 1000, '1.0.0-emergency-abc123')).toBe(false)
  })
})

describe('createSyncStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-16T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates valid sync status object', () => {
    const status = createSyncStatus('web', '1.0.0', 3600000, false)

    expect(status.platform).toBe('web')
    expect(status.version).toBe('1.0.0')
    expect(status.lastSyncAt).toBe('2025-12-16T00:00:00.000Z')
    expect(status.isStale).toBe(false)
    expect(status.cacheAge).toBe(3600000)
    expect(status.isEmergency).toBe(false)
  })

  it('creates emergency sync status', () => {
    const status = createSyncStatus('android', '1.0.0-emergency-abc123', 0, true)

    expect(status.platform).toBe('android')
    expect(status.isEmergency).toBe(true)
  })

  it('defaults isEmergency to false', () => {
    const status = createSyncStatus('ios', '1.0.0', 0)
    expect(status.isEmergency).toBe(false)
  })
})

describe('safeParseSyncStatus', () => {
  it('returns parsed object for valid input', () => {
    const validInput = {
      platform: 'web',
      version: '1.0.0',
      lastSyncAt: '2025-12-16T00:00:00.000Z',
      isStale: false,
      cacheAge: 0,
      isEmergency: false,
    }
    const result = safeParseSyncStatus(validInput)
    expect(result).not.toBeNull()
    expect(result?.platform).toBe('web')
  })

  it('returns null for invalid input', () => {
    expect(safeParseSyncStatus(null)).toBeNull()
    expect(safeParseSyncStatus({ invalid: true })).toBeNull()
    expect(safeParseSyncStatus('not an object')).toBeNull()
  })
})

describe('safeParseSyncAlert', () => {
  it('returns parsed object for valid input', () => {
    const validInput = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      platform: 'android',
      lastVersion: '1.0.0',
      lastSyncAt: '2025-12-14T00:00:00.000Z',
      staleDuration: 172800000,
      alertedAt: '2025-12-16T00:00:00.000Z',
      resolved: false,
    }
    const result = safeParseSyncAlert(validInput)
    expect(result).not.toBeNull()
    expect(result?.platform).toBe('android')
  })

  it('returns null for invalid input', () => {
    expect(safeParseSyncAlert(null)).toBeNull()
    expect(safeParseSyncAlert({ invalid: true })).toBeNull()
  })
})

describe('validateReportSyncStatusInput', () => {
  it('returns parsed input for valid data', () => {
    const validInput = {
      platform: 'web',
      version: '1.0.0',
      cacheAge: 0,
      isEmergency: false,
    }
    const result = validateReportSyncStatusInput(validInput)
    expect(result.platform).toBe('web')
  })

  it('throws for invalid data', () => {
    expect(() => validateReportSyncStatusInput({})).toThrow()
    expect(() => validateReportSyncStatusInput({ platform: 'invalid' })).toThrow()
  })
})

describe('safeParseReportSyncStatusInput', () => {
  it('returns parsed object for valid input', () => {
    const validInput = {
      platform: 'chrome-extension',
      version: '1.0.0',
      cacheAge: 3600000,
    }
    const result = safeParseReportSyncStatusInput(validInput)
    expect(result).not.toBeNull()
    expect(result?.platform).toBe('chrome-extension')
  })

  it('returns null for invalid input', () => {
    expect(safeParseReportSyncStatusInput(null)).toBeNull()
    expect(safeParseReportSyncStatusInput({ platform: 'invalid' })).toBeNull()
  })
})
