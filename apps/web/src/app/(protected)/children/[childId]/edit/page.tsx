'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { EditChildProfileForm } from '@/components/child/EditChildProfileForm'
import { useEditChild } from '@/hooks/useEditChild'
import { getChild, hasFullPermissionsForChild } from '@/services/childService'
import { SafetyResourcesLink } from '@/components/safety/SafetyResourcesLink'
import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesDialog'
import type { ChildProfile, UpdateChildInput } from '@fledgely/contracts'

/**
 * Edit Child Profile Page
 *
 * Allows parents with full guardian permissions to edit their child's profile.
 * Includes permission checking and redirects unauthorized users.
 *
 * Story 2.5: Edit Child Profile
 */
export default function EditChildPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuthContext()
  const { updateChild, loading: updating, error } = useEditChild()

  const childId = params.childId as string

  const [child, setChild] = useState<ChildProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

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
        const canEdit = await hasFullPermissionsForChild(childId, user.uid)
        setHasPermission(canEdit)

        if (!canEdit) {
          setPageError('You do not have permission to edit this profile.')
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
        setPageError('Failed to load profile. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadChild()
  }, [childId, user?.uid, authLoading])

  const handleSubmit = useCallback(
    async (data: UpdateChildInput) => {
      const updatedChild = await updateChild(childId, data)
      setChild(updatedChild)
      setHasUnsavedChanges(false)
      setSaveSuccess(true)
      // Brief delay to show success message before navigating
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    },
    [childId, updateChild, router]
  )

  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true)
      return
    }
    router.back()
  }, [hasUnsavedChanges, router])

  const handleConfirmLeave = useCallback(() => {
    setShowUnsavedDialog(false)
    router.back()
  }, [router])

  const handleCancelLeave = useCallback(() => {
    setShowUnsavedDialog(false)
  }, [])

  const handleDirtyStateChange = useCallback((isDirty: boolean) => {
    setHasUnsavedChanges(isDirty)
  }, [])

  // Show loading state only during auth check or data fetch
  // (not when we know user is not authenticated)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading profile...</p>
          </div>
        </main>
      </div>
    )
  }

  // Not authenticated - show this before data loading state
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold mb-4">Sign In Required</h1>
            <p className="text-muted-foreground mb-6">
              You need to be signed in to edit a profile.
            </p>
            <Link
              href="/auth/signin"
              className="text-primary hover:underline"
            >
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
            <p className="mt-4 text-muted-foreground">Loading profile...</p>
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
            <h1 className="text-2xl font-semibold mb-4">Cannot Edit Profile</h1>
            <p className="text-muted-foreground mb-6">
              {pageError || 'You do not have permission to edit this profile.'}
            </p>
            <button
              onClick={() => router.back()}
              className="text-primary hover:underline"
            >
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
            <p className="text-muted-foreground mb-6">
              We could not find this child profile.
            </p>
            <Link
              href="/dashboard"
              className="text-primary hover:underline"
            >
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
            onClick={handleCancel}
            className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-semibold">Edit Profile</h1>
          <p className="text-muted-foreground mt-1">
            Update {child.firstName}&apos;s profile information
          </p>
        </div>

        {/* Success message */}
        {saveSuccess && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-md bg-green-50 dark:bg-green-950 p-4 text-sm text-green-700 dark:text-green-300 mb-6"
          >
            Profile saved successfully! Redirecting...
          </div>
        )}

        {/* Error from update operation */}
        {error && (
          <div
            role="alert"
            className="rounded-md bg-destructive/10 p-4 text-sm text-destructive mb-6"
          >
            {error.message}
          </div>
        )}

        {/* Edit Form */}
        <div className="bg-card rounded-lg border p-6">
          <EditChildProfileForm
            child={child}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={updating}
            onDirtyStateChange={handleDirtyStateChange}
          />
        </div>

        {/* Last Updated Info */}
        {child.updatedAt && (
          <div className="mt-4 text-sm text-muted-foreground text-center">
            Last updated{' '}
            {child.updatedAt.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        )}
      </main>

      {/* Footer with Safety Resources */}
      <footer className="mt-auto py-6 border-t">
        <div className="container mx-auto px-4 max-w-2xl">
          <SafetyResourcesLink source="settings" />
        </div>
      </footer>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onConfirm={handleConfirmLeave}
        onCancel={handleCancelLeave}
      />
    </div>
  )
}
