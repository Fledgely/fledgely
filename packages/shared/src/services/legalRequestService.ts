/**
 * LegalRequestService - Story 7.5.5 Task 5
 *
 * Service for law enforcement data request handling.
 * AC5: Law enforcement cooperation protocol
 *
 * CRITICAL SAFETY:
 * - Legal requests ALWAYS require human review
 * - No automated fulfillment of law enforcement requests
 * - Must have valid subpoena/warrant
 * - Response handled through legal team, not automated
 * - NEVER auto-approve requests
 */

import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import {
  type LegalRequest,
  type LegalRequestType,
  generateLegalRequestId,
  legalRequestSchema,
} from '../contracts/crisisPartner'
import { type SealedSignalData, SEALED_SIGNALS_COLLECTION } from './signalSealingService'
import { isValidJurisdictionCode } from './jurisdictionService'

// ============================================
// Constants
// ============================================

/**
 * Firestore collection for legal requests.
 * CRITICAL: Access restricted to legal/admin personnel only.
 */
export const LEGAL_REQUESTS_COLLECTION = 'legalRequests'

// ============================================
// Types
// ============================================

/**
 * Input for logging a new legal request.
 */
export interface LogLegalRequestInput {
  requestType: LegalRequestType
  requestingAgency: string
  jurisdiction: string
  documentReference: string
  receivedAt: Date
  signalIds: string[]
}

/**
 * Result of approval operation.
 */
export interface ApprovalResult {
  status: 'approved'
  approvedBy: string
  approvedAt: Date
}

/**
 * Result of denial operation.
 */
export interface DenialResult {
  status: 'denied'
  deniedBy: string
  deniedAt: Date
  denialReason: string
}

/**
 * Result of fulfillment operation.
 */
export interface FulfillmentResult {
  success: boolean
  signalData: SealedSignalData[] | null
  error?: string
}

// ============================================
// Firestore Helpers
// ============================================

function getLegalRequestDocRef(requestId: string) {
  const db = getFirestore()
  return doc(db, LEGAL_REQUESTS_COLLECTION, requestId)
}

function getSealedSignalDocRef(signalId: string) {
  const db = getFirestore()
  return doc(db, SEALED_SIGNALS_COLLECTION, signalId)
}

// ============================================
// Legal Request Logging Functions
// ============================================

/**
 * Log a new legal request.
 *
 * ADMIN ONLY - Creates a request in pending_legal_review status.
 * NEVER auto-approves. Always requires human review.
 *
 * @param input - Legal request details
 * @returns Created legal request with pending status
 * @throws Error if required fields are missing
 */
export async function logLegalRequest(input: LogLegalRequestInput): Promise<LegalRequest> {
  if (!input.requestingAgency || input.requestingAgency.trim().length === 0) {
    throw new Error('requestingAgency is required')
  }
  if (!input.documentReference || input.documentReference.trim().length === 0) {
    throw new Error('documentReference is required')
  }
  if (!input.signalIds || input.signalIds.length === 0) {
    throw new Error('At least one signalId is required')
  }
  if (!input.jurisdiction || !isValidJurisdictionCode(input.jurisdiction)) {
    throw new Error('Valid jurisdiction is required')
  }

  const requestId = generateLegalRequestId()

  const request: LegalRequest = {
    id: requestId,
    requestType: input.requestType,
    requestingAgency: input.requestingAgency.trim(),
    jurisdiction: input.jurisdiction,
    documentReference: input.documentReference.trim(),
    receivedAt: input.receivedAt,
    signalIds: input.signalIds,
    status: 'pending_legal_review',
    fulfilledAt: null,
    fulfilledBy: null,
  }

  const db = getFirestore()
  const requestRef = doc(db, LEGAL_REQUESTS_COLLECTION, requestId)
  await setDoc(requestRef, request)

  return request
}

// ============================================
// Legal Request Approval Functions
// ============================================

/**
 * Approve a pending legal request.
 *
 * ADMIN/LEGAL ONLY - Marks request as approved for fulfillment.
 * This is the human review step required before any data can be disclosed.
 *
 * @param requestId - Legal request ID
 * @param approvedBy - Admin user ID who approved
 * @returns Approval result
 * @throws Error if request not found or not in pending status
 */
export async function approveLegalRequest(
  requestId: string,
  approvedBy: string
): Promise<ApprovalResult> {
  if (!requestId || requestId.trim().length === 0) {
    throw new Error('requestId is required')
  }
  if (!approvedBy || approvedBy.trim().length === 0) {
    throw new Error('approvedBy is required')
  }

  const requestRef = getLegalRequestDocRef(requestId)
  const requestSnap = await getDoc(requestRef)

  if (!requestSnap.exists()) {
    throw new Error('Legal request not found')
  }

  const requestData = requestSnap.data() as LegalRequest

  if (requestData.status !== 'pending_legal_review') {
    throw new Error('Request is not in pending status')
  }

  const approvedAt = new Date()

  await updateDoc(requestRef, {
    status: 'approved',
    approvedBy,
    approvedAt,
  })

  return {
    status: 'approved',
    approvedBy,
    approvedAt,
  }
}

