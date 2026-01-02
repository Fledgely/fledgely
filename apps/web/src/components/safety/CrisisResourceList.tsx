/**
 * CrisisResourceList Component - Story 7.5.3 Task 5
 *
 * Displays crisis resources with direct links.
 * AC2: Crisis resources with direct links
 * AC4: Crisis chat option
 *
 * CRITICAL: Resources must have working direct links.
 * Chat option must be clearly available when supported.
 */

'use client'

import { useMemo, useCallback } from 'react'
import type { SignalCrisisResource } from '@fledgely/shared'

export interface CrisisResourceListProps {
  /** Crisis resources to display */
  resources: SignalCrisisResource[]
  /** Called when user clicks a resource link */
  onResourceClick?: (resource: SignalCrisisResource) => void
  /** Called when user clicks chat option */
  onChatClick?: (resource: SignalCrisisResource) => void
  /** Show only resources with chat available */
  chatOnly?: boolean
  /** Filter by resource type (matches RESOURCE_TYPE values) */
  typeFilter?: 'phone' | 'text' | 'website' | 'chat'
  /** Maximum items to display */
  maxItems?: number
  /** Use compact layout */
  compact?: boolean
  /** Additional CSS class */
  className?: string
}

/** Icons for different resource types */
const ResourceTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'phone':
      return (
        <span data-testid="resource-type-phone" className="text-lg">
          📞
        </span>
      )
    case 'text':
      return (
        <span data-testid="resource-type-text" className="text-lg">
          💬
        </span>
      )
    case 'website':
      return (
        <span data-testid="resource-type-website" className="text-lg">
          🌐
        </span>
      )
    case 'chat':
      return (
        <span data-testid="resource-type-chat" className="text-lg">
          💭
        </span>
      )
    default:
      return (
        <span data-testid="resource-type-default" className="text-lg">
          ℹ️
        </span>
      )
  }
}

/**
 * Validate and sanitize phone number for tel: links.
 * Only allows digits, spaces, dashes, parentheses, and plus sign.
 */
function sanitizePhoneNumber(value: string): string {
  const cleaned = value.replace(/[^\d\s\-()+ ]/g, '')
  if (!/^[\d\s\-()+ ]+$/.test(cleaned)) {
    console.error('[SECURITY] Invalid phone number format:', value)
    return ''
  }
  return cleaned
}

/**
 * Validate URL is safe (only https/http protocols).
 */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      console.error('[SECURITY] Unsafe URL protocol:', url)
      return '#'
    }
    return url
  } catch {
    console.error('[SECURITY] Invalid URL:', url)
    return '#'
  }
}

/**
 * Generate the appropriate href for a resource (with security validation).
 */
function getResourceHref(resource: SignalCrisisResource): string {
  switch (resource.type) {
    case 'phone': {
      const phone = sanitizePhoneNumber(resource.value)
      return phone ? `tel:${phone}` : '#'
    }
    case 'text': {
      const smsNumber = sanitizePhoneNumber(resource.value)
      return smsNumber ? `sms:${smsNumber}?body=HOME` : '#'
    }
    case 'website':
    case 'chat':
      return sanitizeUrl(resource.value)
    default:
      return '#'
  }
}

/**
 * Crisis Resource List Component
 *
 * A list of crisis resources with direct links to call,
 * text, or visit websites.
 */
export default function CrisisResourceList({
  resources,
  onResourceClick,
  onChatClick,
  chatOnly = false,
  typeFilter,
  maxItems,
  compact = false,
  className = '',
}: CrisisResourceListProps) {
  // Filter and limit resources
  const displayResources = useMemo(() => {
    let filtered = [...resources]

    // Sort by priority
    filtered.sort((a, b) => a.priority - b.priority)

    // Filter chat only
    if (chatOnly) {
      filtered = filtered.filter((r) => r.chatAvailable)
    }

    // Filter by type
    if (typeFilter) {
      filtered = filtered.filter((r) => r.type === typeFilter)
    }

    // Limit items
    if (maxItems && maxItems > 0) {
      filtered = filtered.slice(0, maxItems)
    }

    return filtered
  }, [resources, chatOnly, typeFilter, maxItems])

  const handleResourceClick = useCallback(
    (resource: SignalCrisisResource) => {
      onResourceClick?.(resource)
    },
    [onResourceClick]
  )

  const handleChatClick = useCallback(
    (resource: SignalCrisisResource) => {
      onChatClick?.(resource)
    },
    [onChatClick]
  )

  if (displayResources.length === 0) {
    return <div className={`text-center text-gray-500 ${className}`}>No resources available</div>
  }

  const itemPadding = compact ? 'p-2' : 'p-4'

  return (
    <ul className={`space-y-2 ${className}`} role="list">
      {displayResources.map((resource) => {
        const href = getResourceHref(resource)
        const isExternal = resource.type === 'website'

        return (
          <li
            key={resource.id}
            className={`rounded-lg border border-gray-200 ${itemPadding} transition-colors hover:bg-gray-50`}
          >
            <div className="flex items-start gap-3">
              {/* Resource type icon */}
              <div className="flex-shrink-0 pt-1">
                <ResourceTypeIcon type={resource.type} />
              </div>

              {/* Resource content */}
              <div className="min-w-0 flex-1">
                {/* Name as link */}
                <a
                  href={href}
                  onClick={() => handleResourceClick(resource)}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  className="block font-medium text-gray-900 hover:text-blue-600"
                >
                  {resource.name}
                </a>

                {/* Description */}
                <p className="mt-1 text-sm text-gray-600">{resource.description}</p>

                {/* 24/7 badge */}
                {resource.available24x7 && (
                  <span className="mt-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    24/7
                  </span>
                )}
              </div>

              {/* Chat button */}
              {resource.chatAvailable && (
                <button
                  type="button"
                  onClick={() => handleChatClick(resource)}
                  aria-label={`Chat with ${resource.name}`}
                  className="flex-shrink-0 rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-800 transition-colors hover:bg-blue-200"
                >
                  Chat
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
