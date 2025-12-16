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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useInvitation } from '@/hooks/useInvitation'
import { InvitationLink } from './InvitationLink'
import { SendInvitationEmail } from './SendInvitationEmail'
import {
  getTimeUntilExpiry,
  type InvitationExpiryDays,
  type Invitation,
} from '@fledgely/contracts'
import { Loader2, UserPlus, AlertCircle, CheckCircle, Clock, Mail } from 'lucide-react'

/**
 * Props for the InvitationDialog component
 */
export interface InvitationDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Called when the dialog should be closed */
  onOpenChange: (open: boolean) => void
  /** ID of the family */
  familyId: string
  /** Name of the family (for display) */
  familyName: string
  /** Called when invitation is successfully created */
  onSuccess?: (invitationLink: string) => void
  /** Called when invitation creation fails */
  onError?: (error: Error) => void
}

/**
 * Current step in the invitation flow
 */
type InvitationStep = 'configure' | 'processing' | 'success' | 'existing' | 'error'

/**
 * Expiry option labels at 6th-grade reading level
 */
const EXPIRY_OPTIONS: Array<{ value: InvitationExpiryDays; label: string }> = [
  { value: '1', label: '1 day' },
  { value: '3', label: '3 days' },
  { value: '7', label: '1 week' },
  { value: '14', label: '2 weeks' },
  { value: '30', label: '1 month' },
]

/**
 * InvitationDialog Component
 *
 * A multi-step dialog for creating co-parent invitations.
 * Steps:
 * 1. Configure: Select expiry time and confirm intent
 * 2. Processing: Creating invitation
 * 3. Success: Show invitation link with copy button
 *
 * If an existing pending invitation exists, shows that instead.
 *
 * Story 3.1: Co-Parent Invitation Generation
 *
 * Accessibility features:
 * - Focus trapped within dialog
 * - Escape key closes dialog (except during processing)
 * - Proper ARIA roles and labels
 * - 44x44px touch targets (NFR49)
 * - 6th-grade reading level text (NFR65)
 * - aria-live announcements for state changes
 */