/**
 * Deny a pending legal request.
 *
 * ADMIN/LEGAL ONLY - Marks request as denied with reason.
 *
 * @param requestId - Legal request ID
 * @param deniedBy - Admin user ID who denied
 * @param denialReason - Reason for denial
 * @returns Denial result
 * @throws Error if request not found or required fields missing
 */
export async function denyLegalRequest(
  requestId: string,
  deniedBy: string,
  denialReason: string
): Promise<DenialResult> {
  if (!requestId || requestId.trim().length === 0) {
    throw new Error('requestId is required')
  }
  if (!deniedBy || deniedBy.trim().length === 0) {
    throw new Error('deniedBy is required')
  }
  if (!denialReason || denialReason.trim().length === 0) {
    throw new Error('denialReason is required')
  }

  const requestRef = getLegalRequestDocRef(requestId)
  const requestSnap = await getDoc(requestRef)

  if (!requestSnap.exists()) {
    throw new Error('Legal request not found')
  }

  const requestData = requestSnap.data() as LegalRequest

  if (requestData.status !== 'pending_legal_review') {
    throw new Error('Request is not in pending status')
  }

  const deniedAt = new Date()

  await updateDoc(requestRef, {
    status: 'denied',
    deniedBy,
    deniedAt,
    denialReason: denialReason.trim(),
  })

  return {
    status: 'denied',
    deniedBy,
    deniedAt,
    denialReason: denialReason.trim(),
  }
}

// ============================================
// Legal Request Fulfillment Functions
// ============================================

/**
 * Fulfill an approved legal request.
 *
 * CRITICAL: Only works for APPROVED requests.
 * NEVER auto-fulfills pending requests.
 * Requires prior human approval via approveLegalRequest.
 *
 * @param requestId - Legal request ID
 * @param fulfilledBy - Admin user ID fulfilling the request
 * @returns Fulfillment result with signal data if successful
 */
export async function fulfillLegalRequest(
  requestId: string,
  fulfilledBy: string
): Promise<FulfillmentResult> {
  if (!requestId || requestId.trim().length === 0) {
    throw new Error('requestId is required')
  }
  if (!fulfilledBy || fulfilledBy.trim().length === 0) {
    throw new Error('fulfilledBy is required')
  }

  const requestRef = getLegalRequestDocRef(requestId)
  const requestSnap = await getDoc(requestRef)

  if (!requestSnap.exists()) {
    return {
      success: false,
      signalData: null,
      error: 'Legal request not found',
    }
  }

  const requestData = requestSnap.data() as LegalRequest

  // CRITICAL: Only fulfill approved requests
  if (requestData.status === 'pending_legal_review') {
    return {
      success: false,
      signalData: null,
      error: 'Request must be approved before fulfillment',
    }
  }

  if (requestData.status === 'denied') {
    return {
      success: false,
      signalData: null,
      error: 'Request was denied',
    }
  }

  if (requestData.status === 'fulfilled') {
    return {
      success: false,
      signalData: null,
      error: 'Request already fulfilled',
    }
  }

  // Fetch sealed signal data
  const signalData: SealedSignalData[] = []

  for (const signalId of requestData.signalIds) {
    const sealedRef = getSealedSignalDocRef(signalId)
    const sealedSnap = await getDoc(sealedRef)

    if (sealedSnap.exists()) {
      signalData.push(sealedSnap.data() as SealedSignalData)
    }
  }

  // Mark request as fulfilled
  const fulfilledAt = new Date()

  await updateDoc(requestRef, {
    status: 'fulfilled',
    fulfilledAt,
    fulfilledBy,
  })

  return {
    success: true,
    signalData,
  }
}

// ============================================
// Legal Request Retrieval Functions
// ============================================

/**
 * Get a legal request by ID.
 *
 * ADMIN/LEGAL ONLY.
 *
 * @param requestId - Legal request ID
 * @returns Legal request or null if not found
 */
export async function getLegalRequest(requestId: string): Promise<LegalRequest | null> {
  if (!requestId || requestId.trim().length === 0) {
    throw new Error('requestId is required')
  }

  const requestRef = getLegalRequestDocRef(requestId)
  const requestSnap = await getDoc(requestRef)

  if (!requestSnap.exists()) {
    return null
  }

  return requestSnap.data() as LegalRequest
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate a legal request object using Zod schema.
 *
 * @param request - Legal request to validate
 * @returns True if valid
 */
export function validateLegalRequest(request: LegalRequest): boolean {
  if (!request) {
    return false
  }

  // Use Zod schema for validation (consistent with other services)
  const result = legalRequestSchema.safeParse(request)
  return result.success
}
