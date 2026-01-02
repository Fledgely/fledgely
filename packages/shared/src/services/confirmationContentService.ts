/**
 * Confirmation Content Service - Story 7.5.3 Task 3
 *
 * Service for child-appropriate confirmation content.
 * AC1: Discrete confirmation display
 * AC5: Emergency 911 message
 * AC6: Child-appropriate language (6th-grade reading level)
 *
 * CRITICAL SAFETY: All text must be reassuring, not clinical.
 * Reading level must be 6th grade or below for children.
 */

import {
  type ConfirmationContent,
  validateReadingLevel as validateLevel,
} from '../contracts/signalConfirmation'
import { getEmergencyNumber } from './crisisResourceService'

// ============================================
// Types
// ============================================

export type ContentLocale = 'US' | 'UK' | 'CA' | 'AU' | 'EU' | 'default'

export interface AgeAdjustedContent extends ConfirmationContent {
  ageGroup: 'young_child' | 'middle_child' | 'teen'
}

// ============================================
// Constants
// ============================================

/** Default confirmation content - child-appropriate, 6th grade reading level */
export const DEFAULT_CONTENT: ConfirmationContent = {
  headerText: 'Someone will reach out',
  bodyText:
    'You did the right thing by asking for help. Someone who can help will contact you soon.',
  emergencyText: 'If you are in danger right now, call 911',
  chatPromptText: 'Chat with someone now',
  dismissButtonText: 'Got it',
}

/** Age bracket definitions */
export const AGE_BRACKETS = {
  YOUNG_CHILD: { min: 6, max: 8 },
  MIDDLE_CHILD: { min: 9, max: 12 },
  TEEN: { min: 13, max: 17 },
} as const

/** Terms to avoid in child-facing content - scary or clinical language */
export const SCARY_TERMS = [
  'suicide',
  'suicidal',
  'death',
  'die',
  'dying',
  'kill',
  'killing',
  'abuse',
  'abuser',
  'abused',
  'trauma',
  'traumatic',
  'crisis',
  'emergency',
  'danger',
  'dangerous',
  'harm',
  'harming',
  'hurt',
  'violence',
  'violent',
  'assault',
  'victim',
  'intervention',
  'psychiatric',
  'psychological',
  'therapy',
  'therapist',
  'counselor',
  'mental health',
]

/** Grade level thresholds */
export const GRADE_LEVEL_THRESHOLDS = {
  CHILD_MAX: 6,
  TEEN_MAX: 8,
} as const

/** Word replacements for simplification */
const WORD_REPLACEMENTS: Record<string, string> = {
  individual: 'someone',
  momentarily: 'soon',
  contact: 'reach',
  communicate: 'talk',
  professional: 'helper',
  counselor: 'helper',
  intervention: 'help',
  crisis: 'hard time',
  immediately: 'right away',
  currently: 'now',
  assistance: 'help',
}

// ============================================
// Content Generation Functions
// ============================================

/**
 * Get confirmation content.
 *
 * @param jurisdiction - Optional jurisdiction for localized emergency number
 * @returns Child-appropriate confirmation content
 */
export function getConfirmationContent(jurisdiction?: string): ConfirmationContent {
  if (!jurisdiction) {
    return DEFAULT_CONTENT
  }

  return getJurisdictionContent(jurisdiction)
}

/**
 * Get age-adjusted confirmation content.
 *
 * AC6: All text at appropriate reading level.
 *
 * @param age - Child's age
 * @param jurisdiction - Jurisdiction for emergency number
 * @returns Age-appropriate content
 */
export function getAgeAdjustedContent(age: number, jurisdiction: string): AgeAdjustedContent {
  const emergencyNumber = getEmergencyNumber(jurisdiction)
  const emergencyText = `If you are in danger right now, call ${emergencyNumber}`

  // Young children (6-8): Simpler, shorter content
  if (age >= AGE_BRACKETS.YOUNG_CHILD.min && age <= AGE_BRACKETS.YOUNG_CHILD.max) {
    return {
      headerText: 'Help is coming',
      bodyText: 'You did good. Someone will help you soon.',
      emergencyText,
      chatPromptText: 'Talk to someone',
      dismissButtonText: 'OK',
      ageGroup: 'young_child',
    }
  }

  // Teens (13-17): Slightly more context
  if (age >= AGE_BRACKETS.TEEN.min && age <= AGE_BRACKETS.TEEN.max) {
    return {
      headerText: 'Someone will reach out',
      bodyText:
        'You made the right choice asking for help. A trained person will contact you soon to see how they can support you.',
      emergencyText,
      chatPromptText: 'Chat with someone now',
      dismissButtonText: 'Got it',
      ageGroup: 'teen',
    }
  }

  // Middle children (9-12): Standard content
  return {
    headerText: 'Someone will reach out',
    bodyText:
      'You did the right thing by asking for help. Someone who can help will contact you soon.',
    emergencyText,
    chatPromptText: 'Chat with someone now',
    dismissButtonText: 'Got it',
    ageGroup: 'middle_child',
  }
}

/**
 * Get offline confirmation content.
 *
 * Explains that message is saved and will be sent when online.
 *
 * @param jurisdiction - Optional jurisdiction for emergency number
 * @returns Offline-specific content
 */
