/**
 * Category Definitions
 *
 * Story 20.2: Basic Category Taxonomy - AC3, AC4, AC5
 *
 * Comprehensive category metadata with descriptions, examples, and edge case guidance.
 * Used for consistent AI classification and UI display.
 *
 * Design Principles:
 * - Family-friendly labels: Non-judgmental, descriptive terminology
 * - Clear definitions: Unambiguous criteria for AI classification
 * - Edge case handling: Guidance for ambiguous content
 * - Extensibility: Versioned schema supporting future additions
 */

import { type Category, CATEGORY_VALUES } from '../contracts'

/**
 * Current taxonomy version.
 *
 * Story 20.2: Basic Category Taxonomy - AC5
 *
 * Increment when:
 * - Adding new categories
 * - Changing category definitions significantly
 * - Modifying classification behavior
 *
 * Format: MAJOR.MINOR (breaking.non-breaking)
 */
export const TAXONOMY_VERSION = '1.0' as const

/**
 * Low confidence threshold for "Other" category fallback.
 *
 * Story 20.2: Basic Category Taxonomy - AC6
 *
 * When AI confidence for all categories is below this threshold,
 * the screenshot is assigned to "Other" with isLowConfidence=true.
 */
export const LOW_CONFIDENCE_THRESHOLD = 30 as const

/**
 * Detailed category definition with examples and edge case guidance.
 *
 * Story 20.2: Basic Category Taxonomy - AC4
 */
export interface CategoryDefinition {
  /** Category identifier (matches CATEGORY_VALUES) */
  category: Category
  /** User-friendly display name */
  displayName: string
  /** Concise description for parents (1-2 sentences) */
  description: string
  /** Common examples of content in this category */
  examples: string[]
  /** Edge cases and how to handle ambiguity */
  edgeCases: string[]
  /** Keywords that strongly indicate this category */
  keywords: string[]
  /** UI color for category badges/chips (Tailwind color class) */
  color: string
  /** Icon name for category (lucide-react icon name) */
  icon: string
}

/**
 * Complete category definitions.
 *
 * Story 20.2: Basic Category Taxonomy - AC3, AC4
 *
 * Family-friendly labels with clear, non-judgmental descriptions.
 * Each category has examples and edge case guidance for consistent classification.
 */
