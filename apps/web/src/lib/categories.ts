/**
 * Category Display Utilities
 *
 * Story 20.2: Basic Category Taxonomy - AC3, Task 5
 * Story 20.3: Confidence Score Assignment - AC2, AC3, AC4, AC5
 *
 * Web UI utilities for displaying category information.
 * Provides consistent category colors, icons, and formatting.
 */

import {
  type Category,
  CATEGORY_VALUES,
  CATEGORY_DEFINITIONS,
  getCategoryDefinition,
  getCategoryDescription as getDescription,
  getCategoryExamples as getExamples,
  type CategoryDefinition,
  CONFIDENCE_THRESHOLDS,
  getConfidenceLevelFromScore,
} from '@fledgely/shared'

// Re-export shared functions for convenience
export { getCategoryDefinition, CATEGORY_DEFINITIONS, CATEGORY_VALUES }
export type { Category, CategoryDefinition }

/**
 * Get description for a category.
 *
 * Story 20.2: Basic Category Taxonomy - AC3
 *
 * @param category - Category name
 * @returns Category description string
 */
export function getCategoryDescription(category: Category): string {
  return getDescription(category)
}

/**
 * Get examples for a category.
 *
 * Story 20.2: Basic Category Taxonomy - AC3
 *
 * @param category - Category name
 * @returns Array of example strings
 */
export function getCategoryExamples(category: Category): string[] {
  return getExamples(category)
}

/**
 * Tailwind color class mapping for categories.
 *
 * Story 20.2: Basic Category Taxonomy - AC3
 * Returns Tailwind color classes for badges, chips, and backgrounds.
 */
export type CategoryColorVariant = 'badge' | 'bg' | 'text' | 'border'

const categoryColorClasses: Record<Category, Record<CategoryColorVariant, string>> = {
  Homework: {
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    bg: 'bg-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500',
  },
  Educational: {
    badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    bg: 'bg-green-500',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500',
  },
  'Social Media': {
    badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    bg: 'bg-pink-500',
    text: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-500',
  },
  Gaming: {
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    bg: 'bg-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500',
  },
  Entertainment: {
    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    bg: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500',
  },
  Communication: {
    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    bg: 'bg-cyan-500',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-500',
  },
  Creative: {
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    bg: 'bg-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500',
  },
  Shopping: {
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    bg: 'bg-yellow-500',
    text: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-500',
  },
  News: {
    badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    bg: 'bg-slate-500',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500',
  },
  Other: {
    badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    bg: 'bg-gray-500',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-500',
  },
}

/**
 * Get Tailwind color classes for a category.
 *
 * Story 20.2: Basic Category Taxonomy - AC3
 *
 * @param category - Category name
 * @param variant - Color variant ('badge', 'bg', 'text', 'border')
 * @returns Tailwind color classes string
 */
export function getCategoryColorClass(category: Category, variant: CategoryColorVariant): string {
  return categoryColorClasses[category]?.[variant] ?? categoryColorClasses.Other[variant]
}

/**
 * Lucide React icon name mapping for categories.
 *
 * Story 20.2: Basic Category Taxonomy - AC3
 */
export type CategoryIconName =
  | 'BookOpen'
  | 'GraduationCap'
  | 'Users'
  | 'Gamepad2'
  | 'Play'
  | 'MessageCircle'
  | 'Palette'
  | 'ShoppingCart'
  | 'Newspaper'
  | 'HelpCircle'

/**
 * Get icon name for a category.
 *
 * Story 20.2: Basic Category Taxonomy - AC3
 *
 * @param category - Category name
 * @returns Lucide React icon name
 */
export function getCategoryIconName(category: Category): CategoryIconName {
  const def = getCategoryDefinition(category)
  return (def?.icon as CategoryIconName) ?? 'HelpCircle'
}

/**
 * Format category for display in UI.
 *
 * Story 20.2: Basic Category Taxonomy - AC3
 *
 * @param category - Category name
 * @returns Formatted display object with all UI properties
 */
export interface CategoryDisplay {
  name: string
  displayName: string
  description: string
  examples: string[]
  icon: CategoryIconName
  badgeClass: string
  bgClass: string
  textClass: string
  borderClass: string
}

export function formatCategoryForDisplay(category: Category): CategoryDisplay {
  const def = getCategoryDefinition(category)
  return {
    name: category,
    displayName: def?.displayName ?? category,
    description: def?.description ?? '',
    examples: def?.examples ?? [],
    icon: getCategoryIconName(category),
    badgeClass: getCategoryColorClass(category, 'badge'),
    bgClass: getCategoryColorClass(category, 'bg'),
    textClass: getCategoryColorClass(category, 'text'),
    borderClass: getCategoryColorClass(category, 'border'),
  }
}

/**
 * Get all categories formatted for display.
 *
 * Story 20.2: Basic Category Taxonomy - AC3
 *
 * @returns Array of all categories with display properties
 */
export function getAllCategoriesForDisplay(): CategoryDisplay[] {
  return CATEGORY_VALUES.map((cat) => formatCategoryForDisplay(cat))
}

/**
 * Format confidence score for display.
 *
 * Story 20.2: Basic Category Taxonomy - AC6
 * Story 20.3: Confidence Score Assignment - AC2, AC3, AC4
 *
 * Updated to use shared CONFIDENCE_THRESHOLDS:
 * - HIGH: >= 85% (AC2)
 * - MEDIUM: 60-84% (AC3)
 * - LOW: < 60% (AC4)
 *
 * @param confidence - Confidence score (0-100)
 * @param isLowConfidence - Whether this was a low-confidence classification
 * @returns Formatted confidence string with indicator
 */
export function formatConfidence(confidence: number, isLowConfidence?: boolean): string {
  if (isLowConfidence) {
    return `${confidence}% (uncertain)`
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return `${confidence}%`
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return `${confidence}% (moderate)`
  }
  return `${confidence}% (low)`
}

/**
 * Get confidence level indicator.
 *
 * Story 20.2: Basic Category Taxonomy - AC6
 * Story 20.3: Confidence Score Assignment - AC2, AC3, AC4
 *
 * Uses shared getConfidenceLevelFromScore for consistency.
 *
 * @param confidence - Confidence score (0-100)
 * @param isLowConfidence - Whether this was a low-confidence classification
 * @returns Confidence level string
 */
export type ConfidenceLevel = 'high' | 'moderate' | 'low' | 'uncertain'

export function getConfidenceLevel(confidence: number, isLowConfidence?: boolean): ConfidenceLevel {
  const level = getConfidenceLevelFromScore(confidence, isLowConfidence)
  // Map shared level to web level (medium -> moderate for backward compatibility)
  if (level === 'medium') return 'moderate'
  return level as ConfidenceLevel
}

/**
 * Get confidence level color classes.
 *
 * Story 20.3: Confidence Score Assignment - AC5
 *
 * @param level - Confidence level
 * @returns Object with Tailwind color classes
 */
export function getConfidenceLevelColorClasses(level: ConfidenceLevel): {
  badge: string
  text: string
  bg: string
} {
  switch (level) {
    case 'high':
      return {
        badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        text: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-500',
      }
    case 'moderate':
      return {
        badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        text: 'text-yellow-600 dark:text-yellow-400',
        bg: 'bg-yellow-500',
      }
    case 'low':
      return {
        badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-500',
      }
    case 'uncertain':
      return {
        badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
        text: 'text-gray-600 dark:text-gray-400',
        bg: 'bg-gray-500',
      }
  }
}

// Re-export shared confidence utilities for convenience
export { CONFIDENCE_THRESHOLDS }
