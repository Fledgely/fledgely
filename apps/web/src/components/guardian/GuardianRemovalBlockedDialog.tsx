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
import { ShieldAlert, FileText, Scale, ArrowRight } from 'lucide-react'
import type { RemovalBlockedResult } from '@fledgely/contracts'
import {
  GUARDIAN_REMOVAL_PREVENTION_MESSAGES,
  getRemovalBlockedExplanation,
} from '@fledgely/contracts'

/**
 * Props for the GuardianRemovalBlockedDialog component
 */
export interface GuardianRemovalBlockedDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Called when the dialog should be closed */
  onOpenChange: (open: boolean) => void
  /** The blocked result from the API (optional - uses defaults if not provided) */
  blockedResult?: RemovalBlockedResult
  /** Called when user clicks dissolution option */
  onDissolutionClick?: () => void
  /** Called when user clicks legal petition option */
  onLegalPetitionClick?: () => void
}

/**
 * GuardianRemovalBlockedDialog Component
 *
 * Story 3A.6: Co-Parent Removal Prevention
 *
 * Displays an informative dialog when a guardian tries to remove their co-parent
 * in a shared custody family. The dialog:
 *
 * 1. Explains why removal is blocked (shared custody protection)
 * 2. Offers two alternative paths:
 *    - Family Dissolution (Story 2.7) - requires dual acknowledgment
 *    - Legal Petition (Story 3.6) - requires court order documentation
 *
 * CRITICAL: This is an anti-weaponization feature that prevents one parent
 * from unilaterally removing the other's access to their child's data.
 *
 * Accessibility features:
 * - Focus trapped within dialog
 * - Escape key closes dialog
 * - Proper ARIA roles and labels
 * - 44x44px touch targets (NFR49)
 * - 6th-grade reading level text (NFR65)
 */
export function GuardianRemovalBlockedDialog({
  open,
  onOpenChange,
  blockedResult,
  onDissolutionClick,
  onLegalPetitionClick,
}: GuardianRemovalBlockedDialogProps) {
  // Get explanation content
  const explanation = getRemovalBlockedExplanation()

  // Determine which operation was blocked
  const reason = blockedResult?.reason || 'guardian_removal'
  const isRemoval = reason === 'guardian_removal'
  const isRoleChange = reason === 'role_downgrade'
  const isPermissionChange = reason === 'permission_downgrade'

  // Get the appropriate title based on blocked operation
  const getTitle = () => {
    if (isRemoval) return explanation.title
    if (isRoleChange) return 'Cannot Change Co-Parent Role'
    if (isPermissionChange) return 'Cannot Change Co-Parent Permissions'
    return explanation.title
  }

  // Get the appropriate message based on blocked operation
  const getMessage = () => {
    if (blockedResult?.message) return blockedResult.message
    if (isRemoval) return GUARDIAN_REMOVAL_PREVENTION_MESSAGES.removalBlocked
    if (isRoleChange) return GUARDIAN_REMOVAL_PREVENTION_MESSAGES.roleChangeBlocked
    if (isPermissionChange) return GUARDIAN_REMOVAL_PREVENTION_MESSAGES.permissionChangeBlocked
    return explanation.message
  }

  // Handle dissolution click
  const handleDissolutionClick = () => {
    onOpenChange(false)
    onDissolutionClick?.()
  }

  // Handle legal petition click
  const handleLegalPetitionClick = () => {
    onOpenChange(false)
    onLegalPetitionClick?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" aria-hidden="true" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="sr-only">
            This action is not allowed in shared custody families.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4" aria-live="polite">
          {/* Main explanation */}
          <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950">
            <p className="text-sm text-amber-800 dark:text-amber-200">{getMessage()}</p>
          </div>

          {/* Why this protection exists */}
          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
            <h3 className="font-medium text-blue-800 dark:text-blue-200">
              Why is this protected?
            </h3>
            <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              {GUARDIAN_REMOVAL_PREVENTION_MESSAGES.sharedCustodyExplanation}
            </p>
          </div>

          {/* Alternative options */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              Your options:
            </h3>

            {/* Dissolution option */}
            <button
              type="button"
              onClick={handleDissolutionClick}
              className="flex w-full items-start gap-3 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:hover:bg-gray-800"
              aria-describedby="dissolution-description"
            >
              <FileText
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600"
                aria-hidden="true"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {GUARDIAN_REMOVAL_PREVENTION_MESSAGES.dissolutionLinkText}
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
                </div>
                <p
                  id="dissolution-description"
                  className="mt-1 text-sm text-gray-600 dark:text-gray-400"
                >
                  {GUARDIAN_REMOVAL_PREVENTION_MESSAGES.dissolutionOption}
                </p>
              </div>
            </button>

            {/* Legal petition option */}
            <button
              type="button"
              onClick={handleLegalPetitionClick}
              className="flex w-full items-start gap-3 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:hover:bg-gray-800"
              aria-describedby="legal-petition-description"
            >
              <Scale
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-600"
                aria-hidden="true"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {GUARDIAN_REMOVAL_PREVENTION_MESSAGES.legalPetitionLinkText}
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
                </div>
                <p
                  id="legal-petition-description"
                  className="mt-1 text-sm text-gray-600 dark:text-gray-400"
                >
                  {GUARDIAN_REMOVAL_PREVENTION_MESSAGES.legalPetitionInfo}
                </p>
              </div>
            </button>
          </div>

          {/* Court order info */}
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong>Note:</strong> {GUARDIAN_REMOVAL_PREVENTION_MESSAGES.courtOrderRequired}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="min-h-[44px] min-w-[100px]"
          >
            I Understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
