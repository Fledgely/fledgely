/**
 * Allowlist Sync Monitor - Scheduled Cloud Function
 *
 * Story 7.7: Allowlist Distribution & Sync - Task 8
 *
 * Runs every 12 hours to check if any platform's crisis allowlist is stale.
 * If any platform has a cache older than 48 hours, an alert is triggered.
 *
 * CRITICAL: This ensures all platforms have current crisis protection.
 * Stale allowlists could miss new crisis resources or emergency additions.
 *
 * NOTE: This function does NOT log any user data or URLs - only platform
 * sync status information (platform name, version, staleness).
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  ALLOWLIST_SYNC_CONSTANTS,
  type AllowlistPlatform,
  type AllowlistSyncStatus,
  type AllowlistSyncAlert,
  isSyncStatusStale,
  calculateStaleDuration,
  formatStaleDuration,
  allowlistSyncStatusSchema,
} from '@fledgely/contracts'
import { v4 as uuidv4 } from 'uuid'

/**
 * Result of monitoring check for a single platform
 */
export interface PlatformCheckResult {
  platform: AllowlistPlatform
  status: AllowlistSyncStatus | null
  isStale: boolean
  staleDuration: number | null
  hasData: boolean
}

/**
 * Result of full monitoring run
 */
export interface MonitoringResult {
  checkedAt: string
  totalPlatforms: number
  checkedPlatforms: number
  stalePlatforms: PlatformCheckResult[]
  missingPlatforms: AllowlistPlatform[]
  alertsCreated: number
  success: boolean
  error?: string
}

/**
 * Check sync status for all platforms
 *
 * @param db - Firestore instance
 * @returns Array of platform check results
 */
export async function checkAllPlatforms(
  db: FirebaseFirestore.Firestore
): Promise<PlatformCheckResult[]> {
  const platforms: AllowlistPlatform[] = ['web', 'chrome-extension', 'android', 'ios']
  const results: PlatformCheckResult[] = []

  for (const platform of platforms) {
    const doc = await db
      .collection(ALLOWLIST_SYNC_CONSTANTS.SYNC_STATUS_COLLECTION)
      .doc(platform)
      .get()

    if (!doc.exists) {
      results.push({
        platform,
        status: null,
        isStale: true, // No data = considered stale
        staleDuration: null,
        hasData: false,
      })
      continue
    }

    const data = doc.data()
    const parsed = allowlistSyncStatusSchema.safeParse(data)

    if (!parsed.success) {
      results.push({
        platform,
        status: null,
        isStale: true, // Invalid data = considered stale
        staleDuration: null,
        hasData: false,
      })
      continue
    }

    const status = parsed.data
    const staleDuration = calculateStaleDuration(status.lastSyncAt)
    const isStale = isSyncStatusStale(status.lastSyncAt)

    results.push({
      platform,
      status,
      isStale,
      staleDuration,
      hasData: true,
    })
  }

  return results
}

/**
 * Create alert for stale platform
 *
 * @param db - Firestore instance
 * @param result - Platform check result
 * @returns Created alert or null if already exists
 */
