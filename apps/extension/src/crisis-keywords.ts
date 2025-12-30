/**
 * Crisis Keywords Module for Fledgely Chrome Extension
 *
 * This module detects crisis-related search queries to trigger
 * the optional crisis resource interstitial (Story 7.6).
 *
 * CRITICAL PRIVACY RULES:
 * - Query is checked in memory ONLY - never stored
 * - Query is NEVER logged or transmitted
 * - Only the detection result (boolean + category) is passed to content script
 * - All processing is synchronous and local
 */

/**
 * Category weights - higher weight = more likely crisis intent
 * These are used to prevent false positives on common words
 */
interface CrisisCategory {
  weight: number
  terms: string[]
}

/**
 * Crisis keyword categories with weighted terms
 * Weight determines threshold - higher weight categories need fewer matches
 */
export const CRISIS_KEYWORDS: Record<string, CrisisCategory> = {
  suicide: {
    weight: 10,
    terms: [
      'kill myself',
      'suicide',
      'suicidal',
      'want to die',
      'end my life',
      'ending it all',
      'suicide hotline',
      'suicide help',
      'how to commit',
      'painless way to die',
      "i don't want to live",
      'no reason to live',
      'better off dead',
      'ways to kill',
    ],
  },
  self_harm: {
    weight: 8,
    terms: [
      'cut myself',
      'self harm',
      'self-harm',
      'hurt myself',
      'cutting myself',
      'self injury',
      'self-injury',
      'burn myself',
      'harming myself',
      'punish myself',
    ],
  },
  abuse: {
    weight: 8,
    terms: [
      'being abused',
      'parent hits me',
      'parent hurts me',
      'someone hurts me',
      'sexually abused',
      'molested',
      'raped',
      'child abuse',
      'domestic violence',
      'abusive parent',
      'abusive home',
      'my dad hits',
      'my mom hits',
      'beaten at home',
      'physical abuse',
      'emotional abuse',
    ],
  },
  crisis_helpline: {
    weight: 10,
    terms: [
      'crisis helpline',
      'crisis hotline',
      'crisis line',
      'crisis chat',
      'crisis text',
      'mental health crisis',
      'emergency mental health',
      'need help now',
      'i need help',
      'someone help me',
      'help me please',
    ],
  },
  eating_disorder: {
    weight: 6,
    terms: [
      'anorexia help',
      'bulimia help',
      'eating disorder',
      'starving myself',
      'purging',
      'binge eating',
      'hate my body',
      'too fat to live',
      'ana tips', // ED community term
      'mia tips', // ED community term
    ],
  },
  lgbtq_crisis: {
    weight: 8,
    terms: [
      'trevor project',
      'trans lifeline',
      'lgbtq help',
      'gay teen help',
      'coming out scared',
      'parents hate gay',
      'kicked out gay',
      'homeless lgbt',
      'trans suicide',
    ],
  },
  runaway: {
    weight: 7,
    terms: [
      'running away help',
      'want to run away',
      'homeless teen',
      'nowhere to go',
      'kicked out of home',
      'living on streets',
      'runaway hotline',
    ],
  },
  depression: {
    weight: 5, // Lower weight - more common searches, need more context
    terms: [
      'severe depression help',
      'clinical depression crisis',
      "can't get out of bed",
      'too depressed to function',
      'depression emergency',
      'feeling hopeless',
      'nothing matters anymore',
    ],
  },
}

/**
 * Minimum confidence weight to trigger crisis detection
 * This prevents false positives on low-weight categories
 */
const CRISIS_THRESHOLD = 5

/**
 * Minimum query length to check (prevent false positives on very short queries)
 */
const MIN_QUERY_LENGTH = 3

/**
 * Maximum query length to check (DoS prevention)
 */
const MAX_QUERY_LENGTH = 500

/**
 * Result of crisis search detection
 */
export interface CrisisSearchResult {
  /** Whether the query appears to be crisis-related */
  isCrisis: boolean
  /** The category of crisis detected (if any) */
  category?: string
  /** Confidence score (for debugging/tuning, not exposed to users) */
  confidence?: number
}

/**
 * Normalize a query for matching
 * Handles case, extra whitespace, and common variations
 */
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/[\u2018\u2019\u2032\u0060]/g, "'") // Normalize various apostrophe/quote chars to '
    .replace(/[\u201c\u201d\u2033]/g, '"') // Normalize various double quote chars to "
}

/**
 * Check if a search query indicates crisis-related intent
 *
 * PRIVACY: This function NEVER stores or logs the query.
 * It only returns a detection result.
 *
 * @param query - The search query to check
 * @returns Detection result with category (if crisis detected)
 */
export function isCrisisSearch(query: string): CrisisSearchResult {
  // Input validation
  if (!query || typeof query !== 'string') {
    return { isCrisis: false }
  }

  // Length bounds checking (DoS prevention)
  if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
    return { isCrisis: false }
  }

  const normalizedQuery = normalizeQuery(query)

  let maxWeight = 0
  let matchedCategory: string | undefined

  // Check each category
  for (const [category, { weight, terms }] of Object.entries(CRISIS_KEYWORDS)) {
    for (const term of terms) {
      if (normalizedQuery.includes(term.toLowerCase())) {
        // Track highest weight match
        if (weight > maxWeight) {
          maxWeight = weight
          matchedCategory = category
        }
        // Break inner loop - we found a match in this category
        break
      }
    }
  }

  // Check against threshold
  const isCrisis = maxWeight >= CRISIS_THRESHOLD

  return {
    isCrisis,
    category: isCrisis ? matchedCategory : undefined,
    confidence: maxWeight,
  }
}

