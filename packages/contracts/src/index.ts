// User Schemas (Story 1.2)
export {
  // Schemas
  userSchema,
  createUserInputSchema,
  userFirestoreSchema,
  userRoleSchema,
  // Helper functions
  convertFirestoreToUser,
  validateCreateUserInput,
  safeParseUser,
  // Types
  type User,
  type CreateUserInput,
  type UserFirestore,
  type UserRole,
} from './user.schema'

// Family Schemas (Story 2.1)
export {
  // Schemas
  familySchema,
  familyFirestoreSchema,
  familyGuardianSchema,
  familyGuardianFirestoreSchema,
  guardianRoleSchema,
  guardianPermissionSchema,
  guardianAddedViaSchema,
  createFamilyInputSchema,
  // Helper functions
  convertFirestoreToFamily,
  validateCreateFamilyInput,
  safeParseFamily,
  isGuardianInFamily,
  getGuardianRole,
  getGuardianPermissions,
  hasFullPermissions,
  // Story 3.6: Legal Parent Petition helper functions
  getGuardianAddedVia,
  canRevokeGuardian,
  isCourtOrderedGuardian,
  // Types
  type Family,
  type FamilyFirestore,
  type FamilyGuardian,
  type FamilyGuardianFirestore,
  type GuardianRole,
  type GuardianPermission,
  type GuardianAddedVia,
  type CreateFamilyInput,
} from './family.schema'

// Safety Request Schemas
export {
  safetyRequestSourceSchema,
  safetyRequestStatusSchema,
  safetyRequestInputSchema,
  safetyRequestSchema,
  safetyRequestResponseSchema,
  DEFAULT_RETENTION_YEARS,
  type SafetyRequestSource,
  type SafetyRequestStatus,
  type SafetyRequestInput,
  type SafetyRequest,
  type SafetyRequestResponse,
} from './safety-request.schema'

// Child Profile Schemas (Story 2.2, 2.6)
export {
  // Schemas
  childProfileSchema,
  childProfileFirestoreSchema,
  childGuardianSchema,
  childGuardianFirestoreSchema,
  childGuardianPermissionSchema,
  createChildInputSchema,
  updateChildInputSchema,
  // Story 2.6: Remove Child schemas
  removeChildConfirmationSchema,
  childRemovalAuditMetadataSchema,
  // Helper functions
  convertFirestoreToChildProfile,
  validateCreateChildInput,
  safeParseChildProfile,
  calculateAge,
  isGuardianForChild,
  getChildGuardianPermissions,
  hasFullChildPermissions,
  getChildDisplayName,
  getChildFullName,
  getAgeCategory,
  hasCustodyDeclaration,
  canStartMonitoring,
  // Story 2.6: Remove Child helpers
  validateRemoveChildConfirmation,
  safeParseRemoveChildConfirmation,
  isConfirmationTextValid,
  getChildRemovalErrorMessage,
  // Constants
  CHILD_REMOVAL_ERROR_MESSAGES,
  // Types
  type ChildProfile,
  type ChildProfileFirestore,
  type ChildGuardian,
  type ChildGuardianFirestore,
  type ChildGuardianPermission,
  type CreateChildInput,
  type UpdateChildInput,
  // Story 2.6: Remove Child types
  type RemoveChildConfirmation,
  type ChildRemovalAuditMetadata,
} from './child.schema'

// Custody Declaration Schemas (Story 2.3)
export {
  // Schemas
  custodyTypeSchema,
  custodyDeclarationSchema,
  custodyDeclarationFirestoreSchema,
  custodyHistoryEntrySchema,
  custodyHistoryEntryFirestoreSchema,
  createCustodyDeclarationInputSchema,
  updateCustodyDeclarationInputSchema,
  // Constants
  CUSTODY_TYPE_LABELS,
  CUSTODY_ERROR_MESSAGES,
  // Helper functions
  convertFirestoreToCustodyDeclaration,
  convertFirestoreToCustodyHistoryEntry,
  validateCreateCustodyDeclarationInput,
  safeParseCustodyDeclaration,
  requiresSharedCustodySafeguards,
  getCustodyErrorMessage,
  getCustodyTypeLabel,
  hasXssDangerousChars,
  // Types
  type CustodyType,
  type CustodyDeclaration,
  type CustodyDeclarationFirestore,
  type CustodyHistoryEntry,
  type CustodyHistoryEntryFirestore,
  type CreateCustodyDeclarationInput,
  type UpdateCustodyDeclarationInput,
} from './custody.schema'

