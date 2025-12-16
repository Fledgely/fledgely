import { z } from 'zod'

/**
 * Agreement Template Schema - Story 4.1: Template Library Structure
 *
 * This schema defines types for the template library that helps parents
 * find appropriate starting points for family agreements organized by child age.
 *
 * Templates are:
 * 1. Bundled in code (not stored in Firestore) for performance (S3: Bundled Templates)
 * 2. Organized by age groups: 5-7, 8-10, 11-13, 14-16
 * 3. Available in variations: strict, balanced, permissive
 * 4. Filterable by concerns: gaming, social_media, homework, screen_time, safety
 *
 * Design principles:
 * - Templates provide INITIAL content for agreements (ADR-004)
 * - Template sections align with agreementChangeTypeSchema types
 * - All content at 6th-grade reading level (NFR65)
 */

// ============================================
// AGE GROUP SCHEMA
// ============================================

/**
 * Age groups for organizing templates
 * Each group has developmentally appropriate content
 */
export const ageGroupSchema = z.enum(['5-7', '8-10', '11-13', '14-16'])

export type AgeGroup = z.infer<typeof ageGroupSchema>

/**
 * Human-readable labels for age groups
 */
export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  '5-7': 'Early Childhood (5-7 years)',
  '8-10': 'Middle Childhood (8-10 years)',
  '11-13': 'Early Adolescence (11-13 years)',
  '14-16': 'Late Adolescence (14-16 years)',
}

/**
 * Get human-readable label for an age group
 */
export function getAgeGroupLabel(ageGroup: AgeGroup): string {
  return AGE_GROUP_LABELS[ageGroup]
}

// ============================================
// TEMPLATE VARIATION SCHEMA
// ============================================

/**
 * Template variations representing different parenting approaches
 * - strict: More monitoring, lower limits, few exceptions
 * - balanced: Moderate monitoring, moderate limits, some flexibility
 * - permissive: Light monitoring, higher limits, trust-based
 */
export const templateVariationSchema = z.enum(['strict', 'balanced', 'permissive'])

export type TemplateVariation = z.infer<typeof templateVariationSchema>

/**
 * Human-readable labels for template variations
 */
export const TEMPLATE_VARIATION_LABELS: Record<TemplateVariation, string> = {
  strict: 'Strict',
  balanced: 'Balanced',
  permissive: 'Permissive',
}

/**
 * Descriptions for template variations at 6th-grade reading level
 */
export const TEMPLATE_VARIATION_DESCRIPTIONS: Record<TemplateVariation, string> = {
  strict: 'More rules and closer watching. Good for younger kids or when building trust.',
  balanced: 'A mix of rules and freedom. Good for most families.',
  permissive: 'More freedom and trust. Good for older kids who have shown responsibility.',
}

/**
 * Get human-readable label for a template variation
 */
export function getTemplateVariationLabel(variation: TemplateVariation): string {
  return TEMPLATE_VARIATION_LABELS[variation]
}

/**
 * Get description for a template variation
 */
export function getTemplateVariationDescription(variation: TemplateVariation): string {
  return TEMPLATE_VARIATION_DESCRIPTIONS[variation]
}

// ============================================
// TEMPLATE CONCERN SCHEMA
// ============================================

/**
 * Concerns/topics that templates address
 * Used for filtering and searching
 */
export const templateConcernSchema = z.enum([
  'gaming',
  'social_media',
  'homework',
  'screen_time',
  'safety',
])

export type TemplateConcern = z.infer<typeof templateConcernSchema>

/**
 * Array of all template concerns for iteration
 */
export const TEMPLATE_CONCERNS: readonly TemplateConcern[] = templateConcernSchema.options

/**
 * Human-readable labels for template concerns
 */
export const TEMPLATE_CONCERN_LABELS: Record<TemplateConcern, string> = {
  gaming: 'Gaming',
  social_media: 'Social Media',
  homework: 'Homework',
  screen_time: 'Screen Time',
  safety: 'Online Safety',
}

/**
 * Descriptions for template concerns at 6th-grade reading level
 */
export const TEMPLATE_CONCERN_DESCRIPTIONS: Record<TemplateConcern, string> = {
  gaming: 'Rules about video games and gaming time',
  social_media: 'Rules about apps like TikTok, Instagram, and Snapchat',
  homework: 'Rules about doing schoolwork before screen time',
  screen_time: 'Rules about how much time can be spent on screens',
  safety: 'Rules about staying safe online and who to talk to',
}

