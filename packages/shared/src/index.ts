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

// Screen time data model exports (Story 29.1)
export {
  MAX_SCREEN_TIME_MINUTES_PER_DAY,
  MAX_SCREEN_TIME_MINUTES_PER_WEEK,
  screenTimeDeviceTypeSchema,
  screenTimeCategorySchema,
  appTimeEntrySchema,
  categoryTimeEntrySchema,
  deviceTimeEntrySchema,
  screenTimeDailySummarySchema,
  screenTimeWeeklySummarySchema,
  screenTimeEntrySchema,
  type ScreenTimeDeviceType,
  type ScreenTimeCategory,
  type AppTimeEntry,
  type CategoryTimeEntry,
  type DeviceTimeEntry,
  type ScreenTimeDailySummary,
  type ScreenTimeWeeklySummary,
  type ScreenTimeEntry,
} from './contracts'

// Time limit data model exports (Story 30.1)
export {
  timeLimitTypeSchema,
  dayOfWeekSchema,
  scheduleTypeSchema,
  customDaysSchema,
  timeLimitScheduleSchema,
  categoryLimitSchema,
  deviceLimitSchema,
  timeLimitSchema,
  childTimeLimitsSchema,
  type TimeLimitType,
  type DayOfWeek,
  type ScheduleType,
  type CustomDays,
  type TimeLimitSchedule,
  type CategoryLimit,
  type DeviceLimit,
  type TimeLimit,
  type ChildTimeLimits,
} from './contracts'

// Custom category exports (Story 30.4)
export {
  customCategorySchema,
  MAX_CUSTOM_CATEGORIES_PER_FAMILY,
  type CustomCategory,
} from './contracts'

// Family offline schedule exports (Story 32.1)
export {
  offlineSchedulePresetSchema,
  offlineTimeWindowSchema,
  familyOfflineScheduleSchema,
  OFFLINE_SCHEDULE_PRESETS,
  OFFLINE_PRESET_LABELS,
  type OfflineSchedulePreset,
  type OfflineTimeWindow,
  type FamilyOfflineSchedule,
} from './contracts'

// Parent device enrollment exports (Story 32.2)
export {
  parentDeviceTypeSchema,
  parentEnrolledDeviceSchema,
  parentDeviceEnrollmentSchema,
  PARENT_DEVICE_TYPE_LABELS,
  PARENT_ENROLLMENT_MESSAGES,
  type ParentDeviceType,
  type ParentEnrolledDevice,
  type ParentDeviceEnrollment,
} from './contracts'

// Parent compliance tracking exports (Story 32.4)
export {
  parentActivityEventSchema,
  parentComplianceRecordSchema,
  parentComplianceSummarySchema,
  PARENT_COMPLIANCE_MESSAGES,
  type ParentActivityEvent,
  type ParentComplianceRecord,
  type ParentComplianceSummary,
} from './contracts'

// Offline exception exports (Story 32.5)
export {
  OFFLINE_EXCEPTION_TYPE_VALUES,
  offlineExceptionTypeSchema,
  OFFLINE_EXCEPTION_STATUS_VALUES,
  offlineExceptionStatusSchema,
  offlineExceptionSchema,
  OFFLINE_EXCEPTION_MESSAGES,
  type OfflineExceptionType,
  type OfflineExceptionStatus,
  type OfflineException,
} from './contracts'

// Offline streak exports (Story 32.6)
export {
  STREAK_MILESTONE_DAYS,
  streakMilestonesSchema,
  offlineStreakSchema,
  STREAK_MESSAGES,
  leaderboardEntrySchema,
  type StreakMilestone,
  type StreakMilestones,
  type OfflineStreak,
  type LeaderboardEntry,
} from './contracts'

// Focus mode exports (Story 33.1)
export {
  FOCUS_MODE_DURATIONS,
  focusModeDurationSchema,
  focusModeStatusSchema,
  focusModeSessionSchema,
  focusModeStateSchema,
  FOCUS_MODE_DEFAULT_CATEGORIES,
  FOCUS_MODE_MESSAGES,
  // Story 33-2: Focus Mode Configuration
  focusModeAppEntrySchema,
  focusModeConfigSchema,
  appSuggestionStatusSchema,
  focusModeAppSuggestionSchema,
  FOCUS_MODE_DEFAULT_APPS,
  type FocusModeDuration,
  type FocusModeStatus,
  type FocusModeSession,
  type FocusModeState,
  type FocusModeAppEntry,
  type FocusModeConfig,
  type AppSuggestionStatus,
  type FocusModeAppSuggestion,
} from './contracts'

// Work mode exports (Story 33.3)
export {
  workScheduleSchema,
  workModeStatusSchema,
  workModeActivationTypeSchema,
  workModeSessionSchema,
  workModeStateSchema,
  workModeAppEntrySchema,
  workModeConfigSchema,
  WORK_MODE_DEFAULT_APPS,
  WORK_MODE_MESSAGES,
  type WorkSchedule,
  type WorkModeStatus,
  type WorkModeActivationType,
  type WorkModeSession,
  type WorkModeState,
  type WorkModeAppEntry,
  type WorkModeConfig,
} from './contracts'

// Calendar integration exports (Story 33.4)
export {
  calendarProviderSchema,
  calendarSyncFrequencySchema,
  calendarConnectionStatusSchema,
  calendarIntegrationConfigSchema,
  calendarEventSchema,
  cachedCalendarEventsSchema,
  focusModeTriggerTypeSchema,
  focusModeSessionWithCalendarSchema,
  CALENDAR_SYNC_FREQUENCIES,
  CALENDAR_FOCUS_TRIGGER_KEYWORDS,
  CALENDAR_INTEGRATION_MESSAGES,
  type CalendarProvider,
  type CalendarSyncFrequency,
  type CalendarConnectionStatus,
  type CalendarIntegrationConfig,
  type CalendarEvent,
  type CachedCalendarEvents,
  type FocusModeTriggerType,
  type FocusModeSessionWithCalendar,
} from './contracts'

// Focus mode analytics exports (Story 33.5)
// Note: DayOfWeek and dayOfWeekSchema are already exported in Story 30.1
export {
  timeOfDaySchema,
  focusModeSessionSummarySchema,
  focusModeDailySummarySchema,
  focusModeAnalyticsSchema,
  FOCUS_MODE_ANALYTICS_MESSAGES,
  getTimeOfDay,
  getDayOfWeek,
  type TimeOfDay,
  type FocusModeSessionSummary,
  type FocusModeDailySummary,
  type FocusModeAnalytics,
} from './contracts'

// Work mode analytics exports (Story 33.6)
export {
  workModeSessionSummarySchema,
  workModeDailySummarySchema,
  workModeWeeklyAnalyticsSchema,
  workModeCheckInSchema,
  WORK_MODE_ANALYTICS_MESSAGES,
  calculateWorkHoursDeviation,
  formatWorkDuration,
  minutesToHours,
  type WorkModeSessionSummary,
  type WorkModeDailySummary,
  type WorkModeWeeklyAnalytics,
  type WorkModeCheckIn,
} from './contracts'

// Decline handling exports (Story 34.5)
export {
  DECLINE_REASONS,
  DECLINE_MESSAGES,
  AFTER_DECLINE_MESSAGES,
  declineReasonIdSchema,
  type DeclineReasonId,
} from './contracts'

// Agreement proposal exports (Story 34.1, 34.2, 34.4)
export {
  proposalChangeTypeSchema,
  proposalChangeSchema,
  agreementProposalSchema,
  signatureRecordSchema,
  dualSignaturesSchema,
  activatedAgreementVersionSchema,
  AGREEMENT_PROPOSAL_MESSAGES,
  CHILD_PROPOSAL_MESSAGES,
  type ProposalChangeType,
  type ProposalChange,
  type AgreementProposal,
  type SignatureRecord,
  type DualSignatures,
  type ActivatedAgreementVersion,
} from './contracts'

