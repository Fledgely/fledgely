/**
 * Safety Ticket Detail Page.
 *
 * Story 0.5.3: Support Agent Escape Dashboard
 * Story 0.5.4: Parent Access Severing (added severing functionality)
 *
 * Admin-only page for viewing and managing individual safety tickets.
 * Includes: full ticket details, documents, verification checklist, internal notes.
 */

'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../../contexts/AuthContext'
import {
  useSafetyAdmin,
  type SafetyTicketDetail,
  type VerificationField,
} from '../../../../hooks/useSafetyAdmin'
import { SafetyDocumentViewer } from '../../../../components/admin/SafetyDocumentViewer'
import { SafetySeverParentModal } from '../../../../components/admin/SafetySeverParentModal'
import {
  useSeverParentAccess,
  type FamilyForSevering,
  type GuardianInfoForSevering,
} from '../../../../hooks/useSeverParentAccess'
import { SafetyDeviceUnenrollSection } from '../../../../components/admin/SafetyDeviceUnenrollSection'

/**
 * Format date for display.
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Get urgency display text.
 */
function getUrgencyText(urgency: string): string {
  switch (urgency) {
    case 'urgent':
      return 'Urgent - Contact immediately'
    case 'soon':
      return 'Soon - Contact within 24 hours'
    default:
      return 'Normal - Contact when available'
  }
}

