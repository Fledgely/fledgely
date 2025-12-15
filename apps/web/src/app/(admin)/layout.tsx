'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/lib/admin-auth'

/**
 * Admin Layout
 *
 * CRITICAL: This layout protects all admin routes.
 * Requires safety-team or admin custom claims.
 *
 * Security invariants:
 * 1. User must be authenticated
 * 2. User must have isSafetyTeam or isAdmin claim
 * 3. All API calls verify claims server-side
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, loading, hasSafetyAccess, error } = useAdminAuth()

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login if not authenticated
      router.replace('/login?redirect=/admin/safety-requests')
    } else if (!loading && user && !hasSafetyAccess) {
      // Redirect to dashboard if authenticated but no admin access
      router.replace('/settings')
    }
  }, [user, loading, hasSafetyAccess, router])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">
            Verifying access...
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Authentication error</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please try refreshing the page.
          </p>
        </div>
      </div>
    )
  }

  // Not authorized
  if (!hasSafetyAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Access Denied</p>
          <p className="text-sm text-muted-foreground mt-2">
            You do not have permission to access this area.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-semibold">Fledgely Admin</span>
            <span className="text-sm text-muted-foreground bg-yellow-100 px-2 py-0.5 rounded">
              Safety Team
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {user?.email}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