// Agreement history exports (Story 34.6)
export {
  agreementChangeSchema,
  historyVersionSchema,
  HISTORY_MESSAGES,
  getUpdateCountMessage,
  getGrowthMessage,
  type AgreementChange,
  type HistoryVersion,
} from './contracts'

// Agreement expiry exports (Story 35.1)
export {
  expiryDurationSchema,
  EXPIRY_DURATIONS,
  EXPIRY_DURATION_LABELS,
  EXPIRY_MESSAGES,
  getRecommendedExpiry,
  calculateExpiryDate,
  isExpiringSoon,
  getDaysUntilExpiry,
  getAnnualReviewDate,
  type ExpiryDuration,
  type ExpiryDurationConfig,
} from './contracts'

// Renewal reminder exports (Story 35.2)
export {
  reminderTypeSchema,
  reminderStatusSchema,
  REMINDER_THRESHOLDS,
  SNOOZE_DURATION_DAYS,
  REMINDER_MESSAGES as RENEWAL_REMINDER_MESSAGES,
  REMINDER_CONFIGS,
  getReminderType,
  calculateSnoozeExpiry,
  isSnoozeExpired,
  shouldShowReminder,
  getReminderConfig,
  type ReminderType,
  type ReminderStatus,
  type SnoozeInfo,
  type ReminderConfig,
} from './contracts'

// Agreement renewal exports (Story 35.3)
export {
  renewalModeSchema,
  renewalStatusSchema,
  renewalInitiatorSchema,
  renewalRequestSchema,
  renewalConsentSchema,
  consentRoleSchema,
  RENEWAL_MODES,
  RENEWAL_STATUS,
  AGREEMENT_RENEWAL_MESSAGES,
  calculateRenewalExpiryDate,
  isEligibleForRenewal,
  canRenewAsIs,
  getRenewalModeConfig,
  isRenewalComplete,
  type RenewalMode,
  type RenewalStatus,
  type RenewalInitiator,
  type RenewalRequest,
  type RenewalConsent,
  type ConsentRole,
  type RenewalModeConfig,
} from './contracts'

// Agreement grace period exports (Story 35.4)
export {
  gracePeriodStatusSchema,
  gracePeriodInfoSchema,
  GRACE_PERIOD_DAYS,
  GRACE_PERIOD_STATUS,
  GRACE_PERIOD_MESSAGES,
  getGracePeriodEndDate,
  getDaysRemainingInGracePeriod,
  isInGracePeriod,
  hasGracePeriodExpired,
  getGracePeriodInfo,
  isMonitoringActiveInGracePeriod,
  getGracePeriodStatusConfig,
  formatGracePeriodMessage,
  getGracePeriodMessage,
  type GracePeriodStatus,
  type GracePeriodInfo,
  type GracePeriodUrgency,
  type GracePeriodStatusConfig,
  type AgreementForGracePeriod,
} from './contracts'

// Post-grace period exports (Story 35.5)
export {
  postGraceStatusSchema,
  POST_GRACE_STATUS,
  POST_GRACE_BEHAVIOR,
  POST_GRACE_MESSAGES,
  isMonitoringPaused,
  getPostGraceStatus,
  canResumeMonitoring,
  shouldCaptureScreenshots,
  shouldEnforceTimeLimits,
  getPostGraceMessage,
  getMonitoringPauseReason,
  getResumeRequirements,
  type PostGraceStatus,
  type AgreementForPostGrace,
} from './contracts'

// Trust Score exports (Story 36.1)
export {
  TRUST_SCORE_MIN,
  TRUST_SCORE_MAX,
  TRUST_SCORE_DEFAULT,
  trustFactorTypeSchema,
  trustFactorCategorySchema,
  trustFactorSchema,
  trustScoreHistoryEntrySchema,
  trustScoreSchema,
  type TrustFactorType,
  type TrustFactorCategory,
  type TrustFactor,
  type TrustScoreHistoryEntry,
  type TrustScore,
} from './contracts'

// Trust Factor Definitions exports (Story 36.1)
export {
  TRUST_FACTOR_DEFINITIONS,
  getFactorDefinition,
  getFactorsByCategory,
  calculateFactorPoints,
  type TrustFactorDefinition,
} from './contracts'

// Trust Score Validation exports (Story 36.1)
export {
  isValidScore,
  clampScore,
  validateTrustScore,
  validateFactor,
  isScoreUpdateDue,
  type ValidationResult,
} from './contracts'

// Trust Score Calculation exports (Story 36.2)
export {
  RECENCY_WEIGHT_LAST_7_DAYS,
  RECENCY_WEIGHT_LAST_14_DAYS,
  RECENCY_WEIGHT_LAST_30_DAYS,
  RECENCY_WEIGHT_OLDER,
  RECENCY_DAYS_7,
  RECENCY_DAYS_14,
  RECENCY_DAYS_30,
  MAX_DAILY_INCREASE,
  MAX_DAILY_DECREASE,
  scoreBreakdownSchema,
  scoreCalculationResultSchema,
  getRecencyWeight,
  applyRecencyWeight,
  getPositiveContribution,
  getNeutralContribution,
  getConcerningContribution,
  calculateWeightedFactorContribution,
  generateScoreBreakdown,
  clampDailyDelta,
  calculateNewScore,
  type ScoreBreakdown,
  type ScoreCalculationResult,
} from './contracts'

// Trust Score Breakdown Display exports (Story 36.2)
export {
  formatFactorContribution,
  formatFactorWithRecency,
  formatFactorList,
  formatScoreChange,
  formatScoreChangeWithPeriod,
  getCategoryContributionText,
  getCategoryLabel,
  generateBreakdownText,
  generateBreakdownSummary,
  getFactorTypeLabel,
  generateImprovementTips,
  generateEncouragement,
} from './contracts'

// Bypass Attempt exports (Story 36.5)
export {
  BYPASS_EXPIRY_DAYS_DEFAULT,
  createBypassAttempt,
  isExpired as isBypassExpired,
  getActiveBypassAttempts,
  getBypassAttempts,
  markAsUnintentional,
  calculateBypassImpact,
  type BypassAttemptType,
  type BypassAttempt,
  type CreateBypassAttemptInput,
  type GetBypassAttemptsOptions,
} from './services/bypassAttemptService'

// Trust Score Privacy exports (Story 36.6)
export {
  canViewTrustScore,
  getViewableTrustScores,
  isParentViewer,
  type FamilyMember,
  type ViewerRole,
  type TrustScoreAccessResult,
} from './services/trustScorePrivacyService'

// Annual Review exports (Story 35.6)
export {
  ANNUAL_REVIEW_INTERVAL_DAYS,
  annualReviewStatusSchema,
  ANNUAL_REVIEW_MESSAGES,
  AGE_SUGGESTION_THRESHOLDS,
  annualReviewPromptSchema,
  isAnnualReviewDue,
  getDaysSinceLastReview,
  getAgeBasedSuggestions,
  getAnnualReviewStatus,
  type AnnualReviewStatus,
  type AnnualReviewPrompt,
  type AgreementForAnnualReview,
  type AgeSuggestionThreshold,
} from './contracts'

