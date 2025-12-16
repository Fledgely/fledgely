/**
 * Crisis Search Keywords Module
 *
 * Story 7.6: Crisis Search Redirection - Task 1
 *
 * Defines crisis search keywords and phrases organized by category
 * for detecting crisis-related search intent. Used to show gentle
 * resource suggestions before search results load.
 *
 * CRITICAL SAFETY: This is a zero-data-path feature.
 * No logging, no analytics, no parent notification.
 */

// Import types from Zod schemas (Rule: Types from Zod only)
import type {
  CrisisSearchCategory,
  CrisisSearchConfidence,
  CrisisSearchMatch,
} from '@fledgely/contracts'

// Re-export types for convenience
export type { CrisisSearchCategory, CrisisSearchConfidence, CrisisSearchMatch }

/**
 * Category data structure with keywords, phrases, and suggested resources
 */
interface CrisisSearchCategoryData {
  /** Single-word or short keywords */
  keywords: string[]
  /** Multi-word phrases (higher confidence) */
  phrases: string[]
  /** Suggested crisis resources for this category */
  resources: string[]
}

/**
 * Crisis search categories with keywords, phrases, and resources
 *
 * Categories:
 * - suicide: Suicide-related searches
 * - self_harm: Self-injury related searches
 * - abuse: Abuse and domestic violence searches
 * - help: General crisis help searches
 */
export const CRISIS_SEARCH_CATEGORIES: Record<CrisisSearchCategory, CrisisSearchCategoryData> = {
  suicide: {
    keywords: [
      'suicide',
      'suicidal',
      'kill myself',
      'end my life',
      'want to die',
      'dont want to live',
      "don't want to live",
      'not worth living',
      'better off dead',
      'no reason to live',
      'ending it all',
      'take my own life',
    ],
    phrases: [
      'how to kill myself',
      'ways to end my life',
      'painless death',
      'best way to die',
      'how to commit suicide',
      'suicide methods',
      'i want to kill myself',
      'i want to end my life',
      'i want to die',
      'want to die',
      'how to hang myself',
      'how to overdose',
      'suicide note',
    ],
    resources: ['988lifeline.org', 'suicidepreventionlifeline.org', 'crisistextline.org'],
  },
  self_harm: {
    keywords: [
      'self harm',
      'self-harm',
      'cutting',
      'hurt myself',
      'self injury',
      'self-injury',
      'harming myself',
      'cut myself',
      'burn myself',
      'punish myself',
    ],
    phrases: [
      'how to cut',
      'ways to hurt myself',
      'how to self harm',
      'how to self-harm',
      'i cut myself',
      'i hurt myself',
      'cutting myself',
      'burning myself',
    ],
    resources: ['crisistextline.org', 'selfinjury.com', 'sioutreach.org'],
  },
  abuse: {
    keywords: [
      'abuse',
      'abused',
      'abusive',
      'abusive parent',
      'domestic violence',
      'molested',
      'molestation',
      'sexual abuse',
      'child abuse',
      'beaten',
      'hitting me',
      'hurting me',
      'touching me',
    ],
    phrases: [
      'my parent hits me',
      'my dad hits me',
      'my mom hits me',
      'being molested',
      'being abused',
      'someone is hurting me',
      'being touched inappropriately',
      'my parent hurts me',
      'i am being abused',
      "i'm being abused",
      'sexually abused',
    ],
    resources: ['rainn.org', 'childhelp.org', 'thehotline.org', '1800runaway.org'],
  },
  help: {
    keywords: [
      'need help',
      'crisis',
      'emergency',
      'in danger',
      'scared',
      'afraid',
      'help me',
      'desperate',
      'hopeless',
      'nowhere to turn',
      'crisis hotline',
      'crisis line',
    ],
    phrases: [
      'i need help',
      'someone help me',
      'im in danger',
      "i'm in danger",
      'i am in danger',
      'please help me',
      'i dont know what to do',
      "i don't know what to do",
      'i feel hopeless',
      'i have no one',
      'nowhere to go',
    ],
    resources: ['988lifeline.org', 'crisistextline.org', 'boystown.org'],
  },
}

/**
 * Flat array of all crisis search keywords across all categories
 */
export const CRISIS_SEARCH_KEYWORDS: string[] = Object.values(CRISIS_SEARCH_CATEGORIES).flatMap(
  (category) => category.keywords
)

/**
 * Flat array of all crisis search phrases across all categories
 */
export const CRISIS_SEARCH_PHRASES: string[] = Object.values(CRISIS_SEARCH_CATEGORIES).flatMap(
  (category) => category.phrases
)

/**
 * Check if a search query indicates crisis-related intent
 *
 * Algorithm:
 * 1. Normalize query (lowercase, trim)
 * 2. Check phrase matches first (high confidence)
 * 3. Check keyword matches second (medium confidence)
 * 4. Return first match found, or null
 *
 * CRITICAL: This function must NEVER log or transmit the query.
 * This is a zero-data-path feature for child safety.
 *
 * @param query - The search query to analyze
 * @returns CrisisSearchMatch if crisis intent detected, null otherwise
 */
export function isCrisisSearchQuery(query: string): CrisisSearchMatch | null {
  // Normalize query
  const normalized = query.toLowerCase().trim()

  // Empty or whitespace-only query
  if (!normalized) {
    return null
  }

  // 1. Check phrase matches first (high confidence)
  for (const [categoryKey, categoryData] of Object.entries(CRISIS_SEARCH_CATEGORIES)) {
    for (const phrase of categoryData.phrases) {
      if (normalized.includes(phrase)) {
        return {
          query,
          category: categoryKey as CrisisSearchCategory,
          confidence: 'high',
          matchedPattern: phrase,
        }
      }
    }
  }

  // 2. Check keyword matches (medium confidence)
  for (const [categoryKey, categoryData] of Object.entries(CRISIS_SEARCH_CATEGORIES)) {
    for (const keyword of categoryData.keywords) {
      if (normalized.includes(keyword)) {
        return {
          query,
          category: categoryKey as CrisisSearchCategory,
          confidence: 'medium',
          matchedPattern: keyword,
        }
      }
    }
  }

  // No match found
  return null
}

/**
 * Get suggested crisis resources for a category
 *
 * @param category - The crisis category
 * @returns Array of resource domain names
 */
export function getResourcesForCategory(category: CrisisSearchCategory): string[] {
  const categoryData = CRISIS_SEARCH_CATEGORIES[category]
  return categoryData?.resources ?? []
}

/**
 * Get all crisis categories
 *
 * @returns Array of category keys
 */
export function getAllCrisisCategories(): CrisisSearchCategory[] {
  return Object.keys(CRISIS_SEARCH_CATEGORIES) as CrisisSearchCategory[]
}
