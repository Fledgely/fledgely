'use client'

/**
 * Custody declaration page.
 *
 * Allows guardians to declare custody arrangement for a child.
 * Custody must be declared before monitoring can begin.
 */

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../../../contexts/AuthContext'
import { useFamily } from '../../../../../contexts/FamilyContext'
import { getChild, isChildGuardian } from '../../../../../services/childService'
import {
  declareCustody,
  updateCustody,
  hasCustodyDeclaration,
  getCustodyTypeLabel,
  getCustodyTypeDescription,
} from '../../../../../services/custodyService'
import type { ChildProfile, CustodyType } from '@fledgely/shared/contracts'

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
    maxWidth: '600px',
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
  childName: {
    color: '#4F46E5',
    fontWeight: 600,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    textAlign: 'left' as const,
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '44px',
  },
  radioLabelSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#f5f3ff',
  },
  radioInput: {
    marginTop: '4px',
    minWidth: '20px',
    minHeight: '20px',
    cursor: 'pointer',
  },
  radioContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  radioTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#1f2937',
  },
  radioDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.5,
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
  textarea: {
    minHeight: '100px',
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    resize: 'vertical' as const,
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
  sharedWarning: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#92400e',
    fontSize: '14px',
    textAlign: 'left' as const,
    marginTop: '8px',
  },
  existingCustody: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'left' as const,
    marginBottom: '24px',
  },
  existingCustodyTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#166534',
    marginBottom: '4px',
  },
  existingCustodyValue: {
    fontSize: '16px',
    color: '#1f2937',
  },
}

const custodyTypes: CustodyType[] = ['sole', 'shared', 'complex']

