'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getTimeUntilExpiry, type Invitation } from '@fledgely/contracts'
import { Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Trash2, User } from 'lucide-react'

/**
 * Props for the InvitationCard component
 */
export interface InvitationCardProps {
  /** The invitation to display */
  invitation: Invitation
  /** ID of the current user (to determine ownership) */
  currentUserId: string
  /** Whether resend is in progress */
  resending?: boolean
  /** Whether revoke is in progress */
  revoking?: boolean
  /** Called when resend button is clicked */
  onResend?: (invitationId: string) => void
  /** Called when revoke button is clicked */
  onRevoke?: (invitationId: string) => void
  /** Email tracking info (if available) */
  emailInfo?: {
    emailSentTo: string | null
    emailSendCount: number
  }
  /** Optional additional CSS classes */
  className?: string
}

/**
 * Get status badge configuration
 */
function getStatusConfig(invitation: Invitation): {
  label: string
  icon: React.ReactNode
  colorClass: string
  ariaLabel: string
} {
  const now = new Date()
  const isExpired = invitation.status === 'pending' && now >= invitation.expiresAt

  if (isExpired) {
    return {
      label: 'Expired',
      icon: <AlertCircle className="h-4 w-4" />,
      colorClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      ariaLabel: 'This invitation has expired',
    }
  }

  switch (invitation.status) {
    case 'pending':
      return {
        label: 'Pending',
        icon: <Clock className="h-4 w-4" />,
        colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        ariaLabel: 'This invitation is waiting to be accepted',
      }
    case 'accepted':
      return {
        label: 'Accepted',
        icon: <CheckCircle className="h-4 w-4" />,
        colorClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        ariaLabel: 'This invitation was accepted',
      }
    case 'revoked':
      return {
        label: 'Revoked',
        icon: <XCircle className="h-4 w-4" />,
        colorClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        ariaLabel: 'This invitation was cancelled',
      }
    case 'expired':
      return {
        label: 'Expired',
        icon: <AlertCircle className="h-4 w-4" />,
        colorClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
        ariaLabel: 'This invitation has expired',
      }
    default:
      return {
        label: 'Unknown',
        icon: <AlertCircle className="h-4 w-4" />,
        colorClass: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        ariaLabel: 'Unknown invitation status',
      }
  }
}

/**
 * Format the expiry information for display
 */
function formatExpiryInfo(invitation: Invitation): string {
  const now = new Date()
  const isExpired = now >= invitation.expiresAt

  if (isExpired) {
    // Show when it expired
    const expiredDate = invitation.expiresAt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    return `Expired on ${expiredDate}`
  }

  // Use the contracts helper function which returns formatted string
  const timeUntil = getTimeUntilExpiry(invitation.expiresAt)

  if (timeUntil === 'Expired') {
    return 'Expires soon'
  }

  return `Expires in ${timeUntil}`
}

/**
 * Format the creation date for display
 */
function formatCreatedDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * InvitationCard Component
 *
 * Displays a single invitation with status, expiry, and action buttons.
 *
 * Story 3.5: Invitation Management - Task 4
 *
 * Features:
 * - Shows status badge (Pending, Accepted, Revoked, Expired)
 * - Shows expiry info ("Expires in X days" or "Expired on [date]")
 * - Shows masked email if sent
 * - Shows who accepted (for accepted invitations)
 * - Conditional action buttons based on status and ownership
 * - 44x44px minimum touch targets (NFR49)
 * - Accessible labels
 */
export function InvitationCard({
  invitation,
  currentUserId,
  resending = false,
  revoking = false,
  onResend,
  onRevoke,
  emailInfo,
  className,
}: InvitationCardProps) {
  const statusConfig = getStatusConfig(invitation)
  const isPending = invitation.status === 'pending' && new Date() < invitation.expiresAt
  const isOwner = invitation.invitedBy === currentUserId
  const canResend = isPending && isOwner && onResend
  const canRevoke = isPending && isOwner && onRevoke

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 shadow-sm',
        className
      )}
      role="article"
      aria-label={`Invitation created on ${formatCreatedDate(invitation.createdAt)}`}
    >
      {/* Header: Status Badge and Date */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
            statusConfig.colorClass
          )}
          aria-label={statusConfig.ariaLabel}
        >
          {statusConfig.icon}
          {statusConfig.label}
        </span>
        <span className="text-xs text-muted-foreground">
          Created {formatCreatedDate(invitation.createdAt)}
        </span>
      </div>

      {/* Expiry or Acceptance Info */}
      <div className="mb-3">
        {invitation.status === 'accepted' && invitation.acceptedBy ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" aria-hidden="true" />
            <span>Joined the family</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {formatExpiryInfo(invitation)}
          </p>
        )}
      </div>

      {/* Email Info (if available) */}
      {emailInfo?.emailSentTo && (
        <div className="mb-3">
          <p className="text-sm text-muted-foreground">
            Sent to {emailInfo.emailSentTo}
            {emailInfo.emailSendCount > 1 && (
              <span className="ml-1">({emailInfo.emailSendCount}x)</span>
            )}
          </p>
        </div>
      )}

      {/* Invited By (for non-owners) */}
      {!isOwner && (
        <div className="mb-3">
          <p className="text-sm text-muted-foreground">
            Created by {invitation.invitedByName}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {(canResend || canRevoke) && (
        <div
          className="flex gap-2 pt-2 border-t"
          role="group"
          aria-label="Invitation actions"
        >
          {canResend && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onResend(invitation.id)}
              disabled={resending}
              className="min-h-[44px] min-w-[44px] flex-1"
              aria-label={resending ? 'Resending invitation email' : 'Resend invitation email'}
            >
              <RefreshCw
                className={cn('h-4 w-4 mr-2', resending && 'animate-spin')}
                aria-hidden="true"
              />
              {resending ? 'Sending...' : 'Resend'}
            </Button>
          )}
          {canRevoke && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRevoke(invitation.id)}
              disabled={revoking}
              className="min-h-[44px] min-w-[44px] flex-1 text-destructive hover:text-destructive"
              aria-label={revoking ? 'Revoking invitation' : 'Revoke invitation'}
            >
              <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
              {revoking ? 'Revoking...' : 'Revoke'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
