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
  createFamilyInputSchema,
  // Helper functions
  convertFirestoreToFamily,
  validateCreateFamilyInput,
  safeParseFamily,
  isGuardianInFamily,
  getGuardianRole,
  getGuardianPermissions,
  hasFullPermissions,
  // Types
  type Family,
  type FamilyFirestore,
  type FamilyGuardian,
  type FamilyGuardianFirestore,
  type GuardianRole,
  type GuardianPermission,
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

// Invitation Schemas (Story 3.1, 3.2)
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
  // Classes
  InvitationError,
  // Constants
  INVITATION_ERROR_MESSAGES,
  // Story 3.2: Email constants
  EMAIL_ERROR_MESSAGES,
  MAX_EMAILS_PER_HOUR,
  // Types
  type InvitationStatus,
  type InvitationExpiryDays,
  type Invitation,
  type InvitationFirestore,
  type CreateInvitationInput,
  // Story 3.2: Email types
  type InvitationWithEmail,
  type SendInvitationEmailInput,
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
