/**
 * Term Utilities for Visual Agreement Builder
 *
 * Story 5.2: Visual Agreement Builder - Task 2
 *
 * Provides color palette and icon mappings for the 6 term types
 * following WCAG AA accessibility standards.
 */

import type { SessionTermType, SessionTermStatus, SessionContributor } from '@fledgely/contracts'

// ============================================
// CATEGORY COLOR PALETTE
// ============================================

/**
 * Color configuration for each term category
 * Following WCAG AA contrast requirements (4.5:1 minimum)
 */
export interface TermCategoryColors {
  /** Background color class (light) */
  bg: string
  /** Border color class */
  border: string
  /** Text color class (dark) */
  text: string
  /** Icon color class */
  icon: string
  /** Hover background color class */
  hoverBg: string
}

/**
 * Color palette mapping for term categories
 * Each color scheme meets WCAG AA contrast requirements
 */
export const TERM_CATEGORY_COLORS: Record<SessionTermType, TermCategoryColors> = {
  screen_time: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-400 dark:border-blue-600',
    text: 'text-blue-800 dark:text-blue-200',
    icon: 'text-blue-600 dark:text-blue-400',
    hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-900',
  },
  bedtime: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    border: 'border-purple-400 dark:border-purple-600',
    text: 'text-purple-800 dark:text-purple-200',
    icon: 'text-purple-600 dark:text-purple-400',
    hoverBg: 'hover:bg-purple-100 dark:hover:bg-purple-900',
  },
  monitoring: {
    bg: 'bg-amber-50 dark:bg-amber-950',
    border: 'border-amber-400 dark:border-amber-600',
    text: 'text-amber-800 dark:text-amber-200',
    icon: 'text-amber-600 dark:text-amber-400',
    hoverBg: 'hover:bg-amber-100 dark:hover:bg-amber-900',
  },
  rule: {
    bg: 'bg-green-50 dark:bg-green-950',
    border: 'border-green-400 dark:border-green-600',
    text: 'text-green-800 dark:text-green-200',
    icon: 'text-green-600 dark:text-green-400',
    hoverBg: 'hover:bg-green-100 dark:hover:bg-green-900',
  },
  consequence: {
    bg: 'bg-red-50 dark:bg-red-950',
    border: 'border-red-400 dark:border-red-600',
    text: 'text-red-800 dark:text-red-200',
    icon: 'text-red-600 dark:text-red-400',
    hoverBg: 'hover:bg-red-100 dark:hover:bg-red-900',
  },
  reward: {
    bg: 'bg-emerald-50 dark:bg-emerald-950',
    border: 'border-emerald-400 dark:border-emerald-600',
    text: 'text-emerald-800 dark:text-emerald-200',
    icon: 'text-emerald-600 dark:text-emerald-400',
    hoverBg: 'hover:bg-emerald-100 dark:hover:bg-emerald-900',
  },
}

/**
 * Get color classes for a term category
 * @param type - The term type
 * @returns Color configuration object
 */
export function getTermCategoryColors(type: SessionTermType): TermCategoryColors {
  return TERM_CATEGORY_COLORS[type]
}

/**
 * Get combined card classes for a term category
 * @param type - The term type
 * @returns Combined CSS class string for the card
 */
export function getTermCardClasses(type: SessionTermType): string {
  const colors = TERM_CATEGORY_COLORS[type]
  return `${colors.bg} ${colors.border} ${colors.hoverBg} border-l-4`
}

// ============================================
// CATEGORY ICONS (SVG paths)
// ============================================

/**
 * SVG path data for term type icons
 * All icons are 24x24 viewBox
 */
export const TERM_CATEGORY_ICONS: Record<SessionTermType, string> = {
  // Clock icon for screen time
  screen_time: 'M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zm1-8h4v2h-6V7h2v5z',
  // Moon icon for bedtime
  bedtime: 'M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z',
  // Eye icon for monitoring
  monitoring: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
  // Check circle icon for rules
  rule: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  // Alert triangle icon for consequences
  consequence: 'M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 7v2h2v-2h-2zm0 4v2h2v-2h-2z',
  // Star icon for rewards
  reward: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
}

/**
 * Get SVG path for a term type icon
 * @param type - The term type
 * @returns SVG path data string
 */
export function getTermCategoryIcon(type: SessionTermType): string {
  return TERM_CATEGORY_ICONS[type]
}

// ============================================
// TERM TYPE LABELS (Human-readable)
// ============================================

/**
 * Human-readable labels for term types
 * Used in UI displays
 */
export const TERM_TYPE_LABELS: Record<SessionTermType, string> = {
  screen_time: 'Screen Time',
  bedtime: 'Bedtime',
  monitoring: 'Monitoring',
  rule: 'Rule',
  consequence: 'Consequence',
  reward: 'Reward',
}

/**
 * Get human-readable label for a term type
 * @param type - The term type
 * @returns Human-readable label
 */
export function getTermTypeLabel(type: SessionTermType): string {
  return TERM_TYPE_LABELS[type]
}

// ============================================
// CHILD-FRIENDLY EXPLANATIONS (NFR65: 6th-grade reading level)
// ============================================

/**
 * Child-friendly explanations for each term type
 * Written at 6th-grade reading level per NFR65
 */
