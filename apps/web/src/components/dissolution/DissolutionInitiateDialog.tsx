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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useReauthentication } from '@/hooks/useReauthentication'
import { useDissolution } from '@/hooks/useDissolution'
import {
  getDataHandlingOptionLabel,
  getDataHandlingOptionDescription,
  type DataHandlingOption,
  type FamilyDissolution,
  COOLING_PERIOD_DAYS,
} from '@fledgely/contracts'
import { AlertTriangle, Loader2, Info, Calendar, CheckCircle } from 'lucide-react'

/**
 * Props for the DissolutionInitiateDialog component
 */
export interface DissolutionInitiateDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Called when the dialog should be closed */
  onOpenChange: (open: boolean) => void
  /** ID of the family */
  familyId: string
  /** Whether family has multiple guardians (shared custody) */
  isSharedCustody: boolean
  /** Number of guardians in the family */
  guardianCount: number
  /** Called when dissolution is successfully initiated */
  onSuccess?: (result: FamilyDissolution) => void
  /** Called when dissolution fails */
  onError?: (error: Error) => void
}

/**
 * Current step in the dissolution flow
 */
type DissolutionStep = 'explain' | 'options' | 'reauth' | 'processing' | 'success' | 'error'

/**
 * DissolutionInitiateDialog Component
 *
 * A multi-step dialog for initiating family dissolution.
 * Steps:
 * 1. Explanation of what dissolution means
 * 2. Data handling options selection
 * 3. Re-authentication
 * 4. Processing/Success/Error
 *
 * Story 2.7: Family Dissolution Initiation
 *
 * Accessibility features:
 * - Focus trapped within dialog
 * - Escape key closes dialog (except during processing)
 * - Proper ARIA roles and labels
 * - 44x44px touch targets (NFR49)
 * - 6th-grade reading level text (NFR65)
 * - aria-live announcements for state changes
 */
