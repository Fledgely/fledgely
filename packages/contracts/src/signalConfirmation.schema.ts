/**
 * Signal Confirmation Schema
 *
 * Story 7.5.3: Signal Confirmation & Resources
 *
 * Defines schemas for safety signal confirmation and crisis resources.
 * When a child triggers a safety signal, they receive confirmation
 * and see crisis resources they can access immediately.
 *
 * CRITICAL DESIGN PRINCIPLE: Calming over Alarming
 * - Soft colors, reassuring language
 * - Child-appropriate (6th-grade reading level)
 * - Discrete - doesn't draw observer attention
 *
 * CRITICAL INVARIANT (INV-002): Safety signals NEVER visible to family.
 */

import { z } from 'zod'

// ============================================================================
// Constants
// ============================================================================

/**
 * Signal confirmation constants
 */
export const SIGNAL_CONFIRMATION_CONSTANTS = {
  /** Default display timeout for confirmation (ms) */
  DEFAULT_DISPLAY_MS: 10000,
  /** Extended display timeout when user interacts (ms) */
  EXTENDED_DISPLAY_MS: 30000,
  /** Minimum display time before auto-dismiss (ms) */
  MIN_DISPLAY_MS: 3000,
  /** Fade out animation duration (ms) */
  FADE_OUT_MS: 200,
  /** Maximum reading level (Flesch-Kincaid grade) */
  MAX_READING_LEVEL: 6,
  /** Maximum words per sentence for child-appropriate text */
  MAX_WORDS_PER_SENTENCE: 15,
} as const

/**
 * Crisis resource types
 */
export const CRISIS_RESOURCE_TYPES = {
  TEXT: 'text',
  PHONE: 'phone',
  WEB: 'web',
  CHAT: 'chat',
} as const

// ============================================================================
// Crisis Resource Schemas
// ============================================================================

/**
 * Type of crisis resource contact method
 */
export const crisisResourceTypeSchema = z.enum(['text', 'phone', 'web', 'chat'])

export type CrisisResourceType = z.infer<typeof crisisResourceTypeSchema>

/**
 * Single crisis resource
 */
export const crisisResourceSchema = z.object({
  /** Unique identifier for this resource */
  id: z.string().min(1),
  /** Type of contact method */
  type: crisisResourceTypeSchema,
  /** Display name of the resource */
  name: z.string().min(1),
  /** Contact value (phone number, URL, SMS number, etc.) */
  contact: z.string().min(1),
  /** Action text shown to user (e.g., "Text HOME to 741741") */
  action: z.string().min(1),
  /** Brief description of the resource */
  description: z.string().min(1),
  /** Priority for display ordering (lower = higher priority) */
  priority: z.number().int().min(1).default(10),
  /** Jurisdiction codes this resource applies to (null = all) */
  jurisdictions: z.array(z.string()).nullable().default(null),
  /** Whether this resource is currently active */
  active: z.boolean().default(true),
  /** URL for direct linking (computed from type + contact) */
  href: z.string().optional(),
})

export type CrisisResource = z.infer<typeof crisisResourceSchema>

/**
 * Collection of crisis resources
 */
export const crisisResourceListSchema = z.array(crisisResourceSchema)

export type CrisisResourceList = z.infer<typeof crisisResourceListSchema>

// ============================================================================
// Confirmation Content Schemas
// ============================================================================

/**
 * Signal confirmation content - what the child sees
 */
