/**
 * Pattern Analysis Service
 *
 * Story 27.4: Asymmetric Viewing Pattern Detection - AC1, AC2, AC5
 *
 * Analyzes viewing patterns across guardians in a family to detect
 * asymmetric monitoring that could indicate weaponization.
 */

import { getFirestore, Firestore } from 'firebase-admin/firestore'
import type { ViewingPatternAnalysis, GuardianViewCount } from '@fledgely/shared'

// Lazy initialization for Firestore
let db: Firestore | null = null
function getDb(): Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/**
 * Asymmetry threshold - if one guardian views 10x more than another
 */
const ASYMMETRY_THRESHOLD = 10

/**
 * Setup period in milliseconds (2 weeks)
 */
const SETUP_PERIOD_MS = 14 * 24 * 60 * 60 * 1000

/**
 * Check if family is still in setup period
 */
export function isInSetupPeriod(familyCreatedAt: number): boolean {
  return Date.now() - familyCreatedAt < SETUP_PERIOD_MS
}

/**
 * Get guardian view counts for a time period.
 *
 * @param familyId - Family to analyze
 * @param startTime - Period start (epoch ms)
 * @param endTime - Period end (epoch ms)
 * @returns Array of guardian view counts
 */
async function getGuardianViewCounts(
  familyId: string,
  startTime: number,
  endTime: number
): Promise<GuardianViewCount[]> {
  const db = getDb()

  // Query audit events for this family in the time period
  const eventsSnapshot = await db
    .collection('auditEvents')
    .where('familyId', '==', familyId)
    .where('timestamp', '>=', startTime)
    .where('timestamp', '<=', endTime)
    .where('actorType', '==', 'guardian')
    .where('accessType', '==', 'view')
    .get()

  // Count views per guardian
  const viewCounts: Map<string, number> = new Map()

  for (const doc of eventsSnapshot.docs) {
    const event = doc.data()
    const actorUid = event.actorUid
    viewCounts.set(actorUid, (viewCounts.get(actorUid) || 0) + 1)
  }

  // Get guardian display names
  const guardianUids = Array.from(viewCounts.keys())
  const guardianNames: Map<string, string | null> = new Map()

  for (const uid of guardianUids) {
    try {
      const userDoc = await db.collection('users').doc(uid).get()
      if (userDoc.exists) {
        guardianNames.set(uid, userDoc.data()?.displayName || null)
      } else {
        guardianNames.set(uid, null)
      }
    } catch {
      guardianNames.set(uid, null)
    }
  }

  // Build result array
  const result: GuardianViewCount[] = []
  for (const [uid, count] of viewCounts) {
    result.push({
      guardianUid: uid,
      guardianDisplayName: guardianNames.get(uid) || null,
      viewCount: count,
    })
  }

  // Sort by view count descending
  result.sort((a, b) => b.viewCount - a.viewCount)

  return result
}

/**
 * Calculate asymmetry ratio between guardians.
 *
 * @param guardianViews - Array of guardian view counts
 * @returns Ratio of highest to lowest view count
 */
function calculateAsymmetryRatio(guardianViews: GuardianViewCount[]): number {
  if (guardianViews.length < 2) {
    return 0 // No asymmetry possible with one guardian
  }

  const counts = guardianViews.map((g) => g.viewCount)
  const maxCount = Math.max(...counts)
  const minCount = Math.min(...counts)

  // Avoid division by zero - treat 0 views as 1 for ratio calculation
  const effectiveMin = minCount === 0 ? 1 : minCount

  return maxCount / effectiveMin
}

/**
 * Analyze viewing patterns for a family.
 *
 * Story 27.4: Asymmetric Viewing Pattern Detection - AC1, AC2
 *
 * @param familyId - Family to analyze
 * @param periodDays - Number of days to analyze (default 7)
 * @returns Pattern analysis result
 */
export async function analyzeViewingPatterns(
  familyId: string,
  periodDays: number = 7
): Promise<ViewingPatternAnalysis> {
  const now = Date.now()
  const periodEnd = now
  const periodStart = now - periodDays * 24 * 60 * 60 * 1000

  // Get view counts for each guardian
  const guardianViews = await getGuardianViewCounts(familyId, periodStart, periodEnd)

  // Calculate total views
  const totalViews = guardianViews.reduce((sum, g) => sum + g.viewCount, 0)

  // Calculate asymmetry ratio
  const asymmetryRatio = calculateAsymmetryRatio(guardianViews)

  // Check if asymmetric (ratio >= 10)
  const isAsymmetric = asymmetryRatio >= ASYMMETRY_THRESHOLD

  // Generate ID using Firestore
  const db = getDb()
  const docRef = db.collection('patternAnalyses').doc()

  const analysis: ViewingPatternAnalysis = {
    id: docRef.id,
    familyId,
    periodStart,
    periodEnd,
    guardianViews,
    totalViews,
    asymmetryRatio,
    isAsymmetric,
    analysisTimestamp: now,
  }

  return analysis
}

/**
 * Store pattern analysis result in Firestore.
 *
 * @param analysis - Analysis result to store
 */
export async function storePatternAnalysis(analysis: ViewingPatternAnalysis): Promise<void> {
  const db = getDb()
  await db.collection('patternAnalyses').doc(analysis.id).set(analysis)
}

/**
 * Get families eligible for pattern analysis.
 *
 * Story 27.4: Asymmetric Viewing Pattern Detection - AC5
 *
 * Eligible families:
 * - Have multiple guardians
 * - Past setup period (created > 2 weeks ago)
 *
 * @returns Array of eligible family IDs
 */
export async function getEligibleFamilies(): Promise<string[]> {
  const db = getDb()
  const now = Date.now()
  const cutoffTime = now - SETUP_PERIOD_MS

  // Query families created before the setup period cutoff
  const familiesSnapshot = await db
    .collection('families')
    .where('createdAt', '<=', cutoffTime)
    .get()

  const eligibleFamilyIds: string[] = []

  for (const doc of familiesSnapshot.docs) {
    const family = doc.data()
    const guardianUids = family.guardianUids || []

    // Only include families with multiple guardians
    if (guardianUids.length >= 2) {
      eligibleFamilyIds.push(doc.id)
    }
  }

  return eligibleFamilyIds
}

/**
 * Check if an alert was recently sent for this family.
 *
 * @param familyId - Family to check
 * @param daysSinceLastAlert - Minimum days since last alert
 * @returns True if alert can be sent
 */
export async function canSendAlert(
  familyId: string,
  daysSinceLastAlert: number = 7
): Promise<boolean> {
  const db = getDb()
  const cutoffTime = Date.now() - daysSinceLastAlert * 24 * 60 * 60 * 1000

  const recentAlertsSnapshot = await db
    .collection('patternAlerts')
    .where('familyId', '==', familyId)
    .where('sentAt', '>=', cutoffTime)
    .limit(1)
    .get()

  return recentAlertsSnapshot.empty
}

/**
 * For testing - reset Firestore instance
 */
export function _resetDbForTesting(): void {
  db = null
}
