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
import { useDissolution } from '@/hooks/useDissolution'
import { type FamilyDissolution } from '@fledgely/contracts'
import { XCircle, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

/**
 * Props for the DissolutionCancelDialog component
 */
export interface DissolutionCancelDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Called when the dialog should be closed */
  onOpenChange: (open: boolean) => void
  /** ID of the family */
  familyId: string
  /** Current dissolution status */
  dissolution: FamilyDissolution
  /** Called when cancellation is successful */
  onSuccess?: (result: FamilyDissolution) => void
  /** Called when cancellation fails */
  onError?: (error: Error) => void
}

/**
 * Current step in the cancellation flow
 */
type CancelStep = 'confirm' | 'processing' | 'success' | 'error'

/**
 * DissolutionCancelDialog Component
 *
 * Simple confirmation dialog for cancelling an active dissolution.
 * Any guardian can cancel at any time during pending_acknowledgment or cooling_period.
 *
 * Story 2.7: Family Dissolution Initiation
 *
 * Accessibility features:
 * - Focus trapped within dialog
 * - Proper ARIA roles and labels
 * - 44x44px touch targets (NFR49)
 * - 6th-grade reading level text (NFR65)
 */
export function DissolutionCancelDialog({
  open,
  onOpenChange,
  familyId,
  dissolution,
  onSuccess,
  onError,
}: DissolutionCancelDialogProps) {
  const [step, setStep] = useState<CancelStep>('confirm')

  const {
    cancelDissolution,
    loading,
    error: dissolutionError,
    clearError,
  } = useDissolution()

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep('confirm')
      clearError()
    }
  }, [open, clearError])

  /**
   * Handle cancellation
   */
  const handleCancel = useCallback(async () => {
    setStep('processing')

    try {
      const result = await cancelDissolution(familyId)
      setStep('success')
      onSuccess?.(result)
    } catch (err) {
      setStep('error')
      const error = err instanceof Error ? err : new Error('Something went wrong. Please try again.')
      onError?.(error)
    }
  }, [cancelDissolution, familyId, onSuccess, onError])

  /**
   * Handle close - just close without action
   */
  const handleClose = useCallback(() => {
    if (loading) return
    onOpenChange(false)
  }, [loading, onOpenChange])

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    setStep('confirm')
    clearError()
  }, [clearError])

  return (
    <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => {
          if (loading) e.preventDefault()
        }}
        onInteractOutside={(e) => {
          if (loading) e.preventDefault()
        }}
      >
        {/* Confirm Step */}
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5" aria-hidden="true" />
                Cancel Dissolution?
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 pt-2">
                  <p className="text-sm">
                    Are you sure you want to cancel the family dissolution?
                  </p>

                  <div className="rounded-md border bg-muted/50 p-3">
                    <p className="text-sm font-medium">What happens when you cancel:</p>
                    <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                      <li>- Your family will return to normal status</li>
                      <li>- No data will be deleted</li>
                      <li>- All family features continue working</li>
                      <li>- You can start dissolution again later if needed</li>
                    </ul>
                  </div>

                  {dissolution.status === 'pending_acknowledgment' && (
                    <p className="text-sm text-muted-foreground">
                      Note: Dissolution was waiting for all guardians to acknowledge.
                    </p>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="min-h-[44px]"
              >
                Keep Dissolution Active
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleCancel}
                className="min-h-[44px]"
              >
                Yes, Cancel Dissolution
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                Cancelling dissolution...
              </DialogTitle>
              <DialogDescription>Please wait.</DialogDescription>
            </DialogHeader>

            <div className="py-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            </div>

            {/* Live region for screen readers */}
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              Cancelling dissolution. Please wait.
            </div>
          </>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" aria-hidden="true" />
                Dissolution Cancelled
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2 pt-2">
                  <p className="text-sm">
                    The family dissolution has been cancelled.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your family is back to normal status. All features continue working as usual.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button type="button" onClick={handleClose} className="min-h-[44px]">
                Done
              </Button>
            </DialogFooter>

            {/* Live region for screen readers */}
            <div className="sr-only" aria-live="assertive" aria-atomic="true">
              Dissolution has been cancelled. Your family is back to normal.
            </div>
          </>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                Could Not Cancel
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2">
                  <p className="text-sm text-destructive">{dissolutionError?.message}</p>
                  <p className="text-sm text-muted-foreground">
                    Please try again.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="min-h-[44px]"
              >
                Close
              </Button>
              <Button type="button" variant="default" onClick={handleRetry} className="min-h-[44px]">
                Try Again
              </Button>
            </DialogFooter>

            {/* Live region for screen readers */}
            <div className="sr-only" aria-live="assertive" aria-atomic="true">
              Error: {dissolutionError?.message}. Please try again.
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
