/**
 * Storage Quota Configuration
 * Story 18.8: Storage Quota Monitoring
 *
 * Defines storage quotas per subscription plan and provides
 * functions to determine effective quota for a family.
 */

import { getFirestore } from 'firebase-admin/firestore'

/**
 * Subscription plan types
 */
export type StoragePlan = 'free' | 'paid'

/**
 * Default storage quotas per plan (in bytes)
 */
export const PLAN_QUOTAS = {
  free: 1 * 1024 * 1024 * 1024, // 1 GB
  paid: 10 * 1024 * 1024 * 1024, // 10 GB
} as const

/**
 * Warning threshold percentage (80%)
 */
export const STORAGE_WARNING_THRESHOLD = 0.8

/**
 * Result of quota lookup
 */
export interface QuotaConfig {
  quotaBytes: number
  plan: StoragePlan
  isCustom: boolean
}

/**
 * Get the effective storage quota for a family
 *
 * Priority:
 * 1. Custom quota override on family document
 * 2. Plan-based quota
 * 3. Default to free tier
 *
 * @param familyId - Family to get quota for
 * @returns Quota configuration
 */
export async function getFamilyQuota(familyId: string): Promise<QuotaConfig> {
  const db = getFirestore()

  try {
    const familyDoc = await db.collection('families').doc(familyId).get()

    if (!familyDoc.exists) {
      // Family not found - return free tier defaults
      return {
        quotaBytes: PLAN_QUOTAS.free,
        plan: 'free',
        isCustom: false,
      }
    }

    const familyData = familyDoc.data()

    // Check for custom quota override first
    const customQuota = familyData?.storageQuotaBytes
    if (typeof customQuota === 'number' && customQuota > 0) {
      return {
        quotaBytes: customQuota,
        plan: familyData?.storagePlan || 'free',
        isCustom: true,
      }
    }

    // Use plan-based quota
    const plan: StoragePlan = familyData?.storagePlan === 'paid' ? 'paid' : 'free'
    return {
      quotaBytes: PLAN_QUOTAS[plan],
      plan,
      isCustom: false,
    }
  } catch {
    // On error, return free tier defaults
    return {
      quotaBytes: PLAN_QUOTAS.free,
      plan: 'free',
      isCustom: false,
    }
  }
}

/**
 * Check if usage is at or above warning threshold (80%)
 */
export function isAtWarningLevel(usageBytes: number, quotaBytes: number): boolean {
  return usageBytes / quotaBytes >= STORAGE_WARNING_THRESHOLD
}

/**
 * Check if usage would exceed quota
 */
export function wouldExceedQuota(
  currentUsageBytes: number,
  additionalBytes: number,
  quotaBytes: number
): boolean {
  return currentUsageBytes + additionalBytes > quotaBytes
}

/**
 * Calculate percentage used (0-100)
 */
export function calculatePercentUsed(usageBytes: number, quotaBytes: number): number {
  if (quotaBytes <= 0) return 100
  return Math.min(100, Math.round((usageBytes / quotaBytes) * 100))
}
