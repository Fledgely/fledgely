'use client'

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  getDissolutionStatusLabel,
  calculateDaysRemaining,
  type FamilyDissolution,
} from '@fledgely/contracts'
import { AlertTriangle, Clock, XCircle, Users } from 'lucide-react'

/**
 * Props for the DissolutionStatusBanner component
 */
export interface DissolutionStatusBannerProps {
  /** Current dissolution state */
  dissolution: FamilyDissolution
  /** Guardian IDs who have not yet acknowledged */
  pendingGuardianNames?: string[]
  /** Called when cancel button is clicked */
  onCancelClick?: () => void
  /** Called when acknowledge button is clicked */
  onAcknowledgeClick?: () => void
  /** Whether current user is the initiator */
  isInitiator: boolean
  /** Whether current user needs to acknowledge */
  needsToAcknowledge: boolean
  /** Whether an action is in progress */
  loading?: boolean
}

/**
 * DissolutionStatusBanner Component
 *
 * Shows the current dissolution status with countdown and available actions.
 * Displayed prominently in family settings when dissolution is active.
 *
 * Story 2.7: Family Dissolution Initiation
 *
 * States:
 * - pending_acknowledgment: Waiting for all guardians to acknowledge
 * - cooling_period: Countdown to final deletion
 * - cancelled: Dissolution was cancelled (shown briefly)
 *
 * Accessibility features:
 * - ARIA live region for countdown updates
 * - Proper heading hierarchy
 * - 44x44px touch targets (NFR49)
 * - 6th-grade reading level text (NFR65)
 */
export function DissolutionStatusBanner({
  dissolution,
  pendingGuardianNames = [],
  onCancelClick,
  onAcknowledgeClick,
  isInitiator,
  needsToAcknowledge,
  loading = false,
}: DissolutionStatusBannerProps) {
  const { status, scheduledDeletionAt, dataHandlingOption } = dissolution

  const daysRemaining = scheduledDeletionAt ? calculateDaysRemaining(scheduledDeletionAt) : null

  const handleCancel = useCallback(() => {
    if (!loading && onCancelClick) {
      onCancelClick()
    }
  }, [loading, onCancelClick])

  const handleAcknowledge = useCallback(() => {
    if (!loading && onAcknowledgeClick) {
      onAcknowledgeClick()
    }
  }, [loading, onAcknowledgeClick])

  // Don't show for cancelled or completed
  if (status === 'cancelled' || status === 'completed') {
    return null
  }

  return (
    <div
      className="rounded-lg border-2 border-destructive/50 bg-destructive/10 p-4"
      role="alert"
      aria-label="Family dissolution status"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Status info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            <h3 className="font-semibold text-destructive">
              {getDissolutionStatusLabel(status)}
            </h3>
          </div>

          {/* Pending acknowledgment status */}
          {status === 'pending_acknowledgment' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Dissolution was initiated but is waiting for all guardians to acknowledge.
              </p>

              {pendingGuardianNames.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-yellow-600" aria-hidden="true" />
                  <span className="text-yellow-700 dark:text-yellow-400">
                    Waiting for: {pendingGuardianNames.join(', ')}
                  </span>
                </div>
              )}

              {needsToAcknowledge && (
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                  You need to acknowledge this dissolution request.
                </p>
              )}
            </div>
          )}

          {/* Cooling period status */}
          {status === 'cooling_period' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Your family will be deleted in{' '}
                <span className="font-semibold text-destructive">
                  {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                </span>
                .
              </p>

              {scheduledDeletionAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  <span>
                    Scheduled deletion:{' '}
                    {scheduledDeletionAt.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Data handling: <span className="font-medium">{getDataHandlingLabel(dataHandlingOption)}</span>
              </p>
            </div>
          )}

          {/* Initiator info */}
          {isInitiator && (
            <p className="text-xs text-muted-foreground">
              You initiated this dissolution.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row">
          {/* Acknowledge button - for non-initiators who need to acknowledge */}
          {needsToAcknowledge && (
            <Button
              type="button"
              variant="outline"
              onClick={handleAcknowledge}
              disabled={loading}
              className="min-h-[44px] border-yellow-500 text-yellow-700 hover:bg-yellow-500/10 dark:text-yellow-400"
            >
              Acknowledge
            </Button>
          )}

          {/* Cancel button - any guardian can cancel */}
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="min-h-[44px] gap-2"
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Cancel Dissolution
          </Button>
        </div>
      </div>

      {/* Countdown warning for last 7 days */}
      {status === 'cooling_period' && daysRemaining !== null && daysRemaining <= 7 && (
        <div className="mt-4 rounded border border-destructive bg-destructive/20 p-2">
          <p className="text-sm font-medium text-destructive">
            {daysRemaining === 0
              ? 'Deletion is scheduled for today!'
              : daysRemaining === 1
                ? 'Only 1 day left before deletion!'
                : `Only ${daysRemaining} days left before deletion!`}
          </p>
        </div>
      )}

      {/* Live region for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {status === 'pending_acknowledgment' &&
          `Dissolution is pending acknowledgment. ${pendingGuardianNames.length} guardians need to acknowledge.`}
        {status === 'cooling_period' &&
          `Family dissolution in progress. ${daysRemaining} days remaining until deletion.`}
      </div>
    </div>
  )
}

/**
 * Helper to get user-friendly data handling label
 */
function getDataHandlingLabel(option: FamilyDissolution['dataHandlingOption']): string {
  switch (option) {
    case 'delete_all':
      return 'Delete everything immediately after waiting period'
    case 'export_first':
      return 'Export data before deletion'
    case 'retain_90_days':
      return 'Keep data available for 90 days'
    default:
      return option
  }
}
