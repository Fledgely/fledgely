'use client'

/**
 * LocationPrivacyModal Component - Story 40.1
 *
 * Detailed privacy explanation before location feature opt-in.
 *
 * Acceptance Criteria:
 * - AC2: Clear Privacy Explanation
 *
 * UI/UX Requirements:
 * - 44x44px minimum touch targets (NFR49)
 * - 4.5:1 contrast ratio (NFR45)
 * - Keyboard accessible (NFR43)
 */

import { useState, useCallback, useRef, useEffect } from 'react'

export interface LocationPrivacyModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when user closes the modal */
  onClose: () => void
  /** Callback when user confirms understanding */
  onConfirm: () => void
  /** Whether confirmation is in progress */
  loading?: boolean
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  header: {
    padding: '24px 24px 0',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  body: {
    padding: '16px 24px',
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '8px',
  },
  sectionContent: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.6,
  },
  list: {
    margin: '8px 0',
    paddingLeft: '20px',
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: 1.8,
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginTop: '16px',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    marginTop: '2px',
    accentColor: '#3b82f6',
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: 1.5,
  },
  footer: {
    padding: '16px 24px 24px',
    display: 'flex',
    gap: '12px',
  },
  buttonCancel: {
    flex: 1,
    minHeight: '44px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  buttonConfirm: {
    flex: 1,
    minHeight: '44px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
}

export function LocationPrivacyModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}: LocationPrivacyModalProps) {
  const [understood, setUnderstood] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Focus trap and escape key handling
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }
      document.addEventListener('keydown', handleKeyDown)
      modalRef.current?.focus()
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleConfirm = useCallback(() => {
    if (understood && !loading) {
      onConfirm()
    }
  }, [understood, loading, onConfirm])

  if (!isOpen) return null

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
      data-testid="location-privacy-modal"
    >
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} ref={modalRef} tabIndex={-1}>
        <div style={styles.header}>
          <h2 id="privacy-modal-title" style={styles.title}>
            <span aria-hidden="true">🔒</span>
            Location Privacy Information
          </h2>
        </div>

        <div style={styles.body}>
          {/* What is collected */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>What We Collect</h3>
            <p style={styles.sectionContent}>When location features are enabled, we collect:</p>
            <ul style={styles.list}>
              <li>Device GPS coordinates</li>
              <li>WiFi network information (for geofencing accuracy)</li>
              <li>Location transitions between defined zones</li>
            </ul>
          </div>

          {/* How it's used */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>How It&apos;s Used</h3>
            <p style={styles.sectionContent}>Location data is used only to:</p>
            <ul style={styles.list}>
              <li>Apply different rules based on where your child is</li>
              <li>Detect transitions between home, school, or other locations</li>
              <li>Send notifications when rules change due to location</li>
            </ul>
          </div>

          {/* Storage and access */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Storage & Access</h3>
            <ul style={styles.list}>
              <li>Location data follows your family&apos;s data retention settings</li>
              <li>Only guardians in your family can see location information</li>
              <li>Location data is never shared with third parties</li>
              <li>All location data is encrypted in transit and at rest</li>
            </ul>
          </div>

          {/* Child transparency */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Child Transparency</h3>
            <p style={styles.sectionContent}>
              Your child will be notified when location features are enabled and can see their
              current location status in the app.
            </p>
          </div>

          {/* Checkbox */}
          <div style={styles.checkboxContainer}>
            <input
              type="checkbox"
              id="understood-checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              style={styles.checkbox}
              data-testid="understood-checkbox"
            />
            <label htmlFor="understood-checkbox" style={styles.checkboxLabel}>
              I understand how location data will be collected and used, and I agree to enable
              location features for my family.
            </label>
          </div>
        </div>

        <div style={styles.footer}>
          <button style={styles.buttonCancel} onClick={onClose} data-testid="cancel-button">
            Cancel
          </button>
          <button
            style={{
              ...styles.buttonConfirm,
              ...(!understood || loading ? styles.buttonDisabled : {}),
            }}
            onClick={handleConfirm}
            disabled={!understood || loading}
            data-testid="confirm-button"
          >
            {loading ? 'Processing...' : 'I Understand, Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LocationPrivacyModal
