/**
 * SignalConfirmationWithSafeAdult Component - Story 7.5.4 Task 7
 *
 * Integrates safe adult designation with signal confirmation flow.
 * AC1: Safe adult notification option
 * AC2: Notification to safe adult
 * AC3: Pre-configured safe adult
 *
 * CRITICAL SAFETY:
 * - Uses child-appropriate language (6th-grade reading level)
 * - Does NOT mention fledgely or monitoring
 * - Skip option is always available
 */

'use client'

import { useState, useCallback } from 'react'
import type { ConfirmationContent, SignalCrisisResource } from '@fledgely/shared'
import type { SafeAdultDesignation as SafeAdultDesignationType } from '@fledgely/shared/contracts/safeAdult'
import SignalConfirmationUI from './SignalConfirmationUI'
import { SafeAdultDesignation } from './SafeAdultDesignation'

// ============================================
// Types
// ============================================

export interface SignalConfirmationWithSafeAdultProps {
  /** Signal ID */
  signalId: string
  /** Child ID */
  childId: string
  /** Confirmation content */
  content: ConfirmationContent
  /** Crisis resources to show */
  resources: SignalCrisisResource[]
  /** Called when entire flow completes */
  onDismiss: () => void
  /** Called when safe adult is designated */
  onSafeAdultDesignated: (designation: SafeAdultDesignationType) => void
  /** Called when safe adult is skipped */
  onSafeAdultSkipped: () => void
  /** Called when resource is clicked */
  onResourceClick?: (resource: SignalCrisisResource) => void
  /** Pre-configured safe adult (AC3) */
  preConfiguredAdult: SafeAdultDesignationType | null
  /** Whether the confirmation is open */
  isOpen?: boolean
}

type FlowStep = 'confirmation' | 'safe-adult'

// ============================================
// Component
// ============================================

export function SignalConfirmationWithSafeAdult({
  signalId,
  childId,
  content,
  resources,
  onDismiss,
  onSafeAdultDesignated,
  onSafeAdultSkipped,
  onResourceClick,
  preConfiguredAdult,
  isOpen = true,
}: SignalConfirmationWithSafeAdultProps): JSX.Element | null {
  const [currentStep, setCurrentStep] = useState<FlowStep>('confirmation')
  const [isProcessing, setIsProcessing] = useState(false)

  /**
   * Handle confirmation dismiss - transition to safe adult step.
   */
  const handleConfirmationDismiss = useCallback(() => {
    setCurrentStep('safe-adult')
  }, [])

  /**
   * Handle safe adult designation.
   */
  const handleDesignate = useCallback(
    async (designation: SafeAdultDesignationType) => {
      setIsProcessing(true)
      try {
        await onSafeAdultDesignated(designation)
        onDismiss()
      } finally {
        setIsProcessing(false)
      }
    },
    [onSafeAdultDesignated, onDismiss]
  )

  /**
   * Handle skipping safe adult designation.
   */
  const handleSkip = useCallback(() => {
    onSafeAdultSkipped()
    onDismiss()
  }, [onSafeAdultSkipped, onDismiss])

  if (!isOpen) {
    return null
  }

  // Render based on current step
  if (currentStep === 'confirmation') {
    return (
      <SignalConfirmationUI
        content={content}
        resources={resources}
        onDismiss={handleConfirmationDismiss}
        onResourceClick={onResourceClick}
        isOpen={true}
      />
    )
  }

  // Safe adult designation step
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" aria-hidden="true" />
      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 z-50 mx-4 max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl"
      >
        <SafeAdultDesignation
          signalId={signalId}
          childId={childId}
          preConfiguredAdult={preConfiguredAdult}
          onDesignate={handleDesignate}
          onSkip={handleSkip}
          isProcessing={isProcessing}
        />
      </div>
    </>
  )
}
