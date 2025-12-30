/**
 * Safety Dashboard Page.
 *
 * Story 0.5.3: Support Agent Escape Dashboard
 *
 * Admin-only page for viewing and managing safety tickets.
 * Requires safety-team custom claim.
 */

'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { useSafetyAdmin, type SafetyTicketSummary } from '../../../hooks/useSafetyAdmin'

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'resolved' | 'escalated'

/**
 * Get urgency badge styles.
 */
function getUrgencyBadge(urgency: string): { text: string; style: React.CSSProperties } {
  switch (urgency) {
    case 'urgent':
      return {
        text: 'Urgent',
        style: {
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
        },
      }
    case 'soon':
      return {
        text: 'Soon',
        style: {
          backgroundColor: '#fffbeb',
          color: '#d97706',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
        },
      }
    default:
      return {
        text: 'Normal',
        style: {
          backgroundColor: '#f3f4f6',
          color: '#6b7280',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
        },
      }
  }
}

/**
 * Get status badge styles.
 */
function getStatusBadge(status: string): { text: string; style: React.CSSProperties } {
  switch (status) {
    case 'pending':
      return {
        text: 'New',
        style: {
          backgroundColor: '#dbeafe',
          color: '#2563eb',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
        },
      }
    case 'in_progress':
      return {
        text: 'In Progress',
        style: {
          backgroundColor: '#fef3c7',
          color: '#d97706',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
        },
      }
    case 'resolved':
      return {
        text: 'Resolved',
        style: {
          backgroundColor: '#d1fae5',
          color: '#059669',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
        },
      }
    case 'escalated':
      return {
        text: 'Escalated',
        style: {
          backgroundColor: '#fce7f3',
          color: '#be185d',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
        },
      }
    default:
      return {
        text: status,
        style: {
          backgroundColor: '#f3f4f6',
          color: '#6b7280',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
        },
      }
  }
}

/**
 * Format date for display.
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SafetyDashboardPage() {
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()
  const { getTickets, loading, error } = useSafetyAdmin()

  const [tickets, setTickets] = useState<SafetyTicketSummary[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)

  /**
   * Load tickets.
   */
  const loadTickets = useCallback(
    async (cursor?: string) => {
      const result = await getTickets({
        status: statusFilter,
        limit: 20,
        startAfter: cursor,
      })

      if (result) {
        if (cursor) {
          setTickets((prev) => [...prev, ...result.tickets])
        } else {
          setTickets(result.tickets)
        }
        setHasMore(result.hasMore)
        setNextCursor(result.nextCursor)
      } else if (error?.includes('Access denied') || error?.includes('permission-denied')) {
        setAccessDenied(true)
      }
    },
    [getTickets, statusFilter, error]
  )

  // Load tickets on mount and filter change
  useEffect(() => {
    if (firebaseUser && !authLoading) {
      loadTickets()
    }
  }, [firebaseUser, authLoading, statusFilter, loadTickets])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login')
    }
  }, [authLoading, firebaseUser, router])

  // Handle loading states
  if (authLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    )
  }

  // Handle access denied
  if (accessDenied) {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <h1 style={styles.accessDeniedTitle}>Access Denied</h1>
          <p style={styles.accessDeniedText}>You do not have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Safety Dashboard</h1>
        <p style={styles.subtitle}>Review and process safety requests</p>
      </header>

      {/* Filter tabs */}
      <div style={styles.filterContainer}>
        {(['pending', 'in_progress', 'escalated', 'resolved', 'all'] as StatusFilter[]).map(
          (filter) => (
            <button
              key={filter}
              onClick={() => {
                setStatusFilter(filter)
                setNextCursor(null)
              }}
              style={{
                ...styles.filterButton,
                ...(statusFilter === filter ? styles.filterButtonActive : {}),
              }}
            >
              {filter === 'all'
                ? 'All'
                : filter === 'in_progress'
                  ? 'In Progress'
                  : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          )
        )}
      </div>

      {/* Error display */}
      {error && !accessDenied && (
        <div style={styles.error} role="alert">
          {error}
        </div>
      )}

      {/* Ticket list */}
      <div style={styles.ticketList}>
        {loading && tickets.length === 0 ? (
          <div style={styles.loading}>Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No tickets found</p>
          </div>
        ) : (
          tickets.map((ticket) => {
            const urgencyBadge = getUrgencyBadge(ticket.urgency)
            const statusBadge = getStatusBadge(ticket.status)

            return (
              <div
                key={ticket.id}
                style={styles.ticketCard}
                onClick={() => router.push(`/admin/safety/${ticket.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && router.push(`/admin/safety/${ticket.id}`)}
              >
                <div style={styles.ticketHeader}>
                  <div style={styles.ticketBadges}>
                    <span style={urgencyBadge.style}>{urgencyBadge.text}</span>
                    <span style={statusBadge.style}>{statusBadge.text}</span>
                    {ticket.hasDocuments && (
                      <span style={styles.documentBadge}>📎 {ticket.documentCount}</span>
                    )}
                  </div>
                  <span style={styles.ticketDate}>{formatDate(ticket.createdAt)}</span>
                </div>

                <p style={styles.ticketPreview}>{ticket.messagePreview}</p>

                {ticket.userEmail && <p style={styles.ticketEmail}>{ticket.userEmail}</p>}
              </div>
            )
          })
        )}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div style={styles.loadMoreContainer}>
          <button
            onClick={() => loadTickets(nextCursor || undefined)}
            disabled={loading}
            style={styles.loadMoreButton}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '8px 0 0',
  },
  filterContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  filterButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
    color: '#ffffff',
  },
  ticketList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  ticketCard: {
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  ticketHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  ticketBadges: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  documentBadge: {
    fontSize: '12px',
    color: '#6b7280',
  },
  ticketDate: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  ticketPreview: {
    fontSize: '14px',
    color: '#374151',
    margin: '0 0 8px',
    lineHeight: 1.5,
  },
  ticketEmail: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
  },
  loading: {
    textAlign: 'center',
    padding: '48px',
    color: '#6b7280',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px',
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  loadMoreContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '24px',
  },
  loadMoreButton: {
    padding: '10px 24px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    color: '#374151',
    fontSize: '14px',
    cursor: 'pointer',
  },
  accessDenied: {
    textAlign: 'center',
    padding: '48px',
  },
  accessDeniedTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 16px',
  },
  accessDeniedText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
}
