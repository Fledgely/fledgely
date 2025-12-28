/**
 * Static agreement templates data.
 *
 * Story 4.1: Template Library Structure - AC1, AC2, AC3
 *
 * Templates are organized by age group (5-7, 8-10, 11-13, 14-16) with
 * 2-3 variations per group (strict, balanced, permissive).
 */

import type { AgreementTemplate } from '@fledgely/shared/contracts'

/**
 * Pre-built agreement templates for families.
 *
 * Each template includes age-appropriate screen time limits,
 * monitoring levels, and key rules.
 */
export const AGREEMENT_TEMPLATES: AgreementTemplate[] = [
  // Age Group 5-7 (Young Children)
  {
    id: 'strict-5-7',
    name: 'Supervised Explorer',
    description:
      'High supervision for young children just starting with devices. All activity is monitored with parent present.',
    ageGroup: '5-7',
    variation: 'strict',
    categories: ['general'],
    screenTimeLimits: { weekday: 60, weekend: 90 },
    monitoringLevel: 'high',
    keyRules: [
      'Device only in common areas',
      'Parent approves all apps',
      'No social media',
      'No in-app purchases',
      'Ask before downloading',
    ],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'balanced-5-7',
    name: 'Guided Learner',
    description:
      'Moderate supervision with focus on educational content. Parent oversight with some independence for approved apps.',
    ageGroup: '5-7',
    variation: 'balanced',
    categories: ['general', 'homework'],
    screenTimeLimits: { weekday: 90, weekend: 120 },
    monitoringLevel: 'high',
    keyRules: [
      'Educational apps encouraged',
      'Parent approves new apps',
      'Device in common areas',
      'No social media',
    ],
    createdAt: new Date('2024-01-01'),
  },

  // Age Group 8-10 (Pre-Teens)
  {
    id: 'strict-8-10',
    name: 'Safe Surfer',
    description:
      'Strong boundaries for pre-teens with active parental oversight. Limited gaming and no social media.',
    ageGroup: '8-10',
    variation: 'strict',
    categories: ['general', 'gaming'],
    screenTimeLimits: { weekday: 60, weekend: 120 },
    monitoringLevel: 'high',
    keyRules: [
      'No social media accounts',
      'Gaming limited to weekends',
      'All downloads need approval',
      'Device charged outside bedroom',
      'No private messaging apps',
    ],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'balanced-8-10',
    name: 'Responsible Explorer',
    description:
      'Balanced approach allowing supervised gaming and educational use. Building digital citizenship skills.',
    ageGroup: '8-10',
    variation: 'balanced',
    categories: ['general', 'gaming', 'homework'],
    screenTimeLimits: { weekday: 90, weekend: 150 },
    monitoringLevel: 'medium',
    keyRules: [
      'Homework before entertainment',
      'Approved gaming only',
      'Report anything uncomfortable',
      'No sharing personal info online',
    ],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'permissive-8-10',
    name: 'Growing Independence',
    description:
      'More freedom with clear expectations. Trust-building approach with regular check-ins.',
    ageGroup: '8-10',
    variation: 'permissive',
    categories: ['general', 'gaming'],
    screenTimeLimits: { weekday: 120, weekend: 180 },
    monitoringLevel: 'medium',
    keyRules: [
      'Complete responsibilities first',
      'Check in about online experiences',
      'No late night device use',
    ],
    createdAt: new Date('2024-01-01'),
  },

  // Age Group 11-13 (Middle School)
  {
    id: 'strict-11-13',
    name: 'Digital Guardian',
    description: 'Strong oversight for early teens navigating social media and online pressures.',
    ageGroup: '11-13',
    variation: 'strict',
    categories: ['general', 'social_media', 'gaming'],
    screenTimeLimits: { weekday: 90, weekend: 150 },
    monitoringLevel: 'high',
    keyRules: [
      'Parent follows all social accounts',
      'No private social media accounts',
      'Device curfew at 9pm',
      'No group chats without parent knowing',
      'Report cyberbullying immediately',
    ],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'balanced-11-13',
    name: 'Connected Teen',
    description:
      'Supervised social media access with clear guidelines. Building online safety awareness.',
    ageGroup: '11-13',
    variation: 'balanced',
    categories: ['general', 'social_media', 'gaming', 'homework'],
    screenTimeLimits: { weekday: 120, weekend: 180 },
    monitoringLevel: 'medium',
    keyRules: [
      'Parent knows all passwords',
      'No posting personal info',
      'Homework completed before gaming',
      'Weekly social media check-in',
    ],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'permissive-11-13',
    name: 'Trusted Teen',
    description:
      'Extended freedom for responsible teens. Focus on open communication over monitoring.',
    ageGroup: '11-13',
    variation: 'permissive',
    categories: ['general', 'social_media'],
    screenTimeLimits: { weekday: 150, weekend: 240 },
    monitoringLevel: 'low',
    keyRules: [
      'Open communication about online life',
      'Come to parent with concerns',
      'Maintain good grades',
    ],
    createdAt: new Date('2024-01-01'),
  },

  // Age Group 14-16 (High School)
  {
    id: 'strict-14-16',
    name: 'Focused Student',
    description:
      'Structure for teens who need boundaries. Academic focus with limited entertainment.',
    ageGroup: '14-16',
    variation: 'strict',
    categories: ['general', 'social_media', 'homework'],
    screenTimeLimits: { weekday: 120, weekend: 180 },
    monitoringLevel: 'medium',
    keyRules: [
      'No devices during homework',
      'Social media time limited',
      'No phone at dinner',
      'Device curfew at 10pm on school nights',
      'Grades must stay above minimum',
    ],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'balanced-14-16',
    name: 'Emerging Adult',
    description: 'Growing autonomy with accountability. Preparing for digital independence.',
    ageGroup: '14-16',
    variation: 'balanced',
    categories: ['general', 'social_media', 'gaming'],
    screenTimeLimits: { weekday: 180, weekend: 300 },
    monitoringLevel: 'low',
    keyRules: [
      'Maintain academic performance',
      'Respect family screen-free times',
      'Monthly check-in about online life',
      'No anonymous accounts',
    ],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'permissive-14-16',
    name: 'Independent Teen',
    description:
      'Near-adult freedom with clear expectations. Trust-based approach for responsible teens.',
    ageGroup: '14-16',
    variation: 'permissive',
    categories: ['general'],
    screenTimeLimits: { weekday: 240, weekend: 360 },
    monitoringLevel: 'low',
    keyRules: [
      'Maintain responsibilities',
      'Be reachable by family',
      'Practice safe digital habits',
    ],
    createdAt: new Date('2024-01-01'),
  },
]

