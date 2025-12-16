/**
 * Fuzzy Domain Matching for Crisis URLs
 *
 * Story 7.5: Fuzzy Domain Matching
 *
 * Implements Levenshtein distance-based fuzzy matching to protect
 * crisis resources even when children make typos in URLs.
 *
 * CRITICAL SAFETY: Fuzzy matching must be extremely conservative.
 * A false positive (blocking non-crisis site) is acceptable.
 * A false negative (missing typo'd crisis URL) is NOT acceptable.
 */

import type { CrisisUrlEntry } from './schema'

/**
 * Maximum Levenshtein distance for a match to be considered a typo.
 * Distance of 2 catches most common single and double typos.
 */
export const MAX_LEVENSHTEIN_DISTANCE = 2

/**
 * Minimum base domain length for fuzzy matching.
 * Prevents short domains like "hi.org" from matching "988.org".
 */
export const MIN_DOMAIN_LENGTH = 5

/**
 * Minimum length ratio between input and target domains.
 * Prevents "a.org" from matching "988lifeline.org".
 */
export const MIN_LENGTH_RATIO = 0.7

/**
 * Common domains that should NEVER be fuzzy matched to crisis resources.
 * These are high-traffic domains that could create false positive chaos.
 */
export const FUZZY_BLOCKLIST = [
  // Search engines
  'google.com',
  'bing.com',
  'yahoo.com',
  'duckduckgo.com',
  'baidu.com',
  // Social media
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'tiktok.com',
  'reddit.com',
  'linkedin.com',
  'pinterest.com',
  'tumblr.com',
  'snapchat.com',
  'discord.com',
  // Video/streaming
  'youtube.com',
  'netflix.com',
  'twitch.tv',
  'vimeo.com',
  'hulu.com',
  'spotify.com',
  // E-commerce
  'amazon.com',
  'ebay.com',
  'etsy.com',
  'walmart.com',
  'target.com',
  // Tech giants
  'microsoft.com',
  'apple.com',
  'github.com',
  'gitlab.com',
  'stackoverflow.com',
  // News/media
  'cnn.com',
  'bbc.com',
  'nytimes.com',
  'wikipedia.org',
  // Email/communication
  'gmail.com',
  'outlook.com',
  'zoom.us',
  'slack.com',
  // Gaming
  'roblox.com',
  'minecraft.net',
  'steam.com',
  'epicgames.com',
  // Education
  'khanacademy.org',
  'coursera.org',
  'udemy.com',
]

/**
 * Result of a fuzzy domain match
 */
export interface FuzzyMatchResult {
  /** The crisis entry that matched */
  entry: CrisisUrlEntry
  /** Levenshtein distance (lower = closer match) */
  distance: number
  /** Which domain/alias the input matched against */
  matchedAgainst: string
}

/**
 * Calculate Levenshtein distance between two strings.
 *
 * Levenshtein distance is the minimum number of single-character edits
 * (insertions, deletions, or substitutions) required to change one
 * string into the other.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Number of edits needed (0 = identical)
 *
 * @example
 * levenshteinDistance('kitten', 'sitting') // = 3
 * levenshteinDistance('trevorproject', 'thetrevoproject') // = 2
 */
export function levenshteinDistance(a: string, b: string): number {
  // Handle edge cases
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  // Create distance matrix
  const matrix: number[][] = []

  // Initialize first column (deletions from a)
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i]
  }

  // Initialize first row (insertions to make a into b)
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return matrix[a.length][b.length]
}

/**
 * Extract base domain and TLD from a full domain.
 *
 * @param domain - Full domain (e.g., "thetrevoproject.org")
 * @returns Object with baseDomain and tld, or null if invalid
 *
 * @example
 * parseDomain('thetrevoproject.org') // { baseDomain: 'thetrevoproject', tld: 'org' }
 * parseDomain('sub.example.co.uk') // { baseDomain: 'sub.example.co', tld: 'uk' }
 */
export function parseDomain(domain: string): { baseDomain: string; tld: string } | null {
  const parts = domain.toLowerCase().split('.')
  if (parts.length < 2) return null

  const tld = parts[parts.length - 1]
  const baseDomain = parts.slice(0, -1).join('.')

  if (!baseDomain || !tld) return null

  return { baseDomain, tld }
}

/**
 * Check if a domain is in the fuzzy match blocklist.
 *
 * @param domain - Domain to check (normalized, without www)
 * @returns true if domain should not be fuzzy matched
 */