export async function createStaleAlert(
  db: FirebaseFirestore.Firestore,
  result: PlatformCheckResult
): Promise<AllowlistSyncAlert | null> {
  // Check if there's already an unresolved alert for this platform
  const existingAlerts = await db
    .collection(ALLOWLIST_SYNC_CONSTANTS.SYNC_ALERTS_COLLECTION)
    .where('platform', '==', result.platform)
    .where('resolved', '==', false)
    .limit(1)
    .get()

  if (!existingAlerts.empty) {
    // Alert already exists, don't create duplicate
    return null
  }

  const now = new Date().toISOString()
  const alert: AllowlistSyncAlert = {
    id: uuidv4(),
    platform: result.platform,
    lastVersion: result.status?.version ?? 'unknown',
    lastSyncAt: result.status?.lastSyncAt ?? now,
    staleDuration: result.staleDuration ?? 0,
    alertedAt: now,
    resolved: false,
  }

  await db
    .collection(ALLOWLIST_SYNC_CONSTANTS.SYNC_ALERTS_COLLECTION)
    .doc(alert.id)
    .set({
      ...alert,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

  return alert
}

/**
 * Run the full monitoring check
 *
 * @param db - Firestore instance
 * @returns Monitoring result
 */
export async function runMonitoringCheck(
  db: FirebaseFirestore.Firestore
): Promise<MonitoringResult> {
  const checkedAt = new Date().toISOString()
  const platforms: AllowlistPlatform[] = ['web', 'chrome-extension', 'android', 'ios']

  try {
    // Check all platforms
    const results = await checkAllPlatforms(db)

    // Identify stale and missing platforms
    const stalePlatforms = results.filter((r) => r.isStale)
    const missingPlatforms = results
      .filter((r) => !r.hasData)
      .map((r) => r.platform)

    // Create alerts for stale platforms
    let alertsCreated = 0
    for (const staleResult of stalePlatforms) {
      const alert = await createStaleAlert(db, staleResult)
      if (alert) {
        alertsCreated++
      }
    }

    return {
      checkedAt,
      totalPlatforms: platforms.length,
      checkedPlatforms: results.filter((r) => r.hasData).length,
      stalePlatforms,
      missingPlatforms,
      alertsCreated,
      success: true,
    }
  } catch (error) {
    return {
      checkedAt,
      totalPlatforms: platforms.length,
      checkedPlatforms: 0,
      stalePlatforms: [],
      missingPlatforms: platforms,
      alertsCreated: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Scheduled Cloud Function: allowlistSyncMonitor
 *
 * Runs every 12 hours to check if any platform's crisis allowlist is stale.
 * Creates alerts for platforms that haven't synced in >48 hours.
 *
 * Logs:
 * - Platform sync status summary (no user data)
 * - Stale platform alerts
 * - Monitoring errors
 */
export const allowlistSyncMonitor = onSchedule(
  {
    schedule: 'every 12 hours',
    timeZone: 'UTC',
    retryCount: 3,
  },
  async () => {
    const db = getFirestore()
    const now = Timestamp.now()

    try {
      // Run monitoring check
      const result = await runMonitoringCheck(db)

      // Log to audit
      const auditData = {
        action: 'allowlist-sync-check',
        resourceType: 'allowlistSyncStatus',
        resourceId: 'scheduled-check',
        performedBy: 'system',
        checkedAt: result.checkedAt,
        totalPlatforms: result.totalPlatforms,
        checkedPlatforms: result.checkedPlatforms,
        stalePlatformCount: result.stalePlatforms.length,
        stalePlatforms: result.stalePlatforms.map((p) => ({
          platform: p.platform,
          staleDuration: p.staleDuration
            ? formatStaleDuration(p.staleDuration)
            : 'unknown',
          lastVersion: p.status?.version ?? 'unknown',
        })),
        missingPlatforms: result.missingPlatforms,
        alertsCreated: result.alertsCreated,
        success: result.success,
        timestamp: FieldValue.serverTimestamp(),
      }

      await db.collection('adminAuditLog').add(auditData)

      // Log results
      if (result.stalePlatforms.length > 0) {
        // Output warning for monitoring/alerting systems
        console.warn('ALERT: Stale allowlist platforms detected', {
          stalePlatformCount: result.stalePlatforms.length,
          stalePlatforms: result.stalePlatforms.map((p) => ({
            platform: p.platform,
            staleDuration: p.staleDuration
              ? formatStaleDuration(p.staleDuration)
              : 'no data',
          })),
          message:
            'Platforms have not synced crisis allowlist in >48 hours. Investigate immediately.',
        })
      } else if (result.missingPlatforms.length > 0) {
        // Some platforms have no data yet (expected for unreleased platforms)
        console.log('Allowlist sync check complete', {
          checkedPlatforms: result.checkedPlatforms,
          missingPlatforms: result.missingPlatforms,
          message: 'Some platforms have no sync data (may be unreleased)',
        })
      } else {
        console.log('Allowlist sync check complete: all platforms current', {
          totalPlatforms: result.totalPlatforms,
          checkedPlatforms: result.checkedPlatforms,
        })
      }
    } catch (error) {
      console.error('Allowlist sync monitoring failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // Log error to audit
      await db.collection('adminAuditLog').add({
        action: 'allowlist_sync_check_error',
        resourceType: 'allowlistSyncStatus',
        resourceId: 'scheduled-check',
        performedBy: 'system',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: FieldValue.serverTimestamp(),
      })

      // Re-throw to trigger retry
      throw error
    }
  }
)
