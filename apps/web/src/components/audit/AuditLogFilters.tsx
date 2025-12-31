/**
 * AuditLogFilters Component
 *
 * Story 27.2: Parent Audit Log View - AC4
 *
 * Provides filter controls for the audit log:
 * - Person filter (family members dropdown)
 * - Data type filter (resource types)
 * - Date range picker
 */

import { useState } from 'react'
import type { FamilyMember, AuditLogFilters as FilterType } from '../../hooks/useAuditLog'
import type { AuditResourceType } from '@fledgely/shared'

interface AuditLogFiltersProps {
  familyMembers: FamilyMember[]
  filters: FilterType
  onFiltersChange: (filters: FilterType) => void
}

const styles = {
  container: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '12px',
    padding: '16px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#6b7280',
  },
  select: {
    minHeight: '36px',
    padding: '6px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    cursor: 'pointer',
    minWidth: '150px',
  },
  dateInput: {
    minHeight: '36px',
    padding: '6px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  clearButton: {
    alignSelf: 'flex-end',
    padding: '6px 12px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
}

/**
 * Resource types available for filtering
 */
const RESOURCE_TYPES: Array<{ value: AuditResourceType; label: string }> = [
  { value: 'screenshots', label: 'Screenshots' },
  { value: 'screenshot_detail', label: 'Screenshot Details' },
  { value: 'child_profile', label: 'Child Profiles' },
  { value: 'flags', label: 'Flagged Content' },
  { value: 'flag_detail', label: 'Flag Details' },
  { value: 'devices', label: 'Devices' },
  { value: 'device_detail', label: 'Device Details' },
  { value: 'agreements', label: 'Agreements' },
  { value: 'activity', label: 'Activity' },
  { value: 'dashboard_access', label: 'Dashboard' },
  { value: 'settings_modify', label: 'Settings' },
]

export function AuditLogFilters({ familyMembers, filters, onFiltersChange }: AuditLogFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterType>(filters)

  const handlePersonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFilters = {
      ...localFilters,
      actorUid: e.target.value || undefined,
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleResourceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFilters = {
      ...localFilters,
      resourceType: (e.target.value as AuditResourceType) || undefined,
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFilters = {
      ...localFilters,
      startDate: e.target.value ? new Date(e.target.value) : undefined,
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFilters = {
      ...localFilters,
      endDate: e.target.value ? new Date(e.target.value) : undefined,
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleClearFilters = () => {
    const newFilters = {}
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const hasActiveFilters =
    localFilters.actorUid ||
    localFilters.resourceType ||
    localFilters.startDate ||
    localFilters.endDate

  return (
    <div style={styles.container}>
      <div style={styles.filterGroup}>
        <label style={styles.label}>Person</label>
        <select
          style={styles.select}
          value={localFilters.actorUid || ''}
          onChange={handlePersonChange}
        >
          <option value="">All people</option>
          {familyMembers.map((member) => (
            <option key={member.uid} value={member.uid}>
              {member.displayName} ({member.role})
            </option>
          ))}
        </select>
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Data Type</label>
        <select
          style={styles.select}
          value={localFilters.resourceType || ''}
          onChange={handleResourceTypeChange}
        >
          <option value="">All types</option>
          {RESOURCE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>From</label>
        <input
          type="date"
          style={styles.dateInput}
          value={localFilters.startDate?.toISOString().split('T')[0] || ''}
          onChange={handleStartDateChange}
        />
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>To</label>
        <input
          type="date"
          style={styles.dateInput}
          value={localFilters.endDate?.toISOString().split('T')[0] || ''}
          onChange={handleEndDateChange}
        />
      </div>

      {hasActiveFilters && (
        <button style={styles.clearButton} onClick={handleClearFilters} type="button">
          Clear filters
        </button>
      )}
    </div>
  )
}
