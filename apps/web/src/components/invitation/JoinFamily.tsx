'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Users, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react'

/**
 * Props for the JoinFamily component
 */
export interface JoinFamilyProps {
  /** Invitation preview data (null if not found) */
  invitation: {
    familyName: string
    invitedByName: string
    status: 'pending' | 'expired' | 'accepted' | 'revoked'
    expiresAt: Date
    isExpired: boolean
  } | null
  /** Error message to display */
  error: string | null
  /** Whether the user is authenticated */
  isAuthenticated: boolean
  /** Whether acceptance is in progress */
  isAccepting: boolean
  /** Handler for accepting the invitation */
  onAccept: () => void
  /** Handler for signing in */
  onSignIn: () => void
  /** Handler for clearing error */
  onClearError: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * JoinFamily Component
 *
 * Displays the invitation acceptance UI for co-parents.
 *
 * Story 3.3: Co-Parent Invitation Acceptance
 *
 * States:
 * 1. Valid invitation (not authenticated) - Shows family info + sign in button
 * 2. Valid invitation (authenticated) - Shows family info + accept button
 * 3. Expired invitation - Shows expiry message
 * 4. Accepted invitation - Shows already used message
 * 5. Revoked invitation - Shows canceled message
 * 6. Not found - Shows not found message
 * 7. Error - Shows error message with retry option
 *
 * Accessibility features:
 * - 44x44px touch targets (NFR49)
 * - 6th-grade reading level text (NFR65)
 * - aria-live announcements for errors
 * - Proper heading hierarchy
 * - Color contrast compliant
 */
export function JoinFamily({
  invitation,
  error,
  isAuthenticated,
  isAccepting,
  onAccept,
  onSignIn,
  onClearError,
  className = '',
}: JoinFamilyProps) {
  // Not found state
  if (!invitation && !error) {
    return (
      <div className={cn('rounded-lg border bg-card p-8 shadow-sm', className)}>
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold">Invitation Not Found</h1>
          <p className="text-muted-foreground">
            This invitation link is not valid or no longer exists.
          </p>
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/')}
            className="mt-4 min-h-[44px] min-w-[120px]"
          >
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  // Error state (with invitation data or standalone error)
  if (error) {
    const isExpiredError = error.includes('expired')
    const isCanceledError = error.includes('canceled')
    const isUsedError = error.includes('already been used')

    return (
      <div className={cn('rounded-lg border bg-card p-8 shadow-sm', className)}>
        <div className="flex flex-col items-center space-y-4 text-center">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full',
              isExpiredError ? 'bg-orange-100' : 'bg-red-100'
            )}
          >
            {isExpiredError ? (
              <Clock className="h-6 w-6 text-orange-600" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
            )}
          </div>
          <h1 className="text-xl font-semibold">
            {isExpiredError
              ? 'Invitation Expired'
              : isCanceledError
                ? 'Invitation Canceled'
                : isUsedError
                  ? 'Invitation Already Used'
                  : 'Unable to Join'}
          </h1>
          <p
            className="text-muted-foreground"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
          {invitation && (
            <p className="text-sm text-muted-foreground">
              Family: <span className="font-medium">{invitation.familyName}</span>
            </p>
          )}
          <div className="flex gap-3 mt-4">
            {!isExpiredError && !isCanceledError && !isUsedError && (
              <Button
                variant="outline"
                onClick={onClearError}
                className="min-h-[44px] min-w-[100px]"
              >
                Try Again
              </Button>
            )}
            <Button
              variant={isExpiredError || isCanceledError || isUsedError ? 'default' : 'outline'}
              onClick={() => (window.location.href = '/')}
              className="min-h-[44px] min-w-[120px]"
            >
              Go Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Accepted state
  if (invitation?.status === 'accepted') {
    return (
      <div className={cn('rounded-lg border bg-card p-8 shadow-sm', className)}>
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-6 w-6 text-green-600" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold">Already Joined</h1>
          <p className="text-muted-foreground">
            This invitation has already been used to join{' '}
            <span className="font-medium">{invitation.familyName}</span>.
          </p>
          <Button
            onClick={() => (window.location.href = '/dashboard')}
            className="mt-4 min-h-[44px] min-w-[180px]"
          >
            Go to Family Dashboard
          </Button>
        </div>
      </div>
    )
  }

  // Valid pending invitation
  return (
    <div className={cn('rounded-lg border bg-card p-8 shadow-sm', className)}>
      <div className="flex flex-col items-center space-y-6 text-center">
        {/* Family icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Join Family</h1>
          <p className="text-lg text-muted-foreground">
            {invitation?.invitedByName} invited you to join
          </p>
          <p className="text-xl font-medium text-primary">
            {invitation?.familyName}
          </p>
        </div>

        {/* Info text */}
        <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          <p>
            When you join, you&apos;ll be able to see and help manage
            family agreements and view your children&apos;s online activity.
          </p>
        </div>

        {/* Action buttons */}
        <div className="w-full space-y-3">
          {isAuthenticated ? (
            <Button
              onClick={onAccept}
              disabled={isAccepting}
              className="w-full min-h-[48px] text-base"
              aria-busy={isAccepting}
            >
              {isAccepting ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Joining...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
          ) : (
            <>
              <Button
                onClick={onSignIn}
                className="w-full min-h-[48px] text-base"
              >
                Sign in to Join
              </Button>
              <p className="text-xs text-muted-foreground">
                You&apos;ll need to sign in with your Google account to join this family.
              </p>
            </>
          )}
        </div>

        {/* Expiry notice */}
        {invitation && !invitation.isExpired && (
          <p className="text-xs text-muted-foreground">
            This invitation expires{' '}
            {formatExpiryDate(invitation.expiresAt)}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Simple loading spinner component
 */
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

/**
 * Format expiry date in a friendly way
 */
function formatExpiryDate(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()

  if (diff <= 0) {
    return 'soon'
  }

  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))

  if (days > 0) {
    return `in ${days} day${days !== 1 ? 's' : ''}`
  }

  return `in ${hours} hour${hours !== 1 ? 's' : ''}`
}
