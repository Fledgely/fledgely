'use client'

/**
 * useCaregiverAccessLog Hook - Story 19A.3, Story 19D.3
 *
 * Logs caregiver access to the quick view for FR19D-X compliance.
 * Story 19D.3: Now writes to Firestore via dataViewAuditService.
 *
 * Dependencies:
 * - dataViewAuditService: Writes to /auditLogs collection
 * - AuthContext: Provides caregiver UID
 * - FamilyContext: Provides family ID
 */

import { useEffect, useRef, useContext, createContext } from 'react'
import { logDataViewNonBlocking } from '../services/dataViewAuditService'

/**
 * Type of caregiver access action to log
 */
export type CaregiverAccessAction = 'view' | 'call_parent'

/**
 * Access log entry structure
 */
export interface CaregiverAccessLogEntry {
  action: CaregiverAccessAction
  timestamp: Date
  caregiverId: string | null
  childrenViewed: string[]
}

/**
 * Context for providing caregiver context to logging hook
 * This allows the hook to get user/family info without direct context imports
 * (which would cause circular dependencies or SSR issues)
 */
export interface CaregiverLogContext {
  viewerUid: string | null
  familyId: string | null
}

/**
 * Default context value
 */
const defaultCaregiverLogContext: CaregiverLogContext = {
  viewerUid: null,
  familyId: null,
}

/**
 * Context for caregiver logging - set by CaregiverQuickView
 */
export const CaregiverLogContextProvider = createContext<CaregiverLogContext>(
  defaultCaregiverLogContext
)

/**
 * Hook to log caregiver access for FR19D-X compliance
 *
 * Story 19D.3: Writes to Firestore audit log with:
 * - viewerUid: Caregiver's UID from auth
 * - childId: Each child viewed (logged separately for granular tracking)
 * - familyId: From family context
 * - dataType: 'caregiver_status'
 * - metadata: { action, viewerRole: 'caregiver' }
 *
 * @param action - The type of action being logged ('view' or 'call_parent')
 * @param childrenViewed - List of child IDs being viewed
 * @param viewerUid - Optional viewer UID (from auth context)
 * @param familyId - Optional family ID (from family context)
 *
 * Usage:
 * ```typescript
 * useCaregiverAccessLog('view', ['child-1', 'child-2'], user?.uid, family?.id)
 * ```
 */
export function useCaregiverAccessLog(
  action: CaregiverAccessAction,
  childrenViewed: string[] = [],
  viewerUid?: string | null,
  familyId?: string | null
): void {
  // Use ref to prevent duplicate logs - persists across re-renders and strict mode
  const hasLogged = useRef(false)

  // Get context if params not provided
  const logContext = useContext(CaregiverLogContextProvider)
  const effectiveViewerUid = viewerUid ?? logContext.viewerUid
  const effectiveFamilyId = familyId ?? logContext.familyId

  // Serialize children for stable dependency comparison
  const childrenKey = childrenViewed.sort().join(',')

  useEffect(() => {
    // Prevent duplicate logging in React Strict Mode and on re-renders
    if (hasLogged.current) {
      return
    }

    // Must have viewer UID and family ID to log to Firestore
    if (!effectiveViewerUid || !effectiveFamilyId) {
      // Still mark as logged to prevent retries when context loads
      // Development logging for debugging
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('[Caregiver Access Log] Skipped - missing context:', {
          viewerUid: effectiveViewerUid,
          familyId: effectiveFamilyId,
        })
      }
      return
    }

    hasLogged.current = true

    // Story 19D.3: Log each child viewed separately for granular tracking
    // This allows queries like "how many times did Grandpa view Emma this week"
    if (childrenViewed.length > 0) {
      childrenViewed.forEach((childId) => {
        logDataViewNonBlocking({
          viewerUid: effectiveViewerUid,
          childId,
          familyId: effectiveFamilyId,
          dataType: 'caregiver_status',
          metadata: {
            action,
            viewerRole: 'caregiver',
          },
        })
      })
    } else {
      // Log family-level view if no specific children
      logDataViewNonBlocking({
        viewerUid: effectiveViewerUid,
        childId: null,
        familyId: effectiveFamilyId,
        dataType: 'caregiver_status',
        metadata: {
          action,
          viewerRole: 'caregiver',
        },
      })
    }

    // Development logging for debugging
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[Caregiver Access Log] Written to Firestore:', {
        action,
        viewerUid: effectiveViewerUid,
        familyId: effectiveFamilyId,
        childrenViewed,
        timestamp: new Date().toISOString(),
      })
    }

    // Note: No cleanup to reset ref - we only want to log once per component lifecycle
    // The ref will be reset naturally when the component unmounts and remounts
  }, [action, childrenKey, childrenViewed, effectiveViewerUid, effectiveFamilyId])
}

/**
 * Log a one-time caregiver action (non-hook version for event handlers)
 *
 * Story 19D.3: Writes to Firestore audit log
 *
 * @param action - The type of action being logged
 * @param childrenViewed - List of child IDs being viewed
 * @param viewerUid - Viewer UID from auth context
 * @param familyId - Family ID from family context
 */
export function logCaregiverAction(
  action: CaregiverAccessAction,
  childrenViewed: string[] = [],
  viewerUid?: string | null,
  familyId?: string | null
): void {
  // Must have viewer UID and family ID to log to Firestore
  if (!viewerUid || !familyId) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[Caregiver Action Log] Skipped - missing context:', {
        viewerUid,
        familyId,
      })
    }
    return
  }

  // Log each child viewed separately
  if (childrenViewed.length > 0) {
    childrenViewed.forEach((childId) => {
      logDataViewNonBlocking({
        viewerUid,
        childId,
        familyId,
        dataType: 'caregiver_status',
        metadata: {
          action,
          viewerRole: 'caregiver',
        },
      })
    })
  } else {
    logDataViewNonBlocking({
      viewerUid,
      childId: null,
      familyId,
      dataType: 'caregiver_status',
      metadata: {
        action,
        viewerRole: 'caregiver',
      },
    })
  }

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[Caregiver Action Log] Written to Firestore:', {
      action,
      viewerUid,
      familyId,
      childrenViewed,
      timestamp: new Date().toISOString(),
    })
  }
}