/**
 * Get human-readable label for a template concern
 */
export function getTemplateConcernLabel(concern: TemplateConcern): string {
  return TEMPLATE_CONCERN_LABELS[concern]
}

/**
 * Get description for a template concern
 */
export function getTemplateConcernDescription(concern: TemplateConcern): string {
  return TEMPLATE_CONCERN_DESCRIPTIONS[concern]
}

// ============================================
// MONITORING LEVEL SCHEMA
// ============================================

/**
 * Monitoring intensity levels for template summaries
 */
export const monitoringLevelSchema = z.enum(['light', 'moderate', 'comprehensive'])

export type MonitoringLevel = z.infer<typeof monitoringLevelSchema>

/**
 * Human-readable labels for monitoring levels
 */
export const MONITORING_LEVEL_LABELS: Record<MonitoringLevel, string> = {
  light: 'Light',
  moderate: 'Moderate',
  comprehensive: 'Comprehensive',
}

/**
 * Descriptions for monitoring levels at 6th-grade reading level
 */
export const MONITORING_LEVEL_DESCRIPTIONS: Record<MonitoringLevel, string> = {
  light: 'Parent checks in sometimes. Child has lots of privacy.',
  moderate: 'Parent checks in regularly. Child has some privacy.',
  comprehensive: 'Parent watches closely. Less privacy but more safety.',
}

/**
 * Get human-readable label for a monitoring level
 */
export function getMonitoringLevelLabel(level: MonitoringLevel): string {
  return MONITORING_LEVEL_LABELS[level]
}

/**
 * Get description for a monitoring level
 */
