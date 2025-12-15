'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { severParentAccess, VerificationChecklist } from '@/lib/admin-api'

interface SeverParentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
  verificationChecklist: VerificationChecklist
  onSuccess: () => void
}

/**
 * SeverParentDialog - CRITICAL SAFETY COMPONENT
 *
 * This dialog allows safety team members to sever a parent's access
 * to their family data. This is a life-safety feature used to protect
 * abuse victims.
 *
 * IMPORTANT BEHAVIORS:
 * - Requires verified identity (accountOwnershipVerified OR idMatched)
 * - Requires explicit user/family IDs and documented reason
 * - Shows multiple confirmation steps with warnings
 * - Severed parent sees "No families found" NOT "You've been removed"
 * - No notifications are sent to any party
 */
export function SeverParentDialog({
  open,
  onOpenChange,
  requestId,
  verificationChecklist,
  onSuccess,
}: SeverParentDialogProps) {
  const [step, setStep] = useState<'input' | 'confirm' | 'success' | 'error'>(
    'input'
  )
  const [targetUserId, setTargetUserId] = useState('')
  const [familyId, setFamilyId] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationText, setConfirmationText] = useState('')

  // Check if minimum verification is complete
  const hasMinimumVerification =
    verificationChecklist.accountOwnershipVerified ||
    verificationChecklist.idMatched

  const canProceed =
    hasMinimumVerification &&
    targetUserId.trim().length > 0 &&
    familyId.trim().length > 0 &&
    reason.trim().length >= 20 // Minimum 20 characters for compliance

  const handleClose = () => {
    setStep('input')
    setTargetUserId('')
    setFamilyId('')
    setReason('')
    setConfirmationText('')
    setError(null)
    onOpenChange(false)
  }

  const handleProceedToConfirm = () => {
    if (canProceed) {
      setStep('confirm')
    }
  }

  const handleExecuteSevering = async () => {
    if (confirmationText !== 'SEVER ACCESS') {
      setError('Please type SEVER ACCESS to confirm')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await severParentAccess(
        requestId,
        targetUserId.trim(),
        familyId.trim(),
        reason.trim()
      )
      setStep('success')
      onSuccess()
    } catch (err) {
      console.error('Error severing parent access:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to sever parent access. Please try again.'
      )
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 'input' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-red-600">
                Sever Parent Access
              </DialogTitle>
              <DialogDescription>
                This action will permanently remove a parent&apos;s access to
                their family data. This is irreversible and should only be used
                for verified safety requests.
              </DialogDescription>
            </DialogHeader>

            {!hasMinimumVerification && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-medium">
                  Identity Verification Required
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Before severing access, you must verify the requester&apos;s
                  identity by checking either &quot;Account Ownership
                  Verified&quot; or &quot;ID Matched&quot; in the verification
                  checklist.
                </p>
              </div>
            )}

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="targetUserId">Target Parent User ID</Label>
                <Input
                  id="targetUserId"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="Enter the parent's user ID"
                  disabled={!hasMinimumVerification}
                />
                <p className="text-xs text-muted-foreground">
                  The Firebase Auth UID of the parent to sever
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="familyId">Family ID</Label>
                <Input
                  id="familyId"
                  value={familyId}
                  onChange={(e) => setFamilyId(e.target.value)}
                  placeholder="Enter the family ID"
                  disabled={!hasMinimumVerification}
                />
                <p className="text-xs text-muted-foreground">
                  The Firestore document ID of the family
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Severing (min. 20 characters)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide detailed reason including verification method and safety concerns..."
                  rows={3}
                  disabled={!hasMinimumVerification}
                />
                <p className="text-xs text-muted-foreground">
                  Provide a detailed reason including: verification method, legal
                  basis, and safety concerns. This will be recorded in the sealed
                  audit log for compliance. ({reason.length}/20 min characters)
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleProceedToConfirm}
                disabled={!canProceed}
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-red-600">
                Confirm Severing Action
              </DialogTitle>
              <DialogDescription>
                Please review and confirm this irreversible action.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-red-800">
                  You are about to:
                </p>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                  <li>Remove all family access for user: {targetUserId}</li>
                  <li>This action cannot be undone</li>
                  <li>The parent will see &quot;No families found&quot;</li>
                  <li>No notification will be sent</li>
                  <li>This will be logged for compliance</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmationText">
                  Type <span className="font-mono font-bold">SEVER ACCESS</span>{' '}
                  to confirm
                </Label>
                <Input
                  id="confirmationText"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="SEVER ACCESS"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setStep('input')
                  setConfirmationText('')
                }}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleExecuteSevering}
                disabled={loading || confirmationText !== 'SEVER ACCESS'}
              >
                {loading ? 'Severing...' : 'Execute Severing'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-green-600">
                Access Severed Successfully
              </DialogTitle>
              <DialogDescription>
                The parent&apos;s access has been removed.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  Parent{' '}
                  <strong>
                    {targetUserId.slice(0, 8)}...{targetUserId.slice(-4)}
                  </strong>{' '}
                  has been severed from family{' '}
                  <strong>
                    {familyId.slice(0, 8)}...{familyId.slice(-4)}
                  </strong>
                  .
                </p>
                <p className="text-sm text-green-700 mt-2">
                  Full details have been recorded in the sealed admin audit log.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        )}

        {step === 'error' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-red-600">
                Severing Failed
              </DialogTitle>
              <DialogDescription>
                An error occurred while severing access.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setStep('confirm')
                  setError(null)
                }}
              >
                Try Again
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