// Trust Milestone exports (Story 37.1)
export {
  MILESTONE_DURATION_DAYS,
  MILESTONE_THRESHOLDS,
  TRUST_MILESTONES,
  trustMilestoneLevelSchema,
  trustMilestoneSchema,
  milestoneHistoryEntrySchema,
  childMilestoneStatusSchema,
  getMilestoneByLevel,
  getMilestonesSortedByThreshold,
  getNextMilestone,
  type TrustMilestoneLevel,
  type TrustMilestone,
  type MilestoneHistoryEntry,
  type ChildMilestoneStatus,
} from './contracts/trustMilestone'

// Milestone Service exports (Story 37.1)
export {
  getMilestoneForScore,
  checkMilestoneEligibility,
  calculateConsecutiveDays,
  transitionMilestone,
  type ScoreHistoryEntry,
  type MilestoneEligibility,
  type MilestoneTransition,
} from './services/milestoneService'

// Milestone Regression Service exports (Story 37.1)
export {
  MILESTONE_GRACE_PERIOD_DAYS,
  checkForRegressionRisk,
  applyGracePeriod,
  isMilestoneInGracePeriod,
  shouldTriggerRegression,
  getRegressionMessage,
  createRegressionNotification,
  type RegressionRiskStatus,
  type GracePeriodState,
  type RegressionNotification,
} from './services/milestoneRegressionService'

// Milestone Frequency exports (Story 37.2)
export {
  DEFAULT_FREQUENCY_MINUTES,
  MILESTONE_FREQUENCIES,
  milestoneFrequencyConfigSchema,
  frequencyChangeRecordSchema,
  getFrequencyForMilestone,
  getFrequencyDescription,
  getFrequencyReductionRatio,
  getAllFrequencyConfigs,
  type MilestoneFrequencyConfig,
  type FrequencyChangeRecord,
} from './contracts/milestoneFrequency'

// Frequency Reduction Service exports (Story 37.2)
export {
  calculateFrequencyChange,
  applyFrequencyReduction,
  getFrequencyChangeMessage,
  createFrequencyUpdate,
  type FrequencyChange,
  type FrequencyUpdate,
} from './services/frequencyReductionService'

// Notification-Only Mode exports (Story 37.3)
export {
  NOTIFICATION_ONLY_TRUST_THRESHOLD,
  NOTIFICATION_ONLY_DURATION_DAYS,
  NOTIFICATION_ONLY_MILESTONE,
  notificationOnlyConfigSchema,
  concerningPatternSchema,
  appUsageSummarySchema,
  dailySummarySchema,
  modeTransitionSchema,
  createDefaultNotificationOnlyConfig,
  createDailySummary,
  createConcerningPattern,
  determineSummaryStatus,
  getNotificationOnlyDescription,
  getModeTransitionMessage,
  type NotificationOnlyConfig,
  type ConcerningPattern,
  type AppUsageSummary,
  type DailySummary,
  type ModeTransition,
  type ConcerningPatternType,
  type PatternSeverity,
  type SummaryStatus,
  type TransitionReason,
} from './contracts/notificationOnlyMode'

// Notification-Only Mode Service exports (Story 37.3)
export {
  isQualifiedForNotificationOnlyMode,
  getDaysUntilQualification,
  getQualificationProgress,
  isInNotificationOnlyMode,
  hasEverQualified,
  getTimeSinceEnabled,
  enableNotificationOnlyMode,
  disableNotificationOnlyMode,
  updateModeSettings,
  shouldCaptureScreenshots as shouldCaptureScreenshotsNotificationMode,
  getCaptureStatusMessage,
  shouldEnforceTimeLimits as shouldEnforceTimeLimitsNotificationMode,
  getTimeLimitsMessage,
  getNotificationOnlyModeStatus,
  getQualificationMessage,
} from './services/notificationOnlyModeService'

// Daily Summary Service exports (Story 37.3)
export {
  generateDailySummary,
  calculateTotalUsage,
  getTopApps,
  checkTimeLimitReached,
  detectConcerningPatterns,
  detectExcessiveUsage,
  detectLateNightUsage,
  detectNewCategories,
  detectRapidAppSwitching,
  formatSummaryForParent,
  formatSummaryForChild,
  getSummaryStatusMessage,
  formatMinutes,
  formatHour,
  formatDate,
  DEFAULT_PATTERN_CONFIG,
  type UsageData,
  type PatternConfig,
} from './services/dailySummaryService'

// Automatic Reduction exports (Story 37.4)
export {
  AUTOMATIC_REDUCTION_TRUST_THRESHOLD,
  AUTOMATIC_REDUCTION_DURATION_MONTHS,
  AUTOMATIC_REDUCTION_DURATION_DAYS,
  automaticReductionConfigSchema,
  overrideRequestSchema,
  reductionResultSchema,
  graduationPathSchema,
  createDefaultAutomaticReductionConfig,
  createOverrideRequest,
  createReductionResult,
  createGraduationPath,
  daysToMonths,
  isOverrideActive,
  getParentNotificationMessage,
  getCelebrationMessage,
  getGraduationPathMessage,
  getOverrideExplanation,
  type AutomaticReductionConfig,
  type OverrideRequest,
  type ReductionResult,
  type GraduationPath,
  type OverrideStatus,
  type ReductionType,
  type GraduationStatus,
} from './contracts/automaticReduction'

// Automatic Reduction Service exports (Story 37.4)
export {
  isEligibleForAutomaticReduction,
  getMonthsUntilEligible,
  getEligibilityProgress,
  applyAutomaticReduction,
  shouldApplyReduction,
  requestOverride,
  respondToOverride,
  withdrawOverride,
  isOverrideInEffect,
  updateGraduationProgress,
  pauseGraduationPath,
  resumeGraduationPath,
  regressGraduationPath,
  getReductionStatusMessage,
  getOverrideStatusMessage,
  getEligibilityMessage,
} from './services/automaticReductionService'

// Developmental Messaging exports (Story 37.5)
export {
  MESSAGING_PRINCIPLES,
  APPROVED_LANGUAGE,
  DISCOURAGED_LANGUAGE,
  CHILD_MILESTONE_MESSAGES,
  PARENT_MILESTONE_MESSAGES,
  REDUCTION_MESSAGES,
  RIGHTS_MESSAGES,
  SHAME_REDUCING_MESSAGES,
  messagingContextSchema,
  viewerTypeSchema,
  milestoneTypeSchema,
  developmentalMessageSchema,
  framingValidationResultSchema,
  getMilestoneMessage as getDevelopmentalMilestoneMessage,
  getReductionMessage as getDevelopmentalReductionMessage,
  getRightsMessage,
  getShameReducingMessage as getShameMessage,
  createDevelopmentalMessage,
  type MessagingContext,
  type ViewerType,
  type MilestoneType,
  type DevelopmentalMessage,
  type FramingValidationResult,
} from './contracts/developmentalMessaging'

// Developmental Messaging Service exports (Story 37.5)
export {
  getMilestoneMessage as getMilestoneMessageService,
  getMilestoneHeading,
  getReductionMessage as getReductionMessageService,
  getFullReductionNotification,
  getRegressionMessage as getDevelopmentalRegressionMessage,
  validateDevelopmentalFraming,
  validateChildRightsPrinciples,
  getPrivacyRightsReminder,
  getTemporaryNatureMessage,
  getGrowthRecognitionMessage,
  getShameReducingMessage,
  getShameReducingContext,
  getTrustMilestoneNotification,
  getChildDevelopmentalContext,
  getParentEducationContext,
} from './services/developmentalMessagingService'

