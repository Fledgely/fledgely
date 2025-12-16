/**
 * @fledgely/shared
 *
 * Shared constants, utilities, and crisis allowlist for Fledgely platform.
 *
 * ## Crisis URL Detection
 *
 * @example
 * ```typescript
 * import { getCrisisAllowlist, isCrisisUrl } from '@fledgely/shared'
 *
 * // Check if a URL is a crisis resource
 * const isProtected = isCrisisUrl('https://988lifeline.org')
 *
 * // Get the full allowlist
 * const allowlist = getCrisisAllowlist()
 * ```
 *
 * ## Crisis Search Detection (Story 7.6)
 *
 * Detect crisis-related search queries for gentle redirection to resources.
 *
 * @example
 * ```typescript
 * import { isCrisisSearchQuery, getResourcesForCategory } from '@fledgely/shared'
 *
 * // Check if a search query indicates crisis intent
 * const match = isCrisisSearchQuery('how to get help')
 * if (match) {
 *   console.log(`Detected ${match.category} intent with ${match.confidence} confidence`)
 *   const resources = getResourcesForCategory(match.category)
 *   // Show gentle interstitial with resources
 * }
 * ```
 *
 * ## Chrome Extension Integration (Epic 11)
 *
 * Crisis search detection is designed for use in browser extensions:
 *
 * 1. **Content Script Usage**: Functions are synchronous and browser-safe
 * 2. **No Network Calls**: Detection uses bundled data, no API calls needed
 * 3. **Zero-Data-Path**: No logging - queries are checked and immediately discarded
 *
 * @example Content Script Integration
 * ```typescript
 * // In content script (e.g., interceptSearch.ts)
 * import { isCrisisSearchQuery, getResourcesForCategory } from '@fledgely/shared'
 *
 * // Listen for form submissions or URL changes
 * document.addEventListener('submit', (e) => {
 *   const form = e.target as HTMLFormElement
 *   const query = new FormData(form).get('q')?.toString()
 *
 *   if (query) {
 *     const match = isCrisisSearchQuery(query)
 *     if (match) {
 *       e.preventDefault()
 *       // Show overlay with crisis resources
 *       showCrisisInterstitial(match, getResourcesForCategory(match.category))
 *     }
 *   }
 * })
 * ```
 *
 * @example Service Worker Integration
 * ```typescript
 * // In service worker (background.ts)
 * import { isCrisisSearchQuery } from '@fledgely/shared'
 *
 * chrome.webNavigation.onBeforeNavigate.addListener((details) => {
 *   const url = new URL(details.url)
 *   const query = url.searchParams.get('q')
 *
 *   if (query && isCrisisSearchQuery(query)) {
 *     // Inject interstitial content script
 *     chrome.scripting.executeScript({
 *       target: { tabId: details.tabId },
 *       files: ['crisisInterstitial.js']
 *     })
 *   }
 * })
 * ```
 */

// Crisis URL exports
export {
  // Schemas
  crisisResourceCategorySchema,
  crisisUrlEntrySchema,
  crisisAllowlistSchema,
  allowlistVersionSchema,
  contactMethodSchema,
  // Types
  type CrisisResourceCategory,
  type CrisisUrlEntry,
  type CrisisAllowlist,
  type ContactMethod,
  type ParsedVersion,
  // Story 7.5: Fuzzy matching types
  type CrisisUrlFuzzyResult,
  type FuzzyMatchResult,
  // API functions
  getCrisisAllowlist,
  isCrisisUrl,
  getCrisisResourceByDomain,
  getCrisisResourcesByCategory,
  getCrisisResourcesByRegion,
  getAllCategories,
  getAllRegions,
  getCrisisResourceCount,
  searchCrisisResources,
  extractDomain,
  // Version management
  getAllowlistVersion,
  getParsedAllowlistVersion,
  isAllowlistStale,
  compareVersions,
  getLastUpdated,
  isOlderThan,
  parseAllowlistVersion,
  createAllowlistVersion,
  // Story 7.5: Fuzzy matching functions
  isCrisisUrlFuzzy,
  levenshteinDistance,
  parseDomain,
  isBlocklisted,
  lengthRatio,
  fuzzyDomainMatch,
  shouldAttemptFuzzyMatch,
  // Story 7.5: Fuzzy matching constants
  MAX_LEVENSHTEIN_DISTANCE,
  MIN_DOMAIN_LENGTH,
  MIN_LENGTH_RATIO,
  FUZZY_BLOCKLIST,
} from './constants/crisis-urls'

// Story 7.6: Crisis Search exports
export {
  // Types
  type CrisisSearchCategory,
  type CrisisSearchConfidence,
  type CrisisSearchMatch,
  // Constants
  CRISIS_SEARCH_CATEGORIES,
  CRISIS_SEARCH_KEYWORDS,
  CRISIS_SEARCH_PHRASES,
  // Functions
  isCrisisSearchQuery,
  getResourcesForCategory,
  getAllCrisisCategories,
} from './constants/crisis-search'

// Story 7.7: Allowlist Sync Service exports
export {
  // Types
  type AllowlistSyncConfig,
  type AllowlistSyncAdapter,
  type CachedAllowlist,
  type SyncResult,
  type AllowlistSyncService,
  // Factory function
  createAllowlistSyncService,
  // Utility functions
  isEmergencyVersion,
  compareSemanticVersions,
  shouldResync,
} from './services/allowlistSyncService'

// Story 7.7: Chrome Extension Adapter (for Epic 11)
export {
  // Types
  type ChromeExtensionAdapterConfig,
  type ChromeStorageResult,
  // Constants
  CHROME_CACHE_KEY,
  CHROME_ETAG_KEY,
  // Factory function
  createChromeExtensionAdapter,
} from './adapters/chromeExtensionAdapter'

// Story 7.8: Privacy Gap Scheduler Service
export {
  // Types
  type GapScheduleResult,
  // Functions
  generateDailyGapSchedule,
  createSeededRandom,
  generateSeed,
  randomIntFromSeed,
  getWakingHoursRange,
  distributeGapsWithSpacing,
  isTimestampInScheduledGap,
  getCurrentGap,
  getTimeUntilNextGap,
} from './services/privacyGapScheduler'

// Story 7.8: Privacy Gap Detector Service
export {
  // Types
  type PrivacyGapDetectorConfig,
  type CaptureSuppressResult,
  type PrivacyGapDetector,
  // Factory function
  createPrivacyGapDetector,
  // Utilities
  createInMemoryScheduleStore,
  createDefaultDetectorConfig,
} from './services/privacyGapDetector'

// Story 7.8: Web Capture Adapter (for platform integrations)
export {
  // Types
  type CaptureDecision,
  type WebCaptureAdapterConfig,
  type WebCaptureAdapter,
  // Factory function
  createWebCaptureAdapter,
} from './adapters/webCaptureAdapter'
