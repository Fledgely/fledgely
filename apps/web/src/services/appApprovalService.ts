/**
 * App Approval Service.
 *
 * Story 24.3: Explicit Approval of Categories - AC2, AC5, AC7
 *
 * Provides functions for managing per-child, per-app category approvals.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { AppCategoryApproval, ConcernCategory, AppApprovalStatus } from '@fledgely/shared'
import { appCategoryApprovalSchema } from '@fledgely/shared'

/**
 * Get all app approvals for a child.
 *
 * Story 24.3: Explicit Approval of Categories - AC5
 *
 * @param childId - Child to get approvals for
 * @returns Array of app category approvals
 */
export async function getChildAppApprovals(childId: string): Promise<AppCategoryApproval[]> {
  const db = getFirestoreDb()
  const approvalsRef = collection(db, 'children', childId, 'appApprovals')
  const snapshot = await getDocs(approvalsRef)

  return snapshot.docs.map((doc) => doc.data() as AppCategoryApproval)
}

/**
 * Subscribe to app approvals for a child.
 *
 * Story 24.3: Explicit Approval of Categories - AC5
 *
 * @param childId - Child to subscribe to
 * @param callback - Called with updated approvals
 * @param onError - Called if subscription fails
 * @returns Unsubscribe function
 */
export function subscribeToChildAppApprovals(
  childId: string,
  callback: (approvals: AppCategoryApproval[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const db = getFirestoreDb()
  const approvalsRef = collection(db, 'children', childId, 'appApprovals')
  const q = query(approvalsRef)

  return onSnapshot(
    q,
    (snapshot) => {
      const approvals = snapshot.docs.map((doc) => doc.data() as AppCategoryApproval)
      callback(approvals)
    },
    (error) => {
      if (onError) {
        onError(error)
      }
    }
  )
}

/**
 * Set an app category approval for a child.
 *
 * Story 24.3: Explicit Approval of Categories - AC2, AC7
 *
 * @param params - Approval parameters
 * @returns The saved approval
 */
export async function setAppCategoryApproval(params: {
  childId: string
  familyId: string
  appIdentifier: string
  appDisplayName: string
  category: ConcernCategory
  status: AppApprovalStatus
  setByUid: string
  notes?: string
}): Promise<AppCategoryApproval> {
  const db = getFirestoreDb()
  const now = Date.now()

  // Generate ID from app identifier and category for upsert behavior
  const approvalId = `${params.appIdentifier}_${params.category}`.replace(/[^a-zA-Z0-9_-]/g, '_')

  const approvalRef = doc(db, 'children', params.childId, 'appApprovals', approvalId)

  const approval: AppCategoryApproval = {
    id: approvalId,
    childId: params.childId,
    familyId: params.familyId,
    appIdentifier: params.appIdentifier,
    appDisplayName: params.appDisplayName,
    category: params.category,
    status: params.status,
    setByUid: params.setByUid,
    createdAt: now,
    updatedAt: now,
    notes: params.notes,
  }

  // Validate approval data before saving
  const parseResult = appCategoryApprovalSchema.safeParse(approval)
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
    throw new Error(`Invalid approval data: ${errorMessage}`)
  }

  await setDoc(approvalRef, approval)

  return approval
}

/**
 * Remove an app category approval.
 *
 * Story 24.3: Explicit Approval of Categories - AC2
 *
 * @param childId - Child the approval belongs to
 * @param appIdentifier - App identifier
 * @param category - Concern category
 */
export async function removeAppCategoryApproval(
  childId: string,
  appIdentifier: string,
  category: ConcernCategory
): Promise<void> {
  const db = getFirestoreDb()
  const approvalId = `${appIdentifier}_${category}`.replace(/[^a-zA-Z0-9_-]/g, '_')
  const approvalRef = doc(db, 'children', childId, 'appApprovals', approvalId)

  await deleteDoc(approvalRef)
}

/**
 * Get app approvals grouped by app identifier.
 *
 * Story 24.3: Explicit Approval of Categories - AC1
 * Useful for displaying in UI grouped by app.
 *
 * @param approvals - Array of approvals
 * @returns Map of appIdentifier to approvals array
 */
export function groupApprovalsByApp(
  approvals: AppCategoryApproval[]
): Map<string, AppCategoryApproval[]> {
  const grouped = new Map<string, AppCategoryApproval[]>()

  for (const approval of approvals) {
    const existing = grouped.get(approval.appIdentifier) || []
    existing.push(approval)
    grouped.set(approval.appIdentifier, existing)
  }

  return grouped
}