// Trust Regression Contracts exports (Story 37.6)
export {
  RegressionStatusSchema,
  TrustRegressionConfigSchema,
  RegressionEventSchema,
  RegressionNotificationSchema as TrustRegressionNotificationSchema,
  ChildExplanationInputSchema,
  ConversationRecordSchema,
  DEFAULT_REGRESSION_CONFIG,
  REGRESSION_MESSAGES,
  createDefaultRegressionConfig,
  createRegressionEvent as createRegressionEventContract,
  validateRegression,
  calculateGraceDaysRemaining,
  isInGracePeriod as isTrustInGracePeriod,
  isConversationRequired as isTrustConversationRequired,
  type RegressionStatus,
  type TrustRegressionConfig,
  type RegressionEvent,
  type RegressionNotification as TrustRegressionNotification,
  type ChildExplanationInput,
  type ConversationRecord,
} from './contracts/trustRegression'

// Trust Regression Service exports (Story 37.6)
export {
  createRegressionEvent as createTrustRegressionEvent,
  getRegressionEventById as getTrustRegressionEventById,
  getRegressionStatus as getTrustRegressionStatus,
  isInGracePeriod as isTrustRegressionInGracePeriod,
  isConversationRequired as isTrustRegressionConversationRequired,
  getGraceDaysRemaining as getTrustGraceDaysRemaining,
  recordChildExplanation,
  markConversationHeld,
  resolveRegression,
  revertMonitoring,
  updateEventStatus as updateTrustEventStatus,
  canChangeMonitoring,
  getRegressionSummary as getTrustRegressionSummary,
  clearAllEvents as clearTrustRegressionEvents,
  getAllEventsForChild as getAllTrustEventsForChild,
} from './services/trustRegressionService'

// Regression Notification Service exports (Story 37.6)
export {
  getChildRegressionNotification,
  getParentRegressionNotification,
  getRegressionNotification,
  getGracePeriodReminder,
  getConversationPrompt,
  getSupportiveFraming,
  getGracePeriodExplanation,
  getExplanationAcknowledgment,
  getConversationCompleteMessage,
  getResolutionOptions,
  validateSupportiveFraming,
  getAllRegressionMessages,
} from './services/regressionNotificationService'

// Graduation Eligibility exports (Story 38.1)
export {
  GRADUATION_TRUST_THRESHOLD,
  GRADUATION_DURATION_MONTHS,
  GraduationEligibilityConfigSchema,
  TrustScoreHistoryEntrySchema as GraduationTrustScoreHistorySchema,
  GraduationEligibilityStatusSchema,
  GraduationMilestoneSchema,
  StreakBreakEventSchema,
  DEFAULT_GRADUATION_CONFIG,
  GRADUATION_MESSAGES,
  createDefaultGraduationConfig,
  createInitialEligibilityStatus,
  calculateProgressPercentage,
  getGraduationMilestones,
  isPerfectTrust,
  validateTrustScoreHistory,
  type GraduationEligibilityConfig,
  type TrustScoreHistoryEntry as GraduationTrustScoreHistoryEntry,
  type GraduationEligibilityStatus,
  type GraduationMilestone,
  type StreakBreakEvent,
} from './contracts/graduationEligibility'

// Graduation Eligibility Service exports (Story 38.1)
export {
  checkGraduationEligibility,
  calculateMonthsAtPerfectTrust,
  projectEligibilityDate,
  checkStreakContinuity,
  getStoredEligibilityStatus,
  recordStreakBreak,
  getStreakBreakHistory,
  isNearGraduation,
  getRemainingMonths,
  isAtPerfectTrust,
  clearAllEligibilityData,
  createMockTrustScoreHistory,
} from './services/graduationEligibilityService'

// Graduation Progress Message Service exports (Story 38.1)
export {
  getChildProgressMessage,
  getParentProgressMessage,
  getMilestoneMessage as getGraduationMilestoneMessage,
  getMotivationalMessage,
  getStreakBreakMessage,
  getEligibilityExplanation,
  getPathOverview,
  formatProgressDisplay,
  getAllGraduationMessages,
} from './services/graduationProgressMessageService'

// Graduation Conversation exports (Story 38.2)
export {
  ACKNOWLEDGMENT_REMINDER_DAYS,
  CONVERSATION_EXPIRY_DAYS,
  MIN_SCHEDULE_LEAD_DAYS,
  conversationStatusSchema,
  conversationOutcomeSchema,
  graduationNotificationTypeSchema,
  acknowledgmentRecordSchema,
  graduationConversationSchema,
  discussionPointSchema,
  resourceSchema,
  conversationTemplateSchema,
  notificationContentSchema,
  createConversationInputSchema,
  recordAcknowledgmentInputSchema,
  scheduleConversationInputSchema,
  completeConversationInputSchema,
  hasAllAcknowledgments,
  isConversationExpired,
  isConversationOverdue,
  shouldSendReminder,
  getConversationDaysUntilExpiry,
  getMissingAcknowledgments,
  createInitialConversation,
  isValidScheduleDate,
  getConversationStatusText,
  getOutcomeText,
  type ConversationStatus,
  type ConversationOutcome,
  type GraduationNotificationType,
  type AcknowledgmentRecord,
  type GraduationConversation,
  type DiscussionPoint,
  type Resource,
  type ConversationTemplate,
  type NotificationContent,
  type CreateConversationInput,
  type RecordAcknowledgmentInput,
  type ScheduleConversationInput,
  type CompleteConversationInput,
} from './contracts/graduationConversation'

// Graduation Conversation Service exports (Story 38.2)
export {
  initiateGraduationConversation,
  recordAcknowledgment,
  checkAllAcknowledged,
  scheduleConversation,
  completeConversation,
  expireConversation,
  recordReminderSent,
  getConversation,
  getConversationsForFamily,
  getConversationsForChild,
  getPendingConversations,
  getActiveConversationForChild,
  getConversationsNeedingReminders,
  getExpiredConversations,
  hasUserAcknowledged,
  getAcknowledgmentStatus,
  clearAllConversationData,
  getConversationStats,
} from './services/graduationConversationService'

// Graduation Notification Service exports (Story 38.2)
export {
  GRADUATION_NOTIFICATION_MESSAGES,
  ACKNOWLEDGMENT_PROMPTS,
  getChildEligibilityNotification,
  getParentEligibilityNotification,
  getChildAcknowledgmentPrompt,
  getParentAcknowledgmentPrompt,
  getAcknowledgmentButtonLabel,
  getReminderNotification,
  getScheduledNotification,
  getOverdueNotification,
  getAcknowledgmentNeededNotification,
  getPendingNotifications,
  getNotificationSummary,
  getCelebratoryMessage,
  getResponsibilityAcknowledgmentMessage,
} from './services/graduationNotificationService'

// Graduation Conversation Template Service exports (Story 38.2)
export {
  DEFAULT_GRADUATION_TEMPLATE,
  getDefaultTemplate,
  getTemplateById,
  getDiscussionPointsForViewer,
  getRequiredDiscussionPoints,
  getOptionalDiscussionPoints,
  getSuggestedQuestions,
  getResources,
  getIntroduction,
  getClosingMessage,
  getDiscussionPointByTopic,
  getDiscussionPointCount,
  getTemplateSummary,
  formatAsChecklist,
  getPrintableTemplate,
} from './services/graduationConversationTemplateService'

