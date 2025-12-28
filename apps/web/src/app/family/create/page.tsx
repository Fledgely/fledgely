'use client'

/**
 * Family creation page.
 *
 * Allows authenticated users without a family to create one.
 * Redirects to dashboard after successful creation.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { createFamily } from '../../../services/familyService'

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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '48px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    maxWidth: '500px',
    width: '100%',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '8px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '32px',
    lineHeight: 1.6,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    textAlign: 'left' as const,
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    minHeight: '44px',
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },
  hint: {
    fontSize: '12px',
    color: '#6b7280',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#4F46E5',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#dc2626',
    fontSize: '14px',
    textAlign: 'left' as const,
  },
  loadingText: {
    color: '#1f2937',
  },
}

export default function CreateFamilyPage() {
  const { firebaseUser, userProfile, loading } = useAuth()
  const router = useRouter()
  const [familyName, setFamilyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/login')
    }
  }, [firebaseUser, loading, router])

  // Redirect users who already have a family to dashboard
  useEffect(() => {
    if (!loading && userProfile?.familyId) {
      router.push('/dashboard')
    }
  }, [loading, userProfile, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firebaseUser || creating) return

    setCreating(true)
    setError(null)

    try {
      await createFamily(firebaseUser, familyName || undefined)
      // Redirect to dashboard after successful creation
      router.push('/dashboard')
    } catch (err) {
      console.error('Failed to create family:', err)
      setError('Unable to create family. Please try again.')
      setCreating(false)
    }
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <main id="main-content" style={styles.main} role="main">
        <div style={styles.card}>
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </main>
    )
  }

  // Don't render if not authenticated or already has family
  if (!firebaseUser || userProfile?.familyId) {
    return null
  }

  const firstName =
    userProfile?.displayName?.split(' ')[0] || firebaseUser.displayName?.split(' ')[0] || 'there'

  return (
    <main id="main-content" style={styles.main} role="main" aria-label="Create family page">
      <style>
        {`
          .family-input:focus {
            border-color: #4F46E5;
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
          }
          .create-button:focus {
            outline: 2px solid #ffffff;
            outline-offset: 2px;
          }
          .create-button:hover:not(:disabled) {
            background-color: #4338CA;
          }
          .create-button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }
        `}
      </style>
      <div style={styles.card}>
        <h1 style={styles.title}>Create Your Family</h1>
        <p style={styles.subtitle}>
          Welcome, {firstName}! Let&apos;s set up your family so you can start adding children and
          creating agreements together.
        </p>

        {error && (
          <div style={styles.error} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="familyName" style={styles.label}>
              Family Name (Optional)
            </label>
            <input
              id="familyName"
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder={`${firstName}'s Family`}
              style={styles.input}
              className="family-input"
              maxLength={100}
              disabled={creating}
              aria-describedby="familyNameHint"
            />
            <span id="familyNameHint" style={styles.hint}>
              You can change this later in family settings.
            </span>
          </div>

          <button
            type="submit"
            style={styles.button}
            className="create-button"
            disabled={creating}
            aria-busy={creating}
          >
            {creating ? 'Creating Family...' : 'Create Family'}
          </button>
        </form>
      </div>
    </main>
  )
}
