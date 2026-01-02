/**
 * ChildSignalDisplayService - Story 7.5.7 Task 5
 *
 * Service for child interface concealment during blackout.
 * AC6: Countdown not visible to child
 *
 * CRITICAL SAFETY:
 * - Child sees only "Help is on the way" confirmation
 * - No countdown visible anywhere
 * - Resources continue to be available
 * - Normal app interface shown
 * - Prevents child anxiety during safety response
 */

import { getFirestore, query, where, getDocs, collection } from 'firebase/firestore'

// ============================================
// Types
// ============================================

/**
 * Resource available to child.
 */
export interface Resource {
  /** Resource name */
  name: string
  /** Resource type */
  type: 'phone' | 'text' | 'web' | 'chat'
  /** Contact information */
  contact: string
  /** Optional description */
  description?: string
}

/**
 * Child's view of signal status.
 * CRITICAL: This interface intentionally EXCLUDES all timing/blackout information.
 */
export interface ChildSignalView {
  /** Whether signal was received */
  signalReceived: boolean
  /** Confirmation message (reassuring, no timing) */
  confirmationMessage: string
  /** Resources available to child */
  resources: Resource[]
  // NEVER include:
  // countdown: NEVER
  // blackoutActive: NEVER
  // timeRemaining: NEVER
  // expiresAt: NEVER
}

// ============================================
// Blackout-Related Properties to Filter
// ============================================

/**
 * Properties that must NEVER be visible to child.
 * CRITICAL: Adding to this list is a safety requirement.
 */
const BLACKOUT_PROPERTIES = [
  'countdown',
  'blackoutActive',
  'timeRemaining',
  'expiresAt',
  'blackoutExpiry',
  'suppressionActive',
  'blackoutStatus',
  'remainingMs',
  'endsAt',
  'blackoutEnd',
  'notificationBlocked',
  'suppressionExpiry',
] as const

// ============================================
// Default Resources
// ============================================

/**
 * Default crisis resources available to all children.
 */
const DEFAULT_RESOURCES: Resource[] = [
  {
    name: 'Crisis Text Line',
    type: 'text',
    contact: 'Text HOME to 741741',
    description: 'Free 24/7 text support',
  },
  {
    name: '988 Suicide & Crisis Lifeline',
    type: 'phone',
    contact: '988',
    description: 'Free 24/7 phone support',
  },
  {
    name: 'Trevor Project',
    type: 'text',
    contact: 'Text START to 678-678',
    description: 'For LGBTQ+ youth',
  },
]

// ============================================
// Default Confirmation Message
// ============================================

const DEFAULT_CONFIRMATION_MESSAGE =
  'Help is on the way. Your message has been received and someone will reach out to you. You are not alone.'

// ============================================
// Firestore Helpers
// ============================================

function getResourcesCollection() {
  const db = getFirestore()
  return collection(db, 'childResources')
}

function getSignalsCollection() {
  const db = getFirestore()
  return collection(db, 'isolatedSignals')
}

// ============================================
// Child Signal View
// ============================================

/**
 * Get child's view of signal status.
 *
 * AC6: Returns ONLY safe information - no countdown, no timing.
 *
 * @param childId - Child ID
 * @param signalId - Signal ID
 * @returns Child's view of signal (filtered for safety)
 */
export async function getChildSignalView(
  childId: string,
  signalId: string
): Promise<ChildSignalView> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }

  // Check if signal exists
  const signalsRef = getSignalsCollection()
  const q = query(signalsRef, where('id', '==', signalId))
  const snapshot = await getDocs(q)

  const signalReceived = !snapshot.empty

  // Get resources for child
  const resources = await getChildResources(childId)

  // Get confirmation message
  const confirmationMessage = signalReceived ? await getConfirmationMessage(childId, signalId) : ''

  // Return ONLY safe properties
  return {
    signalReceived,
    confirmationMessage,
    resources,
  }
}

// ============================================
// Blackout Filtering
// ============================================

/**
 * Filter any blackout-related data from child view.
 *
 * AC6: Ensures no timing/blackout information leaks to child.
 *
 * @param data - Any data object
 * @returns Filtered data with blackout properties removed
 */
export function filterBlackoutFromChildView<T>(data: T): T {
  // Handle null/undefined
  if (data === null || data === undefined) {
    return data
  }

  // Handle primitives
  if (typeof data !== 'object') {
    return data
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => filterBlackoutFromChildView(item)) as T
  }

  // Handle objects
  const filtered: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    // Skip blackout-related properties
    if (BLACKOUT_PROPERTIES.includes(key as (typeof BLACKOUT_PROPERTIES)[number])) {
      continue
    }

    // Recursively filter nested objects
    if (value !== null && typeof value === 'object') {
      filtered[key] = filterBlackoutFromChildView(value)
    } else {
      filtered[key] = value
    }
  }

  return filtered as T
}

// ============================================
// Child Resources
// ============================================

/**
 * Get resources available to child.
 *
 * @param childId - Child ID
 * @returns Resources filtered for child safety
 */
export async function getChildResources(childId: string): Promise<Resource[]> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }

  const resourcesRef = getResourcesCollection()
  const q = query(resourcesRef, where('childId', '==', childId))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return DEFAULT_RESOURCES
  }

  const resources: Resource[] = []

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data()

    // Filter out any blackout-related data
    const filtered = filterBlackoutFromChildView(data)

    resources.push({
      name: filtered.name || 'Crisis Resource',
      type: filtered.type || 'phone',
      contact: filtered.contact || '',
      description: filtered.description,
    })
  }

  return resources
}

// ============================================
// Confirmation Message
// ============================================

/**
 * Get confirmation message for child.
 *
 * AC6: Message is reassuring, contains NO timing information.
 *
 * @param childId - Child ID
 * @param signalId - Signal ID
 * @returns Confirmation message (safe for child)
 */
export async function getConfirmationMessage(childId: string, signalId: string): Promise<string> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }

  // Return default reassuring message
  // CRITICAL: Message NEVER mentions timing (48 hours, countdown, expiry, etc.)
  return DEFAULT_CONFIRMATION_MESSAGE
}
