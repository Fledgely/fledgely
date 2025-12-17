'use client'

/**
 * SafetySignalHelp
 *
 * Story 7.5.1: Hidden Safety Signal Access - Task 5
 * Updated Story 7.5.4: Safe Adult Designation - Task 7
 *
 * Child-accessible documentation for the safety signal feature.
 * Written at a 6th-grade reading level (Flesch-Kincaid Grade 6).
 *
 * Now includes pre-configuration form for safe adult contact (AC4).
 *
 * CRITICAL: This component should ONLY be shown in protected resources view.
 * It should NOT appear in any family-visible dashboard or settings.
 *
 * CRITICAL INVARIANT (INV-002): Safety signals NEVER visible to family.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { type ContactType, validateContact, maskContact } from '@fledgely/contracts'

// ============================================================================
// Types
// ============================================================================

/**
 * Saved safe adult contact info for display
 */
interface SavedContactInfo {
  type: ContactType
  maskedValue: string
}

/**
 * Callbacks for safe adult management
 */
interface SafeAdultCallbacks {
  /** Called when user saves a new contact */
  onSave?: (contact: { type: ContactType; value: string }) => Promise<void>
  /** Called when user removes their saved contact */
  onRemove?: () => Promise<void>
  /** Called to load the current saved contact */
  onLoad?: () => Promise<SavedContactInfo | null>
}

