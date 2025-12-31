'use client'

/**
 * Child Login Page - Story 19B.1
 *
 * Allows children to log in using family code + name selection.
 * Uses child-friendly language at 6th-grade reading level.
 *
 * Acceptance Criteria:
 * - AC1: Child authenticates using family code + their name
 * - AC5: All text is at 6th-grade reading level
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useChildAuth } from '../../../contexts/ChildAuthContext'
import { validateFamilyCode, type ChildForLogin } from '../../../services/familyCodeService'

/**
 * Styles using sky blue theme for child dashboard
 */
const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh',
    backgroundColor: '#f0f9ff', // sky-50
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '32px',
    marginTop: '24px',
  },
  logo: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#0369a1', // sky-700
    letterSpacing: '-0.02em',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    maxWidth: '400px',
    width: '100%',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#0c4a6e', // sky-900
    marginBottom: '8px',
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: '1rem',
    color: '#0369a1', // sky-700
    marginBottom: '24px',
    textAlign: 'center' as const,
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#0c4a6e', // sky-900
    marginBottom: '4px',
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '1.125rem',
    borderRadius: '8px',
    border: '2px solid #7dd3fc', // sky-300
    backgroundColor: '#ffffff',
    boxSizing: 'border-box' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.25em',
    textAlign: 'center' as const,
  },
  inputError: {
    borderColor: '#ef4444', // red-500
  },
  button: {
    padding: '14px 24px',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    minHeight: '48px',
  },
  primaryButton: {
    backgroundColor: '#0ea5e9', // sky-500
    color: '#ffffff',
  },
  primaryButtonDisabled: {
    backgroundColor: '#bae6fd', // sky-200
    color: '#7dd3fc', // sky-300
    cursor: 'not-allowed',
  },
  secondaryButton: {
    backgroundColor: '#e0f2fe', // sky-100
    color: '#0369a1', // sky-700
    marginTop: '8px',
  },
  error: {
    backgroundColor: '#fef2f2', // red-50
    color: '#dc2626', // red-600
    padding: '12px',
    borderRadius: '8px',
    fontSize: '0.875rem',
    textAlign: 'center' as const,
  },
  childList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginTop: '8px',
  },
  childButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid #7dd3fc', // sky-300
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left' as const,
  },
  childButtonSelected: {
    backgroundColor: '#e0f2fe', // sky-100
    borderColor: '#0ea5e9', // sky-500
  },
  childAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#bae6fd', // sky-200
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    color: '#0369a1', // sky-700
    fontWeight: 600,
    flexShrink: 0,
  },
  childName: {
    fontSize: '1.125rem',
    fontWeight: 500,
    color: '#0c4a6e', // sky-900
  },
  familyName: {
    fontSize: '1rem',
    color: '#0ea5e9', // sky-500
    fontWeight: 500,
    textAlign: 'center' as const,
    marginBottom: '16px',
    padding: '8px',
    backgroundColor: '#e0f2fe', // sky-100
    borderRadius: '8px',
  },
  helpText: {
    fontSize: '0.875rem',
    color: '#64748b', // slate-500
    textAlign: 'center' as const,
    marginTop: '16px',
    lineHeight: 1.5,
  },
  spinner: {
    display: 'inline-block',
    width: '20px',
    height: '20px',
    border: '3px solid #bae6fd',
    borderRadius: '50%',
    borderTopColor: '#0ea5e9',
    animation: 'spin 1s linear infinite',
  },
}

type LoginStep = 'code' | 'select-child'

