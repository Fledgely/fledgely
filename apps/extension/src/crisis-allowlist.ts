/**
 * Crisis Allowlist Module for Fledgely Chrome Extension
 *
 * This module implements the pre-capture allowlist check for crisis resources.
 * It ensures the ZERO DATA PATH invariant (INV-001) - crisis sites are NEVER captured.
 *
 * Story 11.1: Pre-Capture Allowlist Check
 * Story 7.5: Fuzzy Domain Matching (Levenshtein distance for typos)
 *
 * CRITICAL PRIVACY RULES:
 * - Check happens BEFORE any capture attempt
 * - If URL matches allowlist, NO data is created, queued, or transmitted
 * - If check fails for any reason, capture is SKIPPED (fail-safe)
 * - Protected URLs are NEVER logged (only the fact that protection was triggered)
 */

/**
 * Crisis allowlist data structure
 */
export interface CrisisAllowlist {
  version: string
  lastUpdated: number
  domains: string[]
}

/**
 * Crisis resource from API response
 * Story 7.7: Allowlist Distribution & Sync
 */
interface CrisisResourceFromAPI {
  id: string
  domain: string
  pattern: string | null
  category: string
  name: string
  description: string
  phone: string | null
  text: string | null
  aliases: string[]
  regional: boolean
}

/**
 * API response format from GET /getCrisisAllowlist
 * Story 7.7: Allowlist Distribution & Sync
 */
interface GetAllowlistAPIResponse {
  version: string
  lastUpdated: string // ISO timestamp
  resources: CrisisResourceFromAPI[]
}

// Storage key for cached allowlist
const ALLOWLIST_STORAGE_KEY = 'crisisAllowlist'

// Storage key for fuzzy match improvement queue (Story 7.5)
const FUZZY_MATCH_QUEUE_KEY = 'fuzzyMatchQueue'

// Story 7.7: API URL for crisis allowlist sync
// Uses Firebase Functions public endpoint (no auth required for fail-safe crisis protection)
const FIREBASE_PROJECT_ID = 'fledgely-cns-me'
const FIREBASE_REGION = 'us-central1'
const CRISIS_ALLOWLIST_API = `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net/getCrisisAllowlist`

// Fuzzy matching constants (Story 7.5)
const FUZZY_MATCH_THRESHOLD = 2 // Maximum Levenshtein distance for typo detection
const MIN_DOMAIN_LENGTH_FOR_FUZZY = 10 // Skip fuzzy matching for domains < 10 chars (prevents false positives)
const MAX_FUZZY_QUEUE_SIZE = 100 // Maximum entries in improvement queue
const MAX_DOMAIN_LENGTH_FOR_FUZZY = 256 // Max reasonable domain length per RFC 1035 (DoS prevention)

/**
 * Default bundled crisis sites
 * These are ALWAYS available, even if network fails
 * Pattern: domains only (subpaths are automatically protected)
 */
const DEFAULT_CRISIS_SITES: string[] = [
  // Suicide prevention
  'suicidepreventionlifeline.org',
  '988lifeline.org',
  'crisistextline.org',
  'afsp.org', // American Foundation for Suicide Prevention
  'save.org', // Suicide Awareness Voices of Education

  // Sexual assault
  'rainn.org',
  'nsvrc.org', // National Sexual Violence Resource Center

  // Domestic violence
  'thehotline.org',
  'ncadv.org', // National Coalition Against Domestic Violence
  'nnedv.org', // National Network to End Domestic Violence
  'loveisrespect.org',

  // Child abuse
  'childhelp.org',
  'preventchildabuse.org',
  'darkness2light.org',

  // Mental health crisis
  'samhsa.gov',
  'nami.org', // National Alliance on Mental Illness
  'mentalhealth.gov',
  'findtreatment.gov',

  // LGBTQ+ crisis
  'thetrevorproject.org',
  'translifeline.org',
  'glaad.org',
  'pflag.org',

  // Teen/youth crisis
  'teenlineonline.org',
  'yourlifeyourvoice.org',
  'kidshelp.com.au',
  'kidshelpphone.ca',

  // General crisis support
  'imalive.org',
  'befrienders.org',
  'samaritans.org',
  'iasp.info', // International Association for Suicide Prevention

  // URL shorteners - Story 11.4: Over-blocking to prevent crisis link exposure
  // Note: This blocks ALL links from these services, which is acceptable
  // per AC7 (false positives preferred to false negatives)
  'bit.ly',
  't.co', // Twitter/X
  'tinyurl.com',
  'goo.gl',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'tiny.cc',
  'rb.gy',
  'cutt.ly',
]

