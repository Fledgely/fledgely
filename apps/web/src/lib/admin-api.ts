'use client'

import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

/**
 * Safety request summary for list view
 */
export interface SafetyRequestSummary {
  id: string
  submittedAt: { _seconds: number; _nanoseconds: number }
  status: 'pending' | 'in-progress' | 'resolved'
  source: string
  hasEmail: boolean
  hasPhone: boolean
  hasDocuments: boolean
  documentCount: number
  assignedTo: string | null
  isEscalated: boolean
  messagePreview: string
}

/**
 * Verification checklist for safety requests
 */
export interface VerificationChecklist {
  phoneVerified: boolean
  idMatched: boolean
  accountOwnershipVerified: boolean
  safeContactConfirmed: boolean
}

/**
 * Admin note on a safety request
 */
export interface AdminNote {
  id: string
  content: string
  addedBy: string
  addedAt: { _seconds: number; _nanoseconds: number }
}

/**
 * Escalation status
 */
export interface Escalation {
  isEscalated: boolean
  reason?: string
  escalatedBy?: string
  escalatedAt?: { _seconds: number; _nanoseconds: number }
}

/**
 * Document with signed URL
 */
export interface SafetyDocument {
  id: string
  fileName: string
  fileType: string
  storagePath: string
  uploadedAt: { _seconds: number; _nanoseconds: number }
  sizeBytes: number
  signedUrl: string | null
  urlExpiresAt?: string
  urlError?: string
}

/**
 * Full safety request detail
 */
export interface SafetyRequestDetail {
  id: string
  message: string
  safeEmail: string | null
  safePhone: string | null
  submittedBy: string | null
  submittedAt: { _seconds: number; _nanoseconds: number }
  source: string
  status: 'pending' | 'in-progress' | 'resolved'
  assignedTo: string | null
  documents: SafetyDocument[]
  verificationChecklist: VerificationChecklist
  adminNotes: AdminNote[]
  escalation: Escalation
  retentionPolicy: unknown
}

/**
 * List safety requests input
 */
export interface ListSafetyRequestsInput {
  status?: 'pending' | 'in-progress' | 'resolved' | 'all'
  escalated?: boolean
  limit?: number
  startAfter?: string
  sortBy?: 'submittedAt' | 'updatedAt' | 'status'
  sortDirection?: 'asc' | 'desc'
}

/**
 * List safety requests response
 */
export interface ListSafetyRequestsResponse {
  success: boolean
  requests: SafetyRequestSummary[]
  hasMore: boolean
  nextCursor: string | null
}

/**
 * Get safety request response
 */
export interface GetSafetyRequestResponse {
  success: boolean
  request: SafetyRequestDetail
}

/**
 * Update safety request input
 */
export interface UpdateSafetyRequestInput {
  requestId: string
  updateType: 'status' | 'assignment' | 'verification' | 'note' | 'escalation'
  status?: 'pending' | 'in-progress' | 'resolved'
  assignTo?: string | null
  verification?: Partial<VerificationChecklist>
  note?: { content: string }
  escalation?: { isEscalated: boolean; reason?: string }
}

/**
 * Cloud Function callables for admin operations
 */
const listSafetyRequestsFn = httpsCallable<
  ListSafetyRequestsInput,
  ListSafetyRequestsResponse
>(functions, 'listSafetyRequests')

const getSafetyRequestFn = httpsCallable<
  { requestId: string; includeDocumentUrls?: boolean },
  GetSafetyRequestResponse
>(functions, 'getSafetyRequest')

const updateSafetyRequestFn = httpsCallable<
  UpdateSafetyRequestInput,
  { success: boolean; updateType: string; requestId: string }
>(functions, 'updateSafetyRequest')

/**
 * List safety requests with filtering and pagination
 */
export async function listSafetyRequests(
  input: ListSafetyRequestsInput = {}
): Promise<ListSafetyRequestsResponse> {
  const result = await listSafetyRequestsFn(input)
  return result.data
}

/**
 * Get full safety request detail with signed document URLs
 */
