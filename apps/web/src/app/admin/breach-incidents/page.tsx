'use client'

/**
 * Admin Breach Incidents Dashboard
 *
 * Story 51.6: Breach Notification - AC1, AC4, AC5, AC6, AC7
 *
 * Admin-only page for managing data breach incidents.
 *
 * Requirements:
 * - AC1: 72-hour notification deadline tracking
 * - AC4: Regulatory notification tracking
 * - AC5: Incident documentation
 * - AC6: Response plan checklist
 * - AC7: Post-incident review
 */

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import {
  useBreachIncidentAdmin,
  type BreachIncidentSummary,
} from '../../../hooks/useBreachIncidentAdmin'
import {
  BreachIncidentStatus,
  BreachSeverity,
  AffectedDataType,
  AffectedDataTypeLabels,
  getSeverityColor,
  type BreachIncidentStatusValue,
  type BreachSeverityValue,
  type AffectedDataTypeValue,
  type CreateBreachIncidentInput,
} from '@fledgely/shared'

type StatusFilter = 'all' | BreachIncidentStatusValue

/**
 * Get status badge styles.
 */
function getStatusBadge(status: BreachIncidentStatusValue): {
  text: string
  style: React.CSSProperties
} {
  switch (status) {
    case BreachIncidentStatus.DETECTED:
      return {
        text: 'Detected',
        style: {
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
        },
      }
    case BreachIncidentStatus.INVESTIGATING:
      return {
        text: 'Investigating',
        style: {
          backgroundColor: '#fef3c7',
          color: '#d97706',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
        },
      }
    case BreachIncidentStatus.CONTAINED:
      return {
        text: 'Contained',
        style: {
          backgroundColor: '#dbeafe',
          color: '#2563eb',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
        },
      }
    case BreachIncidentStatus.NOTIFIED:
      return {
        text: 'Notified',
        style: {
          backgroundColor: '#fce7f3',
          color: '#be185d',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
        },
      }
    case BreachIncidentStatus.RESOLVED:
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
 * Get severity badge.
 */
function getSeverityBadge(severity: BreachSeverityValue): {
  text: string
  style: React.CSSProperties
} {
  const colors = getSeverityColor(severity)

  return {
    text: severity.charAt(0).toUpperCase() + severity.slice(1),
    style: {
      backgroundColor: colors.bg,
      color: colors.text,
      border: `1px solid ${colors.border}`,
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
    },
  }
}

/**
 * Get deadline badge.
 */
function getDeadlineBadge(
  hoursUntilDeadline: number,
  isApproaching: boolean,
  isPassed: boolean
): {
  text: string
  style: React.CSSProperties
} | null {
  if (isPassed) {
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

  if (isApproaching) {
    return {
      text: `${hoursUntilDeadline}h left`,
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

export default function BreachIncidentsDashboardPage() {
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()
  const { getIncidents, createIncident, updateIncident, loading, error } = useBreachIncidentAdmin()

  const [incidents, setIncidents] = useState<BreachIncidentSummary[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  /**
   * Load incidents.
   */
  const loadIncidents = useCallback(
    async (cursor?: string) => {
      const result = await getIncidents({
        status: statusFilter,
        limit: 20,
        startAfter: cursor,
      })

      if (result) {
        if (cursor) {
          setIncidents((prev) => [...prev, ...result.incidents])
        } else {
          setIncidents(result.incidents)
        }
        setHasMore(result.hasMore)
        setNextCursor(result.nextCursor)
      } else if (error?.includes('Access denied') || error?.includes('permission-denied')) {
        setAccessDenied(true)
      }
    },
    [getIncidents, statusFilter, error]
  )

  /**
   * Quick status update.
   */
  const handleQuickStatusChange = async (
    incidentId: string,
    newStatus: BreachIncidentStatusValue
  ) => {
    setUpdatingId(incidentId)

    const success = await updateIncident({
      incidentId,
      status: newStatus,
    })

    if (success) {
      setIncidents((prev) =>
        prev.map((i) => (i.incidentId === incidentId ? { ...i, status: newStatus } : i))
      )
    }

    setUpdatingId(null)
  }

  /**
   * Send user notifications.
   */
  const handleSendNotifications = async (incidentId: string) => {
    setUpdatingId(incidentId)

    const success = await updateIncident({
      incidentId,
      sendUserNotifications: true,
    })

    if (success) {
      setIncidents((prev) =>
        prev.map((i) =>
          i.incidentId === incidentId
            ? { ...i, status: BreachIncidentStatus.NOTIFIED, userNotificationsSentAt: Date.now() }
            : i
        )
      )
    }

    setUpdatingId(null)
  }

  /**
   * Mark regulator notified.
   */
  const handleRegulatorNotified = async (incidentId: string) => {
    setUpdatingId(incidentId)

    const success = await updateIncident({
      incidentId,
      regulatorNotified: true,
    })

    if (success) {
      setIncidents((prev) =>
        prev.map((i) =>
          i.incidentId === incidentId ? { ...i, regulatorNotifiedAt: Date.now() } : i
        )
      )
    }

    setUpdatingId(null)
  }

  // Load incidents on mount and filter change
  useEffect(() => {
    if (firebaseUser && !authLoading) {
      loadIncidents()
    }
  }, [firebaseUser, authLoading, statusFilter, loadIncidents])

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
        <div>
          <h1 style={styles.title}>Breach Incidents</h1>
          <p style={styles.subtitle}>
            GDPR Article 33-34 compliant breach management (72-hour deadline)
          </p>
        </div>
        <button type="button" onClick={() => setShowCreateModal(true)} style={styles.createButton}>
          Report New Incident
        </button>
      </header>

      {/* Filter tabs */}
      <div style={styles.filterContainer}>
        {(
          [
            'all',
            'detected',
            'investigating',
            'contained',
            'notified',
            'resolved',
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

      {/* Incident list */}
      <div style={styles.incidentList}>
        {loading && incidents.length === 0 ? (
          <div style={styles.loading}>Loading incidents...</div>
        ) : incidents.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No incidents found</p>
          </div>
        ) : (
          incidents.map((incident) => {
            const statusBadge = getStatusBadge(incident.status)
            const severityBadge = getSeverityBadge(incident.severity)
            const deadlineBadge = getDeadlineBadge(
              incident.hoursUntilDeadline,
              incident.isDeadlineApproaching,
              incident.isDeadlinePassed
            )

            return (
              <div key={incident.incidentId} style={styles.incidentCard}>
                <div style={styles.incidentHeader}>
                  <div style={styles.incidentBadges}>
                    <span style={severityBadge.style}>{severityBadge.text}</span>
                    <span style={statusBadge.style}>{statusBadge.text}</span>
                    {deadlineBadge && <span style={deadlineBadge.style}>{deadlineBadge.text}</span>}
                  </div>
                  <span style={styles.incidentDate}>{formatDate(incident.detectedAt)}</span>
                </div>

                <h3 style={styles.incidentTitle}>{incident.title}</h3>

                <div style={styles.incidentMeta}>
                  <span style={styles.metaItem}>
                    <strong>{incident.affectedUserCount}</strong> users affected
                  </span>
                  <span style={styles.metaItem}>
                    ID: <code style={styles.incidentId}>{incident.incidentId}</code>
                  </span>
                </div>

                <div style={styles.dataTypes}>
                  {incident.affectedDataTypes.map((type: AffectedDataTypeValue) => (
                    <span key={type} style={styles.dataTypeTag}>
                      {AffectedDataTypeLabels[type] || type}
                    </span>
                  ))}
                </div>

                {/* Status indicators */}
                <div style={styles.statusIndicators}>
                  <span
                    style={{
                      ...styles.indicator,
                      color: incident.regulatorNotifiedAt ? '#059669' : '#6b7280',
                    }}
                  >
                    {incident.regulatorNotifiedAt ? '✓' : '○'} Regulator notified
                  </span>
                  <span
                    style={{
                      ...styles.indicator,
                      color: incident.userNotificationsSentAt ? '#059669' : '#6b7280',
                    }}
                  >
                    {incident.userNotificationsSentAt ? '✓' : '○'} Users notified
                  </span>
                </div>

                {/* Quick actions */}
                <div style={styles.quickActions}>
                  {incident.status === BreachIncidentStatus.DETECTED && (
                    <button
                      onClick={() =>
                        handleQuickStatusChange(
                          incident.incidentId,
                          BreachIncidentStatus.INVESTIGATING
                        )
                      }
                      disabled={updatingId === incident.incidentId}
                      style={styles.actionButton}
                    >
                      Start Investigation
                    </button>
                  )}
                  {incident.status === BreachIncidentStatus.INVESTIGATING && (
                    <button
                      onClick={() =>
                        handleQuickStatusChange(incident.incidentId, BreachIncidentStatus.CONTAINED)
                      }
                      disabled={updatingId === incident.incidentId}
                      style={styles.actionButton}
                    >
                      Mark Contained
                    </button>
                  )}
                  {!incident.regulatorNotifiedAt && (
                    <button
                      onClick={() => handleRegulatorNotified(incident.incidentId)}
                      disabled={updatingId === incident.incidentId}
                      style={styles.regulatorButton}
                    >
                      Mark Regulator Notified
                    </button>
                  )}
                  {incident.status === BreachIncidentStatus.CONTAINED &&
                    !incident.userNotificationsSentAt && (
                      <button
                        onClick={() => handleSendNotifications(incident.incidentId)}
                        disabled={updatingId === incident.incidentId}
                        style={styles.notifyButton}
                      >
                        Send User Notifications
                      </button>
                    )}
                  {incident.status === BreachIncidentStatus.NOTIFIED && (
                    <button
                      onClick={() =>
                        handleQuickStatusChange(incident.incidentId, BreachIncidentStatus.RESOLVED)
                      }
                      disabled={updatingId === incident.incidentId}
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
            onClick={() => loadIncidents(nextCursor || undefined)}
            disabled={loading}
            style={styles.loadMoreButton}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* Create Incident Modal */}
      {showCreateModal && (
        <CreateIncidentModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (input) => {
            const incidentId = await createIncident(input)
            if (incidentId) {
              setShowCreateModal(false)
              loadIncidents()
            }
          }}
          loading={loading}
        />
      )}
    </div>
  )
}

/**
 * Create Incident Modal Component.
 */
function CreateIncidentModal({
  onClose,
  onCreate,
  loading,
}: {
  onClose: () => void
  onCreate: (input: CreateBreachIncidentInput) => Promise<void>
  loading: boolean
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<BreachSeverityValue>(BreachSeverity.MEDIUM)
  const [affectedDataTypes, setAffectedDataTypes] = useState<AffectedDataTypeValue[]>([])
  const [affectedUserCount, setAffectedUserCount] = useState(0)
  const [regulatoryRequired, setRegulatoryRequired] = useState(true)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (title.length < 5) {
      setValidationError('Title must be at least 5 characters')
      return
    }

    if (description.length < 20) {
      setValidationError('Description must be at least 20 characters')
      return
    }

    if (affectedDataTypes.length === 0) {
      setValidationError('Select at least one affected data type')
      return
    }

    await onCreate({
      title,
      description,
      severity,
      affectedDataTypes,
      occurredAt: Date.now(),
      affectedUserCount,
      regulatoryNotificationRequired: regulatoryRequired,
    })
  }

  const toggleDataType = (type: AffectedDataTypeValue) => {
    setAffectedDataTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Report New Breach Incident</h2>

        <form onSubmit={handleSubmit}>
          {validationError && <div style={styles.modalError}>{validationError}</div>}

          <div style={styles.formGroup}>
            <label style={styles.label}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
              placeholder="Brief incident title"
              maxLength={200}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={styles.textarea}
              placeholder="Detailed description of the incident"
              rows={4}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as BreachSeverityValue)}
              style={styles.select}
            >
              <option value={BreachSeverity.LOW}>Low - Minor incident</option>
              <option value={BreachSeverity.MEDIUM}>Medium - Limited exposure</option>
              <option value={BreachSeverity.HIGH}>High - Sensitive data accessed</option>
              <option value={BreachSeverity.CRITICAL}>Critical - Widespread exposure</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Affected Data Types</label>
            <div style={styles.checkboxGrid}>
              {Object.entries(AffectedDataType).map(([key, value]) => (
                <label key={key} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={affectedDataTypes.includes(value)}
                    onChange={() => toggleDataType(value)}
                    style={styles.checkbox}
                  />
                  {AffectedDataTypeLabels[value] || key}
                </label>
              ))}
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Estimated Affected Users</label>
            <input
              type="number"
              value={affectedUserCount}
              onChange={(e) => setAffectedUserCount(parseInt(e.target.value) || 0)}
              style={styles.input}
              min={0}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={regulatoryRequired}
                onChange={(e) => setRegulatoryRequired(e.target.checked)}
                style={styles.checkbox}
              />
              Regulatory notification required (GDPR Article 33)
            </label>
          </div>

          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.cancelButton} disabled={loading}>
              Cancel
            </button>
            <button type="submit" style={styles.submitButton} disabled={loading}>
              {loading ? 'Creating...' : 'Create Incident'}
            </button>
          </div>
        </form>
      </div>
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  createButton: {
    padding: '10px 20px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
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
  incidentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  incidentCard: {
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  incidentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  incidentBadges: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  incidentDate: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  incidentTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 8px',
  },
  incidentMeta: {
    display: 'flex',
    gap: '16px',
    marginBottom: '8px',
    fontSize: '13px',
    color: '#6b7280',
  },
  metaItem: {},
  incidentId: {
    fontSize: '11px',
    backgroundColor: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  dataTypes: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '12px',
  },
  dataTypeTag: {
    fontSize: '11px',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  statusIndicators: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px',
    fontSize: '13px',
  },
  indicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  quickActions: {
    display: 'flex',
    gap: '8px',
    paddingTop: '12px',
    borderTop: '1px solid #f3f4f6',
    flexWrap: 'wrap',
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
  regulatorButton: {
    padding: '6px 12px',
    backgroundColor: '#fef3c7',
    color: '#d97706',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  notifyButton: {
    padding: '6px 12px',
    backgroundColor: '#fce7f3',
    color: '#be185d',
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
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 20px',
  },
  modalError: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
  },
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#7c3aed',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 20px',
    backgroundColor: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#ffffff',
    fontWeight: 500,
    cursor: 'pointer',
  },
}
