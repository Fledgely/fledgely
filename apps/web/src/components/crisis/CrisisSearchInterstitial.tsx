'use client'

/**
 * CrisisSearchInterstitial Component
 *
 * Story 7.6: Crisis Search Redirection - Task 3
 *
 * Displays a gentle, non-alarming interstitial when a child searches
 * for crisis-related terms. Shows helpful resources while allowing
 * the child to continue to search results.
 *
 * CRITICAL: This is a zero-data-path feature.
 * - NO logging of any kind
 * - NO analytics events
 * - NO network calls from this component
 * - Content is age-appropriate and non-alarming
 */

import { useId, useEffect, useRef } from 'react'
import type { CrisisSearchMatch } from '@fledgely/contracts'
import { Button } from '@/components/ui/button'
import { Phone, MessageSquare, ExternalLink } from 'lucide-react'
import { CRISIS_RESOURCE_DATABASE, getResourceInfo } from './CrisisResourceSuggestions'
import type { CrisisResourceInfo } from './CrisisResourceSuggestions'

interface CrisisSearchInterstitialProps {
  /** The crisis search match result */
  match: CrisisSearchMatch
  /** Suggested resource domains for this category */
  suggestedResources: string[]
  /** Called when user clicks "Continue to Search" */
  onContinue: () => void
  /** Called when user clicks a resource link */
  onResourceClick: (resource: string) => void
}

export function CrisisSearchInterstitial({
  match,
  suggestedResources,
  onContinue,
  onResourceClick,
}: CrisisSearchInterstitialProps) {
  const titleId = useId()
  const descId = useId()
  const firstFocusRef = useRef<HTMLAnchorElement>(null)

  // Focus first resource link on mount for accessibility
  useEffect(() => {
    if (firstFocusRef.current) {
      firstFocusRef.current.focus()
    }
  }, [])

  // Get resource details for display
  const resources = suggestedResources.map(getResourceInfo).slice(0, 3)

  // Add 988 Lifeline if not already included (always show primary resource)
  if (!suggestedResources.includes('988lifeline.org') && resources.length < 3) {
    resources.unshift(CRISIS_RESOURCE_DATABASE['988lifeline.org'])
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <div className="mx-4 max-w-lg rounded-lg bg-white p-6 shadow-xl">
        {/* Header - Age-appropriate, non-alarming */}
        <h2
          id={titleId}
          className="mb-2 text-xl font-semibold text-gray-900"
        >
          We noticed you might be looking for some help
        </h2>

        {/* Description - Reassuring and private */}
        <p
          id={descId}
          className="mb-4 text-gray-600"
        >
          These resources are available 24/7 and are completely private — no one in your family
          can see that you visited them.
        </p>

        {/* Resource cards */}
        <div className="mb-6 space-y-3">
          {resources.map((resource, index) => (
            <a
              key={resource.domain}
              ref={index === 0 ? firstFocusRef : undefined}
              href={`https://${resource.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault()
                onResourceClick(resource.domain)
                window.open(`https://${resource.domain}`, '_blank', 'noopener,noreferrer')
              }}
              className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{resource.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{resource.description}</p>

                  {/* Contact methods */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {resource.phone && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                        <Phone className="h-3 w-3" />
                        {resource.phone}
                      </span>
                    )}
                    {resource.text && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                        <MessageSquare className="h-3 w-3" />
                        Text {resource.text}
                      </span>
                    )}
                    {resource.chatUrl && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800">
                        Chat available
                      </span>
                    )}
                  </div>
                </div>
                <ExternalLink className="ml-2 h-4 w-4 flex-shrink-0 text-gray-400" />
              </div>
            </a>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <a
            href="/protected-resources"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={(e) => {
              e.preventDefault()
              onResourceClick('protected-resources')
              window.location.href = '/protected-resources'
            }}
          >
            View More Resources
          </a>

          <Button
            variant="outline"
            onClick={onContinue}
            className="text-gray-600"
          >
            Continue to Search
          </Button>
        </div>
      </div>
    </div>
  )
}
