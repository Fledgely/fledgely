/**
 * Concern Category Definitions
 *
 * Story 21.1: Concerning Content Categories - AC2, AC4
 *
 * Comprehensive concern category metadata with descriptions, severity guidance,
 * and detection criteria. Used for consistent AI concern detection.
 *
 * Design Principles:
 * - Clear definitions: Unambiguous criteria for AI detection
 * - Severity guidance: How to assess low/medium/high severity
 * - Family-focused: Help parents understand concerns without alarming
 * - Separate from basic categories: Concerns coexist with content categories
 */

import { type ConcernCategory, type ConcernSeverity, CONCERN_CATEGORY_VALUES } from '../contracts'

/**
 * Current concern taxonomy version.
 *
 * Story 21.1: Concerning Content Categories - AC2
 *
 * Increment when:
 * - Adding new concern categories
 * - Changing severity definitions
 * - Modifying detection criteria
 *
 * Format: MAJOR.MINOR (breaking.non-breaking)
 */
export const CONCERN_TAXONOMY_VERSION = '1.0' as const

/**
 * Minimum confidence threshold for concern detection.
 *
 * Story 21.1: Concerning Content Categories - AC1, AC4
 *
 * Concerns detected with confidence below this threshold are discarded.
 * This prevents low-confidence false positives from alarming parents.
 *
 * Set to 30% to match LOW_CONFIDENCE_THRESHOLD for basic classification.
 */
export const MIN_CONCERN_CONFIDENCE = 30 as const

/**
 * Severity level definition with guidance.
 */
export interface SeverityGuidance {
  /** Level identifier */
  level: ConcernSeverity
  /** What this severity level indicates */
  description: string
  /** Examples of content at this severity */
  examples: string[]
}

/**
 * Detailed concern category definition.
 *
 * Story 21.1: Concerning Content Categories - AC2, AC4
 */
export interface ConcernCategoryDefinition {
  /** Category identifier (matches CONCERN_CATEGORY_VALUES) */
  category: ConcernCategory
  /** User-friendly display name */
  displayName: string
  /** Description for parents (1-2 sentences) */
  description: string
  /** What content triggers this concern */
  triggers: string[]
  /** Guidance for each severity level (AC4) */
  severityGuidance: {
    low: SeverityGuidance
    medium: SeverityGuidance
    high: SeverityGuidance
  }
  /** Keywords/patterns that indicate this concern */
  indicators: string[]
  /** UI color for concern badges (Tailwind color class) */
  color: string
  /** Icon name (lucide-react icon name) */
  icon: string
}

/**
 * Complete concern category definitions.
 *
 * Story 21.1: Concerning Content Categories - AC2
 *
 * Each category has clear definitions and severity guidance for consistent detection.
 */