// Audit Schemas (Story 2.5)
export {
  // Schemas
  auditActionTypeSchema,
  auditEntityTypeSchema,
  profileFieldChangeSchema,
  familyAuditEntrySchema,
  familyAuditEntryFirestoreSchema,
  createAuditEntryInputSchema,
  // Helper functions
  convertFirestoreToAuditEntry,
  safeParseAuditEntry,
  getAuditActionLabel,
  buildChangesArray,
  // Constants
  AUDIT_ACTION_LABELS,
  // Types
  type AuditActionType,
  type AuditEntityType,
  type ProfileFieldChange,
  type FamilyAuditEntry,
  type FamilyAuditEntryFirestore,
  type CreateAuditEntryInput,
} from './audit.schema'

// Dissolution Schemas (Story 2.7)
export {
  // Schemas
  dataHandlingOptionSchema,
  dissolutionStatusSchema,
  dissolutionAcknowledgmentSchema,
  dissolutionAcknowledgmentFirestoreSchema,
  familyDissolutionSchema,
  familyDissolutionFirestoreSchema,
  initiateDissolutionInputSchema,
  acknowledgeDissolutionInputSchema,
  cancelDissolutionInputSchema,
  dissolutionAuditMetadataSchema,
  // Helper functions
  getDissolutionErrorMessage,
  getDataHandlingOptionLabel,
  getDataHandlingOptionDescription,
  getDissolutionStatusLabel,
  convertFirestoreToDissolution,
  safeParseDissolution,
  validateInitiateDissolutionInput,
  safeParseInitiateDissolutionInput,
  calculateScheduledDeletionDate,
  calculateDaysRemaining,
  canCancelDissolution,
  needsAcknowledgment,
  getPendingAcknowledgments,
  allGuardiansAcknowledged,
  // Constants
  COOLING_PERIOD_DAYS,
  EXTENDED_RETENTION_DAYS,
  ACKNOWLEDGMENT_TIMEOUT_DAYS,
  REMINDER_START_DAYS,
  DISSOLUTION_ERROR_MESSAGES,
  DATA_HANDLING_OPTION_LABELS,
  DATA_HANDLING_OPTION_DESCRIPTIONS,
  DISSOLUTION_STATUS_LABELS,
  // Types
  type DataHandlingOption,
  type DissolutionStatus,
  type DissolutionAcknowledgment,
  type DissolutionAcknowledgmentFirestore,
  type FamilyDissolution,
  type FamilyDissolutionFirestore,
  type InitiateDissolutionInput,
  type AcknowledgeDissolutionInput,
  type CancelDissolutionInput,
  type DissolutionAuditMetadata,
} from './dissolution.schema'

// Self-Removal Schemas (Story 2.8)
export {
  // Schemas
  sealedAuditActionSchema,
  sealedAuditEntrySchema,
  sealedAuditEntryFirestoreSchema,
  createSealedAuditInputSchema,
  selfRemovalConfirmationSchema,
  selfRemovalResultSchema,
  selfRemovalResultFirestoreSchema,
  // Helper functions
  getSelfRemovalErrorMessage,
  convertFirestoreToSealedAuditEntry,
  safeParseSealedAuditEntry,
  validateSelfRemovalConfirmation,
  safeParseSelfRemovalConfirmation,
  safeParseSelfRemovalResult,
  convertFirestoreToSelfRemovalResult,
  isReauthError,
  // Classes
  SelfRemovalError,
  // Constants
  SELF_REMOVAL_ERROR_MESSAGES,
  // Types
  type SealedAuditAction,
  type SealedAuditEntry,
  type SealedAuditEntryFirestore,
  type CreateSealedAuditInput,
  type SelfRemovalConfirmation,
  type SelfRemovalResult,
  type SelfRemovalResultFirestore,
} from './selfRemoval.schema'

// Invitation Schemas (Story 3.1, 3.2, 3.3)
export {
  // Schemas
  invitationStatusSchema,
  invitationExpiryDaysSchema,
  invitationSchema,
  invitationFirestoreSchema,
  createInvitationInputSchema,
  // Story 3.2: Email tracking schemas
  invitationWithEmailSchema,
  sendInvitationEmailInputSchema,
  // Story 3.3: Acceptance schemas
  acceptInvitationInputSchema,
  acceptInvitationResultSchema,
  // Helper functions
  getInvitationErrorMessage,
  isInvitationExpired,
  isInvitationPending,
  canRevokeInvitation,
  canAcceptInvitation,
  convertFirestoreToInvitation,
  validateCreateInvitationInput,
  safeParseInvitation,
  safeParseCreateInvitationInput,
  buildInvitationLink,
  calculateExpiryDate,
  getTimeUntilExpiry,
  // Story 3.2: Email helper functions
  getEmailErrorMessage,
  maskEmail,
  isEmailRateLimited,
  // Story 3.3: Acceptance helper functions
  getAcceptanceErrorMessage,
  validateAcceptInvitationInput,
  safeParseAcceptInvitationInput,
  // Classes
  InvitationError,
  // Constants
  INVITATION_ERROR_MESSAGES,
  // Story 3.2: Email constants
  EMAIL_ERROR_MESSAGES,
  MAX_EMAILS_PER_HOUR,
  // Story 3.3: Acceptance constants
  ACCEPTANCE_ERROR_MESSAGES,
  // Types
  type InvitationStatus,
  type InvitationExpiryDays,
  type Invitation,
  type InvitationFirestore,
  type CreateInvitationInput,
  // Story 3.2: Email types
  type InvitationWithEmail,
  type SendInvitationEmailInput,
  // Story 3.3: Acceptance types
  type AcceptInvitationInput,
  type AcceptInvitationResult,
} from './invitation.schema'

