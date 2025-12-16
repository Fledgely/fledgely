/**
 * Version Management for Crisis Allowlist
 *
 * Story 7.1: Crisis Allowlist Data Structure - Task 4
 *
 * Provides version comparison and staleness checking for
 * allowlist synchronization across platforms.
 */

import {
  parseAllowlistVersion,
  type ParsedVersion,
} from './schema'
import allowlistData from './allowlist.json'

/**
 * Get the current allowlist version string
 *
 * @returns The version string from the bundled allowlist
 */
export function getAllowlistVersion(): string {
  return allowlistData.version
}

/**
 * Get the parsed version information
 *
 * @returns Parsed version with major, minor, patch, and timestamp
 */
export function getParsedAllowlistVersion(): ParsedVersion | null {
  return parseAllowlistVersion(getAllowlistVersion())
}

/**
 * Check if the local allowlist is stale compared to a remote version
 *
 * A local allowlist is considered stale if:
 * 1. The remote version has a higher semver
 * 2. OR the remote timestamp is newer (for same semver)
 *
 * @param remoteVersion - The version string from the remote API
 * @returns true if local is stale and should be updated
 */
export function isAllowlistStale(remoteVersion: string): boolean {
  const local = parseAllowlistVersion(getAllowlistVersion())
  const remote = parseAllowlistVersion(remoteVersion)

  // If either version can't be parsed, assume local is not stale
  // (fail-safe to use cached version)
  if (!local || !remote) {
    return false
  }

  // Compare major version
  if (remote.major > local.major) return true
  if (remote.major < local.major) return false

  // Compare minor version
  if (remote.minor > local.minor) return true
  if (remote.minor < local.minor) return false

  // Compare patch version
  if (remote.patch > local.patch) return true
  if (remote.patch < local.patch) return false

  // Same semver - compare timestamps
  return remote.timestamp.getTime() > local.timestamp.getTime()
}

/**
 * Compare two version strings
 *
 * @param versionA - First version string
 * @param versionB - Second version string
 * @returns -1 if A < B, 0 if A == B, 1 if A > B
 */
export function compareVersions(versionA: string, versionB: string): -1 | 0 | 1 {
  const a = parseAllowlistVersion(versionA)
  const b = parseAllowlistVersion(versionB)

  // If either can't be parsed, treat as equal
  if (!a || !b) return 0

  // Compare semver components
  if (a.major !== b.major) return a.major > b.major ? 1 : -1
  if (a.minor !== b.minor) return a.minor > b.minor ? 1 : -1
  if (a.patch !== b.patch) return a.patch > b.patch ? 1 : -1

  // Compare timestamps
  const timeDiff = a.timestamp.getTime() - b.timestamp.getTime()
  if (timeDiff > 0) return 1
  if (timeDiff < 0) return -1

  return 0
}

/**
 * Get the last updated timestamp as a Date object
 *
 * @returns Date when the allowlist was last updated
 */
export function getLastUpdated(): Date {
  return new Date(allowlistData.lastUpdated)
}

/**
 * Check if the allowlist is older than a given number of hours
 *
 * @param hours - Maximum age in hours
 * @returns true if the allowlist is older than the specified hours
 */
export function isOlderThan(hours: number): boolean {
  const lastUpdated = getLastUpdated()
  const now = new Date()
  const diffMs = now.getTime() - lastUpdated.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours > hours
}
