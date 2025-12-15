'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useFamily } from '@/hooks/useFamily'
import { Button } from '@/components/ui/button'
import { SafetyResourcesLink } from '@/components/safety'

/**
 * Create Family Page - First step of onboarding
 *
 * Allows new parents to create their family, which:
 * - Creates a family document in Firestore
 * - Sets the parent as primary guardian with full permissions
 * - Updates their user profile with familyId
 *
 * After family creation, redirects to add-child flow.
 *
 * Accessibility Features (WCAG 2.1 AA):
 * - 44x44px minimum touch targets (NFR49)
 * - 4.5:1 color contrast ratio (NFR45)
 * - Visible focus indicators (NFR46)
 * - Keyboard accessible (NFR43)
 * - Screen reader announcements via aria-live
 */
export default function CreateFamilyPage() {
  const router = useRouter()
  const { userProfile, loading: userLoading } = useUser()
  const { hasFamily, createNewFamily, loading: familyLoading } = useFamily()

  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get first name for personalized message
  const firstName = userProfile?.displayName?.split(' ')[0] || 'there'

  /**
   * Handle family creation
   */
  const handleCreateFamily = useCallback(async () => {
    setIsCreating(true)
    setError(null)

    try {
      await createNewFamily()
      // Success - redirect to add child flow
      router.push('/onboarding/add-child')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      )
    } finally {
      setIsCreating(false)
    }
  }, [createNewFamily, router])

  // Loading state
  if (userLoading || familyLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <main
          className="flex flex-1 flex-col items-center justify-center p-4"
          aria-busy="true"
          aria-label="Loading your family information"
        >
          <div className="w-full max-w-md space-y-6">
            {/* Screen reader loading announcement */}
            <span className="sr-only" role="status" aria-live="polite">
              Loading your family information, please wait.
            </span>
            {/* Loading skeleton */}
            <div className="space-y-4 text-center" aria-hidden="true">
              <div className="mx-auto h-8 w-48 animate-pulse rounded bg-muted" />
              <div className="mx-auto h-4 w-64 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  // If user already has a family, redirect to dashboard
  if (hasFamily) {
    router.push('/dashboard')
    return null
  }

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
              Let&apos;s get your family set up.
            </p>
          </div>

          {/* Create family card */}
          <div className="rounded-lg border bg-card p-6">
            <div className="space-y-4">
              {/* Progress indicator */}
              <div
                className="flex items-center justify-center gap-2"
                role="group"
                aria-label="Onboarding progress: Step 1 of 3"
              >
                <div
                  className="h-2 w-2 rounded-full bg-primary"
                  aria-label="Current step"
                />
                <div className="h-2 w-2 rounded-full bg-muted" />
                <div className="h-2 w-2 rounded-full bg-muted" />
              </div>

              {/* Step description */}
              <div className="text-center">
                <h2 className="text-lg font-medium">Create Your Family</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start by creating your family. Then you can add your children
                  and set up device agreements together.
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div
                  className="rounded-md bg-destructive/10 p-4 text-center text-sm text-destructive"
                  role="alert"
                  aria-live="polite"
                >
                  {error}
                </div>
              )}

              {/* Screen reader status announcements */}
              <span className="sr-only" aria-live="polite" aria-atomic="true">
                {isCreating ? 'Creating your family, please wait' : ''}
              </span>

              {/* Create family button */}
              <Button
                onClick={handleCreateFamily}
                disabled={isCreating}
                className="min-h-[44px] w-full focus-visible:ring-4 focus-visible:ring-blue-200 focus-visible:ring-offset-2"
                aria-label={
                  isCreating
                    ? 'Creating your family, please wait'
                    : 'Create your family'
                }
                aria-busy={isCreating}
              >
                {isCreating ? (
                  <>
                    <span
                      className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                      aria-hidden="true"
                    />
                    Creating...
                  </>
                ) : (
                  'Create Family'
                )}
              </Button>

              {/* Info text */}
              <p className="text-center text-xs text-muted-foreground">
                You&apos;ll be the primary guardian of your family. You can
                invite other parents or caregivers later.
              </p>
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
          <SafetyResourcesLink source="create-family-page" />
        </div>
      </footer>
    </div>
  )
}