export async function getSafetyRequest(
  requestId: string,
  includeDocumentUrls = true
): Promise<SafetyRequestDetail> {
  const result = await getSafetyRequestFn({ requestId, includeDocumentUrls })
  return result.data.request
}

/**
 * Update safety request status
 */
export async function updateRequestStatus(
  requestId: string,
  status: 'pending' | 'in-progress' | 'resolved'
): Promise<void> {
  await updateSafetyRequestFn({
    requestId,
    updateType: 'status',
    status,
  })
}

/**
 * Assign request to agent
 */
export async function assignRequest(
  requestId: string,
  assignTo: string | null
): Promise<void> {
  await updateSafetyRequestFn({
    requestId,
    updateType: 'assignment',
    assignTo,
  })
}

/**
 * Update verification checklist
 */
export async function updateVerification(
  requestId: string,
  verification: Partial<VerificationChecklist>
): Promise<void> {
  await updateSafetyRequestFn({
    requestId,
    updateType: 'verification',
    verification,
  })
}

/**
 * Add admin note to request
 */
export async function addNote(
  requestId: string,
  content: string
): Promise<void> {
  await updateSafetyRequestFn({
    requestId,
    updateType: 'note',
    note: { content },
  })
}

/**
 * Update escalation status
 */
export async function updateEscalation(
  requestId: string,
  isEscalated: boolean,
  reason?: string
): Promise<void> {
  await updateSafetyRequestFn({
    requestId,
    updateType: 'escalation',
    escalation: { isEscalated, reason },
  })
}

/**
 * Sever parent access input
 */
export interface SeverParentAccessInput {
  requestId: string
  targetUserId: string
  familyId: string
  reason: string
}

/**
 * Sever parent access response
 */
export interface SeverParentAccessResponse {
  success: boolean
  severed: boolean
  targetUserId: string
  familyId: string
  severedAt: string
}

/**
 * Cloud Function callable for severing parent access
 *
 * CRITICAL: This is a life-safety operation.
 * - Only callable by safety-team users
 * - Requires verified safety request
 * - Creates sealed audit log entry
 * - Does NOT notify severed parent or family members
 */
const severParentAccessFn = httpsCallable<
  SeverParentAccessInput,
  SeverParentAccessResponse
>(functions, 'severParentAccess')

/**
 * Sever a parent's access to their family
 *
 * CRITICAL: This is a life-safety operation used to protect abuse victims.
 * The severed parent will:
 * - Still be able to log in (authentication preserved)
 * - See "No families found" (NOT "You've been removed")
 * - NOT receive any notification about the severing
 *
 * @param requestId - Safety request ID that authorized this severing
 * @param targetUserId - User ID of the parent to sever
 * @param familyId - Family ID to sever the parent from
 * @param reason - Documented reason for compliance audit
 */
export async function severParentAccess(
  requestId: string,
  targetUserId: string,
  familyId: string,
  reason: string
): Promise<SeverParentAccessResponse> {
  const result = await severParentAccessFn({
    requestId,
    targetUserId,
    familyId,
    reason,
  })
  return result.data
}

/**
 * Device unenrollment input (single device)
 */
export interface UnenrollDeviceInput {
  requestId: string
  deviceId: string
  familyId: string
  childId: string
  reason: string
}

/**
 * Device unenrollment response (single device)
 */
export interface UnenrollDeviceResponse {
  success: boolean
  unenrolled: boolean
  deviceId: string
  familyId: string
  childId: string
  unenrolledAt: string
}

/**
 * Bulk device unenrollment input
 */
export interface UnenrollDevicesInput {
  requestId: string
  devices: Array<{
    deviceId: string
    familyId: string
    childId: string
  }>
  reason: string
}

/**
 * Bulk device unenrollment response
 */
export interface UnenrollDevicesResponse {
  success: boolean
  totalRequested: number
  totalUnenrolled: number
  results: Array<{
    deviceId: string
    success: boolean
    error?: string
  }>
  unenrolledAt: string
}

