/**
 * @fledgely/shared
 *
 * Shared utilities, contracts, and constants for the Fledgely application.
 */

// Explicit named exports per architecture guidelines (no wildcard re-exports)
export { placeholderSchema, type Placeholder } from './contracts'
export { ERROR_CODES, QUERY_STALE_TIMES, type ErrorCode } from './constants'

// Crisis allowlist exports (Story 7.1)
export {
  CRISIS_ALLOWLIST,
  CRISIS_ALLOWLIST_VERSION,
  CRISIS_RESOURCES,
  getResourcesByCategory,
  getAllProtectedDomains,
} from './constants/crisis-urls'
export {
  crisisResourceCategorySchema,
  crisisResourceSchema,
  crisisAllowlistSchema,
  matchesCrisisUrl,
  isCrisisUrl,
  type CrisisResourceCategory,
  type CrisisResource,
  type CrisisAllowlist,
} from './contracts'

// Screenshot metadata exports (Story 18.2)
export {
  DEFAULT_RETENTION_DAYS,
  screenshotMetadataSchema,
  generateScreenshotId,
  calculateRetentionExpiry,
  createScreenshotMetadata,
  type ScreenshotMetadata,
} from './contracts'

// Retention policy exports (Story 18.3)
export {
  RETENTION_DAYS_OPTIONS,
  retentionPolicySchema,
  getRetentionDays,
  isValidRetentionDays,
  formatExpiryRemaining,
  type RetentionDays,
  type RetentionPolicy,
} from './contracts'

// Stealth notification exports (Story 0.5.7)
export {
  STEALTH_DURATION_HOURS,
  STEALTH_DURATION_MS,
  CRITICAL_NOTIFICATION_TYPES,
  stealthQueueEntrySchema,
  stealthWindowSchema,
  activateStealthWindowInputSchema,
  type StealthQueueEntry,
  type StealthWindow,
  type ActivateStealthWindowInput,
  type CriticalNotificationType,
} from './contracts'

// Sealed audit exports (Story 0.5.8)
export {
  sealReasonSchema,
  sealedEntryAccessLogSchema,
  originalAuditEntrySchema,
  sealedAuditEntrySchema,
  sealAuditEntriesInputSchema,
  getSealedAuditEntriesInputSchema,
  getSealedAuditEntriesResponseSchema,
  type SealReason,
  type SealedEntryAccessLog,
  type OriginalAuditEntry,
  type SealedAuditEntry,
  type SealAuditEntriesInput,
  type GetSealedAuditEntriesInput,
  type GetSealedAuditEntriesResponse,
} from './contracts'

// Self-removal exports (Story 2.8)
export {
  SELF_REMOVAL_CONFIRMATION_PHRASE,
  selfRemoveFromFamilyInputSchema,
  selfRemoveFromFamilyResponseSchema,
  type SelfRemoveFromFamilyInput,
  type SelfRemoveFromFamilyResponse,
} from './contracts'

// Caregiver access window exports (Story 19D.4)
export {
  accessWindowSchema,
  familyCaregiverSchema,
  type AccessWindow,
  type FamilyCaregiver,
} from './contracts'

// Classification exports (Story 20.1, 20.4, 20.5)
export {
  classificationStatusSchema,
  categorySchema,
  classificationResultSchema,
  classificationJobSchema,
  secondaryCategorySchema,
  classificationDebugSchema,
  CLASSIFICATION_CONFIG,
  CATEGORY_VALUES,
  DEBUG_RETENTION_MS,
  calculateBackoffDelay,
  type ClassificationStatus,
  type Category,
  type ClassificationResult,
  type ClassificationJob,
  type SecondaryCategory,
  type ClassificationDebug,
} from './contracts'

// Category definitions exports (Story 20.2)
export {
  TAXONOMY_VERSION,
  LOW_CONFIDENCE_THRESHOLD,
  CATEGORY_DEFINITIONS,
  getCategoryDefinition,
  getCategoryDescription,
  getCategoryExamples,
  getAllCategoryDefinitions,
  buildCategoryDefinitionsForPrompt,
  type CategoryDefinition,
} from './constants/category-definitions'

// Confidence score exports (Story 20.3, 20.4)
export {
  CONFIDENCE_THRESHOLDS,
  MAX_CATEGORIES,
  getConfidenceLevelFromScore,
  classificationNeedsReview,
  shouldTriggerAutomation,
  getConfidenceLevelColor,
  type ConfidenceLevel,
} from './constants/confidence'

// Concern category exports (Story 21.1)
export {
  CONCERN_CATEGORY_VALUES,
  concernCategorySchema,
  concernSeveritySchema,
  concernFlagSchema,
  type ConcernCategory,
  type ConcernSeverity,
  type ConcernFlag,
} from './contracts'

// Distress suppression exports (Story 21.2)
export {
  FLAG_STATUS_VALUES,
  flagStatusSchema,
  SUPPRESSION_REASON_VALUES,
  suppressionReasonSchema,
  suppressedConcernFlagSchema,
  distressSuppressionLogSchema,
  type FlagStatus,
  type SuppressionReason,
  type SuppressedConcernFlag,
  type DistressSuppressionLog,
} from './contracts'

// Concern category definitions exports (Story 21.1)
export {
  CONCERN_TAXONOMY_VERSION,
  MIN_CONCERN_CONFIDENCE,
  CONCERN_CATEGORY_DEFINITIONS,
  getConcernCategoryDefinition,
  getAllConcernCategoryDefinitions,
  getSeverityGuidance,
  buildConcernDefinitionsForPrompt,
  type ConcernCategoryDefinition,
  type SeverityGuidance,
} from './constants/concern-category-definitions'
