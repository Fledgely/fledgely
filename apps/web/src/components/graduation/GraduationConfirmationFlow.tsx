'use client'

/**
 * Graduation Confirmation Flow Component - Story 38.3 Task 7
 *
 * UI component for graduation confirmation with dual-consent.
 * AC1: Both parties must confirm graduation decision
 * AC2: Graduation date can be immediate or scheduled
 */

import { useState } from 'react'
import type { GraduationDecision, GraduationType, ViewerType } from '@fledgely/shared'

export interface GraduationConfirmationFlowProps {
  decision: GraduationDecision
  viewerType: ViewerType
  childName: string
  hasConfirmed: boolean
  onConfirm: (type: GraduationType, scheduledDate: Date | null) => void
  onCancel?: () => void
}

const styles = {
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '600px',
  },
  header: {
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '20px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#166534',
    margin: 0,
    marginBottom: '12px',
  },
  description: {
    fontSize: '16px',
    color: '#374151',
    lineHeight: 1.7,
    margin: 0,
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '16px',
    margin: 0,
  },
  optionsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  optionItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    marginBottom: '12px',
    cursor: 'pointer',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'transparent',
    transition: 'all 0.2s ease',
  },
  optionItemSelected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
  },
  radioInput: {
    width: '20px',
    height: '20px',
    marginTop: '2px',
    cursor: 'pointer',
    accentColor: '#22c55e',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '4px',
    display: 'block',
    cursor: 'pointer',
  },
  optionDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  dateInputContainer: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e5e7eb',
  },
  dateLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
  },
  dateInput: {
    minHeight: '44px',
    padding: '10px 16px',
    fontSize: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '200px',
  },
  statusSection: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
  },
  statusTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '12px',
    margin: 0,
  },
  statusList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    fontSize: '14px',
    color: '#4b5563',
  },
  statusIcon: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 600,
  },
  statusIconConfirmed: {
    backgroundColor: '#22c55e',
    color: '#ffffff',
  },
  statusIconPending: {
    backgroundColor: '#fbbf24',
    color: '#ffffff',
  },
  explanationBox: {
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
    border: '1px solid #bfdbfe',
  },
  explanationTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e40af',
    marginBottom: '8px',
    margin: 0,
  },
  explanationText: {
    fontSize: '14px',
    color: '#1e3a8a',
    lineHeight: 1.6,
    margin: 0,
  },
  confirmedBanner: {
    backgroundColor: '#f0fdf4',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
    border: '1px solid #86efac',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  confirmedIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 700,
    flexShrink: 0,
  },
  confirmedText: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#166534',
    margin: 0,
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '10px 24px',
    backgroundColor: '#22c55e',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  primaryButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '10px 24px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    fontSize: '15px',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
}

