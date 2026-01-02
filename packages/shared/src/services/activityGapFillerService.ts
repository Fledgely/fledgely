/**
 * ActivityGapFillerService - Story 7.5.7 Task 3
 *
 * Service for filling activity gaps with synthetic normal entries.
 * AC2: Family audit trail shows no unusual entries
 * AC3: Normal activity continues during blackout
 *
 * CRITICAL SAFETY:
 * - Synthetic entries match child's normal patterns
 * - Synthetic flag hidden from family
 * - No monitoring gaps visible to parents
 */

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
} from 'firebase/firestore'

// ============================================
// Constants
// ============================================

/**
 * Firestore collection for activity gaps.
 * CRITICAL: This collection is at ROOT level, ISOLATED from family data.
 */
export const ACTIVITY_GAPS_COLLECTION = 'activityGaps'

/**
 * Firestore collection for synthetic activities.
 */
export const SYNTHETIC_ACTIVITIES_COLLECTION = 'syntheticActivities'

/**
 * Firestore collection for activity patterns.
 */
export const ACTIVITY_PATTERNS_COLLECTION = 'activityPatterns'

// ============================================
// Types
// ============================================

/**
 * Reason for gap creation.
 */
export type GapReason = 'signal_blackout' | 'privacy_gap'

/**
 * Activity gap record.
 */
export interface ActivityGap {
  /** Unique gap identifier */
  id: string
  /** Child ID */
  childId: string
  /** When gap starts */
  startTime: Date
  /** When gap ends */
  endTime: Date
  /** Reason for gap */
  reason: GapReason
  /** Whether gap has been filled with synthetic activity */
  filled: boolean
}

/**
 * Synthetic activity type.
 */
export type SyntheticActivityType = 'normal_browsing' | 'normal_app_use' | 'idle'

/**
 * Synthetic activity entry.
 */
export interface SyntheticActivity {
  /** Unique activity identifier */
  id: string
  /** Gap ID this activity fills */
  gapId: string
  /** When activity occurred */
  timestamp: Date
  /** Type of synthetic activity */
  type: SyntheticActivityType
  /** Additional metadata */
  metadata: Record<string, unknown>
  /** Always true for synthetic entries */
  synthetic: true
}

/**
 * Activity pattern for a child.
 */
export interface ActivityPattern {
  /** Child ID */
  childId: string
  /** Typical activity types for this child */
  typicalActivityTypes: SyntheticActivityType[]
  /** Average interval between activities (ms) */
  averageActivityInterval: number
  /** Peak activity hours (0-23) */
  peakHours: number[]
  /** Quiet hours (0-23) */
  quietHours: number[]
}

// ============================================
// ID Generation
// ============================================

/**
 * Generate a unique gap ID.
 */
function generateGapId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `gap_${timestamp}_${random}`
}

/**
 * Generate a unique synthetic activity ID.
 */
function generateSyntheticActivityId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `synth_${timestamp}_${random}`
}

// ============================================
// Firestore Helpers
// ============================================

function getGapDocRef(gapId: string) {
  const db = getFirestore()
  return doc(db, ACTIVITY_GAPS_COLLECTION, gapId)
}

function getSyntheticActivitiesCollection() {
  const db = getFirestore()
  return collection(db, SYNTHETIC_ACTIVITIES_COLLECTION)
}

function getActivityPatternDocRef(childId: string) {
  const db = getFirestore()
  return doc(db, ACTIVITY_PATTERNS_COLLECTION, childId)
}

// ============================================
// Default Patterns
// ============================================

/**
 * Get default activity patterns when none exist.
 */
function getDefaultPatterns(childId: string): ActivityPattern {
  return {
    childId,
    typicalActivityTypes: ['normal_browsing', 'normal_app_use', 'idle'],
    averageActivityInterval: 15 * 60 * 1000, // 15 minutes
    peakHours: [9, 10, 11, 14, 15, 16, 19, 20],
    quietHours: [0, 1, 2, 3, 4, 5, 6, 7, 22, 23],
  }
}

// ============================================
// Gap Creation
// ============================================

/**
 * Create an activity gap record.
 *
 * @param childId - Child ID
 * @param startTime - When gap starts
 * @param endTime - When gap ends
 * @param reason - Reason for gap
 * @returns Created gap
 */
export async function createActivityGap(
  childId: string,
  startTime: Date,
  endTime: Date,
  reason: GapReason
): Promise<ActivityGap> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }
  if (!startTime) {
    throw new Error('startTime is required')
  }
  if (!endTime) {
    throw new Error('endTime is required')
  }

  const gapId = generateGapId()

  const gap: ActivityGap = {
    id: gapId,
    childId,
    startTime,
    endTime,
    reason,
    filled: false,
  }

  const docRef = getGapDocRef(gapId)
  await setDoc(docRef, gap)

  return gap
}

