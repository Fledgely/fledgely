const styles = {
  main: {
    display: 'flex',
    minHeight: '100vh',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    padding: '2rem',
    textAlign: 'center' as const,
  },
  logo: {
    fontSize: '4rem',
    fontWeight: 700,
    marginBottom: '1rem',
    letterSpacing: '-0.02em',
  },
  tagline: {
    fontSize: '1.5rem',
    fontWeight: 400,
    opacity: 0.9,
    marginBottom: '2rem',
    maxWidth: '600px',
    lineHeight: 1.5,
  },
  badge: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '2rem',
    fontSize: '1rem',
    fontWeight: 500,
    backdropFilter: 'blur(10px)',
  },
  footer: {
    position: 'absolute' as const,
    bottom: '2rem',
    fontSize: '0.875rem',
    opacity: 0.7,
  },
}

export default function Home() {
  return (
    <main style={styles.main} role="main" aria-label="Fledgely landing page">
      <h1 style={styles.logo}>Fledgely</h1>
      <p style={styles.tagline}>
        Building trust and safety in your family&apos;s digital life. Helping parents and children
        create healthy digital habits together.
      </p>
      <span style={styles.badge} role="status">
        Coming Soon
      </span>
      <footer style={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Fledgely. All rights reserved.</p>
      </footer>
    </main>
  )
}
