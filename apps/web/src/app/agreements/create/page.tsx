'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getTemplateById } from '@fledgely/contracts'

/**
 * Agreement Co-Creation Placeholder Page
 *
 * Story 4.3: Template Preview & Selection - Task 3.4
 *
 * This is a placeholder page that will be fully implemented in Epic 5.
 * It receives the selected template ID from the URL and displays
 * a confirmation message.
 *
 * Epic 5 will replace this with the full co-creation experience.
 */

function CreateAgreementContent() {
  const searchParams = useSearchParams()
  const templateId = searchParams.get('templateId')
  const childId = searchParams.get('childId')

  // Try to get template details
  const template = templateId ? getTemplateById(templateId) : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        {/* Header */}
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600 dark:text-green-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Agreement Co-Creation
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Template selected successfully!
          </p>
        </div>

        {/* Template Info */}
        {template ? (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-left">
            <h2 className="font-medium text-blue-800 dark:text-blue-200">
              Selected Template
            </h2>
            <p className="mt-1 text-blue-700 dark:text-blue-300 font-semibold">
              {template.name}
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              {template.description}
            </p>
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-2">
              Template ID: {templateId}
            </p>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg text-left">
            <h2 className="font-medium text-yellow-800 dark:text-yellow-200">
              Template Information
            </h2>
            <p className="mt-1 text-yellow-700 dark:text-yellow-300">
              Template ID: {templateId || 'Not specified'}
            </p>
            {!templateId && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                No template was selected. Please go back and choose a template.
              </p>
            )}
          </div>
        )}

        {/* Child ID (if provided) */}
        {childId && (
          <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-left">
            <h2 className="font-medium text-purple-800 dark:text-purple-200">
              Creating for Child
            </h2>
            <p className="mt-1 text-sm text-purple-700 dark:text-purple-300">
              Child ID: {childId}
            </p>
          </div>
        )}

        {/* Coming Soon Notice */}
        <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <p className="text-gray-600 dark:text-gray-300 font-medium">
            🚧 Coming in Epic 5
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            The full agreement co-creation experience will be implemented in Epic 5.
            You'll be able to work with your child to customize and finalize the agreement.
          </p>
        </div>

        {/* Navigation */}
        <div className="space-y-3">
          <Link
            href="/templates"
            className="block w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Back to Template Library
          </Link>
          <Link
            href="/dashboard"
            className="block w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CreateAgreementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <CreateAgreementContent />
    </Suspense>
  )
}
