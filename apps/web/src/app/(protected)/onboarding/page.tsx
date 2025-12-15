'use client'

import { useUser } from '@/hooks/useUser'
import { SafetyResourcesLink } from '@/components/safety'

/**
 * Onboarding Page - Entry point for new users
 *
 * This is a placeholder page for Epic 2 (Family Creation).
 * New users are redirected here after their first sign-in.
 *
 * Features:
 * - Welcomes new user by name
 * - Explains next steps (family creation)
 * - Maintains consistent safety resources access
 */
export default function OnboardingPage() {
  const { userProfile, loading } = useUser()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex flex-1 flex-col items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6">
            {/* Loading skeleton */}
            <div className="space-y-4 text-center">
              <div className="mx-auto h-8 w-48 animate-pulse rounded bg-muted" />
              <div className="mx-auto h-4 w-64 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Get first name for personalized welcome
  const firstName = userProfile?.displayName?.split(' ')[0] || 'there'

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Welcome header */}
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome, {firstName}!
            </h1>
            <p className="text-sm text-muted-foreground">
              Your account is ready. Let&apos;s set up your family.
            </p>
          </div>

          {/* Onboarding card */}
          <div className="rounded-lg border bg-card p-6">
            <div className="space-y-4">
              {/* Progress indicator */}
              <div className="flex items-center justify-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="h-2 w-2 rounded-full bg-muted" />
                <div className="h-2 w-2 rounded-full bg-muted" />
              </div>

              {/* Step description */}
              <div className="text-center">
                <h2 className="text-lg font-medium">Create Your Family</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start by creating your family profile. This is where you&apos;ll
                  add your children and set up agreements together.
                </p>
              </div>

              {/* Placeholder for Epic 2 */}
              <div className="rounded-md bg-muted/50 p-4 text-center text-sm text-muted-foreground">
                <p className="font-medium">Coming Soon</p>
                <p className="mt-1">
                  Family creation will be available in Epic 2.
                </p>
              </div>

              {/* User info display (for debugging/verification) */}
              {userProfile && (
                <div className="mt-4 rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                  <p><strong>Your profile:</strong></p>
                  <p>Email: {userProfile.email}</p>
                  <p>Account created: {userProfile.createdAt.toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer with safety link */}
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
          <SafetyResourcesLink source="onboarding-page" />
        </div>
      </footer>
    </div>
  )
}