export default function CustodyDeclarationPage() {
  const { firebaseUser, loading: authLoading } = useAuth()
  const { family, loading: familyLoading, refreshChildren } = useFamily()
  const router = useRouter()
  const params = useParams()
  const childId = params?.childId as string | undefined

  const [child, setChild] = useState<ChildProfile | null>(null)
  const [loadingChild, setLoadingChild] = useState(true)
  const [selectedType, setSelectedType] = useState<CustodyType | null>(null)
  const [explanation, setExplanation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUpdate, setIsUpdate] = useState(false)

  const loading = authLoading || familyLoading

  // Load child data
  useEffect(() => {
    async function loadChild() {
      if (!childId) return
      try {
        setLoadingChild(true)
        const childData = await getChild(childId)
        if (childData) {
          setChild(childData)
          // Pre-fill if custody already exists
          if (hasCustodyDeclaration(childData)) {
            setIsUpdate(true)
            setSelectedType(childData.custody!.type)
            setExplanation(childData.custody!.explanation || '')
          }
        }
      } catch (err) {
        console.error('Failed to load child:', err)
        setError('Unable to load child profile.')
      } finally {
        setLoadingChild(false)
      }
    }
    loadChild()
  }, [childId])

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

  // Verify user is a guardian of this child
  useEffect(() => {
    if (!loading && !loadingChild && child && firebaseUser) {
      if (!isChildGuardian(child, firebaseUser.uid)) {
        setError('You are not authorized to manage custody for this child.')
      }
    }
  }, [loading, loadingChild, child, firebaseUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firebaseUser || !child || submitting) return

    // Validate selection
    if (!selectedType) {
      setError('Custody type is required. Please select Sole, Shared, or Complex custody above.')
      // Focus the first radio button
      const firstRadio = document.querySelector(
        'input[name="custodyType"]'
      ) as HTMLInputElement | null
      firstRadio?.focus()
      return
    }

    // Validate explanation for complex type
    if (selectedType === 'complex' && !explanation.trim()) {
      setError('Complex custody requires an explanation. Please describe your custody arrangement.')
      // Focus the textarea
      document.getElementById('explanation')?.focus()
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (isUpdate) {
        await updateCustody(child.id, firebaseUser.uid, selectedType, explanation || null)
      } else {
        await declareCustody(child.id, firebaseUser.uid, selectedType, explanation || null)
      }
      // Refresh children data
      await refreshChildren()
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      console.error('Failed to save custody:', err)
      setError('Unable to save custody arrangement. Please try again.')
      setSubmitting(false)
    }
  }

  const handleBackClick = () => {
    router.push('/dashboard')
  }

  // Show loading state
  if (loading || loadingChild) {
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

  // Show error if child not found
  if (!child) {
    return (
      <main id="main-content" style={styles.main} role="main">
        <div style={styles.card}>
          <h1 style={styles.title}>Child Not Found</h1>
          <p style={styles.subtitle}>The child you are looking for does not exist.</p>
          <button
            type="button"
            onClick={handleBackClick}
            style={styles.backLink}
            className="back-link"
          >
            ← Back to Dashboard
          </button>
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" style={styles.main} role="main" aria-label="Custody declaration page">
      <style>
        {`
          .custody-radio:focus-within {
            border-color: #4F46E5;
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
          }
          .custody-textarea:focus {
            border-color: #4F46E5;
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
          }
          .custody-button:focus {
            outline: 2px solid #ffffff;
            outline-offset: 2px;
          }
          .custody-button:hover:not(:disabled) {
            background-color: #4338CA;
          }
          .custody-button:disabled {
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
        <h1 style={styles.title}>
          {isUpdate ? 'Update Custody Arrangement' : 'Declare Custody Arrangement'}
        </h1>
        <p style={styles.subtitle}>
          {isUpdate ? (
            <>
              Update the custody arrangement for <span style={styles.childName}>{child.name}</span>.
            </>
          ) : (
            <>
              Declare the custody arrangement for <span style={styles.childName}>{child.name}</span>
              . This helps us apply appropriate safeguards for shared custody situations.
            </>
          )}
        </p>

        {error && (
          <div style={styles.error} role="alert" aria-live="polite">
            {error}
          </div>
        )}

        {isUpdate && child.custody && (
          <div style={styles.existingCustody}>
            <div style={styles.existingCustodyTitle}>Current Custody:</div>
            <div style={styles.existingCustodyValue}>
              {getCustodyTypeLabel(child.custody.type)}
              {child.custody.explanation && ` - ${child.custody.explanation}`}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#1f2937',
                marginBottom: '16px',
              }}
            >
              Custody Type
              <span style={styles.required} aria-hidden="true">
                *
              </span>
            </legend>
            <div style={styles.radioGroup} role="radiogroup" aria-required="true">
              {custodyTypes.map((type) => (
                <label
                  key={type}
                  style={{
                    ...styles.radioLabel,
                    ...(selectedType === type ? styles.radioLabelSelected : {}),
                  }}
                  className="custody-radio"
                >
                  <input
                    type="radio"
                    name="custodyType"
                    value={type}
                    checked={selectedType === type}
                    onChange={() => setSelectedType(type)}
                    style={styles.radioInput}
                    disabled={submitting}
                  />
                  <div style={styles.radioContent}>
                    <span style={styles.radioTitle}>{getCustodyTypeLabel(type)}</span>
                    <span style={styles.radioDescription}>{getCustodyTypeDescription(type)}</span>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          {selectedType === 'shared' && (
            <div style={styles.sharedWarning} role="status">
              <strong>Note:</strong> Shared custody is recorded. When monitoring features are added,
              additional safeguards will require approval from both parents.
            </div>
          )}

          {selectedType === 'complex' && (
            <div style={styles.inputGroup} role="region" aria-live="polite">
              <label htmlFor="explanation" style={styles.label}>
                Explanation
                <span style={styles.required} aria-hidden="true">
                  *
                </span>
              </label>
              <textarea
                id="explanation"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Describe your custody arrangement (e.g., blended family, grandparent custody, etc.)"
                style={styles.textarea}
                className="custody-textarea"
                maxLength={1000}
                disabled={submitting}
                required
                aria-required="true"
                aria-describedby="explanationHint"
              />
              <span id="explanationHint" style={styles.hint}>
                {explanation.length}/1000 characters
              </span>
            </div>
          )}

          <button
            type="submit"
            style={styles.button}
            className="custody-button"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? 'Saving...' : isUpdate ? 'Update Custody' : 'Declare Custody'}
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
