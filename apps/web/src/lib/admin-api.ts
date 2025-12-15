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
