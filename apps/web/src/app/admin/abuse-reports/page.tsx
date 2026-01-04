'use client'

/**
 * Admin Abuse Reports Dashboard
 *
 * Story 51.5: Abuse Reporting - AC5, AC7, AC8
 *
 * Admin-only page for reviewing and managing abuse reports.
 *
 * Requirements:
 * - AC5: 72-hour review timeline with SLA indicator
 * - AC7: Secure logging (admin only access)
 * - AC8: Investigation process with status tracking
 */

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { useAbuseReportAdmin, type AbuseReportSummary } from '../../../hooks/useAbuseReportAdmin'
import {
  AbuseReportStatus,
  AbuseReportType,
  type AbuseReportStatusValue,
  type AbuseReportTypeValue,
} from '@fledgely/shared'

type StatusFilter = 'all' | AbuseReportStatusValue

/**
 * Get status badge styles.
 */
function getStatusBadge(status: AbuseReportStatusValue): {
  text: string
  style: React.CSSProperties
} {
  switch (status) {
    case AbuseReportStatus.SUBMITTED:
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
    case AbuseReportStatus.TRIAGING:
      return {
        text: 'Triaging',
        style: {
          backgroundColor: '#fef3c7',
          color: '#d97706',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
        },
      }
    case AbuseReportStatus.INVESTIGATING:
      return {
        text: 'Investigating',
        style: {
          backgroundColor: '#fce7f3',
          color: '#be185d',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
        },
      }
    case AbuseReportStatus.RESOLVED:
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
    case AbuseReportStatus.DISMISSED:
      return {
        text: 'Dismissed',
        style: {
          backgroundColor: '#f3f4f6',
          color: '#6b7280',
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
 * Get type badge.
 */
function getTypeBadge(type: AbuseReportTypeValue): {
  text: string
  style: React.CSSProperties
} {
  const labels: Record<AbuseReportTypeValue, string> = {
    [AbuseReportType.SURVEILLANCE_OF_ADULTS]: 'Surveillance',
    [AbuseReportType.NON_FAMILY_USE]: 'Non-Family',
    [AbuseReportType.HARASSMENT]: 'Harassment',
    [AbuseReportType.OTHER]: 'Other',
  }

  return {
    text: labels[type] || type,
    style: {
      backgroundColor: '#f3e8ff',
      color: '#7c3aed',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 500,
    },
  }
}

/**
 * Get SLA badge.
 */
function getSLABadge(
  hoursUntilSLA: number,
  isPastSLA: boolean
): {
  text: string
  style: React.CSSProperties
} | null {
  if (isPastSLA) {
    return {
      text: 'OVERDUE',
      style: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase' as const,
      },
    }
  }

  if (hoursUntilSLA <= 12) {
    return {
      text: `${hoursUntilSLA}h left`,
      style: {
        backgroundColor: '#fffbeb',
        color: '#d97706',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 500,
      },
    }
  }

  return null
}

/**
 * Format date for display.
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AbuseReportsDashboardPage() {
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()
  const { getReports, updateReport, loading, error } = useAbuseReportAdmin()

  const [reports, setReports] = useState<AbuseReportSummary[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('submitted')
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  /**
   * Load reports.
   */
  const loadReports = useCallback(
    async (cursor?: string) => {
      const result = await getReports({
        status: statusFilter,
        limit: 20,
        startAfter: cursor,
      })

      if (result) {
        if (cursor) {
          setReports((prev) => [...prev, ...result.reports])
        } else {
          setReports(result.reports)
        }
        setHasMore(result.hasMore)
        setNextCursor(result.nextCursor)
      } else if (error?.includes('Access denied') || error?.includes('permission-denied')) {
        setAccessDenied(true)
      }
    },
    [getReports, statusFilter, error]
  )

  /**
   * Quick status update.
   */
  const handleQuickStatusChange = async (reportId: string, newStatus: AbuseReportStatusValue) => {
    setUpdatingId(reportId)

    const success = await updateReport({
      reportId,
      status: newStatus,
    })

    if (success) {
      // Update local state
      setReports((prev) =>
        prev.map((r) => (r.reportId === reportId ? { ...r, status: newStatus } : r))
      )
    }

    setUpdatingId(null)
  }

  // Load reports on mount and filter change
  useEffect(() => {
    if (firebaseUser && !authLoading) {
      loadReports()
    }
  }, [firebaseUser, authLoading, statusFilter, loadReports])

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
        <h1 style={styles.title}>Abuse Reports</h1>
        <p style={styles.subtitle}>Review and investigate suspected misuse (72-hour SLA)</p>
      </header>

      {/* Filter tabs */}
      <div style={styles.filterContainer}>
        {(
          [
            'submitted',
            'triaging',
            'investigating',
            'resolved',
            'dismissed',
            'all',
          ] as StatusFilter[]
        ).map((filter) => (
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
            {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Error display */}
      {error && !accessDenied && (
        <div style={styles.error} role="alert">
          {error}
        </div>
      )}

      {/* Report list */}
      <div style={styles.reportList}>
        {loading && reports.length === 0 ? (
          <div style={styles.loading}>Loading reports...</div>
        ) : reports.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No reports found</p>
          </div>
        ) : (
          reports.map((report) => {
            const statusBadge = getStatusBadge(report.status)
            const typeBadge = getTypeBadge(report.type)
            const slaBadge = getSLABadge(report.hoursUntilSLA, report.isPastSLA)

            return (
              <div key={report.reportId} style={styles.reportCard}>
                <div style={styles.reportHeader}>
                  <div style={styles.reportBadges}>
                    <span style={statusBadge.style}>{statusBadge.text}</span>
                    <span style={typeBadge.style}>{typeBadge.text}</span>
                    {slaBadge && <span style={slaBadge.style}>{slaBadge.text}</span>}
                    {report.isAnonymous && <span style={styles.anonymousBadge}>Anonymous</span>}
                  </div>
                  <span style={styles.reportDate}>{formatDate(report.submittedAt)}</span>
                </div>

                <p style={styles.reportPreview}>{report.descriptionPreview}</p>

                <div style={styles.reportMeta}>
                  {report.reporterEmail && (
                    <span style={styles.reportEmail}>{report.reporterEmail}</span>
                  )}
                  {report.referenceNumber && (
                    <span style={styles.reportRef}>{report.referenceNumber}</span>
                  )}
                </div>

                {/* Quick actions */}
                <div style={styles.quickActions}>
                  {report.status === AbuseReportStatus.SUBMITTED && (
                    <button
                      onClick={() =>
                        handleQuickStatusChange(report.reportId, AbuseReportStatus.TRIAGING)
                      }
                      disabled={updatingId === report.reportId}
                      style={styles.actionButton}
                    >
                      Start Triage
                    </button>
                  )}
                  {report.status === AbuseReportStatus.TRIAGING && (
                    <>
                      <button
                        onClick={() =>
                          handleQuickStatusChange(report.reportId, AbuseReportStatus.INVESTIGATING)
                        }
                        disabled={updatingId === report.reportId}
                        style={styles.actionButton}
                      >
                        Investigate
                      </button>
                      <button
                        onClick={() =>
                          handleQuickStatusChange(report.reportId, AbuseReportStatus.DISMISSED)
                        }
                        disabled={updatingId === report.reportId}
                        style={styles.dismissButton}
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                  {report.status === AbuseReportStatus.INVESTIGATING && (
                    <button
                      onClick={() =>
                        handleQuickStatusChange(report.reportId, AbuseReportStatus.RESOLVED)
                      }
                      disabled={updatingId === report.reportId}
                      style={styles.resolveButton}
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div style={styles.loadMoreContainer}>
          <button
            onClick={() => loadReports(nextCursor || undefined)}
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
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
    color: '#ffffff',
  },
  reportList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  reportCard: {
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  reportBadges: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  anonymousBadge: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
  },
  reportDate: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  reportPreview: {
    fontSize: '14px',
    color: '#374151',
    margin: '0 0 8px',
    lineHeight: 1.5,
  },
  reportMeta: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px',
  },
  reportEmail: {
    fontSize: '12px',
    color: '#6b7280',
  },
  reportRef: {
    fontSize: '12px',
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
  quickActions: {
    display: 'flex',
    gap: '8px',
    paddingTop: '12px',
    borderTop: '1px solid #f3f4f6',
  },
  actionButton: {
    padding: '6px 12px',
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  dismissButton: {
    padding: '6px 12px',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  resolveButton: {
    padding: '6px 12px',
    backgroundColor: '#d1fae5',
    color: '#059669',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: 500,
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
