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

// Comprehensive audit event exports (Story 27.1)
export {
  accessTypeSchema,
  actorTypeSchema,
  auditResourceTypeSchema,
  auditEventSchema,
  auditFailureSchema,
  createAuditEventInputSchema,
  guardianViewCountSchema,
  viewingPatternAnalysisSchema,
  patternAlertSchema,
  type AccessType,
  type ActorType,
  type AuditResourceType,
  type AuditEvent,
  type AuditFailure,
  type CreateAuditEventInput,
  type GuardianViewCount,
  type ViewingPatternAnalysis,
  type PatternAlert,
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

// Flag throttle exports (Story 21.3)
export {
  FLAG_THROTTLE_LEVELS,
  flagThrottleLevelSchema,
  FLAG_THROTTLE_LIMITS,
  flagThrottleStateSchema,
  throttledConcernFlagSchema,
  type FlagThrottleLevel,
  type FlagThrottleState,
  type ThrottledConcernFlag,
} from './contracts'

// Confidence threshold exports (Story 21.4)
export {
  CONFIDENCE_THRESHOLD_LEVELS,
  confidenceThresholdLevelSchema,
  CONFIDENCE_THRESHOLD_VALUES,
  ALWAYS_FLAG_THRESHOLD,
  categoryConfidenceThresholdsSchema,
  type ConfidenceThresholdLevel,
  type CategoryConfidenceThresholds,
} from './contracts'

// Flag document exports (Story 21.5, 21.7, 22.3, 22.4, 23.1, 23.2)
export {
  flagDocumentSchema,
  FLAG_FEEDBACK_VALUES,
  flagActionTypeSchema,
  flagAuditEntrySchema,
  flagNoteSchema,
  childNotificationStatusSchema,
  ANNOTATION_WINDOW_MS,
  // Story 23.2 annotation exports
  ANNOTATION_OPTIONS,
  ANNOTATION_OPTION_VALUES,
  annotationOptionSchema,
  MAX_ANNOTATION_EXPLANATION_LENGTH,
  // Story 23.3 escalation exports
  EXTENSION_WINDOW_MS,
  escalationReasonSchema,
  type EscalationReason,
  type FlagDocument,
  type CreateFlagParams,
  type FlagFeedbackRating,
  type UpdateFlagFeedbackParams,
  type FlagActionType,
  type FlagAuditEntry,
  type FlagNote,
  type ChildNotificationStatus,
  type AnnotationOption,
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

// Family-specific model tuning exports (Story 24.2)
export {
  MINIMUM_CORRECTIONS_THRESHOLD,
  familyFeedbackSchema,
  correctionPatternSchema,
  familyBiasWeightsSchema,
  aiLearningStatusSchema,
  type FamilyFeedback,
  type CorrectionPattern,
  type FamilyBiasWeights,
  type AILearningStatus,
} from './contracts'

// App category approval exports (Story 24.3)
export {
  APP_APPROVAL_STATUS_VALUES,
  appApprovalStatusSchema,
  APP_APPROVAL_ADJUSTMENTS,
  appCategoryApprovalSchema,
  type AppApprovalStatus,
  type AppCategoryApproval,
} from './contracts'

// Learning dashboard exports (Story 24.4)
export {
  categoryImprovementSchema,
  learnedPatternSchema,
  learningDashboardDataSchema,
  type CategoryImprovement,
  type LearnedPattern,
  type LearningDashboardData,
} from './contracts'

// Global model improvement pipeline exports (Story 24.5)
export {
  globalPatternAggregationSchema,
  globalModelMetricsSchema,
  familyAISettingsSchema,
  GLOBAL_PATTERN_REVIEW_THRESHOLD,
  type GlobalPatternAggregation,
  type GlobalModelMetrics,
  type FamilyAISettings,
} from './contracts'

// Real-time access notification exports (Story 27.6)
export {
  notificationPreferencesSchema,
  DEFAULT_NOTIFICATION_PREFERENCES,
  accessNotificationSchema,
  type NotificationPreferences,
  type AccessNotification,
} from './contracts'

// Health check-in exports (Story 27.5.1)
export {
  checkInFrequencySchema,
  checkInStatusSchema,
  checkInRatingSchema,
  checkInRecipientTypeSchema,
  checkInResponseSchema,
  healthCheckInSchema,
  checkInSettingsSchema,
  DEFAULT_CHECK_IN_SETTINGS,
  CHECK_IN_FREQUENCY_MS,
  CHECK_IN_FAMILY_AGE_THRESHOLD_MS,
  CHECK_IN_REMINDER_DELAY_MS,
  type CheckInFrequency,
  type CheckInStatus,
  type CheckInRating,
  type CheckInRecipientType,
  type CheckInResponse,
  type HealthCheckIn,
  type CheckInSettings,
} from './contracts'

// Resolution marker exports (Story 27.5.6)
export {
  resolutionMarkerTypeSchema,
  RESOLUTION_MARKER_LABELS,
  resolutionCreatorTypeSchema,
  resolutionSchema,
  type ResolutionMarkerType,
  type ResolutionCreatorType,
  type Resolution,
} from './contracts'

// Screenshot description exports (Story 28.1)
export {
  descriptionStatusSchema,
  screenshotDescriptionSchema,
  DESCRIPTION_CONFIG,
  type DescriptionStatus,
  type ScreenshotDescription,
} from './contracts'

// Accessibility settings exports (Story 28.6)
export {
  accessibilitySettingsSchema,
  DEFAULT_ACCESSIBILITY_SETTINGS,
  type AccessibilitySettings,
} from './contracts'
