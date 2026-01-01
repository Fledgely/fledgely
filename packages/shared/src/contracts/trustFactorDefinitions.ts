/**
 * Trust Factor Definitions - Story 36.1
 *
 * Factor definitions with point values and categories.
 * AC5: Factors breakdown: which behaviors contributed
 */

import type { TrustFactorType, TrustFactorCategory, TrustFactor } from './trustScore'

// ============================================================================
// Trust Factor Definition Type
// ============================================================================

/**
 * Definition of a trust factor with its base point value.
 */
export interface TrustFactorDefinition {
  /** Type of factor */
  type: TrustFactorType
  /** Category (positive/neutral/concerning) */
  category: TrustFactorCategory
  /** Base points for this factor */
  basePoints: number
  /** Human-readable description */
  description: string
}

// ============================================================================
// Trust Factor Definitions
// ============================================================================

/**
 * All trust factor definitions with point values.
 *
 * Point values:
 * - Positive factors: +2 to +5 points
 * - Neutral factors: 0 points
 * - Concerning factors: -3 to -5 points (logged for conversation, not punishment)
 */
export const TRUST_FACTOR_DEFINITIONS: TrustFactorDefinition[] = [
  // Positive factors
  {
    type: 'time-limit-compliance',
    category: 'positive',
    basePoints: 5,
    description: 'Following time limits',
  },
  {
    type: 'focus-mode-usage',
    category: 'positive',
    basePoints: 3,
    description: 'Using focus mode',
  },
  {
    type: 'no-bypass-attempts',
    category: 'positive',
    basePoints: 2,
    description: 'No bypass attempts detected',
  },
  // Neutral factors
  {
    type: 'normal-app-usage',
    category: 'neutral',
    basePoints: 0,
    description: 'Normal app usage within limits',
  },
  // Concerning factors (logged for conversation, not punishment)
  {
    type: 'bypass-attempt',
    category: 'concerning',
    basePoints: -5,
    description: 'Bypass attempt detected',
  },
  {
    type: 'monitoring-disabled',
    category: 'concerning',
    basePoints: -3,
    description: 'Monitoring disabled',
  },
]

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the definition for a specific factor type.
 *
 * @param type - The factor type to look up
 * @returns The factor definition or null if not found
 */
export function getFactorDefinition(type: TrustFactorType): TrustFactorDefinition | null {
  return TRUST_FACTOR_DEFINITIONS.find((f) => f.type === type) ?? null
}

/**
 * Get all factors for a specific category.
 *
 * @param category - The category to filter by
 * @returns Array of factor definitions in that category
 */
export function getFactorsByCategory(category: TrustFactorCategory): TrustFactorDefinition[] {
  return TRUST_FACTOR_DEFINITIONS.filter((f) => f.category === category)
}

/**
 * Calculate total points from an array of factors.
 *
 * @param factors - Array of trust factors
 * @returns Sum of all factor values
 */
export function calculateFactorPoints(factors: TrustFactor[]): number {
  return factors.reduce((sum, factor) => sum + factor.value, 0)
}