// Safety Document Schemas (Story 0.5.2)
export {
  // Constants
  MAX_DOCUMENTS_PER_REQUEST,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_FILE_EXTENSIONS,
  // Schemas
  safetyDocumentSchema,
  retentionPolicySchema,
  uploadSafetyDocumentInputSchema,
  uploadSafetyDocumentResponseSchema,
  deleteSafetyDocumentInputSchema,
  deleteSafetyDocumentResponseSchema,
  // Helper functions
  isAllowedFileType,
  isAllowedDocumentType,
  isValidFileSize,
  calculateRetentionExpiration,
  formatFileSize,
  // Types
  type SafetyDocument,
  type RetentionPolicy,
  type UploadSafetyDocumentInput,
  type UploadSafetyDocumentResponse,
  type DeleteSafetyDocumentInput,
  type DeleteSafetyDocumentResponse,
} from './safety-document.schema'

// Legal Petition Schemas (Story 3.6)
export {
  // Constants
  PETITION_REVIEW_DAYS,
  PETITION_EXPIRY_DAYS,
  PETITION_STATUS_LABELS,
  PETITION_ERROR_MESSAGES,
  // Schemas
  legalPetitionStatusSchema,
  claimedRelationshipSchema,
  petitionStatusHistoryEntrySchema,
  petitionStatusHistoryEntryFirestoreSchema,
  petitionReferenceNumberSchema,
  submitLegalPetitionInputSchema,
  legalPetitionSchema,
  legalPetitionFirestoreSchema,
  submitLegalPetitionResponseSchema,
  checkPetitionStatusResponseSchema,
  checkPetitionStatusInputSchema,
  updatePetitionStatusInputSchema,
  // Helper functions
  generatePetitionReferenceNumber,
  convertFirestoreToLegalPetition,
  validateSubmitLegalPetitionInput,
  safeParseLegalPetition,
  isPetitionExpired,
  canUpdatePetitionStatus,
  getPetitionStatusLabel,
  getPetitionErrorMessage,
  // Types
  type LegalPetitionStatus,
  type ClaimedRelationship,
  type PetitionStatusHistoryEntry,
  type PetitionStatusHistoryEntryFirestore,
  type SubmitLegalPetitionInput,
  type LegalPetition,
  type LegalPetitionFirestore,
  type SubmitLegalPetitionResponse,
  type CheckPetitionStatusResponse,
  type CheckPetitionStatusInput,
  type UpdatePetitionStatusInput,
} from './legal-petition.schema'

// Data Symmetry Schemas (Story 3A.1, 3A.5)
export {
  // Constants
  DATA_VIEW_TYPE_LABELS,
  SYMMETRY_ERROR_MESSAGES,
  AUDIT_FIELD_LIMITS,
  // Story 3A.5: Screenshot viewing rate alert constants
  SCREENSHOT_VIEWING_RATE_LIMITS,
  SCREENSHOT_RATE_ALERT_ERROR_MESSAGES,
  // Schemas
  dataViewTypeSchema,
  dataViewAuditEntrySchema,
  dataViewAuditEntryFirestoreSchema,
  logDataViewInputSchema,
  guardianAccessStatusSchema,
  symmetryStatusSchema,
  symmetryViolationTypeSchema,
  symmetryViolationSchema,
  // Story 3A.5: Screenshot viewing rate alert schemas
  screenshotViewingRateAlertSchema,
  screenshotViewingRateAlertFirestoreSchema,
  checkScreenshotViewingRateInputSchema,
  checkScreenshotViewingRateResponseSchema,
  // Helper functions
  convertFirestoreToDataViewAuditEntry,
  safeParseDataViewAuditEntry,
  getDataViewTypeLabel,
  requiresSymmetryEnforcement,
  checkGuardianAccessSymmetry,
  getSymmetryErrorMessage,
  // Story 3A.5: Screenshot viewing rate alert helper functions
  convertFirestoreToScreenshotViewingRateAlert,
  safeParseScreenshotViewingRateAlert,
  checkScreenshotViewingRate,
  isWithinAlertCooldown,
  getAlertCooldownRemaining,
  formatScreenshotRateAlertMessage,
  getScreenshotRateAlertErrorMessage,
  // Types
  type DataViewType,
  type DataViewAuditEntry,
  type DataViewAuditEntryFirestore,
  type LogDataViewInput,
  type GuardianAccessStatus,
  type SymmetryStatus,
  type SymmetryViolationType,
  type SymmetryViolation,
  // Story 3A.5: Screenshot viewing rate alert types
  type ScreenshotViewingRateAlert,
  type ScreenshotViewingRateAlertFirestore,
  type CheckScreenshotViewingRateInput,
  type CheckScreenshotViewingRateResponse,
} from './data-symmetry.schema'