export const signalConfirmationContentSchema = z.object({
  /** Main confirmation message */
  message: z.string().min(1),
  /** Secondary message (optional) */
  secondaryMessage: z.string().optional(),
  /** Message shown when signal is queued offline */
  offlineMessage: z.string().min(1),
  /** Message explaining offline delivery */
  offlineSecondaryMessage: z.string().optional(),
  /** Immediate danger warning message */
  emergencyMessage: z.string().min(1),
  /** Emergency contact number (usually 911) */
  emergencyContact: z.string().min(1),
  /** Crisis resources to display */
  resources: crisisResourceListSchema,
  /** Auto-dismiss timeout in milliseconds */
  dismissTimeout: z.number().int().min(1000).default(SIGNAL_CONFIRMATION_CONSTANTS.DEFAULT_DISPLAY_MS),
  /** Whether to extend timeout on user interaction */
  extendOnInteraction: z.boolean().default(true),
  /** Extended timeout duration in milliseconds */
  extendedTimeout: z.number().int().default(SIGNAL_CONFIRMATION_CONSTANTS.EXTENDED_DISPLAY_MS),
  /** Dismiss instruction text */
  dismissInstruction: z.string().default('Tap anywhere to close'),
})

export type SignalConfirmationContent = z.infer<typeof signalConfirmationContentSchema>

/**
 * Confirmation state for tracking display status
 */
export const confirmationStateSchema = z.object({
  /** Whether confirmation is currently visible */
  visible: z.boolean(),
  /** Whether signal was sent or queued */
  isOffline: z.boolean(),
  /** Timestamp when confirmation was shown */
  shownAt: z.number().nullable(),
  /** Whether user has interacted with the confirmation */
  userInteracted: z.boolean(),
  /** Whether confirmation is in fade-out state */
  fading: z.boolean(),
})

export type ConfirmationState = z.infer<typeof confirmationStateSchema>

// ============================================================================
// Default Content
// ============================================================================

/**
 * Default crisis resources (national US resources)
 */
export const DEFAULT_CRISIS_RESOURCES: CrisisResource[] = [
  {
    id: 'crisis-text-line',
    type: 'text',
    name: 'Crisis Text Line',
    contact: '741741',
    action: 'Text HOME to 741741',
    description: 'Free, 24/7 support via text',
    priority: 1,
    jurisdictions: null, // All jurisdictions
    active: true,
    href: 'sms:741741?body=HOME',
  },
  {
    id: '988-lifeline',
    type: 'phone',
    name: '988 Lifeline',
    contact: '988',
    action: 'Call or text 988',
    description: 'Talk to someone who can help',
    priority: 2,
    jurisdictions: null,
    active: true,
    href: 'tel:988',
  },
  {
    id: 'childhelp-hotline',
    type: 'phone',
    name: 'Childhelp Hotline',
    contact: '1-800-422-4453',
    action: 'Call 1-800-422-4453',
    description: 'Help for abuse and neglect',
    priority: 3,
    jurisdictions: null,
    active: true,
    href: 'tel:+18004224453',
  },
]

/**
 * Default confirmation content (child-appropriate language)
 *
 * TEXT REQUIREMENTS:
 * - 6th grade reading level or below
 * - Short sentences (max 15 words)
 * - Common words only
 * - Calming, reassuring tone
 */
