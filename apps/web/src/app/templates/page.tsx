'use client'

/**
 * Template Library Page.
 *
 * Story 4.1: Template Library Structure - AC1, AC5
 *
 * Displays browsable template library for family agreements.
 * Protected route - requires authentication.
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../contexts/AuthContext'
import { TemplateLibrary } from '../../components/templates'
import type { AgreementTemplate } from '@fledgely/shared/contracts'

export default function TemplatesPage() {
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()
  const [selectedTemplate, setSelectedTemplate] = useState<AgreementTemplate | null>(null)

  // Handle template selection
  const handleSelectTemplate = useCallback((template: AgreementTemplate) => {
    setSelectedTemplate(template)
  }, [])

  // Handle template confirmation (for future use - will navigate to customization)
  const handleConfirmSelection = useCallback(() => {
    if (selectedTemplate) {
      // TODO: Navigate to template customization page
      // Story 4.2+ will implement template customization flow
    }
  }, [selectedTemplate])

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-r-transparent" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!firebaseUser) {
    router.push('/login')
    return null
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Back to dashboard"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Template Library</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page intro */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Template</h2>
          <p className="text-gray-600">
            Browse our collection of age-appropriate agreement templates. Each template includes
            screen time limits, monitoring settings, and key rules that you can customize for your
            family.
          </p>
        </div>

        {/* Template Library */}
        <TemplateLibrary
          onSelectTemplate={handleSelectTemplate}
          selectedTemplateId={selectedTemplate?.id}
        />

        {/* Selection confirmation footer */}
        {selectedTemplate && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Selected template</p>
                <p className="font-medium text-gray-900">{selectedTemplate.name}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px]"
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSelection}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px]"
                >
                  Continue with Template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
