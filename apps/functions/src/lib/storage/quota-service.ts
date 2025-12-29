/**
 * Storage Quota Service
 * Story 18.8: Storage Quota Monitoring
 *
 * Tracks and manages storage usage per family.
 * Provides functions for getting, updating, and checking quotas.
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  getFamilyQuota,
  isAtWarningLevel,
  wouldExceedQuota,
  calculatePercentUsed,
  type StoragePlan,
} from './quota-config'
import { createRateLimitAlert, getActiveRateLimitAlert } from '../alerts'

/**
 * Alert type for storage warnings
 */
export const ALERT_TYPE_STORAGE_WARNING = 'storage_warning' as const

/**
 * Storage usage information for a family
 */
export interface StorageUsage {
  familyId: string
  usageBytes: number
  quotaBytes: number
  percentUsed: number
  plan: StoragePlan
  isWarningLevel: boolean
  isQuotaExceeded: boolean
}

/**
 * Result of quota check before upload
 */
export interface QuotaCheckResult {
  allowed: boolean
  usageBytes: number
  quotaBytes: number
  reason?: string
  isWarningLevel: boolean
}

/**
 * Get current storage usage for a family
 *
 * @param familyId - Family to get usage for
 * @returns Current storage usage and quota info
 */
export async function getFamilyStorageUsage(familyId: string): Promise<StorageUsage> {
  const db = getFirestore()

  const familyDoc = await db.collection('families').doc(familyId).get()
  const familyData = familyDoc.exists ? familyDoc.data() : null

  const usageBytes: number = familyData?.storageUsageBytes || 0
  const quota = await getFamilyQuota(familyId)

  return {
    familyId,
    usageBytes,
    quotaBytes: quota.quotaBytes,
    percentUsed: calculatePercentUsed(usageBytes, quota.quotaBytes),
    plan: quota.plan,
    isWarningLevel: isAtWarningLevel(usageBytes, quota.quotaBytes),
    isQuotaExceeded: usageBytes >= quota.quotaBytes,
  }
}

/**
 * Check if an upload would be allowed given current quota
 *
 * @param familyId - Family to check quota for
 * @param fileSizeBytes - Size of file to upload
 * @returns Whether upload is allowed and current usage info
 */
export async function checkQuotaBeforeUpload(
  familyId: string,
  fileSizeBytes: number
): Promise<QuotaCheckResult> {
  const usage = await getFamilyStorageUsage(familyId)

  if (wouldExceedQuota(usage.usageBytes, fileSizeBytes, usage.quotaBytes)) {
    return {
      allowed: false,
      usageBytes: usage.usageBytes,
      quotaBytes: usage.quotaBytes,
      reason: 'Storage quota exceeded',
      isWarningLevel: true,
    }
  }

  // Check if this upload would push us into warning territory
  const newUsage = usage.usageBytes + fileSizeBytes
  const newIsWarning = isAtWarningLevel(newUsage, usage.quotaBytes)

  return {
    allowed: true,
    usageBytes: usage.usageBytes,
    quotaBytes: usage.quotaBytes,
    isWarningLevel: newIsWarning,
  }
}

/**
 * Update family storage usage after upload
 *
 * @param familyId - Family to update
 * @param deltaBytes - Bytes to add (positive) or remove (negative)
 */
export async function updateFamilyStorageUsage(
  familyId: string,
  deltaBytes: number
): Promise<void> {
  const db = getFirestore()

  await db
    .collection('families')
    .doc(familyId)
    .update({
      storageUsageBytes: FieldValue.increment(deltaBytes),
    })

  logger.info('Family storage usage updated', {
    familyId,
    deltaBytes,
  })
}

/**
 * Create storage warning alert if not already shown
 *
 * @param familyId - Family to alert
 * @param usageBytes - Current usage
 * @param quotaBytes - Current quota
 */
export async function createStorageWarningAlert(
  familyId: string,
  usageBytes: number,
  quotaBytes: number
): Promise<void> {
  const db = getFirestore()

  // Check if warning already shown (prevent duplicate alerts)
  const familyDoc = await db.collection('families').doc(familyId).get()
  const familyData = familyDoc.exists ? familyDoc.data() : null

  if (familyData?.storageWarningShown) {
    return // Already warned
  }

  // Check for existing active storage warning alert
  const existingAlert = await getActiveRateLimitAlert(
    familyId,
    'system', // Use 'system' as viewerId for storage alerts
    'storage', // Use 'storage' as childId placeholder
    24 * 60 * 60 * 1000 // 24 hour window for storage alerts
  )

  if (existingAlert) {
    return // Already have an active alert
  }

  // Create the alert
  await createRateLimitAlert({
    familyId,
    childId: 'storage', // Placeholder
    viewerId: 'system',
    viewerEmail: null,
    count: Math.round((usageBytes / quotaBytes) * 100), // Use count as percentage
    threshold: 80, // 80% threshold
  })

  // Mark warning as shown
  await db.collection('families').doc(familyId).update({
    storageWarningShown: true,
  })

  logger.info('Storage warning alert created', {
    familyId,
    usageBytes,
    quotaBytes,
    percentUsed: calculatePercentUsed(usageBytes, quotaBytes),
  })
}

/**
 * Reset storage warning flag (e.g., after usage drops below threshold)
 *
 * @param familyId - Family to reset
 */
export async function resetStorageWarningFlag(familyId: string): Promise<void> {
  const db = getFirestore()

  await db.collection('families').doc(familyId).update({
    storageWarningShown: false,
  })
}