// Graduation Process exports (Story 38.3)
export {
  GRADUATION_RETENTION_DAYS,
  MIN_SCHEDULE_DAYS,
  MAX_SCHEDULE_DAYS,
  DECISION_EXPIRY_DAYS,
  graduationTypeSchema,
  accountStatusSchema,
  dataTypeSchema,
  deletionStatusSchema,
  confirmationRecordSchema,
  graduationDecisionSchema,
  graduationCertificateSchema,
  previousAccountDataSchema,
  alumniRecordSchema,
  deletionQueueEntrySchema,
  alumniPreferencesSchema,
  createInitialGraduationDecision,
  hasAllConfirmations,
  resolveGraduationType,
  isValidScheduledDate,
  calculateDeletionDate as calculateGraduationDeletionDate,
  getDecisionDaysUntilExpiry,
  isDecisionExpired,
  type GraduationType,
  type AccountStatus,
  type DataType,
  type DeletionStatus,
  type ConfirmationRecord,
  type GraduationDecision,
  type GraduationCertificate,
  type PreviousAccountData,
  type AlumniRecord,
  type DeletionQueueEntry,
  type AlumniPreferences,
} from './contracts/graduationProcess'

// Graduation Process Service exports (Story 38.3)
export {
  initiateGraduationDecision,
  recordGraduationConfirmation,
  checkAllConfirmations,
  scheduleGraduation,
  executeGraduation,
  getGraduationDecision,
  getPendingDecisions as getPendingGraduationDecisions,
  getDecisionsForChild,
  getDecisionsForFamily,
  getExpiredDecisions,
  markDecisionProcessing,
  markDecisionCompleted,
  expireDecision,
  clearAllDecisionData as clearAllGraduationData,
  getDecisionStats,
  type InitiateDecisionInput,
  type RecordConfirmationInput,
  type ScheduleGraduationInput,
  type GraduationResult,
} from './services/graduationProcessService'

// Alumni Transition Service exports (Story 38.3)
export {
  transitionToAlumni,
  getAlumniRecord,
  isAlumni,
  getAlumniStatusInfo,
  updateAlumniPreferences,
  getDefaultAlumniPreferences,
  getAllAlumni,
  clearAllAlumniData,
  type TransitionData,
  type AlumniStatusInfo,
} from './services/alumniTransitionService'

// Data Deletion Queue Service exports (Story 38.3)
export {
  DELETION_DATA_TYPES,
  queueDataForDeletion,
  getDeletionQueueStatus,
  getPendingDeletionTypes,
  calculateDeletionDate as calculateDataDeletionDate,
  getDeletionConfirmationMessage,
  processReadyDeletions,
  cancelPendingDeletion,
  markDeletionComplete,
  markDeletionFailed,
  getReadyForDeletion,
  clearAllDeletionData,
  getDeletionStats,
  type ProcessingResult,
} from './services/dataDeletionQueueService'

// Graduation Certificate Service exports (Story 38.3)
export {
  generateCertificate,
  getCertificate,
  getCertificateDisplayData,
  getCertificateForChild,
  validateCertificate,
  getAllCertificates,
  clearAllCertificateData,
  type GenerateCertificateData,
  type CertificateDisplayData,
} from './services/graduationCertificateService'

// Graduation Celebration Service exports (Story 38.3)
export {
  CELEBRATION_MESSAGES,
  getCelebrationMessage as getGraduationCelebrationMessage,
  getAchievementSummary,
  getTransitionMessage as getGraduationTransitionMessage,
  getNextStepsMessage,
  getCertificateCongratulations,
  getFullCelebrationContent,
  type CertificateContent,
  type FullCelebrationContent,
  type FullCelebrationInput,
} from './services/graduationCelebrationService'

// Proportionality Check exports (Story 38.4)
export {
  PROPORTIONALITY_CHECK_INTERVAL_MONTHS,
  CHECK_EXPIRY_DAYS,
  REMINDER_AFTER_DAYS,
  checkTriggerSchema,
  checkStatusSchema,
  responseChoiceSchema,
  riskChangeSchema,
  disagreementTypeSchema,
  suggestionTypeSchema,
  suggestionPrioritySchema,
  proportionalityCheckSchema,
  proportionalityResponseSchema,
  proportionalitySuggestionSchema,
  parentResponseRecordSchema,
  disagreementRecordSchema,
  calculateCheckExpiryDate,
  calculateReminderDate,
  isCheckExpired,
  isCheckDueForReminder,
  createInitialCheck,
  type CheckTrigger,
  type CheckStatus,
  type ResponseChoice,
  type RiskChange,
  type DisagreementType,
  type SuggestionType,
  type SuggestionPriority,
  type ProportionalityCheck,
  type ProportionalityResponse,
  type ProportionalitySuggestion,
  type ParentResponseRecord,
  type DisagreementRecord,
} from './contracts/proportionalityCheck'

// Proportionality Check Service exports (Story 38.4)
export {
  isEligibleForProportionalityCheck,
  getMonitoringDurationMonths,
  isCheckOverdue,
  createProportionalityCheck,
  expireOverdueChecks,
  getActiveCheckForChild,
  getPendingChecksForFamily,
  getCheckHistory,
  getCheckById,
  markCheckInProgress,
  markCheckCompleted,
  clearAllCheckData,
  getCheckStats,
} from './services/proportionalityCheckService'

// Proportionality Response Service exports (Story 38.4)
export {
  submitResponse as submitProportionalityResponse,
  getResponseById as getProportionalityResponseById,
  getResponsesForCheck,
  hasRespondedToCheck,
  hasAllPartiesResponded,
  getResponseSummary,
  canViewResponse,
  clearAllResponseData,
  type SubmitResponseInput,
  type ResponseSummary,
} from './services/proportionalityResponseService'

// Proportionality Suggestion Service exports (Story 38.4)
export {
  SUGGESTION_TEMPLATES,
  calculateSuggestionPriority,
  generateSuggestions,
  getPrimarySuggestion,
  getSuggestionDisplayText,
  type GenerateSuggestionsInput,
} from './services/proportionalitySuggestionService'

// Proportionality Disagreement Service exports (Story 38.4)
export {
  categorizeDisagreement,
  detectDisagreement,
  createDisagreementRecord,
  getUnresolvedDisagreements,
  markDisagreementResolved,
  getDisagreementById,
  getDisagreementsForCheck,
  clearAllDisagreementData,
} from './services/proportionalityDisagreementService'

// Age 18 Deletion Contracts exports (Story 38.5)
export {
  AGE_18_IN_YEARS,
  DELETION_CHECK_INTERVAL,
  PRE_DELETION_NOTICE_DAYS,
  MIN_CHILD_AGE_YEARS,
  MAX_BIRTHDATE_AGE_YEARS,
  ALL_DELETION_DATA_TYPES,
  deletionDataTypeSchema,
  deletionStatusSchema as age18DeletionStatusSchema,
  notificationTypeSchema as age18NotificationTypeSchema,
  childBirthdateSchema,
  age18DeletionRecordSchema,
  age18DeletionNotificationSchema,
  createChildBirthdate,
  createAge18DeletionRecord,
  isValidBirthdateForStorage,
  type DeletionDataType,
  type DeletionStatus as Age18DeletionStatus,
  type NotificationType as Age18NotificationType,
  type ChildBirthdate,
  type Age18DeletionRecord,
  type Age18DeletionNotification,
} from './contracts/age18Deletion'

// Birthdate Service exports (Story 38.5)
export {
  setBirthdate,
  getBirthdate,
  updateBirthdate,
  calculateAge,
  getAgeInYearsAndMonths,
  is18OrOlder,
  getDaysUntil18,
  get18thBirthdayDate,
  isValidBirthdate,
  getAllBirthdates,
  clearAllBirthdateData,
} from './services/birthdateService'