export function getMonitoringLevelDescription(level: MonitoringLevel): string {
  return MONITORING_LEVEL_DESCRIPTIONS[level]
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Maximum string lengths for template fields
 * Prevents storage bloat and ensures reasonable limits
 */
export const TEMPLATE_FIELD_LIMITS = {
  id: 128,
  name: 100,
  description: 500,
  sectionTitle: 100,
  sectionDescription: 1000,
  sectionDefaultValue: 5000,
  keyRuleText: 200,
  screenTimeLimitText: 100,
} as const

/**
 * Maximum number of items in template arrays
 */
export const TEMPLATE_ARRAY_LIMITS = {
  maxSections: 20,
  maxKeyRules: 5,
  maxConcerns: 5,
} as const

// ============================================
// TEMPLATE SUMMARY SCHEMA
// ============================================

/**
 * Preview summary for templates displayed in cards
 * Shows key information at a glance
 */
export const templateSummarySchema = z.object({
  /** Screen time limit text (e.g., "2 hours on school days, 4 hours on weekends") */
  screenTimeLimit: z
    .string()
    .min(1, 'Screen time limit is required')
    .max(TEMPLATE_FIELD_LIMITS.screenTimeLimitText),

  /** Overall monitoring intensity */
  monitoringLevel: monitoringLevelSchema,

  /** Top rules for quick preview (max 5) */
  keyRules: z
    .array(z.string().min(1).max(TEMPLATE_FIELD_LIMITS.keyRuleText))
    .min(1, 'At least one key rule is required')
    .max(TEMPLATE_ARRAY_LIMITS.maxKeyRules),
})

export type TemplateSummary = z.infer<typeof templateSummarySchema>

// ============================================
// VISUAL ELEMENTS SCHEMA (Story 4.2: Ages 5-7 Enhancement)
// ============================================

/**
 * Color hints for visual elements
 * Used to provide age-appropriate visual cues for younger children
 */
export const visualColorHintSchema = z.enum(['green', 'yellow', 'red', 'blue', 'purple', 'orange'])

export type VisualColorHint = z.infer<typeof visualColorHintSchema>

/**
 * Visual elements for template sections
 * Primarily used for ages 5-7 to emphasize visual indicators and simple yes/no rules
 *
 * Story 4.2 AC #6: Templates for ages 5-7 emphasize visual elements and simple yes/no rules
 */
export const visualElementsSchema = z.object({
  /** Icon or emoji to display (e.g., '✅', '❌', '⏰', '🎮') */
  icon: z.string().max(10).optional(),

  /** Whether this section represents a simple yes/no rule for young children */
  isYesNoRule: z.boolean().default(false),

  /** Color hint for visual styling */
  colorHint: visualColorHintSchema.optional(),

  /** Alternative text for screen readers (NFR42 accessibility) */
  altText: z.string().max(100).optional(),
})

export type VisualElements = z.infer<typeof visualElementsSchema>

// ============================================
// AUTONOMY MILESTONES SCHEMA (Story 4.2: Ages 14-16 Enhancement)
// ============================================

/**
 * Criteria for earning an autonomy milestone
 * Story 4.2 AC #5: Ages 14-16 templates include earned autonomy milestones
 */
export const autonomyMilestoneCriteriaSchema = z.object({
  /** Minimum trust score required (0-100) */
  trustScoreThreshold: z.number().min(0).max(100).optional(),

  /** Time period without incidents (e.g., "1 month", "3 months") */
  timeWithoutIncident: z.string().max(50).optional(),

  /** Whether parent approval is required to unlock */
  parentApproval: z.boolean().default(true),
})

export type AutonomyMilestoneCriteria = z.infer<typeof autonomyMilestoneCriteriaSchema>

/**
 * An earned autonomy milestone for older teens
 *
 * Story 4.2 AC #5: Ages 14-16 templates include earned autonomy milestones
 * References Epic 52 Reverse Mode concepts (age 16 transition, trusted adults)
 */
export const autonomyMilestoneSchema = z.object({
  /** Unique milestone ID */
  id: z.string().min(1).max(128),

  /** Human-readable milestone title */
  title: z.string().min(1).max(100),

  /** Description of what this milestone represents */
  description: z.string().min(1).max(500),

  /** Criteria that must be met to earn this milestone */
  criteria: autonomyMilestoneCriteriaSchema,

  /** What freedoms/privileges this milestone grants when earned */
  unlocks: z.array(z.string().min(1).max(200)).min(1).max(10),

  /** Order in the progression (1 = first milestone) */
  order: z.number().int().min(1).max(10),
})

export type AutonomyMilestone = z.infer<typeof autonomyMilestoneSchema>

/**
 * Maximum milestones per template
 */
export const MAX_AUTONOMY_MILESTONES = 10

// ============================================
// TEMPLATE SECTION SCHEMA
// ============================================

/**
 * Section type - aligns with agreementChangeTypeSchema for consistency
 */
export const templateSectionTypeSchema = z.enum([
  'terms', // General terms and conditions
  'monitoring_rules', // What monitoring occurs and when
  'screen_time', // Screen time limits and schedules
  'bedtime_schedule', // Bedtime/device lockout times
  'app_restrictions', // Allowed/blocked app lists
  'content_filters', // Age restrictions and content filtering
  'consequences', // What happens on violations
  'rewards', // Incentives for compliance
])

export type TemplateSectionType = z.infer<typeof templateSectionTypeSchema>

/**
 * A section within a template
 * Represents a configurable part of the family agreement
 */
export const templateSectionSchema = z.object({
  /** Unique section ID within the template */
  id: z.string().min(1, 'Section ID is required').max(TEMPLATE_FIELD_LIMITS.id),

  /** Section type (aligns with agreement change types) */
  type: templateSectionTypeSchema,

  /** Human-readable section title */
  title: z.string().min(1, 'Section title is required').max(TEMPLATE_FIELD_LIMITS.sectionTitle),

  /** Description explaining what this section covers */
  description: z
    .string()
    .min(1, 'Section description is required')
    .max(TEMPLATE_FIELD_LIMITS.sectionDescription),

  /** Default value/content for this section */
  defaultValue: z
    .string()
    .min(1, 'Default value is required')
    .max(TEMPLATE_FIELD_LIMITS.sectionDefaultValue),

  /** Whether this section can be customized by the parent */
  customizable: z.boolean(),

  /** Display order within the template (lower = earlier) */
  order: z.number().int().min(0).max(99),

  /**
   * Visual elements for age-appropriate presentation
   * Story 4.2 AC #6: Ages 5-7 templates emphasize visual elements and simple yes/no rules
   */
  visualElements: visualElementsSchema.optional(),
})

export type TemplateSection = z.infer<typeof templateSectionSchema>

// ============================================
// AGREEMENT TEMPLATE SCHEMA
// ============================================

/**
 * A complete agreement template
 */
export const agreementTemplateSchema = z.object({
  /** Unique template ID (UUID format) */
  id: z.string().uuid('Template ID must be a valid UUID'),

  /** Template name displayed to users */
  name: z.string().min(1, 'Template name is required').max(TEMPLATE_FIELD_LIMITS.name),

  /** Template description explaining when to use it */
  description: z.string().min(1, 'Description is required').max(TEMPLATE_FIELD_LIMITS.description),

  /** Target age group for this template */
  ageGroup: ageGroupSchema,

  /** Parenting approach variation */
  variation: templateVariationSchema,

  /** Concerns/topics this template addresses */
  concerns: z
    .array(templateConcernSchema)
    .min(1, 'At least one concern is required')
    .max(TEMPLATE_ARRAY_LIMITS.maxConcerns),

  /** Summary for preview display */
  summary: templateSummarySchema,

  /** Template sections (agreement content) */
  sections: z
    .array(templateSectionSchema)
    .min(1, 'At least one section is required')
    .max(TEMPLATE_ARRAY_LIMITS.maxSections),

  /**
   * Autonomy milestones for older teens (ages 14-16)
   * Story 4.2 AC #5: Ages 14-16 templates include earned autonomy milestones
   * References Epic 52 Reverse Mode concepts (age 16 transition, trusted adults)
   */
  autonomyMilestones: z.array(autonomyMilestoneSchema).max(MAX_AUTONOMY_MILESTONES).optional(),

  /** When this template was created (ISO 8601 datetime) */
  createdAt: z.string().datetime('Invalid datetime format'),

  /** When this template was last updated (ISO 8601 datetime) */
  updatedAt: z.string().datetime('Invalid datetime format'),
})

export type AgreementTemplate = z.infer<typeof agreementTemplateSchema>

// ============================================
// INPUT SCHEMAS
// ============================================

/**
 * Input for filtering templates by age group
 */
export const filterByAgeGroupInputSchema = z.object({
  ageGroup: ageGroupSchema,
})

export type FilterByAgeGroupInput = z.infer<typeof filterByAgeGroupInputSchema>

/**
 * Input for filtering templates by concerns
 */
export const filterByConcernsInputSchema = z.object({
  concerns: z.array(templateConcernSchema).min(1, 'At least one concern is required'),
})

export type FilterByConcernsInput = z.infer<typeof filterByConcernsInputSchema>

/**
 * Input for searching templates
 */
export const searchTemplatesInputSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100),
  ageGroup: ageGroupSchema.optional(),
  concerns: z.array(templateConcernSchema).optional(),
})

