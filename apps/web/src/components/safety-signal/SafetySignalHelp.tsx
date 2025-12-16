'use client'

/**
 * SafetySignalHelp
 *
 * Story 7.5.1: Hidden Safety Signal Access - Task 5
 *
 * Child-accessible documentation for the safety signal feature.
 * Written at a 6th-grade reading level (Flesch-Kincaid Grade 6).
 *
 * CRITICAL: This component should ONLY be shown in protected resources view.
 * It should NOT appear in any family-visible dashboard or settings.
 *
 * CRITICAL INVARIANT (INV-002): Safety signals NEVER visible to family.
 */

import React, { useState } from 'react'

// ============================================================================
// Types
// ============================================================================

interface SafetySignalHelpProps {
  /** Whether to show the expanded help content */
  defaultExpanded?: boolean
  /** Custom CSS class */
  className?: string
  /** Test ID for testing */
  testId?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * SafetySignalHelp
 *
 * Shows how to use the hidden safety signal. Place this in the child's
 * protected resources view alongside crisis resources.
 *
 * Text is written at a 6th-grade reading level for accessibility.
 *
 * @example
 * ```tsx
 * function ProtectedResourcesView() {
 *   return (
 *     <div>
 *       <CrisisResourceSuggestions />
 *       <SafetySignalHelp />
 *     </div>
 *   )
 * }
 * ```
 */
export function SafetySignalHelp({
  defaultExpanded = false,
  className = '',
  testId = 'safety-signal-help',
}: SafetySignalHelpProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div
      data-testid={testId}
      className={`rounded-lg border border-blue-200 bg-blue-50 p-4 ${className}`}
    >
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
        aria-expanded={expanded}
        aria-controls="safety-signal-help-content"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-hidden="true">
            🔒
          </span>
          <div>
            <h3 className="font-semibold text-blue-900">Secret Safety Signal</h3>
            <p className="text-sm text-blue-700">A hidden way to ask for help</p>
          </div>
        </div>
        <span
          className="text-blue-500 transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>

      {/* Expandable content */}
      {expanded && (
        <div
          id="safety-signal-help-content"
          className="mt-4 space-y-4 text-blue-900"
        >
          {/* What is it */}
          <section>
            <h4 className="font-medium mb-2">What is this?</h4>
            <p className="text-sm leading-relaxed">
              This is a secret way to let someone know you need help. No one watching
              your screen will know you did anything special. It just looks like you
              tapped a button a few times.
            </p>
          </section>

          {/* How to use it */}
          <section>
            <h4 className="font-medium mb-2">How to use it</h4>
            <div className="space-y-3">
              {/* Tap gesture */}
              <div className="flex items-start gap-3 bg-white/50 rounded-lg p-3">
                <span className="text-xl" role="img" aria-hidden="true">
                  👆
                </span>
                <div>
                  <p className="font-medium text-sm">Tap the Logo</p>
                  <p className="text-sm text-blue-700">
                    Tap the Fledgely logo <strong>5 times fast</strong> (in about 3 seconds).
                    The logo is at the top of most pages.
                  </p>
                </div>
              </div>

              {/* Keyboard shortcut */}
              <div className="flex items-start gap-3 bg-white/50 rounded-lg p-3">
                <span className="text-xl" role="img" aria-hidden="true">
                  ⌨️
                </span>
                <div>
                  <p className="font-medium text-sm">Keyboard Shortcut</p>
                  <p className="text-sm text-blue-700">
                    If you&apos;re using a computer keyboard, press{' '}
                    <kbd className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">Shift</kbd>
                    {' + '}
                    <kbd className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">Ctrl</kbd>
                    {' + '}
                    <kbd className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">S</kbd>
                    {' '}<strong>3 times fast</strong>.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* What happens */}
          <section>
            <h4 className="font-medium mb-2">What happens next</h4>
            <ul className="text-sm space-y-2 text-blue-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600" aria-hidden="true">✓</span>
                <span>You&apos;ll see a small &quot;Saved&quot; message (that&apos;s how you know it worked)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600" aria-hidden="true">✓</span>
                <span>A safe adult will be quietly told you might need help</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600" aria-hidden="true">✓</span>
                <span>No one else in your family will know you used this</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600" aria-hidden="true">✓</span>
                <span>It works even if the internet is slow - we&apos;ll send it when we can</span>
              </li>
            </ul>
          </section>

          {/* Privacy assurance */}
          <section className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="text-xl" role="img" aria-hidden="true">
                🔐
              </span>
              <div>
                <p className="font-medium text-sm text-green-800">Your Privacy is Protected</p>
                <p className="text-xs text-green-700 mt-1">
                  Parents and family members <strong>cannot</strong> see when you use this signal.
                  It&apos;s stored in a completely separate, private place that only special
                  helpers can access.
                </p>
              </div>
            </div>
          </section>

          {/* Practice note */}
          <section className="text-xs text-blue-600 italic">
            <p>
              💡 <strong>Tip:</strong> You can practice the tapping motion anytime.
              If you tap less than 5 times, nothing happens, so no one will know
              you&apos;re practicing.
            </p>
          </section>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Export
// ============================================================================

export default SafetySignalHelp
