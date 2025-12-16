/**
 * usePreviewFlow Hook
 *
 * Story 5.5: Agreement Preview & Summary - Task 8
 *
 * Manages the flow between agreement builder, preview, and signing.
 * Gates access to each phase based on session state.
 *
 * Flow: Builder → Preview (scroll required) → Signing
 */

import { useState, useCallback, useMemo } from 'react'
import type { CoCreationSession, SessionContributor } from '@fledgely/contracts'
import { canProceedToSigning } from '@fledgely/contracts'
import { useCanProceedToSigning, type SigningGateResult } from './useCanProceedToSigning'

// ============================================
// TYPES
// ============================================

/**
 * Preview flow phases
 */
export type PreviewFlowPhase = 'builder' | 'preview' | 'signing'

/**
 * Scroll completion state for both contributors
 */
export interface ScrollCompletionState {
  parentComplete: boolean
  childComplete: boolean
  parentProgress: number
  childProgress: number
}

/**
 * Preview flow navigation result
 */
export interface PreviewFlowResult {
  /** Current phase in the flow */
  currentPhase: PreviewFlowPhase
  /** Whether user can proceed from builder to preview */
  canProceedToPreview: boolean
  /** Result from useCanProceedToSigning for builder → preview gating */
  signingGate: SigningGateResult
  /** Scroll completion state */
  scrollState: ScrollCompletionState
  /** Whether both contributors have completed scroll */
  canProceedToSigning: boolean
  /** Message explaining current gate status */
  gateMessage: string
  /** Navigate to builder phase */
  goToBuilder: () => void
  /** Navigate to preview phase (if allowed) */
  goToPreview: () => boolean
  /** Navigate to signing phase (if allowed) */
  goToSigning: () => boolean
  /** Update scroll completion for a contributor */
  updateScrollCompletion: (contributor: SessionContributor, complete: boolean, progress?: number) => void
  /** Reset scroll completion state */
  resetScrollState: () => void
}

/**
 * Options for usePreviewFlow hook
 */
export interface UsePreviewFlowOptions {
  /** Initial phase (default: 'builder') */
  initialPhase?: PreviewFlowPhase
  /** Callback when phase changes */
  onPhaseChange?: (phase: PreviewFlowPhase, previousPhase: PreviewFlowPhase) => void
  /** Callback when navigation is blocked */
  onNavigationBlocked?: (targetPhase: PreviewFlowPhase, reason: string) => void
}

// ============================================
// INITIAL STATE
// ============================================

const initialScrollState: ScrollCompletionState = {
  parentComplete: false,
  childComplete: false,
  parentProgress: 0,
  childProgress: 0,
}

// ============================================
// HOOK
// ============================================

/**
 * usePreviewFlow Hook
 *
 * Manages navigation flow between builder, preview, and signing phases.
 *
 * @param session - The co-creation session
 * @param options - Configuration options
 * @returns Flow state and navigation functions
 *
 * @example
 * ```tsx
 * const {
 *   currentPhase,
 *   canProceedToPreview,
 *   canProceedToSigning,
 *   goToPreview,
 *   goToSigning,
 *   updateScrollCompletion
 * } = usePreviewFlow(session)
 *
 * return currentPhase === 'builder' ? (
 *   <VisualAgreementBuilder />
 * ) : currentPhase === 'preview' ? (
 *   <AgreementPreview />
 * ) : (
 *   <SigningPage />
 * )
 * ```
 */
export function usePreviewFlow(
  session: CoCreationSession | null | undefined,
  options: UsePreviewFlowOptions = {}
): PreviewFlowResult {
  const { initialPhase = 'builder', onPhaseChange, onNavigationBlocked } = options

  // Current phase state
  const [currentPhase, setCurrentPhase] = useState<PreviewFlowPhase>(initialPhase)

  // Scroll completion state
  const [scrollState, setScrollState] = useState<ScrollCompletionState>(initialScrollState)

  // Use signing gate from Story 5.4 for builder → preview gating
  const signingGate = useCanProceedToSigning(session)

  // Calculate derived states
  const canProceedToPreview = signingGate.canProceed
  const canProceedToSigningPhase = scrollState.parentComplete && scrollState.childComplete

  // Generate appropriate gate message
  const gateMessage = useMemo(() => {
    if (currentPhase === 'builder') {
      return signingGate.message
    }
    if (currentPhase === 'preview') {
      if (!scrollState.parentComplete && !scrollState.childComplete) {
        return 'Both parent and child need to read the entire agreement.'
      }
      if (!scrollState.parentComplete) {
        return 'Parent needs to finish reading the agreement.'
      }
      if (!scrollState.childComplete) {
        return 'Child needs to finish reading the agreement.'
      }
      return 'Ready to proceed to signing.'
    }
    return ''
  }, [currentPhase, signingGate.message, scrollState])

  // Navigate to builder
  const goToBuilder = useCallback(() => {
    if (currentPhase !== 'builder') {
      const previousPhase = currentPhase
      setCurrentPhase('builder')
      onPhaseChange?.('builder', previousPhase)
    }
  }, [currentPhase, onPhaseChange])

  // Navigate to preview (if allowed)
  const goToPreview = useCallback((): boolean => {
    if (!canProceedToPreview) {
      onNavigationBlocked?.('preview', signingGate.message)
      return false
    }
    if (currentPhase !== 'preview') {
      const previousPhase = currentPhase
      setCurrentPhase('preview')
      onPhaseChange?.('preview', previousPhase)
    }
    return true
  }, [canProceedToPreview, currentPhase, signingGate.message, onPhaseChange, onNavigationBlocked])

  // Navigate to signing (if allowed)
  const goToSigning = useCallback((): boolean => {
    if (!canProceedToSigningPhase) {
      const reason = !scrollState.parentComplete
        ? 'Parent has not completed reading.'
        : 'Child has not completed reading.'
      onNavigationBlocked?.('signing', reason)
      return false
    }
    if (currentPhase !== 'signing') {
      const previousPhase = currentPhase
      setCurrentPhase('signing')
      onPhaseChange?.('signing', previousPhase)
    }
    return true
  }, [canProceedToSigningPhase, scrollState, currentPhase, onPhaseChange, onNavigationBlocked])

  // Update scroll completion
  const updateScrollCompletion = useCallback(
    (contributor: SessionContributor, complete: boolean, progress?: number) => {
      setScrollState((prev) => ({
        ...prev,
        [`${contributor}Complete`]: complete,
        [`${contributor}Progress`]: progress ?? (complete ? 100 : prev[`${contributor}Progress` as keyof ScrollCompletionState] as number),
      }))
    },
    []
  )

  // Reset scroll state
  const resetScrollState = useCallback(() => {
    setScrollState(initialScrollState)
  }, [])

  return {
    currentPhase,
    canProceedToPreview,
    signingGate,
    scrollState,
    canProceedToSigning: canProceedToSigningPhase,
    gateMessage,
    goToBuilder,
    goToPreview,
    goToSigning,
    updateScrollCompletion,
    resetScrollState,
  }
}

export default usePreviewFlow