export function InvitationDialog({
  open,
  onOpenChange,
  familyId,
  familyName,
  onSuccess,
  onError,
}: InvitationDialogProps) {
  const [step, setStep] = useState<InvitationStep>('configure')
  const [expiryDays, setExpiryDays] = useState<InvitationExpiryDays>('7')

  const {
    invitation,
    existingInvitation,
    loading,
    checkingExisting,
    error,
    createInvitation,
    checkExistingInvitation,
    revokeInvitation,
    clearError,
    resetInvitation,
    // Story 3.2: Email delivery
    emailSending,
    emailSent,
    emailError,
    emailInfo,
    sendEmail,
    clearEmailState,
    canSendEmail,
  } = useInvitation()

  // Check for existing invitation when dialog opens
  useEffect(() => {
    if (open && familyId) {
      checkExistingInvitation(familyId).then((result) => {
        if (result.exists && result.invitation) {
          setStep('existing')
        } else {
          setStep('configure')
        }
      })
    }
  }, [open, familyId, checkExistingInvitation])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('configure')
      setExpiryDays('7')
      clearError()
      resetInvitation()
      clearEmailState()
    }
  }, [open, clearError, resetInvitation, clearEmailState])

  /**
   * Handle creating a new invitation
   */
  const handleCreate = useCallback(async () => {
    setStep('processing')

    try {
      const result = await createInvitation(familyId, expiryDays)
      setStep('success')
      onSuccess?.(result.invitationLink)
    } catch (err) {
      setStep('error')
      const error = err instanceof Error ? err : new Error('Something went wrong. Please try again.')
      onError?.(error)
    }
  }, [createInvitation, familyId, expiryDays, onSuccess, onError])

  /**
   * Handle revoking existing invitation and creating new one
   */
  const handleRevokeAndCreate = useCallback(async () => {
    if (!existingInvitation) return

    setStep('processing')

    try {
      await revokeInvitation(existingInvitation.id)
      const result = await createInvitation(familyId, expiryDays)
      setStep('success')
      onSuccess?.(result.invitationLink)
    } catch (err) {
      setStep('error')
      const error = err instanceof Error ? err : new Error('Something went wrong. Please try again.')
      onError?.(error)
    }
  }, [revokeInvitation, createInvitation, existingInvitation, familyId, expiryDays, onSuccess, onError])

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    clearError()
    setStep('configure')
  }, [clearError])

  /**
   * Handle sending invitation email
   * Story 3.2: Invitation Delivery
   */
  const handleSendEmail = useCallback(
    async (email: string) => {
      if (!invitation) return

      await sendEmail(
        invitation.invitation.id,
        email,
        invitation.invitationLink
      )
    },
    [invitation, sendEmail]
  )

  /**
   * Close the dialog safely (prevent closing during processing)
   */
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (step === 'processing') {
        return // Don't close during processing
      }
      onOpenChange(newOpen)
    },
    [step, onOpenChange]
  )

  /**
   * Render the configuration step
   */
  const renderConfigureStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" aria-hidden="true" />
          Invite Co-Parent
        </DialogTitle>
        <DialogDescription>
          Create a link to invite someone to join {familyName}. They will have full access to your family.
        </DialogDescription>
      </DialogHeader>

      <div className="py-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="expiry-select" className="text-sm font-medium">
            Link expires in
          </Label>
          <Select
            value={expiryDays}
            onValueChange={(value) => setExpiryDays(value as InvitationExpiryDays)}
          >
            <SelectTrigger
              id="expiry-select"
              className="w-full min-h-[44px]"
              aria-label="Select expiry time"
            >
              <SelectValue placeholder="Select expiry" />
            </SelectTrigger>
            <SelectContent>
              {EXPIRY_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="min-h-[44px]"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            After this time, the link will no longer work.
          </p>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="min-h-[44px] min-w-[44px]"
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          className="min-h-[44px] min-w-[44px]"
        >
          Create Invitation
        </Button>
      </DialogFooter>
    </>
  )

  /**
   * Render the processing step
   */
  const renderProcessingStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          Creating Invitation...
        </DialogTitle>
      </DialogHeader>

      <div className="py-8 flex justify-center" role="status" aria-live="polite">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">
            Please wait while we create your invitation link.
          </p>
        </div>
      </div>
    </>
  )

  /**
   * Render the success step
   * Story 3.2: Updated to include email delivery option
   */
  const renderSuccessStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" aria-hidden="true" />
          Invitation Created!
        </DialogTitle>
        <DialogDescription>
          Share this link with the person you want to invite, or send it by email.
        </DialogDescription>
      </DialogHeader>

      <div className="py-4 space-y-6" role="status" aria-live="polite">
        {invitation && (
          <>
            {/* Invitation link section */}
            <InvitationLink
              invitationLink={invitation.invitationLink}
              expiresAt={invitation.invitation.expiresAt}
            />

            {/* Story 3.2: Email delivery section */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-medium">Or send by email</span>
              </div>
              <SendInvitationEmail
                onSendEmail={handleSendEmail}
                sending={emailSending}
                sent={emailSent}
                error={emailError}
                canSend={canSendEmail()}
                lastSentTo={emailInfo?.emailSentTo}
              />
            </div>
          </>
        )}
      </div>

      <DialogFooter>
        <Button
          onClick={() => onOpenChange(false)}
          className="min-h-[44px] min-w-[44px]"
        >
          Done
        </Button>
      </DialogFooter>
    </>
  )

  /**
   * Render the existing invitation step
   */
  const renderExistingStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" aria-hidden="true" />
          Pending Invitation
        </DialogTitle>
        <DialogDescription>
          You already have a pending invitation. You can cancel it and create a new one.
        </DialogDescription>
      </DialogHeader>

      <div className="py-4 space-y-4">
        {existingInvitation && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>
                Expires in: <strong>{getTimeUntilExpiry(existingInvitation.expiresAt)}</strong>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Created by {existingInvitation.invitedByName}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="new-expiry-select" className="text-sm font-medium">
            New link expires in
          </Label>
          <Select
            value={expiryDays}
            onValueChange={(value) => setExpiryDays(value as InvitationExpiryDays)}
          >
            <SelectTrigger
              id="new-expiry-select"
              className="w-full min-h-[44px]"
              aria-label="Select expiry time for new invitation"
            >
              <SelectValue placeholder="Select expiry" />
            </SelectTrigger>
            <SelectContent>
              {EXPIRY_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="min-h-[44px]"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="min-h-[44px] min-w-[44px]"
        >
          Keep Current
        </Button>
        <Button
          variant="destructive"
          onClick={handleRevokeAndCreate}
          className="min-h-[44px] min-w-[44px]"
        >
          Cancel & Create New
        </Button>
      </DialogFooter>
    </>
  )

  /**
   * Render the error step
   */
  const renderErrorStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
          Something Went Wrong
        </DialogTitle>
      </DialogHeader>

      <div className="py-4" role="alert" aria-live="assertive">
        <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">
            {error || 'Could not create invitation. Please try again.'}
          </p>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="min-h-[44px] min-w-[44px]"
        >
          Close
        </Button>
        <Button
          onClick={handleRetry}
          className="min-h-[44px] min-w-[44px]"
        >
          Try Again
        </Button>
      </DialogFooter>
    </>
  )

  /**
   * Render loading state while checking for existing invitation
   */
  const renderCheckingStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          Loading...
        </DialogTitle>
      </DialogHeader>

      <div className="py-8 flex justify-center" role="status" aria-live="polite">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">
            Checking for existing invitations...
          </p>
        </div>
      </div>
    </>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => {
          if (step === 'processing') {
            e.preventDefault()
          }
        }}
        onEscapeKeyDown={(e) => {
          if (step === 'processing') {
            e.preventDefault()
          }
        }}
      >
        {checkingExisting && renderCheckingStep()}
        {!checkingExisting && step === 'configure' && renderConfigureStep()}
        {!checkingExisting && step === 'processing' && renderProcessingStep()}
        {!checkingExisting && step === 'success' && renderSuccessStep()}
        {!checkingExisting && step === 'existing' && renderExistingStep()}
        {!checkingExisting && step === 'error' && renderErrorStep()}
      </DialogContent>
    </Dialog>
  )
}