// Cached allowlist for fast lookups
let cachedDomainSet: Set<string> | null = null
let cachedAllowlistVersion: string | null = null

/**
 * Extract the domain from a URL
 * Handles various URL formats and normalizes for comparison
 * @param url - The URL to extract domain from
 * @returns Normalized domain or null if invalid
 */
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url)
    // Normalize: remove www prefix, lowercase
    let domain = urlObj.hostname.toLowerCase()
    if (domain.startsWith('www.')) {
      domain = domain.substring(4)
    }
    return domain
  } catch {
    // Invalid URL
    return null
  }
}

/**
 * Build domain set from allowlist for O(1) lookups
 * Called once when allowlist is loaded/updated
 */
function buildDomainSet(domains: string[]): Set<string> {
  const set = new Set<string>()
  for (const domain of domains) {
    // Normalize and add domain
    const normalized = domain.toLowerCase().trim()
    if (normalized) {
      set.add(normalized)
      // Also add www variant for matching
      if (!normalized.startsWith('www.')) {
        set.add('www.' + normalized)
      }
    }
  }
  return set
}

/**
 * Calculate Levenshtein distance between two strings
 * Uses Wagner-Fischer algorithm with early exit optimization
 *
 * Story 7.5: Fuzzy Domain Matching
 *
 * @param a - First string
 * @param b - Second string
 * @param maxDistance - Maximum distance to compute (for early exit optimization)
 * @returns Levenshtein distance, or maxDistance + 1 if distance exceeds threshold
 */
function levenshteinDistance(
  a: string,
  b: string,
  maxDistance: number = FUZZY_MATCH_THRESHOLD
): number {
  // CRITICAL: Bounds check to prevent DoS via massive strings
  if (a.length > MAX_DOMAIN_LENGTH_FOR_FUZZY || b.length > MAX_DOMAIN_LENGTH_FOR_FUZZY) {
    return maxDistance + 1
  }

  // Early exit: length difference exceeds max distance
  if (Math.abs(a.length - b.length) > maxDistance) {
    return maxDistance + 1
  }

  // Edge cases
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const m = a.length
  const n = b.length

  // Use two rows for space optimization
  let prevRow = new Array(n + 1)
  let currRow = new Array(n + 1)

  // Initialize first row
  for (let j = 0; j <= n; j++) {
    prevRow[j] = j
  }

  for (let i = 1; i <= m; i++) {
    currRow[0] = i
    let minInRow = currRow[0]

    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        currRow[j] = prevRow[j - 1]
      } else {
        currRow[j] = 1 + Math.min(prevRow[j], currRow[j - 1], prevRow[j - 1])
      }
      minInRow = Math.min(minInRow, currRow[j])
    }

    // Early exit: if minimum in row exceeds max, no point continuing
    if (minInRow > maxDistance) {
      return maxDistance + 1
    }

    // Swap rows
    ;[prevRow, currRow] = [currRow, prevRow]
  }

  return prevRow[n]
}

/**
 * Extract base domain (strip subdomains except www)
 * "chat.rainn.org" → "rainn.org"
 * "www.rainn.org" → "rainn.org"
 * "rainn.org" → "rainn.org"
 *
 * @param domain - The full domain
 * @returns Base domain (last two parts), or empty string if invalid
 */
