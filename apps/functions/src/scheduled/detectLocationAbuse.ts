/**
 * Detect Location Abuse Scheduled Function
 *
 * Story 40.6: Location Feature Abuse Prevention
 * - AC1: Asymmetric location check detection
 * - AC2: Frequent rule change detection
 * - AC3: Cross-custody restriction detection
 *
 * Runs daily to detect potential abuse patterns in location feature usage.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import {
  LOCATION_ABUSE_THRESHOLDS,
  type LocationAbusePatternType,
  type LocationAbusePattern,
} from '@fledgely/shared'
import { getGuardianAccessCounts, calculateAsymmetry } from '../callable/trackLocationAccess'

/**
 * Detect asymmetric location checks.
 * AC1: Alert if one parent checks location 10x more than other.
 *
 * @param familyId - Family ID
 * @returns Pattern if detected, null otherwise
 */
export async function detectAsymmetricChecks(
  familyId: string
): Promise<Omit<LocationAbusePattern, 'id' | 'alertSent'> | null> {
  const windowDays = LOCATION_ABUSE_THRESHOLDS.ASYMMETRIC_CHECK_WINDOW_DAYS
  const counts = await getGuardianAccessCounts(familyId, windowDays)

  const asymmetry = calculateAsymmetry(counts)

  if (!asymmetry.detected) {
    return null
  }

  const now = new Date()
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)

  return {
    familyId,
    patternType: 'asymmetric_checks' as LocationAbusePatternType,
    detectedAt: now,
    windowStart,
    windowEnd: now,
    metadata: {
      higherUid: asymmetry.higherUid,
      higherCount: asymmetry.higherCount,
      lowerUid: asymmetry.lowerUid,
      lowerCount: asymmetry.lowerCount,
      ratio: asymmetry.ratio,
    },
  }
}

/**
 * Detect frequent location rule changes before custody exchanges.
 * AC2: Alert if 3+ rule changes within 24 hours before exchange.
 *
 * @param familyId - Family ID
 * @returns Pattern if detected, null otherwise
 */
export async function detectFrequentRuleChanges(
  familyId: string
): Promise<Omit<LocationAbusePattern, 'id' | 'alertSent'> | null> {
  const db = getFirestore()
  const windowHours = LOCATION_ABUSE_THRESHOLDS.FREQUENT_CHANGES_WINDOW_HOURS
  const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000)

  // Get rule change events in the window
  const changesSnapshot = await db
    .collection('families')
    .doc(familyId)
    .collection('locationRuleChanges')
    .where('timestamp', '>', Timestamp.fromDate(windowStart))
    .get()

  const changeCount = changesSnapshot.size

  if (changeCount < LOCATION_ABUSE_THRESHOLDS.FREQUENT_CHANGES_COUNT) {
    return null
  }

  // Get custody exchange info (if available)
  const familyDoc = await db.collection('families').doc(familyId).get()
  const familyData = familyDoc.data()
  const custodySchedule = familyData?.custodySchedule || null

  // Calculate hours to next exchange if schedule exists
  let hoursToExchange = 0
  if (custodySchedule?.nextExchange) {
    const nextExchange = custodySchedule.nextExchange.toDate()
    hoursToExchange = Math.max(0, (nextExchange.getTime() - Date.now()) / (60 * 60 * 1000))
  }

  const now = new Date()
  const changeTypes: string[] = []
  const changedRuleIds: string[] = []

  for (const doc of changesSnapshot.docs) {
    const data = doc.data()
    if (data.changeType && !changeTypes.includes(data.changeType)) {
      changeTypes.push(data.changeType)
    }
    if (data.ruleId) {
      changedRuleIds.push(data.ruleId)
    }
  }

  return {
    familyId,
    patternType: 'frequent_rule_changes' as LocationAbusePatternType,
    detectedAt: now,
    windowStart,
    windowEnd: now,
    metadata: {
      changeCount,
      changeTypes,
      hoursToExchange,
      changedRuleIds,
    },
  }
}

/**
 * Detect cross-custody time restrictions.
 * AC3: Alert if location rules restrict child during other parent's time.
 *
 * @param familyId - Family ID
 * @returns Pattern if detected, null otherwise
 */
