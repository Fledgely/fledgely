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
