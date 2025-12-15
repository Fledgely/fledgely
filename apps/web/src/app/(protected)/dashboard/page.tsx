'use client'

import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useFamily } from '@/hooks/useFamily'
import { useChild } from '@/hooks/useChild'
import { Button } from '@/components/ui/button'
import { SafetyResourcesLink } from '@/components/safety'
import { calculateAge } from '@fledgely/contracts'

/**
 * Dashboard Page - Main landing page after onboarding
 *
 * Displays the family overview including:
 * - Children list with name, age, and status
 * - "Add your first child" empty state
 * - "Add another child" action
 *
 * Accessibility Features (WCAG 2.1 AA):
 * - 44x44px minimum touch targets (NFR49)
 * - 4.5:1 color contrast ratio (NFR45)
 * - Visible focus indicators (NFR46)
 * - Keyboard accessible (NFR43)
 * - Screen reader announcements via aria-live
 */
export default function DashboardPage() {
  const router = useRouter()
  const { userProfile, loading: userLoading } = useUser()
  const { hasFamily, loading: familyLoading } = useFamily()
  const { children, hasChildren, loading: childLoading } = useChild()

  // Get first name for personalized message
  const firstName = userProfile?.displayName?.split(' ')[0] || 'there'

  // Loading state
  if (userLoading || familyLoading || childLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <main
          className="flex flex-1 flex-col items-center justify-center p-4"
          aria-busy="true"
          aria-label="Loading your dashboard"
        >
          <div className="w-full max-w-2xl space-y-6">
            {/* Screen reader loading announcement */}
            <span className="sr-only" role="status" aria-live="polite">
              Loading your dashboard, please wait.
            </span>
            {/* Loading skeleton */}
            <div className="space-y-4" aria-hidden="true">
              <div className="h-8 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-64 animate-pulse rounded bg-muted" />
              <div className="space-y-3 pt-4">
                <div className="h-20 animate-pulse rounded-lg bg-muted" />
                <div className="h-20 animate-pulse rounded-lg bg-muted" />
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Redirect to onboarding if no family
  if (!hasFamily) {
    router.push('/onboarding')
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col p-4">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your family and children from here.
            </p>
          </div>

          {/* Children section */}
          <section aria-labelledby="children-heading">
            <div className="flex items-center justify-between">
              <h2 id="children-heading" className="text-lg font-medium">
                Your Children
              </h2>
              {hasChildren && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/onboarding/add-child')}
                  className="min-h-[44px]"
                >
                  Add Child
                </Button>
              )}
            </div>

            {hasChildren ? (
              // Children list
              <ul className="mt-4 space-y-3" role="list">
                {children.map((child) => {
                  const age = calculateAge(child.birthdate)
                  return (
                    <li
                      key={child.id}
                      className="flex items-center gap-4 rounded-lg border bg-card p-4"
                    >
                      {/* Avatar */}
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-medium text-primary"
                        aria-hidden="true"
                      >
                        {child.firstName.charAt(0).toUpperCase()}
                      </div>

                      {/* Child info */}
                      <div className="flex-1">
                        <p className="font-medium">
                          {child.firstName}
                          {child.lastName ? ` ${child.lastName}` : ''}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {age} {age === 1 ? 'year' : 'years'} old
                        </p>
                      </div>

                      {/* Status badge - placeholder for future features */}
                      <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                        No device
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              // Empty state
              <div className="mt-4 rounded-lg border bg-card p-8 text-center">
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted"
                  aria-hidden="true"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-8 w-8 text-muted-foreground"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium">Add your first child</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start by adding a child to your family to create device
                  agreements and set up monitoring.
                </p>
                <Button
                  onClick={() => router.push('/onboarding/add-child')}
                  className="mt-6 min-h-[44px]"
                >
                  Add Child
                </Button>
              </div>
            )}
          </section>

          {/* Quick actions - placeholder for future features */}
          {hasChildren && (
            <section aria-labelledby="actions-heading" className="pt-4">
              <h2 id="actions-heading" className="sr-only">
                Quick Actions
              </h2>
              <div className="rounded-lg border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                <p>Device agreements and monitoring features coming soon.</p>
              </div>
            </section>
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
          <SafetyResourcesLink source="dashboard-page" />
        </div>
      </footer>
    </div>
  )
}
