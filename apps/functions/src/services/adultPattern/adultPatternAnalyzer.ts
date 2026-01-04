/**
 * Adult Pattern Analyzer
 *
 * Story 8.10: Adult Pattern Detection
 *
 * Orchestrates pattern signal detection and creates flags for profiles
 * exhibiting adult usage patterns.
 *
 * FR134: Adult pattern detection as security foundation
 * AC5: Detection does NOT access content, only usage metadata
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import {
  MINIMUM_ANALYSIS_DAYS,
  ADULT_PATTERN_THRESHOLD,
  PATTERN_EXPLANATION_COOLDOWN_DAYS,
  MONITORING_DISABLED_REASON_ADULT_PATTERN,
  calculateOverallConfidence,
  generateAdultPatternFlagId,
  type AdultPatternAnalysis,
  type AdultPatternFlag,
  type AdultPatternSignal,
} from '@fledgely/shared'
import {
  detectWorkAppPatterns,
  detectFinancialSitePatterns,
  detectAdultSchedulePatterns,
  detectCommunicationPatterns,
  type ScreenshotMetadataForAnalysis,
} from './patternSignals'

const db = getFirestore()

/**
 * Result of checking if analysis should be triggered.
 */
interface AnalysisTriggerCheck {
  shouldAnalyze: boolean
  reason: string
  firstScreenshotDate?: string
  lastAnalysisDate?: string
  daysSinceFirstScreenshot?: number
}

/**
 * Check if adult pattern analysis should be triggered for a child.
 *
 * AC1: Analysis requires 7 days of usage data.
 * AC4: No analysis within 90 days of explained pattern.
 *
 * @param childId - Child profile ID
 * @param familyId - Family ID for Firestore path
 * @returns Whether analysis should proceed and why
 */
export async function shouldTriggerAnalysis(
  childId: string,
  familyId: string
): Promise<AnalysisTriggerCheck> {
  // Check for recent explained flag (90-day cooldown)
  const flagsRef = db.collection('families').doc(familyId).collection('adultPatternFlags')

  const recentExplainedFlag = await flagsRef
    .where('childId', '==', childId)
    .where('status', '==', 'explained')
    .where('suppressAnalysisUntil', '>', Date.now())
    .limit(1)
    .get()

  if (!recentExplainedFlag.empty) {
    const flag = recentExplainedFlag.docs[0].data() as AdultPatternFlag
    const cooldownEnd = new Date(flag.suppressAnalysisUntil!).toISOString().split('T')[0]
    return {
      shouldAnalyze: false,
      reason: `Analysis suppressed until ${cooldownEnd} (explained pattern cooldown)`,
      lastAnalysisDate: new Date(flag.createdAt).toISOString().split('T')[0],
    }
  }

  // Check for pending flag (don't create duplicate)
  const pendingFlag = await flagsRef
    .where('childId', '==', childId)
    .where('status', '==', 'pending')
    .limit(1)
    .get()

  if (!pendingFlag.empty) {
    return {
      shouldAnalyze: false,
      reason: 'Pending flag already exists for this child',
    }
  }

  // Check for confirmed_adult (monitoring should be disabled)
  const confirmedAdult = await flagsRef
    .where('childId', '==', childId)
    .where('status', '==', 'confirmed_adult')
    .limit(1)
    .get()

  if (!confirmedAdult.empty) {
    return {
      shouldAnalyze: false,
      reason: 'Profile already confirmed as adult',
    }
  }

  // Check if we have 7+ days of screenshot data
  const screenshotsRef = db.collection('children').doc(childId).collection('screenshots')

  // Get oldest screenshot
  const oldestScreenshot = await screenshotsRef.orderBy('timestamp', 'asc').limit(1).get()

  if (oldestScreenshot.empty) {
    return {
      shouldAnalyze: false,
      reason: 'No screenshot data available',
    }
  }

  const firstTimestamp = oldestScreenshot.docs[0].data().timestamp as number
  const firstDate = new Date(firstTimestamp)
  const daysSinceFirst = Math.floor((Date.now() - firstTimestamp) / (24 * 60 * 60 * 1000))

  if (daysSinceFirst < MINIMUM_ANALYSIS_DAYS) {
    return {
      shouldAnalyze: false,
      reason: `Only ${daysSinceFirst} days of data (need ${MINIMUM_ANALYSIS_DAYS})`,
      firstScreenshotDate: firstDate.toISOString().split('T')[0],
      daysSinceFirstScreenshot: daysSinceFirst,
    }
  }

  return {
    shouldAnalyze: true,
    reason: `${daysSinceFirst} days of data available`,
    firstScreenshotDate: firstDate.toISOString().split('T')[0],
    daysSinceFirstScreenshot: daysSinceFirst,
  }
}

