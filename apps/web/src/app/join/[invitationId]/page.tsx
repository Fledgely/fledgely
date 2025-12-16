'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { JoinFamily } from '@/components/invitation/JoinFamily'
import { getInvitationPreview, acceptInvitation } from '@/services/invitationService'
import { getAcceptanceErrorMessage } from '@fledgely/contracts'

/**
 * Join Family Page - Co-Parent Invitation Acceptance
 *
 * Story 3.3: Co-Parent Invitation Acceptance
 *
 * Route: /join/[invitationId]?token=xxx
 *
 * Flow:
 * 1. Page loads and fetches invitation preview (public data)
 * 2. If user is not logged in, show "Sign in to join" button
 * 3. If user is logged in, show acceptance form
 * 4. On accept, verify token and add user to family atomically
 * 5. On success, redirect to family dashboard with welcome toast
 * 6. On error, show friendly error message (6th-grade reading level)
 *
 * Error states handled:
 * - Invitation not found
 * - Invitation expired
 * - Invitation already used
 * - Invitation revoked
 * - Self-invitation (user is inviter)
 * - Already a guardian
 * - Invalid token
 */

interface InvitationPreview {
  familyName: string
  invitedByName: string
  status: 'pending' | 'expired' | 'accepted' | 'revoked'
  expiresAt: Date
  isExpired: boolean
}

export default function JoinFamilyPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading, signInWithGoogle } = useAuthContext()

  const invitationId = params.invitationId as string
  const token = searchParams.get('token') || ''

  // State
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch invitation preview on mount
  useEffect(() => {
    async function fetchInvitation() {
      if (!invitationId) {
        setError('This invitation link is not valid.')
        setLoading(false)
        return
      }

      try {
        const preview = await getInvitationPreview(invitationId)

        if (!preview) {
          setError('This invitation no longer exists.')
          setLoading(false)
          return
        }

        // Check for non-pending states
        if (preview.status === 'accepted') {
          setError('This invitation has already been used.')
        } else if (preview.status === 'revoked') {
          setError('This invitation was canceled.')
        } else if (preview.isExpired) {
          setError(
            'This invitation has expired. Please ask the person who invited you to send a new one.'
          )
        }

        setInvitation(preview)
      } catch (err) {
        console.error('[JoinFamilyPage] Failed to fetch invitation:', err)
        setError('Something went wrong. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchInvitation()
  }, [invitationId])

  // Handle invitation acceptance
  const handleAccept = async () => {
    if (!user || !token) return

    setAccepting(true)
    setError(null)

    try {
      const result = await acceptInvitation(invitationId, token, user.uid)

      if (result.success) {
        // Redirect to family dashboard with success message
        // Using searchParams to trigger a welcome toast
        router.push(`/dashboard?joined=true&family=${encodeURIComponent(result.familyName || '')}`)
      } else {
        // Show friendly error message
        setError(getAcceptanceErrorMessage(result.errorCode || 'acceptance-failed'))
      }
    } catch (err) {
      console.error('[JoinFamilyPage] Failed to accept invitation:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  // Handle sign-in for unauthenticated users
  const handleSignIn = async () => {
    try {
      // Store the current URL to redirect back after sign-in
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('joinRedirect', window.location.href)
      }
      await signInWithGoogle()
    } catch (err) {
      console.error('[JoinFamilyPage] Sign-in failed:', err)
      setError('Could not sign in. Please try again.')
    }
  }

  // Check for redirect back after sign-in
  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      const joinRedirect = sessionStorage.getItem('joinRedirect')
      if (joinRedirect) {
        sessionStorage.removeItem('joinRedirect')
        // Already on the correct page, no redirect needed
      }
    }
  }, [user])

  // Loading state
  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex flex-1 flex-col items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6">
            {/* Skeleton loader for invitation card */}
            <div className="rounded-lg border bg-card p-8 shadow-sm">
              <div className="space-y-4">
                <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-muted" />
                <div className="mx-auto h-6 w-48 animate-pulse rounded bg-muted" />
                <div className="mx-auto h-4 w-64 animate-pulse rounded bg-muted" />
                <div className="mx-auto h-10 w-32 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <JoinFamily
            invitation={invitation}
            error={error}
            isAuthenticated={!!user}
            isAccepting={accepting}
            onAccept={handleAccept}
            onSignIn={handleSignIn}
            onClearError={() => setError(null)}
          />
        </div>
      </main>

      {/* Simple footer */}
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
    </div>
  )
}
