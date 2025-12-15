'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useFamily } from '@/hooks/useFamily'
import { useChild } from '@/hooks/useChild'
import { AddChildForm } from '@/components/child/AddChildForm'
import { Button } from '@/components/ui/button'
import { SafetyResourcesLink } from '@/components/safety'
import type { CreateChildInput } from '@fledgely/contracts'

/**
 * Add Child Page - Second step of onboarding
 *
 * Allows parents to add children to their family:
 * - Creates a child profile in Firestore
 * - Sets the parent as guardian with full permissions
 * - Allows adding multiple children before continuing
 *
 * After adding at least one child, user can:
 * - Add another child
 * - Continue to create device agreement
 *
 * Accessibility Features (WCAG 2.1 AA):
 * - 44x44px minimum touch targets (NFR49)
 * - 4.5:1 color contrast ratio (NFR45)
 * - Visible focus indicators (NFR46)
 * - Keyboard accessible (NFR43)
 * - Screen reader announcements via aria-live
 */
export default function AddChildPage() {
  const router = useRouter()
  const { userProfile, loading: userLoading } = useUser()
  const { hasFamily, loading: familyLoading } = useFamily()
  const { children, hasChildren, addChild, loading: childLoading } = useChild()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastAddedName, setLastAddedName] = useState<string | null>(null)

  // Get first name for personalized message
  const firstName = userProfile?.displayName?.split(' ')[0] || 'there'

  /**
   * Handle adding a child
   */
  const handleAddChild = useCallback(
    async (data: CreateChildInput) => {
      setIsSubmitting(true)

      try {
        const child = await addChild(data)
        setLastAddedName(child.firstName)
        setShowSuccess(true)
      } finally {
        setIsSubmitting(false)
      }
    },
    [addChild]
  )

  /**
   * Handle adding another child
   */
  const handleAddAnother = useCallback(() => {
    setShowSuccess(false)
    setLastAddedName(null)
  }, [])

  /**
   * Handle continuing to next step
   */
  const handleContinue = useCallback(() => {
    router.push('/dashboard')
  }, [router])

  // Loading state
  if (userLoading || familyLoading || childLoading) {
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
              <div className="space-y-3 pt-4">
                <div className="h-10 animate-pulse rounded bg-muted" />
                <div className="h-10 animate-pulse rounded bg-muted" />
                <div className="h-10 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // If user doesn't have a family, redirect to create-family
  if (!hasFamily) {
    router.push('/onboarding/create-family')
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Welcome header */}
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              {hasChildren
                ? `Your Children (${children.length})`
                : `Hi ${firstName}!`}
            </h1>
            <p className="text-sm text-muted-foreground">
              {hasChildren
                ? 'Add another child or continue to the dashboard.'
                : "Let's add your first child to get started."}
            </p>
          </div>

          {/* Add child card */}
          <div className="rounded-lg border bg-card p-6">
            <div className="space-y-4">
              {/* Progress indicator */}
              <div
                className="flex items-center justify-center gap-2"
                role="group"
                aria-label="Onboarding progress: Step 2 of 3"
              >
                <div
                  className="h-2 w-2 rounded-full bg-primary"
                  aria-label="Completed step"
                />
                <div
                  className="h-2 w-2 rounded-full bg-primary"
                  aria-label="Current step"
                />
                <div className="h-2 w-2 rounded-full bg-muted" />
              </div>

              {showSuccess ? (
                // Success state - show options to add another or continue
                <div className="space-y-4">
                  {/* Success message */}
                  <div
                    className="rounded-md bg-green-50 p-4 text-center dark:bg-green-950"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      {lastAddedName} has been added to your family!
                    </p>
                  </div>

                  {/* Children count */}
                  <p className="text-center text-sm text-muted-foreground">
                    You have {children.length}{' '}
                    {children.length === 1 ? 'child' : 'children'} in your
                    family.
                  </p>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={handleAddAnother}
                      variant="outline"
                      className="min-h-[44px] w-full"
                    >
                      Add Another Child
                    </Button>
                    <Button
                      onClick={handleContinue}
                      className="min-h-[44px] w-full"
                    >
                      Continue to Dashboard
                    </Button>
                  </div>
                </div>
              ) : (
                // Form state - show add child form
                <div className="space-y-4">
                  {/* Step description */}
                  <div className="text-center">
                    <h2 className="text-lg font-medium">
                      {hasChildren ? 'Add Another Child' : 'Add Your Child'}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Enter your child&apos;s information below. You can add
                      more children later.
                    </p>
                  </div>

                  {/* Add child form */}
                  <AddChildForm
                    onSubmit={handleAddChild}
                    isSubmitting={isSubmitting}
                  />

                  {/* Skip option if already has children */}
                  {hasChildren && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={handleContinue}
                        className="text-sm text-muted-foreground underline hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        Skip and continue to dashboard
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Existing children list (if any) */}
          {hasChildren && !showSuccess && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="mb-3 text-sm font-medium">Your Children</h3>
              <ul className="space-y-2">
                {children.map((child) => (
                  <li
                    key={child.id}
                    className="flex items-center gap-3 rounded-md bg-muted/50 p-2"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {child.firstName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm">
                      {child.firstName}
                      {child.lastName ? ` ${child.lastName}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
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
          <SafetyResourcesLink source="add-child-page" />
        </div>
      </footer>
    </div>
  )
}