export const CATEGORY_DEFINITIONS: Record<Category, CategoryDefinition> = {
  Homework: {
    category: 'Homework',
    displayName: 'Homework',
    description:
      'Academic assignments, schoolwork, and study materials directly tied to school requirements.',
    examples: [
      'Math homework problems',
      'Essay writing for class',
      'School portal (Canvas, Google Classroom)',
      'Study guides for tests',
      'Research for school projects',
      'Online quizzes and assessments',
    ],
    edgeCases: [
      'Khan Academy for homework help → Homework (if for assignment), Educational (if general learning)',
      'Wikipedia research → Homework (if for project), Educational (if curiosity)',
      'YouTube tutorial for school → Homework (if directly for assignment)',
    ],
    keywords: [
      'homework',
      'assignment',
      'school',
      'class',
      'teacher',
      'grade',
      'test',
      'quiz',
      'essay',
      'project',
    ],
    color: 'blue',
    icon: 'BookOpen',
  },

  Educational: {
    category: 'Educational',
    displayName: 'Educational',
    description:
      'Learning content not directly tied to school assignments - self-directed learning and curiosity.',
    examples: [
      'Wikipedia browsing',
      'Documentaries',
      'Language learning apps (Duolingo)',
      'Science videos',
      'Tutorial websites',
      'Online courses (Coursera, edX)',
    ],
    edgeCases: [
      'YouTube educational video → Educational (general), Homework (if for assignment)',
      'Reddit learning subreddit → Educational (if quality content), Social Media (if discussions)',
      'Coding tutorial → Educational (learning), Creative (if building project)',
    ],
    keywords: [
      'learn',
      'tutorial',
      'course',
      'education',
      'knowledge',
      'science',
      'history',
      'documentary',
      'lecture',
    ],
    color: 'green',
    icon: 'GraduationCap',
  },

  'Social Media': {
    category: 'Social Media',
    displayName: 'Social Media',
    description: 'Social networking platforms and content sharing communities.',
    examples: [
      'Instagram',
      'TikTok',
      'Snapchat',
      'Twitter/X',
      'Reddit',
      'Discord servers',
      'Facebook',
      'BeReal',
    ],
    edgeCases: [
      'Discord DM → Communication (direct message), Social Media (server browsing)',
      'Reddit educational post → Social Media (platform primary), Educational (content type)',
      'YouTube comments section → Entertainment (platform primary)',
    ],
    keywords: [
      'social',
      'post',
      'share',
      'follow',
      'like',
      'friend',
      'feed',
      'story',
      'reel',
      'tweet',
    ],
    color: 'pink',
    icon: 'Users',
  },

  Gaming: {
    category: 'Gaming',
    displayName: 'Gaming',
    description: 'Video games, game streaming, and gaming-related content.',
    examples: [
      'Roblox',
      'Minecraft',
      'Fortnite',
      'Steam store',
      'Twitch streams',
      'Gaming news sites',
      'Game wikis',
    ],
    edgeCases: [
      'Twitch just chatting → Entertainment (if not gaming), Gaming (if about games)',
      'YouTube gaming video → Gaming (gameplay), Entertainment (if review/commentary)',
      'Minecraft education mode → Educational (if school use), Gaming (if personal)',
    ],
    keywords: [
      'game',
      'play',
      'level',
      'score',
      'player',
      'stream',
      'gaming',
      'esports',
      'twitch',
      'xbox',
      'playstation',
    ],
    color: 'purple',
    icon: 'Gamepad2',
  },

  Entertainment: {
    category: 'Entertainment',
    displayName: 'Entertainment',
    description: 'Passive entertainment consumption - videos, movies, music, and streaming.',
    examples: [
      'YouTube videos',
      'Netflix',
      'Disney+',
      'Spotify',
      'Apple Music',
      'Movie websites',
      'TV show streaming',
    ],
    edgeCases: [
      'YouTube tutorial → Educational (if learning), Entertainment (if casual watching)',
      'Music while studying → Entertainment (primary activity)',
      'Movie for school assignment → Homework (if for class)',
    ],
    keywords: [
      'video',
      'watch',
      'movie',
      'show',
      'music',
      'stream',
      'episode',
      'playlist',
      'netflix',
      'youtube',
    ],
    color: 'red',
    icon: 'Play',
  },

  Communication: {
    category: 'Communication',
    displayName: 'Communication',
    description: 'Direct messaging, email, video calls, and one-on-one or group communication.',
    examples: [
      'Gmail',
      'iMessage',
      'WhatsApp',
      'Zoom calls',
      'FaceTime',
      'Google Meet',
      'Microsoft Teams (chat)',
    ],
    edgeCases: [
      'Discord DM → Communication (direct), Social Media (server)',
      'Email newsletter → Communication (format), News (content)',
      'Video call with friends → Communication (method)',
    ],
    keywords: ['message', 'email', 'call', 'chat', 'video call', 'text', 'inbox', 'send', 'reply'],
    color: 'cyan',
    icon: 'MessageCircle',
  },

  Creative: {
    category: 'Creative',
    displayName: 'Creative',
    description: 'Content creation, artistic tools, and creative activities.',
    examples: [
      'Digital drawing apps',
      'Photo editing (Photoshop, Canva)',
      'Video editing',
      'Music creation (GarageBand)',
      'Writing apps',
      'Coding projects',
    ],
    edgeCases: [
      'Coding tutorial → Educational (learning), Creative (building)',
      'Art for school → Homework (if assignment), Creative (if personal)',
      'Video editing for YouTube → Creative (activity), Entertainment (platform)',
    ],
    keywords: [
      'create',
      'draw',
      'design',
      'edit',
      'art',
      'music',
      'code',
      'build',
      'project',
      'make',
    ],
    color: 'orange',
    icon: 'Palette',
  },

  Shopping: {
    category: 'Shopping',
    displayName: 'Shopping',
    description: 'E-commerce, online stores, and product browsing.',
    examples: [
      'Amazon',
      'eBay',
      'Target',
      'Walmart online',
      'Etsy',
      'Product reviews',
      'Price comparison sites',
    ],
    edgeCases: [
      'Product research for school → Educational (if research), Shopping (if browsing)',
      'Wishlist browsing → Shopping (activity)',
      'Buying digital game → Shopping (transaction), Gaming (content)',
    ],
    keywords: ['shop', 'buy', 'cart', 'order', 'price', 'product', 'store', 'amazon', 'delivery'],
    color: 'yellow',
    icon: 'ShoppingCart',
  },

  News: {
    category: 'News',
    displayName: 'News',
    description: 'Current events, journalism, and news websites.',
    examples: [
      'CNN',
      'BBC',
      'New York Times',
      'Local news sites',
      'Apple News',
      'Google News',
      'News apps',
    ],
    edgeCases: [
      'Opinion article → News (if news site), Entertainment (if blog)',
      'News for school → Homework (if for current events assignment)',
      'Sports news → News (current events), Entertainment (casual reading)',
    ],
    keywords: ['news', 'article', 'headline', 'breaking', 'report', 'journalist', 'current events'],
    color: 'slate',
    icon: 'Newspaper',
  },

  Other: {
    category: 'Other',
    displayName: 'Other',
    description:
      'Content that does not clearly fit into other categories or has low classification confidence.',
    examples: [
      'System settings',
      'Unknown apps',
      'Ambiguous content',
      'Low-quality screenshots',
      'Mixed content',
    ],
    edgeCases: [
      'Default category when AI confidence is below threshold for all categories',
      'Used for truly ambiguous content that spans multiple categories',
      'System/utility screens with no clear content type',
    ],
    keywords: ['other', 'unknown', 'misc', 'various'],
    color: 'gray',
    icon: 'HelpCircle',
  },
}

