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
import { disableLocationFeatures, VerificationChecklist } from '@/lib/admin-api'

interface LocationDisableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
  verificationChecklist: VerificationChecklist
  onSuccess: () => void
}

/**
 * LocationDisableDialog - CRITICAL SAFETY COMPONENT
 *
 * This dialog allows safety team members to disable all location-revealing
 * features for affected users in a family.
 *
 * IMPORTANT BEHAVIORS:
 * - Requires verified identity (accountOwnershipVerified OR idMatched)
 * - Disables FR139 (location-based rules)
 * - Disables FR145 (location-based work mode)
 * - Disables FR160 (new location alerts)
 * - Deletes pending location notifications
 * - Redacts historical location data (without visible gaps)
 * - Sends device commands to stop location collection
 * - No notifications are sent to any party
 */
export function LocationDisableDialog({
  open,
  onOpenChange,
  requestId,
  verificationChecklist,
  onSuccess,
}: LocationDisableDialogProps) {
  const [step, setStep] = useState<'input' | 'confirm' | 'success' | 'error'>(
    'input'
  )

  // Input state
  const [familyId, setFamilyId] = useState('')
  const [targetUserIds, setTargetUserIds] = useState<string[]>([''])
  const [reason, setReason] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationText, setConfirmationText] = useState('')
  const [successResult, setSuccessResult] = useState<{
    affectedUserIds: string[]
    deletedNotificationCount: number
    deviceCommandCount: number
    redactedHistoryCount: number
    disabledAt: string
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
    reason.trim().length >= 20

  const handleClose = () => {
    setStep('input')
    setFamilyId('')
    setTargetUserIds([''])
    setReason('')
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

  const handleExecuteDisable = async () => {
    if (confirmationText !== 'DISABLE LOCATION') {
      setError('Please type DISABLE LOCATION to confirm')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await disableLocationFeatures(
        requestId,
        familyId.trim(),
        validUserIds.map((id) => id.trim()),
        reason.trim()
      )

      setSuccessResult({
        affectedUserIds: result.affectedUserIds,
        deletedNotificationCount: result.deletedNotificationCount,
        deviceCommandCount: result.deviceCommandCount,
        redactedHistoryCount: result.redactedHistoryCount,
        disabledAt: result.disabledAt,
      })
      setStep('success')
      onSuccess()
    } catch (err) {
      console.error('Error disabling location features:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to disable location features. Please try again.'
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
              <DialogTitle className="text-red-600">
                Disable Location Features
              </DialogTitle>
              <DialogDescription>
                This action will disable all location-revealing features for the
                specified users. This includes location-based rules, work mode,
                and alerts.
              </DialogDescription>
            </DialogHeader>

            {!hasMinimumVerification && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-medium">
                  Identity Verification Required
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Before disabling location features, you must verify the
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
                  The family containing the users to protect
                </p>
              </div>

              <div className="space-y-2">
                <Label>Target User IDs</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Users whose location features will be disabled
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
                <Label htmlFor="reason">
                  Reason for Location Disable (min. 20 characters)
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
                Confirm Location Feature Disable
              </DialogTitle>
              <DialogDescription>
                Please review and confirm this action.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-red-800">
                  You are about to:
                </p>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                  <li>
                    Disable location features for {validUserIds.length} user(s)
                  </li>
                  <li>Disable location-based rules (FR139)</li>
                  <li>Disable location-based work mode (FR145)</li>
                  <li>Disable new location alerts (FR160)</li>
                  <li>Delete all pending location notifications</li>
                  <li>Send device commands to stop location collection</li>
                  <li>Redact historical location data</li>
                  <li>Features cannot be re-enabled by family (support required)</li>
                  <li>No notification will be sent to any party</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p>
                  <strong>Family:</strong> {familyId}
                </p>
                <p>
                  <strong>Users:</strong> {validUserIds.join(', ')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmationText">
                  Type <span className="font-mono font-bold">DISABLE LOCATION</span>{' '}
                  to confirm
                </Label>
                <Input
                  id="confirmationText"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="DISABLE LOCATION"
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
                variant="destructive"
                onClick={handleExecuteDisable}
                disabled={loading || confirmationText !== 'DISABLE LOCATION'}
              >
                {loading ? 'Disabling...' : 'Execute Location Disable'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && successResult && (
          <>
            <DialogHeader>
              <DialogTitle className="text-green-600">
                Location Features Disabled Successfully
              </DialogTitle>
              <DialogDescription>
                All location-revealing features have been disabled.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <p className="text-sm text-green-800">
                  Location features disabled for{' '}
                  <strong>{successResult.affectedUserIds.length}</strong> user(s).
                </p>
                <ul className="text-sm text-green-700 list-disc list-inside space-y-1">
                  <li>
                    {successResult.deletedNotificationCount} pending notification(s)
                    deleted
                  </li>
                  <li>
                    {successResult.deviceCommandCount} device command(s) queued
                  </li>
                  <li>
                    {successResult.redactedHistoryCount} location history
                    record(s) redacted
                  </li>
                </ul>
                <p className="text-sm text-green-700 mt-2">
                  Disabled at: {new Date(successResult.disabledAt).toLocaleString()}
                </p>
                <p className="text-sm text-green-700 mt-2">
                  Active devices will stop location collection within 60 seconds.
                  Offline devices will receive the command when they reconnect
                  (within 7 days).
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
                Location Disable Failed
              </DialogTitle>
              <DialogDescription>
                An error occurred while disabling location features.
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