/**
 * Cloud Function callable for unenrolling a single device
 *
 * CRITICAL: This is a life-safety operation.
 * - Only callable by safety-team users
 * - Requires verified safety request
 * - Creates sealed audit log entry
 * - Does NOT notify any family members
 */
const unenrollDeviceFn = httpsCallable<
  UnenrollDeviceInput,
  UnenrollDeviceResponse
>(functions, 'unenrollDevice')

/**
 * Cloud Function callable for bulk device unenrollment
 */
const unenrollDevicesFn = httpsCallable<
  UnenrollDevicesInput,
  UnenrollDevicesResponse
>(functions, 'unenrollDevices')

/**
 * Unenroll a device from monitoring
 *
 * CRITICAL: This is a life-safety operation used to protect abuse victims.
 * The device will:
 * - Stop capturing and uploading immediately
 * - Delete local cached screenshots
 * - Show "Device no longer monitored" to child
 * - NOT trigger any notification
 *
 * @param requestId - Safety request ID that authorized this unenrollment
 * @param deviceId - Device ID to unenroll
 * @param familyId - Family ID the device belongs to
 * @param childId - Child ID the device is assigned to
 * @param reason - Documented reason for compliance audit
 */
export async function unenrollDevice(
  requestId: string,
  deviceId: string,
  familyId: string,
  childId: string,
  reason: string
): Promise<UnenrollDeviceResponse> {
  const result = await unenrollDeviceFn({
    requestId,
    deviceId,
    familyId,
    childId,
    reason,
  })
  return result.data
}

/**
 * Unenroll multiple devices from monitoring
 *
 * CRITICAL: This is a life-safety operation used for bulk device escape.
 * All devices will be unenrolled atomically where possible.
 *
 * @param requestId - Safety request ID that authorized this unenrollment
 * @param devices - Array of devices to unenroll
 * @param reason - Documented reason for compliance audit
 */
export async function unenrollDevices(
  requestId: string,
  devices: Array<{
    deviceId: string
    familyId: string
    childId: string
  }>,
  reason: string
): Promise<UnenrollDevicesResponse> {
  const result = await unenrollDevicesFn({
    requestId,
    devices,
    reason,
  })
  return result.data
}

/**
 * Location feature disable input
 */
export interface DisableLocationFeaturesInput {
  requestId: string
  familyId: string
  targetUserIds: string[]
  reason: string
}

/**
 * Location feature disable response
 */
export interface DisableLocationFeaturesResponse {
  success: boolean
  disabled: boolean
  familyId: string
  affectedUserIds: string[]
  disabledAt: string
  deletedNotificationCount: number
  deviceCommandCount: number
  redactedHistoryCount: number
}

/**
 * Cloud Function callable for disabling location features
 *
 * CRITICAL: This is a life-safety operation.
 * - Only callable by safety-team users
 * - Requires verified safety request
 * - Creates sealed audit log entry
 * - Does NOT notify any family members
 * - Deletes pending location notifications
 * - Redacts historical location data
 */
const disableLocationFeaturesFn = httpsCallable<
  DisableLocationFeaturesInput,
  DisableLocationFeaturesResponse
>(functions, 'disableLocationFeatures')

/**
 * Disable all location-revealing features for specified users
 *
 * CRITICAL: This is a life-safety operation used to protect abuse victims.
 * Affected users will:
 * - Have all location-based rules disabled (FR139)
 * - Have location-based work mode disabled (FR145)
 * - Have new location alerts disabled (FR160)
 * - Have pending location notifications deleted
 * - Have historical location data redacted
 * - NOT receive any notification about the disable
 *
 * @param requestId - Safety request ID that authorized this disable
 * @param familyId - Family ID containing target users
 * @param targetUserIds - User IDs to disable location features for
 * @param reason - Documented reason for compliance audit
 */
export async function disableLocationFeatures(
  requestId: string,
  familyId: string,
  targetUserIds: string[],
  reason: string
): Promise<DisableLocationFeaturesResponse> {
  const result = await disableLocationFeaturesFn({
    requestId,
    familyId,
    targetUserIds,
    reason,
  })
  return result.data
}

