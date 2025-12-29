/**
 * Co-Creation Session Component.
 *
 * Story 5.1: Co-Creation Session Initiation - AC1, AC2, AC3, AC4, AC5, AC6
 *
 * Main component for managing the agreement co-creation session.
 * Integrates session start prompt, timeout warning, and session state management.
 * Designed for parent and child to work together on a shared screen.
 */

'use client'

import { useState, useCallback } from 'react'
import type { AgreementTemplate } from '@fledgely/shared/contracts'
import { SessionStartPrompt } from './SessionStartPrompt'
import { SessionTimeoutWarning } from './SessionTimeoutWarning'
import { useCoCreationSession } from '../../hooks/useCoCreationSession'
import { useSessionTimeout } from '../../hooks/useSessionTimeout'

interface CoCreationSessionProps {
  /** Child information */
  child: {
    id: string
    name: string
  }
  /** Family ID */
  familyId: string
  /** Parent user ID */
  parentUid: string
  /** Optional template being used */
  template?: AgreementTemplate
  /** Optional draft ID from customization */
  draftId?: string
  /** Callback when session is completed */
  _onComplete?: () => void
  /** Callback when session is cancelled */
  onCancel?: () => void
}

export function CoCreationSession({
  child,
  familyId,
  parentUid,
  template,
  draftId,
  _onComplete,
  onCancel,
}: CoCreationSessionProps) {
  const [showStartPrompt, setShowStartPrompt] = useState(true)

  const {
    session,
    isActive,
    isPaused,
    isLoading,
    error,
    createSession,
    pauseSession,
    resumeSession,
    updateActivity,
  } = useCoCreationSession()

  const { isWarningVisible, minutesRemaining, extendSession, resetActivity } = useSessionTimeout({
    enabled: isActive,
    onTimeout: () => {
      pauseSession()
    },
  })

  /**
   * Handle confirming child is present and starting session.
   */
  const handleStartSession = useCallback(async () => {
    setShowStartPrompt(false)

    const newSession = await createSession({
      familyId,
      childId: child.id,
      createdByUid: parentUid,
      agreementDraftId: draftId,
      templateId: template?.id,
    })

    if (newSession) {
      resetActivity()
    }
  }, [createSession, familyId, child.id, parentUid, draftId, template?.id, resetActivity])

  /**
   * Handle cancelling session start.
   */
  const handleCancelStart = useCallback(() => {
    setShowStartPrompt(false)
    onCancel?.()
  }, [onCancel])

  /**
   * Handle extending session (from timeout warning).
   */
  const handleExtendSession = useCallback(() => {
    extendSession()
    updateActivity()
  }, [extendSession, updateActivity])

  /**
   * Handle pausing session.
   */
  const handlePauseSession = useCallback(async () => {
    await pauseSession()
  }, [pauseSession])

  /**
   * Handle resuming session.
   */
  const handleResumeSession = useCallback(async () => {
    await resumeSession()
    resetActivity()
  }, [resumeSession, resetActivity])

  // Show start prompt if not started
  if (showStartPrompt) {
    return (
      <SessionStartPrompt
        isOpen={true}
        onClose={handleCancelStart}
        onConfirm={handleStartSession}
        childName={child.name}
        templateName={template?.name}
      />
    )
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="session-loading">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Setting up your session...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div
        className="flex items-center justify-center min-h-[400px]"
        data-testid="session-error"
        role="alert"
      >
        <div className="text-center max-w-md">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => setShowStartPrompt(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px]"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Show paused state
  if (isPaused) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="session-paused">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Paused</h2>
          <p className="text-gray-600 mb-6">
            Your progress is saved. When you&apos;re ready to continue with {child.name}, click
            below.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={handleResumeSession}
              className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px]"
              data-testid="resume-session"
            >
              Resume Session
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px]"
              data-testid="exit-session"
            >
              Exit for Now
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Active session view
  return (
    <div className="min-h-[400px]" data-testid="session-active">
      {/* Session Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Building Agreement with {child.name}
              </h1>
              <p className="text-sm text-gray-600">
                {session?.contributions.length || 0} contributions so far
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePauseSession}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px] flex items-center gap-2"
            data-testid="pause-button"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Pause
          </button>
        </div>
      </div>

      {/* Session Content - Placeholder for Story 5.2 Visual Agreement Builder */}
      <div className="p-6">
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">Visual Agreement Builder will be added in Story 5.2.</p>
          <p className="text-sm text-gray-400 mt-2">Session ID: {session?.id}</p>
        </div>
      </div>

      {/* Timeout Warning Modal */}
      <SessionTimeoutWarning
        isOpen={isWarningVisible}
        onExtend={handleExtendSession}
        onPause={handlePauseSession}
        minutesRemaining={minutesRemaining}
      />
    </div>
  )
}

export default CoCreationSession
