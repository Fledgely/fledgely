/**
 * Daily Adult Pattern Analysis
 *
 * Story 8.10: Adult Pattern Detection - AC1
 *
 * Scheduled function that runs daily to analyze child profiles for
 * adult usage patterns and create flags when detected.
 *
 * FR134: Adult pattern detection as security foundation
 * AC1: Analyzes first 7 days of usage data
 * AC2: Creates verification prompt when patterns detected
 */

import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  shouldTriggerAnalysis,
  analyzeChildUsagePattern,
  createAdultPatternFlag,
  expireOldFlags,
  markNotificationSent,
} from '../services/adultPattern'

const db = getFirestore()

/**
 * Get all child profiles with active monitoring.
 *
 * Returns children who have:
 * - Monitoring enabled (not disabled)
 * - At least one device enrolled
 */
async function getEligibleChildren(): Promise<
  Array<{ childId: string; familyId: string; name: string }>
> {
  const childrenQuery = await db
    .collection('children')
    .where('monitoringDisabled', '!=', true) // Active monitoring
    .get()

  const eligibleChildren: Array<{ childId: string; familyId: string; name: string }> = []

  for (const doc of childrenQuery.docs) {
    const data = doc.data()

    // Skip if no family ID
    if (!data.familyId) {
      continue
    }

    eligibleChildren.push({
      childId: doc.id,
      familyId: data.familyId as string,
      name: data.name as string,
    })
  }

  return eligibleChildren
}

/**
 * Get guardian UIDs for a family.
 */
async function getGuardianUids(familyId: string): Promise<string[]> {
  const familyDoc = await db.collection('families').doc(familyId).get()
  if (!familyDoc.exists) {
    return []
  }

  const guardians = familyDoc.data()?.guardians || []
  return guardians.map((g: { uid: string }) => g.uid)
}

/**
 * Send notification to guardians about adult pattern detection.
 *
 * Uses the existing notification infrastructure from Epic 41.
 */
async function sendAdultPatternNotification(
  familyId: string,
  childName: string,
  confidence: number
): Promise<void> {
  const guardianUids = await getGuardianUids(familyId)

  for (const uid of guardianUids) {
    // Create a notification document
    await db.collection('notifications').add({
      recipientUid: uid,
      type: 'adult_pattern_detected',
      familyId,
      title: 'Usage Pattern Review Required',
      body: `Please review the usage patterns for ${childName}. The system detected patterns that may indicate adult usage.`,
      data: {
        confidence,
        childName,
      },
      createdAt: Date.now(),
      readAt: null,
      dismissedAt: null,
    })
  }

  logger.info('Adult pattern notifications sent', {
    familyId,
    childName,
    guardianCount: guardianUids.length,
  })
}

/**
 * Daily adult pattern analysis scheduled function.
 *
 * Runs every day at 3 AM UTC to:
 * 1. Find children with 7+ days of data who haven't been analyzed recently
 * 2. Run pattern analysis on eligible children
 * 3. Create flags for high-confidence detections
 * 4. Send notifications to guardians
 * 5. Expire old unanswered flags
 *
 * Story 8.10: Adult Pattern Detection - AC1, AC2
 */
export const analyzeAdultPatternsScheduled = onSchedule(
  {
    schedule: '0 3 * * *', // Every day at 3 AM UTC
    timeZone: 'UTC',
    retryCount: 2,
    maxInstances: 1,
    timeoutSeconds: 540, // 9 minutes
  },
  async (_event: ScheduledEvent) => {
    logger.info('Starting daily adult pattern analysis')

    const startTime = Date.now()
    let childrenChecked = 0
    let childrenAnalyzed = 0
    let flagsCreated = 0
    let notificationsSent = 0
    let flagsExpired = 0
    let errors = 0

    try {
      // Step 1: Expire old pending flags (30+ days without response)
      try {
        flagsExpired = await expireOldFlags(30)
        if (flagsExpired > 0) {
          logger.info(`Expired ${flagsExpired} old pending flags`)
        }
      } catch (error) {
        logger.error('Failed to expire old flags', {
          error: error instanceof Error ? error.message : 'Unknown',
        })
        // Continue with analysis despite expiration failure
      }

      // Step 2: Get all eligible children
      const eligibleChildren = await getEligibleChildren()
      logger.info(`Found ${eligibleChildren.length} children with active monitoring`)

      // Step 3: Check each child for analysis eligibility and run analysis
      for (const child of eligibleChildren) {
        try {
          childrenChecked++

          // Check if analysis should be triggered
          const triggerCheck = await shouldTriggerAnalysis(child.childId, child.familyId)

          if (!triggerCheck.shouldAnalyze) {
            logger.debug('Skipping child', {
              childId: child.childId,
              reason: triggerCheck.reason,
            })
            continue
          }

          // Run pattern analysis
          const analysis = await analyzeChildUsagePattern(child.childId, child.familyId)
          childrenAnalyzed++

          logger.info('Analyzed child usage patterns', {
            childId: child.childId,
            screenshotsAnalyzed: analysis.screenshotsAnalyzed,
            overallConfidence: analysis.overallConfidence,
            shouldFlag: analysis.shouldFlag,
            signals: analysis.signals.map((s) => ({
              type: s.signalType,
              confidence: s.confidence,
            })),
          })

          // Create flag if threshold exceeded
          if (analysis.shouldFlag) {
            const flag = await createAdultPatternFlag(analysis)
            flagsCreated++

            logger.warn('Adult pattern flag created', {
              flagId: flag.id,
              childId: child.childId,
              familyId: child.familyId,
              confidence: analysis.overallConfidence,
            })

            // Send notification to guardians
            try {
              await sendAdultPatternNotification(
                child.familyId,
                child.name,
                analysis.overallConfidence
              )
              await markNotificationSent(flag.id, child.familyId)
              notificationsSent++
            } catch (notifyError) {
              logger.error('Failed to send notification', {
                flagId: flag.id,
                error: notifyError instanceof Error ? notifyError.message : 'Unknown',
              })
              // Continue even if notification fails - flag is still created
            }
          }
        } catch (error) {
          errors++
          logger.error('Failed to analyze child', {
            childId: child.childId,
            familyId: child.familyId,
            error: error instanceof Error ? error.message : 'Unknown',
          })
        }
      }

      const duration = Date.now() - startTime
      logger.info('Daily adult pattern analysis complete', {
        childrenChecked,
        childrenAnalyzed,
        flagsCreated,
        notificationsSent,
        flagsExpired,
        errors,
        durationMs: duration,
      })
    } catch (error) {
      logger.error('Daily adult pattern analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown',
      })
      throw error
    }
  }
)