// Age 18 Deletion Service exports (Story 38.5)
export {
  getChildrenTurning18Today,
  getChildrenTurning18InDays,
  getChildrenWithBirthdateToday,
  executeAge18Deletion,
  deleteAllChildData,
  markDeletionComplete as markAge18DeletionComplete,
  markDeletionFailed as markAge18DeletionFailed,
  markDeletionProcessing as markAge18DeletionProcessing,
  getDeletionRecord as getAge18DeletionRecord,
  getAge18DeletionHistory,
  getPendingDeletions as getPendingAge18Deletions,
  getFailedDeletions as getFailedAge18Deletions,
  clearAllAge18DeletionData,
  type ChildTurning18,
  type DeletionResult,
} from './services/age18DeletionService'

// Age 18 Notification Service exports (Story 38.5)
export {
  getAge18DeletionMessage,
  getPreDeletionMessage,
  getAge18DeletionMessageForViewer,
  getPreDeletionMessageForViewer,
  sendDeletionCompleteNotification,
  sendPreDeletionNotification,
  getNotificationsForChild as getAge18NotificationsForChild,
  getNotificationById as getAge18NotificationById,
  getUnacknowledgedNotifications as getUnacknowledgedAge18Notifications,
  markNotificationAcknowledged as markAge18NotificationAcknowledged,
  clearAllNotificationData as clearAllAge18NotificationData,
  type ViewerType as Age18ViewerType,
} from './services/age18NotificationService'

// Age 18 Deletion Scheduler exports (Story 38.5)
export {
  executeDailyAge18Check,
  sendPreDeletionNotifications,
  retryFailedDeletions,
  getLastSchedulerRun,
  getSchedulerStats,
  clearSchedulerData,
  type DailyCheckResult,
  type RetryResult,
  type SchedulerStats,
  type LastRunInfo,
} from './services/age18DeletionScheduler'

// Pre-18 Data Export contracts (Story 38.6)
export {
  pre18ExportRequestSchema,
  pre18ExportContentSchema,
  sanitizedActivitySummarySchema,
  screenTimeSummarySchema,
  agreementSummarySchema,
  exportWatermarkSchema,
  exportRequestStatusSchema,
  EXPORT_REQUEST_VALID_DAYS,
  EXPORT_URL_VALID_HOURS,
  PRE18_EXPORT_PURPOSE,
  createExportRequest as createExportRequestBase,
  createExportWatermark,
  isValidExportRequest,
  canProcessExport,
  isValidExportContent,
  type Pre18ExportRequest,
  type Pre18ExportContent,
  type SanitizedActivitySummary,
  type ScreenTimeSummary,
  type AgreementSummary,
  type ExportWatermark,
  type ExportRequestStatus,
} from './contracts/pre18DataExport'

// Pre18 Export Consent Service exports (Story 38.6)
export {
  requestExportConsent,
  getConsentRequest,
  grantExportConsent,
  denyExportConsent,
  hasChildConsented,
  isConsentPending,
  getConsentRequestsForChild,
  isConsentExpired,
  cleanupExpiredConsents,
  clearAllConsentData,
  getConsentStoreSize,
} from './services/pre18ExportConsentService'

// Pre18 Data Export Service exports (Story 38.6)
export {
  createExportRequest,
  getExportStatus,
  generateExport,
  sanitizeActivityLogs,
  sanitizeScreenTime,
  sanitizeAgreements,
  filterConcerningContent,
  addExportWatermark,
  validateWatermark,
  getExportUrl,
  isExportAvailable,
  markExportComplete,
  clearAllExportData,
  getExportContent,
} from './services/pre18DataExportService'

// Pre18 Export Notification Service exports (Story 38.6)
export {
  sendPre18ExportAvailableNotification,
  sendExportConsentRequestNotification,
  sendExportReadyNotification,
  sendConsentRequestToChild,
  sendExportCompletedToChild,
  getPre18ExportMessage,
  getConsentRequestMessage,
  getNotificationsForParent,
  getNotificationsForChild,
  clearAllNotificationData as clearAllPre18NotificationData,
  getNotificationCount as getPre18NotificationCount,
  type Pre18ExportNotification,
} from './services/pre18ExportNotificationService'

// Pre18 Export Eligibility Service exports (Story 38.6)
export {
  isEligibleForPre18Export,
  getExportEligibilityWindow,
  getChildrenEligibleForExport,
  getDaysUntilDataDeletion,
  isInExportWindow,
  setChildBirthdateForTest,
  clearEligibilityTestData,
  getTestStoreSize,
  type ChildEligibility,
  type ExportEligibilityWindow,
} from './services/pre18ExportEligibilityService'

// Post-Graduation Support Contracts exports (Story 38.7)
export {
  ALUMNI_STATUS,
  WELLNESS_TIP_CATEGORIES,
  PARENT_RESOURCE_CATEGORIES,
  alumniStatusSchema,
  alumniProfileSchema,
  digitalWellnessTipSchema,
  selfTrackingPreferencesSchema,
  parentResourceSchema,
  graduationCelebrationSchema,
  createAlumniProfileContract,
  createWellnessTip,
  createParentResource,
  createSelfTrackingPreferences,
  createGraduationCelebration,
  isAlumniEligibleForRejoin,
  validateSelfTrackingPrivacy,
  isValidAlumniProfile,
  type AlumniStatus,
  type AlumniProfile,
  type DigitalWellnessTip,
  type SelfTrackingPreferences,
  type ParentResource,
  type GraduationCelebration,
  type WellnessTipCategory,
  type ParentResourceCategory,
} from './contracts'

// Alumni Profile Service exports (Story 38.7)
export {
  createAlumniProfile as createAlumniProfileService,
  getAlumniProfile as getAlumniProfileService,
  getAlumniByFamily,
  updateAlumniPreferences as updateAlumniPreferencesService,
  preserveAlumniStatus,
  checkRejoinEligibility,
  processRejoin,
  verifyNoDataCollection,
  deactivateAlumniProfile,
  clearAllAlumniData as clearAllAlumniServiceData,
  getAlumniCount,
} from './services/alumniProfileService'

// Digital Wellness Tip Service exports (Story 38.7)
export {
  getWellnessTips,
  getTipsByCategory,
  getTipOfTheDay,
  getActiveTips,
  saveTipPreference,
  getDismissedTips,
  dismissTip,
  initializeDefaultTips,
  clearAllTipData,
  getTipCount,
} from './services/digitalWellnessTipService'

// Self-Tracking Service exports (Story 38.7)
export {
  createSelfTrackingSession,
  getSelfTrackingSession,
  logPersonalGoal,
  getGoals,
  updateGoalProgress,
  getProgressSummary,
  verifyLocalDataOnly,
  deleteSelfTrackingData,
  clearAllSelfTrackingData,
  type PersonalGoal,
  type ProgressSummary,
} from './services/selfTrackingService'

// Parent Resource Service exports (Story 38.7)
export {
  getParentResources,
  getResourcesByCategory as getParentResourcesByCategory,
  getResourceById,
  markResourceRead,
  getReadResources,
  initializeDefaultResources,
  clearAllResourceData,
  getResourceCount,
} from './services/parentResourceService'

// Safety Signal Service exports (Story 7.5.1)
export {
  createSafetySignal as createSafetySignalWithQueue,
  queueOfflineSignal,
  processOfflineQueue,
  getOfflineQueueCount,
  getOfflineQueueEntries,
  getPendingSignals,
  getSignalById,
  getSignalsByChildId,
  getSignalsByStatus,
  updateSignalStatus,
  markSignalDelivered,
  markSignalAcknowledged,
  incrementRetryCount,
  getFailedOfflineEntries,
  clearAllSignalData,
  getSignalCount,
  getOfflineQueueSize,
} from './services/safetySignalService'

