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
import {
  getDataHandlingOptionLabel,
  type FamilyDissolution,
  COOLING_PERIOD_DAYS,
} from '@fledgely/contracts'
import { AlertTriangle, Loader2, Info, CheckCircle } from 'lucide-react'

/**
 * Props for the DissolutionAcknowledgeDialog component
 */
export interface DissolutionAcknowledgeDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Called when the dialog should be closed */
  onOpenChange: (open: boolean) => void
  /** ID of the family */
  familyId: string
  /** Name of the guardian who initiated dissolution */
  initiatorName: string
  /** When dissolution was initiated */
  initiatedAt: Date
  /** Selected data handling option */
  dataHandlingOption: FamilyDissolution['dataHandlingOption']
  /** Called when acknowledgment is successful */
  onSuccess?: (result: FamilyDissolution) => void
  /** Called when acknowledgment fails */
  onError?: (error: Error) => void
}

/**
 * Current step in the acknowledgment flow
 */
type AcknowledgeStep = 'info' | 'processing' | 'success' | 'error'

/**
 * DissolutionAcknowledgeDialog Component
 *
 * Dialog for co-guardians to acknowledge a dissolution request.
 * Acknowledging means they understand the dissolution is happening,
 * NOT that they approve of it.
 *
 * Story 2.7: Family Dissolution Initiation
 *
 * Accessibility features:
 * - Focus trapped within dialog
 * - Proper ARIA roles and labels
 * - 44x44px touch targets (NFR49)
 * - 6th-grade reading level text (NFR65)
 */
export function DissolutionAcknowledgeDialog({
  open,
  onOpenChange,
  familyId,
  initiatorName,
  initiatedAt,
  dataHandlingOption,
  onSuccess,
  onError,
}: DissolutionAcknowledgeDialogProps) {
  const [step, setStep] = useState<AcknowledgeStep>('info')

  const {
    acknowledgeDissolution,
    loading,
    error: dissolutionError,
    clearError,
    dissolution,
  } = useDissolution()

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep('info')
      clearError()
    }
  }, [open, clearError])

  /**
   * Handle acknowledgment
   */
  const handleAcknowledge = useCallback(async () => {
    setStep('processing')

    try {
      const result = await acknowledgeDissolution(familyId)
      setStep('success')
      onSuccess?.(result)
    } catch (err) {
      setStep('error')
      const error = err instanceof Error ? err : new Error('Something went wrong. Please try again.')
      onError?.(error)
    }
  }, [acknowledgeDissolution, familyId, onSuccess, onError])

  /**
   * Handle cancel - just close
   */
  const handleCancel = useCallback(() => {
    if (loading) return
    onOpenChange(false)
  }, [loading, onOpenChange])

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    setStep('info')
    clearError()
  }, [clearError])

  /**
   * Handle closing success dialog
   */
  const handleSuccessClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

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
        {/* Info Step */}
        {step === 'info' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                Acknowledge Dissolution Request
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-4 pt-2">
                  {/* Who initiated */}
                  <div className="rounded-md border bg-muted/50 p-3">
                    <p className="text-sm">
                      <span className="font-semibold">{initiatorName}</span> has requested to
                      dissolve this family.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Requested on{' '}
                      {initiatedAt.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  {/* What acknowledgment means */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">What does acknowledging mean?</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span>
                          You understand that the family will be dissolved
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span>
                          The {COOLING_PERIOD_DAYS}-day waiting period will begin once all guardians
                          acknowledge
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span>
                          You can still <strong>cancel</strong> the dissolution during the waiting
                          period
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Data handling choice */}
                  <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
                    <p className="text-sm font-medium">Data handling choice:</p>
                    <p className="text-sm text-muted-foreground">
                      {getDataHandlingOptionLabel(dataHandlingOption)}
                    </p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="min-h-[44px]"
              >
                Not Now
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleAcknowledge}
                className="min-h-[44px]"
              >
                I Understand - Acknowledge
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
                Recording acknowledgment...
              </DialogTitle>
              <DialogDescription>Please wait.</DialogDescription>
            </DialogHeader>

            <div className="py-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            </div>

            {/* Live region for screen readers */}
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              Recording your acknowledgment. Please wait.
            </div>
          </>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" aria-hidden="true" />
                Acknowledged
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2 pt-2">
                  <p className="text-sm">
                    Your acknowledgment has been recorded.
                  </p>

                  {dissolution?.status === 'cooling_period' && (
                    <p className="text-sm">
                      All guardians have acknowledged. The {COOLING_PERIOD_DAYS}-day waiting period
                      has begun.
                    </p>
                  )}

                  {dissolution?.status === 'pending_acknowledgment' && (
                    <p className="text-sm text-muted-foreground">
                      Waiting for other guardians to acknowledge.
                    </p>
                  )}

                  <p className="text-sm text-muted-foreground">
                    Remember: You can cancel the dissolution anytime from Family Settings.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button type="button" onClick={handleSuccessClose} className="min-h-[44px]">
                Done
              </Button>
            </DialogFooter>

            {/* Live region for screen readers */}
            <div className="sr-only" aria-live="assertive" aria-atomic="true">
              Your acknowledgment has been recorded.
            </div>
          </>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                Could Not Acknowledge
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
                onClick={handleCancel}
                className="min-h-[44px]"
              >
                Cancel
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
