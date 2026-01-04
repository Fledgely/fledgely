'use client'

/**
 * Profile Settings Page
 *
 * Story 51.8: Right to Rectification
 *
 * Allows users to:
 * - Edit profile data with audit trail (AC1, AC4)
 * - View change history
 * - Submit correction requests (AC5)
 * - Dispute AI-generated content (AC6)
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../contexts/AuthContext'
import { useRectification, formatProfileChange } from '../../../../hooks/useRectification'
import { EditableField, type EditableFieldValue } from '@fledgely/shared'

const styles = {
  main: {
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f9fafb',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#6b7280',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1f2937',
  },
  content: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '24px',
  },
  pageHeader: {
    marginBottom: '24px',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '8px',
  },
  pageDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.6,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    marginBottom: '16px',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #f3f4f6',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '4px',
  },
  cardDescription: {
    fontSize: '13px',
    color: '#6b7280',
  },
  cardBody: {
    padding: '20px',
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  fieldInfo: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '2px',
  },
  fieldDescription: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  fieldValue: {
    fontSize: '14px',
    color: '#1f2937',
    marginRight: '12px',
  },
  editButton: {
    padding: '6px 12px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#374151',
    cursor: 'pointer',
    fontWeight: 500,
  },
  editForm: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginTop: '12px',
  },
  formGroup: {
    marginBottom: '12px',
  },
  formLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#1f2937',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#1f2937',
    minHeight: '60px',
    resize: 'vertical' as const,
  },
  buttonRow: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    marginTop: '12px',
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#374151',
    cursor: 'pointer',
  },
  saveButton: {
    padding: '8px 16px',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: 500,
  },
  historyItem: {
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  historyText: {
    fontSize: '14px',
    color: '#374151',
    marginBottom: '4px',
  },
  historyMeta: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '24px',
    color: '#9ca3af',
    fontSize: '14px',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '24px',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '0',
  },
  tab: {
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '14px',
    color: '#6b7280',
    cursor: 'pointer',
    marginBottom: '-1px',
  },
  tabActive: {
    color: '#2563eb',
    borderBottomColor: '#2563eb',
    fontWeight: 500,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #e5e7eb',
    borderTopColor: '#2563eb',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  successMessage: {
    padding: '12px 16px',
    backgroundColor: '#dcfce7',
    border: '1px solid #86efac',
    borderRadius: '8px',
    color: '#166534',
    fontSize: '14px',
    marginBottom: '16px',
  },
  errorMessage: {
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    color: '#991b1b',
    fontSize: '14px',
    marginBottom: '16px',
  },
}

type TabType = 'profile' | 'history' | 'requests'

interface UserProfile {
  displayName?: string
  email?: string
  dateOfBirth?: string
  phone?: string
  timezone?: string
  locale?: string
}

export default function ProfileSettingsPage() {
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [successMessage, setSuccessMessage] = useState('')

  // Mock user profile - in real implementation, fetch from Firestore
  const [userProfile, setUserProfile] = useState<UserProfile>({
    displayName: firebaseUser?.displayName || '',
    email: firebaseUser?.email || '',
    dateOfBirth: '',
    phone: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language,
  })

  const {
    isEditing,
    editValue,
    editReason,
    setEditValue,
    setEditReason,
    startEditing,
    cancelEditing,
    saveEdit,
    isUpdating,
    updateError,
    profileChanges,
    totalChanges,
    isLoadingChanges,
    getFieldLabel,
    getFieldDescription,
  } = useRectification()

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login')
    }
  }, [firebaseUser, authLoading, router])

  const handleSaveEdit = async () => {
    try {
      await saveEdit()
      // Update local state
      if (isEditing) {
        setUserProfile((prev) => ({
          ...prev,
          [isEditing]: editValue,
        }))
      }
      setSuccessMessage('Profile updated successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch {
      // Error handled by hook
    }
  }

  if (authLoading) {
    return (
      <main style={styles.main}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
        </div>
      </main>
    )
  }

  if (!firebaseUser) {
    return null
  }

  const editableFields: { key: EditableFieldValue; value: string }[] = [
    { key: EditableField.DISPLAY_NAME, value: userProfile.displayName || '' },
    { key: EditableField.EMAIL, value: userProfile.email || '' },
    { key: EditableField.DATE_OF_BIRTH, value: userProfile.dateOfBirth || '' },
    { key: EditableField.PHONE, value: userProfile.phone || '' },
    { key: EditableField.TIMEZONE, value: userProfile.timezone || '' },
    { key: EditableField.LOCALE, value: userProfile.locale || '' },
  ]

  return (
    <main style={styles.main}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            style={styles.backButton}
            onClick={() => router.push('/dashboard')}
            aria-label="Back to settings"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span style={styles.title}>Profile Settings</span>
        </div>
      </header>

      <div style={styles.content}>
        {/* Page Header */}
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>Profile & Data Corrections</h1>
          <p style={styles.pageDescription}>
            Edit your profile information. All changes are logged for your records in compliance
            with GDPR Article 16 (Right to Rectification).
          </p>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'profile' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('profile')}
          >
            Edit Profile
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'history' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('history')}
          >
            Change History ({totalChanges})
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'requests' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('requests')}
          >
            Correction Requests
          </button>
        </div>

        {/* Messages */}
        {successMessage && <div style={styles.successMessage}>{successMessage}</div>}
        {updateError && (
          <div style={styles.errorMessage}>
            {updateError instanceof Error ? updateError.message : 'Failed to update profile'}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Profile Information</h2>
              <p style={styles.cardDescription}>
                Update your personal information. A reason is optional but helps maintain accurate
                records.
              </p>
            </div>
            <div style={styles.cardBody}>
              {editableFields.map(({ key, value }) => (
                <div key={key} style={styles.fieldRow}>
                  <div style={styles.fieldInfo}>
                    <div style={styles.fieldLabel}>{getFieldLabel(key)}</div>
                    <div style={styles.fieldDescription}>{getFieldDescription(key)}</div>
                  </div>
                  <span style={styles.fieldValue}>
                    {value || <em style={{ color: '#9ca3af' }}>Not set</em>}
                  </span>
                  <button
                    style={styles.editButton}
                    onClick={() => startEditing(key, value)}
                    disabled={isEditing !== null}
                  >
                    Edit
                  </button>

                  {/* Edit Form */}
                  {isEditing === key && (
                    <div style={styles.editForm}>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>New Value</label>
                        <input
                          type="text"
                          style={styles.input}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder={`Enter new ${getFieldLabel(key).toLowerCase()}`}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Reason for change (optional)</label>
                        <textarea
                          style={styles.textarea}
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                          placeholder="e.g., Correcting a typo, updating after name change..."
                        />
                      </div>
                      <div style={styles.buttonRow}>
                        <button
                          style={styles.cancelButton}
                          onClick={cancelEditing}
                          disabled={isUpdating}
                        >
                          Cancel
                        </button>
                        <button
                          style={styles.saveButton}
                          onClick={handleSaveEdit}
                          disabled={isUpdating || !editValue.trim()}
                        >
                          {isUpdating ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Change History</h2>
              <p style={styles.cardDescription}>
                A complete audit trail of all profile changes you have made.
              </p>
            </div>
            <div style={styles.cardBody}>
              {isLoadingChanges ? (
                <div style={styles.loadingContainer}>
                  <div style={styles.spinner} />
                </div>
              ) : profileChanges.length === 0 ? (
                <div style={styles.emptyState}>No profile changes recorded yet.</div>
              ) : (
                profileChanges.map((change) => (
                  <div key={change.id} style={styles.historyItem}>
                    <div style={styles.historyText}>{formatProfileChange(change)}</div>
                    <div style={styles.historyMeta}>
                      {new Date(change.changedAt).toLocaleString()}
                      {change.reason && ` - Reason: ${change.reason}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Correction Requests Tab */}
        {activeTab === 'requests' && (
          <>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Submit Correction Request</h2>
                <p style={styles.cardDescription}>
                  Request corrections for data that cannot be edited directly. Requests are
                  processed within 30 days per GDPR requirements.
                </p>
              </div>
              <div style={styles.cardBody}>
                <CorrectionRequestForm />
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Dispute AI-Generated Content</h2>
                <p style={styles.cardDescription}>
                  Challenge AI-generated descriptions, classifications, or recommendations that you
                  believe are inaccurate.
                </p>
              </div>
              <div style={styles.cardBody}>
                <AIDisputeForm />
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}

/**
 * Correction Request Form Component
 */
function CorrectionRequestForm() {
  const [dataToCorrect, setDataToCorrect] = useState('')
  const [proposedCorrection, setProposedCorrection] = useState('')
  const [reason, setReason] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const { submitCorrectionRequest, isSubmittingCorrection } = useRectification()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await submitCorrectionRequest.mutateAsync({
        dataToCorrect,
        proposedCorrection,
        reason,
      })
      setSuccessMessage(
        `Request submitted (ID: ${result.requestId}). We will respond within 30 days.`
      )
      setDataToCorrect('')
      setProposedCorrection('')
      setReason('')
    } catch {
      // Error handled by mutation
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {successMessage && <div style={styles.successMessage}>{successMessage}</div>}
      <div style={styles.formGroup}>
        <label style={styles.formLabel}>What data needs correction?</label>
        <input
          type="text"
          style={styles.input}
          value={dataToCorrect}
          onChange={(e) => setDataToCorrect(e.target.value)}
          placeholder="e.g., Screenshot timestamp, Location record, Flag description"
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.formLabel}>Proposed correction</label>
        <textarea
          style={styles.textarea}
          value={proposedCorrection}
          onChange={(e) => setProposedCorrection(e.target.value)}
          placeholder="Describe what the correct information should be"
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.formLabel}>Reason for correction</label>
        <textarea
          style={styles.textarea}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why this correction is needed"
          required
        />
      </div>
      <div style={styles.buttonRow}>
        <button
          type="submit"
          style={styles.saveButton}
          disabled={isSubmittingCorrection || !dataToCorrect || !proposedCorrection || !reason}
        >
          {isSubmittingCorrection ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </form>
  )
}

/**
 * AI Dispute Form Component
 */
function AIDisputeForm() {
  const [contentType, setContentType] = useState('')
  const [contentId, setContentId] = useState('')
  const [disputedContent, setDisputedContent] = useState('')
  const [reason, setReason] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const { submitAIDispute, isSubmittingDispute } = useRectification()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await submitAIDispute.mutateAsync({
        contentType,
        contentId,
        disputedContent,
        reason,
      })
      setSuccessMessage(
        `Dispute submitted (ID: ${result.disputeId}). We will review within 30 days.`
      )
      setContentType('')
      setContentId('')
      setDisputedContent('')
      setReason('')
    } catch {
      // Error handled by mutation
    }
  }

  const contentTypes = [
    { value: 'screenshot_description', label: 'Screenshot Description' },
    { value: 'activity_summary', label: 'Activity Summary' },
    { value: 'behavior_analysis', label: 'Behavior Analysis' },
    { value: 'content_classification', label: 'Content Classification' },
    { value: 'ai_recommendation', label: 'AI Recommendation' },
  ]

  return (
    <form onSubmit={handleSubmit}>
      {successMessage && <div style={styles.successMessage}>{successMessage}</div>}
      <div style={styles.formGroup}>
        <label style={styles.formLabel}>Type of AI content</label>
        <select
          style={styles.input}
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
          required
        >
          <option value="">Select content type...</option>
          {contentTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
      <div style={styles.formGroup}>
        <label style={styles.formLabel}>Content ID (from the record)</label>
        <input
          type="text"
          style={styles.input}
          value={contentId}
          onChange={(e) => setContentId(e.target.value)}
          placeholder="e.g., SCR-20240115-ABC123"
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.formLabel}>Disputed content (copy the text you disagree with)</label>
        <textarea
          style={styles.textarea}
          value={disputedContent}
          onChange={(e) => setDisputedContent(e.target.value)}
          placeholder="Paste the AI-generated text you want to dispute"
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.formLabel}>Why is this content inaccurate?</label>
        <textarea
          style={styles.textarea}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why you believe the AI-generated content is incorrect"
          required
        />
      </div>
      <div style={styles.buttonRow}>
        <button
          type="submit"
          style={styles.saveButton}
          disabled={
            isSubmittingDispute || !contentType || !contentId || !disputedContent || !reason
          }
        >
          {isSubmittingDispute ? 'Submitting...' : 'Submit Dispute'}
        </button>
      </div>
    </form>
  )
}
