'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useReauthentication } from '@/hooks/useReauthentication'
import { useRemoveChild } from '@/hooks/useRemoveChild'
import { AlertTriangle, Loader2 } from 'lucide-react'

/**
 * Props for the RemoveChildConfirmDialog component
 */
export interface RemoveChildConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Called when the dialog should be closed */
  onOpenChange: (open: boolean) => void
  /** ID of the child to remove */
  childId: string
  /** ID of the family */
  familyId: string
  /** First name of the child (for confirmation) */
  childName: string
  /** Full name of the child (for display) */
  childFullName: string
  /** Called when removal is successful */
  onSuccess?: (result: {
    childId: string
    devicesUnenrolled: number
    screenshotsDeleted: number
  }) => void
  /** Called when removal fails */
  onError?: (error: Error) => void
}

/**
 * Current step in the removal flow
 */
type RemovalStep = 'confirm' | 'reauth' | 'removing' | 'success' | 'error'

/**
 * RemoveChildConfirmDialog Component
 *
 * A multi-step confirmation dialog for removing a child from a family.
 * Requires the user to:
 * 1. Read and acknowledge the data deletion warning
 * 2. Type the child's name to confirm
 * 3. Re-authenticate with Google Sign-In
 *
 * Story 2.6: Remove Child from Family
 *
 * Accessibility features:
 * - Focus trapped within dialog
 * - Escape key closes dialog (except during removal)
 * - Proper ARIA roles and labels
 * - 44x44px touch targets (NFR49)
 * - 6th-grade reading level text (NFR65)
 * - aria-live announcements for state changes
 *
 * @example
 * ```tsx
 * <RemoveChildConfirmDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   childId="child-123"
 *   familyId="family-456"
 *   childName="Emma"
 *   childFullName="Emma Smith"
 *   onSuccess={(result) => router.push('/dashboard')}
 * />
 * ```
 */
