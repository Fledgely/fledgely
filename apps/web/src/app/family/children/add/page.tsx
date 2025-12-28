'use client'

/**
 * Add child page.
 *
 * Allows authenticated parents to add a child to their family.
 * Redirects to custody declaration after successful creation.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../contexts/AuthContext'
import { useFamily } from '../../../../contexts/FamilyContext'
import { addChild } from '../../../../services/childService'

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
  required: {
    color: '#dc2626',
    marginLeft: '4px',
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
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '24px',
    color: '#6b7280',
    fontSize: '14px',
    textDecoration: 'none',
    cursor: 'pointer',
    minHeight: '44px',
    padding: '8px 16px',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
  },
}

export default function AddChildPage() {
  const { firebaseUser, loading: authLoading } = useAuth()
  const { family, loading: familyLoading } = useFamily()
  const router = useRouter()
  const [name, setName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [photoURL, setPhotoURL] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loading = authLoading || familyLoading

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/login')
    }
  }, [firebaseUser, loading, router])

  // Redirect users without a family to family creation
  useEffect(() => {
    if (!loading && firebaseUser && !family) {
      router.push('/family/create')
    }
  }, [loading, firebaseUser, family, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firebaseUser || !family || adding) return

    // Validate required fields
    if (!name.trim()) {
      setError("Please enter the child's name.")
      return
    }
    if (!birthdate) {
      setError("Please enter the child's birthdate.")
      return
    }

    // Validate birthdate is not in the future
    const birthdateDate = new Date(birthdate)
    const today = new Date()
    if (birthdateDate > today) {
      setError('Birthdate cannot be in the future.')
      return
    }

    // Validate child is not older than 18 years (reasonable limit for this app)
    const minDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
    if (birthdateDate < minDate) {
      setError('Child must be under 18 years old.')
      return
    }

    // Validate photo URL format if provided
    if (photoURL.trim()) {
      try {
        new URL(photoURL.trim())
      } catch {
        setError('Please enter a valid photo URL (e.g., https://example.com/photo.jpg).')
        return
      }
    }

    setAdding(true)
    setError(null)

    try {
      const child = await addChild(
        family.id,
        firebaseUser.uid,
        name.trim(),
        birthdateDate,
        photoURL.trim() || null
      )
      // Redirect to custody declaration after creating child
      router.push(`/family/children/${child.id}/custody`)
    } catch (err) {
      console.error('Failed to add child:', err)
      setError('Unable to add child. Please try again.')
      setAdding(false)
    }
  }

  const handleBackClick = () => {
    router.push('/dashboard')
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

  // Don't render if not authenticated or no family
  if (!firebaseUser || !family) {
    return null
  }

  // Calculate date limits for birthdate input
  const todayDate = new Date()
  const today = todayDate.toISOString().split('T')[0]
  // Min date: 18 years ago (child must be under 18)
  const minBirthdate = new Date(
    todayDate.getFullYear() - 18,
    todayDate.getMonth(),
    todayDate.getDate()
  )
    .toISOString()
    .split('T')[0]

  return (
    <main id="main-content" style={styles.main} role="main" aria-label="Add child page">
      <style>
        {`
          .child-input:focus {
            border-color: #4F46E5;
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
          }
          .add-button:focus {
            outline: 2px solid #ffffff;
            outline-offset: 2px;
          }
          .add-button:hover:not(:disabled) {
            background-color: #4338CA;
          }
          .add-button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }
          .back-link:hover {
            background-color: #f3f4f6;
            color: #374151;
          }
          .back-link:focus {
            outline: 2px solid #4F46E5;
            outline-offset: 2px;
          }
        `}
      </style>
      <div style={styles.card}>
        <h1 style={styles.title}>Add a Child</h1>
        <p style={styles.subtitle}>
          Add a child to your family to start creating agreements and monitoring their device usage.
        </p>

        {error && (
          <div style={styles.error} role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <div style={styles.inputGroup}>
            <label htmlFor="childName" style={styles.label}>
              Child&apos;s Name
              <span style={styles.required} aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="childName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter child's name"
              style={styles.input}
              className="child-input"
              maxLength={100}
              disabled={adding}
              required
              aria-required="true"
              aria-describedby="childNameHint"
            />
            <span id="childNameHint" style={styles.hint}>
              This is how your child will appear in the app.
            </span>
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="birthdate" style={styles.label}>
              Birthdate
              <span style={styles.required} aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="birthdate"
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              style={styles.input}
              className="child-input"
              min={minBirthdate}
              max={today}
              disabled={adding}
              required
              aria-required="true"
              aria-describedby="birthdateHint"
            />
            <span id="birthdateHint" style={styles.hint}>
              Used to calculate age and age-appropriate settings.
            </span>
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="photoURL" style={styles.label}>
              Photo URL (Optional)
            </label>
            <input
              id="photoURL"
              type="url"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              style={styles.input}
              className="child-input"
              disabled={adding}
              aria-describedby="photoURLHint"
            />
            <span id="photoURLHint" style={styles.hint}>
              A profile picture for your child (optional).
            </span>
          </div>

          <button
            type="submit"
            style={styles.button}
            className="add-button"
            disabled={adding}
            aria-busy={adding}
          >
            {adding ? 'Adding Child...' : 'Add Child'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleBackClick}
          style={styles.backLink}
          className="back-link"
          aria-label="Go back to dashboard"
        >
          ← Back to Dashboard
        </button>
      </div>
    </main>
  )
}
