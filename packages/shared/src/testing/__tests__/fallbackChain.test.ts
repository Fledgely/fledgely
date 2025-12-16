/**
 * Fallback Chain Tests
 *
 * Story 7.9: Cross-Platform Allowlist Testing - Task 5
 *
 * Verifies that the allowlist fallback chain works correctly:
 * Network → Cache → Bundled
 *
 * CRITICAL: The system must NEVER return an empty allowlist.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getCrisisAllowlist,
  isCrisisUrl,
  getAllowlistVersion,
} from '../../constants/crisis-urls'
import {
  createAllowlistSyncService,
  shouldResync,
  isEmergencyVersion,
  type AllowlistSyncAdapter,
  type CachedAllowlist,
} from '../../services/allowlistSyncService'
import type { CrisisAllowlist } from '../../constants/crisis-urls'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a mock allowlist for testing
 */
function createMockAllowlist(version = '1.0.0'): CrisisAllowlist {
  return {
    version,
    lastUpdated: new Date().toISOString(),
    entries: [
      {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        domain: '988lifeline.org',
        category: 'suicide',
        region: 'us',
        name: '988 Suicide & Crisis Lifeline',
        description: 'National suicide prevention',
        aliases: [],
        wildcardPatterns: [],
        contactMethods: ['phone', 'text', 'chat'],
        phoneNumber: '988',
        textNumber: '988',
      },
    ],
  }
}

/**
 * Create a mock sync adapter
 *
 * Note: The AllowlistSyncAdapter does not have a `fetch` method - the sync service
 * handles network fetching internally. The adapter is for cache operations and
 * bundled data access.
 */
function createMockAdapter(options: {
  cachedData?: CachedAllowlist | null
  bundledData?: CrisisAllowlist
}): AllowlistSyncAdapter {
  return {
    async getFromCache(): Promise<CachedAllowlist | null> {
      return options.cachedData ?? null
    },
    async saveToCache(): Promise<void> {
      // No-op
    },
    getBundled(): CrisisAllowlist {
      return options.bundledData ?? createMockAllowlist()
    },
    async reportSyncStatus(): Promise<void> {
      // No-op
    },
  }
}

// ============================================================================
// Bundled Allowlist Tests
// ============================================================================

describe('Bundled Allowlist', () => {
  it('bundled allowlist is always available', () => {
    const allowlist = getCrisisAllowlist()

    expect(allowlist).toBeDefined()
    expect(allowlist.entries).toBeDefined()
    expect(Array.isArray(allowlist.entries)).toBe(true)
  })

  it('bundled allowlist is non-empty', () => {
    const allowlist = getCrisisAllowlist()

    expect(allowlist.entries.length).toBeGreaterThan(0)
  })

  it('bundled allowlist has valid version', () => {
    const version = getAllowlistVersion()

    expect(version).toBeDefined()
    expect(version.length).toBeGreaterThan(0)
  })

  it('crisis detection works with bundled data', () => {
    // This uses the bundled allowlist
    expect(isCrisisUrl('https://988lifeline.org')).toBe(true)
    expect(isCrisisUrl('https://google.com')).toBe(false)
  })
})

// ============================================================================
// Sync Service Fallback Tests
// ============================================================================

