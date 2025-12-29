/**
 * Storage Library
 * Story 18.8: Storage Quota Monitoring
 *
 * Provides storage quota management utilities.
 */

export {
  getFamilyQuota,
  isAtWarningLevel,
  wouldExceedQuota,
  calculatePercentUsed,
  PLAN_QUOTAS,
  STORAGE_WARNING_THRESHOLD,
  type StoragePlan,
  type QuotaConfig,
} from './quota-config'

export {
  getFamilyStorageUsage,
  checkQuotaBeforeUpload,
  updateFamilyStorageUsage,
  createStorageWarningAlert,
  resetStorageWarningFlag,
  ALERT_TYPE_STORAGE_WARNING,
  type StorageUsage,
  type QuotaCheckResult,
} from './quota-service'
