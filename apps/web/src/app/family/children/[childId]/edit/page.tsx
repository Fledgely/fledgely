'use client'

/**
 * Edit child profile page.
 *
 * Allows parents to edit their child's profile information.
 * Validates guardian access and data before saving.
 */

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../../../contexts/AuthContext'
import { useFamily } from '../../../../../contexts/FamilyContext'
import { updateChild, calculateAge, isChildGuardian } from '../../../../../services/childService'
import type { ChildProfile } from '@fledgely/shared/contracts'
import { logDataViewNonBlocking } from '../../../../../services/dataViewAuditService'

const styles = {
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
  content: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '48px 24px',
  },
  pageTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '8px',
  },
  pageDescription: {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '32px',
    lineHeight: 1.6,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
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
    color: '#1f2937',
    backgroundColor: '#ffffff',
    transition: 'border-color 0.2s ease',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  errorMessage: {
    fontSize: '13px',
    color: '#dc2626',
    marginTop: '4px',
  },
  helpText: {
    fontSize: '13px',
    color: '#6b7280',
  },
  photoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    color: '#6b7280',
    fontWeight: 600,
  },
  photoInfo: {
    flex: 1,
  },
  comingSoonBadge: {
    display: 'inline-block',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    marginTop: '4px',
  },
  submitButton: {
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
    transition: 'background-color 0.2s ease',
    marginTop: '8px',
  },
  cancelButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '16px',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  successBanner: {
    backgroundColor: '#d1fae5',
    border: '1px solid #6ee7b7',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '24px',
    color: '#047857',
    fontSize: '14px',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '24px',
    color: '#dc2626',
    fontSize: '14px',
  },
}

/**
 * Format date for input[type="date"] value (YYYY-MM-DD).
 */
function formatDateForInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse YYYY-MM-DD string to Date in local timezone.
 * Avoids timezone issues with new Date() constructor.
 */
function parseDateFromInput(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day) // month is 0-indexed
}