/**
 * Get all available age groups.
 */
export const AGE_GROUPS = ['5-7', '8-10', '11-13', '14-16'] as const

/**
 * Get all template variations.
 */
export const TEMPLATE_VARIATIONS = ['strict', 'balanced', 'permissive'] as const

/**
 * Get all template categories.
 */
export const TEMPLATE_CATEGORIES = ['gaming', 'social_media', 'homework', 'general'] as const

/**
 * Human-readable labels for age groups.
 */
export const AGE_GROUP_LABELS: Record<string, string> = {
  '5-7': 'Ages 5-7',
  '8-10': 'Ages 8-10',
  '11-13': 'Ages 11-13',
  '14-16': 'Ages 14-16',
}

/**
 * Human-readable labels for variations.
 */
export const VARIATION_LABELS: Record<string, string> = {
  strict: 'Strict',
  balanced: 'Balanced',
  permissive: 'Permissive',
}

/**
 * Human-readable labels for categories.
 */
export const CATEGORY_LABELS: Record<string, string> = {
  gaming: 'Gaming',
  social_media: 'Social Media',
  homework: 'Homework',
  general: 'General',
}

/**
 * Human-readable labels for monitoring levels.
 */
export const MONITORING_LEVEL_LABELS: Record<string, string> = {
  high: 'High Monitoring',
  medium: 'Medium Monitoring',
  low: 'Light Monitoring',
}