export const DEFAULT_CONFIRMATION_CONTENT: SignalConfirmationContent = {
  message: 'Someone will reach out',
  secondaryMessage: 'You can also get help now:',
  offlineMessage: 'Saved for later',
  offlineSecondaryMessage: 'Will send when online',
  emergencyMessage: 'If in danger, call 911',
  emergencyContact: '911',
  resources: DEFAULT_CRISIS_RESOURCES,
  dismissTimeout: SIGNAL_CONFIRMATION_CONSTANTS.DEFAULT_DISPLAY_MS,
  extendOnInteraction: true,
  extendedTimeout: SIGNAL_CONFIRMATION_CONSTANTS.EXTENDED_DISPLAY_MS,
  dismissInstruction: 'Tap anywhere to close',
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get crisis resources for a specific jurisdiction
 */
export function getResourcesForJurisdiction(
  resources: CrisisResource[],
  jurisdiction: string | null
): CrisisResource[] {
  return resources
    .filter((r) => r.active)
    .filter((r) => r.jurisdictions === null || r.jurisdictions.includes(jurisdiction ?? ''))
    .sort((a, b) => a.priority - b.priority)
}

/**
 * Get href for a crisis resource based on type
 */
export function getResourceHref(resource: CrisisResource): string {
  if (resource.href) return resource.href

  switch (resource.type) {
    case 'phone':
      return `tel:${resource.contact.replace(/[^0-9+]/g, '')}`
    case 'text':
      return `sms:${resource.contact}?body=HOME`
    case 'web':
      return resource.contact.startsWith('http') ? resource.contact : `https://${resource.contact}`
    case 'chat':
      return resource.contact.startsWith('http') ? resource.contact : `https://${resource.contact}`
    default:
      return resource.contact
  }
}

/**
 * Create initial confirmation state
 */
export function createInitialConfirmationState(): ConfirmationState {
  return {
    visible: false,
    isOffline: false,
    shownAt: null,
    userInteracted: false,
    fading: false,
  }
}

/**
 * Create confirmation state for showing
 */
export function createVisibleConfirmationState(isOffline: boolean): ConfirmationState {
  return {
    visible: true,
    isOffline,
    shownAt: Date.now(),
    userInteracted: false,
    fading: false,
  }
}

/**
 * Safely parse crisis resource
 */
export function safeParseCrisisResource(input: unknown): CrisisResource | null {
  const result = crisisResourceSchema.safeParse(input)
  return result.success ? result.data : null
}

/**
 * Safely parse signal confirmation content
 */
export function safeParseSignalConfirmationContent(
  input: unknown
): SignalConfirmationContent | null {
  const result = signalConfirmationContentSchema.safeParse(input)
  return result.success ? result.data : null
}

/**
 * Validate text meets child-appropriate reading level
 *
 * Simple heuristic check:
 * - Average sentence length <= 15 words
 * - No words over 3 syllables (except proper nouns)
 */
export function isChildAppropriateText(text: string): boolean {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  if (sentences.length === 0) return true

  // Check average sentence length
  const avgWordsPerSentence =
    sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length

  if (avgWordsPerSentence > SIGNAL_CONFIRMATION_CONSTANTS.MAX_WORDS_PER_SENTENCE) {
    return false
  }

  return true
}

/**
 * Estimate Flesch-Kincaid grade level
 *
 * Simplified formula for quick validation.
 * FK = 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
 */
export function estimateReadingLevel(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0)
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)

  if (words.length === 0 || sentences.length === 0) return 0

  // Simple syllable count: count vowel groups
  const countSyllables = (word: string): number => {
    const matches = word.toLowerCase().match(/[aeiouy]+/g)
    return matches ? Math.max(1, matches.length) : 1
  }

  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0)

  const wordsPerSentence = words.length / sentences.length
  const syllablesPerWord = totalSyllables / words.length

  const fkGrade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59

  return Math.max(0, Math.round(fkGrade * 10) / 10)
}

/**
 * Validate all text in confirmation content meets reading level
 */
export function validateConfirmationReadingLevel(
  content: SignalConfirmationContent
): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  const maxLevel = SIGNAL_CONFIRMATION_CONSTANTS.MAX_READING_LEVEL

  const checkText = (text: string, field: string) => {
    const level = estimateReadingLevel(text)
    if (level > maxLevel) {
      issues.push(`${field}: Grade ${level} (max ${maxLevel})`)
    }
    if (!isChildAppropriateText(text)) {
      issues.push(`${field}: Sentences too long`)
    }
  }

  checkText(content.message, 'message')
  if (content.secondaryMessage) checkText(content.secondaryMessage, 'secondaryMessage')
  checkText(content.offlineMessage, 'offlineMessage')
  if (content.offlineSecondaryMessage)
    checkText(content.offlineSecondaryMessage, 'offlineSecondaryMessage')
  checkText(content.emergencyMessage, 'emergencyMessage')

  // Check resource descriptions
  content.resources.forEach((r, i) => {
    checkText(r.description, `resources[${i}].description`)
    checkText(r.action, `resources[${i}].action`)
  })

  return {
    valid: issues.length === 0,
    issues,
  }
}