describe('Sync Service Fallback Chain', () => {
  describe('Cache fallback when valid', () => {
    it('uses valid cache without network request', async () => {
      const cachedVersion = '1.5.0'
      const adapter = createMockAdapter({
        cachedData: {
          data: createMockAllowlist(cachedVersion),
          cachedAt: Date.now(), // Recent cache
          version: cachedVersion,
          isEmergency: false,
        },
      })

      const service = createAllowlistSyncService(
        {
          platform: 'web',
          endpoint: 'https://api.example.com/allowlist',
          ttlMs: 24 * 60 * 60 * 1000,
          emergencyTtlMs: 60 * 60 * 1000,
          networkTimeoutMs: 5000,
        },
        adapter
      )

      const result = await service.sync()

      // Should use cache since it's recent and valid
      expect(result.allowlist.version).toBe(cachedVersion)
      expect(result.source).toBe('cache')
    })
  })

  describe('Cache → Bundled fallback', () => {
    it('getAllowlist returns bundled when cache is empty', async () => {
      const bundledData = createMockAllowlist('1.0.0')
      const adapter = createMockAdapter({
        cachedData: null,
        bundledData,
      })

      const service = createAllowlistSyncService(
        {
          platform: 'web',
          endpoint: 'https://api.example.com/allowlist',
          ttlMs: 24 * 60 * 60 * 1000,
          emergencyTtlMs: 60 * 60 * 1000,
          networkTimeoutMs: 5000,
        },
        adapter
      )

      // getAllowlist provides fail-safe access
      const allowlist = await service.getAllowlist()

      expect(allowlist).toBeDefined()
      expect(allowlist.entries.length).toBeGreaterThan(0)
    })

    it('getAllowlist returns cache when available', async () => {
      const cachedVersion = '1.5.0'
      const bundledData = createMockAllowlist('1.0.0')
      const adapter = createMockAdapter({
        cachedData: {
          data: createMockAllowlist(cachedVersion),
          cachedAt: Date.now() - 48 * 60 * 60 * 1000, // 48 hours ago (expired)
          version: cachedVersion,
          isEmergency: false,
        },
        bundledData,
      })

      const service = createAllowlistSyncService(
        {
          platform: 'web',
          endpoint: 'https://api.example.com/allowlist',
          ttlMs: 24 * 60 * 60 * 1000,
          emergencyTtlMs: 60 * 60 * 1000,
          networkTimeoutMs: 5000,
        },
        adapter
      )

      // getAllowlist returns cache even if expired (for fail-safe)
      const allowlist = await service.getAllowlist()

      expect(allowlist.version).toBe(cachedVersion)
    })
  })

  describe('Never empty guarantee', () => {
    it('getAllowlist always returns non-empty allowlist', async () => {
      const bundledData = createMockAllowlist('1.0.0')
      const adapter = createMockAdapter({
        cachedData: null,
        bundledData,
      })

      const service = createAllowlistSyncService(
        {
          platform: 'web',
          endpoint: 'https://api.example.com/allowlist',
          ttlMs: 24 * 60 * 60 * 1000,
          emergencyTtlMs: 60 * 60 * 1000,
          networkTimeoutMs: 5000,
        },
        adapter
      )

      const allowlist = await service.getAllowlist()

      expect(allowlist.entries.length).toBeGreaterThan(0)
    })

    it('getBundled always returns valid data', () => {
      const adapter = createMockAdapter({})
      const bundled = adapter.getBundled()

      expect(bundled).toBeDefined()
      expect(bundled.entries).toBeDefined()
      expect(bundled.entries.length).toBeGreaterThan(0)
    })
  })
})

// ============================================================================
// Version Comparison Tests
// ============================================================================

describe('Version Comparison', () => {
  it('shouldResync returns true for newer version', () => {
    expect(shouldResync('1.0.0', '1.0.1')).toBe(true)
    expect(shouldResync('1.0.0', '1.1.0')).toBe(true)
    expect(shouldResync('1.0.0', '2.0.0')).toBe(true)
  })

  it('shouldResync returns false for same version', () => {
    expect(shouldResync('1.0.0', '1.0.0')).toBe(false)
  })

  it('shouldResync returns false for older version', () => {
    expect(shouldResync('1.0.1', '1.0.0')).toBe(false)
  })

  it('emergency versions always trigger resync', () => {
    // If server has emergency version, always resync
    expect(shouldResync('1.0.0', '1.0.0-emergency-abc123')).toBe(true)
    // Even if we have same base version
    expect(shouldResync('1.0.0', '1.0.0-emergency-xyz789')).toBe(true)
  })

  it('isEmergencyVersion detects emergency versions', () => {
    expect(isEmergencyVersion('1.0.0-emergency-abc123')).toBe(true)
    expect(isEmergencyVersion('2.1.0-emergency-test')).toBe(true)
    expect(isEmergencyVersion('1.0.0')).toBe(false)
    expect(isEmergencyVersion('1.0.0-beta')).toBe(false)
  })
})

// ============================================================================
// Timeout Handling Tests
// ============================================================================

