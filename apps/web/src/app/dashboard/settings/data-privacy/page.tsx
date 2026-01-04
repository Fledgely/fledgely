'use client'

/**
 * Data & Privacy Settings Page
 *
 * Story 51.1: Data Export Request - AC1
 *
 * Allows users to:
 * - Request and download GDPR data exports
 * - View data management options
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../contexts/AuthContext'
import { useFamilyContext } from '../../../../contexts/FamilyContext'
import { DataExportCard } from '../../../../components/settings/DataExportCard'

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
    maxWidth: '600px',
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
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#7c3aed',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  noFamilyCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
    textAlign: 'center' as const,
  },
  noFamilyText: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '16px',
  },
  infoSection: {
    marginTop: '24px',
    padding: '20px',
    backgroundColor: '#f3f4f6',
    borderRadius: '12px',
  },
  infoTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '12px',
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.8,
  },
}

export default function DataPrivacySettingsPage() {
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()
  const { family, loading: familyLoading } = useFamilyContext()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login')
    }
  }, [authLoading, firebaseUser, router])

  if (authLoading || familyLoading) {
    return (
      <main style={styles.main}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    )
  }

  if (!firebaseUser) {
    return null
  }

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            style={styles.backButton}
            onClick={() => router.push('/dashboard')}
            aria-label="Back to dashboard"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <span style={styles.title}>Data & Privacy</span>
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>Data & Privacy</h1>
          <p style={styles.pageDescription}>
            Manage your family&apos;s data and exercise your privacy rights under GDPR.
          </p>
        </div>

        {family?.id ? (
          <>
            <DataExportCard familyId={family.id} />

            <div style={styles.infoSection}>
              <div style={styles.infoTitle}>What&apos;s included in your export:</div>
              <ul style={styles.infoList}>
                <li>Family profile information</li>
                <li>Child profiles and settings</li>
                <li>Device information</li>
                <li>All captured screenshots</li>
                <li>Flagged content history</li>
                <li>Agreement records</li>
                <li>Activity audit logs</li>
              </ul>
            </div>
          </>
        ) : (
          <div style={styles.noFamilyCard}>
            <p style={styles.noFamilyText}>
              You need to be part of a family to export data. Please set up your family first.
            </p>
          </div>
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
