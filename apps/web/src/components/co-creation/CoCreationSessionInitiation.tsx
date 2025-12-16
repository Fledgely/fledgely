'use client'

import { useState, useCallback, useMemo } from 'react'
import type { AgreementTemplate } from '@fledgely/contracts'
import { ChildPresencePrompt } from './ChildPresencePrompt'
import { SessionStartButton } from './SessionStartButton'

/**
 * Source draft types from Epic 4
 */
export interface WizardDraft {
  childAge: string
  templateId: string
  customizations: {
    screenTimeMinutes: number
    bedtimeCutoff: string
    monitoringLevel: string
    selectedRules: string[]
  }
  createdAt: string
}

export interface TemplateDraft {
  templateId: string
  childId: string
  originalTemplate: AgreementTemplate
  customizations: {
    screenTimeMinutes: number | null
    weekendScreenTimeMinutes: number | null
    bedtimeCutoff: string | null
    monitoringLevel: string | null
    rules: {
      enabled: string[]
      disabled: string[]
      custom: { id: string; text: string }[]
    }
  }
  modifiedAt: string
  createdAt: string
}

type DraftSource =
  | { type: 'wizard'; draft: WizardDraft }
  | { type: 'template_customization'; draft: TemplateDraft }
  | { type: 'blank' }

interface ChildProfile {
  id: string
  name: string
  age: number
}

interface CoCreationSessionInitiationProps {
  child: ChildProfile
  familyId: string
  draftSource: DraftSource
  onSessionStart: (sessionId: string) => void
  onCancel: () => void
  createSession: (input: {
    familyId: string
    childId: string
    sourceDraft: {
      type: 'wizard' | 'template_customization' | 'blank'
      templateId?: string
      draftId?: string
    }
    initialTerms?: Array<{ type: string; content: Record<string, unknown> }>
  }) => Promise<{ success: boolean; session?: { id: string }; error?: string }>
}

type InitiationStep = 'child_presence' | 'draft_summary' | 'starting'

/**
 * Co-Creation Session Initiation Component
 *
 * Story 5.1: Co-Creation Session Initiation - Task 4.1
 *
 * Main component for initiating a co-creation session. Guides families
 * through confirming child presence and reviewing the draft before
 * starting the collaborative agreement building process.
 *
 * Features:
 * - Child presence confirmation (AC #1)
 * - Draft/template summary display (Task 4.4)
 * - Session creation with loading state (AC #2)
 * - Screen sharing friendly design (AC #5)
 *
 * Accessibility features:
 * - Keyboard navigable (NFR43)
 * - Screen reader announcements
 * - Focus management on step changes
 * - 44x44px touch targets (NFR49)
 * - High contrast text (NFR45)
 *
 * @example
 * ```tsx
 * <CoCreationSessionInitiation
 *   child={{ id: 'child-123', name: 'Alex', age: 10 }}
 *   familyId="family-456"
 *   draftSource={{ type: 'wizard', draft: wizardDraft }}
 *   onSessionStart={(id) => router.push(`/session/${id}`)}
 *   onCancel={() => router.back()}
 *   createSession={async (input) => { ... }}
 * />
 * ```
 */
