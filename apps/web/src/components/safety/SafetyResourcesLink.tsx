'use client'

import { useState } from 'react'
import { SafetyContactForm } from './SafetyContactForm'
import { SafetyErrorBoundary } from './SafetyErrorBoundary'
import type { SafetyRequestSource } from '@fledgely/contracts'

interface SafetyResourcesLinkProps {
  source: SafetyRequestSource
  className?: string
}

/**
 * Safety Resources Link Component
 *
 * CRITICAL: This is a life-safety feature for victims escaping abuse.
 *
 * Visual design requirements:
 * - Visually subtle - not obvious to shoulder-surfer
 * - Uses muted/secondary text color
 * - Small font size (text-sm or text-xs)
 * - Neutral text ("Safety Resources" not "Escape Abuse")
 * - No attention-drawing icons
 * - Opens modal/sheet (not new page) to avoid URL history
 */
export function SafetyResourcesLink({
  source,
  className = '',
}: SafetyResourcesLinkProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline ${className}`}
        aria-label="Access safety resources and support"
      >
        Safety Resources
      </button>

      <SafetyErrorBoundary>
        <SafetyContactForm
          open={isOpen}
          onOpenChange={setIsOpen}
          source={source}
        />
      </SafetyErrorBoundary>
    </>
  )
}
