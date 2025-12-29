'use client'

/**
 * Re-authentication Modal - Story 13.2
 *
 * Requires users to re-authenticate before viewing sensitive data like
 * emergency unlock codes. Supports both password and Google providers.
 *
 * Requirements:
 * - AC1: Re-authentication before showing emergency code
 * - Task 2.1: Firebase reauthentication
 * - Task 2.2: Password provider support
 * - Task 2.3: Google provider support
 * - Task 2.4: Error handling
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  reauthenticateWithPopup,
  User as FirebaseUser,
} from 'firebase/auth'
import { getGoogleProvider } from '../../lib/firebase'

interface ReauthModalProps {
  /** Current Firebase user */
  user: FirebaseUser
  /** Whether modal is open */
  isOpen: boolean
  /** Called when modal is closed without re-auth */
  onClose: () => void
  /** Called when re-authentication succeeds */
  onSuccess: () => void
  /** Title to show in modal */
  title?: string
  /** Description text */
  description?: string
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  icon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#fef3c7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  description: {
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: '1.5',
    marginBottom: '20px',
  },
  inputGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  error: {
    color: '#dc2626',
    fontSize: '14px',
    marginTop: '12px',
    padding: '8px 12px',
    backgroundColor: '#fef2f2',
    borderRadius: '6px',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginTop: '20px',
  },
  button: {
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '8px',
    cursor: 'pointer',
    border: 'none',
    transition: 'background-color 0.15s',
  },
  primaryButton: {
    backgroundColor: '#7c3aed',
    color: '#ffffff',
  },
  googleButton: {
    backgroundColor: '#ffffff',
    color: '#374151',
    border: '1px solid #d1d5db',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    color: '#6b7280',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '16px 0',
    color: '#9ca3af',
    fontSize: '12px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e5e7eb',
  },
  disabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
}

export function ReauthModal({
  user,
  isOpen,
  onClose,
  onSuccess,
  title = 'Confirm Your Identity',
  description = 'For security, please confirm your identity before continuing.',
}: ReauthModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  // Determine auth provider
  const isPasswordProvider = user.providerData.some((p) => p.providerId === 'password')
  const isGoogleProvider = user.providerData.some((p) => p.providerId === 'google.com')

  // Focus password input when modal opens
  useEffect(() => {
    if (isOpen && isPasswordProvider && passwordInputRef.current) {
      passwordInputRef.current.focus()
    }
  }, [isOpen, isPasswordProvider])

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Trap focus within modal
  useEffect(() => {
    if (!isOpen) return

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements?.[0] as HTMLElement
    const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    window.addEventListener('keydown', handleTab)
    return () => window.removeEventListener('keydown', handleTab)
  }, [isOpen])

  const handlePasswordReauth = useCallback(async () => {
    if (!password.trim()) {
      setError('Please enter your password')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (!user.email) {
        throw new Error('No email associated with this account')
      }

      const credential = EmailAuthProvider.credential(user.email, password)
      await reauthenticateWithCredential(user, credential)
      setPassword('')
      onSuccess()
    } catch (err) {
      const firebaseError = err as { code?: string; message?: string }
      if (firebaseError.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.')
      } else if (firebaseError.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.')
      } else {
        setError('Re-authentication failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [password, user, onSuccess])

  const handleGoogleReauth = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const provider = getGoogleProvider()
      await reauthenticateWithPopup(user, provider)
      onSuccess()
    } catch (err) {
      const firebaseError = err as { code?: string; message?: string }
      if (firebaseError.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.')
      } else if (firebaseError.code === 'auth/user-mismatch') {
        setError('Please sign in with the same Google account.')
      } else {
        setError('Re-authentication failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [user, onSuccess])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isPasswordProvider && !loading) {
      handlePasswordReauth()
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reauth-title"
    >
      <div ref={modalRef} style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.icon}>🔐</div>
          <h2 id="reauth-title" style={styles.title}>
            {title}
          </h2>
        </div>

        <p style={styles.description}>{description}</p>

        {isPasswordProvider && (
          <div style={styles.inputGroup}>
            <label htmlFor="reauth-password" style={styles.label}>
              Password
            </label>
            <input
              ref={passwordInputRef}
              id="reauth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                ...styles.input,
                ...(error ? styles.inputError : {}),
              }}
              placeholder="Enter your password"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
        )}

        {error && (
          <div style={styles.error} role="alert">
            {error}
          </div>
        )}

        <div style={styles.buttonGroup}>
          {isPasswordProvider && (
            <button
              onClick={handlePasswordReauth}
              style={{
                ...styles.button,
                ...styles.primaryButton,
                ...(loading ? styles.disabled : {}),
              }}
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Confirm Password'}
            </button>
          )}

          {isPasswordProvider && isGoogleProvider && (
            <div style={styles.divider}>
              <div style={styles.dividerLine} />
              <span>or</span>
              <div style={styles.dividerLine} />
            </div>
          )}

          {isGoogleProvider && (
            <button
              onClick={handleGoogleReauth}
              style={{
                ...styles.button,
                ...styles.googleButton,
                ...(loading ? styles.disabled : {}),
              }}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {loading ? 'Verifying...' : 'Continue with Google'}
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              ...styles.button,
              ...styles.cancelButton,
            }}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
