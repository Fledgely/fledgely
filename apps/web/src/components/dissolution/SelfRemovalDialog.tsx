'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useReauthentication } from '@/hooks/useReauthentication'
import { useSelfRemoval } from '@/hooks/useSelfRemoval'
import { DomesticAbuseResources } from '@/components/safety/DomesticAbuseResources'
import { AlertTriangle, Loader2, CheckCircle, ShieldAlert } from 'lucide-react'
import type { SelfRemovalResult } from '@fledgely/contracts'

/**
 * Props for the SelfRemovalDialog component
 */
export interface SelfRemovalDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Called when the dialog should be closed */
  onOpenChange: (open: boolean) => void
  /** ID of the family */
  familyId: string
  /** Called when self-removal is successfully completed */
  onSuccess?: (result: SelfRemovalResult) => void
  /** Called when self-removal fails */
  onError?: (error: Error) => void
}

/**
 * Current step in the self-removal flow
 */
type SelfRemovalStep =
  | 'explain' // Step 1: Explain what self-removal means
  | 'single-guardian-warning' // Only if user is single guardian
  | 'reauth' // Step 2: Re-authentication
  | 'processing' // Step 3: Processing
  | 'success' // Step 4: Success with resources

/**
 * SelfRemovalDialog Component
 *
 * A multi-step dialog for guardian self-removal (survivor escape).
 * Steps:
 * 1. Explanation of what self-removal means
 * 2. Single guardian warning (if applicable)
 * 3. Re-authentication
 * 4. Processing/Success with domestic abuse resources
 *
 * Story 2.8: Unilateral Self-Removal (Survivor Escape)
 *
 * CRITICAL: This is a life-safety feature:
 * - NO notification to other family members
 * - NO 30-day waiting period
 * - Immediate effect
 * - Domestic abuse resources shown on success
 *
 * Accessibility features:
 * - Focus trapped within dialog
 * - Escape key closes dialog (except during processing)
 * - Proper ARIA roles and labels
 * - 44x44px touch targets (NFR49)
 * - 6th-grade reading level text (NFR65)
 * - aria-live announcements for state changes
 */