export const CONCERN_CATEGORY_DEFINITIONS: Record<ConcernCategory, ConcernCategoryDefinition> = {
  Violence: {
    category: 'Violence',
    displayName: 'Violence',
    description: 'Content depicting physical harm, fighting, weapons, or violent acts.',
    triggers: [
      'Physical fighting or assault',
      'Weapons (guns, knives, etc.)',
      'Blood or injury depiction',
      'Violent video game content beyond age-appropriate',
      'Real-world violence or war footage',
    ],
    severityGuidance: {
      low: {
        level: 'low',
        description: 'Fantasy or cartoon violence, age-appropriate game combat',
        examples: [
          'Minecraft combat',
          'Cartoon slapstick',
          'Superhero action scenes (PG)',
          'Mild video game battles',
        ],
      },
      medium: {
        level: 'medium',
        description: 'More realistic violence, intense fighting, or concerning themes',
        examples: [
          'Intense video game violence (M-rated)',
          'Real fighting videos',
          'Graphic movie scenes',
          'Violent sports content',
        ],
      },
      high: {
        level: 'high',
        description: 'Graphic violence, weapons focus, or real-world harm',
        examples: [
          'Real weapons prominently shown',
          'Graphic injury or blood',
          'Violence instructional content',
          'War or conflict footage',
        ],
      },
    },
    indicators: ['fight', 'weapon', 'gun', 'knife', 'blood', 'kill', 'attack', 'war', 'combat'],
    color: 'red',
    icon: 'AlertTriangle',
  },

  'Adult Content': {
    category: 'Adult Content',
    displayName: 'Adult Content',
    description: 'Sexually explicit material, nudity, or age-inappropriate sexual content.',
    triggers: [
      'Nudity or partial nudity',
      'Sexually suggestive content',
      'Adult-oriented websites',
      'Explicit imagery or text',
      'Age-inappropriate romantic content',
    ],
    severityGuidance: {
      low: {
        level: 'low',
        description: 'Suggestive but not explicit content',
        examples: [
          'Revealing clothing in ads',
          'PG-13 romantic scenes',
          'Swimwear or beach content',
          'Dating app interfaces',
        ],
      },
      medium: {
        level: 'medium',
        description: 'Partial nudity or clearly adult-oriented content',
        examples: [
          'Partial nudity visible',
          'Adult website interfaces',
          'Explicit text content',
          'R-rated movie scenes',
        ],
      },
      high: {
        level: 'high',
        description: 'Explicit adult content or pornography',
        examples: [
          'Pornographic content',
          'Full nudity',
          'Explicit sexual acts',
          'Adult-only platforms',
        ],
      },
    },
    indicators: ['nsfw', 'adult', 'xxx', '18+', 'explicit', 'nude', 'porn'],
    color: 'pink',
    icon: 'EyeOff',
  },

  Bullying: {
    category: 'Bullying',
    displayName: 'Bullying',
    description: 'Harassment, cyberbullying, mean messages, or social exclusion.',
    triggers: [
      'Direct insults or name-calling',
      'Exclusion from groups',
      'Threats or intimidation',
      'Spreading rumors',
      'Mocking or humiliating content',
    ],
    severityGuidance: {
      low: {
        level: 'low',
        description: 'Minor teasing or casual unkindness',
        examples: [
          'Light teasing among friends',
          'Mild disagreements',
          'Casual criticism',
          'Minor social drama',
        ],
      },
      medium: {
        level: 'medium',
        description: 'Targeted insults, repeated unkindness, or social manipulation',
        examples: [
          'Repeated mean comments',
          'Deliberate exclusion',
          'Sharing embarrassing content',
          'Group targeting an individual',
        ],
      },
      high: {
        level: 'high',
        description: 'Threats, severe harassment, or coordinated bullying',
        examples: [
          'Death threats or harm threats',
          'Severe harassment campaign',
          'Doxxing or privacy violations',
          'Coordinated group attacks',
        ],
      },
    },
    indicators: ['hate', 'loser', 'ugly', 'stupid', 'kill yourself', 'nobody likes', 'fake friend'],
    color: 'orange',
    icon: 'UserX',
  },

  'Self-Harm Indicators': {
    category: 'Self-Harm Indicators',
    displayName: 'Self-Harm Indicators',
    description:
      'Content related to self-injury, crisis resources, suicidal ideation, or distress.',
    triggers: [
      'Self-injury discussion or imagery',
      'Suicidal ideation or planning',
      'Crisis helpline visits',
      'Eating disorder content',
      'Expressions of hopelessness',
    ],
    severityGuidance: {
      low: {
        level: 'low',
        description: 'General sad content or emotional expression',
        examples: [
          'Sad song lyrics',
          'Venting about bad day',
          'General anxiety discussion',
          'Mental health awareness content',
        ],
      },
      medium: {
        level: 'medium',
        description: 'Direct mentions of self-harm or visiting crisis resources',
        examples: [
          'Discussing self-harm',
          'Visiting crisis websites',
          'Expressing severe hopelessness',
          'Eating disorder discussions',
        ],
      },
      high: {
        level: 'high',
        description: 'Active crisis, planning, or immediate danger indicators',
        examples: [
          'Suicide planning discussions',
          'Self-injury imagery',
          'Goodbye messages',
          'Immediate crisis situations',
        ],
      },
    },
    indicators: [
      'self harm',
      'cut myself',
      'suicide',
      'want to die',
      'end it all',
      'hopeless',
      'crisis line',
      'worthless',
    ],
    color: 'purple',
    icon: 'Heart',
  },

  'Explicit Language': {
    category: 'Explicit Language',
    displayName: 'Explicit Language',
    description: 'Profanity, slurs, hate speech, or offensive language.',
    triggers: [
      'Profanity and swearing',
      'Racial or ethnic slurs',
      'Hate speech',
      'Offensive insults',
      'Vulgar content',
    ],
    severityGuidance: {
      low: {
        level: 'low',
        description: 'Mild profanity or casual swearing',
        examples: [
          'Occasional mild swear words',
          'Censored profanity (***)',
          'Euphemisms for swearing',
          'PG-13 level language',
        ],
      },
      medium: {
        level: 'medium',
        description: 'Strong profanity or targeted offensive language',
        examples: [
          'Frequent strong swearing',
          'Profanity-heavy conversations',
          'Offensive jokes',
          'R-rated language',
        ],
      },
      high: {
        level: 'high',
        description: 'Hate speech, slurs, or severely offensive content',
        examples: [
          'Racial/ethnic slurs',
          'Hate speech against groups',
          'Violent threats with profanity',
          'Extremely vulgar content',
        ],
      },
    },
    indicators: ['fuck', 'shit', 'bitch', 'ass', 'damn', 'slur', 'hate'],
    color: 'yellow',
    icon: 'MessageSquareOff',
  },

  'Unknown Contacts': {
    category: 'Unknown Contacts',
    displayName: 'Unknown Contacts',
    description: 'Interactions with unfamiliar adults, strangers, or suspicious contacts.',
    triggers: [
      'Direct messages from strangers',
      'Adults contacting child directly',
      'Requests for personal information',
      'Requests to meet in person',
      'Suspicious friend requests',
    ],
    severityGuidance: {
      low: {
        level: 'low',
        description: 'Public forum interactions or casual online contacts',
        examples: [
          'Comments on public posts',
          'Gaming lobby interactions',
          'Public Discord servers',
          'Comment sections',
        ],
      },
      medium: {
        level: 'medium',
        description: 'Direct contact or private messaging from unknowns',
        examples: [
          'DMs from strangers',
          'Friend requests from unknowns',
          'Private group invites',
          'One-on-one gaming invites',
        ],
      },
      high: {
        level: 'high',
        description: 'Requests for personal info, location, or to meet',
        examples: [
          'Asking for address or phone',
          'Requesting photos',
          'Suggesting secret meetings',
          'Grooming behavior patterns',
        ],
      },
    },
    indicators: [
      'where do you live',
      'how old are you',
      'send a pic',
      'keep this secret',
      "don't tell your parents",
      'meet up',
    ],
    color: 'cyan',
    icon: 'UserQuestion',
  },
}

