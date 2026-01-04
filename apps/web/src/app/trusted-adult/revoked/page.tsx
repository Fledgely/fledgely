'use client'

/**
 * Trusted Adult Revoked Access Page - Story 52.5 Task 6
 *
 * Page shown when trusted adult's access has been revoked.
 *
 * AC6: Teen Revocation Visibility - clear message when access is revoked
 */

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    textAlign: 'center' as const,
    padding: '24px',
  },
  icon: {
    fontSize: '64px',
    marginBottom: '24px',
    opacity: 0.5,
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 16px 0',
  },
  message: {
    fontSize: '16px',
    color: '#6b7280',
    margin: '0 0 24px 0',
    maxWidth: '500px',
    lineHeight: 1.6,
  },
  infoBox: {
    padding: '16px 24px',
    backgroundColor: '#f3f4f6',
    borderRadius: '12px',
    maxWidth: '500px',
  },
  infoTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 8px 0',
  },
  infoText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.5,
  },
  helpLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '24px',
    padding: '12px 24px',
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    textDecoration: 'none',
    borderRadius: '8px',
    transition: 'background-color 0.2s ease',
  },
}

export default function TrustedAdultRevokedPage() {
  return (
    <div style={styles.container}>
      <div style={styles.icon} aria-hidden="true">
        &#x1F6AB;
      </div>

      <h1 style={styles.title}>Access Has Been Revoked</h1>

      <p style={styles.message}>
        Your access to view this child&apos;s data has been revoked. This may have been done by the
        teen or their parent.
      </p>

      <div style={styles.infoBox}>
        <p style={styles.infoTitle}>What does this mean?</p>
        <p style={styles.infoText}>
          You no longer have access to view any data for this child. If you believe this was done in
          error, please contact the family directly. Fledgely does not share specific reasons for
          access revocation to protect the teen&apos;s privacy.
        </p>
      </div>

      <a href="/" style={styles.helpLink}>
        Return to Home
      </a>
    </div>
  )
}
