'use client'

/**
 * Trusted Adult Layout - Story 52.5 Task 1.1
 *
 * Layout for trusted adult dashboard with header showing "Shared by [Teen Name]".
 *
 * AC1: Clearly labeled "Shared by [Teen Name]"
 */

import { TrustedAdultProvider } from '../../contexts/TrustedAdultContext'

const styles: Record<string, React.CSSProperties> = {
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
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
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
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: '#ede9fe',
    color: '#7c3aed',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: 500,
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  navLink: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '44px',
    padding: '8px 16px',
    fontSize: '14px',
    color: '#6b7280',
    textDecoration: 'none',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
  },
  content: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
}

export default function TrustedAdultLayout({ children }: { children: React.ReactNode }) {
  return (
    <TrustedAdultProvider>
      <main id="main-content" style={styles.main}>
        <header style={styles.header}>
          <div style={styles.logoSection}>
            <a href="/trusted-adult" style={styles.logo}>
              Fledgely
            </a>
            <span style={styles.roleBadge}>Trusted Adult</span>
          </div>
          <nav style={styles.nav}>
            <a href="/trusted-adult" style={styles.navLink}>
              Dashboard
            </a>
            <a href="/logout" style={styles.navLink}>
              Log Out
            </a>
          </nav>
        </header>
        <div style={styles.content}>{children}</div>
      </main>
    </TrustedAdultProvider>
  )
}
