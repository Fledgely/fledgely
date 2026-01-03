'use client'

/**
 * CaregiverManagementPage - Story 39.1, Story 39.2, Story 39.3
 *
 * Component for parents to manage family caregivers.
 * Shows list of active caregivers, pending invitations, and add button.
 *
 * Implements:
 * - Story 39.1 AC5: Caregiver List Display
 *   - Shows list of all caregivers with name, relationship, status
 *   - Shows pending invitations separately
 *   - Shows count: "3 of 5 caregivers"
 *
 * - Story 39.2 AC1: Permission Display
 *   - Shows permission badges on each caregiver card
 *   - "Manage" button opens CaregiverPermissionEditor modal
 *   - Display permission icons (eye, clock, flag)
 *
 * - Story 39.3: Temporary Access Management
 *   - "Grant Access" button on caregiver cards
 *   - TemporaryAccessGrantForm modal
 *   - TemporaryAccessList section
 *   - Active temporary access indicators
 *
 * Uses React.CSSProperties inline styles per project pattern.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useCaregiverLimit } from '../../hooks/useCaregiverLimit'
import { useFamily } from '../../contexts/FamilyContext'
import {
  getCaregiverInvitationsByFamily,
  type CaregiverInvitation,
} from '../../services/caregiverInvitationService'
import CaregiverInviteForm from './CaregiverInviteForm'
import CaregiverPermissionEditor from './CaregiverPermissionEditor'
import TemporaryAccessGrantForm from './TemporaryAccessGrantForm'
import TemporaryAccessList from './TemporaryAccessList'
import type {
  FamilyCaregiver,
  CaregiverRelationship,
  CaregiverPermissions,
  TemporaryAccessGrant,
} from '@fledgely/shared/contracts'

interface CaregiverManagementPageProps {
  familyId: string
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  countBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: '#ede9fe',
    color: '#7c3aed',
    borderRadius: '16px',
    fontSize: '14px',
    fontWeight: 500,
  },
  addButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  addButtonDisabled: {
    backgroundColor: '#a78bfa',
    cursor: 'not-allowed',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
    height: '24px',
    padding: '0 8px',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    gap: '16px',
  },
  cardInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    flex: 1,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  cardName: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#1f2937',
    margin: 0,
  },
  cardRelationship: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    marginTop: '4px',
    width: 'fit-content',
  },
  cardMeta: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: 0,
  },
  manageButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  pendingCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: '#fefce8',
    border: '1px solid #fef08a',
    borderRadius: '12px',
    gap: '16px',
  },
  pendingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    backgroundColor: '#fef08a',
    color: '#a16207',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  emptyState: {
    padding: '32px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    textAlign: 'center' as const,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: '14px',
    margin: 0,
  },
  modal: {
    position: 'fixed' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    padding: '24px',
  },
  modalContent: {
    maxHeight: '90vh',
    overflowY: 'auto' as const,
  },
  loading: {
    padding: '32px',
    textAlign: 'center' as const,
    color: '#6b7280',
  },
  // Story 39.2: Permission badge styles
  permissionBadges: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
    flexWrap: 'wrap' as const,
  },
  permissionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: '#ede9fe',
    color: '#7c3aed',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  permissionBadgeIcon: {
    fontSize: '12px',
  },
  // Story 39.3: Temporary access styles
  grantAccessButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '8px 16px',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #a7f3d0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginRight: '8px',
  },
  tempAccessIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexShrink: 0,
  },
}

/** Format relationship for display */
function formatRelationship(
  relationship: CaregiverRelationship,
  customRelationship?: string | null
): string {
  if (relationship === 'other' && customRelationship) {
    return customRelationship
  }
  const labels: Record<CaregiverRelationship, string> = {
    grandparent: 'Grandparent',
    aunt_uncle: 'Aunt/Uncle',
    babysitter: 'Babysitter',
    other: customRelationship || 'Caregiver',
  }
  return labels[relationship] || 'Caregiver'
}

