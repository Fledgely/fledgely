/**
 * Crisis URL Allowlist API
 *
 * Story 7.1: Crisis Allowlist Data Structure - Task 5
 *
 * Provides functions to check, lookup, and filter crisis resources.
 * These functions are used across all platforms to determine if
 * a URL should be protected from monitoring.
 *
 * @example
 * ```typescript
 * import { isCrisisUrl, getCrisisAllowlist } from '@fledgely/shared'
 *
 * // Check if a URL is protected
 * if (isCrisisUrl('https://988lifeline.org')) {
 *   // Skip all monitoring for this URL
 * }
 *
 * // Get resources by category
 * const suicideResources = getCrisisResourcesByCategory('suicide')
 * ```
 */

// Re-export schemas and types
export {
  crisisResourceCategorySchema,
  crisisUrlEntrySchema,
  crisisAllowlistSchema,
  allowlistVersionSchema,
  contactMethodSchema,
  parseAllowlistVersion,
  createAllowlistVersion,
  type CrisisResourceCategory,
  type CrisisUrlEntry,
  type CrisisAllowlist,
  type ContactMethod,
  type ParsedVersion,
} from './schema'

// Re-export version management
export {
  getAllowlistVersion,
  getParsedAllowlistVersion,
  isAllowlistStale,
  compareVersions,
  getLastUpdated,
  isOlderThan,
} from './version'

import { crisisAllowlistSchema, type CrisisAllowlist, type CrisisUrlEntry, type CrisisResourceCategory } from './schema'
import allowlistData from './allowlist.json'

/** Cached validated allowlist to avoid repeated validation */
let cachedAllowlist: CrisisAllowlist | null = null

/**
 * Get the complete crisis allowlist
 *
 * Validates the allowlist on first access and caches the result.
 * If validation fails, logs warning and returns the data anyway (fail-safe).
 *
 * @returns The full allowlist with all entries and version info
 */
export function getCrisisAllowlist(): CrisisAllowlist {
  if (cachedAllowlist) {
    return cachedAllowlist
  }

  const result = crisisAllowlistSchema.safeParse(allowlistData)
  if (!result.success) {
    // Fail-safe: log warning but return the data anyway
    // This ensures crisis protection continues even if schema changes
    console.warn(
      '[Crisis Allowlist] Validation warning - data may be stale or malformed:',
      result.error.message
    )
    cachedAllowlist = allowlistData as CrisisAllowlist
  } else {
    cachedAllowlist = result.data
  }

  return cachedAllowlist
}

/**
 * Extract domain from a URL string
 *
 * Handles various URL formats including:
 * - Full URLs: https://www.example.org/path
 * - Protocol-relative: //example.org
 * - Domain only: example.org
 * - With port: example.org:8080
 *
 * @param url - URL string or domain
 * @returns Lowercase domain without www prefix
 */
