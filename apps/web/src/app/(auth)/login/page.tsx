'use client'

import { useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SafetyResourcesLink } from '@/components/safety'
import { GoogleSignInButton } from '@/components/auth'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { useUser } from '@/hooks/useUser'
import { getSafeRedirectUrl } from '@/lib/security'

/**
 * Login Page
 *
 * Features:
 * - Google Sign-In button with full accessibility (WCAG 2.1 AA)
 * - Automatic redirect for authenticated users
 * - New users redirected to onboarding (Story 1.2)
 * - Existing users redirected to dashboard
 * - Loading skeleton during auth state check
 * - Subtle "Safety Resources" link for abuse victims
 */
export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, error: authError, signInWithGoogle, clearError: clearAuthError } = useAuthContext()
  const { isNewUser, loading: userLoading, error: userError, clearError: clearUserError } = useUser()

  // Combine loading states
  const loading = authLoading || userLoading

  // Combine errors - auth errors take priority
  const error = authError || userError
  const clearError = authError ? clearAuthError : clearUserError

  // Get safe redirect URL, memoized to prevent recalculation
  const redirectTo = useMemo(
    () => getSafeRedirectUrl(searchParams.get('redirect')),
    [searchParams]
  )

  // Redirect authenticated users based on new user status
  useEffect(() => {
    if (user && !loading) {
      if (isNewUser) {
        // New users go to onboarding to create their family
        router.push('/onboarding')
      } else {
        // Existing users go to dashboard or requested destination
        router.push(redirectTo)
      }
    }
  }, [user, loading, isNewUser, router, redirectTo])

  // Show loading skeleton while checking auth state
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex flex-1 flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm space-y-6">
            {/* Skeleton loader for heading */}
            <div className="space-y-2 text-center">
              <div className="mx-auto h-8 w-48 animate-pulse rounded bg-muted" />
              <div className="mx-auto h-4 w-64 animate-pulse rounded bg-muted" />
            </div>
            {/* Skeleton loader for button */}
            <div className="rounded-lg border bg-card p-6">
              <div className="mx-auto h-11 w-48 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome to Fledgely
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to continue to your family dashboard
            </p>
          </div>

          {/* Expired session message (friendly, not an error) */}
          {searchParams.get('expired') === 'true' && (
            <div
              className="rounded-lg bg-blue-50 p-4 text-center text-blue-700"
              role="status"
              aria-live="polite"
            >
              Welcome back! Please sign in again to continue.
            </div>
          )}

          {/* Sign-in card */}
          <div className="rounded-lg border bg-card p-6">
            <div className="flex flex-col items-center space-y-4">
              {/* Error message */}
              {error && (
                <div
                  className="w-full rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                  role="alert"
                  aria-live="polite"
                >
                  <p>{error.message}</p>
                  <button
                    onClick={clearError}
                    className="mt-2 text-xs underline hover:no-underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Google Sign-In Button */}
              <GoogleSignInButton
                onClick={signInWithGoogle}
                loading={loading}
              />

              {/* Help text */}
              <p className="text-xs text-muted-foreground text-center">
                Sign in securely with your Google account.
                <br />
                No password needed.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer with subtle safety link */}
      <footer className="border-t py-4">
        <div className="container flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Fledgely</span>
          <span>&middot;</span>
          <a href="/privacy" className="hover:underline">
            Privacy
          </a>
          <span>&middot;</span>
          <a href="/terms" className="hover:underline">
            Terms
          </a>
          <span>&middot;</span>
          {/*
            CRITICAL: Safety Resources link for abuse victims
            - Positioned subtly in footer alongside other links
            - Uses neutral text that doesn't attract attention
            - Opens modal (not new page) to avoid URL history
          */}
          <SafetyResourcesLink source="login-page" />
        </div>
      </footer>
    </div>
  )
}