// Safety Settings Proposal Schemas (Story 3A.2)
export {
  // Constants
  SAFETY_SETTING_TYPE_LABELS,
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_FIELD_LIMITS,
  PROPOSAL_TIME_LIMITS,
  PROPOSAL_RATE_LIMIT,
  SAFETY_PROPOSAL_ERROR_MESSAGES,
  // Schemas
  safetySettingTypeSchema,
  proposalStatusSchema,
  safetySettingValueSchema,
  safetySettingsProposalSchema,
  safetySettingsProposalFirestoreSchema,
  createSafetySettingsProposalInputSchema,
  respondToProposalInputSchema,
  disputeProposalInputSchema,
  // Story 3A.4: Cooling period schema
  cancelCoolingPeriodInputSchema,
  // Helper functions
  getSafetySettingTypeLabel,
  getProposalStatusLabel,
  convertFirestoreToSafetySettingsProposal,
  safeParseSafetySettingsProposal,
  validateCreateSafetySettingsProposalInput,
  safeParseCreateSafetySettingsProposalInput,
  isEmergencySafetyIncrease,
  canRespondToProposal,
  canDisputeProposal,
  canRepropose,
  calculateProposalExpiry,
  getProposalTimeUntilExpiry,
  calculateDisputeDeadline,
  calculateReproposalDate,
  formatProposalDiff,
  formatSettingValue,
  getSafetyProposalErrorMessage,
  // Story 3A.4: Cooling period helper functions
  requiresCoolingPeriod,
  calculateCoolingPeriodEnd,
  getCoolingPeriodTimeRemaining,
  formatCoolingPeriodCountdown,
  isCoolingPeriodActive,
  canCancelCoolingPeriod,
  // Types
  type SafetySettingType,
  type ProposalStatus,
  type SafetySettingValue,
  type SafetySettingsProposal,
  type SafetySettingsProposalFirestore,
  type CreateSafetySettingsProposalInput,
  type RespondToProposalInput,
  type DisputeProposalInput,
  // Story 3A.4: Cooling period types
  type CancelCoolingPeriodInput,
  type CoolingPeriod,
} from './safety-settings-proposal.schema'

// Agreement Change Proposal Schemas (Story 3A.3)
export {
  // Constants
  AGREEMENT_CHANGE_TYPE_LABELS,
  AGREEMENT_PROPOSAL_STATUS_LABELS,
  AGREEMENT_PROPOSAL_FIELD_LIMITS,
  AGREEMENT_PROPOSAL_TIME_LIMITS,
  AGREEMENT_PROPOSAL_RATE_LIMIT,
  AGREEMENT_PROPOSAL_ERROR_MESSAGES,
  // Schemas
  agreementChangeTypeSchema,
  agreementProposalStatusSchema,
  signatureStatusSchema,
  agreementSignatureSchema,
  agreementSignatureFirestoreSchema,
  agreementChangeValueSchema,
  agreementChangeProposalSchema,
  agreementChangeProposalFirestoreSchema,
  createAgreementChangeProposalInputSchema,
  respondToAgreementProposalInputSchema,
  signAgreementChangeInputSchema,
  // Helper functions
  getAgreementChangeTypeLabel,
  getAgreementProposalStatusLabel,
  convertFirestoreToAgreementChangeProposal,
  safeParseAgreementChangeProposal,
  validateCreateAgreementChangeProposalInput,
  safeParseCreateAgreementChangeProposalInput,
  validateRespondToAgreementProposalInput,
  safeParseRespondToAgreementProposalInput,
  validateSignAgreementChangeInput,
  safeParseSignAgreementChangeInput,
  canRespondToAgreementProposal,
  canReproposeAgreementChange,
  calculateAgreementProposalExpiry,
  getAgreementProposalTimeUntilExpiry,
  calculateAgreementReproposalDate,
  calculateSignatureDeadline,
  isModificationProposal,
  canSignAgreementChange,
  allSignaturesCollected,
  getPendingSignatureCount,
  getPendingSigners,
  formatAgreementDiff,
  formatAgreementValue,
  getAgreementProposalErrorMessage,
  // Types
  type AgreementChangeType,
  type AgreementProposalStatus,
  type SignatureStatus,
  type AgreementSignature,
  type AgreementSignatureFirestore,
  type AgreementChangeValue,
  type AgreementChangeProposal,
  type AgreementChangeProposalFirestore,
  type CreateAgreementChangeProposalInput,
  type RespondToAgreementProposalInput,
  type SignAgreementChangeInput,
} from './agreement-change-proposal.schema'

