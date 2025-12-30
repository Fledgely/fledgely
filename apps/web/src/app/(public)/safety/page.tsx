'use client'

/**
 * Safety Contact Page - Public (No Auth Required)
 *
 * Story 0.5.1: Secure Safety Contact Channel - AC1, AC7
 *
 * A public page accessible without authentication where users
 * (potentially abuse victims) can contact Fledgely support.
 *
 * CRITICAL SAFETY DESIGN:
 * - Accessible from login page without signing in (AC1)
 * - Uses neutral page title and meta (AC7)
 * - No words like "abuse", "escape", "emergency" visible
 * - Calming, neutral visual design
 * - Subtle back navigation
 *
 * Requirements:
 * - AC1: Safety contact accessible from login screen
 * - AC7: Visual subtlety for safety
 */

import { SafetyContactForm } from '../../../components/safety'

const styles: Record<string, React.CSSProperties> = {
  main: {
    display: 'flex',
    minHeight: '100vh',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f1f5f9', // Soft, calming gray-blue
    color: '#1e293b',
    padding: '2rem',
  },
  container: {
    maxWidth: '520px',
    width: '100%',
  },
  header: {
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '8px',
    letterSpacing: '-0.02em',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    marginTop: '20px',
    color: '#64748b',
    fontSize: '0.875rem',
    textDecoration: 'none',
    borderRadius: '4px',
    padding: '0 8px',
  },
}

export default function SafetyPage() {
  const handleSuccess = () => {
    // Form shows its own success state
  }

  const handleCancel = () => {
    // Navigate back to login - using window.location for simplicity
    // since this is a public page that doesn't need auth context
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  return (
    <main id="main-content" style={styles.main} role="main" aria-label="Contact support page">
      <style>
        {`
          .back-link:focus {
            outline: 2px solid #4F46E5;
            outline-offset: 2px;
          }
          .back-link:hover {
            color: #334155;
          }
        `}
      </style>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logo}>Fledgely</div>
        </div>

        <SafetyContactForm onSuccess={handleSuccess} onCancel={handleCancel} showCancel={true} />

        <div style={{ textAlign: 'center' }}>
          <a href="/login" style={styles.backLink} className="back-link">
            &larr; Back to sign in
          </a>
        </div>
      </div>
    </main>
  )
}
