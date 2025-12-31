'use client'

/**
 * FlagFilters Component - Story 22.1
 *
 * Filter controls for the flag review queue.
 *
 * Acceptance Criteria:
 * - AC4: Filters available by child, category, severity
 * - AC4: Multiple filters can be combined
 */

import {
  CONCERN_CATEGORY_VALUES,
  type ConcernCategory,
  type ConcernSeverity,
} from '@fledgely/shared'

export interface FlagFiltersProps {
  /** Available children to filter by */
  familyChildren: Array<{ id: string; name: string }>
  /** Currently selected child ID (empty = all) */
  selectedChildId: string
  /** Currently selected category (empty = all) */
  selectedCategory: string
  /** Currently selected severity (empty = all) */
  selectedSeverity: string
  /** Callback when child filter changes */
  onChildChange: (childId: string) => void
  /** Callback when category filter changes */
  onCategoryChange: (category: string) => void
  /** Callback when severity filter changes */
  onSeverityChange: (severity: string) => void
  /** Callback to clear all filters */
  onClearFilters: () => void
}

/**
 * Category labels for display
 * Maps to ConcernCategory values from shared contracts
 */
const CATEGORY_LABELS: Record<ConcernCategory, string> = {
  Violence: 'Violence',
  'Adult Content': 'Adult Content',
  Bullying: 'Bullying',
  'Self-Harm Indicators': 'Self-Harm',
  'Explicit Language': 'Explicit Language',
  'Unknown Contacts': 'Unknown Contacts',
}

const SEVERITY_OPTIONS: Array<{ value: ConcernSeverity; label: string }> = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const styles = {
  container: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '12px',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#6b7280',
  },
  select: {
    padding: '6px 28px 6px 10px',
    fontSize: '13px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    cursor: 'pointer',
    minWidth: '120px',
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 6px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '16px',
  },
  selectActive: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f5f3ff',
  },
  clearButton: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#6b7280',
    cursor: 'pointer',
    marginLeft: 'auto',
  },
  activeCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '18px',
    height: '18px',
    padding: '0 4px',
    marginLeft: '8px',
    backgroundColor: '#8b5cf6',
    color: '#ffffff',
    borderRadius: '9px',
    fontSize: '10px',
    fontWeight: 600,
  },
}

/**
 * FlagFilters - Filter controls for flag queue
 */
export function FlagFilters({
  familyChildren,
  selectedChildId,
  selectedCategory,
  selectedSeverity,
  onChildChange,
  onCategoryChange,
  onSeverityChange,
  onClearFilters,
}: FlagFiltersProps) {
  // Count active filters
  const activeFilterCount = [selectedChildId, selectedCategory, selectedSeverity].filter(
    Boolean
  ).length

  return (
    <div style={styles.container} data-testid="flag-filters">
      {/* Child filter */}
      <div style={styles.filterGroup}>
        <label htmlFor="filter-child" style={styles.label}>
          Child
        </label>
        <select
          id="filter-child"
          value={selectedChildId}
          onChange={(e) => onChildChange(e.target.value)}
          style={{
            ...styles.select,
            ...(selectedChildId ? styles.selectActive : {}),
          }}
          data-testid="filter-child"
        >
          <option value="">All Children</option>
          {familyChildren.map((child) => (
            <option key={child.id} value={child.id}>
              {child.name}
            </option>
          ))}
        </select>
      </div>

      {/* Category filter */}
      <div style={styles.filterGroup}>
        <label htmlFor="filter-category" style={styles.label}>
          Category
        </label>
        <select
          id="filter-category"
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          style={{
            ...styles.select,
            ...(selectedCategory ? styles.selectActive : {}),
          }}
          data-testid="filter-category"
        >
          <option value="">All Categories</option>
          {CONCERN_CATEGORY_VALUES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </div>

      {/* Severity filter */}
      <div style={styles.filterGroup}>
        <label htmlFor="filter-severity" style={styles.label}>
          Severity
        </label>
        <select
          id="filter-severity"
          value={selectedSeverity}
          onChange={(e) => onSeverityChange(e.target.value)}
          style={{
            ...styles.select,
            ...(selectedSeverity ? styles.selectActive : {}),
          }}
          data-testid="filter-severity"
        >
          <option value="">All Severities</option>
          {SEVERITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Clear filters button */}
      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={onClearFilters}
          style={styles.clearButton}
          data-testid="clear-filters"
        >
          Clear Filters
          <span style={styles.activeCount}>{activeFilterCount}</span>
        </button>
      )}
    </div>
  )
}

export default FlagFilters
