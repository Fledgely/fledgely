'use client'

import { useCallback, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2 } from 'lucide-react'

/**
 * Props for the RevokeConfirmDialog component
 */
export interface RevokeConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Called when the dialog should be closed */
  onOpenChange: (open: boolean) => void
  /** Called when user confirms revocation */
  onConfirm: () => void
  /** Whether revocation is in progress */
  loading?: boolean
}

/**
 * RevokeConfirmDialog Component
 *
 * Confirmation dialog for revoking an invitation.
 *
 * Story 3.5: Invitation Management - Task 5
 *
 * Features:
 * - Clear warning text at 6th-grade reading level
 * - "Cancel" and "Revoke" buttons
 * - Loading state during revocation
 * - Focus trap for accessibility
 * - 44x44px minimum touch targets (NFR49)
 *
 * AC3: Revoke Invitation
 * - Confirmation dialog appears with warning text
 * - Warning explains: "This will cancel the invitation. You can create a new one later."
 */
export function RevokeConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: RevokeConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // Focus the cancel button when dialog opens (safer default)
  useEffect(() => {
    if (open && cancelButtonRef.current) {
      // Small delay to ensure dialog is rendered
      const timeoutId = setTimeout(() => {
        cancelButtonRef.current?.focus()
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [open])

  const handleCancel = useCallback(() => {
    if (!loading) {
      onOpenChange(false)
    }
  }, [loading, onOpenChange])

  const handleConfirm = useCallback(() => {
    if (!loading) {
      onConfirm()
    }
  }, [loading, onConfirm])

  return (
    <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        aria-describedby="revoke-dialog-description"
        onInteractOutside={(e) => {
          // Prevent closing while loading
          if (loading) {
            e.preventDefault()
          }
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing while loading
          if (loading) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
              <AlertTriangle
                className="h-5 w-5 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
            </div>
            <DialogTitle className="text-lg font-semibold">
              Cancel this invitation?
            </DialogTitle>
          </div>
        </DialogHeader>

        <DialogDescription
          id="revoke-dialog-description"
          className="text-sm text-muted-foreground py-4"
        >
          {/* 6th-grade reading level text (NFR65) */}
          This will cancel the invitation. The link will stop working right away.
          <br />
          <br />
          You can make a new invitation later if needed.
        </DialogDescription>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
          <Button
            ref={cancelButtonRef}
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="min-h-[44px] min-w-[44px] w-full sm:w-auto"
            aria-label="Keep the invitation active"
          >
            Keep Invitation
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
            className="min-h-[44px] min-w-[44px] w-full sm:w-auto"
            aria-label={loading ? 'Cancelling invitation' : 'Confirm cancellation of invitation'}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Cancelling...
              </>
            ) : (
              'Yes, Cancel Invitation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