// ============================================
// Gap Filling
// ============================================

/**
 * Fill an activity gap with synthetic normal activity.
 *
 * AC2, AC3: Creates synthetic entries that match child's normal patterns.
 *
 * @param childId - Child ID
 * @param startTime - When gap starts
 * @param endTime - When gap ends
 */
export async function fillActivityGap(
  childId: string,
  startTime: Date,
  endTime: Date
): Promise<void> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }
  if (!startTime) {
    throw new Error('startTime is required')
  }
  if (!endTime) {
    throw new Error('endTime is required')
  }

  // Create gap record
  const gap = await createActivityGap(childId, startTime, endTime, 'signal_blackout')

  // Get child's activity patterns
  const patterns = await getActivityPatterns(childId)

  // Generate synthetic activities at intervals
  const interval = patterns.averageActivityInterval
  let currentTime = startTime.getTime()
  const endTimeMs = endTime.getTime()

  const syntheticActivitiesRef = getSyntheticActivitiesCollection()

  while (currentTime < endTimeMs) {
    const activityTime = new Date(currentTime)
    const syntheticActivity = await generateSyntheticActivity(childId, activityTime, gap.id)

    // Store synthetic activity
    await addDoc(syntheticActivitiesRef, syntheticActivity)

    // Add some randomness to interval (±30%)
    const variance = interval * 0.3
    const randomInterval = interval + (Math.random() * 2 - 1) * variance
    currentTime += randomInterval
  }

  // Mark gap as filled
  const gapRef = getGapDocRef(gap.id)
  await updateDoc(gapRef, { filled: true })
}

// ============================================
// Synthetic Activity Generation
// ============================================

/**
 * Generate a synthetic activity entry.
 *
 * @param childId - Child ID
 * @param timestamp - When activity occurred
 * @param gapId - Gap ID this activity fills
 * @returns Synthetic activity entry
 */
export async function generateSyntheticActivity(
  childId: string,
  timestamp: Date,
  gapId: string
): Promise<SyntheticActivity> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }
  if (!timestamp) {
    throw new Error('timestamp is required')
  }
  if (!gapId || gapId.trim().length === 0) {
    throw new Error('gapId is required')
  }

  // Get child's patterns
  const patterns = await getActivityPatterns(childId)

  // Select activity type based on time of day and patterns
  const hour = timestamp.getHours()
  let type: SyntheticActivityType

  if (patterns.quietHours.includes(hour)) {
    type = 'idle'
  } else {
    // Random selection from typical types
    const types = patterns.typicalActivityTypes.filter((t) => t !== 'idle')
    type = types[Math.floor(Math.random() * types.length)] || 'normal_browsing'
  }

  return {
    id: generateSyntheticActivityId(),
    gapId,
    timestamp,
    type,
    metadata: {
      generatedAt: new Date(),
      basedOnPatterns: true,
    },
    synthetic: true,
  }
}

// ============================================
// Synthetic Activity Checks
// ============================================

/**
 * Check if an activity is synthetic.
 *
 * CRITICAL: This is for internal/admin use only.
 * Family members NEVER see the synthetic flag.
 *
 * @param activityId - Activity ID to check
 * @returns True if activity is synthetic
 */
export async function isActivitySynthetic(activityId: string): Promise<boolean> {
  if (!activityId || activityId.trim().length === 0) {
    throw new Error('activityId is required')
  }

  const db = getFirestore()
  const docRef = doc(db, SYNTHETIC_ACTIVITIES_COLLECTION, activityId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    return false
  }

  const data = snapshot.data()
  return data.synthetic === true
}

// ============================================
// Activity Patterns
// ============================================

/**
 * Get activity patterns for a child.
 *
 * @param childId - Child ID
 * @returns Activity patterns
 */
export async function getActivityPatterns(childId: string): Promise<ActivityPattern> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }

  const docRef = getActivityPatternDocRef(childId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    return getDefaultPatterns(childId)
  }

  const data = snapshot.data()
  return {
    childId: data.childId,
    typicalActivityTypes: data.typicalActivityTypes || [
      'normal_browsing',
      'normal_app_use',
      'idle',
    ],
    averageActivityInterval: data.averageActivityInterval || 15 * 60 * 1000,
    peakHours: data.peakHours || [9, 10, 11, 14, 15, 16, 19, 20],
    quietHours: data.quietHours || [0, 1, 2, 3, 4, 5, 6, 7, 22, 23],
  }
}
