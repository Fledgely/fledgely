/**
 * Celebration Screen Component.
 *
 * Story 6.4: Signing Ceremony Celebration - AC1-AC7
 *
 * Displays celebratory confirmation when agreement is activated.
 * Features confetti animation, partnership messaging, and next steps.
 * Respects reduced motion preferences and is fully accessible.
 */

'use client'

import { useEffect, useState, useMemo } from 'react'
import { formatDateFull } from '@/utils/formatDate'

interface CelebrationScreenProps {
  /** Agreement version (e.g., "v1.0") */
  version: string
  /** Activation timestamp */
  activatedAt: Date
  /** Child's name for personalization */
  childName: string
  /** Family name for personalization */
  familyName?: string
  /** Whether this is shown to the child */
  isChildView?: boolean
  /** Called when user wants to download agreement */
  onDownload?: () => void
  /** Called when user wants to view dashboard */
  onViewDashboard?: () => void
  /** Called when user wants to set up device monitoring */
  onSetupDevices?: () => void
  /** Additional CSS classes */
  className?: string
}

/** Confetti emoji options for celebration */
const CONFETTI_EMOJIS = ['⭐', '🌟', '✨', '🎉', '🎊', '🎈', '💫', '🌈']

/** Generate stable random values for confetti (seeded by index) */
function generateConfettiPositions(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    left: `${(i * 13 + 3) % 100}%`,
    delay: `${(i * 0.05) % 0.8}s`,
    duration: `${2 + ((i * 0.17) % 1.5)}s`,
    emoji: CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length],
  }))
}

/** Check if user prefers reduced motion */
function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

export function CelebrationScreen({
  version,
  activatedAt,
  childName,
  familyName,
  isChildView = false,
  onDownload,
  onViewDashboard,
  onSetupDevices,
  className = '',
}: CelebrationScreenProps) {
  const [showConfetti, setShowConfetti] = useState(true)
  const [showPhotoMoment, setShowPhotoMoment] = useState(true)
  const prefersReducedMotion = usePrefersReducedMotion()

  // Generate stable confetti positions (SSR-safe)
  const confettiPieces = useMemo(() => generateConfettiPositions(30), [])

  // Hide confetti after animation completes (5 seconds for celebration)
  useEffect(() => {
    if (prefersReducedMotion) {
      setShowConfetti(false)
      return
    }

    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [prefersReducedMotion])

  // Announce celebration for screen readers (AC6)
  useEffect(() => {
    const announcement = document.createElement('div')
    announcement.setAttribute('role', 'status')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = `Congratulations! Your family agreement is now active. Version ${version}, effective ${formatDateFull(activatedAt)}. You did this together!`
    document.body.appendChild(announcement)

    return () => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement)
      }
    }
  }, [version, activatedAt])

  const handleSkipAnimation = () => {
    setShowConfetti(false)
  }

  const handleDismissPhotoMoment = () => {
    setShowPhotoMoment(false)
  }

  // Get heading based on view type (AC7 - child-friendly)
  const getHeading = () => {
    if (isChildView) {
      return 'You Did It!'
    }
    return `${familyName || 'Your'} Family Agreement is Active!`
  }

  // Get button text based on view type (AC7 - child-friendly)
  const getDashboardButtonText = () => {
    if (isChildView) {
      return "Awesome! Let's See It"
    }
    return 'View Dashboard'
  }

  return (
    <div
      className={`relative rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 p-8 text-center overflow-hidden ${className}`}
      role="region"
      aria-labelledby="celebration-heading"
      data-testid="celebration-screen"
    >
      {/* Confetti animation (AC1) */}
      {showConfetti && !prefersReducedMotion && (
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          aria-hidden="true"
          data-testid="confetti-animation"
        >
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

      {/* Skip animation button (AC6 - accessibility) */}
      {showConfetti && !prefersReducedMotion && (
        <button
          type="button"
          onClick={handleSkipAnimation}
          className="absolute top-4 right-4 text-sm text-green-600 hover:text-green-800 underline focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded px-2 py-1 min-h-[44px]"
          data-testid="skip-animation-button"
        >
          Skip animation
        </button>
      )}

      {/* Celebration icon */}
      <div className="mb-4 text-6xl" aria-hidden="true" data-testid="celebration-icon">
        🎉
      </div>

      {/* Main heading */}
      <h1
        id="celebration-heading"
        className="mb-2 text-2xl font-bold text-green-800"
        data-testid="celebration-heading"
      >
        {getHeading()}
      </h1>

      {/* Partnership message (AC2) */}
      <p className="mb-4 text-xl font-medium text-green-700" data-testid="partnership-message">
        {isChildView
          ? 'You did this together with your family!'
          : `You did this together with ${childName}!`}
      </p>

      {/* Version and date info */}
      <p className="mb-6 text-lg text-green-600" data-testid="version-info">
        Version {version} • Effective {formatDateFull(activatedAt)}
      </p>

      {/* Photo moment suggestion (AC4) */}
      {showPhotoMoment && (
        <div
          className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4 relative"
          data-testid="photo-moment"
        >
          <button
            type="button"
            onClick={handleDismissPhotoMoment}
            className="absolute top-2 right-2 text-yellow-600 hover:text-yellow-800 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 rounded"
            aria-label="Dismiss photo suggestion"
            data-testid="dismiss-photo-moment"
          >
            <span aria-hidden="true">×</span>
          </button>
          <p className="text-yellow-800 text-sm">
            <span className="font-medium">Capture this moment! </span>
            {isChildView
              ? 'Take a screenshot to remember this day!'
              : 'Take a screenshot to celebrate this milestone with your family!'}
          </p>
        </div>
      )}

      {/* Download button (AC3) */}
      {onDownload && (
        <button
          type="button"
          onClick={onDownload}
          className="
            mb-4 w-full rounded-lg border-2 border-green-300 bg-white
            px-6 py-3 font-medium text-green-700
            transition-colors hover:bg-green-50
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
            min-h-[44px]
          "
          data-testid="download-button"
        >
          {isChildView ? 'Save My Agreement' : 'Download Agreement PDF'}
        </button>
      )}

      {/* Next steps section (AC5) */}
      <div className="mt-6 space-y-3" data-testid="next-steps">
        <h2 className="font-medium text-green-800 mb-3">
          {isChildView ? "What's next?" : 'Next Steps'}
        </h2>

        {onSetupDevices && (
          <button
            type="button"
            onClick={onSetupDevices}
            className="
              w-full rounded-lg bg-green-600
              px-6 py-3 font-medium text-white
              transition-colors hover:bg-green-700
              focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
              min-h-[44px]
            "
            data-testid="setup-devices-button"
          >
            {isChildView ? 'Set Up My Devices' : 'Set Up Device Monitoring'}
          </button>
        )}

        {onViewDashboard && (
          <button
            type="button"
            onClick={onViewDashboard}
            className="
              w-full rounded-lg border-2 border-green-300 bg-white
              px-6 py-3 font-medium text-green-700
              transition-colors hover:bg-green-50
              focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
              min-h-[44px]
            "
            data-testid="view-dashboard-button"
          >
            {getDashboardButtonText()}
          </button>
        )}
      </div>

      {/* Screen reader only content */}
      <span className="sr-only">
        Congratulations! Your family agreement has been activated.{' '}
        {isChildView
          ? 'You and your family made this agreement together.'
          : `You and ${childName} have committed to the terms.`}
      </span>
    </div>
  )
}
