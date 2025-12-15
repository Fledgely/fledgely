'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useFamily } from '@/hooks/useFamily'
import { SafetyResourcesLink } from '@/components/safety'

/**
 * Onboarding Page - Router for new users
 *
 * This page determines the correct onboarding step based on user state:
 * - No family → redirect to /onboarding/create-family
 * - Has family, no children → redirect to /onboarding/add-child (Epic 2.2)
 * - Has family + children → redirect to /dashboard
 *
 * Features:
 * - Automatic routing based on onboarding progress
 * - Loading state while checking user/family status
 * - Maintains consistent safety resources access
 */
export default function OnboardingPage() {
  const router = useRouter()
  const { userProfile, loading: userLoading } = useUser()
  const { family, hasFamily, loading: familyLoading } = useFamily()

  const loading = userLoading || familyLoading

  // Route to appropriate onboarding step
  useEffect(() => {
    if (loading) {
      return
    }

    if (!hasFamily) {
      // No family - redirect to create family
      router.replace('/onboarding/create-family')
      return
    }

    if (family && family.children.length === 0) {
      // Has family but no children - redirect to add child
      // For now, redirect to dashboard since add-child page is Story 2.2
      router.replace('/dashboard')
      return
    }

    // Has family and children - redirect to dashboard
    router.replace('/dashboard')
  }, [loading, hasFamily, family, router])

  // Always show loading while checking status
  // This prevents flash of content before redirect
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Loading skeleton */}
          <div className="space-y-4 text-center">
            <div className="mx-auto h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="mx-auto h-4 w-64 animate-pulse rounded bg-muted" />
            <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
              Setting up your experience...
            </p>
          </div>

          {/* User info for debugging (only in development) */}
          {process.env.NODE_ENV === 'development' && userProfile && (
            <div className="mt-4 rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
              <p><strong>Debug Info:</strong></p>
              <p>User: {userProfile.email}</p>
              <p>Family ID: {userProfile.familyId || 'None'}</p>
              <p>Has Family: {hasFamily ? 'Yes' : 'No'}</p>
            </div>
          )}
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
