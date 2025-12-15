'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { cn } from '@/lib/utils'

interface LogoutButtonProps {
  /** Optional additional class names */
  className?: string
  /** Variant style for the button */
  variant?: 'default' | 'ghost' | 'outline' | 'destructive'
}

/**
 * Clear the session cookie (fail-safe for logout)
 * This is a backup in case onAuthStateChanged doesn't fire
 */
function clearSessionCookie(): void {
  if (typeof document !== 'undefined') {
    document.cookie = '__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
  }
}

/**
 * Accessible Logout button component
 *
 * Accessibility Features (WCAG 2.1 AA):
 * - 44x44px minimum touch target (NFR49)
 * - 4.5:1 color contrast ratio (NFR45)
 * - Visible focus indicator (NFR46)
 * - Keyboard accessible - Tab, Enter, Space (NFR43)
 * - Screen reader announcements via aria-live region
 * - Loading state announced to screen readers
 *
 * Fail-safe behavior:
 * - Always redirects to /login even if signOut errors
 * - Session cookie cleared directly as fail-safe
 * - Short delay before redirect allows screen reader announcement
 *
 * @example
 * ```tsx
 * <LogoutButton />
 * <LogoutButton variant="ghost" className="w-full" />
 * ```
 */
export function LogoutButton({
  className,
  variant = 'outline',
}: LogoutButtonProps) {
  const router = useRouter()
  const { signOut } = useAuthContext()
  const [status, setStatus] = useState<'idle' | 'logging-out' | 'logged-out'>(
    'idle'
  )

  const handleLogout = useCallback(async () => {
    // Prevent multiple simultaneous logout attempts
    if (status !== 'idle') return

    setStatus('logging-out')

    // Clear session cookie FIRST as fail-safe (AC3 & AC5 compliance)
    // This ensures the cookie is cleared even if signOut fails
    clearSessionCookie()

    try {
      await signOut()
    } catch (error) {
      // Log error but continue with redirect (fail-safe)
      console.error('[LogoutButton] signOut error:', error)
      // Cookie already cleared above - fail-safe satisfied
    }

    // Set logged-out status for screen reader announcement
    setStatus('logged-out')

    // Short delay to allow screen reader to announce logout
    // before component unmounts due to navigation (AC6 compliance)
    setTimeout(() => {
      router.push('/login')
    }, 150)
  }, [status, signOut, router])

  const isLoading = status === 'logging-out'
  const isDisabled = status !== 'idle'

  return (
    <>
      <Button
        type="button"
        variant={variant}
        onClick={handleLogout}
        disabled={isDisabled}
        className={cn(
          // Base styles
          'relative gap-2 font-medium',
          // 44x44px minimum touch target (NFR49)
          'min-h-[44px] px-4 py-2',
          // Enhanced focus indicator (NFR46)
          'focus-visible:ring-4 focus-visible:ring-blue-200 focus-visible:ring-offset-2',
          // Transition for smooth state changes
          'transition-all duration-200',
          // Custom className
          className
        )}
        // Accessibility attributes
        aria-label={
          isLoading ? 'Logging out, please wait' : 'Log out of your account'
        }
        aria-busy={isLoading}
        aria-disabled={isDisabled}
      >
        {isLoading ? (
          <>
            {/* Inline spinner without its own status role to avoid conflicts */}
            <svg
              className="animate-spin h-4 w-4"
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
            <span>Logging out...</span>
          </>
        ) : (
          <span>Log out</span>
        )}
      </Button>
      {/* Single status region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isLoading && 'Logging out, please wait'}
        {status === 'logged-out' && 'You have been logged out'}
      </div>
    </>
  )
}