export function SelfRemovalDialog({
  open,
  onOpenChange,
  familyId,
  onSuccess,
  onError,
}: SelfRemovalDialogProps) {
  const [step, setStep] = useState<SelfRemovalStep>('explain')
  const [localError, setLocalError] = useState<string | null>(null)
  const [acknowledgeNoReturn, setAcknowledgeNoReturn] = useState(false)
  const [acknowledgeSingleGuardian, setAcknowledgeSingleGuardian] = useState(false)

  const {
    reauthenticate,
    loading: reauthLoading,
    error: reauthError,
    clearError: clearReauthError,
  } = useReauthentication()

  const {
    removeSelf,
    checkCanRemove,
    loading: removalLoading,
    error: removalError,
    clearError: clearRemovalError,
    isSingleGuardian,
    removalResult,
  } = useSelfRemoval()

  // Combined loading state
  const isLoading = reauthLoading || removalLoading

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep('explain')
      setLocalError(null)
      setAcknowledgeNoReturn(false)
      setAcknowledgeSingleGuardian(false)
      clearReauthError()
      clearRemovalError()
    }
  }, [open, clearReauthError, clearRemovalError])

  /**
   * Handle proceeding to re-authentication
   */
  const handleProceed = useCallback(async () => {
    setLocalError(null)

    try {
      // Check if user can remove self (and if they're single guardian)
      const { canRemove, isSingleGuardian: isSingle, reason } = await checkCanRemove(familyId)

      if (!canRemove) {
        setLocalError(
          reason === 'not-a-guardian'
            ? 'You are not a member of this family.'
            : 'Could not process your request. Please try again.'
        )
        return
      }

      // If single guardian and haven't acknowledged, show warning
      if (isSingle && !acknowledgeSingleGuardian) {
        setStep('single-guardian-warning')
        return
      }

      // Proceed to re-auth
      setStep('reauth')
      await performRemoval()
    } catch (err) {
      setLocalError('Something went wrong. Please try again.')
    }
  }, [checkCanRemove, familyId, acknowledgeSingleGuardian])

  /**
   * Handle single guardian warning acknowledgment
   */
  const handleAcknowledgeSingleGuardian = useCallback(async () => {
    setAcknowledgeSingleGuardian(true)
    setStep('reauth')
    await performRemoval()
  }, [])

  /**
   * Perform the actual removal with re-authentication
   */
  const performRemoval = useCallback(async () => {
    try {
      // Step 1: Re-authenticate
      const token = await reauthenticate()

      setStep('processing')

      // Step 2: Remove self from family
      const result = await removeSelf(familyId, token)

      setStep('success')

      // Call success callback
      onSuccess?.(result)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStep('explain') // Go back to explain step on error
      const error = err instanceof Error ? err : new Error('Something went wrong. Please try again.')
      onError?.(error)
    }
  }, [reauthenticate, removeSelf, familyId, onSuccess, onError])

  /**
   * Handle cancel - reset and close
   */
  const handleCancel = useCallback(() => {
    if (!isLoading) {
      onOpenChange(false)
    }
  }, [isLoading, onOpenChange])

  /**
   * Handle close after success
   */
  const handleCloseSuccess = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  /**
   * Render step content
   */
  const renderContent = () => {
    switch (step) {
      case 'explain':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-yellow-600" aria-hidden="true" />
                Remove Yourself From This Family
              </DialogTitle>
              <DialogDescription className="sr-only">
                Remove yourself from this family. This action takes effect immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4" aria-live="polite">
              <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-950">
                <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                  What happens when you leave:
                </h3>
                <ul className="mt-2 space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-yellow-600" />
                    Your access will be removed immediately
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-yellow-600" />
                    You will no longer see any family data
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-yellow-600" />
                    The family continues to exist for other members
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-yellow-600" />
                    Child data remains safe with other guardian(s)
                  </li>
                </ul>
              </div>

              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Important:</strong> No one else in the family will be notified that
                  you left. Your departure will be private.
                </p>
              </div>

              {localError && (
                <div
                  className="rounded-lg bg-red-50 p-4 dark:bg-red-950"
                  role="alert"
                  aria-live="assertive"
                >
                  <p className="text-sm text-red-700 dark:text-red-300">{localError}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="acknowledge-no-return"
                  checked={acknowledgeNoReturn}
                  onChange={(e) => setAcknowledgeNoReturn(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="acknowledge-no-return"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  I understand this cannot be undone
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="min-h-[44px] min-w-[44px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleProceed}
                disabled={!acknowledgeNoReturn || isLoading}
                className="min-h-[44px] min-w-[100px] bg-yellow-600 hover:bg-yellow-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Please wait...
                  </>
                ) : (
                  'Remove Myself'
                )}
              </Button>
            </DialogFooter>
          </>
        )

      case 'single-guardian-warning':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
                You Are The Only Guardian
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4" aria-live="polite">
              <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <strong>Warning:</strong> You are the only guardian of this family. If you leave:
                </p>
                <ul className="mt-2 space-y-2 text-sm text-red-700 dark:text-red-300">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-600" />
                    Children will have no guardian
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-600" />
                    The family will be flagged for support review
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-600" />
                    Child accounts will remain but need a new guardian
                  </li>
                </ul>
              </div>

              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Consider:</strong> If you want to close everything, use Family Dissolution
                  instead. That will properly handle all family data.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="min-h-[44px] min-w-[44px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAcknowledgeSingleGuardian}
                disabled={isLoading}
                className="min-h-[44px] min-w-[100px] bg-red-600 hover:bg-red-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Please wait...
                  </>
                ) : (
                  'Leave Anyway'
                )}
              </Button>
            </DialogFooter>
          </>
        )

      case 'reauth':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Your Identity</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-8" aria-live="polite">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Please confirm your identity with Google Sign-In...
              </p>
            </div>
          </>
        )

      case 'processing':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Removing Your Access</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-8" aria-live="polite">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Please wait while we process your request...
              </p>
            </div>
          </>
        )

      case 'success':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
                You Have Been Removed
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4" aria-live="polite">
              <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950">
                <p className="text-sm text-green-800 dark:text-green-200">
                  Your access has been removed. You are no longer part of this family.
                </p>
                <p className="mt-2 text-sm text-green-700 dark:text-green-300">
                  No one has been notified about your departure. Your data is no longer visible
                  to other family members.
                </p>
              </div>

              {/* Domestic Abuse Resources - Critical for survivor support */}
              <DomesticAbuseResources />
            </div>

            <DialogFooter>
              <Button
                onClick={handleCloseSuccess}
                className="min-h-[44px] min-w-[100px] w-full"
              >
                Close
              </Button>
            </DialogFooter>
          </>
        )

      default:
        return null
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={isLoading || step === 'success' ? undefined : onOpenChange}
    >
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => {
          if (isLoading || step === 'success') {
            e.preventDefault()
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isLoading || step === 'processing') {
            e.preventDefault()
          }
        }}
      >
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}
