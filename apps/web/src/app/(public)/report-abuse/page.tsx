'use client'

/**
 * Report Abuse Page - Public (No Auth Required)
 *
 * Story 51.5: Abuse Reporting - AC1, AC2, AC3, AC4
 *
 * A public page accessible without authentication where anyone
 * can report suspected misuse of Fledgely.
 *
 * Requirements:
 * - AC1: Public access (no auth required)
 * - AC2: Report categories with descriptions
 * - AC3: Anonymous option available
 * - AC4: Report acknowledgment with reference number
 */

import { AbuseReportForm } from '../../../components/abuse'

const styles: Record<string, React.CSSProperties> = {
  main: {
    display: 'flex',
    minHeight: '100vh',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f1f5f9',
    color: '#1e293b',
    padding: '2rem',
    paddingTop: '60px',
  },
  container: {
    maxWidth: '640px',
    width: '100%',
  },
  header: {
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#7c3aed',
    marginBottom: '8px',
    letterSpacing: '-0.02em',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    marginTop: '24px',
    color: '#64748b',
    fontSize: '0.875rem',
    textDecoration: 'none',
    borderRadius: '4px',
    padding: '0 8px',
  },
}

export default function ReportAbusePage() {
  const handleSuccess = () => {
    // Form shows its own success state
  }

  const handleCancel = () => {
    // Navigate back to home
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  return (
    <main id="main-content" style={styles.main} role="main" aria-label="Report abuse page">
      <style>
        {`
          .back-link:focus {
            outline: 2px solid #7c3aed;
            outline-offset: 2px;
          }
          .back-link:hover {
            color: #334155;
          }
        `}
      </style>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logo}>fledgely</div>
        </div>

        <AbuseReportForm onSuccess={handleSuccess} onCancel={handleCancel} showCancel={true} />

        <div style={{ textAlign: 'center' }}>
          <a href="/" style={styles.backLink} className="back-link">
            &larr; Back to home
          </a>
        </div>
      </div>
    </main>
  )
}
