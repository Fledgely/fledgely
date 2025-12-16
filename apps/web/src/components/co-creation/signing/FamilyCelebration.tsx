'use client'

import { useEffect, useState, useCallback } from 'react'
import type { ShareResult } from '@/hooks/useAgreementDownload'

/**
 * FamilyCelebration Component Props
 */
export interface FamilyCelebrationProps {
  /** Agreement data for display */
  agreement: {
    id: string
    version: string
    activatedAt: string
    termsCount: number
  }
  /** Parent name(s) who signed */
  parentNames: string[]
  /** Child name who signed */
  childName: string
  /** Callback for next steps selection */
  onNextStep: (choice: 'device-enrollment' | 'dashboard') => void
  /** Callback for download agreement */
  onDownload: () => Promise<void>
  /** Callback for share agreement - returns result for user feedback */
  onShare: () => Promise<ShareResult>
}

/**
 * FamilyCelebration Component
 *
 * Story 6.4: Signing Ceremony Celebration
 *
 * Displays the family celebration when both parent and child have
 * signed the agreement and it becomes active. This creates a
 * meaningful shared moment that emphasizes partnership.
 *
 * Features:
 * - Partnership message "You did this together!" (AC #2)
 * - Confetti animation (AC #1)
 * - Download/share signed agreement (AC #3)
 * - Photo moment suggestion (AC #4)
 * - Next steps navigation (AC #5)
 * - Screen reader announcement (AC #7, NFR47)
 * - Reduced motion support (AC #6)
 * - 44x44px touch targets (NFR49)
 *
 * @example
 * ```tsx
 * <FamilyCelebration
 *   agreement={{ id: '123', version: '1.0', activatedAt: '...', termsCount: 5 }}
 *   parentNames={['Sarah']}
 *   childName="Alex"
 *   onNextStep={(choice) => handleNextStep(choice)}
 *   onDownload={async () => downloadAgreement()}
 *   onShare={async () => shareAgreement()}
 * />
 * ```
 */
export function FamilyCelebration({
  agreement,
  parentNames,
  childName,
  onNextStep,
  onDownload,
  onShare,
}: FamilyCelebrationProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

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
      // Stop confetti after 4 seconds for family celebration
      const timer = setTimeout(() => setShowConfetti(false), 4000)
      return () => clearTimeout(timer)
    }
  }, [prefersReducedMotion])

  const handleDownload = useCallback(async () => {
    setIsDownloading(true)
    try {
      await onDownload()
    } finally {
      setIsDownloading(false)
    }
  }, [onDownload])

  const [shareMessage, setShareMessage] = useState<string | null>(null)

  const handleShare = useCallback(async () => {
    setIsSharing(true)
    setShareMessage(null)
    try {
      const result = await onShare()
      if (result === 'copied') {
        setShareMessage('Link copied to clipboard!')
        // Clear message after 3 seconds
        setTimeout(() => setShareMessage(null), 3000)
      }
    } finally {
      setIsSharing(false)
    }
  }, [onShare])

  const handleDeviceEnrollment = useCallback(() => {
    onNextStep('device-enrollment')
  }, [onNextStep])

  const handleDashboard = useCallback(() => {
    onNextStep('dashboard')
  }, [onNextStep])

  // Format parent names for display
  const formatParentNames = () => {
    if (parentNames.length === 1) {
      return parentNames[0]
    }
    if (parentNames.length === 2) {
      return `${parentNames[0]} and ${parentNames[1]}`
    }
    return parentNames.slice(0, -1).join(', ') + ', and ' + parentNames[parentNames.length - 1]
  }

  return (
    <div
      data-testid="family-celebration-container"
      className="relative min-h-[500px] flex flex-col items-center justify-center px-6 py-12 text-center overflow-hidden"
    >
      {/* Confetti Animation (CSS-based for performance) */}
      {showConfetti && !prefersReducedMotion && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {/* Generate confetti pieces - more for family celebration */}
          {Array.from({ length: 60 }).map((_, i) => (
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

      {/* Screen Reader Announcement (AC #7) */}
      <div
        role="alert"
        aria-live="polite"
        className="sr-only"
      >
        Congratulations! Your family agreement is now active.
      </div>

      {/* Success Icon */}
      <div
        className={`w-28 h-28 mb-6 rounded-full flex items-center justify-center ${
          prefersReducedMotion
            ? 'bg-green-100 dark:bg-green-900/30'
            : 'bg-green-100 dark:bg-green-900/30 animate-bounce-once'
        }`}
      >
        <svg
          className="w-16 h-16 text-green-500"
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
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      {/* Main Celebration Message */}
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
        Agreement Active!
      </h1>

      {/* Partnership Message (AC #2) */}
      <p className="text-xl md:text-2xl text-purple-600 dark:text-purple-400 font-semibold mb-4">
        You did this together!
      </p>

      {/* Family Members Display (Task 1.3) */}
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
        <span className="font-medium">{formatParentNames()}</span> and{' '}
        <span className="font-medium">{childName}</span> signed a family agreement.
      </p>

      {/* Agreement Details */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Version {agreement.version} • {agreement.termsCount} terms
      </p>

      {/* Celebratory Badge */}
      <div className="mb-6 px-6 py-3 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-full">
        <span className="text-lg font-semibold text-purple-700 dark:text-purple-300">
          Family Partnership Sealed!
        </span>
      </div>

      {/* Photo Moment Suggestion (AC #4) */}
      <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg max-w-md">
        <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-1">
          Capture this moment!
        </p>
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          Take a screenshot or photo to remember this special family milestone.
        </p>
      </div>

      {/* Download/Share Buttons (AC #3) */}
      <div className="flex flex-wrap gap-4 mb-8 justify-center">
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          className="min-h-[44px] px-6 py-2 flex items-center gap-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          aria-label="Download agreement"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {isDownloading ? 'Downloading...' : 'Download Agreement'}
        </button>

        <button
          type="button"
          onClick={handleShare}
          disabled={isSharing}
          className="min-h-[44px] px-6 py-2 flex items-center gap-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          aria-label="Share agreement"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          {isSharing ? 'Sharing...' : 'Share Agreement'}
        </button>
      </div>

      {/* Clipboard feedback message */}
      {shareMessage && (
        <div
          role="status"
          aria-live="polite"
          className="text-sm text-green-600 dark:text-green-400 font-medium"
        >
          {shareMessage}
        </div>
      )}

      {/* Next Steps Navigation (AC #5) */}
      <div className="w-full max-w-md space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          What&apos;s Next?
        </h2>

        {/* Device enrollment option */}
        <button
          type="button"
          onClick={handleDeviceEnrollment}
          className="min-h-[44px] w-full p-4 text-left bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          aria-label="Set up device monitoring"
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Set Up Device Monitoring</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add {childName}&apos;s devices to start your digital safety journey
              </p>
            </div>
          </div>
        </button>

        {/* Agreement-only option */}
        <button
          type="button"
          onClick={handleDashboard}
          className="min-h-[44px] w-full p-4 text-left bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          aria-label="Agreement only for now - go to dashboard"
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Agreement Only for Now</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You can set up device monitoring later from your dashboard
              </p>
            </div>
          </div>
        </button>
      </div>

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
