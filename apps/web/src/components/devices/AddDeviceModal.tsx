'use client'

/**
 * AddDeviceModal Component - Story 12.1
 *
 * Modal for adding a new device to the family.
 * Shows device type selection, then generates QR code for enrollment.
 *
 * Requirements:
 * - AC1: Add Device Button (triggers this modal)
 * - AC2: Device Type Selection
 * - AC3: QR Code Generation
 * - AC4: Token Security (15-minute expiry)
 * - AC5: QR Display with instructions
 * - AC6: Token Regeneration
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { DeviceTypeSelector, type DeviceType } from './DeviceTypeSelector'
import { EnrollmentQRCode } from './EnrollmentQRCode'
import { generateEnrollmentToken, type EnrollmentPayload } from '../../services/enrollmentService'

interface AddDeviceModalProps {
  familyId: string
  userId: string
  isOpen: boolean
  onClose: () => void
}

type ModalStep = 'select-type' | 'show-qr'

const styles = {
  overlay: {
    position: 'fixed' as const,
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
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '480px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
    backgroundColor: '#dbeafe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: '#2563eb',
    flexShrink: 0,
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.6,
    marginBottom: '16px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '16px',
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    color: '#dc2626',
    fontSize: '14px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#2563eb',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    color: '#6b7280',
  },
}

export function AddDeviceModal({ familyId, userId, isOpen, onClose }: AddDeviceModalProps) {
  const [step, setStep] = useState<ModalStep>('select-type')
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType | null>(null)
  const [enrollmentPayload, setEnrollmentPayload] = useState<EnrollmentPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('select-type')
      setSelectedDeviceType(null)
      setEnrollmentPayload(null)
      setError(null)
    }
  }, [isOpen])

  // Focus close button when modal opens
  useEffect(() => {
    if (isOpen && !loading) {
      closeButtonRef.current?.focus()
    }
  }, [isOpen, loading])

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, loading])

  // Focus trap
  useEffect(() => {
    if (!isOpen) return

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return

      const focusableElements = modalRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isOpen])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleDeviceTypeSelect = async (deviceType: DeviceType) => {
    setSelectedDeviceType(deviceType)
    setLoading(true)
    setError(null)

    try {
      const payload = await generateEnrollmentToken(familyId, userId)
      setEnrollmentPayload(payload)
      setStep('show-qr')
    } catch (err) {
      console.error('Error generating enrollment token:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate enrollment code')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (!selectedDeviceType) return

    setLoading(true)
    setError(null)

    try {
      const payload = await generateEnrollmentToken(familyId, userId)
      setEnrollmentPayload(payload)
    } catch (err) {
      console.error('Error regenerating enrollment token:', err)
      setError(err instanceof Error ? err.message : 'Failed to regenerate code')
    } finally {
      setLoading(false)
    }
  }

  const handleExpired = useCallback(() => {
    // Token expired - user can regenerate via the onRegenerate button
  }, [])

  const handleBack = () => {
    setStep('select-type')
    setEnrollmentPayload(null)
    setError(null)
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose()
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      style={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-device-title"
      aria-describedby="add-device-description"
    >
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .modal-button:focus {
            outline: 2px solid #2563eb;
            outline-offset: 2px;
          }
          .modal-button:hover:not(:disabled) {
            opacity: 0.9;
          }
          .modal-secondary-button:focus {
            outline: 2px solid #4F46E5;
            outline-offset: 2px;
          }
          .modal-secondary-button:hover:not(:disabled) {
            background-color: #f9fafb;
            border-color: #9ca3af;
          }
          .modal-back-button:hover {
            background-color: #f3f4f6;
          }
        `}
      </style>
      <div ref={modalRef} style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.icon} aria-hidden="true">
            +
          </div>
          <h2 id="add-device-title" style={styles.title}>
            Add Device
          </h2>
        </div>

        {error && (
          <div style={styles.errorMessage} role="alert" aria-live="polite">
            {error}
          </div>
        )}

        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Generating enrollment code...</p>
          </div>
        ) : step === 'select-type' ? (
          <>
            <p id="add-device-description" style={styles.description}>
              Select the type of device you want to add to your family.
            </p>
            <DeviceTypeSelector onSelect={handleDeviceTypeSelect} disabled={loading} />
            <div style={styles.buttonGroup}>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                style={styles.secondaryButton}
                className="modal-secondary-button"
              >
                Cancel
              </button>
            </div>
          </>
        ) : enrollmentPayload ? (
          <>
            <button
              type="button"
              onClick={handleBack}
              style={styles.backButton}
              className="modal-back-button"
            >
              ← Back
            </button>
            <p id="add-device-description" style={styles.description}>
              Scan this QR code with the Fledgely extension on the Chromebook to add it to your
              family.
            </p>
            <EnrollmentQRCode
              payload={enrollmentPayload}
              onExpired={handleExpired}
              onRegenerate={handleRegenerate}
              isRegenerating={loading}
            />
            <div style={styles.buttonGroup}>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                style={styles.secondaryButton}
                className="modal-secondary-button"
              >
                Done
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