interface SafetySignalHelpProps {
  /** Whether to show the expanded help content */
  defaultExpanded?: boolean
  /** Custom CSS class */
  className?: string
  /** Test ID for testing */
  testId?: string
  /** Callbacks for safe adult management (AC4) */
  safeAdultCallbacks?: SafeAdultCallbacks
  /** Child ID for safe adult storage */
  childId?: string
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
  safeAdultCallbacks,
  childId,
}: SafetySignalHelpProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  // Safe adult pre-configuration state (AC4)
  const [showSetupForm, setShowSetupForm] = useState(false)
  const [savedContact, setSavedContact] = useState<SavedContactInfo | null>(null)
  const [contactType, setContactType] = useState<ContactType>('phone')
  const [contactValue, setContactValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [loadingContact, setLoadingContact] = useState(false)

  // Load saved contact on mount (AC4)
  useEffect(() => {
    if (safeAdultCallbacks?.onLoad && childId) {
      setLoadingContact(true)
      safeAdultCallbacks.onLoad()
        .then((contact) => {
          setSavedContact(contact)
        })
        .catch(() => {
          // Silently fail - don't show error for load failure
        })
        .finally(() => {
          setLoadingContact(false)
        })
    }
  }, [safeAdultCallbacks, childId])

  // Handle save contact (AC4)
  const handleSave = useCallback(async () => {
    // Validate
    const validationError = validateContact(contactType, contactValue)
    if (validationError) {
      setError(validationError)
      return
    }

    if (!safeAdultCallbacks?.onSave) {
      return
    }

    setError(null)
    setSaving(true)

    try {
      await safeAdultCallbacks.onSave({ type: contactType, value: contactValue })
      // Update local state
      setSavedContact({
        type: contactType,
        maskedValue: maskContact(contactType, contactValue),
      })
      setShowSetupForm(false)
      setContactValue('')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [contactType, contactValue, safeAdultCallbacks])

  // Handle remove contact (AC4)
  const handleRemove = useCallback(async () => {
    if (!safeAdultCallbacks?.onRemove) {
      return
    }

    setRemoving(true)

    try {
      await safeAdultCallbacks.onRemove()
      setSavedContact(null)
    } catch {
      // Silently fail - user can try again
    } finally {
      setRemoving(false)
    }
  }, [safeAdultCallbacks])

  // Handle input change
  const handleValueChange = (value: string) => {
    setContactValue(value)
    if (error) setError(null)
  }

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
                <span>You can choose to tell a trusted adult you pick (this is optional)</span>
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

          {/* Safe Adult - Story 7.5.4 */}
          <section>
            <h4 className="font-medium mb-2">Tell Someone You Trust (Optional)</h4>
            <p className="text-sm leading-relaxed mb-3">
              After using the signal, you can choose to send a short message to someone you trust,
              like a teacher, coach, relative, or family friend. This is <strong>your choice</strong> -
              you don&apos;t have to do this if you don&apos;t want to.
            </p>

            {/* Pre-configuration form (AC4) */}
            {safeAdultCallbacks && childId && (
              <div
                className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-3"
                data-testid={`${testId}-safe-adult-setup`}
              >
                {/* Show saved contact */}
                {savedContact && !showSetupForm && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{savedContact.type === 'phone' ? '📞' : '✉️'}</span>
                      <div>
                        <p className="text-sm font-medium text-indigo-900">Saved contact</p>
                        <p className="text-xs text-indigo-700">{savedContact.maskedValue}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSetupForm(true)
                          setContactType(savedContact.type)
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                        data-testid={`${testId}-safe-adult-change`}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleRemove}
                        disabled={removing}
                        className="text-xs text-red-600 hover:text-red-800 underline disabled:opacity-50"
                        data-testid={`${testId}-safe-adult-remove`}
                      >
                        {removing ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Show setup button when no saved contact */}
                {!savedContact && !showSetupForm && !loadingContact && (
                  <button
                    type="button"
                    onClick={() => setShowSetupForm(true)}
                    className="w-full py-2 px-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-md text-sm font-medium transition-colors"
                    data-testid={`${testId}-safe-adult-setup-btn`}
                  >
                    ➕ Set up a trusted adult now
                  </button>
                )}

                {/* Loading state */}
                {loadingContact && (
                  <p className="text-xs text-indigo-600 text-center">Loading...</p>
                )}

                {/* Setup form */}
                {showSetupForm && (
                  <div className="space-y-3" data-testid={`${testId}-safe-adult-form`}>
                    <p className="text-sm font-medium text-indigo-900">
                      Enter their contact info
                    </p>

                    {/* Type toggle */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setContactType('phone')}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                          contactType === 'phone'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                        }`}
                        style={{ minHeight: '44px' }}
                        data-testid={`${testId}-safe-adult-type-phone`}
                      >
                        📞 Phone
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactType('email')}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                          contactType === 'email'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                        }`}
                        style={{ minHeight: '44px' }}
                        data-testid={`${testId}-safe-adult-type-email`}
                      >
                        ✉️ Email
                      </button>
                    </div>

                    {/* Input field */}
                    <input
                      type={contactType === 'phone' ? 'tel' : 'email'}
                      value={contactValue}
                      onChange={(e) => handleValueChange(e.target.value)}
                      placeholder={contactType === 'phone' ? 'Phone number' : 'Email address'}
                      className={`w-full py-2 px-3 rounded-md border-2 text-sm ${
                        error ? 'border-red-400' : 'border-indigo-200'
                      } focus:border-indigo-500 focus:outline-none`}
                      style={{ minHeight: '44px' }}
                      autoComplete={contactType === 'phone' ? 'tel' : 'email'}
                      data-testid={`${testId}-safe-adult-input`}
                    />

                    {/* Error message */}
                    {error && (
                      <p
                        className="text-xs text-red-600"
                        role="alert"
                        data-testid={`${testId}-safe-adult-error`}
                      >
                        {error}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSetupForm(false)
                          setContactValue('')
                          setError(null)
                        }}
                        className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors"
                        style={{ minHeight: '44px' }}
                        data-testid={`${testId}-safe-adult-cancel`}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !contactValue.trim()}
                        className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ minHeight: '44px' }}
                        data-testid={`${testId}-safe-adult-save`}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              {/* How it works */}
              <div className="flex items-start gap-3 bg-white/50 rounded-lg p-3">
                <span className="text-xl" role="img" aria-hidden="true">
                  📱
                </span>
                <div>
                  <p className="font-medium text-sm">How it works</p>
                  <ul className="text-sm text-blue-700 mt-1 space-y-1">
                    <li>• Enter their phone number or email</li>
                    <li>• They&apos;ll get a simple message: &quot;[Your name] needs help&quot;</li>
                    <li>• The message doesn&apos;t mention this app</li>
                  </ul>
                </div>
              </div>

              {/* What they see */}
              <div className="flex items-start gap-3 bg-white/50 rounded-lg p-3">
                <span className="text-xl" role="img" aria-hidden="true">
                  💬
                </span>
                <div>
                  <p className="font-medium text-sm">What they&apos;ll see</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Just a simple text or email that says you need help. Nothing about
                    this app, your family, or what happened. They can reach out to you however
                    feels right.
                  </p>
                </div>
              </div>

              {/* Save for next time */}
              <div className="flex items-start gap-3 bg-white/50 rounded-lg p-3">
                <span className="text-xl" role="img" aria-hidden="true">
                  💾
                </span>
                <div>
                  <p className="font-medium text-sm">Save for next time</p>
                  <p className="text-sm text-blue-700 mt-1">
                    If you enter someone&apos;s info once, we&apos;ll remember it (privately!)
                    so you can message them again quickly if you need to.
                  </p>
                </div>
              </div>
            </div>
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