export const TERM_EXPLANATIONS: Record<SessionTermType, string> = {
  screen_time: 'How much time you can use screens each day',
  bedtime: 'When devices need to be put away for the night',
  monitoring: 'How your parents can see what you are doing online',
  rule: 'An agreement about how you will use technology',
  consequence: 'What happens if the agreement is not followed',
  reward: 'Something good that happens when you follow the agreement',
}

/**
 * Get child-friendly explanation for a term type
 * @param type - The term type
 * @returns Child-friendly explanation string
 */
export function getTermExplanation(type: SessionTermType): string {
  return TERM_EXPLANATIONS[type]
}

// ============================================
// TERM STATUS STYLING
// ============================================

/**
 * Status badge colors and styles
 */
export interface TermStatusStyle {
  /** Background color class */
  bg: string
  /** Text color class */
  text: string
  /** Border color class */
  border: string
  /** Label text */
  label: string
}

/**
 * Style configuration for term statuses
 */
export const TERM_STATUS_STYLES: Record<SessionTermStatus, TermStatusStyle> = {
  accepted: {
    bg: 'bg-green-100 dark:bg-green-900',
    text: 'text-green-800 dark:text-green-200',
    border: 'border-green-300 dark:border-green-700',
    label: 'Accepted',
  },
  discussion: {
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    text: 'text-yellow-800 dark:text-yellow-200',
    border: 'border-yellow-300 dark:border-yellow-700',
    label: 'Needs Discussion',
  },
  removed: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-500 dark:text-gray-400',
    border: 'border-gray-300 dark:border-gray-600',
    label: 'Removed',
  },
}

/**
 * Get style configuration for a term status
 * @param status - The term status
 * @returns Style configuration object
 */
export function getTermStatusStyle(status: SessionTermStatus): TermStatusStyle {
  return TERM_STATUS_STYLES[status]
}

// ============================================
// CONTRIBUTOR ATTRIBUTION
// ============================================

/**
 * Attribution badge styles for contributor indication
 */
export interface ContributorStyle {
  /** Background color class */
  bg: string
  /** Text color class */
  text: string
  /** Border color class */
  border: string
  /** Label text */
  label: string
  /** Icon (emoji for simplicity) */
  icon: string
}

/**
 * Style configuration for contributor types
 */
export const CONTRIBUTOR_STYLES: Record<SessionContributor, ContributorStyle> = {
  parent: {
    bg: 'bg-indigo-100 dark:bg-indigo-900',
    text: 'text-indigo-800 dark:text-indigo-200',
    border: 'border-indigo-300 dark:border-indigo-700',
    label: 'Parent suggested',
    icon: 'P',
  },
  child: {
    bg: 'bg-pink-100 dark:bg-pink-900',
    text: 'text-pink-800 dark:text-pink-200',
    border: 'border-pink-300 dark:border-pink-700',
    label: 'Child suggested',
    icon: 'C',
  },
}

/**
 * Get style configuration for a contributor type
 * @param contributor - The contributor type
 * @returns Style configuration object
 */
export function getContributorStyle(contributor: SessionContributor): ContributorStyle {
  return CONTRIBUTOR_STYLES[contributor]
}

// ============================================
// CONTENT PREVIEW UTILITIES
// ============================================

/**
 * Format term content for preview display
 * Extracts key information based on term type
 * @param type - The term type
 * @param content - The term content object
 * @returns Formatted preview string
 */
export function formatTermContentPreview(
  type: SessionTermType,
  content: Record<string, unknown>
): string {
  switch (type) {
    case 'screen_time': {
      const minutes = content.minutes as number | undefined
      if (minutes !== undefined) {
        if (minutes >= 60) {
          const hours = Math.floor(minutes / 60)
          const remainingMins = minutes % 60
          return remainingMins > 0
            ? `${hours} hour${hours > 1 ? 's' : ''} ${remainingMins} min`
            : `${hours} hour${hours > 1 ? 's' : ''} per day`
        }
        return `${minutes} minutes per day`
      }
      return 'Screen time limit'
    }

    case 'bedtime': {
      const time = content.time as string | undefined
      if (time) {
        // Format time for display (e.g., "20:00" -> "8:00 PM")
        const [hours, mins] = time.split(':').map(Number)
        const period = hours >= 12 ? 'PM' : 'AM'
        const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
        return `Devices off at ${displayHour}:${mins.toString().padStart(2, '0')} ${period}`
      }
      return 'Device bedtime'
    }

    case 'monitoring': {
      const level = content.level as string | undefined
      if (level) {
        const levelLabels: Record<string, string> = {
          light: 'Light monitoring',
          moderate: 'Regular check-ins',
          comprehensive: 'Close monitoring',
        }
        return levelLabels[level] || `${level} monitoring`
      }
      return 'Monitoring settings'
    }

    case 'rule': {
      const text = content.text as string | undefined
      if (text) {
        // Truncate long rules for preview
        return text.length > 50 ? `${text.substring(0, 47)}...` : text
      }
      return 'Custom rule'
    }

    case 'consequence': {
      const text = content.text as string | undefined
      if (text) {
        return text.length > 50 ? `${text.substring(0, 47)}...` : text
      }
      return 'Consequence'
    }

    case 'reward': {
      const text = content.text as string | undefined
      if (text) {
        return text.length > 50 ? `${text.substring(0, 47)}...` : text
      }
      return 'Reward'
    }

    default:
      return 'Agreement term'
  }
}
