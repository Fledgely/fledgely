/**
 * Crisis Search Detection Module
 *
 * Story 7.6: Crisis Search Redirection
 *
 * Exports for crisis search keyword detection and categorization.
 */

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
} from './keywords'