// Guardian Removal Prevention Schemas (Story 3A.6)
export {
  // Constants
  REMOVAL_AUDIT_FIELD_LIMITS,
  BLOCKED_OPERATION_TYPES,
  GUARDIAN_REMOVAL_PREVENTION_MESSAGES,
  SHARED_CUSTODY_IMMUTABILITY_RULES,
  // Schemas
  blockedOperationTypeSchema,
  targetGuardianRoleSchema,
  guardianPermissionsSchema,
  protectedCustodyTypeSchema,
  guardianRemovalAttemptSchema,
  guardianRemovalAttemptFirestoreSchema,
  attemptGuardianRemovalInputSchema,
  attemptRoleChangeInputSchema,
  attemptPermissionChangeInputSchema,
  removalBlockedResultSchema,
  removalAllowedResultSchema,
  guardianRemovalResultSchema,
  // Helper functions
  requiresRemovalProtection,
  isRoleDowngrade,
  isPermissionDowngrade,
  createBlockedResult,
  createAllowedResult,
  getRemovalBlockedExplanation,
  convertFirestoreToGuardianRemovalAttempt,
  safeParseGuardianRemovalAttempt,
  validateAttemptGuardianRemovalInput,
  validateAttemptRoleChangeInput,
  validateAttemptPermissionChangeInput,
  // Types
  type BlockedOperationType,
  type TargetGuardianRole,
  type GuardianPermissions,
  type ProtectedCustodyType,
  type GuardianRemovalAttempt,
  type GuardianRemovalAttemptFirestore,
  type AttemptGuardianRemovalInput,
  type AttemptRoleChangeInput,
  type AttemptPermissionChangeInput,
  type RemovalBlockedResult,
  type RemovalAllowedResult,
  type GuardianRemovalResult,
} from './guardian-removal-prevention.schema'

// Admin Audit Schemas (Story 3A.6)
export {
  // Constants
  ADMIN_AUDIT_FIELD_LIMITS,
  ADMIN_AUDIT_ACTION_LABELS,
  // Schemas
  adminAuditActionTypeSchema,
  adminAuditEntrySchema,
  adminAuditEntryFirestoreSchema,
  createAdminAuditEntryInputSchema,
  guardianRemovalBlockedMetadataSchema,
  // Helper functions
  getAdminAuditActionLabel,
  convertFirestoreToAdminAuditEntry,
  safeParseAdminAuditEntry,
  validateCreateAdminAuditEntryInput,
  createGuardianRemovalBlockedAuditInput,
  // Types
  type AdminAuditActionType,
  type AdminAuditEntry,
  type AdminAuditEntryFirestore,
  type CreateAdminAuditEntryInput,
  type GuardianRemovalBlockedMetadata,
} from './admin-audit.schema'

// Agreement Template Schemas (Story 4.1)
export {
  // Constants
  AGE_GROUP_LABELS,
  TEMPLATE_VARIATION_LABELS,
  TEMPLATE_VARIATION_DESCRIPTIONS,
  TEMPLATE_CONCERNS,
  TEMPLATE_CONCERN_LABELS,
  TEMPLATE_CONCERN_DESCRIPTIONS,
  MONITORING_LEVEL_LABELS,
  MONITORING_LEVEL_DESCRIPTIONS,
  TEMPLATE_FIELD_LIMITS,
  TEMPLATE_ARRAY_LIMITS,
  TEMPLATE_ERROR_MESSAGES,
  MAX_AUTONOMY_MILESTONES,
  // Schemas
  ageGroupSchema,
  templateVariationSchema,
  templateConcernSchema,
  monitoringLevelSchema,
  templateSummarySchema,
  visualColorHintSchema,
  visualElementsSchema,
  autonomyMilestoneCriteriaSchema,
  autonomyMilestoneSchema,
  templateSectionTypeSchema,
  templateSectionSchema,
  agreementTemplateSchema,
  filterByAgeGroupInputSchema,
  filterByConcernsInputSchema,
  searchTemplatesInputSchema,
  templateLibraryResponseSchema,
  // Helper functions
  getAgeGroupLabel,
  getTemplateVariationLabel,
  getTemplateVariationDescription,
  getTemplateConcernLabel,
  getTemplateConcernDescription,
  getMonitoringLevelLabel,
  getMonitoringLevelDescription,
  safeParseAgreementTemplate,
  validateAgreementTemplate,
  safeParseTemplateSection,
  safeParseTemplateSummary,
  calculateAgeGroupFromBirthDate,
  templateMatchesConcerns,
  templateMatchesSearch,
  sortTemplatesByVariation,
  groupTemplatesByAgeGroup,
  getDefaultMonitoringLevel,
  getRecommendedScreenTimeRange,
  getTemplateErrorMessage,
  // Monitoring validation (Story 4.2 - Task 5)
  MONITORING_INTENSITY_VALUES,
  getAllowedMonitoringLevels,
  validateMonitoringLevelForAge,
  isMonitoringProgressionValid,
  // Age-relevant examples (Story 4.2 - Task 6)
  AGE_RELEVANT_EXAMPLES,
  getAgeRelevantExamples,
  getExamplesByCategory,
  formatExampleList,
  // Screen time validation (Story 4.2 - Task 4)
  screenTimeRangeSchema,
  parseScreenTimeText,
  validateScreenTimeForAge,
  validateScreenTimeTextForAge,
  getScreenTimeRangeText,
  // Types
  type AgeGroup,
  type TemplateVariation,
  type TemplateConcern,
  type MonitoringLevel,
  type TemplateSummary,
  type VisualColorHint,
  type VisualElements,
  type AutonomyMilestoneCriteria,
  type AutonomyMilestone,
  type ScreenTimeRange,
  type ScreenTimeValidationResult,
  type MonitoringValidationResult,
  type ExampleCategory,
  type AgeRelevantExamples,
  type TemplateSectionType,
  type TemplateSection,
  type AgreementTemplate,
  type FilterByAgeGroupInput,
  type FilterByConcernsInput,
  type SearchTemplatesInput,
  type TemplateLibraryResponse,
} from './agreement-template.schema'

