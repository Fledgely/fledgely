'use client'

/**
 * Dashboard page - protected route.
 *
 * Shows user info and logout functionality.
 * Redirects unauthenticated users to login.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'

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
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Logout failed:', error)
      setLoggingOut(false)
    }
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <main style={styles.main}>
        <div style={styles.content}>
          <p>Loading...</p>
        </div>
      </main>
    )
  }

  // Don't render dashboard content if not authenticated
  if (!user) {
    return null
  }

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <a href="/" style={styles.logo}>
          Fledgely
        </a>
        <div style={styles.userInfo}>
          {user.photoURL ? (
            <img src={user.photoURL} alt="" style={styles.avatar} referrerPolicy="no-referrer" />
          ) : (
            <div style={styles.avatar} />
          )}
          <span style={styles.userName}>{user.displayName || 'User'}</span>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={styles.logoutButton}
            aria-label="Sign out"
          >
            {loggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </header>

      <div style={styles.content}>
        <h1 style={styles.welcome}>Welcome, {user.displayName?.split(' ')[0] || 'there'}!</h1>
        <p style={styles.description}>
          You&apos;re signed in to Fledgely. This is a placeholder dashboard that will be replaced
          with family management features in upcoming stories.
        </p>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Account Information</h2>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Email</span>
            <span style={styles.infoValue}>{user.email}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Name</span>
            <span style={styles.infoValue}>{user.displayName || 'Not set'}</span>
          </div>
          <div style={{ ...styles.infoRow, borderBottom: 'none' }}>
            <span style={styles.infoLabel}>User ID</span>
            <span style={styles.infoValue}>{user.uid}</span>
          </div>
        </div>
      </div>
    </main>
  )
}
