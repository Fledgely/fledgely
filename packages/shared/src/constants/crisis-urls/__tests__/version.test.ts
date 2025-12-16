/**
 * Version Management Tests
 *
 * Story 7.1: Crisis Allowlist Data Structure - Task 4.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getAllowlistVersion,
  getParsedAllowlistVersion,
  isAllowlistStale,
  compareVersions,
  getLastUpdated,
  isOlderThan,
} from '../version'

describe('getAllowlistVersion', () => {
  it('returns the version from allowlist.json', () => {
    const version = getAllowlistVersion()

    expect(version).toBeDefined()
    expect(typeof version).toBe('string')
    expect(version).toMatch(/^\d+\.\d+\.\d+-\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
  })

  it('returns consistent version across calls', () => {
    const version1 = getAllowlistVersion()
    const version2 = getAllowlistVersion()

    expect(version1).toBe(version2)
  })
})

describe('getParsedAllowlistVersion', () => {
  it('returns parsed version object', () => {
    const parsed = getParsedAllowlistVersion()

    expect(parsed).not.toBeNull()
    expect(typeof parsed!.major).toBe('number')
    expect(typeof parsed!.minor).toBe('number')
    expect(typeof parsed!.patch).toBe('number')
    expect(parsed!.timestamp).toBeInstanceOf(Date)
  })
})

describe('isAllowlistStale', () => {
  const currentVersion = getAllowlistVersion()

  it('returns false for same version', () => {
    expect(isAllowlistStale(currentVersion)).toBe(false)
  })

  it('returns true for higher major version', () => {
    const parsed = getParsedAllowlistVersion()!
    const newerVersion = `${parsed.major + 1}.0.0-2025-12-16T12:00:00Z`

    expect(isAllowlistStale(newerVersion)).toBe(true)
  })

  it('returns true for higher minor version', () => {
    const parsed = getParsedAllowlistVersion()!
    const newerVersion = `${parsed.major}.${parsed.minor + 1}.0-2025-12-16T12:00:00Z`

    expect(isAllowlistStale(newerVersion)).toBe(true)
  })

  it('returns true for higher patch version', () => {
    const parsed = getParsedAllowlistVersion()!
    const newerVersion = `${parsed.major}.${parsed.minor}.${parsed.patch + 1}-2025-12-16T12:00:00Z`

    expect(isAllowlistStale(newerVersion)).toBe(true)
  })

  it('returns true for same semver but newer timestamp', () => {
    const parsed = getParsedAllowlistVersion()!
    const futureDate = new Date(parsed.timestamp.getTime() + 86400000) // +1 day
    const isoTimestamp = futureDate.toISOString().replace(/\.\d{3}Z$/, 'Z')
    const newerVersion = `${parsed.major}.${parsed.minor}.${parsed.patch}-${isoTimestamp}`

    expect(isAllowlistStale(newerVersion)).toBe(true)
  })

  it('returns false for lower version', () => {
    const parsed = getParsedAllowlistVersion()!
    const olderVersion = `0.0.1-2020-01-01T00:00:00Z`

    // Only return false if current version is >= 0.0.2
    if (parsed.major > 0 || parsed.minor > 0 || parsed.patch > 1) {
      expect(isAllowlistStale(olderVersion)).toBe(false)
    }
  })

  it('returns false for invalid remote version (fail-safe)', () => {
    expect(isAllowlistStale('invalid')).toBe(false)
    expect(isAllowlistStale('')).toBe(false)
    expect(isAllowlistStale('1.0.0')).toBe(false)
  })
})

describe('compareVersions', () => {
  it('returns 0 for identical versions', () => {
    const version = '1.0.0-2025-12-16T12:00:00Z'
    expect(compareVersions(version, version)).toBe(0)
  })

  it('returns 1 when first version is higher (major)', () => {
    expect(
      compareVersions('2.0.0-2025-12-16T12:00:00Z', '1.0.0-2025-12-16T12:00:00Z')
    ).toBe(1)
  })

  it('returns -1 when first version is lower (major)', () => {
    expect(
      compareVersions('1.0.0-2025-12-16T12:00:00Z', '2.0.0-2025-12-16T12:00:00Z')
    ).toBe(-1)
  })

  it('returns 1 when first version is higher (minor)', () => {
    expect(
      compareVersions('1.1.0-2025-12-16T12:00:00Z', '1.0.0-2025-12-16T12:00:00Z')
    ).toBe(1)
  })

  it('returns -1 when first version is lower (minor)', () => {
    expect(
      compareVersions('1.0.0-2025-12-16T12:00:00Z', '1.1.0-2025-12-16T12:00:00Z')
    ).toBe(-1)
  })

  it('returns 1 when first version is higher (patch)', () => {
    expect(
      compareVersions('1.0.1-2025-12-16T12:00:00Z', '1.0.0-2025-12-16T12:00:00Z')
    ).toBe(1)
  })

  it('returns -1 when first version is lower (patch)', () => {
    expect(
      compareVersions('1.0.0-2025-12-16T12:00:00Z', '1.0.1-2025-12-16T12:00:00Z')
    ).toBe(-1)
  })

  it('compares timestamps when semver is equal', () => {
    expect(
      compareVersions('1.0.0-2025-12-17T12:00:00Z', '1.0.0-2025-12-16T12:00:00Z')
    ).toBe(1)
    expect(
      compareVersions('1.0.0-2025-12-16T12:00:00Z', '1.0.0-2025-12-17T12:00:00Z')
    ).toBe(-1)
  })

  it('returns 0 for invalid versions (fail-safe)', () => {
    expect(compareVersions('invalid', '1.0.0-2025-12-16T12:00:00Z')).toBe(0)
    expect(compareVersions('1.0.0-2025-12-16T12:00:00Z', 'invalid')).toBe(0)
  })
})

describe('getLastUpdated', () => {
  it('returns a Date object', () => {
    const lastUpdated = getLastUpdated()

    expect(lastUpdated).toBeInstanceOf(Date)
    expect(lastUpdated.getTime()).toBeGreaterThan(0)
  })

  it('returns valid date from allowlist', () => {
    const lastUpdated = getLastUpdated()

    // Should be a reasonable date (not epoch, not future)
    expect(lastUpdated.getFullYear()).toBeGreaterThanOrEqual(2024)
    expect(lastUpdated.getTime()).toBeLessThanOrEqual(Date.now() + 86400000) // Not more than 1 day in future
  })
})

describe('isOlderThan', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false when allowlist is fresh', () => {
    const lastUpdated = getLastUpdated()
    vi.setSystemTime(lastUpdated)

    expect(isOlderThan(1)).toBe(false)
    expect(isOlderThan(24)).toBe(false)
  })

  it('returns true when allowlist is older than threshold', () => {
    const lastUpdated = getLastUpdated()
    // Set time to 25 hours after last update
    vi.setSystemTime(new Date(lastUpdated.getTime() + 25 * 60 * 60 * 1000))

    expect(isOlderThan(24)).toBe(true)
    expect(isOlderThan(48)).toBe(false)
  })

  it('handles boundary conditions', () => {
    const lastUpdated = getLastUpdated()

    // Exactly 24 hours - should be false (not older than)
    vi.setSystemTime(new Date(lastUpdated.getTime() + 24 * 60 * 60 * 1000))
    expect(isOlderThan(24)).toBe(false)

    // 24 hours + 1 ms - should be true
    vi.setSystemTime(new Date(lastUpdated.getTime() + 24 * 60 * 60 * 1000 + 1))
    expect(isOlderThan(24)).toBe(true)
  })
})
