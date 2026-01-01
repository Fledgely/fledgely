'use client'

/**
 * BypassAttemptList Component - Story 36.5 Task 3
 *
 * Displays a list of bypass attempts with filtering and pagination.
 * AC3: Bypass attempts expire after configurable period
 * AC4: Child can see their own bypass attempt history
 * AC5: Parent can see bypass attempts with non-punitive framing
 */

import { useState, useMemo } from 'react'
import { type BypassAttempt, type BypassAttemptType } from '@fledgely/shared'
import { BypassAttemptCard } from './BypassAttemptCard'

// ============================================================================
// Types
// ============================================================================

export interface BypassAttemptListProps {
  /** Array of bypass attempts to display */
  attempts: BypassAttempt[]
  /** Show expired attempts */
  showExpired?: boolean
  /** Callback when toggle expired is clicked */
  onToggleExpired?: () => void
  /** Show filter controls */
  showFilters?: boolean
  /** Current filter type */
  filterType?: BypassAttemptType | null
  /** Callback when filter changes */
  onFilterChange?: (type: BypassAttemptType | null) => void
  /** Number of items per page */
  pageSize?: number
  /** Callback when marking as accidental */
  onMarkAccidental?: (attemptId: string) => void
  /** Show description text */
  showDescription?: boolean
  /** Show summary stats */
  showSummary?: boolean
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PAGE_SIZE = 10

const TYPE_OPTIONS: { value: BypassAttemptType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'extension-disable', label: 'Extension Disabled' },
  { value: 'settings-change', label: 'Settings Changed' },
  { value: 'vpn-detected', label: 'VPN Detected' },
  { value: 'proxy-detected', label: 'Proxy Detected' },
  { value: 'other', label: 'Other' },
]

// ============================================================================
// Helpers
// ============================================================================

function isExpired(attempt: BypassAttempt): boolean {
  return new Date() > attempt.expiresAt
}

// ============================================================================
// Main Component
// ============================================================================

export function BypassAttemptList({
  attempts,
  showExpired = false,
  onToggleExpired,
  showFilters = false,
  filterType = null,
  onFilterChange,
  pageSize = DEFAULT_PAGE_SIZE,
  onMarkAccidental,
  showDescription = false,
  showSummary = false,
}: BypassAttemptListProps) {
  const [currentPage, setCurrentPage] = useState(1)

  // Filter and sort attempts
  const processedAttempts = useMemo(() => {
    let filtered = [...attempts]

    // Filter by expired status
    if (!showExpired) {
      filtered = filtered.filter((a) => !isExpired(a))
    }

    // Filter by type
    if (filterType) {
      filtered = filtered.filter((a) => a.attemptType === filterType)
    }

    // Sort by date descending (most recent first)
    filtered.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())

    return filtered
  }, [attempts, showExpired, filterType])

  // Calculate counts
  const activeCount = useMemo(() => attempts.filter((a) => !isExpired(a)).length, [attempts])

  const expiredCount = useMemo(() => attempts.filter((a) => isExpired(a)).length, [attempts])

  const totalImpact = useMemo(
    () => attempts.filter((a) => !isExpired(a)).reduce((sum, a) => sum + a.impactOnScore, 0),
    [attempts]
  )

  // Pagination
  const totalPages = Math.ceil(processedAttempts.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedAttempts = processedAttempts.slice(startIndex, startIndex + pageSize)
  const showPagination = processedAttempts.length > pageSize

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onFilterChange) {
      const value = e.target.value
      onFilterChange(value ? (value as BypassAttemptType) : null)
    }
    setCurrentPage(1)
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  // Empty state
  if (attempts.length === 0 || (processedAttempts.length === 0 && !showFilters)) {
    return (
      <div data-testid="bypass-attempt-list">
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '16px',
          }}
          role="heading"
        >
          Trust Score Events
        </h3>
        <div
          data-testid="empty-state"
          style={{
            padding: '32px',
            textAlign: 'center',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            color: '#6b7280',
          }}
        >
          <p>No bypass attempts recorded</p>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="bypass-attempt-list">
      {/* Header */}
      <h3
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#374151',
          marginBottom: '8px',
        }}
        role="heading"
      >
        Trust Score Events
      </h3>

      {/* Description */}
      {showDescription && (
        <p
          data-testid="list-description"
          style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '16px',
          }}
        >
          These events have affected your trust score. You can mark any that were accidental.
        </p>
      )}

      {/* Summary */}
      {showSummary && (
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
          }}
        >
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Active: </span>
            <span data-testid="active-count" style={{ fontWeight: 600 }}>
              {activeCount}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Total Impact: </span>
            <span data-testid="total-impact" style={{ fontWeight: 600, color: '#dc2626' }}>
              {totalImpact}
            </span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* Filter */}
        {showFilters && (
          <select
            data-testid="type-filter"
            value={filterType || ''}
            onChange={handleFilterChange}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
            }}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {/* Toggle expired */}
        {onToggleExpired && (
          <label
            data-testid="toggle-expired"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#4b5563',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={showExpired}
              onChange={onToggleExpired}
              style={{ cursor: 'pointer' }}
            />
            Show expired
          </label>
        )}

        {/* Counts */}
        {!showSummary && (
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              gap: '12px',
              fontSize: '13px',
              color: '#6b7280',
            }}
          >
            <span>
              Active: <span data-testid="active-count">{activeCount}</span>
            </span>
            {showExpired && (
              <span>
                Expired: <span data-testid="expired-count">{expiredCount}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* List */}
      <ul
        role="list"
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {paginatedAttempts.map((attempt) => (
          <li key={attempt.id}>
            <BypassAttemptCard attempt={attempt} onMarkAccidental={onMarkAccidental} />
          </li>
        ))}
      </ul>

      {/* Pagination */}
      {showPagination && (
        <div
          data-testid="pagination"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '16px',
            marginTop: '16px',
            padding: '12px',
          }}
        >
          <button
            data-testid="prev-page"
            onClick={goToPrevPage}
            disabled={currentPage === 1}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
              color: currentPage === 1 ? '#9ca3af' : '#374151',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>
          <span data-testid="page-info" style={{ fontSize: '14px', color: '#6b7280' }}>
            {currentPage} of {totalPages}
          </span>
          <button
            data-testid="next-page"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
              color: currentPage === totalPages ? '#9ca3af' : '#374151',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