export type SearchTemplatesInput = z.infer<typeof searchTemplatesInputSchema>

/**
 * Response for template library API
 */
export const templateLibraryResponseSchema = z.object({
  templates: z.array(agreementTemplateSchema),
  totalCount: z.number().int().min(0),
  filteredCount: z.number().int().min(0),
})

export type TemplateLibraryResponse = z.infer<typeof templateLibraryResponseSchema>

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safely parse an agreement template, returning null if invalid
 */
export function safeParseAgreementTemplate(data: unknown): AgreementTemplate | null {
  const result = agreementTemplateSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Validate agreement template input
 */
export function validateAgreementTemplate(data: unknown): AgreementTemplate {
  return agreementTemplateSchema.parse(data)
}

/**
 * Safely parse a template section
 */
export function safeParseTemplateSection(data: unknown): TemplateSection | null {
  const result = templateSectionSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Safely parse a template summary
 */
export function safeParseTemplateSummary(data: unknown): TemplateSummary | null {
  const result = templateSummarySchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Calculate suggested age group from birth date
 */
export function calculateAgeGroupFromBirthDate(
  birthDate: Date,
  referenceDate: Date = new Date()
): AgeGroup | null {
  const ageMs = referenceDate.getTime() - birthDate.getTime()
  const ageYears = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000))

  if (ageYears >= 5 && ageYears <= 7) return '5-7'
  if (ageYears >= 8 && ageYears <= 10) return '8-10'
  if (ageYears >= 11 && ageYears <= 13) return '11-13'
  if (ageYears >= 14 && ageYears <= 16) return '14-16'

  // Outside supported age range
  return null
}

/**
 * Check if a template matches a concern filter
 */
export function templateMatchesConcerns(
  template: AgreementTemplate,
  concerns: TemplateConcern[]
): boolean {
  if (concerns.length === 0) return true
  return concerns.some((concern) => template.concerns.includes(concern))
}

/**
 * Check if a template matches a search query (name or description)
 */
export function templateMatchesSearch(template: AgreementTemplate, query: string): boolean {
  const lowerQuery = query.toLowerCase().trim()
  if (!lowerQuery) return true

  return (
    template.name.toLowerCase().includes(lowerQuery) ||
    template.description.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Sort templates by variation (strict first, then balanced, then permissive)
 */
export function sortTemplatesByVariation(templates: AgreementTemplate[]): AgreementTemplate[] {
  const variationOrder: Record<TemplateVariation, number> = {
    strict: 0,
    balanced: 1,
    permissive: 2,
  }

  return [...templates].sort((a, b) => variationOrder[a.variation] - variationOrder[b.variation])
}

/**
 * Group templates by age group
 */
export function groupTemplatesByAgeGroup(
  templates: AgreementTemplate[]
): Record<AgeGroup, AgreementTemplate[]> {
  const groups: Record<AgeGroup, AgreementTemplate[]> = {
    '5-7': [],
    '8-10': [],
    '11-13': [],
    '14-16': [],
  }

  for (const template of templates) {
    groups[template.ageGroup].push(template)
  }

  return groups
}

/**
 * Get default monitoring level for an age group
 */
export function getDefaultMonitoringLevel(ageGroup: AgeGroup): MonitoringLevel {
  switch (ageGroup) {
    case '5-7':
      return 'comprehensive'
    case '8-10':
      return 'comprehensive'
    case '11-13':
      return 'moderate'
    case '14-16':
      return 'light'
  }
}

// ============================================
// MONITORING INTENSITY VALIDATION (Story 4.2: AC #3)
// ============================================

/**
 * Monitoring level intensity values (higher = more intensive)
 * Used for comparing and validating monitoring appropriateness
 */
export const MONITORING_INTENSITY_VALUES: Record<MonitoringLevel, number> = {
  light: 1,
  moderate: 2,
  comprehensive: 3,
}

/**
 * Get allowed monitoring levels for an age group
 * Story 4.2 AC #3: Monitoring intensity decreases with age
 *
 * - 5-7: comprehensive only (highest safety)
 * - 8-10: comprehensive or moderate
 * - 11-13: moderate or light
 * - 14-16: light or moderate (transitioning to independence)
 */
export function getAllowedMonitoringLevels(ageGroup: AgeGroup): MonitoringLevel[] {
  switch (ageGroup) {
    case '5-7':
      return ['comprehensive']
    case '8-10':
      return ['comprehensive', 'moderate']
    case '11-13':
      return ['moderate', 'light']
    case '14-16':
      return ['light', 'moderate']
  }
}

/**
 * Monitoring validation result
 */
export interface MonitoringValidationResult {
  /** Whether the level is appropriate for the age group */
  isAppropriate: boolean
  /** The actual monitoring level */
  level: MonitoringLevel
  /** Recommended default for age group */
  recommendedLevel: MonitoringLevel
  /** Allowed levels for age group */
  allowedLevels: MonitoringLevel[]
  /** Warning message if level seems inappropriate (empty if appropriate) */
  warning: string
}

/**
 * Validate monitoring level for an age group
 *
 * Story 4.2 AC #3: Monitoring intensity defaults decrease with age
 * (younger = more comprehensive monitoring)
 *
 * @param level - Monitoring level to validate
 * @param ageGroup - Target age group
 * @returns Validation result with warning if inappropriate
 */
export function validateMonitoringLevelForAge(
  level: MonitoringLevel,
  ageGroup: AgeGroup
): MonitoringValidationResult {
  const recommendedLevel = getDefaultMonitoringLevel(ageGroup)
  const allowedLevels = getAllowedMonitoringLevels(ageGroup)
  const isAppropriate = allowedLevels.includes(level)

  let warning = ''
  if (!isAppropriate) {
    const currentIntensity = MONITORING_INTENSITY_VALUES[level]
    const recommendedIntensity = MONITORING_INTENSITY_VALUES[recommendedLevel]

    if (currentIntensity < recommendedIntensity) {
      warning = `${getMonitoringLevelLabel(level)} monitoring may not provide enough oversight for ages ${ageGroup}. Consider ${getMonitoringLevelLabel(recommendedLevel)} monitoring.`
    } else {
      warning = `${getMonitoringLevelLabel(level)} monitoring may be too restrictive for ages ${ageGroup}. Consider ${getMonitoringLevelLabel(recommendedLevel)} monitoring.`
    }
  }

  return {
    isAppropriate,
    level,
    recommendedLevel,
    allowedLevels,
    warning,
  }
}

/**
 * Check if monitoring intensity decreases properly with age
 * Used to validate that older age groups don't have higher monitoring than younger ones
 *
 * @param youngerLevel - Monitoring level for younger age group
 * @param olderLevel - Monitoring level for older age group
 * @returns True if the progression is appropriate (older has same or less monitoring)
 */
export function isMonitoringProgressionValid(
  youngerLevel: MonitoringLevel,
  olderLevel: MonitoringLevel
): boolean {
  const youngerIntensity = MONITORING_INTENSITY_VALUES[youngerLevel]
  const olderIntensity = MONITORING_INTENSITY_VALUES[olderLevel]
  return olderIntensity <= youngerIntensity
}

/**
 * Get recommended screen time range for an age group (in minutes)
 */
export function getRecommendedScreenTimeRange(ageGroup: AgeGroup): { min: number; max: number } {
  switch (ageGroup) {
    case '5-7':
      return { min: 30, max: 60 }
    case '8-10':
      return { min: 60, max: 120 }
    case '11-13':
      return { min: 120, max: 180 }
    case '14-16':
      return { min: 180, max: 240 }
  }
}

// ============================================
// AGE-RELEVANT EXAMPLES (Story 4.2: Task 6)
// ============================================

/**
 * Example category types for age-appropriate rule explanations
 */
export type ExampleCategory =
  | 'activities'
  | 'apps_games'
  | 'content'
  | 'social'
  | 'safety'
  | 'rewards'

/**
 * Age-relevant examples for rule explanations
 * Story 4.2 AC #4: Rule explanations use examples relevant to that age group
 */
export interface AgeRelevantExamples {
  /** Activities familiar to this age group */
  activities: string[]
  /** Apps and games appropriate for this age group */
  apps_games: string[]
  /** Content types appropriate for this age group */
  content: string[]
  /** Social scenarios relevant to this age group */
  social: string[]
  /** Safety scenarios to watch for */
  safety: string[]
  /** Reward ideas appropriate for this age group */
  rewards: string[]
}

/**
 * Example banks by age group
 * Story 4.2 AC #4: Examples match child's developmental stage
 */
export const AGE_RELEVANT_EXAMPLES: Record<AgeGroup, AgeRelevantExamples> = {
  '5-7': {
    activities: [
      'playing on the playground',
      'watching favorite cartoons',
      'bedtime stories',
      'coloring games',
      'simple puzzles',
    ],
    apps_games: [
      'PBS Kids games',
      'ABC Mouse',
      'educational drawing apps',
      'Nick Jr. shows',
      'simple matching games',
    ],
    content: [
      'cartoons',
      'bedtime stories',
      'sing-along songs',
      'animal videos',
      'learning videos',
    ],
    social: [
      'playing games together',
      'sharing toys online',
      'video calls with grandparents',
      'watching shows with family',
    ],
    safety: [
      'talking to strangers online',
      'scary pictures',
      'mean messages',
      'leaving apps without asking',
    ],
    rewards: [
      'extra cartoon time',
      'choosing the next game',
      'special stickers',
      'playing a favorite game',
    ],
  },
  '8-10': {
    activities: [
      'homework research',
      'Minecraft building',
      'Roblox games',
      'watching YouTube Kids',
      'virtual worlds',
    ],
    apps_games: [
      'Minecraft',
      'Roblox',
      'YouTube Kids',
      'Pokemon GO',
      'educational math games',
      'Scratch coding',
    ],
    content: [
      'gaming videos',
      'how-to videos',
      'funny animal videos',
      'science experiments',
      'sports highlights',
    ],
    social: [
      'playing online with school friends',
      'family group chats',
      'sharing game achievements',
      'virtual birthday parties',
    ],
    safety: [
      'chat requests from strangers',
      'in-app purchases',
      'sharing personal information',
      'inappropriate game content',
    ],
    rewards: [
      'extra gaming time',
      'new app or game download',
      'later weekend bedtime',
      'choice of movie night film',
    ],
  },
  '11-13': {
    activities: [
      'group gaming sessions',
      'streaming videos',
      'homework research',
      'creative projects',
      'online clubs',
    ],
    apps_games: [
      'Fortnite',
      'Discord',
      'TikTok (supervised)',
      'YouTube',
      'Spotify',
      'creative apps like Canva',
    ],
    content: [
      'gaming streams',
      'music videos',
      'tutorials',
      'sports content',
      'fan communities',
    ],
    social: [
      'group chats with friends',
      'online gaming teams',
      'sharing creative work',
      'school project collaboration',
    ],
    safety: [
      'cyberbullying',
      'sharing location',
      'online predators',
      'inappropriate content in games',
      'peer pressure in chats',
    ],
    rewards: [
      'extended weekend screen time',
      'new game purchase',
      'private messaging privileges',
      'later device curfew',
    ],
  },
  '14-16': {
    activities: [
      'social media',
      'online reputation building',
      'college prep research',
      'job applications',
      'creative portfolios',
    ],
    apps_games: [
      'Instagram',
      'Snapchat',
      'Twitter/X',
      'LinkedIn (for older teens)',
      'productivity apps',
      'creative suites',
    ],
    content: [
      'news and current events',
      'career exploration',
      'college tours',
      'skill-building tutorials',
      'online courses',
    ],
    social: [
      'building online presence',
      'networking for opportunities',
      'managing digital reputation',
      'group projects online',
    ],
    safety: [
      'online reputation damage',
      'data privacy',
      'scams and phishing',
      'inappropriate relationships',
      'oversharing personal info',
    ],
    rewards: [
      'self-managed screen time',
      'private social media accounts',
      'trusted adult status',
      'input on family tech policies',
    ],
  },
}

/**
 * Get age-relevant examples for an age group
 *
 * @param ageGroup - Target age group
 * @returns Examples appropriate for that age group
 */
export function getAgeRelevantExamples(ageGroup: AgeGroup): AgeRelevantExamples {
  return AGE_RELEVANT_EXAMPLES[ageGroup]
}

/**
 * Get examples for a specific category and age group
 *
 * @param ageGroup - Target age group
 * @param category - Example category
 * @returns Array of examples for that category
 */
export function getExamplesByCategory(ageGroup: AgeGroup, category: ExampleCategory): string[] {
  return AGE_RELEVANT_EXAMPLES[ageGroup][category]
}

/**
 * Format examples as a readable string
 *
 * @param examples - Array of example strings
 * @param maxExamples - Maximum number of examples to include
 * @returns Formatted string like "Minecraft, Roblox, and YouTube Kids"
 */
export function formatExampleList(examples: string[], maxExamples = 3): string {
  const limited = examples.slice(0, maxExamples)
  if (limited.length === 0) return ''
  if (limited.length === 1) return limited[0]
  if (limited.length === 2) return `${limited[0]} and ${limited[1]}`

  const last = limited.pop()
  return `${limited.join(', ')}, and ${last}`
}

// ============================================
// SCREEN TIME RANGE SCHEMA (Story 4.2: Screen Time Validation)
// ============================================

/**
 * Screen time range metadata for templates
 * Story 4.2 AC #2: Screen time defaults are age-appropriate
 */
export const screenTimeRangeSchema = z.object({
  /** Minimum screen time in minutes */
  minMinutes: z.number().int().min(0).max(480),

  /** Maximum screen time in minutes */
  maxMinutes: z.number().int().min(0).max(480),

  /** Unit label for display */
  unit: z.enum(['minutes', 'hours']).default('minutes'),
})

export type ScreenTimeRange = z.infer<typeof screenTimeRangeSchema>

/**
 * Screen time validation result
 */
export interface ScreenTimeValidationResult {
  /** Whether the value is within recommended range */
  isWithinRange: boolean
  /** The actual value in minutes */
  valueMinutes: number
  /** Recommended minimum for age group */
  recommendedMin: number
  /** Recommended maximum for age group */
  recommendedMax: number
  /** Warning message if exceeds recommendations (empty if within range) */
  warning: string
}

/**
 * Parse screen time text to extract minutes
 * Handles formats like "30 minutes", "1 hour", "1.5 hours", "2 hours on school days"
 *
 * @param text - Screen time text to parse
 * @returns Minutes value or null if not parseable
 */
export function parseScreenTimeText(text: string): number | null {
  // Match hours pattern (e.g., "1 hour", "2 hours", "1.5 hours")
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr)s?/i)
  if (hourMatch) {
    return Math.round(parseFloat(hourMatch[1]) * 60)
  }

  // Match minutes pattern (e.g., "30 minutes", "45 min")
  const minuteMatch = text.match(/(\d+)\s*(?:minute|min)s?/i)
  if (minuteMatch) {
    return parseInt(minuteMatch[1], 10)
  }

  return null
}

/**
 * Validate screen time value against age-appropriate recommendations
 *
 * Story 4.2 AC #2: Screen time defaults are age-appropriate
 * - Younger = less screen time (5-7: 30-60min)
 * - Older = more screen time (14-16: 3-4hr)
 *
 * @param minutes - Screen time value in minutes
 * @param ageGroup - Target age group
 * @returns Validation result with warning if exceeds recommendations
 */
export function validateScreenTimeForAge(
  minutes: number,
  ageGroup: AgeGroup
): ScreenTimeValidationResult {
  const range = getRecommendedScreenTimeRange(ageGroup)
  const isWithinRange = minutes >= range.min && minutes <= range.max

  let warning = ''
  if (!isWithinRange) {
    if (minutes < range.min) {
      warning = `Screen time of ${minutes} minutes is below the recommended minimum of ${range.min} minutes for ages ${ageGroup}.`
    } else {
      warning = `Screen time of ${minutes} minutes exceeds the recommended maximum of ${range.max} minutes for ages ${ageGroup}.`
    }
  }

  return {
    isWithinRange,
    valueMinutes: minutes,
    recommendedMin: range.min,
    recommendedMax: range.max,
    warning,
  }
}

/**
 * Validate screen time text against age-appropriate recommendations
 *
 * @param text - Screen time text (e.g., "1 hour on school days")
 * @param ageGroup - Target age group
 * @returns Validation result or null if text cannot be parsed
 */
export function validateScreenTimeTextForAge(
  text: string,
  ageGroup: AgeGroup
): ScreenTimeValidationResult | null {
  const minutes = parseScreenTimeText(text)
  if (minutes === null) return null

  return validateScreenTimeForAge(minutes, ageGroup)
}

/**
 * Get age-appropriate screen time range as formatted text
 *
 * @param ageGroup - Target age group
 * @returns Formatted screen time range (e.g., "30-60 minutes", "2-3 hours")
 */
export function getScreenTimeRangeText(ageGroup: AgeGroup): string {
  const range = getRecommendedScreenTimeRange(ageGroup)

  // For values under an hour, show minutes
  if (range.max <= 60) {
    return `${range.min}-${range.max} minutes`
  }

  // For values of an hour or more, show hours
  const minHours = range.min / 60
  const maxHours = range.max / 60

  // Format nicely (1 hour vs 1.5 hours)
  const formatHours = (h: number) => {
    if (h === 1) return '1 hour'
    if (Number.isInteger(h)) return `${h} hours`
    return `${h} hours`
  }

  return `${formatHours(minHours)}-${formatHours(maxHours)}`
}

// ============================================
// ERROR MESSAGES
// ============================================

/**
 * Error messages for template operations (6th-grade reading level)
 */
export const TEMPLATE_ERROR_MESSAGES: Record<string, string> = {
  'not-found': 'Could not find that template.',
  'invalid-age-group': 'Please pick a valid age group.',
  'invalid-variation': 'Please pick a valid template type.',
  'invalid-concern': 'Please pick a valid topic.',
  'no-templates': 'No templates match your search. Try different filters.',
  'load-failed': 'Could not load templates. Please try again.',
  'invalid-template': 'This template has a problem. Please pick another one.',
  unknown: 'Something went wrong. Please try again.',
}

/**
 * Get user-friendly error message for template operations
 */
export function getTemplateErrorMessage(code: keyof typeof TEMPLATE_ERROR_MESSAGES | string): string {
  return TEMPLATE_ERROR_MESSAGES[code] || TEMPLATE_ERROR_MESSAGES.unknown
}