export function DissolutionInitiateDialog({
  open,
  onOpenChange,
  familyId,
  isSharedCustody,
  guardianCount,
  onSuccess,
  onError,
}: DissolutionInitiateDialogProps) {
  const [step, setStep] = useState<DissolutionStep>('explain')
  const [selectedOption, setSelectedOption] = useState<DataHandlingOption>('retain_90_days')
  const [localError, setLocalError] = useState<string | null>(null)

  const {
    reauthenticate,
    loading: reauthLoading,
    error: reauthError,
    clearError: clearReauthError,
  } = useReauthentication()

  const {
    initiateDissolution,
    loading: dissolutionLoading,
    error: dissolutionError,
    clearError: clearDissolutionError,
    dissolution,
  } = useDissolution()

  // Combined loading state
  const isLoading = reauthLoading || dissolutionLoading

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep('explain')
      setSelectedOption('retain_90_days') // Default to least destructive
      setLocalError(null)
      clearReauthError()
      clearDissolutionError()
    }
  }, [open, clearReauthError, clearDissolutionError])

  /**
   * Handle proceeding to options step
   */
  const handleProceedToOptions = useCallback(() => {
    setStep('options')
  }, [])

  /**
   * Handle the confirmation and re-authentication flow
   */
  const handleConfirm = useCallback(async () => {
    setLocalError(null)
    setStep('reauth')

    try {
      // Step 1: Re-authenticate
      const token = await reauthenticate()

      setStep('processing')

      // Step 2: Initiate dissolution
      const result = await initiateDissolution(familyId, selectedOption, token)

      setStep('success')

      // Call success callback
      onSuccess?.(result)
    } catch (err) {
      setStep('error')
      const error = err instanceof Error ? err : new Error('Something went wrong. Please try again.')
      onError?.(error)
    }
  }, [reauthenticate, initiateDissolution, familyId, selectedOption, onSuccess, onError])

  /**
   * Handle cancel - reset and close
   */
  const handleCancel = useCallback(() => {
    if (isLoading) return
    onOpenChange(false)
  }, [isLoading, onOpenChange])

  /**
   * Handle going back to previous step
   */
  const handleBack = useCallback(() => {
    if (step === 'options') {
      setStep('explain')
    }
  }, [step])

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    setStep('options')
    setLocalError(null)
    clearReauthError()
    clearDissolutionError()
  }, [clearReauthError, clearDissolutionError])

  /**
   * Handle closing success dialog
   */
  const handleSuccessClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  // Get the current error message
  const errorMessage = localError || reauthError?.message || dissolutionError?.message

  // Calculate expected deletion date
  const expectedDeletionDate = new Date()
  expectedDeletionDate.setDate(expectedDeletionDate.getDate() + COOLING_PERIOD_DAYS)

  return (
    <Dialog open={open} onOpenChange={isLoading ? undefined : onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onEscapeKeyDown={(e) => {
          if (isLoading) e.preventDefault()
        }}
        onInteractOutside={(e) => {
          if (isLoading) e.preventDefault()
        }}
      >
        {/* Step 1: Explanation */}
        {step === 'explain' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                Dissolve Family?
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-4 pt-2">
                  {/* Main warning */}
                  <div
                    className="rounded-md border border-destructive/50 bg-destructive/10 p-3"
                    role="alert"
                    aria-label="Important warning about family dissolution"
                  >
                    <p className="text-sm font-medium text-destructive">
                      This will permanently delete your family.
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      All family data and child profiles will be deleted after a waiting period.
                    </p>
                  </div>

                  {/* What happens section */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">What happens when you dissolve:</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span>
                          <strong>{COOLING_PERIOD_DAYS}-day waiting period</strong> - You can cancel
                          anytime during this period
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span>
                          <strong>All data deleted</strong> - Child profiles, screenshots, devices,
                          and settings
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span>
                          <strong>Cannot be undone</strong> - After the waiting period, deletion is
                          permanent
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Shared custody notice */}
                  {isSharedCustody && (
                    <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3">
                      <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                        Shared custody family
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        All {guardianCount} guardians will be notified. The waiting period won&apos;t
                        begin until everyone acknowledges this request.
                      </p>
                    </div>
                  )}
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
              <Button
                type="button"
                variant="destructive"
                onClick={handleProceedToOptions}
                className="min-h-[44px]"
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Data Handling Options */}
        {step === 'options' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" aria-hidden="true" />
                How should we handle your data?
              </DialogTitle>
              <DialogDescription>
                Choose what happens to your family data during the {COOLING_PERIOD_DAYS}-day waiting
                period.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <RadioGroup
                value={selectedOption}
                onValueChange={(value) => setSelectedOption(value as DataHandlingOption)}
                className="space-y-3"
              >
                {/* Option 1: Delete All (most destructive - NOT default) */}
                <div className="flex items-start space-x-3 rounded-md border border-destructive/30 p-3">
                  <RadioGroupItem
                    value="delete_all"
                    id="option-delete"
                    className="mt-1 min-h-[20px] min-w-[20px]"
                  />
                  <Label htmlFor="option-delete" className="flex-1 cursor-pointer">
                    <span className="font-medium text-destructive">
                      {getDataHandlingOptionLabel('delete_all')}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {getDataHandlingOptionDescription('delete_all')}
                    </p>
                  </Label>
                </div>

                {/* Option 2: Export First */}
                <div className="flex items-start space-x-3 rounded-md border p-3">
                  <RadioGroupItem
                    value="export_first"
                    id="option-export"
                    className="mt-1 min-h-[20px] min-w-[20px]"
                  />
                  <Label htmlFor="option-export" className="flex-1 cursor-pointer">
                    <span className="font-medium">
                      {getDataHandlingOptionLabel('export_first')}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {getDataHandlingOptionDescription('export_first')}
                    </p>
                  </Label>
                </div>

                {/* Option 3: Retain 90 Days (default - least destructive) */}
                <div className="flex items-start space-x-3 rounded-md border border-green-500/30 bg-green-500/5 p-3">
                  <RadioGroupItem
                    value="retain_90_days"
                    id="option-retain"
                    className="mt-1 min-h-[20px] min-w-[20px]"
                  />
                  <Label htmlFor="option-retain" className="flex-1 cursor-pointer">
                    <span className="font-medium text-green-700 dark:text-green-400">
                      {getDataHandlingOptionLabel('retain_90_days')} (Recommended)
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {getDataHandlingOptionDescription('retain_90_days')}
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="min-h-[44px]"
              >
                Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirm}
                className="min-h-[44px]"
              >
                Confirm Dissolution
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 3: Re-authentication / Processing */}
        {(step === 'reauth' || step === 'processing') && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                {step === 'reauth' ? 'Confirming your identity...' : 'Starting dissolution...'}
              </DialogTitle>
              <DialogDescription>
                {step === 'reauth'
                  ? 'Please sign in with Google to confirm this action.'
                  : 'Please wait while we process your request.'}
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            </div>

            {/* Live region for screen readers */}
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              {step === 'reauth' && 'Please sign in with Google to confirm.'}
              {step === 'processing' && 'Processing dissolution request. Please wait.'}
            </div>
          </>
        )}

        {/* Step 4: Success */}
        {step === 'success' && dissolution && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" aria-hidden="true" />
                Dissolution Started
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 pt-2">
                  <p className="text-sm">
                    Your family dissolution has been initiated.
                    {dissolution.status === 'pending_acknowledgment' && (
                      <span>
                        {' '}
                        Other guardians need to acknowledge before the waiting period begins.
                      </span>
                    )}
                  </p>

                  {dissolution.scheduledDeletionAt && (
                    <div className="rounded-md border bg-muted/50 p-3">
                      <p className="text-sm font-medium">Expected deletion date:</p>
                      <p className="text-lg font-semibold">
                        {dissolution.scheduledDeletionAt.toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">
                    Changed your mind? Any guardian can cancel the dissolution from Family Settings
                    during the waiting period.
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
              Dissolution has been started successfully.
              {dissolution.scheduledDeletionAt &&
                ` Data will be deleted on ${dissolution.scheduledDeletionAt.toLocaleDateString()}.`}
            </div>
          </>
        )}

        {/* Step 5: Error */}
        {step === 'error' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                Could Not Start Dissolution
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2">
                  <p className="text-sm text-destructive">{errorMessage}</p>
                  <p className="text-sm text-muted-foreground">
                    No changes were made. You can try again.
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
              Error: {errorMessage}. No changes were made. You can try again.
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
