/**
 * Crisis Search Schemas
 *
 * Story 7.6: Crisis Search Redirection - Task 2
 *
 * Zod schemas for crisis search detection types.
 * Used by @fledgely/shared for keyword detection and
 * the web app for interstitial display.
 *
 * CRITICAL: This is a zero-data-path feature.
 * These schemas are for local processing only - no data is logged or transmitted.
 */

import { z } from 'zod'

/**
 * Crisis search category
 *
 * Categories of crisis-related searches:
 * - suicide: Suicide-related searches
 * - self_harm: Self-injury searches
 * - abuse: Abuse and domestic violence searches
 * - help: General crisis help searches
 */
export const crisisSearchCategorySchema = z.enum(['suicide', 'self_harm', 'abuse', 'help'])

export type CrisisSearchCategory = z.infer<typeof crisisSearchCategorySchema>

/**
 * Confidence level for crisis search matches
 *
 * - high: Exact phrase match (e.g., "how to kill myself")
 * - medium: Keyword match (e.g., "suicide")
 */
export const crisisSearchConfidenceSchema = z.enum(['high', 'medium'])

export type CrisisSearchConfidence = z.infer<typeof crisisSearchConfidenceSchema>

/**
 * Result of crisis search query analysis
 */
export const crisisSearchMatchSchema = z.object({
  /** The original query that was analyzed */
  query: z.string().min(1),
  /** Category of crisis detected */
  category: crisisSearchCategorySchema,
  /** Confidence level of the match */
  confidence: crisisSearchConfidenceSchema,
  /** The specific pattern that matched */
  matchedPattern: z.string().min(1),
})

export type CrisisSearchMatch = z.infer<typeof crisisSearchMatchSchema>

/**
 * Actions that can be taken on the crisis redirect interstitial
 *
 * NOTE: These are for component state only - NEVER logged or transmitted
 */
export const crisisRedirectActionSchema = z.enum([
  'shown', // Interstitial was displayed
  'dismissed', // User closed without action
  'resource_clicked', // User clicked a resource link
  'continued', // User chose to continue to search
])

export type CrisisRedirectAction = z.infer<typeof crisisRedirectActionSchema>

/**
 * Result of checking a search query for crisis intent
 */
export const crisisSearchResultSchema = z.object({
  /** Whether to show the crisis interstitial */
  shouldShowInterstitial: z.boolean(),
  /** The match details, if any */
  match: crisisSearchMatchSchema.nullable(),
  /** Suggested crisis resources for the detected category */
  suggestedResources: z.array(z.string()),
})

export type CrisisSearchResult = z.infer<typeof crisisSearchResultSchema>
