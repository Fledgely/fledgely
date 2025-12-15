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
import { unenrollDevice, unenrollDevices, VerificationChecklist } from '@/lib/admin-api'

interface DeviceToUnenroll {
  deviceId: string
  familyId: string
  childId: string
}

interface UnenrollDeviceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
  verificationChecklist: VerificationChecklist
  onSuccess: () => void
}

/**
 * UnenrollDeviceDialog - CRITICAL SAFETY COMPONENT
 *
 * This dialog allows safety team members to unenroll devices from monitoring.
 * This is a life-safety feature used to protect abuse victims.
 *
 * IMPORTANT BEHAVIORS:
 * - Requires verified identity (accountOwnershipVerified OR idMatched)
 * - Requires explicit device/family/child IDs and documented reason
 * - Shows multiple confirmation steps with warnings
 * - Device will stop capturing immediately upon receiving command
 * - Offline devices will receive command when they reconnect (7-day TTL)
 * - No notifications are sent to any party
 */
export function UnenrollDeviceDialog({
  open,
  onOpenChange,
  requestId,
  verificationChecklist,
  onSuccess,
}: UnenrollDeviceDialogProps) {
  const [step, setStep] = useState<'mode' | 'input' | 'confirm' | 'success' | 'error'>(
    'mode'
  )
  const [mode, setMode] = useState<'single' | 'bulk'>('single')

  // Single device state
  const [deviceId, setDeviceId] = useState('')
  const [familyId, setFamilyId] = useState('')
  const [childId, setChildId] = useState('')

  // Bulk device state
  const [bulkDevices, setBulkDevices] = useState<DeviceToUnenroll[]>([
    { deviceId: '', familyId: '', childId: '' }
  ])

  // Common state
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationText, setConfirmationText] = useState('')
  const [successResult, setSuccessResult] = useState<{
    totalRequested: number
    totalUnenrolled: number
    unenrolledAt: string
  } | null>(null)

  // Check if minimum verification is complete
  const hasMinimumVerification =
    verificationChecklist.accountOwnershipVerified ||
    verificationChecklist.idMatched

  const canProceedSingle =
    hasMinimumVerification &&
    deviceId.trim().length > 0 &&
    familyId.trim().length > 0 &&
    childId.trim().length > 0 &&
    reason.trim().length >= 20

  const canProceedBulk =
    hasMinimumVerification &&
    bulkDevices.every(
      (d) =>
        d.deviceId.trim().length > 0 &&
        d.familyId.trim().length > 0 &&
        d.childId.trim().length > 0
    ) &&
    bulkDevices.length > 0 &&
    reason.trim().length >= 20

  const canProceed = mode === 'single' ? canProceedSingle : canProceedBulk

  const handleClose = () => {
    setStep('mode')
    setMode('single')
    setDeviceId('')
    setFamilyId('')
    setChildId('')
    setBulkDevices([{ deviceId: '', familyId: '', childId: '' }])
    setReason('')
    setConfirmationText('')
    setError(null)
    setSuccessResult(null)
    onOpenChange(false)
  }

  const handleSelectMode = (selectedMode: 'single' | 'bulk') => {
    setMode(selectedMode)
    setStep('input')
  }

  const handleProceedToConfirm = () => {
    if (canProceed) {
      setStep('confirm')
    }
  }

  const handleAddDevice = () => {
    if (bulkDevices.length < 50) {
      setBulkDevices([...bulkDevices, { deviceId: '', familyId: '', childId: '' }])
    }
  }

  const handleRemoveDevice = (index: number) => {
    if (bulkDevices.length > 1) {
      setBulkDevices(bulkDevices.filter((_, i) => i !== index))
    }
  }

  const handleUpdateBulkDevice = (
    index: number,
    field: keyof DeviceToUnenroll,
    value: string
  ) => {
    const updated = [...bulkDevices]
    updated[index][field] = value
    setBulkDevices(updated)
  }

  const handleExecuteUnenrollment = async () => {
    if (confirmationText !== 'UNENROLL DEVICE') {
      setError('Please type UNENROLL DEVICE to confirm')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (mode === 'single') {
        const result = await unenrollDevice(
          requestId,
          deviceId.trim(),
          familyId.trim(),
          childId.trim(),
          reason.trim()
        )
        setSuccessResult({
          totalRequested: 1,
          totalUnenrolled: result.unenrolled ? 1 : 0,
          unenrolledAt: result.unenrolledAt,
        })
      } else {
        const validDevices = bulkDevices
          .filter(
            (d) =>
              d.deviceId.trim() && d.familyId.trim() && d.childId.trim()
          )
          .map((d) => ({
            deviceId: d.deviceId.trim(),
            familyId: d.familyId.trim(),
            childId: d.childId.trim(),
          }))

        const result = await unenrollDevices(requestId, validDevices, reason.trim())
        setSuccessResult({
          totalRequested: result.totalRequested,
          totalUnenrolled: result.totalUnenrolled,
          unenrolledAt: result.unenrolledAt,
        })
      }
      setStep('success')
      onSuccess()
    } catch (err) {
      console.error('Error unenrolling device(s):', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to unenroll device(s). Please try again.'
      )
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        {step === 'mode' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-red-600">
                Unenroll Device from Monitoring
              </DialogTitle>
              <DialogDescription>
                This action will remotely unenroll device(s) from monitoring.
                The device will stop capturing immediately and delete local cached data.
              </DialogDescription>
            </DialogHeader>

            {!hasMinimumVerification && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-medium">
                  Identity Verification Required
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Before unenrolling devices, you must verify the requester&apos;s
                  identity by checking either &quot;Account Ownership
                  Verified&quot; or &quot;ID Matched&quot; in the verification
                  checklist.
                </p>
              </div>
            )}

            <div className="py-4 space-y-4">
              <p className="text-sm font-medium">Select unenrollment mode:</p>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => handleSelectMode('single')}
                  disabled={!hasMinimumVerification}
                >
                  <span className="font-medium">Single Device</span>
                  <span className="text-xs text-muted-foreground">
                    Unenroll one device
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => handleSelectMode('bulk')}
                  disabled={!hasMinimumVerification}
                >
                  <span className="font-medium">Multiple Devices</span>
                  <span className="text-xs text-muted-foreground">
                    Unenroll up to 50 devices
                  </span>
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'input' && mode === 'single' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-red-600">
                Unenroll Single Device
              </DialogTitle>
              <DialogDescription>
                Enter the device details to unenroll from monitoring.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deviceId">Device ID</Label>
                <Input
                  id="deviceId"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="Enter the device ID"
                />
                <p className="text-xs text-muted-foreground">
                  The Firestore document ID of the device
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="familyId">Family ID</Label>
                <Input
                  id="familyId"
                  value={familyId}
                  onChange={(e) => setFamilyId(e.target.value)}
                  placeholder="Enter the family ID"
                />
                <p className="text-xs text-muted-foreground">
                  The family the device belongs to
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="childId">Child ID</Label>
                <Input
                  id="childId"
                  value={childId}
                  onChange={(e) => setChildId(e.target.value)}
                  placeholder="Enter the child ID"
                />
                <p className="text-xs text-muted-foreground">
                  The child the device is assigned to
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Unenrollment (min. 20 characters)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide detailed reason including verification method and safety concerns..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This will be recorded in the sealed audit log for compliance.
                  ({reason.length}/20 min characters)
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('mode')}>
                Back
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

        {step === 'input' && mode === 'bulk' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-red-600">
                Unenroll Multiple Devices
              </DialogTitle>
              <DialogDescription>
                Enter the details for each device to unenroll (max 50 devices).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
              {bulkDevices.map((device, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-3 relative"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Device {index + 1}</span>
                    {bulkDevices.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDevice(index)}
                        className="text-red-600 h-6"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Device ID"
                      value={device.deviceId}
                      onChange={(e) =>
                        handleUpdateBulkDevice(index, 'deviceId', e.target.value)
                      }
                    />
                    <Input
                      placeholder="Family ID"
                      value={device.familyId}
                      onChange={(e) =>
                        handleUpdateBulkDevice(index, 'familyId', e.target.value)
                      }
                    />
                    <Input
                      placeholder="Child ID"
                      value={device.childId}
                      onChange={(e) =>
                        handleUpdateBulkDevice(index, 'childId', e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}

              {bulkDevices.length < 50 && (
                <Button
                  variant="outline"
                  onClick={handleAddDevice}
                  className="w-full"
                >
                  + Add Another Device
                </Button>
              )}

              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="bulkReason">
                  Reason for Unenrollment (min. 20 characters)
                </Label>
                <Textarea
                  id="bulkReason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide detailed reason for all devices..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  ({reason.length}/20 min characters)
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('mode')}>
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleProceedToConfirm}
                disabled={!canProceed}
              >
                Continue ({bulkDevices.length} device{bulkDevices.length !== 1 ? 's' : ''})
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-red-600">
                Confirm Device Unenrollment
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
                    Unenroll{' '}
                    {mode === 'single' ? '1 device' : `${bulkDevices.length} device(s)`}
                  </li>
                  <li>Device(s) will stop capturing immediately</li>
                  <li>Local cached screenshots will be deleted</li>
                  <li>Offline devices will receive command within 7 days</li>
                  <li>No notification will be sent to any party</li>
                  <li>This will be logged for compliance</li>
                </ul>
              </div>

              {mode === 'single' && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p>
                    <strong>Device:</strong> {deviceId}
                  </p>
                  <p>
                    <strong>Family:</strong> {familyId}
                  </p>
                  <p>
                    <strong>Child:</strong> {childId}
                  </p>
                </div>
              )}

              {mode === 'bulk' && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm max-h-[100px] overflow-y-auto">
                  {bulkDevices.map((d, i) => (
                    <p key={i}>
                      Device {i + 1}: {d.deviceId} (Family: {d.familyId})
                    </p>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="confirmationText">
                  Type <span className="font-mono font-bold">UNENROLL DEVICE</span>{' '}
                  to confirm
                </Label>
                <Input
                  id="confirmationText"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="UNENROLL DEVICE"
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
                onClick={handleExecuteUnenrollment}
                disabled={loading || confirmationText !== 'UNENROLL DEVICE'}
              >
                {loading ? 'Unenrolling...' : 'Execute Unenrollment'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && successResult && (
          <>
            <DialogHeader>
              <DialogTitle className="text-green-600">
                Device(s) Unenrolled Successfully
              </DialogTitle>
              <DialogDescription>
                The unenrollment command has been issued.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>{successResult.totalUnenrolled}</strong> of{' '}
                  <strong>{successResult.totalRequested}</strong> device(s) unenrolled
                  successfully.
                </p>
                <p className="text-sm text-green-700 mt-2">
                  Unenrolled at: {new Date(successResult.unenrolledAt).toLocaleString()}
                </p>
                <p className="text-sm text-green-700 mt-2">
                  Active devices will stop capturing immediately. Offline devices
                  will receive the command when they reconnect (within 7 days).
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
                Unenrollment Failed
              </DialogTitle>
              <DialogDescription>
                An error occurred while unenrolling device(s).
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