// Crisis Partner exports (Story 7.5.2)
export {
  // Constants
  PARTNER_CAPABILITY,
  FAMILY_STRUCTURE,
  ROUTING_STATUS,
  // Schemas
  partnerCapabilitySchema,
  familyStructureSchema,
  routingStatusSchema,
  crisisPartnerSchema,
  signalRoutingPayloadSchema,
  signalRoutingResultSchema,
  blackoutRecordSchema,
  // Factory functions
  generatePartnerId,
  generateRoutingResultId,
  generateBlackoutId,
  createCrisisPartner,
  createSignalRoutingPayload,
  createSignalRoutingResult,
  createBlackoutRecord,
  // Validation functions
  validateCrisisPartner,
  validateSignalRoutingPayload,
  validateSignalRoutingResult,
  isCrisisPartner,
  isSignalRoutingPayload,
  // Utility functions
  calculateChildAge,
  isValidJurisdiction,
  partnerSupportsJurisdiction,
  // Types
  type PartnerCapability,
  type FamilyStructure,
  type RoutingStatus,
  type CrisisPartner,
  type SignalRoutingPayload,
  type SignalRoutingResult,
  type BlackoutRecord,
} from './contracts'

// Signal Routing Service exports (Story 7.5.2)
export {
  buildRoutingPayload,
  selectPartnerForJurisdiction,
  routeSignalToPartner,
  getPartnerById,
  getActivePartners,
  getPartnersForJurisdiction,
  getRoutingResult,
  getRoutingHistory,
  updateRoutingResult,
  markRoutingAcknowledged,
  markRoutingFailed,
  addPartnerToStore,
  clearAllRoutingData,
  getRoutingResultCount,
  getPartnerCount,
} from './services/signalRoutingService'

// Signal Blackout Service exports (Story 7.5.2 Task 6)
export {
  isSignalInBlackout,
  startBlackoutPeriod,
  extendBlackoutPeriod,
  getBlackoutStatus,
  cancelBlackout,
  getActiveBlackouts,
  cleanupExpiredBlackouts,
  DEFAULT_BLACKOUT_HOURS,
  MAX_EXTENSION_HOURS,
  type BlackoutStatus,
  type BlackoutStore,
} from './services/signalBlackoutService'

// Signal Confirmation exports (Story 7.5.3)
export {
  // Constants
  RESOURCE_TYPE,
  CONFIRMATION_EVENT_TYPE,
  CONFIRMATION_DEFAULTS,
  // Schemas (renamed to avoid conflict with crisis-urls exports)
  resourceTypeSchema,
  confirmationEventTypeSchema,
  crisisResourceSchema as signalCrisisResourceSchema,
  signalConfirmationSchema,
  confirmationContentSchema,
  confirmationDisplayEventSchema,
  // ID Generators
  generateResourceId,
  generateConfirmationId,
  generateDisplayEventId,
  // Factory Functions
  createCrisisResource as createSignalCrisisResource,
  createSignalConfirmation,
  createConfirmationContent,
  createConfirmationDisplayEvent,
  createDefaultUSResources,
  createDefaultUKResources,
  createDefaultCAResources,
  createDefaultAUResources,
  // Validation Functions
  validateCrisisResource as validateSignalCrisisResource,
  validateSignalConfirmation,
  validateConfirmationContent,
  isCrisisResource as isSignalCrisisResource,
  isSignalConfirmation,
  // Utility Functions
  validateReadingLevel,
  getResourcesByType,
  getResourcesByJurisdiction,
  sortResourcesByPriority,
  filterChatResources,
  // Types (use alias to avoid conflict with crisis-urls CrisisResource)
  type ResourceType,
  type ConfirmationEventType,
  type SignalCrisisResource,
  type SignalConfirmation,
  type ConfirmationContent,
  type ConfirmationDisplayEvent,
} from './contracts'

// Crisis Resource Service exports (Story 7.5.3 Task 2)
export {
  // Resource management
  getResourcesForJurisdiction,
  getUniversalResources,
  getChatResources,
  isChatAvailable,
  getEmergencyNumber,
  getAllCrisisResources,
  getResourceById as getCrisisResourceById,
  addResourceToCache,
  clearResourceCache,
  // Cache management
  getCachedResources,
  setCachedResources,
  isCacheValid,
  refreshResourceCache,
  getCacheExpiryTime,
  CACHE_EXPIRY_MS,
  // Prioritization
  getPrioritizedResources,
  getTopNResources,
  // Types
  type ResourceCache,
} from './services/crisisResourceService'

// Confirmation Content Service exports (Story 7.5.3 Task 3)
export {
  // Content generation
  getConfirmationContent,
  getAgeAdjustedContent,
  getOfflineConfirmationContent,
  getJurisdictionContent,
  // Reading level validation
  validateReadingLevel as validateContentReadingLevel,
  calculateReadingLevel,
  isChildAppropriate,
  containsScaryTerminology,
  // Language customization
  getLocalizedEmergencyText,
  getChildFriendlyText,
  simplifyText,
  // Constants
  DEFAULT_CONTENT,
  AGE_BRACKETS,
  SCARY_TERMS,
  GRADE_LEVEL_THRESHOLDS,
  // Types
  type ContentLocale,
  type AgeAdjustedContent,
} from './services/confirmationContentService'

// Offline Confirmation Service exports (Story 7.5.3 Task 7)
export {
  // Offline confirmation
  getOfflineConfirmation,
  shouldShowResourcesOffline,
  // Resource caching
  getCachedResourcesOffline,
  cacheResourcesForOffline,
  clearOfflineCache,
  isOfflineCacheValid,
  getOfflineCacheStatus,
  // Sync functions
  syncOfflineConfirmations,
  getPendingConfirmations,
  markConfirmationSynced,
  // Queue management
  queueConfirmationForSync,
  getQueuedConfirmationsCount,
  clearSyncQueue,
  // Types
  type OfflineCacheStatus,
  type PendingConfirmation,
  type SyncResult,
  type SyncFunction,
} from './services/offlineConfirmationService'

// Confirmation Analytics Service exports (Story 7.5.3 Task 8)
export {
  // Tracking functions
  trackConfirmationDisplayed,
  trackResourceClicked,
  trackChatInitiated,
  trackConfirmationDismissed,
  // Analytics retrieval
  getAnalyticsData,
  getResourceClickStats,
  getDisplayStats,
  // Reporting
  generateAnonymousReport,
  generateJurisdictionReport,
  // Analytics management
  clearAnalyticsData,
  getAnalyticsCount,
  // Types
  type AnalyticsEventType,
  type AgeGroup as AnalyticsAgeGroup,
  type ResourceType as AnalyticsResourceType,
  type ConfirmationAnalyticsEvent,
  type ResourceClickStats,
  type DisplayStats,
  type AnalyticsReport,
  type JurisdictionReport,
} from './services/confirmationAnalyticsService'

// Rejection Pattern Service exports (Story 34.5.1)
export {
  // Constants
  REJECTION_PATTERNS_COLLECTION,
  REJECTION_EVENTS_COLLECTION,
  ESCALATION_EVENTS_COLLECTION,
  REJECTION_WINDOW_DAYS,
  REJECTION_THRESHOLD,
  // Functions
  recordRejection,
  calculateRejectionsInWindow,
  checkEscalationThreshold,
  getRejectionPattern,
  triggerEscalation,
  incrementProposalCount,
  // Types
  type RejectionPattern,
  type RejectionEvent,
  type EscalationEvent,
} from './services/rejectionPatternService'

