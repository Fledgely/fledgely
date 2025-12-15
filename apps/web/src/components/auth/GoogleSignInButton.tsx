'use client'

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { GoogleIcon } from './GoogleIcon'
import { LoadingSpinner } from './LoadingSpinner'
import { cn } from '@/lib/utils'

interface GoogleSignInButtonProps {
  /** Whether the button is in a loading state */
  loading?: boolean
  /** Whether the button is disabled */
  disabled?: boolean
  /** Click handler - typically calls signInWithGoogle from useAuth */
  onClick?: () => void | Promise<void>
  /** Optional additional class names */
  className?: string
}

/**
 * Accessible Google Sign-In button component
 *
 * Accessibility Features (WCAG 2.1 AA):
 * - 44x44px minimum touch target (NFR49)
 * - 4.5:1 color contrast ratio (NFR45)
 * - Visible focus indicator (NFR46)
 * - Keyboard accessible - Tab, Enter, Space (NFR43)
 * - Screen reader announcements via aria-label and aria-live
 * - Loading state announced to screen readers
 *
 * @example
 * ```tsx
 * const { signInWithGoogle, loading } = useAuth()
 *
 * <GoogleSignInButton
 *   onClick={signInWithGoogle}
 *   loading={loading}
 * />
 * ```
 */
export function GoogleSignInButton({
  loading = false,
  disabled = false,
  onClick,
  className,
}: GoogleSignInButtonProps) {
  const handleClick = useCallback(async () => {
    if (loading || disabled) return
    await onClick?.()
  }, [loading, disabled, onClick])

  const isDisabled = loading || disabled

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={isDisabled}
      className={cn(
        // Base styles
        'relative gap-3 font-medium',
        // 44x44px minimum touch target (NFR49)
        'min-h-[44px] min-w-[200px] px-6 py-3',
        // Enhanced focus indicator (NFR46)
        'focus-visible:ring-4 focus-visible:ring-blue-200 focus-visible:ring-offset-2',
        // Hover and active states
        'hover:bg-slate-50 active:bg-slate-100',
        // Transition for smooth state changes
        'transition-all duration-200',
        // Custom className
        className
      )}
      // Accessibility attributes
      aria-label={
        loading ? 'Signing in with Google, please wait' : 'Sign in with Google'
      }
      aria-busy={loading}
      aria-disabled={isDisabled}
    >
      {/* Live region for screen reader announcements */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {loading ? 'Signing in, please wait' : ''}
      </span>

      {loading ? (
        <>
          <LoadingSpinner className="h-5 w-5" srText="Signing in..." />
          <span>Signing in...</span>
        </>
      ) : (
        <>
          <GoogleIcon className="h-5 w-5" />
          <span>Sign in with Google</span>
        </>
      )}
    </Button>
  )
}
