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
import { calculateAge } from '../../services/childService'

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
  const { family, children, loading: familyLoading } = useFamily()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

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
                <span style={styles.infoValue}>{family.guardians.length}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Created</span>
                <span style={styles.infoValue}>{family.createdAt.toLocaleDateString()}</span>
              </div>

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
                          <div>
                            <div style={{ fontWeight: 500, color: '#1f2937' }}>{child.name}</div>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                              {age} year{age !== 1 ? 's' : ''} old
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
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
            <div style={{ ...styles.infoRow, borderBottom: 'none' }}>
              <span style={styles.infoLabel}>Member since</span>
              <span style={styles.infoValue}>{userProfile.createdAt.toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