// Agreement Template Data (Story 4.1 - Task 2)
export {
  // Template collections
  ALL_TEMPLATES,
  TEMPLATES_BY_AGE_GROUP,
  ages5to7Templates,
  ages8to10Templates,
  ages11to13Templates,
  ages14to16Templates,
  // Helper functions
  getAllTemplates,
  getTemplatesByAgeGroup,
  filterTemplatesByConcern,
  filterTemplatesByVariation,
  searchTemplates,
  getTemplateById,
  findTemplates,
  getTemplateCountsByAgeGroup,
  getTemplateCountsByConcern,
  validateAllTemplates,
} from './data/templates'

// Co-Creation Session Schemas (Story 5.1)
export {
  // Constants
  SESSION_FIELD_LIMITS,
  SESSION_ARRAY_LIMITS,
  SESSION_TIMEOUT_CONSTANTS,
  SESSION_STATUS_LABELS,
  SESSION_STATUS_DESCRIPTIONS,
  SESSION_CONTRIBUTOR_LABELS,
  CONTRIBUTION_ACTION_LABELS,
  SESSION_TERM_TYPE_LABELS,
  SESSION_TERM_STATUS_LABELS,
  SESSION_ERROR_MESSAGES,
  // Schemas
  sessionStatusSchema,
  sessionContributorSchema,
  contributionActionSchema,
  sessionContributionSchema,
  sessionContributionFirestoreSchema,
  sessionTermTypeSchema,
  sessionTermStatusSchema,
  sessionTermSchema,
  sessionTermFirestoreSchema,
  sourceDraftTypeSchema,
  sourceDraftSchema,
  coCreationSessionSchema,
  coCreationSessionFirestoreSchema,
  createCoCreationSessionInputSchema,
  pauseSessionInputSchema,
  resumeSessionInputSchema,
  recordContributionInputSchema,
  addTermInputSchema,
  updateTermInputSchema,
  getSessionInputSchema,
  createSessionResponseSchema,
  sessionOperationResponseSchema,
  // Helper functions
  getSessionStatusLabel,
  getSessionStatusDescription,
  getSessionContributorLabel,
  getContributionActionLabel,
  getSessionTermTypeLabel,
  getSessionTermStatusLabel,
  getSessionErrorMessage,
  safeParseCoCreationSession,
  validateCoCreationSession,
  safeParseCreateSessionInput,
  validateCreateSessionInput,
  safeParseSessionContribution,
  safeParseSessionTerm,
  convertFirestoreToCoCreationSession,
  canPauseSession,
  canResumeSession,
  isSessionActive,
  shouldShowTimeoutWarning,
  getTimeUntilTimeout,
  formatTimeRemaining,
  shouldMarkAsAbandoned,
  getAcceptedTerms,
  getDiscussionTerms,
  countContributionsByContributor,
  getLastTermContributor,
  isValidStatusTransition,
  createSessionStartContribution,
  createPauseContribution,
  createResumeContribution,
  // Discussion & Negotiation (Story 5.4)
  getUnresolvedDiscussionTerms,
  canProceedToSigning,
  getNextResolutionStatus,
  hasContributorAgreed,
  createDiscussionNote,
  getSigningReadiness,
  resolutionStatusSchema,
  discussionNoteSchema,
  addDiscussionNoteInputSchema,
  markTermAgreementInputSchema,
  acceptCompromiseInputSchema,
  DISCUSSION_LIMITS,
  // Types
  type SessionStatus,
  type SessionContributor,
  type ContributionAction,
  type SessionContribution,
  type SessionContributionFirestore,
  type SessionTermType,
  type SessionTermStatus,
  type SessionTerm,
  type SessionTermFirestore,
  type SourceDraftType,
  type SourceDraft,
  type CoCreationSession,
  type CoCreationSessionFirestore,
  type CreateCoCreationSessionInput,
  type PauseSessionInput,
  type ResumeSessionInput,
  type RecordContributionInput,
  type AddTermInput,
  type UpdateTermInput,
  type GetSessionInput,
  type CreateSessionResponse,
  type SessionOperationResponse,
  // Story 5.4 Discussion Types
  type ResolutionStatus,
  type DiscussionNote,
  type AddDiscussionNoteInput,
  type MarkTermAgreementInput,
  type AcceptCompromiseInput,
  type SigningReadiness,
  // Story 5.5 Agreement Preview Types
  type ContributionSummary,
  type ScreenTimeImpact,
  type BedtimeImpact,
  type MonitoringImpact,
  type ImpactEstimate,
  type AgreementPreview,
  // Story 5.5 Preview Schemas
  contributionSummarySchema,
  screenTimeImpactSchema,
  bedtimeImpactSchema,
  monitoringImpactSchema,
  impactEstimateSchema,
  agreementPreviewSchema,
  // Story 5.5 Preview Helper Functions
  formatDuration,
  getTermTitle,
  calculateScreenTimeImpact,
  calculateBedtimeImpact,
  calculateMonitoringImpact,
  generateCommitmentSummary,
  generateContributionSummary,
  generateAgreementPreview,
  canProceedFromPreview,
  getScrollCompletionMessage,
  getContributionStats,
  // Story 5.6 Agreement Mode Schemas and Types
  agreementModeSchema,
  type AgreementMode,
  // Story 5.6 Agreement Mode Constants
  AGREEMENT_MODE_LABELS,
  AGREEMENT_MODE_DESCRIPTIONS,
  AGREEMENT_MODE_FEATURES,
  MONITORING_TERM_TYPES,
  MONITORING_SECTION_TYPES,
  // Story 5.6 Agreement Mode Helper Functions
  getAgreementModeLabel,
  getAgreementModeDescription,
  getAgreementModeFeatures,
  isMonitoringTermType,
  getMonitoringTermTypes,
  filterTermsForMode,
  canUpgradeToMonitoring,
  getAvailableTermTypesForMode,
  isMonitoringSectionType,
  getHiddenSectionTypesForMode,
  filterSectionsForMode,
  filterTemplateForMode,
  templateHasMonitoringSections,
  // Story 5.7 Version History Schemas and Types
  versionTypeSchema,
  sessionVersionSchema,
  sessionVersionFirestoreSchema,
  type VersionType,
  type SessionVersion,
  type SessionVersionFirestore,
  // Story 5.7 Version History Constants
  VERSION_TYPE_LABELS,
  VERSION_TYPE_DESCRIPTIONS,
  // Story 5.7 Version History Helper Functions
  getVersionTypeLabel,
  getVersionTypeDescription,
  createVersionSnapshot,
  safeParseSessionVersion,
  convertFirestoreToSessionVersion,
} from './co-creation-session.schema'

