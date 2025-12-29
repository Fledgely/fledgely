/**
 * Signature Confirmation Component.
 *
 * Story 6.1: Child Digital Signature Ceremony - AC6
 *
 * Displays a celebratory confirmation after signature is complete.
 * Provides accessible celebration feedback.
 */

'use client'

import { useEffect, useState, useMemo } from 'react'

interface SignatureConfirmationProps {
  /** Name of the signer to personalize message */
  signerName: string
  /** Whether this is a child or parent signature */
  party: 'child' | 'parent'
  /** Callback when user wants to continue */
  onContinue?: () => void
  /** Additional CSS classes */
  className?: string
}

/** Confetti emoji options */
const CONFETTI_EMOJIS = ['⭐', '🌟', '✨', '🎉', '🎊']

/** Generate stable random values for confetti (seeded by index) */
function generateConfettiPositions(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    left: `${(i * 17 + 5) % 100}%`, // Spread evenly but look random
    delay: `${(i * 0.07) % 0.5}s`,
    duration: `${1.5 + ((i * 0.13) % 1)}s`,
    emoji: CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length],
  }))
}

export function SignatureConfirmation({
  signerName,
  party,
  onContinue,
  className = '',
}: SignatureConfirmationProps) {
  const [showConfetti, setShowConfetti] = useState(true)

  // Generate stable confetti positions (SSR-safe)
  const confettiPieces = useMemo(() => generateConfettiPositions(20), [])

  // Hide confetti after animation completes
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  const getMessage = () => {
    if (party === 'child') {
      return `You signed, ${signerName}! Great job!`
    }
    return `Thank you for signing, ${signerName}!`
  }

  const getSubMessage = () => {
    if (party === 'child') {
      return 'Now we wait for your parent to sign too.'
    }
    return 'The agreement is now complete!'
  }

  return (
    <div
      className={`relative text-center p-8 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 ${className}`}
      role="status"
      aria-live="polite"
      data-testid="signature-confirmation"
    >
      {/* Confetti animation */}
      {showConfetti && (
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          aria-hidden="true"
          data-testid="confetti-animation"
        >
          {/* Star confetti pieces - uses stable positions for SSR compatibility */}
          {confettiPieces.map((piece, i) => (
            <span
              key={i}
              className="absolute text-2xl animate-confetti"
              style={{
                left: piece.left,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
              }}
            >
              {piece.emoji}
            </span>
          ))}
        </div>
      )}

      {/* Success icon */}
      <div className="mb-4" aria-hidden="true">
        <span className="inline-block text-6xl animate-bounce-once">🎉</span>
      </div>

      {/* Success message */}
      <h2 className="text-2xl font-bold text-green-800 mb-2">{getMessage()}</h2>
      <p className="text-lg text-green-700 mb-6">{getSubMessage()}</p>

      {/* Checkmark */}
      <div
        className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500 text-white mb-6"
        aria-hidden="true"
      >
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Continue button */}
      {onContinue && (
        <button
          type="button"
          onClick={onContinue}
          className="
            px-6 py-3 rounded-full
            bg-green-600 text-white font-medium text-lg
            hover:bg-green-700
            min-h-[44px]
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
          "
          data-testid="continue-button"
        >
          Continue
        </button>
      )}

      {/* Screen reader announcement */}
      <span className="sr-only">
        Congratulations! Your signature has been recorded. {getSubMessage()}
      </span>
    </div>
  )
}