/**
 * Analyze a child profile for adult usage patterns.
 *
 * AC1: Analyzes 7 days of usage data.
 * AC5: Only uses metadata (URLs, timestamps), never screenshot content.
 *
 * @param childId - Child profile ID to analyze
 * @param familyId - Family ID for authorization
 * @returns Analysis result with signals and overall confidence
 */
export async function analyzeChildUsagePattern(
  childId: string,
  familyId: string
): Promise<AdultPatternAnalysis> {
  const now = Date.now()

  // Calculate date range for analysis (last 7 days)
  const periodEnd = new Date(now)
  const periodStart = new Date(now - MINIMUM_ANALYSIS_DAYS * 24 * 60 * 60 * 1000)

  // Fetch screenshot metadata for the analysis period
  // AC5: Only fetch url and timestamp fields - never image content
  const screenshotsRef = db.collection('children').doc(childId).collection('screenshots')

  const screenshotDocs = await screenshotsRef
    .where('timestamp', '>=', periodStart.getTime())
    .where('timestamp', '<=', periodEnd.getTime())
    .select('url', 'timestamp') // AC5: Metadata-only
    .get()

  const metadata: ScreenshotMetadataForAnalysis[] = screenshotDocs.docs.map((doc) => ({
    url: doc.data().url as string,
    timestamp: doc.data().timestamp as number,
  }))

  // Run all signal detectors
  const signals: AdultPatternSignal[] = [
    detectWorkAppPatterns(metadata),
    detectFinancialSitePatterns(metadata),
    detectAdultSchedulePatterns(metadata),
    detectCommunicationPatterns(metadata),
  ]

  // Calculate overall confidence
  const overallConfidence = calculateOverallConfidence(signals)

  // Determine if this should be flagged
  const shouldFlag = overallConfidence >= ADULT_PATTERN_THRESHOLD

  return {
    childId,
    familyId,
    analyzedAt: now,
    periodStart: periodStart.toISOString().split('T')[0],
    periodEnd: periodEnd.toISOString().split('T')[0],
    screenshotsAnalyzed: metadata.length,
    signals,
    overallConfidence,
    shouldFlag,
  }
}

/**
 * Create an adult pattern flag document in Firestore.
 *
 * AC2: Creates flag when adult patterns detected.
 *
 * @param analysis - Analysis result that triggered the flag
 * @returns Created flag document
 */
export async function createAdultPatternFlag(
  analysis: AdultPatternAnalysis
): Promise<AdultPatternFlag> {
  const now = Date.now()
  const flagId = generateAdultPatternFlagId(analysis.childId, now)

  const flag: AdultPatternFlag = {
    id: flagId,
    childId: analysis.childId,
    familyId: analysis.familyId,
    analysis,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    respondedBy: null,
    respondedAt: null,
    explanation: null,
    suppressAnalysisUntil: null,
    notificationSent: false,
    notificationSentAt: null,
  }

  // Store in Firestore
  await db
    .collection('families')
    .doc(analysis.familyId)
    .collection('adultPatternFlags')
    .doc(flagId)
    .set(flag)

  return flag
}

/**
 * Mark a flag as responded with explanation.
 *
 * AC4: Clears flag and suppresses analysis for 90 days.
 *
 * @param flagId - Flag ID to update
 * @param familyId - Family ID for Firestore path
 * @param respondedBy - Guardian UID who responded
 * @param explanation - Guardian's explanation
 * @returns Updated flag
 */
export async function markFlagAsExplained(
  flagId: string,
  familyId: string,
  respondedBy: string,
  explanation: string
): Promise<AdultPatternFlag> {
  const now = Date.now()
  const cooldownExpiry = now + PATTERN_EXPLANATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000

  const flagRef = db
    .collection('families')
    .doc(familyId)
    .collection('adultPatternFlags')
    .doc(flagId)

  await flagRef.update({
    status: 'explained',
    respondedBy,
    respondedAt: now,
    explanation,
    suppressAnalysisUntil: cooldownExpiry,
    updatedAt: now,
  })

  const updated = await flagRef.get()
  return updated.data() as AdultPatternFlag
}

