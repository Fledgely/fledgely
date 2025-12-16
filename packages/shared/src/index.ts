/**
 * @fledgely/shared
 *
 * Shared constants, utilities, and crisis allowlist for Fledgely platform.
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
} from './constants/crisis-urls'
