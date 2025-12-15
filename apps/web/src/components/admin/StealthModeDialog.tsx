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
import { activateNotificationStealth, VerificationChecklist } from '@/lib/admin-api'

interface StealthModeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
  verificationChecklist: VerificationChecklist
  onSuccess: () => void
}

/**
 * StealthModeDialog - CRITICAL SAFETY COMPONENT
 *
 * This dialog allows safety team members to activate notification stealth
 * mode for affected users in a family.
 *
 * IMPORTANT BEHAVIORS:
 * - Requires verified identity (accountOwnershipVerified OR idMatched)
 * - Suppresses escape-revealing notifications for 72 hours (configurable)
 * - Holds notifications in sealed stealth queue
 * - After 72 hours, held notifications are permanently deleted
 * - No notifications are sent to any party about stealth activation
 */
export function StealthModeDialog({
  open,
  onOpenChange,
  requestId,
  verificationChecklist,
  onSuccess,
}: StealthModeDialogProps) {
  const [step, setStep] = useState<'input' | 'confirm' | 'success' | 'error'>(
    'input'
  )

  // Input state
  const [familyId, setFamilyId] = useState('')
  const [targetUserIds, setTargetUserIds] = useState<string[]>([''])
  const [reason, setReason] = useState('')
  const [durationHours, setDurationHours] = useState(72)

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationText, setConfirmationText] = useState('')
  const [successResult, setSuccessResult] = useState<{
    queueId: string
    targetUserIds: string[]
    expiresAt: string
    alreadyActive?: boolean
  } | null>(null)

  // Check if minimum verification is complete
  const hasMinimumVerification =
    verificationChecklist.accountOwnershipVerified ||
    verificationChecklist.idMatched

  // Validate all user IDs are filled
  const validUserIds = targetUserIds.filter((id) => id.trim().length > 0)

  const canProceed =
    hasMinimumVerification &&
    familyId.trim().length > 0 &&
    validUserIds.length > 0 &&
    reason.trim().length >= 20 &&
    durationHours >= 24 &&
    durationHours <= 168

  const handleClose = () => {
    setStep('input')
    setFamilyId('')
    setTargetUserIds([''])
    setReason('')
    setDurationHours(72)
    setConfirmationText('')
    setError(null)
    setSuccessResult(null)
    onOpenChange(false)
  }

  const handleAddUser = () => {
    if (targetUserIds.length < 50) {
      setTargetUserIds([...targetUserIds, ''])
    }
  }

  const handleRemoveUser = (index: number) => {
    if (targetUserIds.length > 1) {
      setTargetUserIds(targetUserIds.filter((_, i) => i !== index))
    }
  }

  const handleUpdateUserId = (index: number, value: string) => {
    const updated = [...targetUserIds]
    updated[index] = value
    setTargetUserIds(updated)
  }

  const handleProceedToConfirm = () => {
    if (canProceed) {
      setStep('confirm')
    }
  }

  const handleActivateStealth = async () => {
    if (confirmationText !== 'ACTIVATE STEALTH') {
      setError('Please type ACTIVATE STEALTH to confirm')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await activateNotificationStealth(
        requestId,
        familyId.trim(),
        validUserIds.map((id) => id.trim()),
        reason.trim(),
        durationHours
      )

      setSuccessResult({
        queueId: result.queueId,
        targetUserIds: result.targetUserIds,
        expiresAt: result.expiresAt,
        alreadyActive: result.alreadyActive,
      })
      setStep('success')
      onSuccess()
    } catch (err) {
      console.error('Error activating notification stealth:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to activate notification stealth. Please try again.'
      )
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        {step === 'input' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-amber-600">
                Activate Notification Stealth
              </DialogTitle>
              <DialogDescription>
                This action will suppress all escape-revealing notifications for
                the specified users. Notifications will be held for the duration
                and then permanently deleted.
              </DialogDescription>
            </DialogHeader>

            {!hasMinimumVerification && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-medium">
                  Identity Verification Required
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Before activating stealth mode, you must verify the
                  requester&apos;s identity by checking either &quot;Account
                  Ownership Verified&quot; or &quot;ID Matched&quot; in the
                  verification checklist.
                </p>
              </div>
            )}

            <div className="space-y-4 py-4">
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
                  The family containing the users to apply stealth to
                </p>
              </div>

              <div className="space-y-2">
                <Label>Target User IDs (typically the abuser)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Users whose notifications will be suppressed during stealth
                </p>
                {targetUserIds.map((userId, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={userId}
                      onChange={(e) => handleUpdateUserId(index, e.target.value)}
                      placeholder={`User ID ${index + 1}`}
                      disabled={!hasMinimumVerification}
                    />
                    {targetUserIds.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUser(index)}
                        className="text-red-600"
                        disabled={!hasMinimumVerification}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                {targetUserIds.length < 50 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddUser}
                    disabled={!hasMinimumVerification}
                  >
                    + Add Another User
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="durationHours">
                  Stealth Duration (hours)
                </Label>
                <Input
                  id="durationHours"
                  type="number"
                  min={24}
                  max={168}
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  disabled={!hasMinimumVerification}
                />
                <p className="text-xs text-muted-foreground">
                  Duration in hours (24-168, default 72). After this period,
                  held notifications are permanently deleted.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">
                  Reason for Stealth Activation (min. 20 characters)
                </Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide detailed reason including verification method and safety concerns..."
                  rows={3}
                  disabled={!hasMinimumVerification}
                />
                <p className="text-xs text-muted-foreground">
                  This will be recorded in the sealed audit log for compliance.
                  ({reason.length}/20 min characters)
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="default"
                className="bg-amber-600 hover:bg-amber-700"
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
              <DialogTitle className="text-amber-600">
                Confirm Notification Stealth Activation
              </DialogTitle>
              <DialogDescription>
                Please review and confirm this action.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-amber-800">
                  You are about to:
                </p>
                <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                  <li>
                    Activate notification stealth for {validUserIds.length} user(s)
                  </li>
                  <li>Suppress escape-revealing notifications for {durationHours} hours</li>
                  <li>Hold device unenrollment notifications</li>
                  <li>Hold location disable notifications</li>
                  <li>Hold parent removal notifications</li>
                  <li>Permanently delete held notifications after {durationHours} hours</li>
                  <li>No notification will be sent about stealth activation</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1">
                <p className="text-sm font-medium text-blue-800">
                  Critical safety notifications will NOT be suppressed:
                </p>
                <ul className="text-sm text-blue-700 list-disc list-inside">
                  <li>Crisis resource access</li>
                  <li>Mandatory reports</li>
                  <li>Legal compliance</li>
                  <li>Account security</li>
                  <li>Child safety flags</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p>
                  <strong>Family:</strong> {familyId}
                </p>
                <p>
                  <strong>Users:</strong> {validUserIds.join(', ')}
                </p>
                <p>
                  <strong>Duration:</strong> {durationHours} hours
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmationText">
                  Type <span className="font-mono font-bold">ACTIVATE STEALTH</span>{' '}
                  to confirm
                </Label>
                <Input
                  id="confirmationText"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="ACTIVATE STEALTH"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
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
                className="bg-amber-600 hover:bg-amber-700"
                onClick={handleActivateStealth}
                disabled={loading || confirmationText !== 'ACTIVATE STEALTH'}
              >
                {loading ? 'Activating...' : 'Activate Notification Stealth'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && successResult && (
          <>
            <DialogHeader>
              <DialogTitle className="text-green-600">
                {successResult.alreadyActive
                  ? 'Stealth Mode Already Active'
                  : 'Notification Stealth Activated'}
              </DialogTitle>
              <DialogDescription>
                {successResult.alreadyActive
                  ? 'Stealth mode was already active for this family and request.'
                  : 'Notifications will be suppressed for the specified duration.'}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <p className="text-sm text-green-800">
                  Stealth mode {successResult.alreadyActive ? 'is active' : 'activated'} for{' '}
                  <strong>{successResult.targetUserIds.length}</strong> user(s).
                </p>
                <ul className="text-sm text-green-700 list-disc list-inside space-y-1">
                  <li>
                    Queue ID: <code className="text-xs">{successResult.queueId}</code>
                  </li>
                  <li>
                    Expires: {new Date(successResult.expiresAt).toLocaleString()}
                  </li>
                </ul>
                <p className="text-sm text-green-700 mt-2">
                  Escape-revealing notifications will be intercepted and held.
                  After expiration, all held notifications will be permanently deleted.
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
                Stealth Activation Failed
              </DialogTitle>
              <DialogDescription>
                An error occurred while activating notification stealth.
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
                className="bg-amber-600 hover:bg-amber-700"
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