/**
 * Get the friendly display name for a crisis category
 * Used in the interstitial to show relevant resources
 *
 * @param category - Internal category name
 * @returns User-friendly category display name
 */
export function getCategoryDisplayName(category: string): string {
  const displayNames: Record<string, string> = {
    suicide: 'Feeling Really Low',
    self_harm: 'Hurting Yourself',
    abuse: 'Someone Is Hurting You',
    crisis_helpline: 'Need to Talk',
    eating_disorder: 'Food & Body',
    lgbtq_crisis: 'LGBTQ+ Support',
    runaway: 'Home Troubles',
    depression: 'Feeling Down',
  }

  return displayNames[category] || 'Need Help'
}

/**
 * Get relevant crisis resources for a category
 * Returns a subset of the crisis allowlist relevant to the detected category
 *
 * @param category - The detected crisis category
 * @returns Array of relevant crisis resources
 */
export function getRelevantResources(category: string): Array<{
  name: string
  domain: string
  phone?: string
  text?: string
  description: string
}> {
  // Map categories to most relevant resources
  const categoryResources: Record<
    string,
    Array<{
      name: string
      domain: string
      phone?: string
      text?: string
      description: string
    }>
  > = {
    suicide: [
      {
        name: '988 Suicide & Crisis Lifeline',
        domain: '988lifeline.org',
        phone: '988',
        text: 'Text 988',
        description: 'Free, confidential support 24/7',
      },
      {
        name: 'Crisis Text Line',
        domain: 'crisistextline.org',
        text: 'Text HOME to 741741',
        description: 'Text with a trained counselor',
      },
      {
        name: 'Trevor Project',
        domain: 'thetrevorproject.org',
        phone: '1-866-488-7386',
        text: 'Text START to 678-678',
        description: 'LGBTQ+ youth crisis support',
      },
    ],
    self_harm: [
      {
        name: 'Crisis Text Line',
        domain: 'crisistextline.org',
        text: 'Text HOME to 741741',
        description: 'Text with a trained counselor',
      },
      {
        name: 'SAMHSA Helpline',
        domain: 'samhsa.gov',
        phone: '1-800-662-4357',
        description: 'Mental health & substance help',
      },
    ],
    abuse: [
      {
        name: 'Childhelp National Hotline',
        domain: 'childhelp.org',
        phone: '1-800-422-4453',
        description: 'Help for child abuse',
      },
      {
        name: 'RAINN',
        domain: 'rainn.org',
        phone: '1-800-656-4673',
        description: 'Sexual assault support',
      },
      {
        name: 'National Domestic Violence Hotline',
        domain: 'thehotline.org',
        phone: '1-800-799-7233',
        text: 'Text START to 88788',
        description: 'Help for domestic violence',
      },
    ],
    crisis_helpline: [
      {
        name: '988 Suicide & Crisis Lifeline',
        domain: '988lifeline.org',
        phone: '988',
        text: 'Text 988',
        description: 'Free, confidential support 24/7',
      },
      {
        name: 'Crisis Text Line',
        domain: 'crisistextline.org',
        text: 'Text HOME to 741741',
        description: 'Text with a trained counselor',
      },
    ],
    eating_disorder: [
      {
        name: 'National Eating Disorders Association',
        domain: 'nationaleatingdisorders.org',
        phone: '1-800-931-2237',
        text: 'Text NEDA to 741741',
        description: 'Eating disorder support',
      },
      {
        name: 'Crisis Text Line',
        domain: 'crisistextline.org',
        text: 'Text HOME to 741741',
        description: 'Text with a trained counselor',
      },
    ],
    lgbtq_crisis: [
      {
        name: 'Trevor Project',
        domain: 'thetrevorproject.org',
        phone: '1-866-488-7386',
        text: 'Text START to 678-678',
        description: 'LGBTQ+ youth crisis support',
      },
      {
        name: 'Trans Lifeline',
        domain: 'translifeline.org',
        phone: '1-877-565-8860',
        description: 'Trans peer support hotline',
      },
    ],
    runaway: [
      {
        name: 'National Runaway Safeline',
        domain: '1800runaway.org',
        phone: '1-800-786-2929',
        description: 'Help for runaways and homeless youth',
      },
      {
        name: 'Crisis Text Line',
        domain: 'crisistextline.org',
        text: 'Text HOME to 741741',
        description: 'Text with a trained counselor',
      },
    ],
    depression: [
      {
        name: '988 Suicide & Crisis Lifeline',
        domain: '988lifeline.org',
        phone: '988',
        text: 'Text 988',
        description: 'Free, confidential support 24/7',
      },
      {
        name: 'NAMI Helpline',
        domain: 'nami.org',
        phone: '1-800-950-6264',
        description: 'Mental health information and support',
      },
    ],
  }

  return (
    categoryResources[category] || [
      {
        name: '988 Suicide & Crisis Lifeline',
        domain: '988lifeline.org',
        phone: '988',
        text: 'Text 988',
        description: 'Free, confidential support 24/7',
      },
      {
        name: 'Crisis Text Line',
        domain: 'crisistextline.org',
        text: 'Text HOME to 741741',
        description: 'Text with a trained counselor',
      },
    ]
  )
}

// Export constants for testing
export const _testExports = {
  CRISIS_THRESHOLD,
  MIN_QUERY_LENGTH,
  MAX_QUERY_LENGTH,
  normalizeQuery,
}