export default function SafetyTicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.ticketId as string

  const { firebaseUser, loading: authLoading } = useAuth()
  const {
    getTicketDetail,
    getDocumentUrl,
    updateTicketStatus,
    addInternalNote,
    updateVerification,
    escalateTicket,
    loading,
    error,
  } = useSafetyAdmin()

  const [ticket, setTicket] = useState<SafetyTicketDetail | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [escalationReason, setEscalationReason] = useState('')
  const [showEscalationModal, setShowEscalationModal] = useState(false)

  // Story 0.5.4: Parent Access Severing state
  const [showSeveringModal, setShowSeveringModal] = useState(false)
  const [familyForSevering, setFamilyForSevering] = useState<FamilyForSevering | null>(null)
  const [parentToSever, setParentToSever] = useState<GuardianInfoForSevering | null>(null)
  const { getFamilyForSevering, loading: severingLoading } = useSeverParentAccess()

  /**
   * Load ticket detail.
   */
  const loadTicket = useCallback(async () => {
    const result = await getTicketDetail(ticketId)
    if (result) {
      setTicket(result)
    } else if (error?.includes('Access denied') || error?.includes('permission-denied')) {
      setAccessDenied(true)
    }
  }, [getTicketDetail, ticketId, error])

  // Load ticket on mount
  useEffect(() => {
    if (firebaseUser && !authLoading && ticketId) {
      loadTicket()
    }
  }, [firebaseUser, authLoading, ticketId, loadTicket])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login')
    }
  }, [authLoading, firebaseUser, router])

  /**
   * Handle status change.
   */
  const handleStatusChange = async (newStatus: 'pending' | 'in_progress' | 'resolved') => {
    const success = await updateTicketStatus(ticketId, newStatus)
    if (success) {
      await loadTicket()
    }
  }

  /**
   * Handle adding internal note.
   */
  const handleAddNote = async () => {
    if (!newNote.trim()) return

    const success = await addInternalNote(ticketId, newNote)
    if (success) {
      setNewNote('')
      await loadTicket()
    }
  }

  /**
   * Handle verification toggle.
   */
  const handleVerificationToggle = async (field: VerificationField) => {
    if (!ticket) return

    const currentValue = ticket.verification[field]
    const success = await updateVerification(ticketId, field, !currentValue)
    if (success) {
      await loadTicket()
    }
  }

  /**
   * Handle document view.
   */
  const handleViewDocument = async (documentId: string) => {
    const result = await getDocumentUrl(documentId)
    if (result) {
      setSelectedDocument(documentId)
      setDocumentUrl(result.signedUrl)
    }
  }

  /**
   * Handle escalation.
   */
  const handleEscalate = async (urgency: 'normal' | 'high' | 'critical') => {
    const success = await escalateTicket(ticketId, urgency, escalationReason || undefined)
    if (success) {
      setShowEscalationModal(false)
      setEscalationReason('')
      await loadTicket()
    }
  }

  /**
   * Story 0.5.4: Handle initiating parent access severing.
   * Gets family info and opens the severing modal.
   */
  const handleInitiateSevering = async () => {
    const result = await getFamilyForSevering(ticketId)
    if (result?.family && result.family.guardians.length > 0) {
      setFamilyForSevering(result.family)
      // Find the parent who is NOT the requesting user (the one to sever)
      // If requestingUserUid is null, show all guardians for selection
      const parentToRemove = result.requestingUserUid
        ? result.family.guardians.find((g) => g.uid !== result.requestingUserUid)
        : result.family.guardians[0]

      if (parentToRemove) {
        setParentToSever(parentToRemove)
        setShowSeveringModal(true)
      }
    }
  }

  /**
   * Story 0.5.4: Handle successful severing.
   */
  const handleSeveringSuccess = async () => {
    await loadTicket() // Reload to show internal note
    setShowSeveringModal(false)
    setFamilyForSevering(null)
    setParentToSever(null)
  }

  /**
   * Story 0.5.4: Count verification checks completed.
   */
  const getVerificationCount = (): number => {
    if (!ticket) return 0
    return [
      ticket.verification.phoneVerified,
      ticket.verification.idDocumentVerified,
      ticket.verification.accountMatchVerified,
      ticket.verification.securityQuestionsVerified,
    ].filter(Boolean).length
  }

  // Handle loading states
  if (authLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    )
  }

  // Handle access denied
  if (accessDenied) {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <h1 style={styles.accessDeniedTitle}>Access Denied</h1>
          <p style={styles.accessDeniedText}>You do not have permission to access this page.</p>
        </div>
      </div>
    )
  }

  if (!ticket && loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading ticket...</div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Ticket not found</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button onClick={() => router.push('/admin/safety')} style={styles.backButton}>
          ← Back to Dashboard
        </button>
        <div style={styles.headerInfo}>
          <h1 style={styles.title}>Ticket #{ticket.id.substring(0, 8)}</h1>
          <div style={styles.headerMeta}>
            <span style={styles.urgencyBadge}>{getUrgencyText(ticket.urgency)}</span>
            <span style={styles.statusBadge}>{ticket.status}</span>
          </div>
        </div>
      </header>

      {/* Error display */}
      {error && (
        <div style={styles.error} role="alert">
          {error}
        </div>
      )}

      <div style={styles.content}>
        {/* Main content */}
        <div style={styles.mainColumn}>
          {/* Message */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Message</h2>
            <p style={styles.message}>{ticket.message}</p>
            <p style={styles.timestamp}>Submitted: {formatDate(ticket.createdAt)}</p>
          </section>

          {/* Contact Info */}
          {ticket.safeContactInfo && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Safe Contact Information</h2>
              <div style={styles.contactInfo}>
                {ticket.safeContactInfo.phone && (
                  <p>
                    <strong>Phone:</strong> {ticket.safeContactInfo.phone}
                  </p>
                )}
                {ticket.safeContactInfo.email && (
                  <p>
                    <strong>Email:</strong> {ticket.safeContactInfo.email}
                  </p>
                )}
                {ticket.safeContactInfo.preferredMethod && (
                  <p>
                    <strong>Preferred method:</strong> {ticket.safeContactInfo.preferredMethod}
                  </p>
                )}
                {ticket.safeContactInfo.safeTimeToContact && (
                  <p>
                    <strong>Safe time to contact:</strong>{' '}
                    {ticket.safeContactInfo.safeTimeToContact}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Documents */}
          {ticket.documents.length > 0 && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Documents ({ticket.documents.length})</h2>
              <div style={styles.documentList}>
                {ticket.documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleViewDocument(doc.id)}
                    style={styles.documentButton}
                  >
                    <span>📄 {doc.filename}</span>
                    <span style={styles.documentSize}>{(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Document viewer modal */}
          {selectedDocument && documentUrl && (
            <SafetyDocumentViewer
              url={documentUrl}
              mimeType={ticket.documents.find((d) => d.id === selectedDocument)?.mimeType || ''}
              filename={ticket.documents.find((d) => d.id === selectedDocument)?.filename || ''}
              onClose={() => {
                setSelectedDocument(null)
                setDocumentUrl(null)
              }}
            />
          )}

          {/* Internal Notes */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Internal Notes</h2>
            <div style={styles.notesList}>
              {ticket.internalNotes.length === 0 ? (
                <p style={styles.emptyNotes}>No notes yet</p>
              ) : (
                ticket.internalNotes.map((note) => (
                  <div key={note.id} style={styles.noteCard}>
                    <p style={styles.noteContent}>{note.content}</p>
                    <p style={styles.noteMeta}>
                      {note.agentEmail || note.agentId} • {formatDate(note.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div style={styles.noteForm}>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add internal note..."
                style={styles.noteInput}
                rows={3}
              />
              <button
                onClick={handleAddNote}
                disabled={loading || !newNote.trim()}
                style={styles.noteButton}
              >
                Add Note
              </button>
            </div>
          </section>

          {/* Story 0.5.5: Device Unenrollment Section */}
          {getVerificationCount() >= 2 && (
            <SafetyDeviceUnenrollSection
              ticketId={ticketId}
              verificationStatus={{
                phoneVerified: ticket.verification.phoneVerified,
                idDocumentVerified: ticket.verification.idDocumentVerified,
                accountMatchVerified: ticket.verification.accountMatchVerified,
                securityQuestionsVerified: ticket.verification.securityQuestionsVerified,
              }}
              onSuccess={loadTicket}
            />
          )}
        </div>

        {/* Sidebar */}
        <div style={styles.sidebar}>
          {/* Status Actions */}
          <section style={styles.sidebarSection}>
            <h3 style={styles.sidebarTitle}>Status</h3>
            <div style={styles.statusButtons}>
              {ticket.status !== 'in_progress' && ticket.status !== 'resolved' && (
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={loading}
                  style={styles.statusButton}
                >
                  Start Working
                </button>
              )}
              {ticket.status !== 'resolved' && (
                <button
                  onClick={() => handleStatusChange('resolved')}
                  disabled={loading}
                  style={{ ...styles.statusButton, backgroundColor: '#059669' }}
                >
                  Mark Resolved
                </button>
              )}
              {ticket.status !== 'escalated' && (
                <button
                  onClick={() => setShowEscalationModal(true)}
                  disabled={loading}
                  style={{ ...styles.statusButton, backgroundColor: '#be185d' }}
                >
                  Escalate
                </button>
              )}
            </div>
          </section>

          {/* Story 0.5.4: Parent Access Severing */}
          <section style={styles.sidebarSection}>
            <h3 style={styles.sidebarTitle}>Account Actions</h3>
            <div style={styles.statusButtons}>
              <button
                onClick={handleInitiateSevering}
                disabled={loading || severingLoading || getVerificationCount() < 2}
                style={{
                  ...styles.statusButton,
                  backgroundColor: getVerificationCount() >= 2 ? '#7c3aed' : '#c4b5fd',
                  cursor: getVerificationCount() >= 2 ? 'pointer' : 'not-allowed',
                }}
              >
                {severingLoading ? 'Loading...' : 'Sever Parent Access'}
              </button>
              {getVerificationCount() < 2 && (
                <p style={styles.severingWarning}>
                  Requires minimum 2 verification checks ({getVerificationCount()}/4 completed)
                </p>
              )}
            </div>
          </section>

          {/* Verification Checklist */}
          <section style={styles.sidebarSection}>
            <h3 style={styles.sidebarTitle}>Identity Verification</h3>
            <div style={styles.verificationList}>
              {(
                [
                  { field: 'phoneVerified', label: 'Out-of-band phone verification' },
                  { field: 'idDocumentVerified', label: 'ID document match' },
                  { field: 'accountMatchVerified', label: 'Account email/phone match' },
                  { field: 'securityQuestionsVerified', label: 'Security questions' },
                ] as const
              ).map(({ field, label }) => (
                <label key={field} style={styles.verificationItem}>
                  <input
                    type="checkbox"
                    checked={ticket.verification[field]}
                    onChange={() => handleVerificationToggle(field)}
                    disabled={loading}
                    style={styles.checkbox}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* User Info */}
          {(ticket.userEmail || ticket.userId) && (
            <section style={styles.sidebarSection}>
              <h3 style={styles.sidebarTitle}>User Info</h3>
              {ticket.userEmail && <p style={styles.userInfo}>Email: {ticket.userEmail}</p>}
              {ticket.userId && (
                <p style={styles.userInfo}>User ID: {ticket.userId.substring(0, 8)}...</p>
              )}
            </section>
          )}

          {/* History */}
          {ticket.history.length > 0 && (
            <section style={styles.sidebarSection}>
              <h3 style={styles.sidebarTitle}>History</h3>
              <div style={styles.historyList}>
                {ticket.history.map((entry, index) => (
                  <div key={index} style={styles.historyItem}>
                    <p style={styles.historyAction}>{entry.action.replace(/_/g, ' ')}</p>
                    <p style={styles.historyMeta}>
                      {entry.agentEmail || entry.agentId} • {formatDate(entry.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Escalation Modal */}
      {showEscalationModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Escalate Ticket</h3>
            <textarea
              value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
              placeholder="Reason for escalation (optional)"
              style={styles.escalationInput}
              rows={3}
            />
            <div style={styles.escalationButtons}>
              <button
                onClick={() => handleEscalate('normal')}
                disabled={loading}
                style={styles.escalationButton}
              >
                Normal
              </button>
              <button
                onClick={() => handleEscalate('high')}
                disabled={loading}
                style={{ ...styles.escalationButton, backgroundColor: '#d97706' }}
              >
                High
              </button>
              <button
                onClick={() => handleEscalate('critical')}
                disabled={loading}
                style={{ ...styles.escalationButton, backgroundColor: '#dc2626' }}
              >
                Critical
              </button>
            </div>
            <button onClick={() => setShowEscalationModal(false)} style={styles.cancelButton}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Story 0.5.4: Parent Access Severing Modal */}
      {showSeveringModal && familyForSevering && parentToSever && (
        <SafetySeverParentModal
          isOpen={showSeveringModal}
          onClose={() => {
            setShowSeveringModal(false)
            setFamilyForSevering(null)
            setParentToSever(null)
          }}
          ticketId={ticketId}
          family={familyForSevering}
          parentToSever={parentToSever}
          verificationStatus={
            ticket
              ? {
                  phoneVerified: ticket.verification.phoneVerified,
                  idDocumentVerified: ticket.verification.idDocumentVerified,
                  accountMatchVerified: ticket.verification.accountMatchVerified,
                  securityQuestionsVerified: ticket.verification.securityQuestionsVerified,
                }
              : {
                  phoneVerified: false,
                  idDocumentVerified: false,
                  accountMatchVerified: false,
                  securityQuestionsVerified: false,
                }
          }
          onSuccess={handleSeveringSuccess}
        />
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    marginBottom: '24px',
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    fontSize: '14px',
    cursor: 'pointer',
    padding: 0,
    marginBottom: '16px',
  },
  headerInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  headerMeta: {
    display: 'flex',
    gap: '12px',
  },
  urgencyBadge: {
    padding: '4px 12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 500,
  },
  statusBadge: {
    padding: '4px 12px',
    backgroundColor: '#dbeafe',
    color: '#2563eb',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '24px',
  },
  mainColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 16px',
  },
  message: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    margin: '0 0 12px',
  },
  timestamp: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: 0,
  },
  contactInfo: {
    fontSize: '14px',
    color: '#374151',
  },
  documentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  documentButton: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
  },
  documentSize: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  notesList: {
    marginBottom: '16px',
  },
  emptyNotes: {
    fontSize: '14px',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  noteCard: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    marginBottom: '8px',
  },
  noteContent: {
    fontSize: '14px',
    color: '#374151',
    margin: '0 0 8px',
    whiteSpace: 'pre-wrap',
  },
  noteMeta: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: 0,
  },
  noteForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  noteInput: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
  },
  noteButton: {
    alignSelf: 'flex-end',
    padding: '8px 16px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sidebarSection: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
  },
  sidebarTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 12px',
  },
  statusButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statusButton: {
    padding: '10px 16px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  verificationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  verificationItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#374151',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  userInfo: {
    fontSize: '13px',
    color: '#374151',
    margin: '0 0 4px',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  historyItem: {
    padding: '8px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
  },
  historyAction: {
    fontSize: '12px',
    color: '#374151',
    margin: '0 0 4px',
    textTransform: 'capitalize',
  },
  historyMeta: {
    fontSize: '11px',
    color: '#9ca3af',
    margin: 0,
  },
  loading: {
    textAlign: 'center',
    padding: '48px',
    color: '#6b7280',
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  accessDenied: {
    textAlign: 'center',
    padding: '48px',
  },
  accessDeniedTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 16px',
  },
  accessDeniedText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  modal: {
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
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    width: '400px',
    maxWidth: '90%',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 16px',
  },
  escalationInput: {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
    marginBottom: '16px',
    boxSizing: 'border-box',
  },
  escalationButtons: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  escalationButton: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  cancelButton: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  // Story 0.5.4: Parent Access Severing styles
  severingSection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  severButton: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  severButtonDisabled: {
    backgroundColor: '#c4b5fd',
    cursor: 'not-allowed',
  },
  severingWarning: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '8px',
    marginBottom: 0,
  },
}
