/**
 * Transition Page - Story 52.1 Task 5
 *
 * Page for viewing age 16 transition information and guide.
 *
 * AC2: Links to documentation about age 16 rights
 * AC4: In-app guide walks through new features
 * AC5: No action required - transition is optional
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { TransitionGuide } from '@/components/transition/TransitionGuide'
import { TransitionNotificationCard } from '@/components/transition/TransitionNotificationCard'
import { useAge16Transition } from '@/hooks/useAge16Transition'
type ViewMode = 'overview' | 'guide'

export default function TransitionPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('overview')

  const {
    isLoading,
    pendingNotification,
    dismissNotification,
    isEligible,
    isApproaching,
    daysUntil16,
  } = useAge16Transition()

  const handleBack = () => {
    if (viewMode === 'guide') {
      setViewMode('overview')
    } else {
      router.push('/dashboard')
    }
  }

  const handleLearnMore = () => {
    setViewMode('guide')
  }

  const handleGuideComplete = () => {
    setViewMode('overview')
    // Mark notification as acknowledged
    if (pendingNotification) {
      dismissNotification(pendingNotification.id)
    }
  }

  const handleDismiss = () => {
    if (pendingNotification) {
      dismissNotification(pendingNotification.id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  // Not eligible and not approaching - redirect to dashboard
  if (!isEligible && !isApproaching) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Age 16 Transition</h1>
          <p className="text-gray-600 mb-6">
            These features will become available when you turn 16. Check back closer to your
            birthday!
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={handleBack}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {viewMode === 'guide' ? 'Transition Guide' : 'Your 16th Birthday'}
          </h1>
          <p className="text-gray-500">
            {isEligible ? 'New features are available' : `${daysUntil16} days until your birthday`}
          </p>
        </div>
      </div>

      {/* Guide View */}
      {viewMode === 'guide' && (
        <TransitionGuide onComplete={handleGuideComplete} onBack={handleBack} />
      )}

      {/* Overview View */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Notification Card */}
          {pendingNotification && (
            <TransitionNotificationCard
              daysUntil16={daysUntil16}
              notificationType={pendingNotification.type}
              onLearnMore={handleLearnMore}
              onDismiss={handleDismiss}
            />
          )}

          {/* Quick access to guide if no notification */}
          {!pendingNotification && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">About Your New Features</h2>
              <p className="text-gray-600 mb-4">
                Learn about Reverse Mode, Trusted Adults, and your new privacy controls.
              </p>
              <button
                onClick={handleLearnMore}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                View Guide
              </button>
            </div>
          )}

          {/* Feature Overview */}
          <div className="bg-white rounded-xl shadow divide-y">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">What You Can Do</h2>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </span>
                  <div>
                    <h3 className="font-medium text-gray-900">Activate Reverse Mode</h3>
                    <p className="text-sm text-gray-500">
                      Take control of what your parents can see
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </span>
                  <div>
                    <h3 className="font-medium text-gray-900">Add Trusted Adults</h3>
                    <p className="text-sm text-gray-500">
                      Invite up to 3 trusted adults (teacher, counselor, mentor)
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </span>
                  <div>
                    <h3 className="font-medium text-gray-900">Control Your Privacy</h3>
                    <p className="text-sm text-gray-500">
                      Choose exactly what to share and with whom
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Important Notes */}
            <div className="p-6 bg-gray-50">
              <h3 className="font-medium text-gray-900 mb-2">Good to Know</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>These features are optional - no action required</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>You can change your settings anytime</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Crisis resources remain always available</span>
                </li>
              </ul>
            </div>
          </div>

          {/* External Resources */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Learn More</h2>
            <div className="space-y-3">
              <a
                href="/help/reverse-mode"
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-900">Understanding Reverse Mode</span>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </a>
              <a
                href="/help/trusted-adults"
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-900">Guide to Trusted Adults</span>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </a>
              <a
                href="/help/privacy-rights"
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-900">Your Privacy Rights</span>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
