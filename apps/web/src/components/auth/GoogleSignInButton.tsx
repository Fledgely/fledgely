'use client'

/**
 * Google Sign-In button component.
 *
 * Meets accessibility requirements:
 * - 44x44px minimum touch target
 * - Proper aria attributes
 * - Loading state announcement
 * - Visible focus indicator
 */

import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

const styles = {
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    minWidth: '220px',
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  buttonHover: {
    backgroundColor: '#f9fafb',
    borderColor: '#d1d5db',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
  },
  buttonFocus: {
    outline: '2px solid #4F46E5',
    outlineOffset: '2px',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  googleIcon: {
    width: '20px',
    height: '20px',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #e5e7eb',
    borderTopColor: '#4F46E5',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
}

// Google "G" logo SVG
function GoogleIcon() {
  return (
    <svg style={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
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
  )
}

// Loading spinner
function Spinner() {
  return (
    <>
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={styles.spinner} aria-hidden="true" />
    </>
  )
}

interface GoogleSignInButtonProps {
  /** Called when sign-in attempt starts */
  onStart?: () => void
  /** Called on successful sign-in */
  onSuccess?: () => void
  /** Called on sign-in error */
  onError?: (error: Error) => void
}

export function GoogleSignInButton({ onStart, onSuccess, onError }: GoogleSignInButtonProps) {
  const { signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const handleClick = async () => {
    if (loading) return

    onStart?.()
    setLoading(true)
    try {
      await signInWithGoogle()
      onSuccess?.()
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Sign-in failed'))
    } finally {
      setLoading(false)
    }
  }

  const buttonStyle = {
    ...styles.button,
    ...(isHovered && !loading ? styles.buttonHover : {}),
    ...(isFocused ? styles.buttonFocus : {}),
    ...(loading ? styles.buttonDisabled : {}),
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      style={buttonStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      aria-label={loading ? 'Signing in with Google' : 'Sign in with Google'}
      aria-busy={loading}
    >
      {loading ? <Spinner /> : <GoogleIcon />}
      <span>{loading ? 'Signing in...' : 'Sign in with Google'}</span>
    </button>
  )
}
