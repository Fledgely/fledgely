'use client'

import { useEffect, useState, useCallback } from 'react'

/**
 * SigningCelebration Component Props
 */
export interface SigningCelebrationProps {
  /** Child's name for personalized message */
  childName: string
  /** Callback when user is ready to continue */
  onContinue: () => void
}

/**
 * SigningCelebration Component
 *
 * Story 6.1: Child Digital Signature Ceremony - Task 5
 *
 * Displays a celebratory animation and message when the child
 * completes signing their family agreement. This creates a
 * meaningful moment that reinforces the importance of their
 * commitment (AC #6).
 *
 * Features:
 * - Confetti animation using CSS (Task 5.2)
 * - "You signed!" message with celebratory styling (Task 5.3)
 * - Screen reader announcement (Task 5.4, NFR47)
 * - Encouraging next steps message (Task 5.5)
 * - Non-animated fallback for reduced-motion preference (Task 5.6)
 * - 44x44px touch targets (NFR49)
 *
 * @example
 * ```tsx
 * <SigningCelebration
 *   childName="Alex"
 *   onContinue={() => navigateToNextStep()}
 * />
 * ```
 */
export function SigningCelebration({
  childName,
  onContinue,
}: SigningCelebrationProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Trigger confetti after mount
  useEffect(() => {
    if (!prefersReducedMotion) {
      setShowConfetti(true)
      // Stop confetti after 3 seconds
      const timer = setTimeout(() => setShowConfetti(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [prefersReducedMotion])

  const handleContinue = useCallback(() => {
    onContinue()
  }, [onContinue])

  return (
    <div
      data-testid="celebration-container"
      className="relative min-h-[400px] flex flex-col items-center justify-center px-6 py-12 text-center overflow-hidden"
    >
      {/* Confetti Animation (CSS-based for performance) */}
      {showConfetti && !prefersReducedMotion && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {/* Generate confetti pieces */}
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-sm animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                backgroundColor: [
                  '#f472b6', // pink
                  '#60a5fa', // blue
                  '#34d399', // green
                  '#fbbf24', // yellow
                  '#a78bfa', // purple
                  '#fb923c', // orange
                ][i % 6],
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Screen Reader Announcement */}
      <div
        role="alert"
        aria-live="polite"
        className="sr-only"
      >
        Congratulations {childName}! You have successfully signed the family agreement.
      </div>

      {/* Success Icon */}
      <div
        className={`w-24 h-24 mb-6 rounded-full flex items-center justify-center ${
          prefersReducedMotion
            ? 'bg-green-100 dark:bg-green-900/30'
            : 'bg-green-100 dark:bg-green-900/30 animate-bounce-once'
        }`}
      >
        <svg
          className="w-14 h-14 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          role="img"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      {/* Main Celebration Message */}
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        You Signed, {childName}!
      </h1>

      {/* Supporting Message */}
      <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-2 max-w-md">
        This is a big moment for your family!
      </p>

      <p className="text-base text-gray-500 dark:text-gray-400 mb-8 max-w-md">
        You made a promise to follow this agreement. Your parent made the same promise too.
        Working together makes your family stronger!
      </p>

      {/* Celebratory Badge */}
      <div className="mb-8 px-6 py-3 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-full">
        <span className="text-lg font-semibold text-purple-700 dark:text-purple-300">
          🎉 Agreement Complete! 🎉
        </span>
      </div>

      {/* Continue Button */}
      <button
        type="button"
        onClick={handleContinue}
        className="min-h-[44px] px-8 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        Continue
      </button>

      {/* CSS for confetti animation - using global style tag */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes confetti-fall {
              0% {
                transform: translateY(-100vh) rotate(0deg);
                opacity: 1;
              }
              100% {
                transform: translateY(100vh) rotate(720deg);
                opacity: 0;
              }
            }

            @keyframes bounce-once {
              0%, 100% {
                transform: scale(1);
              }
              50% {
                transform: scale(1.1);
              }
            }

            .animate-confetti {
              animation: confetti-fall linear forwards;
            }

            .animate-bounce-once {
              animation: bounce-once 0.5s ease-in-out;
            }
          `,
        }}
      />
    </div>
  )
}
