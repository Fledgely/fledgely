'use client'

/**
 * Child profile view page.
 *
 * Allows children to view their own profile information for bilateral transparency.
 * Uses child-friendly language (6th-grade reading level).
 *
 * Note: This page requires child authentication which is not yet implemented.
 * For now, it displays a placeholder message. When child accounts are added,
 * this page will show the child's profile data.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { useFamily } from '../../../contexts/FamilyContext'
import { calculateAge } from '../../../services/childService'
import type { ChildProfile } from '@fledgely/shared/contracts'

const styles = {
  main: {
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f0f9ff',
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
  content: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  pageTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    marginBottom: '24px',
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#e0e7ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    color: '#4338ca',
    fontWeight: 600,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '4px',
  },
  age: {
    fontSize: '1rem',
    color: '#6b7280',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  infoLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginRight: '12px',
  },
  infoValue: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: 500,
  },
  guardianItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  guardianAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#dbeafe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    color: '#1d4ed8',
    marginRight: '12px',
  },
  guardianInfo: {
    flex: 1,
  },
  guardianName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
  },
  guardianRole: {
    fontSize: '12px',
    color: '#6b7280',
  },
  placeholder: {
    textAlign: 'center' as const,
    padding: '24px',
    color: '#6b7280',
    fontSize: '14px',
  },
  comingSoon: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 500,
    marginLeft: 'auto',
  },
  notAvailable: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    color: '#6b7280',
  },
  notAvailableTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '8px',
  },
  notAvailableText: {
    fontSize: '1rem',
    lineHeight: 1.6,
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#4F46E5',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '16px',
    textDecoration: 'none',
  },
}

/**
 * Get a child-friendly role label.
 */
function getChildFriendlyRole(role: string): string {
  switch (role) {
    case 'primary_guardian':
      return 'Your main grown-up'
    case 'guardian':
      return 'Another grown-up who helps'
    default:
      return 'Grown-up helper'
  }
}

/**
 * Check if the current user is linked as a child account.
 * For now, this always returns false since child accounts aren't implemented.
 */
function isChildAccount(_userUid: string, _children: ChildProfile[]): ChildProfile | null {
  // TODO: When child account linking is implemented, this will check if
  // the user's account is linked to a child profile.
  // For now, return null (no child account found)
  return null
}

export default function ChildProfilePage() {
  const { firebaseUser, loading: authLoading } = useAuth()
  const { children, loading: familyLoading } = useFamily()
  const router = useRouter()
  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null)

  const loading = authLoading || familyLoading

  // Check if user has a linked child account
  useEffect(() => {
    if (!loading && firebaseUser) {
      const linkedChild = isChildAccount(firebaseUser.uid, children)
      setChildProfile(linkedChild)
    }
  }, [loading, firebaseUser, children])

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/login')
    }
  }, [firebaseUser, loading, router])

  const handleGoBack = () => {
    router.push('/dashboard')
  }

  // Show loading state
  if (loading) {
    return (
      <main id="main-content" style={styles.main} role="main">
        <div style={styles.content}>
          <p>Loading...</p>
        </div>
      </main>
    )
  }

  // Don't render if not authenticated
  if (!firebaseUser) {
    return null
  }

  // If no child profile linked, show not available message
  if (!childProfile) {
    return (
      <main id="main-content" style={styles.main} role="main" aria-label="Child profile page">
        <style>
          {`
            .back-button:focus {
              outline: 2px solid #ffffff;
              outline-offset: 2px;
            }
            .back-button:hover {
              background-color: #4338CA;
            }
          `}
        </style>
        <header style={styles.header}>
          <a href="/" style={styles.logo}>
            Fledgely
          </a>
        </header>
        <div style={styles.content}>
          <div style={styles.card}>
            <div style={styles.notAvailable}>
              <h1 style={styles.notAvailableTitle}>Child Profile Not Available</h1>
              <p style={styles.notAvailableText}>
                This page is for kids to see their own information. To use this page, a grown-up
                needs to invite you to join the family first.
              </p>
              <p style={styles.notAvailableText}>Ask a parent or guardian for help!</p>
              <button
                type="button"
                onClick={handleGoBack}
                style={styles.backButton}
                className="back-button"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Child profile view (when child account is linked)
  const age = calculateAge(childProfile.birthdate)
  const initial = childProfile.name.charAt(0).toUpperCase()

  return (
    <main id="main-content" style={styles.main} role="main" aria-label="Your profile">
      <style>
        {`
          .back-button:focus {
            outline: 2px solid #ffffff;
            outline-offset: 2px;
          }
          .back-button:hover {
            background-color: #4338CA;
          }
        `}
      </style>
      <header style={styles.header}>
        <a href="/" style={styles.logo}>
          Fledgely
        </a>
      </header>
      <div style={styles.content}>
        <h1 style={styles.pageTitle}>About You</h1>

        {/* Profile Card */}
        <div style={styles.card}>
          <div style={styles.profileHeader}>
            {childProfile.photoURL ? (
              <img
                src={childProfile.photoURL}
                alt=""
                style={{ ...styles.avatar, backgroundColor: 'transparent' }}
              />
            ) : (
              <div style={styles.avatar}>{initial}</div>
            )}
            <div style={styles.profileInfo}>
              <div style={styles.name}>{childProfile.name}</div>
              <div style={styles.age}>
                {age} year{age !== 1 ? 's' : ''} old
              </div>
            </div>
          </div>
        </div>

        {/* Guardians Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Grown-ups Who Help Take Care of You</h2>
          {childProfile.guardians.length === 0 ? (
            <p style={styles.placeholder}>No grown-ups added yet.</p>
          ) : (
            childProfile.guardians.map((guardian, index) => (
              <div key={guardian.uid} style={styles.guardianItem}>
                <div style={styles.guardianAvatar}>{index + 1}</div>
                <div style={styles.guardianInfo}>
                  <div style={styles.guardianName}>Guardian {index + 1}</div>
                  <div style={styles.guardianRole}>{getChildFriendlyRole(guardian.role)}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Devices Card - Placeholder */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            Your Devices
            <span style={styles.comingSoon}>Coming Soon</span>
          </h2>
          <p style={styles.placeholder}>
            This is where you will see which devices are set up with Fledgely.
          </p>
        </div>

        {/* Agreements Card - Placeholder */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            Your Family Promises
            <span style={styles.comingSoon}>Coming Soon</span>
          </h2>
          <p style={styles.placeholder}>
            This is where you will see the agreements you have made with your family.
          </p>
        </div>
      </div>
    </main>
  )
}