export function isBlocklisted(domain: string): boolean {
  const normalized = domain.toLowerCase()
  return FUZZY_BLOCKLIST.includes(normalized)
}

/**
 * Calculate length ratio between two strings.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Ratio of shorter to longer (0.0 to 1.0)
 */
export function lengthRatio(a: string, b: string): number {
  if (a.length === 0 || b.length === 0) return 0
  return Math.min(a.length, b.length) / Math.max(a.length, b.length)
}

/**
 * Attempt fuzzy match between an input domain and a target domain.
 *
 * @param inputBase - Base domain of input (e.g., "trevorproject")
 * @param targetBase - Base domain of target (e.g., "thetrevoproject")
 * @param inputTld - TLD of input
 * @param targetTld - TLD of target
 * @returns Distance if match found, null if no valid match
 */
function tryFuzzyMatch(
  inputBase: string,
  targetBase: string,
  inputTld: string,
  targetTld: string
): number | null {
  // TLD must match exactly
  if (inputTld !== targetTld) return null

  // Length ratio check
  const ratio = lengthRatio(inputBase, targetBase)
  if (ratio < MIN_LENGTH_RATIO) return null

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(inputBase, targetBase)

  // Only return if within threshold
  if (distance <= MAX_LEVENSHTEIN_DISTANCE) {
    return distance
  }

  return null
}

/**
 * Find the best fuzzy match for a domain against crisis entries.
 *
 * This function checks the input domain against all crisis entries,
 * trying both primary domains and aliases. It returns the best match
 * (lowest distance) if one exists within the threshold.
 *
 * SAFETY MEASURES:
 * 1. Minimum domain length check
 * 2. Blocklist check for common domains
 * 3. TLD must match exactly
 * 4. Length ratio must be >= 0.7
 * 5. Levenshtein distance must be <= 2
 *
 * @param domain - Domain to check (e.g., "trevorproject.org")
 * @param entries - Array of crisis entries to match against
 * @returns FuzzyMatchResult if match found, null otherwise
 *
 * @example
 * const result = fuzzyDomainMatch('trevorproject.org', entries)
 * if (result) {
 *   console.log(`Matched ${result.matchedAgainst} with distance ${result.distance}`)
 * }
 */
export function fuzzyDomainMatch(
  domain: string,
  entries: CrisisUrlEntry[]
): FuzzyMatchResult | null {
  if (!domain || !entries || entries.length === 0) return null

  // Normalize domain
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, '')

  // Parse input domain
  const parsed = parseDomain(normalizedDomain)
  if (!parsed) return null

  const { baseDomain, tld } = parsed

  // Check minimum length
  if (baseDomain.length < MIN_DOMAIN_LENGTH) return null

  // Check blocklist
  if (isBlocklisted(normalizedDomain)) return null

  let bestMatch: FuzzyMatchResult | null = null

  for (const entry of entries) {
    // Check primary domain
    const entryParsed = parseDomain(entry.domain.toLowerCase().replace(/^www\./, ''))
    if (entryParsed) {
      const distance = tryFuzzyMatch(baseDomain, entryParsed.baseDomain, tld, entryParsed.tld)
      if (distance !== null && (!bestMatch || distance < bestMatch.distance)) {
        bestMatch = { entry, distance, matchedAgainst: entry.domain }
      }
    }

    // Check aliases
    for (const alias of entry.aliases) {
      const aliasParsed = parseDomain(alias.toLowerCase().replace(/^www\./, ''))
      if (aliasParsed) {
        const distance = tryFuzzyMatch(baseDomain, aliasParsed.baseDomain, tld, aliasParsed.tld)
        if (distance !== null && (!bestMatch || distance < bestMatch.distance)) {
          bestMatch = { entry, distance, matchedAgainst: alias }
        }
      }
    }
  }

  return bestMatch
}

/**
 * Check if fuzzy matching should be attempted for a domain.
 *
 * This is a quick pre-check before running the more expensive
 * fuzzy match algorithm.
 *
 * @param domain - Domain to check
 * @returns true if fuzzy matching should be attempted
 */
export function shouldAttemptFuzzyMatch(domain: string): boolean {
  if (!domain) return false

  const normalizedDomain = domain.toLowerCase().replace(/^www\./, '')

  // Parse domain
  const parsed = parseDomain(normalizedDomain)
  if (!parsed) return false

  // Check minimum length
  if (parsed.baseDomain.length < MIN_DOMAIN_LENGTH) return false

  // Check blocklist
  if (isBlocklisted(normalizedDomain)) return false

  return true
}
