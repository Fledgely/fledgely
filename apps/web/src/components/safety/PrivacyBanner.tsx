/**
 * Privacy Banner Component
 *
 * Story 7.3: Child Allowlist Visibility - Task 1.3
 *
 * Displays a prominent banner assuring children that visiting
 * protected resources will never be seen by their parents.
 *
 * Text written at 6th-grade reading level (AC: 4)
 */

import { Shield } from 'lucide-react'

interface PrivacyBannerProps {
  className?: string
}

/**
 * PrivacyBanner displays the "These Sites Are Always Private" message
 *
 * This is a critical trust-building component that reassures children
 * they can safely access crisis resources without fear.
 */
export function PrivacyBanner({ className = '' }: PrivacyBannerProps) {
  return (
    <div
      role="banner"
      aria-labelledby="privacy-headline"
      className={`rounded-lg border-2 border-green-200 bg-green-50 p-6 ${className}`}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100"
          aria-hidden="true"
        >
          <Shield className="h-6 w-6 text-green-600" />
        </div>
        <div className="space-y-2">
          <h1
            id="privacy-headline"
            className="text-xl font-bold text-green-900"
          >
            These Sites Are Always Private
          </h1>
          <p className="text-base text-green-800">
            When you visit any of these websites, your parents will never see
            it. This is a promise. You can always get help without anyone
            knowing.
          </p>
          <p className="text-sm font-semibold text-green-700">
            Your parents can NEVER see visits to these sites.
          </p>
        </div>
      </div>
    </div>
  )
}