export function CoCreationSessionInitiation({
  child,
  familyId,
  draftSource,
  onSessionStart,
  onCancel,
  createSession,
}: CoCreationSessionInitiationProps) {
  // State
  const [currentStep, setCurrentStep] = useState<InitiationStep>('child_presence')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [buttonState, setButtonState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  // Derive draft summary info
  const draftSummary = useMemo(() => {
    if (draftSource.type === 'wizard') {
      const draft = draftSource.draft
      return {
        templateId: draft.templateId,
        screenTime: draft.customizations.screenTimeMinutes,
        bedtime: draft.customizations.bedtimeCutoff,
        rulesCount: draft.customizations.selectedRules.length,
      }
    } else if (draftSource.type === 'template_customization') {
      const draft = draftSource.draft
      return {
        templateId: draft.templateId,
        screenTime: draft.customizations.screenTimeMinutes ?? undefined,
        bedtime: draft.customizations.bedtimeCutoff ?? undefined,
        rulesCount:
          draft.customizations.rules.enabled.length +
          draft.customizations.rules.custom.length,
      }
    }
    return null
  }, [draftSource])

  // Handle child presence confirmation
  const handlePresenceConfirm = useCallback(() => {
    setCurrentStep('draft_summary')
  }, [])

  // Handle start session
  const handleStartSession = useCallback(async () => {
    setIsLoading(true)
    setButtonState('loading')
    setError(null)

    try {
      // Prepare session input
      const sourceDraft = {
        type: draftSource.type,
        templateId:
          draftSource.type === 'wizard'
            ? draftSource.draft.templateId
            : draftSource.type === 'template_customization'
              ? draftSource.draft.templateId
              : undefined,
        draftId:
          draftSource.type === 'template_customization'
            ? draftSource.draft.childId // Using as draft reference
            : undefined,
      }

      // Transform draft to initial terms
      const initialTerms: Array<{ type: string; content: Record<string, unknown> }> = []

      if (draftSource.type === 'wizard') {
        const draft = draftSource.draft
        if (draft.customizations.screenTimeMinutes) {
          initialTerms.push({
            type: 'screen_time',
            content: { minutes: draft.customizations.screenTimeMinutes },
          })
        }
        if (draft.customizations.bedtimeCutoff) {
          initialTerms.push({
            type: 'bedtime',
            content: { time: draft.customizations.bedtimeCutoff },
          })
        }
        if (draft.customizations.monitoringLevel) {
          initialTerms.push({
            type: 'monitoring',
            content: { level: draft.customizations.monitoringLevel },
          })
        }
      } else if (draftSource.type === 'template_customization') {
        const draft = draftSource.draft
        if (draft.customizations.screenTimeMinutes !== null) {
          initialTerms.push({
            type: 'screen_time',
            content: { minutes: draft.customizations.screenTimeMinutes },
          })
        }
        if (draft.customizations.bedtimeCutoff !== null) {
          initialTerms.push({
            type: 'bedtime',
            content: { time: draft.customizations.bedtimeCutoff },
          })
        }
        if (draft.customizations.monitoringLevel !== null) {
          initialTerms.push({
            type: 'monitoring',
            content: { level: draft.customizations.monitoringLevel },
          })
        }
      }

      const result = await createSession({
        familyId,
        childId: child.id,
        sourceDraft,
        initialTerms: initialTerms.length > 0 ? initialTerms : undefined,
      })

      if (result.success && result.session) {
        setButtonState('success')
        setCurrentStep('starting')

        // Small delay for success feedback before navigation
        setTimeout(() => {
          onSessionStart(result.session!.id)
        }, 500)
      } else {
        setButtonState('error')
        setError(result.error || 'Failed to create session. Please try again.')
      }
    } catch (err) {
      setButtonState('error')
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }, [familyId, child.id, draftSource, createSession, onSessionStart])

  // Render child presence step
  if (currentStep === 'child_presence') {
    return (
      <ChildPresencePrompt
        childName={child.name}
        onConfirm={handlePresenceConfirm}
        onCancel={onCancel}
        isLoading={false}
      />
    )
  }

  // Render draft summary and start step
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] px-6 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Ready to Build Your Agreement
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          with <span className="font-semibold">{child.name}</span>
        </p>
      </div>

      {/* Draft Summary */}
      {draftSummary && (
        <div className="w-full max-w-md mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Starting Point
          </h3>
          <dl className="space-y-3">
            {draftSummary.screenTime && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <dt className="text-gray-600 dark:text-gray-400">Daily Screen Time</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  {draftSummary.screenTime} minutes
                </dd>
              </div>
            )}
            {draftSummary.bedtime && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <dt className="text-gray-600 dark:text-gray-400">Device Bedtime</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  {draftSummary.bedtime}
                </dd>
              </div>
            )}
            {draftSummary.rulesCount !== undefined && draftSummary.rulesCount > 0 && (
              <div className="flex justify-between items-center py-2">
                <dt className="text-gray-600 dark:text-gray-400">Rules to Discuss</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  {draftSummary.rulesCount} rule{draftSummary.rulesCount !== 1 ? 's' : ''}
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
            You can adjust everything together during the session
          </p>
        </div>
      )}

      {/* No draft - starting blank */}
      {draftSource.type === 'blank' && (
        <div className="w-full max-w-md mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Starting Fresh
              </h3>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                You'll build your agreement together from scratch. Take your time
                and discuss each part with {child.name}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Start Button */}
      <SessionStartButton
        onStart={handleStartSession}
        state={buttonState}
        errorMessage={error ?? undefined}
        disabled={isLoading}
      />

      {/* Back link */}
      <button
        type="button"
        onClick={onCancel}
        disabled={isLoading || buttonState === 'success'}
        className="mt-6 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:underline disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Go back to draft
      </button>

      {/* Session starting message */}
      {currentStep === 'starting' && (
        <div
          className="fixed inset-0 bg-white/90 dark:bg-gray-900/90 flex items-center justify-center z-50"
          role="status"
          aria-live="polite"
        >
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-green-500 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
              Starting your session...
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Get ready to build something great together!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
