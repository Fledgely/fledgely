'use client'

/**
 * CaregiverPermissionEditor - Story 39.2
 *
 * Component for parents to edit caregiver permissions.
 *
 * Implements:
 * - AC1: Permission Toggles (canExtendTime, canViewFlags)
 * - AC2: Default permissions (most restricted)
 * - AC3: Extend Time Permission toggle
 * - AC4: View Flags Permission toggle
 * - AC5: Changes take effect immediately
 *
 * NFR49: 44x44px minimum touch targets for toggle switches.
 * Uses React.CSSProperties inline styles per project pattern.
 */

import { useState, useCallback } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import type { CaregiverPermissions } from '@fledgely/shared/contracts'

interface CaregiverPermissionEditorProps {
  familyId: string
  caregiverUid: string
  caregiverName: string
  /** Current permissions (defaults to most restricted if not provided) */
  currentPermissions?: CaregiverPermissions
  onSuccess?: (permissions: CaregiverPermissions) => void
  onCancel?: () => void
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  icon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#ede9fe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: '#7c3aed',
    flexShrink: 0,
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.6,
    marginBottom: '20px',
  },
  permissionGroup: {
    marginBottom: '16px',
  },
  permissionItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  permissionInfo: {
    flex: 1,
  },
  permissionLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
    margin: 0,
    marginBottom: '4px',
  },
  permissionDescription: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.4,
  },
  // Toggle switch styles - 44px touch target (NFR49)
  toggle: {
    width: '52px',
    height: '44px',
    padding: '10px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  toggleTrack: {
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    backgroundColor: '#d1d5db',
    position: 'relative' as const,
    transition: 'background-color 0.2s ease',
  },
  toggleTrackActive: {
    backgroundColor: '#7c3aed',
  },
  toggleThumb: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    position: 'absolute' as const,
    top: '2px',
    left: '2px',
    transition: 'transform 0.2s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
  },
  toggleThumbActive: {
    transform: 'translateX(20px)',
  },
  toggleDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
  saveButton: {
    backgroundColor: '#7c3aed',
    color: '#ffffff',
  },
  saveButtonDisabled: {
    backgroundColor: '#a78bfa',
    cursor: 'not-allowed',
  },
  statusMessage: {
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  successMessage: {
    backgroundColor: '#f0fdf4',
    color: '#166534',
    border: '1px solid #86efac',
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca',
  },
}

/** Default permissions (most restricted per AC2) */
const DEFAULT_PERMISSIONS: CaregiverPermissions = {
  canExtendTime: false,
  canViewFlags: false,
}

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  'aria-label'?: string
  testId?: string
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  'aria-label': ariaLabel,
  testId,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        ...styles.toggle,
        ...(disabled ? styles.toggleDisabled : {}),
      }}
      disabled={disabled}
      data-testid={testId}
    >
      <div
        style={{
          ...styles.toggleTrack,
          ...(checked ? styles.toggleTrackActive : {}),
        }}
      >
        <div
          style={{
            ...styles.toggleThumb,
            ...(checked ? styles.toggleThumbActive : {}),
          }}
        />
      </div>
    </button>
  )
}

export default function CaregiverPermissionEditor({
  familyId,
  caregiverUid,
  caregiverName,
  currentPermissions,
  onSuccess,
  onCancel,
}: CaregiverPermissionEditorProps) {
  const [permissions, setPermissions] = useState<CaregiverPermissions>(
    currentPermissions || DEFAULT_PERMISSIONS
  )
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const handleToggle = useCallback((permission: keyof CaregiverPermissions, value: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [permission]: value,
    }))
    setHasChanges(true)
    setStatus(null) // Clear any previous status
  }, [])

  const handleSave = useCallback(async () => {
    if (saving) return

    setSaving(true)
    setStatus(null)

    try {
      const functions = getFunctions()
      const updateCaregiverPermissions = httpsCallable<
        { familyId: string; caregiverUid: string; permissions: CaregiverPermissions },
        { success: boolean; permissions: CaregiverPermissions }
      >(functions, 'updateCaregiverPermissions')

      const result = await updateCaregiverPermissions({
        familyId,
        caregiverUid,
        permissions,
      })

      if (result.data.success) {
        setStatus({ type: 'success', message: 'Permissions updated successfully' })
        setHasChanges(false)
        onSuccess?.(result.data.permissions)
      }
    } catch (err) {
      console.error('Failed to update permissions:', err)
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update permissions',
      })
    } finally {
      setSaving(false)
    }
  }, [saving, familyId, caregiverUid, permissions, onSuccess])

  return (
    <div style={styles.container} data-testid="caregiver-permission-editor">
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.icon} aria-hidden="true">
          <span aria-hidden="true">&#x2699;</span>
        </div>
        <div>
          <h2 style={styles.title}>Manage Permissions</h2>
          <p style={styles.subtitle}>{caregiverName}</p>
        </div>
      </div>

      {/* Description */}
      <p style={styles.description}>
        Configure what {caregiverName} can do. All caregivers can always view status.
      </p>

      {/* Status Message */}
      {status && (
        <div
          style={{
            ...styles.statusMessage,
            ...(status.type === 'success' ? styles.successMessage : styles.errorMessage),
          }}
          role={status.type === 'error' ? 'alert' : 'status'}
          data-testid={`${status.type}-message`}
        >
          {status.message}
        </div>
      )}

      {/* Permission Toggles */}
      <div style={styles.permissionGroup} data-testid="permission-toggles">
        {/* Extend Time Permission (AC3) */}
        <div style={styles.permissionItem} data-testid="permission-extend-time">
          <div style={styles.permissionInfo}>
            <p style={styles.permissionLabel}>Extend Screen Time</p>
            <p style={styles.permissionDescription}>
              Allow {caregiverName} to grant extra screen time when needed
            </p>
          </div>
          <ToggleSwitch
            checked={permissions.canExtendTime}
            onChange={(value) => handleToggle('canExtendTime', value)}
            disabled={saving}
            aria-label="Toggle extend time permission"
            testId="toggle-extend-time"
          />
        </div>

        {/* View Flags Permission (AC4) */}
        <div style={styles.permissionItem} data-testid="permission-view-flags">
          <div style={styles.permissionInfo}>
            <p style={styles.permissionLabel}>View Flagged Content</p>
            <p style={styles.permissionDescription}>
              Allow {caregiverName} to see flagged items (cannot take actions)
            </p>
          </div>
          <ToggleSwitch
            checked={permissions.canViewFlags}
            onChange={(value) => handleToggle('canViewFlags', value)}
            disabled={saving}
            aria-label="Toggle view flags permission"
            testId="toggle-view-flags"
          />
        </div>
      </div>

      {/* Buttons */}
      <div style={styles.buttonGroup}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{ ...styles.button, ...styles.cancelButton }}
            data-testid="cancel-button"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          style={{
            ...styles.button,
            ...styles.saveButton,
            ...(saving || !hasChanges ? styles.saveButtonDisabled : {}),
          }}
          data-testid="save-button"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

export { CaregiverPermissionEditor }
export type { CaregiverPermissionEditorProps }
