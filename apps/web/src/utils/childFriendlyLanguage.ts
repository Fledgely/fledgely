/**
 * Child-Friendly Language Utilities - Story 19C.2
 *
 * Translates technical agreement terms to 6th-grade reading level (NFR65).
 *
 * Task 1: Create language translation utility
 */

/**
 * Dictionary of technical terms to child-friendly translations.
 * Pattern: 'technical term' → 'simple explanation'
 */
const TERM_TRANSLATIONS: Record<string, string> = {
  // Monitoring terms
  'screenshot capture interval': 'how often pictures are saved',
  'capture interval': 'how often pictures are saved',
  'screenshots are taken': 'pictures of your screen are saved',
  'screenshot capture': 'saving pictures of your screen',
  screenshots: 'pictures of your screen',
  screenshot: 'picture of your screen',

  // Retention terms
  'retention period': 'how long pictures are kept',
  'retention policy': 'how long things are kept',
  'data retention': 'how long things are kept',

  // Monitoring state
  'monitoring enabled': 'watching is turned on',
  'monitoring disabled': 'watching is turned off',
  'monitoring paused': 'watching is paused',
  'active monitoring': 'we are watching your screen',

  // Technical actions
  'captured every': 'saved every',
  'deleted after': 'removed after',
  'stored for': 'kept for',

  // Agreement terms
  'agreement terms': 'our rules',
  'agreement activated': 'our rules started',
  'agreement signed': 'we all said yes',
  'digital signature': 'saying yes online',

  // Time terms
  interval: 'how often',
  duration: 'how long',
  frequency: 'how often',
  period: 'time',
}

/**
 * Dictionary of terms that need explanation tooltips.
 * These provide additional context when a child taps/hovers.
 */
export const TERM_EXPLANATIONS: Record<string, string> = {
  screenshots: "Pictures of what's on your screen, like taking a photo of it.",
  monitoring: 'When your parent can see what you do on your device.',
  retention: 'How long the pictures are kept before being deleted.',
  'capture interval': 'How often a new picture of your screen is saved.',
  agreement: 'The rules you and your parent agreed to follow together.',
  activated: 'When the rules started working.',
  signature: 'Your way of saying "I agree" to the rules.',
}

/**
 * Translates technical terms to child-friendly language.
 * Maintains 6th-grade reading level (NFR65).
 *
 * @param text - The original technical text
 * @returns Child-friendly version of the text
 */
export function translateToChildFriendly(text: string): string {
  if (!text) return text

  let result = text

  // Apply translations (case-insensitive, preserve original case style)
  for (const [term, translation] of Object.entries(TERM_TRANSLATIONS)) {
    const regex = new RegExp(term, 'gi')
    result = result.replace(regex, (match) => {
      // Preserve capitalization style of original
      if (match[0] === match[0].toUpperCase()) {
        return translation.charAt(0).toUpperCase() + translation.slice(1)
      }
      return translation
    })
  }

  return result
}

/**
 * Formats monitoring settings in child-friendly language.
 *
 * @param screenshotsEnabled - Whether screenshots are enabled
 * @param captureFrequency - How often screenshots are taken
 * @param retentionPeriod - How long screenshots are kept
 * @returns Object with child-friendly descriptions
 */
export function formatMonitoringForChild(settings: {
  screenshotsEnabled: boolean
  captureFrequency: string | null
  retentionPeriod: string | null
}): {
  screenshotsDescription: string
  frequencyDescription: string
  retentionDescription: string
} {
  const screenshotsDescription = settings.screenshotsEnabled
    ? 'Yes, pictures of your screen are being saved'
    : 'No pictures are being saved right now'

  const frequencyDescription = settings.captureFrequency
    ? `A picture is saved ${settings.captureFrequency.toLowerCase()}`
    : 'Not saving pictures right now'

  const retentionDescription = settings.retentionPeriod
    ? `Pictures are kept for ${settings.retentionPeriod.toLowerCase()}, then deleted`
    : 'Pictures are deleted when no longer needed'

  return {
    screenshotsDescription,
    frequencyDescription,
    retentionDescription,
  }
}

/**
 * Gets explanation for a term if available.
 *
 * @param term - The term to get an explanation for
 * @returns Explanation string or null if not available
 */
export function getTermExplanation(term: string): string | null {
  const lowerTerm = term.toLowerCase()

  // Check for exact match
  if (TERM_EXPLANATIONS[lowerTerm]) {
    return TERM_EXPLANATIONS[lowerTerm]
  }

  // Check for partial match
  for (const [key, explanation] of Object.entries(TERM_EXPLANATIONS)) {
    if (lowerTerm.includes(key) || key.includes(lowerTerm)) {
      return explanation
    }
  }

  return null
}

/**
 * Validates that text is appropriate for 6th-grade reading level.
 * Uses simple heuristics - average word length and sentence length.
 *
 * @param text - Text to validate
 * @returns Object with validation result and suggestions
 */
export function validateReadingLevel(text: string): {
  isAppropriate: boolean
  avgWordLength: number
  avgSentenceLength: number
  suggestions: string[]
} {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim())
  const words = text.split(/\s+/).filter((w) => w.trim())

  if (words.length === 0) {
    return {
      isAppropriate: true,
      avgWordLength: 0,
      avgSentenceLength: 0,
      suggestions: [],
    }
  }

  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length
  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : words.length

  const suggestions: string[] = []

  // 6th grade: avg word length ~5-6, avg sentence length ~12-15 words
  if (avgWordLength > 6) {
    suggestions.push('Use shorter, simpler words')
  }
  if (avgSentenceLength > 15) {
    suggestions.push('Break long sentences into shorter ones')
  }

  return {
    isAppropriate: avgWordLength <= 6 && avgSentenceLength <= 15,
    avgWordLength: Math.round(avgWordLength * 10) / 10,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    suggestions,
  }
}