/**
 * Notification stealth input
 */
export interface ActivateNotificationStealthInput {
  requestId: string
  familyId: string
  targetUserIds: string[]
  reason: string
  durationHours?: number
  notificationTypes?: string[]
}

/**
 * Notification stealth response
 */
export interface ActivateNotificationStealthResponse {
  success: boolean
  activated: boolean
  alreadyActive?: boolean
  queueId: string
  familyId: string
  targetUserIds: string[]
  activatedAt?: string
  expiresAt: string
  durationHours?: number
  notificationTypesCount?: number
}

/**
 * Cloud Function callable for activating notification stealth
 *
 * CRITICAL: This is a life-safety operation.
 * - Only callable by safety-team users
 * - Requires verified safety request
 * - Creates sealed audit log entry
 * - Does NOT notify any family members
 * - Suppresses escape-revealing notifications for 72 hours
 */
const activateNotificationStealthFn = httpsCallable<
  ActivateNotificationStealthInput,
  ActivateNotificationStealthResponse
>(functions, 'activateNotificationStealth')

/**
 * Activate notification stealth mode for specified users
 *
 * CRITICAL: This is a life-safety operation used to protect abuse victims.
 * Affected users (typically the abuser) will:
 * - NOT receive notifications that reveal escape actions
 * - NOT see pending notification counts for suppressed notifications
 * - NOT be alerted about device unenrollment, location disable, etc.
 *
 * After 72 hours, all held notifications are permanently deleted.
 *
 * @param requestId - Safety request ID that authorized this activation
 * @param familyId - Family ID containing target users
 * @param targetUserIds - User IDs to suppress notifications for (the abuser)
 * @param reason - Documented reason for compliance audit
 * @param durationHours - Stealth duration (default 72, max 168 hours)
 * @param notificationTypes - Specific types to suppress (default: all escape-related)
 */
export async function activateNotificationStealth(
  requestId: string,
  familyId: string,
  targetUserIds: string[],
  reason: string,
  durationHours: number = 72,
  notificationTypes?: string[]
): Promise<ActivateNotificationStealthResponse> {
  const result = await activateNotificationStealthFn({
    requestId,
    familyId,
    targetUserIds,
    reason,
    durationHours,
    notificationTypes,
  })
  return result.data
}

// ============================================================================
// Legal Petition API (Story 3.6)
// ============================================================================

/**
 * Legal petition summary for list view
 */
export interface LegalPetitionSummary {
  id: string
  referenceNumber: string
  petitionerName: string
  petitionerEmail: string
  childName: string
  status: 'pending' | 'under-review' | 'verified' | 'denied'
  claimedRelationship: 'parent' | 'legal-guardian'
  submittedAt: { _seconds: number; _nanoseconds: number }
  updatedAt: { _seconds: number; _nanoseconds: number }
  hasDocuments: boolean
  documentCount: number
  assignedTo: string | null
}

/**
 * Full legal petition detail
 */
export interface LegalPetitionDetail {
  id: string
  referenceNumber: string
  petitionerName: string
  petitionerEmail: string
  petitionerPhone: string | null
  childName: string
  childDOB: { _seconds: number; _nanoseconds: number }
  claimedRelationship: 'parent' | 'legal-guardian'
  message: string
  status: 'pending' | 'under-review' | 'verified' | 'denied'
  submittedAt: { _seconds: number; _nanoseconds: number }
  updatedAt: { _seconds: number; _nanoseconds: number }
  documents: Array<{
    id: string
    fileName: string
    fileType: string
    storagePath: string
    uploadedAt: { _seconds: number; _nanoseconds: number }
    sizeBytes: number
    signedUrl?: string
  }>
  targetFamilyId: string | null
  assignedTo: string | null
  internalNotes: Array<{
    content: string
    addedBy: string
    addedAt: { _seconds: number; _nanoseconds: number }
  }>
  statusHistory: Array<{
    status: string
    timestamp: { _seconds: number; _nanoseconds: number }
    updatedBy: string
    note?: string
  }>
  supportMessageToUser: string | null
}