export function getOfflineConfirmationContent(jurisdiction: string = 'US'): ConfirmationContent {
  const emergencyNumber = getEmergencyNumber(jurisdiction)

  return {
    headerText: 'Message saved',
    bodyText:
      'Your message is saved. It will be sent when you are back online. You did the right thing.',
    emergencyText: `If you are in danger right now, call ${emergencyNumber}`,
    chatPromptText: 'Chat with someone now',
    dismissButtonText: 'Got it',
  }
}

/**
 * Get jurisdiction-specific content.
 *
 * @param jurisdiction - Jurisdiction code
 * @returns Localized content
 */
export function getJurisdictionContent(jurisdiction: string): ConfirmationContent {
  const emergencyNumber = getEmergencyNumber(jurisdiction)

  return {
    headerText: DEFAULT_CONTENT.headerText,
    bodyText: DEFAULT_CONTENT.bodyText,
    emergencyText: `If you are in danger right now, call ${emergencyNumber}`,
    chatPromptText: DEFAULT_CONTENT.chatPromptText,
    dismissButtonText: DEFAULT_CONTENT.dismissButtonText,
  }
}

// ============================================
// Reading Level Validation Functions
// ============================================

/**
 * Validate text is at appropriate reading level.
 *
 * Uses Flesch-Kincaid grade level approximation.
 *
 * @param text - Text to validate
 * @param maxGradeLevel - Maximum grade level (default 6)
 * @returns True if at or below max grade level
 */
export function validateReadingLevel(text: string, maxGradeLevel: number = 6): boolean {
  // Very short text (1-2 words) is always acceptable
  if (!text || text.trim().split(/\s+/).length <= 2) {
    return true
  }
  return validateLevel(text, maxGradeLevel)
}

/**
 * Calculate reading grade level of text.
 *
 * Uses simplified Flesch-Kincaid grade level formula.
 *
 * @param text - Text to analyze
 * @returns Approximate grade level
 */
export function calculateReadingLevel(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0
  }

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const words = text.split(/\s+/).filter((w) => w.length > 0)
  const syllables = countSyllables(text)

  if (sentences.length === 0 || words.length === 0) {
    return 0
  }

  const avgWordsPerSentence = words.length / sentences.length
  const avgSyllablesPerWord = syllables / words.length

  // Flesch-Kincaid Grade Level formula
  const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59

  return Math.max(0, gradeLevel)
}

/**
 * Count syllables in text (approximation).
 */
function countSyllables(text: string): number {
  const words = text.toLowerCase().split(/\s+/)
  let total = 0

  for (const word of words) {
    const matches = word.match(/[aeiouy]+/g)
    if (matches) {
      total += matches.length
    } else if (word.length > 0) {
      total += 1
    }
  }

  return total
}

/**
 * Check if content is child-appropriate.
 *
 * Checks reading level and scary terminology.
 *
 * @param content - Confirmation content to check
 * @returns True if child-appropriate
 */
export function isChildAppropriate(content: ConfirmationContent): boolean {
  const allText = `${content.headerText} ${content.bodyText} ${content.emergencyText} ${content.chatPromptText}`

  // Check for scary terminology
  if (containsScaryTerminology(allText)) {
    return false
  }

  // Check reading level (6th grade max)
  if (!validateReadingLevel(content.headerText, 6)) return false
  if (!validateReadingLevel(content.bodyText, 6)) return false
  if (!validateReadingLevel(content.emergencyText, 6)) return false

  return true
}

/**
 * Check if text contains scary or clinical terminology.
 *
 * @param text - Text to check
 * @returns True if contains scary terms
 */
export function containsScaryTerminology(text: string): boolean {
  const lowerText = text.toLowerCase()

  for (const term of SCARY_TERMS) {
    // Match whole words only using word boundary
    const regex = new RegExp(`\\b${term}\\b`, 'i')
    if (regex.test(lowerText)) {
      return true
    }
  }

  return false
}

// ============================================
// Language Customization Functions
// ============================================

/**
 * Get localized emergency text for jurisdiction.
 *
 * @param jurisdiction - Jurisdiction code
 * @returns Emergency text with appropriate number
 */
export function getLocalizedEmergencyText(jurisdiction: string): string {
  const emergencyNumber = getEmergencyNumber(jurisdiction)
  return `If you are in danger right now, call ${emergencyNumber}`
}

/**
 * Convert clinical terms to child-friendly alternatives.
 *
 * @param text - Text with potential clinical terms
 * @returns Child-friendly text
 */
export function getChildFriendlyText(text: string): string {
  let result = text

  // Replace clinical terms
  const replacements: Record<string, string> = {
    'crisis intervention': 'getting help',
    crisis: 'hard time',
    intervention: 'help',
    counselor: 'helper',
    therapist: 'helper',
    professional: 'helper',
    psychiatric: 'emotional',
    psychological: 'emotional',
  }

  for (const [clinical, friendly] of Object.entries(replacements)) {
    const regex = new RegExp(clinical, 'gi')
    result = result.replace(regex, friendly)
  }

  return result
}

/**
 * Simplify complex text to lower reading level.
 *
 * @param text - Complex text
 * @returns Simplified text
 */
export function simplifyText(text: string): string {
  let result = text

  // Replace complex words with simpler alternatives
  for (const [complex, simple] of Object.entries(WORD_REPLACEMENTS)) {
    const regex = new RegExp(`\\b${complex}\\b`, 'gi')
    result = result.replace(regex, simple)
  }

  return result
}
