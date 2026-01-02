/**
 * Digital Wellness Tip Service - Story 38.7 Task 3
 *
 * Service for digital wellness tips.
 * AC1: Optional digital wellness tips available
 */

import {
  createWellnessTip,
  type DigitalWellnessTip,
  type WellnessTipCategory,
} from '../contracts/postGraduation'

// ============================================
// In-Memory Storage (would be Firestore in production)
// ============================================

const tipStore: DigitalWellnessTip[] = []
const dismissedTipsStore = new Map<string, string[]>() // alumniId -> tipIds
const preferencesStore = new Map<string, Map<WellnessTipCategory, boolean>>()

// ============================================
// Tip Retrieval Functions (AC1)
// ============================================

/**
 * Get all wellness tips.
 * AC1: Optional digital wellness tips available.
 *
 * @returns Array of active wellness tips
 */
export function getWellnessTips(): DigitalWellnessTip[] {
  return tipStore.filter((tip) => tip.isActive)
}

/**
 * Get tips by category.
 * AC1: Optional digital wellness tips available.
 *
 * @param category - The tip category
 * @returns Array of tips in the category
 */
export function getTipsByCategory(category: WellnessTipCategory): DigitalWellnessTip[] {
  return tipStore.filter((tip) => tip.isActive && tip.category === category)
}

/**
 * Get the tip of the day for an alumni.
 * Uses a deterministic algorithm based on date and alumni ID.
 *
 * @param alumniId - The alumni's ID
 * @returns The tip of the day or null if all dismissed
 */
export function getTipOfTheDay(alumniId: string): DigitalWellnessTip | null {
  const activeTips = getActiveTips(alumniId)

  if (activeTips.length === 0) {
    return null
  }

  // Use date + alumniId hash for deterministic daily selection
  const today = new Date()
  const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
  const hash = simpleHash(dateString + alumniId)
  const index = hash % activeTips.length

  return activeTips[index]
}

/**
 * Get tips that haven't been dismissed by the alumni.
 *
 * @param alumniId - The alumni's ID
 * @returns Array of non-dismissed tips
 */
export function getActiveTips(alumniId: string): DigitalWellnessTip[] {
  const dismissed = getDismissedTips(alumniId)
  return getWellnessTips().filter((tip) => !dismissed.includes(tip.id))
}

// ============================================
// Tip Preference Functions
// ============================================

/**
 * Save a tip category preference for an alumni.
 *
 * @param alumniId - The alumni's ID
 * @param category - The tip category
 * @param enabled - Whether the category is enabled
 * @returns True if saved successfully
 */
export function saveTipPreference(
  alumniId: string,
  category: WellnessTipCategory,
  enabled: boolean
): boolean {
  let alumniPrefs = preferencesStore.get(alumniId)

  if (!alumniPrefs) {
    alumniPrefs = new Map()
    preferencesStore.set(alumniId, alumniPrefs)
  }

  alumniPrefs.set(category, enabled)
  return true
}

// ============================================
// Dismissed Tips Functions
// ============================================

/**
 * Get list of dismissed tip IDs for an alumni.
 *
 * @param alumniId - The alumni's ID
 * @returns Array of dismissed tip IDs
 */
export function getDismissedTips(alumniId: string): string[] {
  return dismissedTipsStore.get(alumniId) || []
}

/**
 * Dismiss a tip for an alumni.
 *
 * @param alumniId - The alumni's ID
 * @param tipId - The tip ID to dismiss
 * @returns True if dismissed successfully
 */
export function dismissTip(alumniId: string, tipId: string): boolean {
  let dismissed = dismissedTipsStore.get(alumniId)

  if (!dismissed) {
    dismissed = []
    dismissedTipsStore.set(alumniId, dismissed)
  }

  // Don't duplicate
  if (!dismissed.includes(tipId)) {
    dismissed.push(tipId)
  }

  return true
}

// ============================================
// Helper Functions
// ============================================

/**
 * Simple hash function for deterministic selection.
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

// ============================================
// Initialization Functions
// ============================================

/**
 * Initialize default wellness tips.
 * AC1: Optional digital wellness tips available.
 */
export function initializeDefaultTips(): void {
  // Clear existing tips
  tipStore.length = 0

  let order = 0

  // Screen time tips
  const screenTimeTips = [
    {
      title: 'Take regular breaks',
      content: 'Every 30 minutes, look away from your screen for 20 seconds.',
    },
    {
      title: 'Use blue light filter',
      content: 'Enable blue light filtering in the evening to improve sleep quality.',
    },
    {
      title: 'Set daily limits',
      content: 'Decide on a reasonable daily screen time limit and stick to it.',
    },
  ]

  for (const tip of screenTimeTips) {
    const newTip = createWellnessTip('screen_time', tip.title, tip.content)
    newTip.order = order++
    tipStore.push(newTip)
  }

  // Digital balance tips
  const digitalBalanceTips = [
    {
      title: 'Phone-free meals',
      content: 'Keep your phone away during meals to enjoy conversations.',
    },
    {
      title: 'Morning routine',
      content: 'Wait 30 minutes after waking before checking your phone.',
    },
    {
      title: 'Notification audit',
      content: 'Turn off non-essential notifications to reduce distractions.',
    },
  ]

  for (const tip of digitalBalanceTips) {
    const newTip = createWellnessTip('digital_balance', tip.title, tip.content)
    newTip.order = order++
    tipStore.push(newTip)
  }

  // Online safety tips
  const onlineSafetyTips = [
    { title: 'Strong passwords', content: 'Use unique, complex passwords for each account.' },
    {
      title: 'Privacy settings',
      content: 'Regularly review and update privacy settings on social media.',
    },
    {
      title: 'Think before sharing',
      content: 'Consider if personal information is necessary before posting.',
    },
  ]

  for (const tip of onlineSafetyTips) {
    const newTip = createWellnessTip('online_safety', tip.title, tip.content)
    newTip.order = order++
    tipStore.push(newTip)
  }

  // Productivity tips
  const productivityTips = [
    { title: 'Focus time blocks', content: 'Work in 25-minute focused blocks with short breaks.' },
    {
      title: 'One task at a time',
      content: 'Avoid multitasking to improve concentration and quality.',
    },
    { title: 'App blockers', content: 'Use app blockers during study or work time.' },
  ]

  for (const tip of productivityTips) {
    const newTip = createWellnessTip('productivity', tip.title, tip.content)
    newTip.order = order++
    tipStore.push(newTip)
  }
}

// ============================================
// Testing Utilities
// ============================================

/**
 * Clear all tip data (for testing).
 */
export function clearAllTipData(): void {
  tipStore.length = 0
  dismissedTipsStore.clear()
  preferencesStore.clear()
}

/**
 * Get count of tips (for testing).
 */
export function getTipCount(): number {
  return tipStore.length
}
