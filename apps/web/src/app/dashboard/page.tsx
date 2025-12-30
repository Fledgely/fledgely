'use client'

/**
 * Dashboard page - protected route.
 *
 * Shows user info, family info, and logout functionality.
 * Redirects unauthenticated users to login.
 * Redirects new users to onboarding.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { useFamily } from '../../contexts/FamilyContext'
import { calculateAge, deleteChild } from '../../services/childService'
import { deleteFamily } from '../../services/familyService'
import { hasCustodyDeclaration } from '../../services/custodyService'
import CustodyStatusBadge from '../../components/CustodyStatusBadge'
import RemoveChildModal from '../../components/RemoveChildModal'
import DissolveFamilyModal from '../../components/DissolveFamilyModal'
import InviteCoParentModal from '../../components/InviteCoParentModal'
import { AddDeviceModal, DevicesList } from '../../components/devices'
import { FamilyStatusCard } from '../../components/dashboard'
import GuardianBadge from '../../components/GuardianBadge'
import InvitationStatusCard from '../../components/InvitationStatusCard'
import InvitationHistoryList from '../../components/InvitationHistoryList'
import type { ChildProfile, Invitation, SafetySettingChange } from '@fledgely/shared/contracts'
import { getPendingInvitation } from '../../services/invitationService'
import { logDataViewNonBlocking } from '../../services/dataViewAuditService'
import {
  getPendingSafetySettingChanges,
  approveSafetySettingChange,
  declineSafetySettingChange,
} from '../../services/safetySettingService'
import SafetySettingProposalCard from '../../components/SafetySettingProposalCard'
import { usePushNotifications } from '../../hooks/usePushNotifications'

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
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '44px',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1f2937',
    letterSpacing: '-0.02em',
    textDecoration: 'none',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
  },
  userName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
  },
  logoutButton: {
    minHeight: '44px',
    minWidth: '44px',
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '48px 24px',
  },
  welcome: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '16px',
  },
  description: {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '32px',
    lineHeight: 1.6,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '16px',
  },
  infoRow: {
    display: 'flex',
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  infoLabel: {
    width: '120px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: '14px',
    color: '#1f2937',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '24px',
    color: '#dc2626',
    fontSize: '14px',
  },
}

export default function DashboardPage() {
  const { firebaseUser, userProfile, loading, isNewUser, profileError, signOut } = useAuth()
  const { family, children, loading: familyLoading, refreshChildren, refreshFamily } = useFamily()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [childToRemove, setChildToRemove] = useState<ChildProfile | null>(null)
  const [showDissolveModal, setShowDissolveModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false)
  const [pendingInvitation, setPendingInvitation] = useState<Invitation | null>(null)
  const [invitationRefreshTrigger, setInvitationRefreshTrigger] = useState(0)
  const [pendingSafetyChanges, setPendingSafetyChanges] = useState<SafetySettingChange[]>([])
  const [safetyChangesRefreshTrigger, setSafetyChangesRefreshTrigger] = useState(0)

  // Push notifications setup (Story 19A.4)
  const { permissionStatus, requestPermission } = usePushNotifications({
    userId: firebaseUser?.uid ?? null,
  })

  // Auto-request notification permission when user logs in (Story 19A.4 - AC #5)
  // Only prompts once per browser session and respects user's previous choice
  useEffect(() => {
    if (firebaseUser && permissionStatus === 'default') {
      // Small delay to avoid overwhelming user immediately on page load
      const timer = setTimeout(() => {
        requestPermission()
      }, 2000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [firebaseUser, permissionStatus, requestPermission])

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/login')
    }
  }, [firebaseUser, loading, router])

  // Redirect new users to onboarding
  useEffect(() => {
    if (!loading && firebaseUser && isNewUser) {
      router.push('/onboarding')
    }
  }, [firebaseUser, loading, isNewUser, router])

  // Load pending invitation for the family (Story 3.5)
  useEffect(() => {
    if (family?.id) {
      getPendingInvitation(family.id)
        .then(setPendingInvitation)
        .catch((err) => {
          console.error('Error loading pending invitation:', err)
        })
    } else {
      setPendingInvitation(null)
    }
  }, [family?.id, invitationRefreshTrigger])

  // Log data view for audit trail (Story 3A.1 - AC3)
  // This creates transparency for co-parents in shared custody families
  useEffect(() => {
    if (family?.id && firebaseUser?.uid) {
      // Log viewing the children list (family-level view)
      logDataViewNonBlocking({
        viewerUid: firebaseUser.uid,
        childId: null,
        familyId: family.id,
        dataType: 'children_list',
      })
    }
  }, [family?.id, firebaseUser?.uid])

  // Load pending safety setting changes (Story 3A.2)
  // Displays proposals requiring two-parent approval for safety settings
  useEffect(() => {
    if (family?.id) {
      getPendingSafetySettingChanges(family.id)
        .then(setPendingSafetyChanges)
        .catch((err) => {
          console.error('Error loading pending safety changes:', err)
        })
    } else {
      setPendingSafetyChanges([])
    }
  }, [family?.id, safetyChangesRefreshTrigger])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await signOut()
      // Redirect to login page where "logged out" message will be shown
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      setLoggingOut(false)
    }
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <main id="main-content" style={styles.main}>
        <div style={styles.content}>
          <p>Loading...</p>
        </div>
      </main>
    )
  }

  // Don't render dashboard content if not authenticated
  if (!firebaseUser) {
    return null
  }

  // Use Firestore profile if available, fallback to Firebase Auth data
  const displayName = userProfile?.displayName ?? firebaseUser.displayName ?? 'User'
  const email = userProfile?.email ?? firebaseUser.email ?? ''
  const photoURL = userProfile?.photoURL ?? firebaseUser.photoURL
  const uid = firebaseUser.uid

  return (
    <main id="main-content" style={styles.main}>
      <style>
        {`
          .logout-button:focus {
            outline: 2px solid #4F46E5;
            outline-offset: 2px;
          }
          .logout-button:hover:not(:disabled) {
            background-color: #f9fafb;
            border-color: #9ca3af;
          }
          .logout-button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }
          .create-family-link:focus {
            outline: 2px solid #4F46E5;
            outline-offset: 2px;
          }
          .create-family-link:hover {
            background-color: #4338CA;
          }
          .add-child-link:focus {
            outline: 2px solid #4F46E5;
            outline-offset: 2px;
          }
          .add-child-link:hover {
            background-color: #4338CA;
          }
          .declare-custody-link:focus {
            outline: 2px solid #dc2626;
            outline-offset: 2px;
          }
          .declare-custody-link:hover {
            background-color: #b91c1c;
          }
          .edit-child-link:focus {
            outline: 2px solid #4F46E5;
            outline-offset: 2px;
          }
          .edit-child-link:hover {
            background-color: #e5e7eb;
          }
          .remove-child-button:focus {
            outline: 2px solid #dc2626;
            outline-offset: 2px;
          }
          .remove-child-button:hover {
            background-color: #fef2f2;
            border-color: #fca5a5;
          }
          .dissolve-family-button:focus {
            outline: 2px solid #dc2626;
            outline-offset: 2px;
          }
          .dissolve-family-button:hover {
            background-color: #fef2f2;
            border-color: #fca5a5;
          }
          .invite-coparent-button:focus {
            outline: 2px solid #7c3aed;
            outline-offset: 2px;
          }
          .invite-coparent-button:hover {
            background-color: #f5f3ff;
            border-color: #c4b5fd;
          }
          .add-device-button:focus {
            outline: 2px solid #2563eb;
            outline-offset: 2px;
          }
          .add-device-button:hover {
            background-color: #1d4ed8;
          }
          .get-help-link {
            color: #6b7280;
            font-size: 14px;
            text-decoration: none;
          }
          .get-help-link:hover {
            color: #374151;
            text-decoration: underline;
          }
          .get-help-link:focus {
            outline: 2px solid #4F46E5;
            outline-offset: 2px;
          }
          .child-item {
            display: flex;
            align-items: center;
            padding: 12px;
            background-color: #f9fafb;
            border-radius: 8px;
            margin-bottom: 8px;
          }
          .child-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: #e5e7eb;
            margin-right: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: #6b7280;
          }
        `}
      </style>
      <header style={styles.header}>
        <a href="/" style={styles.logo}>
          Fledgely
        </a>
        <div style={styles.userInfo}>
          {photoURL ? (
            <img src={photoURL} alt="" style={styles.avatar} referrerPolicy="no-referrer" />
          ) : (
            <div style={styles.avatar} />
          )}
          <span style={styles.userName}>{displayName}</span>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={styles.logoutButton}
            className="logout-button"
            aria-label="Sign out of your account"
            aria-busy={loggingOut}
          >
            {loggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </header>

      <div style={styles.content}>
        <h1 style={styles.welcome}>Welcome back, {displayName.split(' ')[0]}!</h1>
        <p style={styles.description}>
          You&apos;re signed in to Fledgely. This is a placeholder dashboard that will be replaced
          with family management features in upcoming stories.
        </p>

        {profileError && (
          <div style={styles.errorBanner} role="alert">
            Unable to load your profile. Some features may be limited.
          </div>
        )}

        {/* Story 19A.1: Family Status Summary Card - positioned above all other content */}
        {family && <FamilyStatusCard familyId={family.id} />}

        {/* Family Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Family</h2>
          {familyLoading ? (
            <p style={styles.infoValue}>Loading family...</p>
          ) : family ? (
            <>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Family Name</span>
                <span style={styles.infoValue}>{family.name}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Guardians</span>
                <span style={styles.infoValue}>
                  {family.guardians.length}
                  {firebaseUser && (
                    <GuardianBadge guardians={family.guardians} currentUserUid={firebaseUser.uid} />
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Created</span>
                <span style={styles.infoValue}>{family.createdAt.toLocaleDateString()}</span>
              </div>
              <div style={{ ...styles.infoRow, borderBottom: 'none' }}>
                <span style={styles.infoLabel}>Actions</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* AC1: Only show Invite Co-Parent when family has at least one child */}
                  {children.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '44px',
                        padding: '8px 16px',
                        backgroundColor: '#ffffff',
                        color: '#7c3aed',
                        fontSize: '13px',
                        fontWeight: 500,
                        borderRadius: '6px',
                        border: '1px solid #ddd6fe',
                        cursor: 'pointer',
                      }}
                      className="invite-coparent-button"
                      aria-label="Invite a co-parent to this family"
                    >
                      Invite Co-Parent
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowDissolveModal(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '44px',
                      padding: '8px 16px',
                      backgroundColor: '#ffffff',
                      color: '#dc2626',
                      fontSize: '13px',
                      fontWeight: 500,
                      borderRadius: '6px',
                      border: '1px solid #fecaca',
                      cursor: 'pointer',
                    }}
                    className="dissolve-family-button"
                    aria-label="Dissolve this family"
                  >
                    Dissolve Family
                  </button>
                </div>
              </div>

              {/* Pending Safety Setting Changes (Story 3A.2) */}
              {firebaseUser && pendingSafetyChanges.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h3
                    style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#1f2937',
                      marginBottom: '12px',
                    }}
                  >
                    Pending Safety Setting Changes
                  </h3>
                  {pendingSafetyChanges.map((change) => (
                    <SafetySettingProposalCard
                      key={change.id}
                      proposal={change}
                      currentUserUid={firebaseUser.uid}
                      onApprove={async () => {
                        await approveSafetySettingChange({
                          changeId: change.id,
                          approverUid: firebaseUser.uid,
                        })
                        setSafetyChangesRefreshTrigger((t) => t + 1)
                        // AC2: Notification placeholder (Story 41)
                        console.log(
                          `[Notification] Safety setting change approved: ${change.settingType}`
                        )
                      }}
                      onDecline={async (reason) => {
                        await declineSafetySettingChange({
                          changeId: change.id,
                          declinerUid: firebaseUser.uid,
                          reason,
                        })
                        setSafetyChangesRefreshTrigger((t) => t + 1)
                        // AC2: Notification placeholder (Story 41)
                        console.log(
                          `[Notification] Safety setting change declined: ${change.settingType}`
                        )
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Pending Invitation Status Card (Story 3.5 AC1) */}
              {firebaseUser && pendingInvitation && (
                <div style={{ marginTop: '16px' }}>
                  <InvitationStatusCard
                    invitation={pendingInvitation}
                    currentUserUid={firebaseUser.uid}
                    onRevoked={() => {
                      setPendingInvitation(null)
                      setInvitationRefreshTrigger((t) => t + 1)
                    }}
                    onResent={() => setInvitationRefreshTrigger((t) => t + 1)}
                  />
                </div>
              )}

              {/* Invitation History (Story 3.5 AC5) */}
              <InvitationHistoryList
                familyId={family.id}
                refreshTrigger={invitationRefreshTrigger}
              />

              {/* Children Section */}
              <div style={{ marginTop: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#1f2937',
                      margin: 0,
                    }}
                  >
                    Children ({children.length})
                  </h3>
                  <a
                    href="/family/children/add"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '44px',
                      padding: '8px 16px',
                      backgroundColor: '#4F46E5',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: 500,
                      textDecoration: 'none',
                      borderRadius: '6px',
                    }}
                    className="add-child-link"
                    aria-label="Add a child to your family"
                  >
                    + Add Child
                  </a>
                </div>

                {children.length === 0 ? (
                  <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center' as const }}>
                    No children added yet. Add your first child to get started.
                  </p>
                ) : (
                  <div>
                    {children.map((child) => {
                      const age = calculateAge(child.birthdate)
                      const initial = child.name.charAt(0).toUpperCase()
                      const needsCustody = !hasCustodyDeclaration(child)
                      return (
                        <div key={child.id} className="child-item">
                          {child.photoURL ? (
                            <img
                              src={child.photoURL}
                              alt=""
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                marginRight: '12px',
                              }}
                            />
                          ) : (
                            <div className="child-avatar">{initial}</div>
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500, color: '#1f2937' }}>{child.name}</div>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                              {age} year{age !== 1 ? 's' : ''} old
                            </div>
                            <div style={{ marginTop: '4px' }}>
                              <CustodyStatusBadge custody={child.custody} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <a
                              href={`/family/children/${child.id}/edit`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: '44px',
                                minWidth: '44px',
                                padding: '8px 12px',
                                backgroundColor: '#ffffff',
                                color: '#374151',
                                fontSize: '12px',
                                fontWeight: 500,
                                textDecoration: 'none',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                              }}
                              className="edit-child-link"
                              aria-label={`Edit ${child.name}'s profile`}
                            >
                              Edit
                            </a>
                            <button
                              type="button"
                              onClick={() => setChildToRemove(child)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: '44px',
                                minWidth: '44px',
                                padding: '8px 12px',
                                backgroundColor: '#ffffff',
                                color: '#dc2626',
                                fontSize: '12px',
                                fontWeight: 500,
                                borderRadius: '6px',
                                border: '1px solid #fecaca',
                                cursor: 'pointer',
                              }}
                              className="remove-child-button"
                              aria-label={`Remove ${child.name} from family`}
                            >
                              Remove
                            </button>
                            {needsCustody && (
                              <a
                                href={`/family/children/${child.id}/custody`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minHeight: '44px',
                                  padding: '8px 12px',
                                  backgroundColor: '#dc2626',
                                  color: '#ffffff',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  textDecoration: 'none',
                                  borderRadius: '6px',
                                }}
                                className="declare-custody-link"
                                aria-label={`Declare custody for ${child.name}`}
                              >
                                Declare Custody
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Devices Section - Story 12.1, 12.4 */}
              <div style={{ marginTop: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#1f2937',
                      margin: 0,
                    }}
                  >
                    Devices
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddDeviceModal(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '44px',
                      padding: '8px 16px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: 500,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    className="add-device-button"
                    aria-label="Add a device to your family"
                  >
                    + Add Device
                  </button>
                </div>
                <DevicesList familyId={family.id} />
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center' as const, padding: '16px 0' }}>
              <p style={{ ...styles.infoValue, marginBottom: '16px' }}>
                You haven&apos;t created a family yet.
              </p>
              <a
                href="/family/create"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '44px',
                  padding: '12px 24px',
                  backgroundColor: '#4F46E5',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  borderRadius: '8px',
                }}
                className="create-family-link"
              >
                Create Family
              </a>
            </div>
          )}
        </div>

        {/* Account Card */}
        <div style={{ ...styles.card, marginTop: '24px' }}>
          <h2 style={styles.cardTitle}>Account Information</h2>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Email</span>
            <span style={styles.infoValue}>{email}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Name</span>
            <span style={styles.infoValue}>{displayName || 'Not set'}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>User ID</span>
            <span style={styles.infoValue}>{uid}</span>
          </div>
          {userProfile && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Member since</span>
              <span style={styles.infoValue}>{userProfile.createdAt.toLocaleDateString()}</span>
            </div>
          )}
          {/* Story 0.5.1: Safety contact link (buried in account section, neutral language) */}
          <div style={{ ...styles.infoRow, borderBottom: 'none' }}>
            <span style={styles.infoLabel}>Support</span>
            <span style={styles.infoValue}>
              <a href="/safety" className="get-help-link" aria-label="Contact support for help">
                Get Help
              </a>
            </span>
          </div>
        </div>
      </div>

      {/* Remove Child Modal */}
      {childToRemove && firebaseUser && (
        <RemoveChildModal
          child={childToRemove}
          isOpen={true}
          onClose={() => setChildToRemove(null)}
          onConfirm={async () => {
            await deleteChild(childToRemove.id, firebaseUser.uid)
            await refreshChildren()
            setChildToRemove(null)
          }}
        />
      )}

      {/* Dissolve Family Modal */}
      {family && firebaseUser && (
        <DissolveFamilyModal
          family={family}
          childrenCount={children.length}
          isOpen={showDissolveModal}
          onClose={() => setShowDissolveModal(false)}
          onConfirm={async () => {
            await deleteFamily(family.id, firebaseUser.uid)
            await refreshFamily()
            setShowDissolveModal(false)
          }}
        />
      )}

      {/* Invite Co-Parent Modal */}
      {family && firebaseUser && (
        <InviteCoParentModal
          family={family}
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          currentUserUid={firebaseUser.uid}
        />
      )}

      {/* Add Device Modal - Story 12.1 */}
      {family && firebaseUser && (
        <AddDeviceModal
          familyId={family.id}
          userId={firebaseUser.uid}
          isOpen={showAddDeviceModal}
          onClose={() => setShowAddDeviceModal(false)}
        />
      )}
    </main>
  )
}
