'use client'

/**
 * ChildAnnotationView Component - Story 23.2, 23.3
 *
 * Displays the annotation interface for children to explain flagged content.
 *
 * Story 23.2:
 * AC1: Screenshot with flag category display
 * AC2: Pre-set response options (NFR152)
 * AC3: Free-text explanation field
 * AC4: Submit annotation
 * AC5: Skip option
 *
 * Story 23.3:
 * AC4: Timer pause while typing
 * AC5: 15-minute extension request (once)
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  type FlagDocument,
  type AnnotationOption,
  ANNOTATION_OPTIONS,
  MAX_ANNOTATION_EXPLANATION_LENGTH,
} from '@fledgely/shared'

/** Idle timeout before considering typing stopped (5 seconds) */
const TYPING_IDLE_TIMEOUT_MS = 5000

/**
 * Props for ChildAnnotationView
 */
export interface ChildAnnotationViewProps {
  /** The flag being annotated */
  flag: FlagDocument
  /** Callback when annotation is submitted */
  onSubmit: (annotation: AnnotationOption, explanation?: string) => Promise<void>
  /** Callback when annotation is skipped */
  onSkip: () => Promise<void>
  /** Whether submission is in progress */
  submitting?: boolean
  /** Story 23.3 AC4: Callback when typing state changes (for timer pause) */
  onTypingChange?: (isTyping: boolean) => void
  /** Story 23.3 AC5: Callback for extension request */
  onRequestExtension?: () => Promise<void>
  /** Whether extension has been requested */
  extensionRequested?: boolean
  /** Whether extension request is in progress */
  requestingExtension?: boolean
  /** Remaining time in ms (for showing extension button) */
  remainingMs?: number
}

/**
 * Map flag categories to child-friendly descriptions
 */
const CHILD_FRIENDLY_CATEGORIES: Record<string, string> = {
  Violence: 'Something that looked like violence',
  SexualContent: 'Something that might not be for kids',
  Drugs: 'Something about substances',
  Bullying: 'Something that seemed unkind',
  Harassment: 'Something that seemed mean',
  HateSpeech: 'Something hurtful about people',
  SelfHarm: 'Something concerning about feelings',
  Gambling: 'Something about betting or gambling',
  IllegalActivity: 'Something that might not be allowed',
  AdultContent: 'Something for adults only',
}

/**
 * Get child-friendly category description
 */
function getChildFriendlyCategory(category: string): string {
  return CHILD_FRIENDLY_CATEGORIES[category] || 'Something that was flagged'
}

/**
 * Styles using amber color scheme from Story 23-1
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  categoryCard: {
    backgroundColor: '#ffffff',
    border: '2px solid #fcd34d',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center' as const,
  },
  categoryIcon: {
    fontSize: '3rem',
    marginBottom: '12px',
  },
  categoryTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#92400e',
    margin: 0,
  },
  categorySubtitle: {
    fontSize: '0.875rem',
    color: '#b45309',
    marginTop: '8px',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#92400e',
    marginBottom: '16px',
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  optionButton: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
    padding: '20px 16px',
    backgroundColor: '#fef3c7',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    minHeight: '80px',
  },
  optionButtonSelected: {
    backgroundColor: '#fcd34d',
    borderColor: '#f59e0b',
  },
  optionIcon: {
    fontSize: '1.75rem',
  },
  optionLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#78350f',
    textAlign: 'center' as const,
  },
  explanationLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#92400e',
    marginBottom: '8px',
    display: 'block',
  },
  explanationTextarea: {
    width: '100%',
    minHeight: '100px',
    padding: '12px',
    fontSize: '1rem',
    border: '2px solid #fcd34d',
    borderRadius: '8px',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  },
  charCount: {
    fontSize: '0.75rem',
    color: '#b45309',
    textAlign: 'right' as const,
    marginTop: '4px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  submitButton: {
    flex: 1,
    minWidth: '160px',
    padding: '16px 32px',
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  submitButtonDisabled: {
    backgroundColor: '#d4d4d4',
    cursor: 'not-allowed',
  },
  skipButton: {
    padding: '16px 24px',
    backgroundColor: 'transparent',
    color: '#92400e',
    border: '2px solid #fcd34d',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  helpText: {
    fontSize: '0.875rem',
    color: '#b45309',
    textAlign: 'center' as const,
    fontStyle: 'italic',
  },
  extensionRow: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '8px',
  },
  extensionButton: {
    padding: '10px 20px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    border: '2px solid #fcd34d',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  extensionButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  extensionGranted: {
    fontSize: '0.875rem',
    color: '#065f46',
    fontWeight: 500,
  },
}

/**
 * ChildAnnotationView - Annotation interface for flagged content
 *
 * Uses gentle, supportive language and child-friendly design.
 */