/**
 * Get concern category definition by category name.
 *
 * @param category - Concern category to look up
 * @returns Category definition or undefined if not found
 */
export function getConcernCategoryDefinition(
  category: ConcernCategory
): ConcernCategoryDefinition | undefined {
  return CONCERN_CATEGORY_DEFINITIONS[category]
}

/**
 * Get all concern category definitions.
 *
 * @returns Array of all concern category definitions
 */
export function getAllConcernCategoryDefinitions(): ConcernCategoryDefinition[] {
  return CONCERN_CATEGORY_VALUES.map((category) => CONCERN_CATEGORY_DEFINITIONS[category])
}

/**
 * Get severity guidance for a concern category.
 *
 * @param category - Concern category
 * @param severity - Severity level
 * @returns Severity guidance or undefined
 */
export function getSeverityGuidance(
  category: ConcernCategory,
  severity: ConcernSeverity
): SeverityGuidance | undefined {
  const definition = CONCERN_CATEGORY_DEFINITIONS[category]
  return definition?.severityGuidance[severity]
}

/**
 * Build concern definitions text for AI prompt.
 *
 * Story 21.1: Concerning Content Categories - AC2
 *
 * @returns Formatted string with all concern definitions for prompt inclusion
 */
export function buildConcernDefinitionsForPrompt(): string {
  const lines: string[] = ['Concern Categories to Detect:']

  for (const category of CONCERN_CATEGORY_VALUES) {
    const def = CONCERN_CATEGORY_DEFINITIONS[category]
    lines.push('')
    lines.push(`**${def.displayName}**: ${def.description}`)
    lines.push(`Triggers: ${def.triggers.slice(0, 3).join(', ')}`)
    lines.push('Severity Levels:')
    lines.push(`  - LOW: ${def.severityGuidance.low.description}`)
    lines.push(`  - MEDIUM: ${def.severityGuidance.medium.description}`)
    lines.push(`  - HIGH: ${def.severityGuidance.high.description}`)
  }

  return lines.join('\n')
}