function extractBaseDomain(domain: string): string {
  // Validate input
  if (!domain || typeof domain !== 'string') {
    return ''
  }

  // Remove any trailing/leading dots and normalize
  const normalized = domain.trim().replace(/^\.+|\.+$/g, '')
  if (!normalized) {
    return ''
  }

  const parts = normalized.split('.')

  // Filter out empty parts (e.g., "rainn..org" -> ["rainn", "", "org"])
  const validParts = parts.filter((part) => part.length > 0)

  if (validParts.length === 0) {
    return ''
  }

  // If it's already 2 parts or less (e.g., "rainn.org"), return as-is
  if (validParts.length <= 2) {
    return validParts.join('.')
  }

  // For multi-level TLDs like .com.au, .co.uk - keep last 3 parts
  const knownMultiLevelTLDs = ['com.au', 'co.uk', 'org.uk', 'com.br', 'co.nz']
  const lastTwo = validParts.slice(-2).join('.')
  if (knownMultiLevelTLDs.includes(lastTwo)) {
    return validParts.slice(-3).join('.')
  }

  // Default: return last 2 parts
  return validParts.slice(-2).join('.')
}

/**
 * Check if a domain fuzzy-matches any protected domain
 * Uses Levenshtein distance with threshold of 2
 *
 * Story 7.5: Fuzzy Domain Matching
 * OPTIMIZATION: First-character pre-filtering for performance
 *
 * @param inputDomain - The domain to check (should be base domain)
 * @returns Object with matched domain and distance, or null if no match
 */
function findFuzzyMatch(inputDomain: string): { matchedDomain: string; distance: number } | null {
  // Skip fuzzy matching for very short domains (high false positive risk)
  if (inputDomain.length < MIN_DOMAIN_LENGTH_FOR_FUZZY) {
    return null
  }

  // Skip fuzzy matching for overly long domains (DoS prevention)
  if (inputDomain.length > MAX_DOMAIN_LENGTH_FOR_FUZZY) {
    return null
  }

  const firstChar = inputDomain[0]?.toLowerCase() || ''

  // Check against all default crisis domains
  for (const protectedDomain of DEFAULT_CRISIS_SITES) {
    // Skip URL shorteners - they're already exact-matched and shouldn't fuzzy match
    if (protectedDomain.length < MIN_DOMAIN_LENGTH_FOR_FUZZY) {
      continue
    }

    // PERFORMANCE OPTIMIZATION: First character must match
    // Levenshtein distance ≤2 means at most 2 edits, so first char usually matches in real typos
    // This reduces O(n) Levenshtein calls to ~O(1) for most domains
    const protectedFirstChar = protectedDomain[0]?.toLowerCase() || ''
    if (firstChar !== protectedFirstChar) {
      continue
    }

    const distance = levenshteinDistance(inputDomain, protectedDomain, FUZZY_MATCH_THRESHOLD)
    if (distance <= FUZZY_MATCH_THRESHOLD && distance > 0) {
      // Found a fuzzy match (distance > 0 means it's not exact)
      return { matchedDomain: protectedDomain, distance }
    }
  }

  return null
}

/**
 * Log a fuzzy match to the improvement queue
 * Used to identify common typos that could be added as aliases
 *
 * Story 7.5: Fuzzy Domain Matching
 *
 * PRIVACY: Only logs domain information, NO user/family identifiers
 *
 * @param candidateDomain - The domain that was checked
 * @param matchedDomain - The protected domain it matched
 * @param distance - Levenshtein distance
 */
async function logFuzzyMatch(
  candidateDomain: string,
  matchedDomain: string,
  distance: number
): Promise<void> {
  try {
    // Get existing queue
    const result = await chrome.storage.local.get(FUZZY_MATCH_QUEUE_KEY)
    const queue: Array<{
      candidateDomain: string
      matchedDomain: string
      distance: number
      timestamp: number
    }> = result[FUZZY_MATCH_QUEUE_KEY] || []

    // Add new entry
    queue.push({
      candidateDomain,
      matchedDomain,
      distance,
      timestamp: Date.now(),
    })

    // Trim to max size (FIFO)
    while (queue.length > MAX_FUZZY_QUEUE_SIZE) {
      queue.shift()
    }

    // Save queue
    await chrome.storage.local.set({ [FUZZY_MATCH_QUEUE_KEY]: queue })
  } catch {
    // Silent fail - don't let logging affect protection
    console.warn('[Fledgely] Failed to log fuzzy match (non-critical)')
  }
}

