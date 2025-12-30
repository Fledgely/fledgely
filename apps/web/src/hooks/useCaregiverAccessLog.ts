'use client'

/**
 * useCaregiverAccessLog Hook - Story 19A.3
 *
 * Logs caregiver access to the quick view for FR19D-X compliance.
 * Currently stubs logging until Epic 19D.3 provides full audit infrastructure.
 *
 * Dependencies:
 * - Epic 19D.3 (Caregiver Access Audit Logging) - Required for full FR19D-X compliance
 *
 * For MVP Implementation:
 * - Console logs access events
 * - TODO comments for Epic 19D integration
 */

import { useEffect, useRef } from 'react'

/**
 * Type of caregiver access action to log
 */
export type CaregiverAccessAction = 'view' | 'call_parent'

/**
 * Access log entry structure (for future Firebase implementation)
 */
export interface CaregiverAccessLogEntry {
  action: CaregiverAccessAction
  timestamp: Date
  caregiverId: string | null
  childrenViewed: string[]
}

/**
 * Hook to log caregiver access for FR19D-X compliance
 *
 * @param action - The type of action being logged ('view' or 'call_parent')
 * @param childrenViewed - Optional list of child IDs being viewed
 *
 * Usage:
 * ```typescript
 * useCaregiverAccessLog('view', ['child-1', 'child-2'])
 * ```
 */
export function useCaregiverAccessLog(
  action: CaregiverAccessAction,
  childrenViewed: string[] = []
): void {
  // Use ref to prevent duplicate logs - persists across re-renders and strict mode
  const hasLogged = useRef(false)

  // Serialize children for stable dependency comparison
  const childrenKey = childrenViewed.sort().join(',')

  useEffect(() => {
    // Prevent duplicate logging in React Strict Mode and on re-renders
    if (hasLogged.current) {
      return
    }

    hasLogged.current = true

    // Create log entry
    const logEntry: CaregiverAccessLogEntry = {
      action,
      timestamp: new Date(),
      caregiverId: null, // TODO: Get from auth context when Epic 19D provides it
      childrenViewed,
    }

    // TODO: Replace with Firebase function call when Epic 19D.3 is complete
    // Future implementation:
    // await httpsCallable(functions, 'logCaregiverAccess')(logEntry)

    // Current stub: Console log for development visibility
    if (process.env.NODE_ENV === 'development') {
      console.log('[Caregiver Access Log]', {
        action: logEntry.action,
        timestamp: logEntry.timestamp.toISOString(),
        childrenViewed: logEntry.childrenViewed,
      })
    }

    // Note: No cleanup to reset ref - we only want to log once per component lifecycle
    // The ref will be reset naturally when the component unmounts and remounts
  }, [action, childrenKey, childrenViewed])
}

/**
 * Log a one-time caregiver action (non-hook version for event handlers)
 *
 * @param action - The type of action being logged
 * @param childrenViewed - Optional list of child IDs being viewed
 */
export function logCaregiverAction(
  action: CaregiverAccessAction,
  childrenViewed: string[] = []
): void {
  const logEntry: CaregiverAccessLogEntry = {
    action,
    timestamp: new Date(),
    caregiverId: null, // TODO: Get from auth context when Epic 19D provides it
    childrenViewed,
  }

  // TODO: Replace with Firebase function call when Epic 19D.3 is complete
  if (process.env.NODE_ENV === 'development') {
    console.log('[Caregiver Action Log]', {
      action: logEntry.action,
      timestamp: logEntry.timestamp.toISOString(),
      childrenViewed: logEntry.childrenViewed,
    })
  }
}
