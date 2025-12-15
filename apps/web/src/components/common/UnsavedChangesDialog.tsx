'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface UnsavedChangesDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Called when the dialog should be closed */
  onOpenChange: (open: boolean) => void
  /** Called when user confirms they want to leave */
  onConfirm: () => void
  /** Called when user cancels and wants to stay */
  onCancel: () => void
  /** Optional title override */
  title?: string
  /** Optional description override */
  description?: string
}

/**
 * Unsaved Changes Dialog Component
 *
 * A confirmation dialog shown when users attempt to navigate away
 * from a form with unsaved changes.
 *
 * Accessibility features:
 * - Focus trapped within dialog
 * - Escape key closes dialog
 * - Proper ARIA roles and labels
 * - 44x44px touch targets (NFR49)
 *
 * Story 2.5: Edit Child Profile
 *
 * @example
 * ```tsx
 * <UnsavedChangesDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   onConfirm={() => router.back()}
 *   onCancel={() => setShowDialog(false)}
 * />
 * ```
 */
export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title = 'Unsaved Changes',
  description = 'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.',
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="min-h-[44px]"
          >
            Keep Editing
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            className="min-h-[44px]"
          >
            Discard Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