/**
 * Get the current allowlist (from cache or storage)
 * Falls back to default bundled list if storage fails
 */
async function getAllowlist(): Promise<CrisisAllowlist> {
  try {
    const result = await chrome.storage.local.get(ALLOWLIST_STORAGE_KEY)
    if (result[ALLOWLIST_STORAGE_KEY]) {
      return result[ALLOWLIST_STORAGE_KEY]
    }
  } catch {
    // Storage error - use default
    console.warn('[Fledgely] Failed to read crisis allowlist from storage, using defaults')
  }

  // Return default bundled allowlist
  return {
    version: 'bundled-v1',
    lastUpdated: 0,
    domains: DEFAULT_CRISIS_SITES,
  }
}

/**
 * Initialize the allowlist cache
 * Should be called on extension startup
 */
export async function initializeAllowlist(): Promise<void> {
  const allowlist = await getAllowlist()
  cachedDomainSet = buildDomainSet(allowlist.domains)
  cachedAllowlistVersion = allowlist.version
  console.log(
    `[Fledgely] Crisis allowlist initialized: ${cachedDomainSet.size} domains (v${cachedAllowlistVersion})`
  )
}

/**
 * Check if a URL is protected by the crisis allowlist
 *
 * This is the CRITICAL function for the zero data path (INV-001).
 * It must:
 * - Complete in <10ms
 * - Return true if URL is protected (skip capture)
 * - Return true on any error (fail-safe)
 * - NEVER log the URL itself
 *
 * Story 7.5 Enhancement: Fuzzy matching for typos (Levenshtein distance ≤2)
 *
 * @param url - The URL to check
 * @returns true if protected (skip capture), false if not protected (proceed)
 */
export function isUrlProtected(url: string): boolean {
  // Performance: start timing
  const startTime = performance.now()

  try {
    // Ensure cache is initialized (sync check)
    if (!cachedDomainSet) {
      // Cache not initialized - this is a fail-safe situation
      // Build from defaults synchronously
      cachedDomainSet = buildDomainSet(DEFAULT_CRISIS_SITES)
      console.warn('[Fledgely] Crisis allowlist cache was not initialized, using defaults')
    }

    // Extract domain from URL
    const domain = extractDomain(url)
    if (!domain) {
      // Invalid URL - not protected (but capture will likely fail anyway)
      return false
    }

    // Step 1: Check if domain matches allowlist (O(1) exact match)
    if (cachedDomainSet.has(domain)) {
      return true
    }

    // Step 2: Story 7.5 - Fuzzy matching for typos
    // Extract base domain for comparison (strip subdomains)
    const baseDomain = extractBaseDomain(domain)

    // Try fuzzy match against all protected domains
    const fuzzyMatch = findFuzzyMatch(baseDomain)
    if (fuzzyMatch) {
      // Log the fuzzy match for improvement queue (async, non-blocking)
      // This is fire-and-forget - we don't wait for it
      logFuzzyMatch(baseDomain, fuzzyMatch.matchedDomain, fuzzyMatch.distance).catch(() => {
        // Silently ignore logging errors
      })
      return true
    }

    // Performance check
    const duration = performance.now() - startTime
    if (duration > 10) {
      console.warn(`[Fledgely] Crisis allowlist check took ${duration.toFixed(2)}ms (target <10ms)`)
    }

    return false
  } catch {
    // Any error = fail-safe = skip capture
    console.error('[Fledgely] Crisis allowlist check failed, skipping capture (fail-safe)')
    return true
  }
}

