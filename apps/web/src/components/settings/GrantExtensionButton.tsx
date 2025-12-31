'use client'

/**
 * GrantExtensionButton Component - Story 19D.4
 *
 * Button for parents to grant one-time access extension to caregivers.
 *
 * Acceptance Criteria:
 * - AC4: Parent can grant one-time access extension
 *
 * UI/UX Requirements:
 * - Simple duration selection
 * - Clear confirmation
 * - Immediate effect notification
 */

import { useState, useCallback } from 'react'
import { doc, updateDoc, Timestamp } from 'firebase/firestore'
import { getFirestoreDb } from '../../lib/firebase'

/**
 * One-time extension data stored in Firestore
 */
export interface OneTimeExtension {
  grantedAt: Date
  expiresAt: Date
  grantedByUid: string
  grantedByName: string
}

/**
 * Extension duration options in minutes
 */
const EXTENSION_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
] as const

/**
 * Props for GrantExtensionButton component
 */
export interface GrantExtensionButtonProps {
  /** Family ID */
  familyId: string
  /** Caregiver's UID */
  caregiverId: string
  /** Caregiver's display name */
  caregiverName: string
  /** Parent's UID (who is granting) */
  grantedByUid: string
  /** Parent's display name */
  grantedByName: string
  /** Callback after extension is granted */
  onExtensionGranted?: (extension: OneTimeExtension) => void
  /** Whether button is disabled */
  disabled?: boolean
}

/**
 * GrantExtensionButton - Parent UI for granting one-time caregiver access extension
 *
 * Story 19D.4: AC4 - Emergency one-time access extension
 */
export function GrantExtensionButton({
  familyId,
  caregiverId,
  caregiverName,
  grantedByUid,
  grantedByName,
  onExtensionGranted,
  disabled = false,
}: GrantExtensionButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [selectedDuration, setSelectedDuration] = useState(60) // Default 1 hour
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleGrantExtension = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const db = getFirestoreDb()
      const now = new Date()
      const expiresAt = new Date(now.getTime() + selectedDuration * 60 * 1000)

      const extension: OneTimeExtension = {
        grantedAt: now,
        expiresAt,
        grantedByUid,
        grantedByName,
      }

      // Update the family document to add extension to caregiver
      const familyRef = doc(db, 'families', familyId)

      // We need to update the specific caregiver's oneTimeExtension field
      // This is stored on the caregiver object in the caregivers array
      // For now, we'll store it as a separate field keyed by caregiver ID
      await updateDoc(familyRef, {
        [`caregiverExtensions.${caregiverId}`]: {
          grantedAt: Timestamp.fromDate(now),
          expiresAt: Timestamp.fromDate(expiresAt),
          grantedByUid,
          grantedByName,
        },
      })

      setSuccess(true)
      onExtensionGranted?.(extension)

      // Close dialog after short delay
      setTimeout(() => {
        setShowDialog(false)
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grant extension')
    } finally {
      setLoading(false)
    }
  }, [familyId, caregiverId, selectedDuration, grantedByUid, grantedByName, onExtensionGranted])

  const handleOpenDialog = useCallback(() => {
    setShowDialog(true)
    setError(null)
    setSuccess(false)
  }, [])

  const handleCloseDialog = useCallback(() => {
    if (!loading) {
      setShowDialog(false)
      setError(null)
      setSuccess(false)
    }
  }, [loading])

  // Styles
  const buttonStyles: React.CSSProperties = {
    minHeight: '48px',
    padding: '12px 20px',
    fontSize: '16px',
    fontWeight: 500,
    color: '#059669',
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  }

  const overlayStyles: React.CSSProperties = {
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
    padding: '16px',
  }

  const dialogStyles: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  }

  const headingStyles: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1f2937',
    margin: '0 0 12px 0',
  }

  const messageStyles: React.CSSProperties = {
    fontSize: '16px',
    color: '#6b7280',
    margin: '0 0 20px 0',
    lineHeight: 1.5,
  }

  const optionsContainerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px',
  }

  const optionStyles = (isSelected: boolean): React.CSSProperties => ({
    padding: '12px 16px',
    fontSize: '16px',
    color: isSelected ? '#059669' : '#374151',
    backgroundColor: isSelected ? '#ecfdf5' : '#f9fafb',
    border: isSelected ? '2px solid #059669' : '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
  })

  const buttonGroupStyles: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  }

  const cancelButtonStyles: React.CSSProperties = {
    minHeight: '44px',
    padding: '10px 20px',
    fontSize: '16px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
  }

  const confirmButtonStyles: React.CSSProperties = {
    minHeight: '44px',
    padding: '10px 20px',
    fontSize: '16px',
    fontWeight: 600,
    color: 'white',
    backgroundColor: '#059669',
    border: 'none',
    borderRadius: '8px',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
  }

  const errorStyles: React.CSSProperties = {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
  }

  const successStyles: React.CSSProperties = {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center',
  }

  return (
    <>
      <button
        style={buttonStyles}
        onClick={handleOpenDialog}
        disabled={disabled}
        aria-label={`Grant extended access to ${caregiverName}`}
        data-testid="grant-extension-button"
      >
        <span aria-hidden="true">⏰</span>
        Extend Access
      </button>

      {showDialog && (
        <div
          style={overlayStyles}
          role="dialog"
          aria-modal="true"
          aria-labelledby="extension-dialog-heading"
          data-testid="extension-dialog"
        >
          <div style={dialogStyles}>
            <h2 id="extension-dialog-heading" style={headingStyles}>
              Extend Access
            </h2>

            {success ? (
              <div style={successStyles} role="status" data-testid="extension-success">
                ✅ Extended access granted to {caregiverName}!
              </div>
            ) : (
              <>
                <p style={messageStyles}>
                  Grant <strong>{caregiverName}</strong> temporary access outside their normal
                  windows. How long?
                </p>

                {error && (
                  <div style={errorStyles} role="alert" data-testid="extension-error">
                    {error}
                  </div>
                )}

                <div
                  style={optionsContainerStyles}
                  role="radiogroup"
                  aria-label="Extension duration"
                >
                  {EXTENSION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      style={optionStyles(selectedDuration === option.value)}
                      onClick={() => setSelectedDuration(option.value)}
                      role="radio"
                      aria-checked={selectedDuration === option.value}
                      data-testid={`duration-${option.value}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div style={buttonGroupStyles}>
                  <button
                    style={cancelButtonStyles}
                    onClick={handleCloseDialog}
                    disabled={loading}
                    data-testid="cancel-extension-button"
                  >
                    Cancel
                  </button>
                  <button
                    style={confirmButtonStyles}
                    onClick={handleGrantExtension}
                    disabled={loading}
                    data-testid="confirm-extension-button"
                  >
                    {loading ? 'Granting...' : 'Grant Access'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default GrantExtensionButton