// Readability Validation Utilities (Story 4.2 - Task 3)
export {
  // Constants
  AGE_GROUP_MAX_GRADE_LEVELS,
  SIMPLE_WORDS,
  // Syllable and text analysis
  countSyllables,
  splitIntoSentences,
  splitIntoWords,
  analyzeText,
  // Flesch-Kincaid calculations
  calculateFleschKincaidGradeLevel,
  calculateFleschReadingEase,
  // Word complexity analysis
  calculateSimpleWordRatio,
  getComplexWords,
  // Readability validation
  validateTextReadability,
  validateTemplateReadability,
  validateTemplatesReadability,
  getReadabilitySummary,
  // Types
  type TextStats,
  type ReadabilityResult,
  type SectionReadabilityResult,
  type TemplateReadabilityResult,
} from './utils/readabilityUtils'

// Digital Signature Schemas (Story 6.1)
export {
  // Constants
  SIGNATURE_ORDER,
  SIGNATURE_VALIDATION,
  SIGNATURE_TYPE_LABELS,
  SIGNER_ROLE_LABELS,
  SIGNING_STATUS_LABELS,
  SIGNING_STATUS_DESCRIPTIONS,
  // Legacy aliases (deprecated)
  signatureTypeLabels,
  signerRoleLabels,
  signingStatusLabels,
  signingStatusChildLabels,
  // Schemas
  signatureTypeSchema,
  signerRoleSchema,
  signingStatusSchema,
  signatureSchema,
  agreementSignatureSchema as digitalAgreementSignatureSchema,
  agreementSignaturesSchema,
  // Label Getter Functions
  getSignatureTypeLabel,
  getSignerRoleLabel,
  getSigningStatusLabel,
  getSigningStatusDescription,
  // Safe Parse Functions
  safeParseSignature,
  safeParseAgreementSignature,
  // Validation Functions
  validateSignature,
  validateAgreementSignature,
  isTypedSignatureValid,
  isDrawnSignatureValid,
  isSignatureValid,
  // Signing Order Helper Functions
  canChildSign,
  canParentSign,
  canCoParentSign,
  getNextSigningStatus,
  isSigningComplete,
  isWaitingForCoParent,
  // Types
  type SignatureType,
  type SignerRole,
  type SigningStatus,
  type Signature,
  type AgreementSignature as DigitalAgreementSignature,
  type AgreementSignatures,
} from './signature.schema'