export function ChildAnnotationView({
  flag,
  onSubmit,
  onSkip,
  submitting = false,
  onTypingChange,
  onRequestExtension,
  extensionRequested = false,
  requestingExtension = false,
  remainingMs = 0,
}: ChildAnnotationViewProps) {
  const [selectedOption, setSelectedOption] = useState<AnnotationOption | null>(null)
  const [explanation, setExplanation] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  const handleOptionSelect = useCallback((option: AnnotationOption) => {
    setSelectedOption(option)
  }, [])

  /**
   * Story 23.3 AC4: Detect typing activity with debounce
   * When user types, mark as typing. After 5 seconds idle, mark as not typing.
   */
  const handleExplanationChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      if (value.length <= MAX_ANNOTATION_EXPLANATION_LENGTH) {
        setExplanation(value)
      }

      // Mark as typing
      if (!isTyping) {
        setIsTyping(true)
        onTypingChange?.(true)
      }

      // Reset idle timer
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // After 5 seconds of no typing, mark as not typing
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
        onTypingChange?.(false)
      }, TYPING_IDLE_TIMEOUT_MS)
    },
    [isTyping, onTypingChange]
  )

  /**
   * Story 23.3 AC5: Handle extension request
   */
  const handleRequestExtension = useCallback(async () => {
    if (extensionRequested || requestingExtension || !onRequestExtension) return
    await onRequestExtension()
  }, [extensionRequested, requestingExtension, onRequestExtension])

  // Show extension button when less than 10 minutes remain
  const showExtensionButton =
    !extensionRequested && remainingMs < 10 * 60 * 1000 && onRequestExtension

  const handleSubmit = useCallback(async () => {
    if (!selectedOption || submitting) return
    await onSubmit(selectedOption, explanation.trim() || undefined)
  }, [selectedOption, explanation, onSubmit, submitting])

  const handleSkip = useCallback(async () => {
    if (submitting) return
    await onSkip()
  }, [onSkip, submitting])

  const canSubmit = selectedOption !== null && !submitting

  return (
    <div style={styles.container} data-testid="child-annotation-view">
      {/* Category display - AC1 */}
      <div style={styles.categoryCard}>
        <div style={styles.categoryIcon}>🔍</div>
        <h2 style={styles.categoryTitle}>{getChildFriendlyCategory(flag.category)}</h2>
        <p style={styles.categorySubtitle}>
          We noticed something and wanted to give you a chance to explain
        </p>
      </div>

      {/* Pre-set options - AC2 */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>What happened? (Pick one)</h3>
        <div style={styles.optionsGrid}>
          {ANNOTATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleOptionSelect(option.value as AnnotationOption)}
              style={{
                ...styles.optionButton,
                ...(selectedOption === option.value ? styles.optionButtonSelected : {}),
              }}
              data-testid={`option-${option.value}`}
              aria-pressed={selectedOption === option.value}
            >
              <span style={styles.optionIcon}>{option.icon}</span>
              <span style={styles.optionLabel}>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Free-text explanation - AC3 */}
      <div style={styles.section}>
        <label style={styles.explanationLabel} htmlFor="explanation">
          Want to add more details? (Optional)
        </label>
        <textarea
          id="explanation"
          style={styles.explanationTextarea}
          value={explanation}
          onChange={handleExplanationChange}
          placeholder="Tell us more about what happened..."
          disabled={submitting}
          data-testid="explanation-input"
        />
        <div style={styles.charCount}>
          {explanation.length} / {MAX_ANNOTATION_EXPLANATION_LENGTH} characters
        </div>
      </div>

      {/* Help text */}
      <p style={styles.helpText}>
        Your explanation helps your parent understand what you were doing. There&apos;s no wrong
        answer - just be honest.
      </p>

      {/* Story 23.3 AC5: Extension request button */}
      {(showExtensionButton || extensionRequested) && (
        <div style={styles.extensionRow}>
          {showExtensionButton && (
            <button
              type="button"
              onClick={handleRequestExtension}
              style={{
                ...styles.extensionButton,
                ...(requestingExtension ? styles.extensionButtonDisabled : {}),
              }}
              disabled={requestingExtension || submitting}
              data-testid="extension-button"
            >
              {requestingExtension ? 'Requesting...' : 'Need more time? (+15 min)'}
            </button>
          )}
          {extensionRequested && (
            <span style={styles.extensionGranted} data-testid="extension-granted">
              ✓ Extension granted
            </span>
          )}
        </div>
      )}

      {/* Submit and Skip buttons - AC4, AC5 */}
      <div style={styles.footer}>
        <button
          type="button"
          onClick={handleSkip}
          style={styles.skipButton}
          disabled={submitting}
          data-testid="skip-button"
        >
          Skip for now
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          style={{
            ...styles.submitButton,
            ...(!canSubmit ? styles.submitButtonDisabled : {}),
          }}
          disabled={!canSubmit}
          data-testid="submit-button"
        >
          {submitting ? 'Sending...' : 'Send My Explanation'}
        </button>
      </div>
    </div>
  )
}

export default ChildAnnotationView