/**
 * Update the cached allowlist from network
 * Called periodically to sync with latest crisis resources
 * Story 11.2 will implement the full sync logic
 *
 * @param newAllowlist - The new allowlist data
 */
export async function updateAllowlist(newAllowlist: CrisisAllowlist): Promise<void> {
  try {
    // Validate the new allowlist
    if (!newAllowlist.domains || newAllowlist.domains.length === 0) {
      console.warn('[Fledgely] Received empty allowlist update, keeping existing')
      return
    }

    // Save to storage
    await chrome.storage.local.set({ [ALLOWLIST_STORAGE_KEY]: newAllowlist })

    // Update cache
    cachedDomainSet = buildDomainSet(newAllowlist.domains)
    cachedAllowlistVersion = newAllowlist.version

    console.log(
      `[Fledgely] Crisis allowlist updated: ${cachedDomainSet.size} domains (v${cachedAllowlistVersion})`
    )
  } catch {
    console.error('[Fledgely] Failed to update crisis allowlist')
  }
}

/**
 * Get the current allowlist version for debugging
 * Does NOT return the actual allowlist contents (privacy)
 */
export function getAllowlistVersion(): string {
  return cachedAllowlistVersion || 'not-initialized'
}

/**
 * Get the count of protected domains for debugging
 * Does NOT return the actual domains (privacy)
 */
export function getProtectedDomainCount(): number {
  return cachedDomainSet?.size || 0
}

/**
 * Check if the cached allowlist is stale and needs refresh
 * @param maxAgeMs Maximum age in milliseconds (default 24 hours)
 * @returns true if cache is stale or missing
 */
export async function isAllowlistStale(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<boolean> {
  try {
    const allowlist = await getAllowlist()
    if (allowlist.lastUpdated === 0) {
      // Bundled defaults - no network sync yet
      return true
    }
    const age = Date.now() - allowlist.lastUpdated
    return age > maxAgeMs
  } catch {
    return true
  }
}

/**
 * Transform CrisisResource[] from API to domain list
 * Story 7.7: AC5 Format Transformation
 *
 * Extracts primary domains and aliases from each resource.
 * PRIVACY: Only extracts domain information, no logging of actual domains.
 *
 * @param resources - Array of crisis resources from API
 * @returns Array of domains for allowlist matching
 */
function transformResourcesToDomains(resources: CrisisResourceFromAPI[]): string[] {
  const domains: string[] = []
  for (const resource of resources) {
    // Add primary domain
    if (resource.domain) {
      domains.push(resource.domain.toLowerCase())
    }
    // Add all aliases (these are domain variations/typos)
    if (resource.aliases && Array.isArray(resource.aliases)) {
      for (const alias of resource.aliases) {
        if (alias && typeof alias === 'string') {
          domains.push(alias.toLowerCase())
        }
      }
    }
  }
  return domains
}

/**
 * Sync allowlist from server
 * Story 7.7: Allowlist Distribution & Sync
 *
 * Fetches the crisis allowlist from the Fledgely API.
 * AC1: Fetches from GET /getCrisisAllowlist
 * AC3: Fail-safe caching (uses cached on error)
 * AC4: Version mismatch re-sync
 * AC5: Format transformation
 *
 * CRITICAL: On ANY error, return false and keep using cached version.
 * Never leave the extension without protection.
 *
 * @returns true if allowlist was updated, false otherwise
 */
export async function syncAllowlistFromServer(): Promise<boolean> {
  console.log('[Fledgely] Crisis allowlist sync requested')

  try {
    // Get current cached version for comparison
    const currentAllowlist = await getAllowlist()
    const cachedVersion = currentAllowlist.version

    // Fetch from API with timeout (10 seconds)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(CRISIS_ALLOWLIST_API, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        // Send cached version for ETag-style optimization
        ...(cachedVersion && cachedVersion !== 'bundled-v1'
          ? { 'If-None-Match': `"${cachedVersion}"` }
          : {}),
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // Handle 304 Not Modified (cached version is current)
    if (response.status === 304) {
      console.log(`[Fledgely] Allowlist sync: cached version ${cachedVersion} is current`)
      // Update lastUpdated to show successful check
      await updateAllowlist({
        ...currentAllowlist,
        lastUpdated: Date.now(),
      })
      return false
    }

    // Handle non-success responses
    if (!response.ok) {
      console.warn(`[Fledgely] Allowlist sync: API returned ${response.status}, using cached`)
      return false
    }

    // Parse API response
    const data: GetAllowlistAPIResponse = await response.json()

    // Validate response structure
    if (!data.version || !data.resources || !Array.isArray(data.resources)) {
      console.warn('[Fledgely] Allowlist sync: Invalid API response format, using cached')
      return false
    }

    // AC4: Check if version is different (re-sync needed)
    if (data.version === cachedVersion) {
      console.log(`[Fledgely] Allowlist sync: version ${data.version} unchanged`)
      // Update lastUpdated even if version unchanged
      await updateAllowlist({
        ...currentAllowlist,
        lastUpdated: Date.now(),
      })
      return false
    }

    // AC5: Transform resources to domain list
    const domains = transformResourcesToDomains(data.resources)

    // Validate we got at least some domains
    if (domains.length === 0) {
      console.warn('[Fledgely] Allowlist sync: API returned empty domain list, using cached')
      return false
    }

    // Merge with bundled defaults for fail-safe (bundled are always included)
    const mergedDomains = Array.from(new Set([...DEFAULT_CRISIS_SITES, ...domains]))

    // Update the allowlist
    await updateAllowlist({
      version: data.version,
      lastUpdated: Date.now(),
      domains: mergedDomains,
    })

    // Log version transition (no domain contents for privacy)
    console.log(
      `[Fledgely] Allowlist updated: ${cachedVersion} → ${data.version} (${mergedDomains.length} domains)`
    )

    return true
  } catch (error) {
    // AC3: Fail-safe - any error means keep using cached version
    // This includes network errors, JSON parse errors, AbortError, etc.
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[Fledgely] Allowlist sync: request timed out, using cached')
    } else {
      console.warn('[Fledgely] Allowlist sync: request failed, using cached')
    }
    return false
  }
}

