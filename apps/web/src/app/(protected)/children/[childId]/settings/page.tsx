'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { useFamily } from '@/hooks/useFamily'
import { getChild, hasFullPermissionsForChild } from '@/services/childService'
import { SafetyResourcesLink } from '@/components/safety/SafetyResourcesLink'
import { RemoveChildConfirmDialog } from '@/components/child/RemoveChildConfirmDialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2, ChevronLeft, Pencil } from 'lucide-react'
import type { ChildProfile } from '@fledgely/contracts'

/**
 * Child Settings Page
 *
 * Provides access to child-specific settings including the ability to
 * remove a child from the family. Only available to guardians with full permissions.
 *
 * Story 2.6: Remove Child from Family
 *
 * Accessibility features:
 * - 44x44px minimum touch targets (NFR49)
 * - 4.5:1 color contrast ratio (NFR45)
 * - Visible focus indicators (NFR46)
 * - Keyboard accessible (NFR43)
 * - 6th-grade reading level (NFR65)
 */
export default function ChildSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuthContext()
  const { family } = useFamily()

  const childId = params.childId as string

  const [child, setChild] = useState<ChildProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)

  // Fetch child and check permissions
  useEffect(() => {
    async function loadChild() {
      if (authLoading || !user?.uid) {
        return
      }

      try {
        setLoading(true)
        setPageError(null)

        // Check permissions first
        const canManage = await hasFullPermissionsForChild(childId, user.uid)
        setHasPermission(canManage)

        if (!canManage) {
          setPageError('You do not have permission to manage this child.')
          return
        }

        // Fetch child data
        const childData = await getChild(childId)

        if (!childData) {
          setPageError('Child profile not found.')
          return
        }

        setChild(childData)
      } catch (err) {
        console.error('Error loading child:', err)
        setPageError('Failed to load settings. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadChild()
  }, [childId, user?.uid, authLoading])

  /**
   * Handle successful child removal
   */
  const handleRemoveSuccess = useCallback(() => {
    setShowRemoveDialog(false)
    // Redirect to dashboard after successful removal
    router.push('/dashboard')
  }, [router])

  /**
   * Get the child's full name for display
   */
  const getFullName = (child: ChildProfile): string => {
    return child.lastName ? `${child.firstName} ${child.lastName}` : child.firstName
  }

  // Show loading state during auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading settings...</p>
          </div>
        </main>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold mb-4">Sign In Required</h1>
            <p className="text-muted-foreground mb-6">
              You need to be signed in to access settings.
            </p>
            <Link href="/auth/signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // Show loading state while fetching data
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading settings...</p>
          </div>
        </main>
      </div>
    )
  }

  // Permission denied or error
  if (pageError || hasPermission === false) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold mb-4">Cannot Access Settings</h1>
            <p className="text-muted-foreground mb-6">
              {pageError || 'You do not have permission to manage this child.'}
            </p>
            <button onClick={() => router.back()} className="text-primary hover:underline">
              Go back
            </button>
          </div>
        </main>
      </div>
    )
  }

  // No child found
  if (!child) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold mb-4">Profile Not Found</h1>
            <p className="text-muted-foreground mb-6">We could not find this child profile.</p>
            <Link href="/dashboard" className="text-primary hover:underline">
              Go to Dashboard
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center min-h-[44px]"
          >
            <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
            Back
          </button>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage {child.firstName}&apos;s settings</p>
        </div>

        {/* Profile Section */}
        <section
          aria-labelledby="profile-heading"
          className="bg-card rounded-lg border p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 id="profile-heading" className="text-lg font-medium">
                Profile
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                View and edit {child.firstName}&apos;s profile information
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push(`/children/${childId}/edit`)}
              className="min-h-[44px]"
            >
              <Pencil className="h-4 w-4 mr-2" aria-hidden="true" />
              Edit Profile
            </Button>
          </div>

          {/* Profile summary */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-medium text-primary"
                aria-hidden="true"
              >
                {child.firstName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-lg">{getFullName(child)}</p>
                {child.nickname && (
                  <p className="text-sm text-muted-foreground">
                    Goes by &quot;{child.nickname}&quot;
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Danger Zone - Remove Child */}
        <section
          aria-labelledby="danger-zone-heading"
          className="bg-card rounded-lg border border-destructive/50 p-6"
        >
          <h2 id="danger-zone-heading" className="text-lg font-medium text-destructive">
            Danger Zone
          </h2>

          {/* Remove Child Section */}
          <div className="mt-4 pt-4 border-t border-destructive/20">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Remove {child.firstName} from Family</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This will permanently delete all of {child.firstName}&apos;s data including
                  screenshots, activity logs, device enrollments, and agreements. This action cannot
                  be undone.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setShowRemoveDialog(true)}
                  className="mt-4 min-h-[44px]"
                >
                  <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                  Remove Child
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer with Safety Resources */}
      <footer className="mt-auto py-6 border-t">
        <div className="container mx-auto px-4 max-w-2xl">
          <SafetyResourcesLink source="settings" />
        </div>
      </footer>

      {/* Remove Child Confirmation Dialog */}
      {family && (
        <RemoveChildConfirmDialog
          open={showRemoveDialog}
          onOpenChange={setShowRemoveDialog}
          childId={childId}
          familyId={family.id}
          childName={child.firstName}
          childFullName={getFullName(child)}
          onSuccess={handleRemoveSuccess}
        />
      )}
    </div>
  )
}