/**
 * Get category definition by category name.
 *
 * @param category - Category name
 * @returns Category definition or undefined if not found
 */
export function getCategoryDefinition(category: Category): CategoryDefinition {
  return CATEGORY_DEFINITIONS[category]
}

/**
 * Get description for a category.
 *
 * @param category - Category name
 * @returns Category description
 */
export function getCategoryDescription(category: Category): string {
  return CATEGORY_DEFINITIONS[category]?.description ?? 'Unknown category'
}

/**
 * Get examples for a category.
 *
 * @param category - Category name
 * @returns Array of example strings
 */
export function getCategoryExamples(category: Category): string[] {
  return CATEGORY_DEFINITIONS[category]?.examples ?? []
}

/**
 * Get all category definitions as an array.
 *
 * @returns Array of all category definitions
 */
export function getAllCategoryDefinitions(): CategoryDefinition[] {
  return CATEGORY_VALUES.map((cat) => CATEGORY_DEFINITIONS[cat])
}

/**
 * Build prompt-ready category definitions string.
 *
 * Story 20.2: Basic Category Taxonomy - AC4
 *
 * Returns formatted category definitions for inclusion in AI classification prompt.
 */
export function buildCategoryDefinitionsForPrompt(): string {
  const lines: string[] = []

  for (const category of CATEGORY_VALUES) {
    const def = CATEGORY_DEFINITIONS[category]
    lines.push(`- ${def.category}: ${def.description}`)
    lines.push(`  Examples: ${def.examples.slice(0, 4).join(', ')}`)
  }

  return lines.join('\n')
}
