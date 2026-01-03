'use client'

/**
 * ChildNotificationList Component - Story 39.7, AC3
 *
 * Displays notifications for children in their dashboard.
 * Supports caregiver removal notifications and marking as read.
 *
 * Acceptance Criteria (Story 39.7 AC3):
 * - Child notified: "Grandma is no longer a caregiver"
 * - Notification uses child-friendly language (NFR65: 6th-grade reading level)
 * - Notification appears in child's activity feed
 *
 * NFR Requirements:
 * - NFR43: Keyboard accessible
 * - NFR45: Color contrast 4.5:1 minimum
 * - NFR49: 44x44px minimum touch target
 * - NFR65: 6th-grade reading level for child views
 */

import { useState, useEffect, useCallback } from 'react'
import {
  CaregiverRemovedNotification,
  type CaregiverRemovedNotificationData,
} from './CaregiverRemovedNotification'

/**
 * Union type for all notification types
 * Extensible for future notification types
 */
export type ChildNotification = CaregiverRemovedNotificationData

/**
 * Props for ChildNotificationList component
 */
export interface ChildNotificationListProps {
  /** List of notifications to display */
  notifications: ChildNotification[]
  /** Callback when a notification is dismissed/marked as read */
  onDismiss?: (notificationId: string) => void
  /** Optional loading state */
  loading?: boolean
  /** Optional error message */
  error?: string | null
  /** Whether the list is empty (no notifications) */
  emptyMessage?: string
}

/**
 * ChildNotificationList - Displays child notifications with dismiss support
 *
 * Story 39.7 AC3: Child notification display in dashboard
 */
export function ChildNotificationList({
  notifications,
  onDismiss,
  loading = false,
  error = null,
  emptyMessage = 'No new updates',
}: ChildNotificationListProps) {
  // Track dismissed notifications locally for optimistic updates
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  // Filter out dismissed notifications
  const visibleNotifications = notifications.filter((n) => !dismissedIds.has(n.id) && !n.read)

  const handleDismiss = useCallback(
    (id: string) => {
      // Optimistically hide the notification
      setDismissedIds((prev) => new Set(prev).add(id))
      // Notify parent to persist the dismissal
      onDismiss?.(id)
    },
    [onDismiss]
  )

  // Reset dismissed IDs when notifications change (e.g., on refetch)
  useEffect(() => {
    setDismissedIds(new Set())
  }, [notifications])

  // Container styles
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  }

  // Loading state styles
  const loadingStyles: React.CSSProperties = {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '16px',
  }

  // Error state styles
  const errorStyles: React.CSSProperties = {
    padding: '16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '12px',
    fontSize: '16px',
    textAlign: 'center',
  }

  // Empty state styles
  const emptyStyles: React.CSSProperties = {
    padding: '24px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
  }

  // Header styles
  const headerStyles: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 16px 0',
  }

  // Render loading state
  if (loading) {
    return (
      <div
        style={containerStyles}
        role="status"
        aria-busy="true"
        data-testid="notification-list-loading"
      >
        <p style={loadingStyles}>Loading updates...</p>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div style={containerStyles} data-testid="notification-list-error">
        <div style={errorStyles} role="alert">
          {error}
        </div>
      </div>
    )
  }

  // Render empty state
  if (visibleNotifications.length === 0) {
    return (
      <div style={containerStyles} data-testid="notification-list-empty">
        <p style={emptyStyles}>{emptyMessage}</p>
      </div>
    )
  }

  // Render notification list
  return (
    <div style={containerStyles} data-testid="notification-list">
      <h2 style={headerStyles} id="notifications-heading">
        Updates
      </h2>
      <ul
        role="list"
        aria-labelledby="notifications-heading"
        style={{ listStyle: 'none', margin: 0, padding: 0 }}
        data-testid="notification-items"
      >
        {visibleNotifications.map((notification) => (
          <li key={notification.id} style={{ marginBottom: '12px' }}>
            {notification.type === 'caregiver_removed' && (
              <CaregiverRemovedNotification
                notification={notification}
                onDismiss={() => handleDismiss(notification.id)}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ChildNotificationList