export default function GraduationConfirmationFlow({
  decision,
  viewerType,
  childName,
  hasConfirmed,
  onConfirm,
  onCancel,
}: GraduationConfirmationFlowProps) {
  const [selectedType, setSelectedType] = useState<GraduationType>('immediate')
  const [scheduledDate, setScheduledDate] = useState<string>('')

  const isChild = viewerType === 'child'
  const subjectName = isChild ? 'You' : childName

  const confirmedParentCount = decision.parentConfirmations.length
  const totalParentCount = decision.requiredParentIds.length
  const childHasConfirmed = decision.childConfirmation !== null

  const canConfirm = !hasConfirmed && (selectedType === 'immediate' || scheduledDate !== '')

  const handleConfirm = () => {
    if (!canConfirm) return

    const date = selectedType === 'scheduled' && scheduledDate ? new Date(scheduledDate) : null
    onConfirm(selectedType, date)
  }

  const getTitle = () => {
    if (isChild) {
      return 'Confirm Your Graduation'
    }
    return `Confirm ${childName}'s Graduation`
  }

  const getDescription = () => {
    if (isChild) {
      return "You're about to graduate from monitoring. This is an important milestone that requires confirmation from both you and your parents."
    }
    return `${childName} is ready to graduate from monitoring. This requires confirmation from both ${childName.toLowerCase()} and all parents.`
  }

  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 90)
    return maxDate.toISOString().split('T')[0]
  }

  return (
    <article
      style={styles.container}
      aria-label={`Graduation confirmation for ${isChild ? 'you' : childName}`}
    >
      <style>
        {`
          .confirm-btn:hover:not(:disabled) {
            opacity: 0.9;
          }
          .confirm-btn:focus {
            outline: 2px solid #22c55e;
            outline-offset: 2px;
          }
          .cancel-btn:hover {
            background-color: #e5e7eb;
          }
          .cancel-btn:focus {
            outline: 2px solid #6b7280;
            outline-offset: 2px;
          }
          .option-item:hover {
            border-color: #d1d5db;
          }
        `}
      </style>

      <header style={styles.header}>
        <h1 style={styles.title}>{getTitle()}</h1>
        <p style={styles.description}>{getDescription()}</p>
      </header>

      {hasConfirmed ? (
        <div style={styles.confirmedBanner}>
          <span style={styles.confirmedIcon}>✓</span>
          <p style={styles.confirmedText}>
            {isChild ? "You've confirmed" : "You've confirmed"} your graduation preference
          </p>
        </div>
      ) : (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Choose Your Graduation Date</h2>
          <ul style={styles.optionsList} role="radiogroup" aria-label="Graduation type selection">
            <li
              style={{
                ...styles.optionItem,
                ...(selectedType === 'immediate' ? styles.optionItemSelected : {}),
              }}
              className="option-item"
              onClick={() => setSelectedType('immediate')}
            >
              <input
                type="radio"
                id="immediate"
                name="graduationType"
                checked={selectedType === 'immediate'}
                onChange={() => setSelectedType('immediate')}
                style={styles.radioInput}
                aria-label="Graduate immediately"
              />
              <div style={styles.optionContent}>
                <label htmlFor="immediate" style={styles.optionLabel}>
                  Graduate Immediately
                </label>
                <p style={styles.optionDescription}>
                  Monitoring will stop today once all parties confirm
                </p>
              </div>
            </li>
            <li
              style={{
                ...styles.optionItem,
                ...(selectedType === 'scheduled' ? styles.optionItemSelected : {}),
              }}
              className="option-item"
              onClick={() => setSelectedType('scheduled')}
            >
              <input
                type="radio"
                id="scheduled"
                name="graduationType"
                checked={selectedType === 'scheduled'}
                onChange={() => setSelectedType('scheduled')}
                style={styles.radioInput}
                aria-label="Schedule graduation for later"
              />
              <div style={styles.optionContent}>
                <label htmlFor="scheduled" style={styles.optionLabel}>
                  Schedule for Later
                </label>
                <p style={styles.optionDescription}>
                  Choose a future date for graduation (1-90 days from now)
                </p>
                {selectedType === 'scheduled' && (
                  <div style={styles.dateInputContainer}>
                    <label htmlFor="graduationDate" style={styles.dateLabel}>
                      Select graduation date
                    </label>
                    <input
                      type="date"
                      id="graduationDate"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      style={styles.dateInput}
                      min={getMinDate()}
                      max={getMaxDate()}
                      aria-label="Graduation date"
                    />
                  </div>
                )}
              </div>
            </li>
          </ul>
        </section>
      )}

      <section style={styles.statusSection}>
        <h2 style={styles.statusTitle}>Confirmation Status</h2>
        <ul style={styles.statusList}>
          <li style={styles.statusItem}>
            <span
              style={{
                ...styles.statusIcon,
                ...(childHasConfirmed ? styles.statusIconConfirmed : styles.statusIconPending),
              }}
            >
              {childHasConfirmed ? '✓' : '•'}
            </span>
            <span>
              {childHasConfirmed
                ? `${childName} has confirmed`
                : `Awaiting ${childName}'s confirmation`}
            </span>
          </li>
          <li style={styles.statusItem}>
            <span
              style={{
                ...styles.statusIcon,
                ...(confirmedParentCount === totalParentCount
                  ? styles.statusIconConfirmed
                  : styles.statusIconPending),
              }}
            >
              {confirmedParentCount === totalParentCount ? '✓' : '•'}
            </span>
            <span>
              {confirmedParentCount === totalParentCount
                ? `All parents confirmed`
                : `Parent confirmations: ${confirmedParentCount} of ${totalParentCount}`}
            </span>
          </li>
        </ul>
      </section>

      <div style={styles.explanationBox}>
        <h3 style={styles.explanationTitle}>What Happens After Graduation</h3>
        <p style={styles.explanationText}>
          When {subjectName.toLowerCase()} graduate, all monitoring will stop immediately. No new
          screenshots or activity will be collected. {isChild ? 'Your' : `${childName}'s`} existing
          data will be deleted after 30 days, giving your family time to export anything you want to
          keep.
        </p>
      </div>

      <div style={styles.buttonGroup}>
        {!hasConfirmed && (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            style={{
              ...styles.primaryButton,
              ...(!canConfirm ? styles.primaryButtonDisabled : {}),
            }}
            className="confirm-btn"
            aria-label="Confirm graduation"
          >
            Confirm Graduation
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={styles.secondaryButton}
            className="cancel-btn"
            aria-label="Cancel"
          >
            Cancel
          </button>
        )}
      </div>
    </article>
  )
}
