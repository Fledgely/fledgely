'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  listLegalPetitions,
  LegalPetitionSummary,
  ListLegalPetitionsInput,
} from '@/lib/admin-api'
import { Button } from '@/components/ui/button'

/**
 * Legal Petitions Queue Page
 *
 * Story 3.6: Legal Parent Petition for Access - Task 9
 *
 * CRITICAL: This page displays legal parent petitions for safety-team review.
 * All data access is verified server-side via Cloud Functions.
 *
 * Security: Only accessible to users with isSafetyTeam or isAdmin claims
 */
export default function LegalPetitionsPage() {
  const router = useRouter()
  const [petitions, setPetitions] = useState<LegalPetitionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  // Filter state
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'under-review' | 'verified' | 'denied'
  >('all')
  const [sortBy, setSortBy] = useState<'submittedAt' | 'updatedAt'>('submittedAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const fetchPetitions = useCallback(
    async (cursor?: string) => {
      setLoading(true)
      setError(null)

      try {
        const input: ListLegalPetitionsInput = {
          status: statusFilter,
          sortBy,
          sortDirection,
          limit: 20,
        }

        if (cursor) {
          input.startAfter = cursor
        }

        const result = await listLegalPetitions(input)

        if (cursor) {
          setPetitions((prev) => [...prev, ...result.petitions])
        } else {
          setPetitions(result.petitions)
        }

        setHasMore(result.hasMore)
        setNextCursor(result.nextCursor)
      } catch (err) {
        console.error('Error fetching petitions:', err)
        setError('Failed to load legal petitions. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    [statusFilter, sortBy, sortDirection]
  )

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchPetitions()
  }, [fetchPetitions])

  const loadMore = () => {
    if (nextCursor) {
      fetchPetitions(nextCursor)
    }
  }

  const formatDate = (timestamp: { _seconds: number }) => {
    return new Date(timestamp._seconds * 1000).toLocaleString()
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      'under-review': 'bg-blue-100 text-blue-800',
      verified: 'bg-green-100 text-green-800',
      denied: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      'under-review': 'Under Review',
      verified: 'Verified',
      denied: 'Denied',
    }
    return labels[status] || status
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Legal Parent Petitions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and process legal parent access requests
          </p>
        </div>
        <Button
          onClick={() => fetchPetitions()}
          variant="outline"
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap gap-4">
          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as
                    | 'all'
                    | 'pending'
                    | 'under-review'
                    | 'verified'
                    | 'denied'
                )
              }
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="under-review">Under Review</option>
              <option value="verified">Verified</option>
              <option value="denied">Denied</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="text-sm font-medium">Sort By</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'submittedAt' | 'updatedAt')
              }
            >
              <option value="submittedAt">Submitted Date</option>
              <option value="updatedAt">Last Updated</option>
            </select>
          </div>

          {/* Sort Direction */}
          <div>
            <label className="text-sm font-medium">Order</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
              value={sortDirection}
              onChange={(e) =>
                setSortDirection(e.target.value as 'asc' | 'desc')
              }
            >
              <option value="asc">Oldest First</option>
              <option value="desc">Newest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Petition List */}
      <div className="bg-white rounded-lg border">
        {loading && petitions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">
              Loading petitions...
            </p>
          </div>
        ) : petitions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No legal petitions found matching your filters.
          </div>
        ) : (
          <div className="divide-y">
            {petitions.map((petition) => (
              <div
                key={petition.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() =>
                  router.push(`/legal-petitions/${petition.id}`)
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${getStatusBadge(
                          petition.status
                        )}`}
                      >
                        {getStatusLabel(petition.status)}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {petition.referenceNumber}
                      </span>
                      {petition.hasDocuments && (
                        <span className="text-xs text-muted-foreground">
                          {petition.documentCount} doc
                          {petition.documentCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-4">
                      <p className="text-sm font-medium text-gray-900">
                        {petition.petitionerName}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        seeking access to
                      </span>
                      <p className="text-sm text-gray-700">
                        {petition.childName}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Submitted: {formatDate(petition.submittedAt)}</span>
                      <span>
                        Relationship:{' '}
                        {petition.claimedRelationship === 'parent'
                          ? 'Parent'
                          : 'Legal Guardian'}
                      </span>
                    </div>
                  </div>
                  {petition.assignedTo && (
                    <div className="ml-4 text-xs text-muted-foreground">
                      Assigned: {petition.assignedTo.slice(0, 8)}...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="p-4 border-t text-center">
            <Button onClick={loadMore} variant="outline" disabled={loading}>
              {loading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