describe('Timeout Handling', () => {
  it('getAllowlist returns immediately from cache without network', async () => {
    const adapter = createMockAdapter({
      cachedData: {
        data: createMockAllowlist('1.0.0'),
        cachedAt: Date.now() - 48 * 60 * 60 * 1000, // Expired cache
        version: '1.0.0',
        isEmergency: false,
      },
    })

    const service = createAllowlistSyncService(
      {
        platform: 'web',
        endpoint: 'https://api.example.com/allowlist',
        ttlMs: 24 * 60 * 60 * 1000,
        emergencyTtlMs: 60 * 60 * 1000,
        networkTimeoutMs: 50,
      },
      adapter
    )

    const startTime = Date.now()
    const allowlist = await service.getAllowlist()
    const duration = Date.now() - startTime

    // getAllowlist should return quickly from cache (no network)
    expect(duration).toBeLessThan(100)
    // Should have valid data
    expect(allowlist.entries.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// Offline Mode Tests
// ============================================================================

describe('Offline Mode', () => {
  it('crisis detection works offline', () => {
    // No network needed - uses bundled data
    expect(isCrisisUrl('https://988lifeline.org')).toBe(true)
    expect(isCrisisUrl('https://rainn.org')).toBe(true)
  })

  it('bundled allowlist has critical URLs', () => {
    const allowlist = getCrisisAllowlist()
    const domains = new Set(allowlist.entries.map((e) => e.domain.toLowerCase()))

    // Must have these critical URLs available offline
    expect(domains.has('988lifeline.org')).toBe(true)
    expect(domains.has('rainn.org')).toBe(true)
  })

  it('getAllowlist works without network', async () => {
    const bundledData = createMockAllowlist('1.0.0')
    const adapter = createMockAdapter({
      cachedData: null,
      bundledData,
    })

    const service = createAllowlistSyncService(
      {
        platform: 'web',
        endpoint: 'https://api.example.com/allowlist',
        ttlMs: 24 * 60 * 60 * 1000,
        emergencyTtlMs: 60 * 60 * 1000,
        networkTimeoutMs: 5000,
      },
      adapter
    )

    // getAllowlist always returns valid data from cache or bundled
    const allowlist = await service.getAllowlist()

    expect(allowlist.entries.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// TTL-Based Caching Tests
// ============================================================================

describe('TTL-Based Caching', () => {
  it('uses cache when within TTL', async () => {
    const recentCache: CachedAllowlist = {
      data: createMockAllowlist('1.5.0'),
      cachedAt: Date.now(), // Just now
      version: '1.5.0',
      isEmergency: false,
    }

    const adapter = createMockAdapter({
      cachedData: recentCache,
    })

    const service = createAllowlistSyncService(
      {
        platform: 'web',
        endpoint: 'https://api.example.com/allowlist',
        ttlMs: 24 * 60 * 60 * 1000, // 24 hours
        emergencyTtlMs: 60 * 60 * 1000,
        networkTimeoutMs: 5000,
      },
      adapter
    )

    const result = await service.sync()

    // Should use cache since it's recent
    expect(result.allowlist.version).toBe('1.5.0')
    expect(result.source).toBe('cache')
  })

  it('needsRefresh returns false for fresh cache', async () => {
    const recentCache: CachedAllowlist = {
      data: createMockAllowlist('1.5.0'),
      cachedAt: Date.now(), // Just now
      version: '1.5.0',
      isEmergency: false,
    }

    const adapter = createMockAdapter({
      cachedData: recentCache,
    })

    const service = createAllowlistSyncService(
      {
        platform: 'web',
        endpoint: 'https://api.example.com/allowlist',
        ttlMs: 24 * 60 * 60 * 1000,
        emergencyTtlMs: 60 * 60 * 1000,
        networkTimeoutMs: 5000,
      },
      adapter
    )

    const needsRefresh = await service.needsRefresh()

    expect(needsRefresh).toBe(false)
  })

  it('needsRefresh returns true for expired cache', async () => {
    const expiredCache: CachedAllowlist = {
      data: createMockAllowlist('1.0.0'),
      cachedAt: Date.now() - 48 * 60 * 60 * 1000, // 48 hours ago
      version: '1.0.0',
      isEmergency: false,
    }

    const adapter = createMockAdapter({
      cachedData: expiredCache,
    })

    const service = createAllowlistSyncService(
      {
        platform: 'web',
        endpoint: 'https://api.example.com/allowlist',
        ttlMs: 24 * 60 * 60 * 1000, // 24 hours
        emergencyTtlMs: 60 * 60 * 1000,
        networkTimeoutMs: 5000,
      },
      adapter
    )

    const needsRefresh = await service.needsRefresh()

    expect(needsRefresh).toBe(true)
  })

  it('needsRefresh returns true when no cache', async () => {
    const adapter = createMockAdapter({
      cachedData: null,
    })

    const service = createAllowlistSyncService(
      {
        platform: 'web',
        endpoint: 'https://api.example.com/allowlist',
        ttlMs: 24 * 60 * 60 * 1000,
        emergencyTtlMs: 60 * 60 * 1000,
        networkTimeoutMs: 5000,
      },
      adapter
    )

    const needsRefresh = await service.needsRefresh()

    expect(needsRefresh).toBe(true)
  })
})