/**
 * Get the age of the cached allowlist in human-readable format
 * @returns Age string or "bundled" if never synced
 */
export async function getAllowlistAge(): Promise<string> {
  try {
    const allowlist = await getAllowlist()
    if (allowlist.lastUpdated === 0) {
      return 'bundled'
    }
    const ageMs = Date.now() - allowlist.lastUpdated
    const ageHours = Math.floor(ageMs / (60 * 60 * 1000))
    if (ageHours < 1) {
      return 'less than 1 hour'
    } else if (ageHours < 24) {
      return `${ageHours} hour${ageHours === 1 ? '' : 's'}`
    } else {
      const ageDays = Math.floor(ageHours / 24)
      return `${ageDays} day${ageDays === 1 ? '' : 's'}`
    }
  } catch {
    return 'unknown'
  }
}

// Export default sites for testing
export const DEFAULT_CRISIS_DOMAINS = DEFAULT_CRISIS_SITES

// Export internal functions for testing (Story 11.6, Story 7.5, Story 7.7)
// These are NOT part of the public API but needed for comprehensive testing
export const _testExports = {
  extractDomain,
  buildDomainSet,
  levenshteinDistance,
  extractBaseDomain,
  findFuzzyMatch,
  logFuzzyMatch,
  transformResourcesToDomains,
  FUZZY_MATCH_THRESHOLD,
  MIN_DOMAIN_LENGTH_FOR_FUZZY,
  MAX_DOMAIN_LENGTH_FOR_FUZZY,
  FUZZY_MATCH_QUEUE_KEY,
  CRISIS_ALLOWLIST_API,
  resetCache: () => {
    cachedDomainSet = null
    cachedAllowlistVersion = null
  },
}