export function extractDomain(url: string): string {
  let domain = url.toLowerCase().trim()

  // Remove protocol
  domain = domain.replace(/^https?:\/\//, '')
  domain = domain.replace(/^\/\//, '')

  // Remove path, query, fragment
  domain = domain.split('/')[0]
  domain = domain.split('?')[0]
  domain = domain.split('#')[0]

  // Remove port
  domain = domain.split(':')[0]

  // Remove www prefix for matching
  domain = domain.replace(/^www\./, '')

  return domain
}

/**
 * Check if a domain matches another domain (case-insensitive)
 *
 * @internal Not part of public API
 * @param urlDomain - Domain extracted from URL
 * @param entryDomain - Domain from allowlist entry
 * @returns true if domains match
 */
function domainMatches(urlDomain: string, entryDomain: string): boolean {
  const normalizedUrl = urlDomain.toLowerCase().replace(/^www\./, '')
  const normalizedEntry = entryDomain.toLowerCase().replace(/^www\./, '')
  return normalizedUrl === normalizedEntry
}

/**
 * Check if a domain matches a wildcard pattern
 *
 * Supports patterns like "*.example.org" which matches:
 * - sub.example.org
 * - deep.sub.example.org
 * But NOT example.org itself
 *
 * @internal Not part of public API
 * @param domain - Domain to check
 * @param pattern - Wildcard pattern (must start with "*.")
 * @returns true if domain matches the pattern
 */
function wildcardMatches(domain: string, pattern: string): boolean {
  if (!pattern.startsWith('*.')) return false

  const baseDomain = pattern.slice(2).toLowerCase()
  const normalizedDomain = domain.toLowerCase()

  // Check if domain ends with the base domain and has a subdomain
  return (
    normalizedDomain.endsWith(`.${baseDomain}`) &&
    normalizedDomain.length > baseDomain.length + 1
  )
}

/**
 * Check if a URL matches any crisis resource
 *
 * This is the primary function used by monitoring code to determine
 * if a URL should be protected. It checks:
 * 1. Primary domain
 * 2. All domain aliases
 * 3. Wildcard patterns for subdomains
 *
 * @param url - Full URL or domain to check
 * @returns true if URL is a protected crisis resource
 */
export function isCrisisUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false

  const domain = extractDomain(url)
  if (!domain) return false

  const allowlist = getCrisisAllowlist()

  for (const entry of allowlist.entries) {
    // Check primary domain
    if (domainMatches(domain, entry.domain)) return true

    // Check aliases
    for (const alias of entry.aliases) {
      if (domainMatches(domain, alias)) return true
    }

    // Check wildcard patterns
    for (const pattern of entry.wildcardPatterns) {
      if (wildcardMatches(domain, pattern)) return true
    }
  }

  return false
}

/**
 * Get crisis resource entry by domain
 *
 * Searches primary domains, aliases, and wildcard patterns.
 *
 * @param domain - Domain to look up
 * @returns The matching entry or undefined
 */
export function getCrisisResourceByDomain(
  domain: string
): CrisisUrlEntry | undefined {
  if (!domain || typeof domain !== 'string') return undefined

  const normalizedDomain = extractDomain(domain)
  if (!normalizedDomain) return undefined

  const allowlist = getCrisisAllowlist()

  for (const entry of allowlist.entries) {
    // Check primary domain
    if (domainMatches(normalizedDomain, entry.domain)) return entry

    // Check aliases
    for (const alias of entry.aliases) {
      if (domainMatches(normalizedDomain, alias)) return entry
    }

    // Check wildcard patterns
    for (const pattern of entry.wildcardPatterns) {
      if (wildcardMatches(normalizedDomain, pattern)) return entry
    }
  }

  return undefined
}

/**
 * Get all crisis resources in a specific category
 *
 * @param category - Category to filter by
 * @returns Array of entries in that category
 */
export function getCrisisResourcesByCategory(
  category: CrisisResourceCategory
): CrisisUrlEntry[] {
  const allowlist = getCrisisAllowlist()
  return allowlist.entries.filter((entry) => entry.category === category)
}

/**
 * Get all crisis resources for a specific region
 *
 * @param region - Region code (e.g., 'us', 'uk', 'au')
 * @returns Array of entries for that region
 */
export function getCrisisResourcesByRegion(region: string): CrisisUrlEntry[] {
  const normalizedRegion = region.toLowerCase()
  const allowlist = getCrisisAllowlist()
  return allowlist.entries.filter(
    (entry) => entry.region.toLowerCase() === normalizedRegion
  )
}

/**
 * Get all unique categories in the allowlist
 *
 * @returns Array of category strings
 */
export function getAllCategories(): CrisisResourceCategory[] {
  const allowlist = getCrisisAllowlist()
  const categories = new Set(allowlist.entries.map((e) => e.category))
  return Array.from(categories)
}

/**
 * Get all unique regions in the allowlist
 *
 * @returns Array of region codes
 */
export function getAllRegions(): string[] {
  const allowlist = getCrisisAllowlist()
  const regions = new Set(allowlist.entries.map((e) => e.region))
  return Array.from(regions)
}

/**
 * Get the total count of crisis resources
 *
 * @returns Number of entries in the allowlist
 */
export function getCrisisResourceCount(): number {
  return getCrisisAllowlist().entries.length
}

/**
 * Search crisis resources by name or description
 *
 * @param query - Search query (case-insensitive)
 * @returns Matching entries
 */
export function searchCrisisResources(query: string): CrisisUrlEntry[] {
  if (!query || typeof query !== 'string') return []

  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) return []

  const allowlist = getCrisisAllowlist()
  return allowlist.entries.filter(
    (entry) =>
      entry.name.toLowerCase().includes(normalizedQuery) ||
      entry.description.toLowerCase().includes(normalizedQuery)
  )
}