/** Format date for display */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export default function CaregiverManagementPage({ familyId }: CaregiverManagementPageProps) {
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [pendingInvitations, setPendingInvitations] = useState<CaregiverInvitation[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(true)
  // Story 39.2: Permission editor modal state
  const [editingCaregiver, setEditingCaregiver] = useState<FamilyCaregiver | null>(null)
  // Story 39.3: Temporary access state
  const [grantingAccessCaregiver, setGrantingAccessCaregiver] = useState<FamilyCaregiver | null>(
    null
  )
  const [temporaryGrants, setTemporaryGrants] = useState<TemporaryAccessGrant[]>([])

  const { family, refreshFamily } = useFamily()
  const { limit, loading: loadingLimit } = useCaregiverLimit({ familyId })

  // Get caregivers from family context
  const caregivers = useMemo(() => {
    return (family?.caregivers || []) as FamilyCaregiver[]
  }, [family?.caregivers])

  // Load pending invitations
  const loadPendingInvitations = useCallback(async () => {
    try {
      setLoadingInvitations(true)
      const invitations = await getCaregiverInvitationsByFamily(familyId)
      setPendingInvitations(invitations.filter((inv) => inv.status === 'pending'))
    } catch (err) {
      console.error('Failed to load pending invitations:', err)
    } finally {
      setLoadingInvitations(false)
    }
  }, [familyId])

  // Load invitations on mount
  useEffect(() => {
    loadPendingInvitations()
  }, [loadPendingInvitations])

  // Story 39.3: Load temporary access grants with real-time updates
  useEffect(() => {
    if (!familyId) return

    const grantsRef = collection(db, 'families', familyId, 'temporaryAccessGrants')
    const grantsQuery = query(grantsRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(grantsQuery, (snapshot) => {
      const grants: TemporaryAccessGrant[] = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          familyId: data.familyId,
          caregiverUid: data.caregiverUid,
          grantedByUid: data.grantedByUid,
          startAt: data.startAt?.toDate?.() || new Date(data.startAt),
          endAt: data.endAt?.toDate?.() || new Date(data.endAt),
          preset: data.preset,
          timezone: data.timezone,
          status: data.status,
          revokedAt: data.revokedAt?.toDate?.() || undefined,
          revokedByUid: data.revokedByUid || undefined,
          revokedReason: data.revokedReason || undefined,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        }
      })
      setTemporaryGrants(grants)
    })

    return () => unsubscribe()
  }, [familyId])

  const handleAddClick = useCallback(() => {
    setShowInviteForm(true)
  }, [])

  const handleCloseForm = useCallback(() => {
    setShowInviteForm(false)
  }, [])

  const handleInviteSuccess = useCallback(() => {
    setShowInviteForm(false)
    // Reload invitations to show the new pending one
    loadPendingInvitations()
  }, [loadPendingInvitations])

  // Story 39.2: Permission editor handlers
  const handleManageClick = useCallback((caregiver: FamilyCaregiver) => {
    setEditingCaregiver(caregiver)
  }, [])

  const handlePermissionEditorClose = useCallback(() => {
    setEditingCaregiver(null)
  }, [])

  const handlePermissionSuccess = useCallback(
    (_permissions: CaregiverPermissions) => {
      // Refresh family data to show updated permissions
      refreshFamily?.()
      // Close modal after a brief delay to show success message
      setTimeout(() => {
        setEditingCaregiver(null)
      }, 1500)
    },
    [refreshFamily]
  )

  // Story 39.3: Temporary access grant handlers
  const handleGrantAccessClick = useCallback((caregiver: FamilyCaregiver) => {
    setGrantingAccessCaregiver(caregiver)
  }, [])

  const handleGrantAccessClose = useCallback(() => {
    setGrantingAccessCaregiver(null)
  }, [])

  const handleGrantAccessSuccess = useCallback(() => {
    // Grant data refreshes automatically via onSnapshot
    setTimeout(() => {
      setGrantingAccessCaregiver(null)
    }, 2000)
  }, [])

  // Build caregiver names map for TemporaryAccessList
  const caregiverNames = useMemo(() => {
    const names: Record<string, string> = {}
    caregivers.forEach((c) => {
      names[c.uid] = c.displayName || c.email || 'Caregiver'
    })
    return names
  }, [caregivers])

  // Check if caregiver has active temporary access
  const hasActiveTemporaryAccess = useCallback(
    (caregiverUid: string): boolean => {
      const now = new Date()
      return temporaryGrants.some(
        (grant) =>
          grant.caregiverUid === caregiverUid &&
          grant.status === 'active' &&
          grant.startAt <= now &&
          grant.endAt > now
      )
    },
    [temporaryGrants]
  )

  const isAtLimit = limit?.isAtLimit ?? false

  return (
    <div style={styles.container} data-testid="caregiver-management-page">
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={styles.title}>Caregivers</h1>
          {!loadingLimit && limit && (
            <span style={styles.countBadge} data-testid="caregiver-count">
              {limit.activeCount} of {limit.maxAllowed}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleAddClick}
          disabled={isAtLimit}
          style={{
            ...styles.addButton,
            ...(isAtLimit ? styles.addButtonDisabled : {}),
          }}
          data-testid="add-caregiver-button"
        >
          + Add Caregiver
        </button>
      </div>

      {/* Active Caregivers Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          Active Caregivers
          <span style={styles.sectionCount}>{caregivers.length}</span>
        </h2>

        {caregivers.length === 0 ? (
          <div style={styles.emptyState} data-testid="no-caregivers">
            <p style={styles.emptyText}>
              No caregivers yet. Add a grandparent or trusted adult to help supervise.
            </p>
          </div>
        ) : (
          <div style={styles.list} data-testid="caregiver-list">
            {caregivers.map((caregiver) => (
              <div
                key={caregiver.uid}
                style={styles.card}
                data-testid={`caregiver-${caregiver.uid}`}
              >
                <div style={styles.cardInfo}>
                  <div style={styles.cardHeader}>
                    <p style={styles.cardName}>{caregiver.displayName || caregiver.email}</p>
                    {/* Story 39.3: Active temporary access indicator */}
                    {hasActiveTemporaryAccess(caregiver.uid) && (
                      <span
                        style={styles.tempAccessIndicator}
                        data-testid={`temp-access-${caregiver.uid}`}
                      >
                        ⏱️ Temp Access
                      </span>
                    )}
                  </div>
                  <span style={styles.cardRelationship}>
                    {formatRelationship(caregiver.relationship, caregiver.customRelationship)}
                  </span>
                  {/* Story 39.2: Permission badges */}
                  <div style={styles.permissionBadges} data-testid={`permissions-${caregiver.uid}`}>
                    <span style={styles.permissionBadge} title="Can view status (always on)">
                      <span style={styles.permissionBadgeIcon} aria-hidden="true">
                        &#x1F441;
                      </span>
                      View Status
                    </span>
                    {caregiver.permissions?.canExtendTime && (
                      <span style={styles.permissionBadge} title="Can extend screen time">
                        <span style={styles.permissionBadgeIcon} aria-hidden="true">
                          &#x23F0;
                        </span>
                        Extend Time
                      </span>
                    )}
                    {caregiver.permissions?.canViewFlags && (
                      <span style={styles.permissionBadge} title="Can view flagged content">
                        <span style={styles.permissionBadgeIcon} aria-hidden="true">
                          &#x1F6A9;
                        </span>
                        View Flags
                      </span>
                    )}
                  </div>
                  <p style={styles.cardMeta}>Added {formatDate(caregiver.addedAt)}</p>
                </div>
                {/* Story 39.3: Grant Access and Manage buttons */}
                <div style={styles.cardActions}>
                  <button
                    type="button"
                    style={styles.grantAccessButton}
                    onClick={() => handleGrantAccessClick(caregiver)}
                    data-testid={`grant-access-${caregiver.uid}`}
                  >
                    Grant Access
                  </button>
                  <button
                    type="button"
                    style={styles.manageButton}
                    onClick={() => handleManageClick(caregiver)}
                    data-testid={`manage-${caregiver.uid}`}
                  >
                    Manage
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          Pending Invitations
          <span style={styles.sectionCount}>{pendingInvitations.length}</span>
        </h2>

        {loadingInvitations ? (
          <div style={styles.loading}>Loading...</div>
        ) : pendingInvitations.length === 0 ? (
          <div style={styles.emptyState} data-testid="no-pending">
            <p style={styles.emptyText}>No pending invitations.</p>
          </div>
        ) : (
          <div style={styles.list} data-testid="pending-list">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                style={styles.pendingCard}
                data-testid={`pending-${invitation.id}`}
              >
                <div style={styles.cardInfo}>
                  <p style={styles.cardName}>{invitation.recipientEmail}</p>
                  <span style={styles.cardRelationship}>
                    {formatRelationship(invitation.relationship, invitation.customRelationship)}
                  </span>
                  <p style={styles.cardMeta}>
                    Invited {formatDate(invitation.createdAt)} • Expires{' '}
                    {formatDate(invitation.expiresAt)}
                  </p>
                </div>
                <span style={styles.pendingBadge}>Pending</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div
          style={styles.modal}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseForm()
          }}
          data-testid="invite-modal"
        >
          <div style={styles.modalContent}>
            <CaregiverInviteForm
              familyId={familyId}
              onSuccess={handleInviteSuccess}
              onCancel={handleCloseForm}
            />
          </div>
        </div>
      )}

      {/* Story 39.2: Permission Editor Modal */}
      {editingCaregiver && (
        <div
          style={styles.modal}
          onClick={(e) => {
            if (e.target === e.currentTarget) handlePermissionEditorClose()
          }}
          data-testid="permission-editor-modal"
        >
          <div style={styles.modalContent}>
            <CaregiverPermissionEditor
              familyId={familyId}
              caregiverUid={editingCaregiver.uid}
              caregiverName={editingCaregiver.displayName || editingCaregiver.email || 'Caregiver'}
              currentPermissions={editingCaregiver.permissions}
              onSuccess={handlePermissionSuccess}
              onCancel={handlePermissionEditorClose}
            />
          </div>
        </div>
      )}

      {/* Story 39.3: Temporary Access Grant Modal */}
      {grantingAccessCaregiver && (
        <div
          style={styles.modal}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleGrantAccessClose()
          }}
          data-testid="grant-access-modal"
        >
          <div style={styles.modalContent}>
            <TemporaryAccessGrantForm
              familyId={familyId}
              caregiverUid={grantingAccessCaregiver.uid}
              caregiverName={
                grantingAccessCaregiver.displayName || grantingAccessCaregiver.email || 'Caregiver'
              }
              onSuccess={handleGrantAccessSuccess}
              onCancel={handleGrantAccessClose}
            />
          </div>
        </div>
      )}

      {/* Story 39.3: Temporary Access Section */}
      {temporaryGrants.length > 0 && (
        <div style={styles.section} data-testid="temporary-access-section">
          <TemporaryAccessList
            familyId={familyId}
            grants={temporaryGrants}
            caregiverNames={caregiverNames}
          />
        </div>
      )}
    </div>
  )
}
