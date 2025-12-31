'use client'

/**
 * Emoji Rating Scale Component
 *
 * Story 27.5.2: Check-In Response Interface - AC1
 *
 * A simple three-option emoji scale for health check-in responses.
 * Supports both guardian and child-friendly versions.
 */

import type { CheckInRating } from '@fledgely/shared'

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
  },
  containerChild: {
    gap: '32px',
  },
  option: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid transparent',
    backgroundColor: '#f9fafb',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '100px',
  },
  optionChild: {
    minWidth: '120px',
    padding: '20px',
  },
  optionSelected: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  optionHover: {
    backgroundColor: '#f3f4f6',
  },
  emoji: {
    fontSize: '48px',
    lineHeight: 1,
  },
  emojiChild: {
    fontSize: '64px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    textAlign: 'center' as const,
  },
  labelChild: {
    fontSize: '16px',
  },
}

interface RatingOption {
  value: CheckInRating
  emoji: string
  label: string
  childLabel: string
}

const RATING_OPTIONS: RatingOption[] = [
  {
    value: 'positive',
    emoji: '😊',
    label: 'Things are going well',
    childLabel: 'Good!',
  },
  {
    value: 'neutral',
    emoji: '😐',
    label: "It's okay",
    childLabel: 'Okay',
  },
  {
    value: 'concerned',
    emoji: '😟',
    label: 'Things have been hard',
    childLabel: 'Hard',
  },
]

interface EmojiRatingScaleProps {
  value: CheckInRating | null
  onChange: (rating: CheckInRating) => void
  isChild?: boolean
}

export function EmojiRatingScale({ value, onChange, isChild = false }: EmojiRatingScaleProps) {
  return (
    <div style={{ ...styles.container, ...(isChild ? styles.containerChild : {}) }}>
      {RATING_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          style={{
            ...styles.option,
            ...(isChild ? styles.optionChild : {}),
            ...(value === option.value ? styles.optionSelected : {}),
          }}
          aria-pressed={value === option.value}
          aria-label={isChild ? option.childLabel : option.label}
        >
          <span
            style={{
              ...styles.emoji,
              ...(isChild ? styles.emojiChild : {}),
            }}
            role="img"
            aria-hidden="true"
          >
            {option.emoji}
          </span>
          <span
            style={{
              ...styles.label,
              ...(isChild ? styles.labelChild : {}),
            }}
          >
            {isChild ? option.childLabel : option.label}
          </span>
        </button>
      ))}
    </div>
  )
}

export { RATING_OPTIONS }
