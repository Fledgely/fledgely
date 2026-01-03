'use client'

/**
 * CaregiverPermissionInfo - Story 39.2 AC6
 *
 * Shows caregiver permissions to child in friendly language.
 *
 * Implements:
 * - AC6: Child sees caregiver permissions in child-friendly language
 *   - "[Name] can see your status" (always displayed)
 *   - "[Name] can give you extra time" (if canExtendTime)
 *   - "[Name] can see flagged items" (if canViewFlags)
 *
 * Uses React.CSSProperties inline styles per project pattern.
 */

import type { CaregiverPermissions } from '@fledgely/shared/contracts'

export interface CaregiverPermissionInfoProps {
  /** Display name for the caregiver (e.g., "Grandma", "Uncle Bob") */
  caregiverName: string
  /** Caregiver permissions (defaults to most restricted if not provided) */
  permissions?: CaregiverPermissions
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    padding: '16px',
    backgroundColor: '#f0f9ff',
    borderRadius: '12px',
    border: '1px solid #bae6fd',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  icon: {
    fontSize: '24px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0369a1',
    margin: 0,
  },
  permissionList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  permissionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#0c4a6e',
  },
  permissionIcon: {
    fontSize: '16px',
    minWidth: '20px',
    textAlign: 'center' as const,
  },
  permissionText: {
    margin: 0,
  },
}

/**
 * Display caregiver permissions in child-friendly language.
 */
export default function CaregiverPermissionInfo({
  caregiverName,
  permissions,
}: CaregiverPermissionInfoProps) {
  // Default permissions - most restricted
  const effectivePermissions = permissions || {
    canExtendTime: false,
    canViewFlags: false,
  }

  return (
    <div
      style={styles.container}
      data-testid="caregiver-permission-info"
      aria-label={`What ${caregiverName} can do`}
    >
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.icon} aria-hidden="true">
          &#x1F468;&#x200D;&#x1F466;
        </span>
        <h3 style={styles.title}>What {caregiverName} can do</h3>
      </div>

      {/* Permission List */}
      <div style={styles.permissionList} data-testid="permission-list" role="list">
        {/* View Status - Always displayed */}
        <div style={styles.permissionItem} data-testid="permission-view-status" role="listitem">
          <span style={styles.permissionIcon} aria-hidden="true">
            &#x1F441;
          </span>
          <p style={styles.permissionText}>{caregiverName} can see your status</p>
        </div>

        {/* Extend Time - Only if enabled */}
        {effectivePermissions.canExtendTime && (
          <div style={styles.permissionItem} data-testid="permission-extend-time" role="listitem">
            <span style={styles.permissionIcon} aria-hidden="true">
              &#x23F0;
            </span>
            <p style={styles.permissionText}>{caregiverName} can give you extra time</p>
          </div>
        )}

        {/* View Flags - Only if enabled */}
        {effectivePermissions.canViewFlags && (
          <div style={styles.permissionItem} data-testid="permission-view-flags" role="listitem">
            <span style={styles.permissionIcon} aria-hidden="true">
              &#x1F6A9;
            </span>
            <p style={styles.permissionText}>{caregiverName} can see flagged items</p>
          </div>
        )}
      </div>
    </div>
  )
}

export { CaregiverPermissionInfo }
