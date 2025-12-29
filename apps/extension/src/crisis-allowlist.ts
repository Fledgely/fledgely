/**
 * Crisis Allowlist Module for Fledgely Chrome Extension
 *
 * This module implements the pre-capture allowlist check for crisis resources.
 * It ensures the ZERO DATA PATH invariant (INV-001) - crisis sites are NEVER captured.
 *
 * Story 11.1: Pre-Capture Allowlist Check
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

// Storage key for cached allowlist
const ALLOWLIST_STORAGE_KEY = 'crisisAllowlist'

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

    // Check if domain matches allowlist
    // This is O(1) lookup using Set
    const isProtected = cachedDomainSet.has(domain)

    // Performance check
    const duration = performance.now() - startTime
    if (duration > 10) {
      console.warn(`[Fledgely] Crisis allowlist check took ${duration.toFixed(2)}ms (target <10ms)`)
    }

    return isProtected
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

// Export default sites for testing
export const DEFAULT_CRISIS_DOMAINS = DEFAULT_CRISIS_SITES