export default function ChildLoginPage() {
  const router = useRouter()
  const { signInAsChild } = useChildAuth()

  const [step, setStep] = useState<LoginStep>('code')
  const [familyCode, setFamilyCode] = useState('')
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [familyName, setFamilyName] = useState<string | null>(null)
  const [children, setChildren] = useState<ChildForLogin[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  /**
   * Handle family code submission
   */
  const handleCodeSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setLoading(true)

      try {
        const result = await validateFamilyCode(familyCode)

        if (!result) {
          setError('That code does not match any family. Please check and try again.')
          setLoading(false)
          return
        }

        if (result.children.length === 0) {
          setError('No children are set up in this family yet. Ask a parent for help.')
          setLoading(false)
          return
        }

        setFamilyId(result.id)
        setFamilyName(result.name)
        setChildren(result.children)
        setStep('select-child')
      } catch {
        setError('Something went wrong. Please try again.')
      }

      setLoading(false)
    },
    [familyCode]
  )

  /**
   * Handle child selection and login
   */
  const handleChildSelect = useCallback((childId: string) => {
    setSelectedChildId(childId)
  }, [])

  /**
   * Complete login with selected child
   */
  const handleLogin = useCallback(() => {
    if (!familyId || !selectedChildId) return

    const selectedChild = children.find((c) => c.id === selectedChildId)
    if (!selectedChild) return

    signInAsChild(familyId, selectedChildId, selectedChild.name)
    router.push('/child/dashboard')
  }, [familyId, selectedChildId, children, signInAsChild, router])

  /**
   * Go back to code entry
   */
  const handleBack = useCallback(() => {
    setStep('code')
    setFamilyId(null)
    setFamilyName(null)
    setChildren([])
    setSelectedChildId(null)
    setError(null)
  }, [])

  return (
    <main style={styles.main} data-testid="child-login-page">
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .child-button:hover {
            background-color: #e0f2fe !important;
          }
          .child-button:focus {
            outline: 2px solid #0ea5e9;
            outline-offset: 2px;
          }
          .primary-button:hover:not(:disabled) {
            background-color: #0284c7 !important;
          }
          .secondary-button:hover {
            background-color: #bae6fd !important;
          }
        `}
      </style>

      <header style={styles.header}>
        <span style={styles.logo}>Fledgely</span>
      </header>

      <div style={styles.card}>
        {step === 'code' && (
          <>
            <h1 style={styles.title} data-testid="login-title">
              Hi there! 👋
            </h1>
            <p style={styles.subtitle}>
              Enter your family code to see your pictures. Ask a parent if you need help finding it.
            </p>

            <form onSubmit={handleCodeSubmit} style={styles.form}>
              <div>
                <label htmlFor="family-code" style={styles.label}>
                  Family Code
                </label>
                <input
                  id="family-code"
                  type="text"
                  value={familyCode}
                  onChange={(e) => setFamilyCode(e.target.value.slice(0, 6))}
                  placeholder="XXXXXX"
                  maxLength={6}
                  autoComplete="off"
                  autoCapitalize="characters"
                  style={{
                    ...styles.input,
                    ...(error ? styles.inputError : {}),
                  }}
                  data-testid="family-code-input"
                />
              </div>

              {error && (
                <div style={styles.error} role="alert" data-testid="error-message">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={familyCode.length !== 6 || loading}
                style={{
                  ...styles.button,
                  ...(familyCode.length === 6 && !loading
                    ? styles.primaryButton
                    : styles.primaryButtonDisabled),
                }}
                className="primary-button"
                data-testid="submit-code-button"
              >
                {loading ? <span style={styles.spinner} /> : 'Continue'}
              </button>
            </form>

            <p style={styles.helpText}>
              Your parent can find the family code in their Fledgely dashboard.
            </p>
          </>
        )}

        {step === 'select-child' && (
          <>
            <h1 style={styles.title} data-testid="select-child-title">
              Who are you?
            </h1>

            {familyName && (
              <div style={styles.familyName} data-testid="family-name">
                {familyName}
              </div>
            )}

            <p style={styles.subtitle}>Tap your name to continue.</p>

            <div style={styles.childList} data-testid="child-list">
              {children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => handleChildSelect(child.id)}
                  style={{
                    ...styles.childButton,
                    ...(selectedChildId === child.id ? styles.childButtonSelected : {}),
                  }}
                  className="child-button"
                  data-testid={`child-option-${child.id}`}
                >
                  <div style={styles.childAvatar}>{child.name.charAt(0).toUpperCase()}</div>
                  <span style={styles.childName}>{child.name}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleLogin}
              disabled={!selectedChildId}
              style={{
                ...styles.button,
                marginTop: '16px',
                ...(selectedChildId ? styles.primaryButton : styles.primaryButtonDisabled),
              }}
              className="primary-button"
              data-testid="login-button"
            >
              That&apos;s me!
            </button>

            <button
              type="button"
              onClick={handleBack}
              style={{
                ...styles.button,
                ...styles.secondaryButton,
              }}
              className="secondary-button"
              data-testid="back-button"
            >
              Go back
            </button>
          </>
        )}
      </div>
    </main>
  )
}
