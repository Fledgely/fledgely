'use client'

/**
 * Privacy Dashboard Page
 *
 * Story 51.7: Privacy Dashboard - All ACs
 *
 * Provides transparency about data collection, storage, and privacy controls.
 *
 * Requirements:
 * - AC1: What data is collected
 * - AC2: Where data is stored
 * - AC3: Who has access
 * - AC4: Data retention periods
 * - AC5: Legal document links
 * - AC6: Privacy controls
 * - AC7: Session history
 */

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { usePrivacyDashboard } from '../../hooks/usePrivacyDashboard'
import {
  PRIVACY_LINKS,
  type GetPrivacyInfoResponse,
  type GetSessionHistoryResponse,
  type DataCategoryValue,
  type SessionInfo,
  type FamilyAccessInfo,
} from '@fledgely/shared'

export default function PrivacyDashboardPage() {
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()
  const { getPrivacyInfo, getSessionHistory, updatePreferences, loading, error, clearError } =
    usePrivacyDashboard()

  const [privacyInfo, setPrivacyInfo] = useState<GetPrivacyInfoResponse | null>(null)
  const [sessionHistory, setSessionHistory] = useState<GetSessionHistoryResponse | null>(null)
  const [activeSection, setActiveSection] = useState<string>('data')
  const [savingPref, setSavingPref] = useState<string | null>(null)

  /**
   * Load privacy info.
   */
  const loadPrivacyInfo = useCallback(async () => {
    const info = await getPrivacyInfo()
    if (info) {
      setPrivacyInfo(info)
    }
  }, [getPrivacyInfo])

  /**
   * Load session history.
   */
  const loadSessionHistory = useCallback(async () => {
    const history = await getSessionHistory()
    if (history) {
      setSessionHistory(history)
    }
  }, [getSessionHistory])

  /**
   * Toggle a preference.
   */
  const togglePreference = async (
    key: 'marketingEmails' | 'analyticsEnabled' | 'crashReportingEnabled'
  ) => {
    if (!privacyInfo) return

    setSavingPref(key)
    const newValue = !privacyInfo.preferences[key]

    const success = await updatePreferences({ [key]: newValue })

    if (success) {
      setPrivacyInfo({
        ...privacyInfo,
        preferences: {
          ...privacyInfo.preferences,
          [key]: newValue,
          updatedAt: Date.now(),
        },
      })
    }

    setSavingPref(null)
  }

  // Load data on mount
  useEffect(() => {
    if (firebaseUser && !authLoading) {
      loadPrivacyInfo()
      loadSessionHistory()
    }
  }, [firebaseUser, authLoading, loadPrivacyInfo, loadSessionHistory])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login')
    }
  }, [authLoading, firebaseUser, router])

  // Handle loading states
  if (authLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Privacy Dashboard</h1>
        <p style={styles.subtitle}>
          Understand how your data is collected, stored, and used. You have full control over your
          privacy.
        </p>
      </header>

      {/* Error display */}
      {error && (
        <div style={styles.error} role="alert">
          {error}
          <button type="button" onClick={clearError} style={styles.errorDismiss}>
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation tabs */}
      <div style={styles.tabContainer}>
        {['data', 'storage', 'access', 'controls', 'sessions'].map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            style={{
              ...styles.tab,
              ...(activeSection === section ? styles.tabActive : {}),
            }}
          >
            {section === 'data' && 'Data Collected'}
            {section === 'storage' && 'Storage & Retention'}
            {section === 'access' && 'Who Has Access'}
            {section === 'controls' && 'Privacy Controls'}
            {section === 'sessions' && 'Login History'}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && !privacyInfo && <div style={styles.loading}>Loading privacy information...</div>}

      {/* Content sections */}
      {privacyInfo && (
        <>
          {/* Data Collection Section (AC1) */}
          {activeSection === 'data' && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Data We Collect</h2>
              <p style={styles.sectionDescription}>
                We collect only the data necessary to provide Fledgely&apos;s family safety
                features.
              </p>

              <div style={styles.cardGrid}>
                {privacyInfo.dataCategories.map((cat) => (
                  <DataCategoryCard key={cat.category} category={cat} />
                ))}
              </div>
            </section>
          )}

          {/* Storage & Retention Section (AC2, AC4) */}
          {activeSection === 'storage' && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Data Storage & Retention</h2>

              {/* Storage Location */}
              <div style={styles.infoCard}>
                <h3 style={styles.cardTitle}>Where Your Data Is Stored</h3>
                <div style={styles.storageInfo}>
                  <div style={styles.storageIcon}>&#127760;</div>
                  <div>
                    <p style={styles.storageName}>{privacyInfo.storageRegion.name}</p>
                    <p style={styles.storageLocation}>{privacyInfo.storageRegion.location}</p>
                  </div>
                </div>
                <p style={styles.storageNote}>
                  Your data is stored in secure Google Cloud data centers with enterprise-grade
                  encryption at rest and in transit.
                </p>
              </div>

              {/* Retention Periods */}
              <div style={styles.infoCard}>
                <h3 style={styles.cardTitle}>How Long We Keep Your Data</h3>
                <div style={styles.retentionList}>
                  {privacyInfo.dataCategories.map((cat) => (
                    <div key={cat.category} style={styles.retentionItem}>
                      <span style={styles.retentionLabel}>{cat.label}</span>
                      <span style={styles.retentionValue}>{cat.retentionDescription}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Access Section (AC3) */}
          {activeSection === 'access' && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Who Has Access to Your Data</h2>
              <p style={styles.sectionDescription}>
                Only authorized family members and Fledgely support (when you contact us) can access
                your data.
              </p>

              <div style={styles.accessList}>
                {privacyInfo.familyAccess.map((member) => (
                  <AccessMemberCard key={member.uid} member={member} />
                ))}
              </div>

              <div style={styles.securityNote}>
                <strong>Security Note:</strong> We never share your data with third parties for
                advertising or marketing purposes. Your screenshots are encrypted and only visible
                to authorized family members.
              </div>
            </section>
          )}

          {/* Privacy Controls Section (AC5, AC6) */}
          {activeSection === 'controls' && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Privacy Controls</h2>

              {/* Preferences */}
              <div style={styles.infoCard}>
                <h3 style={styles.cardTitle}>Communication Preferences</h3>

                <div style={styles.toggleRow}>
                  <div style={styles.toggleInfo}>
                    <span style={styles.toggleLabel}>Marketing Emails</span>
                    <span style={styles.toggleDescription}>
                      Receive occasional updates about new features and tips
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePreference('marketingEmails')}
                    disabled={savingPref === 'marketingEmails'}
                    style={{
                      ...styles.toggle,
                      ...(privacyInfo.preferences.marketingEmails
                        ? styles.toggleOn
                        : styles.toggleOff),
                    }}
                    aria-pressed={privacyInfo.preferences.marketingEmails}
                  >
                    {privacyInfo.preferences.marketingEmails ? 'On' : 'Off'}
                  </button>
                </div>

                <div style={styles.toggleRow}>
                  <div style={styles.toggleInfo}>
                    <span style={styles.toggleLabel}>Analytics</span>
                    <span style={styles.toggleDescription}>
                      Help us improve Fledgely with anonymous usage data
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePreference('analyticsEnabled')}
                    disabled={savingPref === 'analyticsEnabled'}
                    style={{
                      ...styles.toggle,
                      ...(privacyInfo.preferences.analyticsEnabled
                        ? styles.toggleOn
                        : styles.toggleOff),
                    }}
                    aria-pressed={privacyInfo.preferences.analyticsEnabled}
                  >
                    {privacyInfo.preferences.analyticsEnabled ? 'On' : 'Off'}
                  </button>
                </div>

                <div style={styles.toggleRow}>
                  <div style={styles.toggleInfo}>
                    <span style={styles.toggleLabel}>Crash Reporting</span>
                    <span style={styles.toggleDescription}>
                      Send crash reports to help us fix issues faster
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePreference('crashReportingEnabled')}
                    disabled={savingPref === 'crashReportingEnabled'}
                    style={{
                      ...styles.toggle,
                      ...(privacyInfo.preferences.crashReportingEnabled
                        ? styles.toggleOn
                        : styles.toggleOff),
                    }}
                    aria-pressed={privacyInfo.preferences.crashReportingEnabled}
                  >
                    {privacyInfo.preferences.crashReportingEnabled ? 'On' : 'Off'}
                  </button>
                </div>
              </div>

              {/* Legal Links (AC5) */}
              <div style={styles.infoCard}>
                <h3 style={styles.cardTitle}>Legal Documents</h3>
                <div style={styles.linkList}>
                  <a href={PRIVACY_LINKS.PRIVACY_POLICY} style={styles.docLink}>
                    Privacy Policy
                  </a>
                  <a href={PRIVACY_LINKS.TERMS_OF_SERVICE} style={styles.docLink}>
                    Terms of Service
                  </a>
                  <a href={PRIVACY_LINKS.COOKIE_POLICY} style={styles.docLink}>
                    Cookie Policy
                  </a>
                  <a href={PRIVACY_LINKS.DATA_PROCESSING} style={styles.docLink}>
                    Data Processing Agreement
                  </a>
                </div>
              </div>

              {/* Account Info */}
              <div style={styles.infoCard}>
                <h3 style={styles.cardTitle}>Account Information</h3>
                <div style={styles.accountInfo}>
                  <p>
                    <strong>Account Created:</strong>{' '}
                    {new Date(privacyInfo.accountCreated).toLocaleDateString()}
                  </p>
                  {privacyInfo.lastPasswordChange && (
                    <p>
                      <strong>Last Password Change:</strong>{' '}
                      {new Date(privacyInfo.lastPasswordChange).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Session History Section (AC7) */}
          {activeSection === 'sessions' && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Login History</h2>
              <p style={styles.sectionDescription}>
                Recent login sessions on your account. If you see unfamiliar activity, change your
                password immediately.
              </p>

              {sessionHistory ? (
                <div style={styles.sessionList}>
                  {sessionHistory.sessions.map((session) => (
                    <SessionCard key={session.sessionId} session={session} />
                  ))}
                </div>
              ) : (
                <div style={styles.loading}>Loading session history...</div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Data Category Card Component.
 */
function DataCategoryCard({
  category,
}: {
  category: {
    category: DataCategoryValue
    label: string
    description: string
    examples: string[]
    retentionPeriod: string
    retentionDescription: string
  }
}) {
  return (
    <div style={styles.dataCard}>
      <h3 style={styles.dataCardTitle}>{category.label}</h3>
      <p style={styles.dataCardDescription}>{category.description}</p>
      <div style={styles.exampleList}>
        {category.examples.map((example, idx) => (
          <span key={idx} style={styles.exampleTag}>
            {example}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Access Member Card Component.
 */
function AccessMemberCard({ member }: { member: FamilyAccessInfo }) {
  const roleLabels: Record<string, string> = {
    owner: 'Family Owner',
    parent: 'Parent',
    child: 'Child',
    support: 'Support Team',
  }

  return (
    <div style={styles.accessCard}>
      <div style={styles.accessHeader}>
        <span style={styles.accessName}>{member.name}</span>
        <span style={styles.accessRole}>
          {roleLabels[member.accessLevel] || member.accessLevel}
        </span>
      </div>
      <div style={styles.accessData}>
        <span style={styles.accessDataLabel}>Can access:</span>
        <ul style={styles.accessDataList}>
          {member.dataAccess.map((access, idx) => (
            <li key={idx}>{access}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * Session Card Component.
 */
function SessionCard({ session }: { session: SessionInfo }) {
  const deviceIcons: Record<string, string> = {
    web: '&#128187;',
    ios: '&#128241;',
    android: '&#128241;',
    extension: '&#128421;',
  }

  return (
    <div
      style={{
        ...styles.sessionCard,
        ...(session.isCurrent ? styles.sessionCardCurrent : {}),
      }}
    >
      <div style={styles.sessionHeader}>
        <span
          style={styles.sessionDevice}
          dangerouslySetInnerHTML={{ __html: deviceIcons[session.deviceType] || '&#128187;' }}
        />
        <div style={styles.sessionInfo}>
          <span style={styles.sessionClient}>{session.clientName}</span>
          {session.isCurrent && <span style={styles.currentBadge}>Current Session</span>}
        </div>
      </div>
      <div style={styles.sessionMeta}>
        <span>IP: {session.ipAddress}</span>
        {session.location && <span>{session.location}</span>}
        <span>Login: {new Date(session.loginAt).toLocaleString()}</span>
        <span>Last active: {new Date(session.lastActiveAt).toLocaleString()}</span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: '12px 0 0',
    lineHeight: 1.6,
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '12px',
  },
  tab: {
    padding: '10px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#6b7280',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    backgroundColor: '#7c3aed',
    color: '#ffffff',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 8px',
  },
  sectionDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 20px',
    lineHeight: 1.5,
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  dataCard: {
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  dataCardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 8px',
  },
  dataCardDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 12px',
    lineHeight: 1.5,
  },
  exampleList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  exampleTag: {
    fontSize: '12px',
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  infoCard: {
    padding: '20px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 16px',
  },
  storageInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '12px',
  },
  storageIcon: {
    fontSize: '32px',
  },
  storageName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  storageLocation: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '2px 0 0',
  },
  storageNote: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.5,
  },
  retentionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  retentionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  retentionLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  retentionValue: {
    fontSize: '13px',
    color: '#6b7280',
    textAlign: 'right',
  },
  accessList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  },
  accessCard: {
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  accessHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  accessName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#111827',
  },
  accessRole: {
    fontSize: '12px',
    backgroundColor: '#f3e8ff',
    color: '#7c3aed',
    padding: '4px 10px',
    borderRadius: '12px',
    fontWeight: 500,
  },
  accessData: {},
  accessDataLabel: {
    fontSize: '13px',
    color: '#6b7280',
    display: 'block',
    marginBottom: '6px',
  },
  accessDataList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '14px',
    color: '#374151',
    lineHeight: 1.6,
  },
  securityNote: {
    padding: '16px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1e40af',
    lineHeight: 1.5,
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    display: 'block',
    fontSize: '15px',
    fontWeight: 500,
    color: '#111827',
    marginBottom: '4px',
  },
  toggleDescription: {
    display: 'block',
    fontSize: '13px',
    color: '#6b7280',
  },
  toggle: {
    padding: '8px 20px',
    fontSize: '13px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '60px',
  },
  toggleOn: {
    backgroundColor: '#7c3aed',
    color: '#ffffff',
  },
  toggleOff: {
    backgroundColor: '#e5e7eb',
    color: '#6b7280',
  },
  linkList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  docLink: {
    fontSize: '15px',
    color: '#7c3aed',
    textDecoration: 'none',
    padding: '12px 16px',
    backgroundColor: '#faf5ff',
    borderRadius: '6px',
    display: 'block',
  },
  accountInfo: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: 1.8,
  },
  sessionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sessionCard: {
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  sessionCardCurrent: {
    borderColor: '#7c3aed',
    backgroundColor: '#faf5ff',
  },
  sessionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  sessionDevice: {
    fontSize: '24px',
  },
  sessionInfo: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sessionClient: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#111827',
  },
  currentBadge: {
    fontSize: '11px',
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    padding: '2px 8px',
    borderRadius: '10px',
    fontWeight: 500,
  },
  sessionMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    fontSize: '13px',
    color: '#6b7280',
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorDismiss: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: '12px',
    textDecoration: 'underline',
  },
}