export default function EditChildPage() {
  const params = useParams()
  const childId = params.childId as string
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()
  const { children, loading: familyLoading, refreshChildren } = useFamily()

  const [child, setChild] = useState<ChildProfile | null>(null)
  const [name, setName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; birthdate?: string }>({})

  const nameInputRef = useRef<HTMLInputElement>(null)
  const birthdateInputRef = useRef<HTMLInputElement>(null)

  const loading = authLoading || familyLoading

  // Find child in family context
  useEffect(() => {
    if (!loading && children.length > 0) {
      const foundChild = children.find((c) => c.id === childId)
      if (foundChild) {
        setChild(foundChild)
        setName(foundChild.name)
        setBirthdate(formatDateForInput(foundChild.birthdate))
      }
    }
  }, [loading, children, childId])

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/login')
    }
  }, [firebaseUser, loading, router])

  // Redirect if not a guardian of this child
  useEffect(() => {
    if (!loading && firebaseUser && child) {
      if (!isChildGuardian(child, firebaseUser.uid)) {
        router.push('/dashboard')
      }
    }
  }, [loading, firebaseUser, child, router])

  // Redirect if child not found (after loading)
  useEffect(() => {
    if (!loading && children.length > 0 && !child) {
      router.push('/dashboard')
    }
  }, [loading, children, child, router])

  // Log data view for audit trail (Story 3A.1 - AC3)
  useEffect(() => {
    if (child && firebaseUser?.uid) {
      logDataViewNonBlocking({
        viewerUid: firebaseUser.uid,
        childId: child.id,
        familyId: child.familyId,
        dataType: 'child_profile',
      })
    }
  }, [child, firebaseUser?.uid])

  const validateForm = (): boolean => {
    const errors: { name?: string; birthdate?: string } = {}

    // Validate name
    if (!name.trim()) {
      errors.name = 'Name is required'
    }

    // Validate birthdate
    if (!birthdate) {
      errors.birthdate = 'Birthdate is required'
    } else {
      const birthdateDate = parseDateFromInput(birthdate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (birthdateDate > today) {
        errors.birthdate = 'Birthdate cannot be in the future'
      } else {
        const age = calculateAge(birthdateDate)
        if (age < 0 || age > 25) {
          errors.birthdate = 'Age must be between 0 and 25 years'
        }
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      // Focus on first error field
      if (fieldErrors.name) {
        nameInputRef.current?.focus()
      } else if (fieldErrors.birthdate) {
        birthdateInputRef.current?.focus()
      }
      return
    }

    if (!child || !firebaseUser) return

    setSubmitting(true)

    try {
      const birthdateDate = parseDateFromInput(birthdate)
      await updateChild(childId, firebaseUser.uid, name, birthdateDate, child.photoURL)

      // Refresh children in context
      await refreshChildren()

      // Navigate back to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update child profile')
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push('/dashboard')
  }

  // Show loading state
  if (loading || !child) {
    return (
      <main id="main-content" style={styles.main} role="main">
        <div style={styles.content}>
          <p>Loading...</p>
        </div>
      </main>
    )
  }

  // Don't render if not authenticated
  if (!firebaseUser) {
    return null
  }

  const initial = name.charAt(0).toUpperCase() || child.name.charAt(0).toUpperCase()
  const currentAge = birthdate ? calculateAge(parseDateFromInput(birthdate)) : null

  return (
    <main id="main-content" style={styles.main} role="main" aria-label="Edit child profile">
      <style>
        {`
          .submit-button:focus {
            outline: 2px solid #ffffff;
            outline-offset: 2px;
          }
          .submit-button:hover:not(:disabled) {
            background-color: #4338CA;
          }
          .submit-button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }
          .cancel-button:focus {
            outline: 2px solid #4F46E5;
            outline-offset: 2px;
          }
          .cancel-button:hover:not(:disabled) {
            background-color: #f9fafb;
            border-color: #9ca3af;
          }
          .form-input:focus {
            outline: none;
            border-color: #4F46E5;
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
          }
        `}
      </style>
      <header style={styles.header}>
        <a href="/" style={styles.logo}>
          Fledgely
        </a>
      </header>

      <div style={styles.content}>
        <h1 style={styles.pageTitle}>Edit Child Profile</h1>
        <p style={styles.pageDescription}>Update {child.name}&apos;s profile information below.</p>

        {error && (
          <div style={styles.errorBanner} role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <div style={styles.card}>
          <form onSubmit={handleSubmit} style={styles.form} noValidate>
            {/* Photo Section */}
            <div style={styles.formGroup}>
              <span style={styles.label}>Profile Photo</span>
              <div style={styles.photoSection}>
                {child.photoURL ? (
                  <img
                    src={child.photoURL}
                    alt=""
                    style={{ ...styles.avatar, backgroundColor: 'transparent' }}
                  />
                ) : (
                  <div style={styles.avatar}>{initial}</div>
                )}
                <div style={styles.photoInfo}>
                  <p style={styles.helpText}>Photo upload is not yet available.</p>
                  <span style={styles.comingSoonBadge}>Coming Soon</span>
                </div>
              </div>
            </div>

            {/* Name Input */}
            <div style={styles.formGroup}>
              <label htmlFor="child-name" style={styles.label}>
                Name <span aria-hidden="true">*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                id="child-name"
                name="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (fieldErrors.name) {
                    setFieldErrors((prev) => ({ ...prev, name: undefined }))
                  }
                }}
                style={{
                  ...styles.input,
                  ...(fieldErrors.name ? styles.inputError : {}),
                }}
                className="form-input"
                required
                aria-required="true"
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? 'name-error' : undefined}
              />
              {fieldErrors.name && (
                <p id="name-error" style={styles.errorMessage} role="alert" aria-live="polite">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Birthdate Input */}
            <div style={styles.formGroup}>
              <label htmlFor="child-birthdate" style={styles.label}>
                Birthdate <span aria-hidden="true">*</span>
              </label>
              <input
                ref={birthdateInputRef}
                type="date"
                id="child-birthdate"
                name="birthdate"
                value={birthdate}
                onChange={(e) => {
                  setBirthdate(e.target.value)
                  if (fieldErrors.birthdate) {
                    setFieldErrors((prev) => ({ ...prev, birthdate: undefined }))
                  }
                }}
                style={{
                  ...styles.input,
                  ...(fieldErrors.birthdate ? styles.inputError : {}),
                }}
                className="form-input"
                required
                aria-required="true"
                aria-invalid={!!fieldErrors.birthdate}
                aria-describedby={fieldErrors.birthdate ? 'birthdate-error' : 'birthdate-help'}
                max={formatDateForInput(new Date())}
              />
              {fieldErrors.birthdate ? (
                <p id="birthdate-error" style={styles.errorMessage} role="alert" aria-live="polite">
                  {fieldErrors.birthdate}
                </p>
              ) : (
                <p id="birthdate-help" style={styles.helpText}>
                  {currentAge !== null
                    ? `Age: ${currentAge} year${currentAge !== 1 ? 's' : ''}`
                    : 'Enter birthdate to calculate age'}
                </p>
              )}
            </div>

            {/* Buttons */}
            <div style={styles.buttonGroup}>
              <button
                type="submit"
                disabled={submitting}
                style={styles.submitButton}
                className="submit-button"
                aria-busy={submitting}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                style={styles.cancelButton}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
