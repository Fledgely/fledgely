/**
 * useCanProceedToSigning Hook
 *
 * Story 5.4: Negotiation & Discussion Support - Task 8
 *
 * Checks if all discussion terms are resolved before allowing signing.
 * Returns gating information for the signing flow.
 *
 * AC #6: Agreement cannot proceed to signing with unresolved terms
 */

import { useMemo, useEffect } from 'react'
import type { CoCreationSession, SessionTerm } from '@fledgely/contracts'
import { getUnresolvedDiscussionTerms, getSigningReadiness } from '@fledgely/contracts'

// ============================================
// TYPES
// ============================================

export interface SigningGateResult {
  /** Whether the session can proceed to signing */
  canProceed: boolean
  /** Number of unresolved discussion terms */
  unresolvedCount: number
  /** Array of unresolved term IDs */
  unresolvedTermIds: string[]
  /** Array of unresolved terms (full objects) */
  unresolvedTerms: SessionTerm[]
  /** Human-readable message explaining the gate status */
  message: string
  /** Message for screen readers */
  a11yMessage: string
}

// ============================================
// HOOK
// ============================================

/**
 * Hook to check if a co-creation session can proceed to signing.
 *
 * @param session - The co-creation session to check
 * @returns SigningGateResult with gate status and unresolved term info
 *
 * @example
 * ```tsx
 * const { canProceed, message, unresolvedCount } = useCanProceedToSigning(session)
 *
 * return (
 *   <button disabled={!canProceed}>
 *     Continue to Signing
 *   </button>
 *   {!canProceed && <p>{message}</p>}
 * )
 * ```
 */
export function useCanProceedToSigning(
  session: CoCreationSession | null | undefined
): SigningGateResult {
  return useMemo(() => {
    // Handle null/undefined session
    if (!session) {
      return {
        canProceed: false,
        unresolvedCount: 0,
        unresolvedTermIds: [],
        unresolvedTerms: [],
        message: 'No session available',
        a11yMessage: 'Cannot proceed: No session available',
      }
    }

    // Get unresolved discussion terms using the schema helper
    const unresolvedTerms = getUnresolvedDiscussionTerms(session)
    const unresolvedCount = unresolvedTerms.length
    const unresolvedTermIds = unresolvedTerms.map((t) => t.id)
    const canProceed = unresolvedCount === 0

    // Generate messages
    let message: string
    let a11yMessage: string

    if (canProceed) {
      message = 'Ready to sign'
      a11yMessage = 'All discussion terms resolved. Ready to proceed to signing.'
    } else if (unresolvedCount === 1) {
      message = 'Resolve 1 term before signing'
      a11yMessage = 'Cannot proceed: 1 term still needs discussion.'
    } else {
      message = `Resolve ${unresolvedCount} terms before signing`
      a11yMessage = `Cannot proceed: ${unresolvedCount} terms still need discussion.`
    }

    return {
      canProceed,
      unresolvedCount,
      unresolvedTermIds,
      unresolvedTerms,
      message,
      a11yMessage,
    }
  }, [session])
}

// ============================================
// STANDALONE FUNCTION (for non-React usage)
// ============================================

/**
 * Get signing gate status without React hooks.
 * Useful for validation logic outside of components.
 */
export function getSigningGateStatus(session: CoCreationSession): SigningGateResult {
  const unresolvedTerms = getUnresolvedDiscussionTerms(session)
  const unresolvedCount = unresolvedTerms.length
  const unresolvedTermIds = unresolvedTerms.map((t) => t.id)
  const canProceed = unresolvedCount === 0

  let message: string
  let a11yMessage: string

  if (canProceed) {
    message = 'Ready to sign'
    a11yMessage = 'All discussion terms resolved. Ready to proceed to signing.'
  } else if (unresolvedCount === 1) {
    message = 'Resolve 1 term before signing'
    a11yMessage = 'Cannot proceed: 1 term still needs discussion.'
  } else {
    message = `Resolve ${unresolvedCount} terms before signing`
    a11yMessage = `Cannot proceed: ${unresolvedCount} terms still need discussion.`
  }

  return {
    canProceed,
    unresolvedCount,
    unresolvedTermIds,
    unresolvedTerms,
    message,
    a11yMessage,
  }
}

// ============================================
// SIGNING GATE COMPONENT
// ============================================

export interface SigningGateProps {
  /** The co-creation session */
  session: CoCreationSession | null | undefined
  /** Children to render when can proceed */
  children: React.ReactNode
  /** Content to render when blocked */
  fallback?: React.ReactNode
  /** Callback when gate blocks signing */
  onBlocked?: (unresolvedTerms: SessionTerm[]) => void
}

/**
 * SigningGate Component
 *
 * Wrapper component that conditionally renders signing UI based on
 * whether all discussion terms are resolved.
 *
 * @example
 * ```tsx
 * <SigningGate
 *   session={session}
 *   fallback={<UnresolvedTermsWarning />}
 * >
 *   <SigningForm />
 * </SigningGate>
 * ```
 */
export function SigningGate({
  session,
  children,
  fallback,
  onBlocked,
}: SigningGateProps): React.ReactElement | null {
  const { canProceed, unresolvedTerms, message, a11yMessage } = useCanProceedToSigning(session)

  // Call onBlocked callback when blocked (useEffect prevents render-time side effects)
  useEffect(() => {
    if (!canProceed && onBlocked) {
      onBlocked(unresolvedTerms)
    }
  }, [canProceed, onBlocked, unresolvedTerms])

  if (canProceed) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  // Default blocked message
  return (
    <div
      role="alert"
      aria-live="polite"
      className="p-4 bg-amber-50 border border-amber-200 rounded-lg"
      data-testid="signing-gate-blocked"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">
          ⚠️
        </span>
        <div>
          <p className="font-medium text-amber-800">{message}</p>
          <p className="text-sm text-amber-600 mt-1">
            All terms marked for discussion must be resolved before signing.
          </p>
          <span className="sr-only">{a11yMessage}</span>
        </div>
      </div>
    </div>
  )
}

export default useCanProceedToSigning