export function RemoveChildConfirmDialog({
  open,
  onOpenChange,
  childId,
  familyId,
  childName,
  childFullName,
  onSuccess,
  onError,
}: RemoveChildConfirmDialogProps) {
  const [step, setStep] = useState<RemovalStep>('confirm')
  const [confirmationText, setConfirmationText] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  const {
    reauthenticate,
    loading: reauthLoading,
    error: reauthError,
    clearError: clearReauthError,
  } = useReauthentication()

  const {
    removeChild,
    loading: removeLoading,
    error: removeError,
    clearError: clearRemoveError,
  } = useRemoveChild()

  // Check if confirmation text matches (case-insensitive)
  const isConfirmationValid = confirmationText.toLowerCase() === childName.toLowerCase()

  // Combined loading state
  const isLoading = reauthLoading || removeLoading

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep('confirm')
      setConfirmationText('')
      setLocalError(null)
      clearReauthError()
      clearRemoveError()
    }
  }, [open, clearReauthError, clearRemoveError])

  // Focus input when dialog opens
  useEffect(() => {
    if (open && step === 'confirm') {
      // Small delay to ensure dialog is rendered
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [open, step])

  /**
   * Handle the confirmation and re-authentication flow
   */
  const handleConfirm = useCallback(async () => {
    if (!isConfirmationValid) {
      setLocalError('Please type the name exactly as shown.')
      return
    }

    setLocalError(null)
    setStep('reauth')

    try {
      // Step 1: Re-authenticate
      const token = await reauthenticate()

      setStep('removing')

      // Step 2: Remove child
      const result = await removeChild(childId, familyId, confirmationText, token)

      setStep('success')

      // Call success callback
      onSuccess?.({
        childId: result.childId,
        devicesUnenrolled: result.devicesUnenrolled,
        screenshotsDeleted: result.screenshotsDeleted,
      })

      // Close dialog after short delay to show success message
      setTimeout(() => {
        onOpenChange(false)
      }, 1500)
    } catch (err) {
      setStep('error')
      const error = err instanceof Error ? err : new Error('Something went wrong. Please try again.')
      onError?.(error)
    }
  }, [
    isConfirmationValid,
    reauthenticate,
    removeChild,
    childId,
    familyId,
    confirmationText,
    onSuccess,
    onError,
    onOpenChange,
  ])

  /**
   * Handle cancel - reset and close
   */
  const handleCancel = useCallback(() => {
    if (isLoading) return // Prevent closing during removal
    onOpenChange(false)
  }, [isLoading, onOpenChange])

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    setStep('confirm')
    setLocalError(null)
    clearReauthError()
    clearRemoveError()
  }, [clearReauthError, clearRemoveError])

  /**
   * Handle input change
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmationText(e.target.value)
    setLocalError(null)
  }, [])

  /**
   * Handle Enter key in input
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && isConfirmationValid && !isLoading) {
        handleConfirm()
      }
    },
    [isConfirmationValid, isLoading, handleConfirm]
  )

  // Get the current error message
  const errorMessage = localError || reauthError?.message || removeError?.message

  return (
    <Dialog open={open} onOpenChange={isLoading ? undefined : onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => {
          if (isLoading) e.preventDefault()
        }}
        onInteractOutside={(e) => {
          if (isLoading) e.preventDefault()
        }}
      >
        {/* Confirm Step */}
        {(step === 'confirm' || step === 'reauth' || step === 'removing') && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                Remove {childFullName}?
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 pt-2">
                  {/* Warning section */}
                  <div
                    className="rounded-md border border-destructive/50 bg-destructive/10 p-3"
                    role="alert"
                    aria-label="Warning about permanent data deletion"
                  >
                    <p className="text-sm font-medium text-destructive">
                      This cannot be undone.
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      When you remove {childName}, all of their data will be deleted forever:
                    </p>
                    <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                      <li>Screenshots and activity logs</li>
                      <li>Device enrollments</li>
                      <li>Agreements and settings</li>
                    </ul>
                  </div>

                  {/* Confirmation input */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmation-input" className="text-sm">
                      Type <span className="font-semibold">{childName}</span> to confirm:
                    </Label>
                    <Input
                      id="confirmation-input"
                      ref={inputRef}
                      type="text"
                      value={confirmationText}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder={childName}
                      disabled={isLoading}
                      aria-invalid={!!localError}
                      aria-describedby={localError ? 'confirmation-error' : undefined}
                      className="min-h-[44px]"
                      autoComplete="off"
                    />
                    {localError && (
                      <p
                        id="confirmation-error"
                        className="text-sm text-destructive"
                        role="alert"
                      >
                        {localError}
                      </p>
                    )}
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="min-h-[44px]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirm}
                disabled={!isConfirmationValid || isLoading}
                className="min-h-[44px]"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {step === 'reauth' && 'Signing in...'}
                {step === 'removing' && 'Removing...'}
                {step === 'confirm' && 'Remove Child'}
              </Button>
            </DialogFooter>

            {/* Live region for screen readers */}
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              {step === 'reauth' && 'Please sign in with Google to confirm.'}
              {step === 'removing' && 'Removing child and deleting data. Please wait.'}
            </div>
          </>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-green-600">Child Removed</DialogTitle>
              <DialogDescription>
                {childFullName} has been removed from your family. All their data has been deleted.
              </DialogDescription>
            </DialogHeader>

            {/* Live region for screen readers */}
            <div className="sr-only" aria-live="assertive" aria-atomic="true">
              {childFullName} has been successfully removed from your family.
            </div>
          </>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                Could Not Remove Child
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2">
                  <p className="text-sm text-destructive">{errorMessage}</p>
                  <p className="text-sm text-muted-foreground">
                    No data was deleted. You can try again.
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
              <Button
                type="button"
                variant="default"
                onClick={handleRetry}
                className="min-h-[44px]"
              >
                Try Again
              </Button>
            </DialogFooter>

            {/* Live region for screen readers */}
            <div className="sr-only" aria-live="assertive" aria-atomic="true">
              Error: {errorMessage}. No data was deleted. You can try again.
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
