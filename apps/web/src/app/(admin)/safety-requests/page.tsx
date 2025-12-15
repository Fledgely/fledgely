'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  listSafetyRequests,
  SafetyRequestSummary,
  ListSafetyRequestsInput,
} from '@/lib/admin-api'
import { Button } from '@/components/ui/button'

/**
 * Safety Requests Queue Page
 *
 * CRITICAL: This page displays safety requests for safety-team review.
 * All data access is verified server-side via Cloud Functions.
 *
 * Security: Only accessible to users with isSafetyTeam or isAdmin claims
 */
export default function SafetyRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<SafetyRequestSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  // Filter state
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'in-progress' | 'resolved'
  >('all')
  const [escalatedFilter, setEscalatedFilter] = useState<boolean | undefined>(
    undefined
  )
  const [sortBy, setSortBy] = useState<'submittedAt' | 'updatedAt'>('submittedAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const fetchRequests = useCallback(
    async (cursor?: string) => {
      setLoading(true)
      setError(null)

      try {
        const input: ListSafetyRequestsInput = {
          status: statusFilter,
          escalated: escalatedFilter,
          sortBy,
          sortDirection,
          limit: 20,
        }

        if (cursor) {
          input.startAfter = cursor
        }

        const result = await listSafetyRequests(input)

        if (cursor) {
          setRequests((prev) => [...prev, ...result.requests])
        } else {
          setRequests(result.requests)
        }

        setHasMore(result.hasMore)
        setNextCursor(result.nextCursor)
      } catch (err) {
        console.error('Error fetching requests:', err)
        setError('Failed to load safety requests. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    [statusFilter, escalatedFilter, sortBy, sortDirection]
  )

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const loadMore = () => {
    if (nextCursor) {
      fetchRequests(nextCursor)
    }
  }

  const formatDate = (timestamp: { _seconds: number }) => {
    return new Date(timestamp._seconds * 1000).toLocaleString()
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Safety Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and respond to safety escape requests
          </p>
        </div>
        <Button
          onClick={() => fetchRequests()}
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
                  e.target.value as 'all' | 'pending' | 'in-progress' | 'resolved'
                )
              }
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Escalated Filter */}
          <div>
            <label className="text-sm font-medium">Escalated</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
              value={escalatedFilter === undefined ? 'any' : String(escalatedFilter)}
              onChange={(e) => {
                const val = e.target.value
                setEscalatedFilter(
                  val === 'any' ? undefined : val === 'true'
                )
              }}
            >
              <option value="any">Any</option>
              <option value="true">Escalated Only</option>
              <option value="false">Not Escalated</option>
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

      {/* Request List */}
      <div className="bg-white rounded-lg border">
        {loading && requests.length === 0 ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">
              Loading requests...
            </p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No safety requests found matching your filters.
          </div>
        ) : (
          <div className="divide-y">
            {requests.map((request) => (
              <div
                key={request.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() =>
                  router.push(`/admin/safety-requests/${request.id}`)
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${getStatusBadge(
                          request.status
                        )}`}
                      >
                        {request.status}
                      </span>
                      {request.isEscalated && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800">
                          ESCALATED
                        </span>
                      )}
                      {request.hasDocuments && (
                        <span className="text-xs text-muted-foreground">
                          {request.documentCount} doc
                          {request.documentCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-900 truncate">
                      {request.messagePreview}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Submitted: {formatDate(request.submittedAt)}</span>
                      {request.hasEmail && <span>Has safe email</span>}
                      {request.hasPhone && <span>Has safe phone</span>}
                    </div>
                  </div>
                  {request.assignedTo && (
                    <div className="ml-4 text-xs text-muted-foreground">
                      Assigned: {request.assignedTo.slice(0, 8)}...
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