// Location Zone exports (Story 40.2)
export {
  // Constants
  DEFAULT_GEOFENCE_RADIUS_METERS,
  MIN_GEOFENCE_RADIUS_METERS,
  MAX_GEOFENCE_RADIUS_METERS,
  // Schemas
  locationZoneTypeSchema,
  locationZoneSchema,
  createLocationZoneInputSchema,
  updateLocationZoneInputSchema,
  deleteLocationZoneInputSchema,
  createLocationZoneResponseSchema,
  updateLocationZoneResponseSchema,
  deleteLocationZoneResponseSchema,
  // Types
  type LocationZoneType,
  type LocationZone,
  type CreateLocationZoneInput,
  type UpdateLocationZoneInput,
  type DeleteLocationZoneInput,
  type CreateLocationZoneResponse,
  type UpdateLocationZoneResponse,
  type DeleteLocationZoneResponse,
} from './contracts'

// Location Rule exports (Story 40.2)
export {
  // Schemas
  categoryOverrideValueSchema,
  categoryOverridesSchema,
  locationRuleSchema,
  setLocationRuleInputSchema,
  deleteLocationRuleInputSchema,
  setLocationRuleResponseSchema,
  deleteLocationRuleResponseSchema,
  // Types
  type CategoryOverrideValue,
  type CategoryOverrides,
  type LocationRule,
  type SetLocationRuleInput,
  type DeleteLocationRuleInput,
  type SetLocationRuleResponse,
  type DeleteLocationRuleResponse,
} from './contracts'

// Safe Escape exports (Story 40.3)
export {
  // Constants
  SAFE_ESCAPE_SILENT_PERIOD_MS,
  SAFE_ESCAPE_SILENT_PERIOD_HOURS,
  SAFE_ESCAPE_NOTIFICATION_MESSAGE,
  SAFE_ESCAPE_CHILD_MESSAGES,
  SAFE_ESCAPE_ADULT_MESSAGES,
  // Schemas
  safeEscapeActivationSchema,
  activateSafeEscapeInputSchema,
  activateSafeEscapeResponseSchema,
  reenableSafeEscapeInputSchema,
  reenableSafeEscapeResponseSchema,
  safeEscapeStatusSchema,
  // Utilities
  calculateHoursUntilNotification,
  shouldSendNotification,
  // Types
  type SafeEscapeActivation,
  type ActivateSafeEscapeInput,
  type ActivateSafeEscapeResponse,
  type ReenableSafeEscapeInput,
  type ReenableSafeEscapeResponse,
  type SafeEscapeStatus,
} from './contracts'

// Location Transition exports (Story 40.4)
export {
  // Constants
  LOCATION_TRANSITION_GRACE_PERIOD_MS,
  LOCATION_TRANSITION_GRACE_PERIOD_SECONDS,
  LOCATION_UPDATE_MIN_INTERVAL_MS,
  LOCATION_MAX_ACCURACY_METERS,
  TRANSITION_CHILD_MESSAGES,
  TRANSITION_ADULT_MESSAGES,
  // Schemas
  appliedRulesSchema,
  locationTransitionSchema,
  deviceLocationSchema,
  locationUpdateInputSchema,
  locationUpdateResponseSchema,
  getLocationTransitionsInputSchema,
  getLocationTransitionsResponseSchema,
  // Utilities
  calculateDistanceMeters,
  isWithinZone,
  calculateGracePeriodMinutes,
  isGracePeriodExpired,
  // Types
  type AppliedRules,
  type LocationTransition,
  type DeviceLocation,
  type LocationUpdateInput,
  type LocationUpdateResponse,
  type GetLocationTransitionsInput,
  type GetLocationTransitionsResponse,
} from './contracts'

// Location Privacy exports (Story 40.5)
export {
  // Schemas
  childLocationStatusSchema,
  locationDisableRequestSchema,
  locationDisableRequestStatusSchema,
  requestLocationDisableInputSchema,
  getChildLocationStatusInputSchema,
  getChildLocationHistoryInputSchema,
  childLocationHistoryItemSchema,
  getChildLocationHistoryResponseSchema,
  // Messages
  LOCATION_PRIVACY_MESSAGES,
  LOCATION_DISABLE_REQUEST_MESSAGES,
  // Utilities
  formatTimeDescription,
  calculateDurationMinutes,
  // Types
  type ChildLocationStatus,
  type LocationDisableRequest,
  type LocationDisableRequestStatus,
  type RequestLocationDisableInput,
  type GetChildLocationStatusInput,
  type GetChildLocationHistoryInput,
  type ChildLocationHistoryItem,
  type GetChildLocationHistoryResponse,
} from './contracts'

// Location Abuse Prevention exports (Story 40.6)
export {
  // Constants
  LOCATION_ABUSE_THRESHOLDS,
  LOCATION_ABUSE_RESOURCES,
  LOCATION_ABUSE_MESSAGES,
  // Schemas
  locationAbusePatternTypeSchema,
  locationAccessTypeSchema,
  locationAccessLogSchema,
  trackLocationAccessInputSchema,
  asymmetricCheckMetadataSchema,
  frequentRuleChangeMetadataSchema,
  crossCustodyRestrictionMetadataSchema,
  locationAbuseMetadataSchema,
  locationAbusePatternSchema,
  locationAbuseAlertSchema,
  sendLocationAbuseAlertInputSchema,
  locationAbuseAlertResponseSchema,
  locationAutoDisableSchema,
  guardianAccessCountSchema,
  asymmetryResultSchema,
  // Types
  type LocationAbusePatternType,
  type LocationAccessType,
  type LocationAccessLog,
  type TrackLocationAccessInput,
  type AsymmetricCheckMetadata,
  type FrequentRuleChangeMetadata,
  type CrossCustodyRestrictionMetadata,
  type LocationAbuseMetadata,
  type LocationAbusePattern,
  type LocationAbuseAlert,
  type SendLocationAbuseAlertInput,
  type LocationAbuseAlertResponse,
  type LocationAutoDisable,
  type GuardianAccessCount,
  type AsymmetryResult,
  // Story 41.1: Parent Notification Preferences
  NOTIFICATION_DEFAULTS,
  QUIET_HOURS_DEFAULTS,
  SYNC_THRESHOLD_OPTIONS,
  MEDIUM_FLAGS_MODE_OPTIONS,
  mediumFlagsModeSchema,
  syncThresholdHoursSchema,
  parentNotificationPreferencesSchema,
  notificationPreferencesUpdateSchema,
  getNotificationPreferencesInputSchema,
  updateNotificationPreferencesInputSchema,
  createDefaultNotificationPreferences,
  applyPreferencesUpdate,
  isInQuietHours,
  shouldSendNotificationByPrefs,
  getPreferencesDescription,
  type ParentNotificationPreferences,
  type NotificationPreferencesUpdate,
  type GetNotificationPreferencesInput,
  type UpdateNotificationPreferencesInput,
  type MediumFlagsMode,
  type SyncThresholdHours,
} from './contracts'

// Story 41.3: Time Limit Notifications
export {
  // Schemas
  timeLimitNotificationTypeSchema,
  limitTypeSchema,
  timeLimitNotificationEventSchema,
  timeLimitNotificationContentSchema,
  childTimeLimitNotificationPreferencesSchema,
  extensionRequestNotificationParamsSchema,
  timeLimitWarningParamsSchema,
  limitReachedParamsSchema,
  // Helper functions
  buildParentWarningContent,
  buildParentLimitReachedContent,
  buildExtensionRequestContent,
  buildChildWarningContent,
  buildChildLimitReachedContent,
  formatMinutes,
  // Types
  type TimeLimitNotificationType,
  type LimitType,
  type TimeLimitNotificationEvent,
  type TimeLimitNotificationContent,
  type ChildTimeLimitNotificationPreferences,
  type ExtensionRequestNotificationParams,
  type TimeLimitWarningParams,
  type LimitReachedParams,
} from './contracts'
