'use client'

/**
 * Modal shown when guardian removal is blocked in shared custody families.
 *
 * Story 3A.6: Co-Parent Removal Prevention
 *
 * Displays explanation of why removal is blocked and provides
 * alternative options: dissolution, self-removal, and court order.
 *
 * Accessibility:
 * - Focus trap for keyboard navigation
 * - Escape key closes modal
 * - 44px minimum touch targets (NFR49)
 * - Visible focus indicators (NFR46)
 */

import { useEffect, useRef } from 'react'
import {
  getRemovalBlockedMessage,
  type RemovalBlockedMessage,
} from '../../services/guardianRemovalPreventionService'

interface GuardianRemovalBlockedModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal is closed */
  onClose: () => void
  /** Optional callback to navigate to dissolution flow */
  onNavigateToDissolution?: () => void
  /** Optional callback to navigate to self-removal flow */
  onNavigateToSelfRemoval?: () => void
  /** The name of the guardian being attempted to remove (for display) */
  targetGuardianName?: string
}

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
    maxWidth: '520px',
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
  infoIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#eff6ff',
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
  explanation: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.6,
    marginBottom: '20px',
  },
  optionsContainer: {
    marginBottom: '24px',
  },
  optionBox: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
  },
  optionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '8px',
  },
  optionDescription: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.5,
    margin: 0,
  },
  courtOrderBox: {
    backgroundColor: '#fefce8',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
  },
  courtOrderTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#92400e',
    marginBottom: '8px',
  },
  courtOrderDescription: {
    fontSize: '13px',
    color: '#78350f',
    lineHeight: 1.5,
    margin: 0,
  },
  contactEmail: {
    display: 'block',
    marginTop: '8px',
    fontSize: '13px',
    color: '#2563eb',
    fontWeight: 500,
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
    justifyContent: 'flex-end',
  },
  closeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
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
}

export function GuardianRemovalBlockedModal({
  isOpen,
  onClose,
  onNavigateToDissolution,
  onNavigateToSelfRemoval,
  targetGuardianName,
}: GuardianRemovalBlockedModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Get message content
  const message: RemovalBlockedMessage = getRemovalBlockedMessage()

  // Focus close button when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Focus trap - keep focus within modal
  useEffect(() => {
    if (!isOpen) return

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return

      const focusableElements = modalRef.current.querySelectorAll(
        'button:not([disabled]), a[href]:not([disabled])'
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

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
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
      aria-labelledby="guardian-removal-blocked-title"
      aria-describedby="guardian-removal-blocked-description"
      data-testid="guardian-removal-blocked-modal"
    >
      <style>
        {`
          .grb-close-button:focus {
            outline: 2px solid #4F46E5;
            outline-offset: 2px;
          }
          .grb-close-button:hover {
            background-color: #4338ca;
          }
          .grb-secondary-button:focus {
            outline: 2px solid #4F46E5;
            outline-offset: 2px;
          }
          .grb-secondary-button:hover {
            background-color: #f9fafb;
            border-color: #9ca3af;
          }
          .grb-email-link:focus {
            outline: 2px solid #2563eb;
            outline-offset: 2px;
          }
        `}
      </style>
      <div ref={modalRef} style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.infoIcon} aria-hidden="true">
            i
          </div>
          <h2 id="guardian-removal-blocked-title" style={styles.title}>
            {message.title}
          </h2>
        </div>

        <p id="guardian-removal-blocked-description" style={styles.explanation}>
          {targetGuardianName
            ? `You cannot remove ${targetGuardianName} from this family. ${message.explanation}`
            : message.explanation}
        </p>

        <div style={styles.optionsContainer}>
          {/* Option 1: Family Dissolution */}
          <div style={styles.optionBox} data-testid="dissolution-option">
            <h3 style={styles.optionTitle}>{message.options.dissolution.title}</h3>
            <p style={styles.optionDescription}>{message.options.dissolution.description}</p>
          </div>

          {/* Option 2: Self-Removal */}
          <div style={styles.optionBox} data-testid="self-removal-option">
            <h3 style={styles.optionTitle}>{message.options.selfRemoval.title}</h3>
            <p style={styles.optionDescription}>{message.options.selfRemoval.description}</p>
          </div>

          {/* Option 3: Court Order */}
          <div style={styles.courtOrderBox} data-testid="court-order-option">
            <h3 style={styles.courtOrderTitle}>{message.options.courtOrder.title}</h3>
            <p style={styles.courtOrderDescription}>
              {message.options.courtOrder.description}
              <a
                href={`mailto:${message.options.courtOrder.contactEmail}`}
                style={styles.contactEmail}
                className="grb-email-link"
              >
                Contact: {message.options.courtOrder.contactEmail}
              </a>
            </p>
          </div>
        </div>

        <div style={styles.buttonGroup}>
          {onNavigateToSelfRemoval && (
            <button
              type="button"
              onClick={onNavigateToSelfRemoval}
              style={styles.secondaryButton}
              className="grb-secondary-button"
              data-testid="self-removal-button"
            >
              Remove Myself Instead
            </button>
          )}
          {onNavigateToDissolution && (
            <button
              type="button"
              onClick={onNavigateToDissolution}
              style={styles.secondaryButton}
              className="grb-secondary-button"
              data-testid="dissolution-button"
            >
              Family Dissolution
            </button>
          )}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            style={styles.closeButton}
            className="grb-close-button"
            data-testid="close-button"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  )
}
