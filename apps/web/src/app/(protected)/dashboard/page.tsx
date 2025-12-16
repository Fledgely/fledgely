'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useFamily } from '@/hooks/useFamily'
import { useChild } from '@/hooks/useChild'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import { SafetyResourcesLink } from '@/components/safety'
import { RemoveChildConfirmDialog } from '@/components/child/RemoveChildConfirmDialog'
import { InvitationDialog } from '@/components/invitation'
import { calculateAge } from '@fledgely/contracts'
import type { ChildProfile } from '@fledgely/contracts'
import { Trash2, UserPlus, CheckCircle2, X } from 'lucide-react'

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
  const searchParams = useSearchParams()
  const { user } = useAuthContext()
  const { userProfile, loading: userLoading } = useUser()
  const { family, hasFamily, loading: familyLoading } = useFamily()
  const { children, hasChildren, loading: childLoading, refreshChildren } = useChild()

  // State for remove child dialog
  const [removeDialogChild, setRemoveDialogChild] = useState<ChildProfile | null>(null)

  // State for invitation dialog (Story 3.1)
  const [invitationDialogOpen, setInvitationDialogOpen] = useState(false)

  // State for welcome banner (Story 3.3: Co-Parent Invitation Acceptance)
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false)
  const [joinedFamilyName, setJoinedFamilyName] = useState<string | null>(null)

  // Check for join success params and show welcome banner
  useEffect(() => {
    const joined = searchParams.get('joined')
    const familyName = searchParams.get('family')

    if (joined === 'true') {
      setShowWelcomeBanner(true)
      setJoinedFamilyName(familyName)

      // Clear the URL params without causing a refresh
      const url = new URL(window.location.href)
      url.searchParams.delete('joined')
      url.searchParams.delete('family')
      window.history.replaceState({}, '', url.pathname)

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setShowWelcomeBanner(false)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [searchParams])

  // Get first name for personalized message
  const firstName = userProfile?.displayName?.split(' ')[0] || 'there'

  // Generate family name from user's last name or display name
  // Uses format "Smith Family" or "Your Family" as fallback
  const familyName = (() => {
    const displayName = userProfile?.displayName || ''
    const nameParts = displayName.trim().split(' ')
    if (nameParts.length > 1) {
      // Use last name for family name (e.g., "Smith Family")
      return `${nameParts[nameParts.length - 1]} Family`
    } else if (nameParts[0]) {
      // Use first name if only one name part (e.g., "John's Family")
      return `${nameParts[0]}'s Family`
    }
    return 'Your Family'
  })()

  /**
   * Check if the current user has full permissions for a child
   * Only guardians with 'full' permissions can remove children
   */
  const hasFullPermissions = useCallback(
    (child: ChildProfile): boolean => {
      if (!user?.uid) return false
      const guardian = child.guardians.find((g) => g.uid === user.uid)
      return guardian?.permissions === 'full'
    },
    [user?.uid]
  )

  /**
   * Handle successful child removal
   */
  const handleRemoveSuccess = useCallback(async () => {
    setRemoveDialogChild(null)
    // Refresh the children list
    await refreshChildren()
  }, [refreshChildren])

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
          {/* Welcome Banner - Story 3.3: Co-Parent Invitation Acceptance */}
          {showWelcomeBanner && (
            <div
              className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4"
              role="alert"
              aria-live="polite"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2
                  className="h-5 w-5 text-green-600"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium text-green-900">
                    Welcome to the family!
                  </p>
                  <p className="text-sm text-green-700">
                    You&apos;ve successfully joined{' '}
                    {joinedFamilyName ? (
                      <span className="font-medium">{joinedFamilyName}</span>
                    ) : (
                      'the family'
                    )}
                    .
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWelcomeBanner(false)}
                className="min-h-[44px] min-w-[44px] rounded-md p-2 text-green-600 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                aria-label="Dismiss welcome message"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your family and children from here.
            </p>
          </div>

          {/* Family section with invite co-parent (Story 3.1) */}
          {family && (
            <section aria-labelledby="family-heading" className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 id="family-heading" className="text-lg font-medium">
                    {familyName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {family.guardians.length} {family.guardians.length === 1 ? 'guardian' : 'guardians'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setInvitationDialogOpen(true)}
                  className="min-h-[44px] gap-2"
                  aria-label="Invite a co-parent to join your family"
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Invite Co-Parent</span>
                  <span className="sm:hidden">Invite</span>
                </Button>
              </div>
            </section>
          )}

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

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {/* Status badge - placeholder for future features */}
                        <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                          No device
                        </div>

                        {/* Edit button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/children/${child.id}/edit`)}
                          className="min-h-[44px] min-w-[44px] p-2"
                          aria-label={`Edit ${child.firstName}'s profile`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="h-5 w-5"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                            />
                          </svg>
                        </Button>

                        {/* Remove button - only for guardians with full permissions */}
                        {hasFullPermissions(child) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRemoveDialogChild(child)}
                            className="min-h-[44px] min-w-[44px] p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Remove ${child.firstName} from family`}
                          >
                            <Trash2 className="h-5 w-5" aria-hidden="true" />
                          </Button>
                        )}
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
          <SafetyResourcesLink source="settings" />
        </div>
      </footer>

      {/* Remove Child Confirmation Dialog */}
      {removeDialogChild && family && (
        <RemoveChildConfirmDialog
          open={!!removeDialogChild}
          onOpenChange={(open) => !open && setRemoveDialogChild(null)}
          childId={removeDialogChild.id}
          familyId={family.id}
          childName={removeDialogChild.firstName}
          childFullName={
            removeDialogChild.lastName
              ? `${removeDialogChild.firstName} ${removeDialogChild.lastName}`
              : removeDialogChild.firstName
          }
          onSuccess={handleRemoveSuccess}
        />
      )}

      {/* Invitation Dialog (Story 3.1) */}
      {family && (
        <InvitationDialog
          open={invitationDialogOpen}
          onOpenChange={setInvitationDialogOpen}
          familyId={family.id}
          familyName={familyName}
        />
      )}
    </div>
  )
}