export async function detectCrossCustodyRestriction(
  familyId: string
): Promise<Omit<LocationAbusePattern, 'id' | 'alertSent'> | null> {
  const db = getFirestore()

  // Get location rules for the family
  const rulesSnapshot = await db
    .collection('families')
    .doc(familyId)
    .collection('locationRules')
    .get()

  if (rulesSnapshot.empty) {
    return null
  }

  // Get custody schedule
  const familyDoc = await db.collection('families').doc(familyId).get()
  const familyData = familyDoc.data()
  const custodySchedule = familyData?.custodySchedule || null

  if (!custodySchedule) {
    // Can't detect cross-custody without schedule
    return null
  }

  // Analyze rules for cross-custody patterns
  const flaggedRuleIds: string[] = []
  const restrictedCustodyPeriods: string[] = []
  const restrictionTypes: string[] = []

  for (const doc of rulesSnapshot.docs) {
    const rule = doc.data()

    // Check if rule has time-based conditions that align with custody periods
    if (rule.activeTimeRange && rule.restrictive) {
      // Check if the rule's active time overlaps with non-custodial periods
      const activeDays = rule.activeTimeRange.days || []
      const custodyDays = custodySchedule.custodyDays || []

      // If rule is active on days the rule creator doesn't have custody,
      // it might be targeting other parent's time
      const creatorUid = rule.createdByUid
      const creatorCustodyDays = custodyDays
        .filter((d: { uid: string }) => d.uid === creatorUid)
        .map((d: { day: string }) => d.day)

      const activeDuringNonCustody = activeDays.some(
        (day: string) => !creatorCustodyDays.includes(day)
      )

      if (activeDuringNonCustody && rule.restrictive) {
        flaggedRuleIds.push(doc.id)

        // Track which custody periods are restricted
        const restrictedDays = activeDays.filter((day: string) => !creatorCustodyDays.includes(day))
        for (const day of restrictedDays) {
          if (!restrictedCustodyPeriods.includes(day)) {
            restrictedCustodyPeriods.push(day)
          }
        }

        // Track restriction types
        if (rule.blockedCategories && rule.blockedCategories.length > 0) {
          if (!restrictionTypes.includes('blocked_categories')) {
            restrictionTypes.push('blocked_categories')
          }
        }
        if (rule.timeLimit) {
          if (!restrictionTypes.includes('time_limit')) {
            restrictionTypes.push('time_limit')
          }
        }
      }
    }
  }

  if (flaggedRuleIds.length === 0) {
    return null
  }

  const now = new Date()

  return {
    familyId,
    patternType: 'cross_custody_restriction' as LocationAbusePatternType,
    detectedAt: now,
    windowStart: now, // Current state analysis
    windowEnd: now,
    metadata: {
      flaggedRuleIds,
      restrictedCustodyPeriods,
      restrictionTypes,
    },
  }
}

/**
 * Store detected abuse pattern in Firestore.
 *
 * @param pattern - Pattern to store
 * @returns Pattern ID
 */
export async function storeAbusePattern(
  pattern: Omit<LocationAbusePattern, 'id' | 'alertSent'>
): Promise<string> {
  const db = getFirestore()

  const patternRef = db
    .collection('families')
    .doc(pattern.familyId)
    .collection('locationAbusePatterns')
    .doc()

  const patternData: LocationAbusePattern = {
    ...pattern,
    id: patternRef.id,
    alertSent: false,
    detectedAt: pattern.detectedAt,
    windowStart: pattern.windowStart,
    windowEnd: pattern.windowEnd,
  }

  await patternRef.set({
    ...patternData,
    detectedAt: Timestamp.fromDate(patternData.detectedAt),
    windowStart: Timestamp.fromDate(patternData.windowStart),
    windowEnd: Timestamp.fromDate(patternData.windowEnd),
  })

  return patternRef.id
}

/**
 * Check if a similar pattern was already detected recently.
 * Prevents duplicate alerts for the same ongoing pattern.
 *
 * @param familyId - Family ID
 * @param patternType - Type of pattern
 * @param withinHours - Hours to check for duplicates
 * @returns True if duplicate exists
 */
export async function isDuplicatePattern(
  familyId: string,
  patternType: LocationAbusePatternType,
  withinHours: number = 24
): Promise<boolean> {
  const db = getFirestore()
  const cutoff = new Date(Date.now() - withinHours * 60 * 60 * 1000)

  const existingPatterns = await db
    .collection('families')
    .doc(familyId)
    .collection('locationAbusePatterns')
    .where('patternType', '==', patternType)
    .where('detectedAt', '>', Timestamp.fromDate(cutoff))
    .limit(1)
    .get()

  return !existingPatterns.empty
}

/**
 * Scheduled function to detect location abuse patterns.
 * Runs daily at 3 AM.
 */
export const detectLocationAbuse = onSchedule(
  {
    schedule: '0 3 * * *', // 3 AM daily
    timeZone: 'America/New_York',
  },
  async () => {
    const db = getFirestore()

    // Get all families with location features enabled
    const familiesSnapshot = await db
      .collection('families')
      .where('locationFeaturesEnabled', '==', true)
      .get()

    const results = {
      familiesChecked: 0,
      patternsDetected: 0,
      errors: [] as string[],
    }

    for (const familyDoc of familiesSnapshot.docs) {
      const familyId = familyDoc.id
      results.familiesChecked++

      try {
        // Check for asymmetric access
        const asymmetricPattern = await detectAsymmetricChecks(familyId)
        if (asymmetricPattern) {
          const isDuplicate = await isDuplicatePattern(familyId, 'asymmetric_checks')
          if (!isDuplicate) {
            await storeAbusePattern(asymmetricPattern)
            results.patternsDetected++
          }
        }

        // Check for frequent rule changes
        const ruleChangePattern = await detectFrequentRuleChanges(familyId)
        if (ruleChangePattern) {
          const isDuplicate = await isDuplicatePattern(familyId, 'frequent_rule_changes')
          if (!isDuplicate) {
            await storeAbusePattern(ruleChangePattern)
            results.patternsDetected++
          }
        }

        // Check for cross-custody restrictions
        const crossCustodyPattern = await detectCrossCustodyRestriction(familyId)
        if (crossCustodyPattern) {
          const isDuplicate = await isDuplicatePattern(familyId, 'cross_custody_restriction')
          if (!isDuplicate) {
            await storeAbusePattern(crossCustodyPattern)
            results.patternsDetected++
          }
        }
      } catch (error) {
        results.errors.push(
          `Family ${familyId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    console.log('Location abuse detection completed:', results)
  }
)
