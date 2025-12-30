/**
 * Safety Location Disable Section Component.
 *
 * Story 0.5.6: Location Feature Emergency Disable
 *
 * Section for disabling location features in the safety dashboard.
 * Provides confirmation before executing the irreversible action.
 *
 * CRITICAL SAFETY DESIGN:
 * - No notifications sent on disable
 * - No family audit logging
 * - Shows warning about irreversibility
 * - Requires confirmation before executing
 */

'use client'

import React, { useState } from 'react'
import {
  useDisableLocationFeatures,
  DisableLocationFeaturesResponse,
} from '../../hooks/useDisableLocationFeatures'

export interface VerificationStatus {
  phoneVerified: boolean
  idDocumentVerified: boolean
  accountMatchVerified: boolean
  securityQuestionsVerified: boolean
}

export interface SafetyLocationDisableSectionProps {
  /** The safety ticket ID */
  ticketId: string
  /** The family ID associated with the ticket */
  familyId: string | null
  /** Verification status from ticket */
  verificationStatus: VerificationStatus
  /** Optional user ID for user-specific disable */
  userId?: string
  /** Callback on successful disable */
  onSuccess?: (response: DisableLocationFeaturesResponse) => void
}

/**
 * Count completed verifications.
 */
function countVerifications(status: VerificationStatus): number {
  return [
    status.phoneVerified,
    status.idDocumentVerified,
    status.accountMatchVerified,
    status.securityQuestionsVerified,
  ].filter(Boolean).length
}

/**
 * Location features that will be disabled.
 */
const LOCATION_FEATURES = [
  {
    id: 'FR139',
    name: 'Location-based rules',
    description: 'Rules that vary based on device location (e.g., different limits at each home)',
  },
  {
    id: 'FR145',
    name: 'Location-based work mode',
    description: 'Automatic work mode activation based on device location',
  },
  {
    id: 'FR160',
    name: 'New location alerts',
    description: 'Alerts when account is accessed from new location',
  },
]

/**
 * Safety Location Disable Section.
 */
export function SafetyLocationDisableSection({
  ticketId,
  familyId,
  verificationStatus,
  userId,
  onSuccess,
}: SafetyLocationDisableSectionProps) {
  const { loading, error, disableLocationFeatures, clearError } = useDisableLocationFeatures()

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [disableSuccess, setDisableSuccess] = useState(false)
  const [successResponse, setSuccessResponse] = useState<DisableLocationFeaturesResponse | null>(
    null
  )

  const verificationCount = countVerifications(verificationStatus)
  const canDisable = verificationCount >= 2

  /**
   * Handle location feature disable.
   */
  const handleDisable = async () => {
    if (!familyId || !canDisable) return

    clearError()
    const result = await disableLocationFeatures({
      ticketId,
      familyId,
      userId,
    })

    if (result?.success) {
      setDisableSuccess(true)
      setSuccessResponse(result)
      setShowConfirmation(false)
      onSuccess?.(result)
    }
  }

  // No family associated
  if (!familyId) {
    return (
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Location Feature Disable</h3>
        <p style={styles.noDataText}>No family associated with this ticket.</p>
      </section>
    )
  }

  // Error state
  if (error) {
    return (
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Location Feature Disable</h3>
        <div style={styles.errorBanner}>
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => clearError()} style={styles.dismissButton}>
            Dismiss
          </button>
        </div>
      </section>
    )
  }

  return (
    <section style={styles.section}>
      <h3 style={styles.sectionTitle}>Location Feature Disable</h3>

      {/* Success message */}
      {disableSuccess && successResponse && (
        <div style={styles.successBanner}>
          <span>✓</span>
          <span>
            Location features disabled successfully. {successResponse.featuresDisabledCount}{' '}
            features disabled.
          </span>
        </div>
      )}

      {/* Verification warning */}
      {!canDisable && (
        <div style={styles.warningBanner}>
          <span>⚠️</span>
          <span>Minimum 2 verification checks required before disabling location features.</span>
        </div>
      )}

      {/* Feature list */}
      {!disableSuccess && (
        <>
          <p style={styles.description}>
            Disabling location features will immediately prevent all location-based tracking for
            this family. This is an <strong>irreversible</strong> safety action.
          </p>

          <div style={styles.featureList}>
            <h4 style={styles.featureListTitle}>Features that will be disabled:</h4>
            {LOCATION_FEATURES.map((feature) => (
              <div key={feature.id} style={styles.featureItem}>
                <div style={styles.featureHeader}>
                  <span style={styles.featureId}>{feature.id}</span>
                  <span style={styles.featureName}>{feature.name}</span>
                </div>
                <p style={styles.featureDescription}>{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Disable button */}
          <div style={styles.disableSection}>
            {!showConfirmation ? (
              <button
                onClick={() => setShowConfirmation(true)}
                disabled={!canDisable || loading}
                style={{
                  ...styles.disableButton,
                  ...(!canDisable ? styles.disableButtonDisabled : {}),
                }}
              >
                Disable Location Features
              </button>
            ) : (
              <div style={styles.confirmationBox}>
                <p style={styles.confirmationText}>
                  <strong>Are you sure?</strong> This will immediately disable all location features
                  for this family. Location-based rules, work mode triggers, and location alerts
                  will stop working. This action cannot be undone.
                </p>
                <div style={styles.confirmationButtons}>
                  <button
                    onClick={() => setShowConfirmation(false)}
                    style={styles.cancelButton}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button onClick={handleDisable} style={styles.confirmButton} disabled={loading}>
                    {loading ? 'Disabling...' : 'Confirm Disable'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 16px 0',
  },
  description: {
    fontSize: '14px',
    color: '#374151',
    marginBottom: '16px',
    lineHeight: '1.5',
  },
  noDataText: {
    fontSize: '14px',
    color: '#6b7280',
  },
  warningBanner: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  successBanner: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  errorBanner: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
    marginTop: '16px',
    alignItems: 'center',
  },
  dismissButton: {
    marginLeft: 'auto',
    padding: '4px 8px',
    fontSize: '12px',
    backgroundColor: 'transparent',
    color: '#dc2626',
    border: '1px solid #dc2626',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  featureList: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  featureListTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 12px 0',
  },
  featureItem: {
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e5e7eb',
  },
  featureHeader: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '4px',
  },
  featureId: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
    backgroundColor: '#e5e7eb',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: 'monospace',
  },
  featureName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  featureDescription: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
    paddingLeft: '4px',
  },
  disableSection: {
    marginTop: '16px',
  },
  disableButton: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  disableButtonDisabled: {
    backgroundColor: '#fca5a5',
    cursor: 'not-allowed',
  },
  confirmationBox: {
    padding: '16px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca',
  },
  confirmationText: {
    fontSize: '14px',
    color: '#991b1b',
    margin: '0 0 12px 0',
    lineHeight: '1.5',
  },
  confirmationButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: '#ffffff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  confirmButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
}

export default SafetyLocationDisableSection