/**
 * Mark a flag as confirmed adult.
 *
 * AC3: Monitoring is disabled for the child.
 *
 * @param flagId - Flag ID to update
 * @param familyId - Family ID for Firestore path
 * @param childId - Child ID for disabling monitoring
 * @param respondedBy - Guardian UID who responded
 * @returns Updated flag and count of deleted screenshots
 */
export async function markFlagAsConfirmedAdult(
  flagId: string,
  familyId: string,
  childId: string,
  respondedBy: string
): Promise<{ flag: AdultPatternFlag; screenshotsDeleted: number }> {
  const now = Date.now()

  // Update the flag
  const flagRef = db
    .collection('families')
    .doc(familyId)
    .collection('adultPatternFlags')
    .doc(flagId)

  await flagRef.update({
    status: 'confirmed_adult',
    respondedBy,
    respondedAt: now,
    updatedAt: now,
  })

  // Disable monitoring on the child profile
  const childRef = db.collection('children').doc(childId)
  await childRef.update({
    monitoringDisabled: true,
    monitoringDisabledAt: now,
    monitoringDisabledReason: MONITORING_DISABLED_REASON_ADULT_PATTERN,
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Delete all screenshots (privacy - adult data should not be retained)
  const screenshotsRef = db.collection('children').doc(childId).collection('screenshots')
  const screenshots = await screenshotsRef.get()

  let batch = db.batch()
  let batchCount = 0
  let deleteCount = 0

  for (const doc of screenshots.docs) {
    batch.delete(doc.ref)
    batchCount++
    deleteCount++

    // Commit in batches of 500 (Firestore limit) - must create new batch after commit
    if (batchCount === 500) {
      await batch.commit()
      batch = db.batch() // Create new batch after commit
      batchCount = 0
    }
  }

  // Commit any remaining deletions
  if (batchCount > 0) {
    await batch.commit()
  }

  const updated = await flagRef.get()
  return {
    flag: updated.data() as AdultPatternFlag,
    screenshotsDeleted: deleteCount,
  }
}

/**
 * Get all pending adult pattern flags for a family.
 *
 * @param familyId - Family ID to fetch flags for
 * @returns Array of pending flags
 */
export async function getPendingFlagsForFamily(familyId: string): Promise<AdultPatternFlag[]> {
  const flagsRef = db.collection('families').doc(familyId).collection('adultPatternFlags')

  const pendingFlags = await flagsRef
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'desc')
    .get()

  return pendingFlags.docs.map((doc) => doc.data() as AdultPatternFlag)
}

/**
 * Get a specific flag by ID.
 *
 * @param flagId - Flag ID
 * @param familyId - Family ID for Firestore path
 * @returns Flag document or null if not found
 */
export async function getAdultPatternFlag(
  flagId: string,
  familyId: string
): Promise<AdultPatternFlag | null> {
  const flagRef = db
    .collection('families')
    .doc(familyId)
    .collection('adultPatternFlags')
    .doc(flagId)

  const flag = await flagRef.get()
  if (!flag.exists) {
    return null
  }

  return flag.data() as AdultPatternFlag
}

/**
 * Mark flag notification as sent.
 *
 * @param flagId - Flag ID
 * @param familyId - Family ID for Firestore path
 */
export async function markNotificationSent(flagId: string, familyId: string): Promise<void> {
  const now = Date.now()

  await db.collection('families').doc(familyId).collection('adultPatternFlags').doc(flagId).update({
    notificationSent: true,
    notificationSentAt: now,
    updatedAt: now,
  })
}

/**
 * Expire old pending flags (no response after 30 days).
 *
 * @param daysOld - Number of days after which to expire flags (default 30)
 * @returns Number of flags expired
 */
export async function expireOldFlags(daysOld: number = 30): Promise<number> {
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000

  // Query all families' pending flags older than cutoff
  // Note: This requires a collection group query
  const pendingFlags = await db
    .collectionGroup('adultPatternFlags')
    .where('status', '==', 'pending')
    .where('createdAt', '<', cutoff)
    .get()

  let expiredCount = 0

  for (const doc of pendingFlags.docs) {
    await doc.ref.update({
      status: 'expired',
      updatedAt: Date.now(),
    })
    expiredCount++
  }

  return expiredCount
}