/**
 * List legal petitions input
 */
export interface ListLegalPetitionsInput {
  status?: 'pending' | 'under-review' | 'verified' | 'denied' | 'all'
  limit?: number
  startAfter?: string
  sortBy?: 'submittedAt' | 'updatedAt'
  sortDirection?: 'asc' | 'desc'
}

/**
 * List legal petitions response
 */
export interface ListLegalPetitionsResponse {
  success: boolean
  petitions: LegalPetitionSummary[]
  hasMore: boolean
  nextCursor: string | null
}

/**
 * Update legal petition input
 */
export interface UpdateLegalPetitionInput {
  petitionId: string
  updateType: 'status' | 'assignment' | 'note' | 'support-message'
  status?: 'pending' | 'under-review' | 'verified' | 'denied'
  assignTo?: string | null
  note?: { content: string }
  supportMessage?: string
  targetFamilyId?: string
}

/**
 * Cloud Function callables for legal petition operations
 */
const listLegalPetitionsFn = httpsCallable<
  ListLegalPetitionsInput,
  ListLegalPetitionsResponse
>(functions, 'listLegalPetitions')

const getLegalPetitionFn = httpsCallable<
  { petitionId: string },
  { success: boolean; petition: LegalPetitionDetail }
>(functions, 'getLegalPetition')

const updateLegalPetitionFn = httpsCallable<
  UpdateLegalPetitionInput,
  { success: boolean; updateType: string; petitionId: string }
>(functions, 'updateLegalPetition')

const addCourtOrderedParentFn = httpsCallable<
  { petitionId: string; familyId: string; newParentUserId: string },
  { success: boolean; familyId: string; message: string }
>(functions, 'addCourtOrderedParent')

/**
 * List legal petitions with filtering and pagination
 */
export async function listLegalPetitions(
  input: ListLegalPetitionsInput = {}
): Promise<ListLegalPetitionsResponse> {
  const result = await listLegalPetitionsFn(input)
  return result.data
}

/**
 * Get full legal petition detail
 */
export async function getLegalPetition(
  petitionId: string
): Promise<LegalPetitionDetail> {
  const result = await getLegalPetitionFn({ petitionId })
  return result.data.petition
}

/**
 * Update legal petition status
 */
export async function updatePetitionStatus(
  petitionId: string,
  status: 'pending' | 'under-review' | 'verified' | 'denied',
  targetFamilyId?: string
): Promise<void> {
  await updateLegalPetitionFn({
    petitionId,
    updateType: 'status',
    status,
    targetFamilyId,
  })
}

/**
 * Assign petition to agent
 */
export async function assignPetition(
  petitionId: string,
  assignTo: string | null
): Promise<void> {
  await updateLegalPetitionFn({
    petitionId,
    updateType: 'assignment',
    assignTo,
  })
}

/**
 * Add internal note to petition
 */
export async function addPetitionNote(
  petitionId: string,
  content: string
): Promise<void> {
  await updateLegalPetitionFn({
    petitionId,
    updateType: 'note',
    note: { content },
  })
}

/**
 * Update support message to petitioner
 */
export async function updatePetitionSupportMessage(
  petitionId: string,
  supportMessage: string
): Promise<void> {
  await updateLegalPetitionFn({
    petitionId,
    updateType: 'support-message',
    supportMessage,
  })
}

/**
 * Add court-ordered parent to family
 *
 * CRITICAL: Only callable by safety-team users
 * This adds a verified legal parent to a family, bypassing normal invitation flow
 *
 * @param petitionId - Verified petition ID
 * @param familyId - Family to add the parent to
 * @param newParentUserId - User ID of the parent to add
 */
export async function addCourtOrderedParent(
  petitionId: string,
  familyId: string,
  newParentUserId: string
): Promise<{ success: boolean; familyId: string; message: string }> {
  const result = await addCourtOrderedParentFn({
    petitionId,
    familyId,
    newParentUserId,
  })
  return result.data
}
