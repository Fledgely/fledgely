'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { useFamily } from '@/hooks/useFamily'
import { InvitationManagement, InvitationDialog } from '@/components/invitation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

/**
 * Invitation Management Page
 *
 * Story 3.5: Invitation Management - Task 8
 *
 * Displays:
 * - Pending invitation (if exists) with resend/revoke actions
 * - Invitation history (accepted, expired, revoked)
 * - Option to create new invitation if no pending exists
 *
 * Accessibility:
 * - 44x44px touch targets (NFR49)
 * - 4.5:1 color contrast (NFR45)
 * - Keyboard navigable
 * - Screen reader friendly
 */
export default function InvitationManagementPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthContext()
  const { family, loading: familyLoading } = useFamily()

  // State for invitation dialog
  const [invitationDialogOpen, setInvitationDialogOpen] = useState(false)

  // Generate family name from user's display name
  const familyName = (() => {
    if (!family) return 'Your Family'
    // Try to derive from user name if we had it
    return 'Your Family'
  })()

  // Loading state
  if (authLoading || familyLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <main
          className="flex flex-1 flex-col items-center justify-center p-4"
          aria-busy="true"
          aria-label="Loading invitations"
        >
          <div className="w-full max-w-2xl space-y-6">
            <span className="sr-only" role="status" aria-live="polite">
              Loading invitations, please wait.
            </span>
            <div className="space-y-4" aria-hidden="true">
              <div className="h-8 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-64 animate-pulse rounded bg-muted" />
              <div className="space-y-3 pt-4">
                <div className="h-24 animate-pulse rounded-lg bg-muted" />
                <div className="h-24 animate-pulse rounded-lg bg-muted" />
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Redirect if no family
  if (!family) {
    router.push('/onboarding')
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col p-4">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          {/* Back navigation */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="min-h-[44px] min-w-[44px] gap-2 p-2"
              aria-label="Go back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Manage Invitations
            </h1>
            <p className="text-sm text-muted-foreground">
              View and manage co-parent invitations for your family.
            </p>
          </div>

          {/* Invitation Management Component */}
          <InvitationManagement
            familyId={family.id}
            currentUserId={user?.uid ?? ''}
            onCreateInvitation={() => setInvitationDialogOpen(true)}
          />
        </div>
      </main>

      {/* Footer */}
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
        </div>
      </footer>

      {/* Invitation Dialog */}
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