// Agreement Lifecycle Schemas (Story 6.3)
export {
  // Schemas
  agreementStatusSchema,
  agreementVersionSchema,
  archiveReasonSchema,
  // Constants
  AGREEMENT_STATUS_LABELS,
  AGREEMENT_STATUS_DESCRIPTIONS,
  ARCHIVE_REASON_LABELS,
  // Label Getter Functions
  getAgreementStatusLabel,
  getAgreementStatusDescription,
  getArchiveReasonLabel,
  // Status Helper Functions
  isAgreementActive,
  isAgreementArchived,
  canActivateAgreement,
  // Version Helper Functions
  parseVersionNumber,
  compareVersions,
  getNextVersionNumber,
  // Types
  type AgreementStatus,
  type AgreementVersion,
  type ArchiveReason,
} from './agreement.schema'

// Crisis Protection Schemas (Story 7.2)
export {
  // Schemas
  crisisCheckResultSchema,
  crisisProtectionStatusSchema,
  monitoringActionSchema,
  blockingDecisionSchema,
  crisisGuardConfigSchema,
  allowlistCacheStatusSchema,
  platformGuardInterfaceSchema,
  crisisAllowlistResponseSchema,
  crisisAllowlistErrorSchema,
  // Types
  type CrisisCheckResult,
  type CrisisProtectionStatus,
  type MonitoringAction,
  type BlockingDecision,
  type CrisisGuardConfig,
  type AllowlistCacheStatus,
  type CrisisAllowlistResponse,
  type CrisisAllowlistError,
} from './crisis.schema'

// Emergency Allowlist Schemas (Story 7.4)
export {
  // Constants
  EMERGENCY_PUSH_CONSTANTS,
  EMERGENCY_PUSH_STATUS_LABELS,
  EMERGENCY_PUSH_STATUS_DESCRIPTIONS,
  // Schemas
  emergencyPushStatusSchema,
  emergencyPushSchema,
  emergencyPushRecordSchema,
  emergencyOverrideEntrySchema,
  emergencyPushResponseSchema,
  // Helper functions
  getEmergencyPushStatusLabel,
  getEmergencyPushStatusDescription,
  createEmergencyVersion,
  isEmergencyVersion,
  extractPushIdFromVersion,
  // Types
  type EmergencyPushStatus,
  type EmergencyPush,
  type EmergencyPushRecord,
  type EmergencyOverrideEntry,
  type EmergencyPushResponse,
} from './emergencyAllowlist.schema'

// Fuzzy Match Log Schemas (Story 7.5)
export {
  // Constants
  FUZZY_MATCH_RATE_LIMIT,
  FUZZY_MATCH_LOGS_COLLECTION,
  // Schemas
  deviceTypeSchema,
  fuzzyMatchLogInputSchema,
  fuzzyMatchLogSchema,
  fuzzyMatchStatsSchema,
  fuzzyMatchRateLimitSchema,
  // Types
  type DeviceType,
  type FuzzyMatchLogInput,
  type FuzzyMatchLog,
  type FuzzyMatchStats,
  type FuzzyMatchRateLimit,
} from './fuzzyMatchLog.schema'

// Crisis Search Schemas (Story 7.6)
export {
  // Schemas
  crisisSearchCategorySchema,
  crisisSearchConfidenceSchema,
  crisisSearchMatchSchema,
  crisisRedirectActionSchema,
  crisisSearchResultSchema,
  // Types
  type CrisisSearchCategory,
  type CrisisSearchConfidence,
  type CrisisSearchMatch,
  type CrisisRedirectAction,
  type CrisisSearchResult,
} from './crisisSearch.schema'
