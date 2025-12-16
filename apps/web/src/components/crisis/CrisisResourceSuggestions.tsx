'use client'

/**
 * CrisisResourceSuggestions Component
 *
 * Story 7.6: Crisis Search Redirection - Task 6
 *
 * Displays crisis resources filtered by detected category.
 * Shows resource name, description, and contact methods.
 * All links open in new tab with noopener.
 *
 * CRITICAL: This is a zero-data-path feature.
 * - NO logging of any kind
 * - NO analytics events
 * - NO network calls from this component
 */

import { Phone, MessageSquare, Globe, ExternalLink } from 'lucide-react'
import type { CrisisSearchCategory } from '@fledgely/contracts'

/**
 * Resource information for display
 */
export interface CrisisResourceInfo {
  name: string
  domain: string
  description: string
  phone?: string
  text?: string
  chatUrl?: string
}

/**
 * Resource database by domain
 * Data stored locally - NO network requests
 */
export const CRISIS_RESOURCE_DATABASE: Record<string, CrisisResourceInfo> = {
  '988lifeline.org': {
    name: '988 Suicide & Crisis Lifeline',
    domain: '988lifeline.org',
    description: 'Free, confidential support available 24/7',
    phone: '988',
    text: '988',
    chatUrl: 'https://988lifeline.org/chat',
  },
  'crisistextline.org': {
    name: 'Crisis Text Line',
    domain: 'crisistextline.org',
    description: 'Text with a trained crisis counselor',
    text: 'HOME to 741741',
    chatUrl: 'https://crisistextline.org',
  },
  'rainn.org': {
    name: 'RAINN',
    domain: 'rainn.org',
    description: 'Support for survivors of sexual violence',
    phone: '1-800-656-4673',
    chatUrl: 'https://rainn.org/get-help',
  },
  'childhelp.org': {
    name: 'Childhelp National Hotline',
    domain: 'childhelp.org',
    description: 'Help for children experiencing abuse',
    phone: '1-800-422-4453',
  },
  'thehotline.org': {
    name: 'National Domestic Violence Hotline',
    domain: 'thehotline.org',
    description: 'Support for domestic violence situations',
    phone: '1-800-799-7233',
    text: 'START to 88788',
    chatUrl: 'https://thehotline.org/get-help/contact-the-hotline/',
  },
  'selfinjury.com': {
    name: 'Self-Injury Outreach & Support',
    domain: 'selfinjury.com',
    description: 'Non-judgmental support for self-injury',
  },
  'sioutreach.org': {
    name: 'SIOS',
    domain: 'sioutreach.org',
    description: 'Peer support for self-injury recovery',
  },
  '1800runaway.org': {
    name: 'National Runaway Safeline',
    domain: '1800runaway.org',
    description: 'Help for youth in crisis',
    phone: '1-800-786-2929',
    text: 'HELLO to 66008',
    chatUrl: 'https://1800runaway.org/',
  },
  'boystown.org': {
    name: 'Boys Town Hotline',
    domain: 'boystown.org',
    description: 'Help for kids and parents',
    phone: '1-800-448-3000',
  },
  'suicidepreventionlifeline.org': {
    name: 'Suicide Prevention Lifeline',
    domain: 'suicidepreventionlifeline.org',
    description: 'Redirects to 988 Lifeline',
    phone: '988',
    text: '988',
    chatUrl: 'https://988lifeline.org/chat',
  },
  'thetrevoproject.org': {
    name: 'The Trevor Project',
    domain: 'thetrevoproject.org',
    description: 'LGBTQ+ youth crisis support',
    phone: '1-866-488-7386',
    text: 'START to 678-678',
    chatUrl: 'https://thetrevoproject.org/get-help/',
  },
  'stopitnow.org': {
    name: 'Stop It Now!',
    domain: 'stopitnow.org',
    description: 'Prevent child sexual abuse',
    phone: '1-888-773-8368',
  },
}

/**
 * Category-specific primary resources
 */
const CATEGORY_PRIMARY_RESOURCES: Record<CrisisSearchCategory, string[]> = {
  suicide: ['988lifeline.org', 'crisistextline.org', 'thetrevoproject.org'],
  self_harm: ['988lifeline.org', 'crisistextline.org', 'selfinjury.com'],
  abuse: ['rainn.org', 'childhelp.org', 'thehotline.org'],
  help: ['988lifeline.org', 'crisistextline.org', '1800runaway.org'],
}

interface CrisisResourceSuggestionsProps {
  /** Category of crisis detected */
  category?: CrisisSearchCategory
  /** Specific resource domains to display (overrides category defaults) */
  resourceDomains?: string[]
  /** Maximum number of resources to show */
  maxResources?: number
  /** Called when a resource is clicked (optional, for tracking purposes) */
  onResourceClick?: (domain: string) => void
  /** Compact mode reduces spacing */
  compact?: boolean
}

/**
 * Get resource info from domain, or create placeholder
 */
export function getResourceInfo(domain: string): CrisisResourceInfo {
  return (
    CRISIS_RESOURCE_DATABASE[domain] || {
      name: domain,
      domain,
      description: 'Crisis support resource',
    }
  )
}

/**
 * Get resources for a category
 */
export function getResourcesForCategoryUI(category: CrisisSearchCategory): CrisisResourceInfo[] {
  const domains = CATEGORY_PRIMARY_RESOURCES[category] || CATEGORY_PRIMARY_RESOURCES.help
  return domains.map(getResourceInfo)
}

/**
 * Quick action button for phone calls
 */
function PhoneButton({ phone }: { phone: string }) {
  return (
    <a
      href={`tel:${phone.replace(/[^0-9]/g, '')}`}
      className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
      onClick={(e) => e.stopPropagation()}
    >
      <Phone className="h-4 w-4" />
      Call {phone}
    </a>
  )
}

/**
 * Quick action button for text/SMS
 */
function TextButton({ text }: { text: string }) {
  // Parse SMS text format like "HOME to 741741"
  const match = text.match(/(.+) to (\d+)/)
  const smsUrl = match ? `sms:${match[2]}?body=${encodeURIComponent(match[1])}` : `sms:${text}`

  return (
    <a
      href={smsUrl}
      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      onClick={(e) => e.stopPropagation()}
    >
      <MessageSquare className="h-4 w-4" />
      Text {text}
    </a>
  )
}

/**
 * Quick action button for chat
 */
function ChatButton({ chatUrl }: { chatUrl: string }) {
  return (
    <a
      href={chatUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
      onClick={(e) => e.stopPropagation()}
    >
      <Globe className="h-4 w-4" />
      Chat
    </a>
  )
}

/**
 * Individual resource card component
 */
function ResourceCard({
  resource,
  onResourceClick,
  compact = false,
}: {
  resource: CrisisResourceInfo
  onResourceClick?: (domain: string) => void
  compact?: boolean
}) {
  const handleClick = () => {
    if (onResourceClick) {
      onResourceClick(resource.domain)
    }
    window.open(`https://${resource.domain}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      role="article"
      className={`rounded-lg border border-gray-200 bg-white transition-all hover:border-blue-300 hover:shadow-md ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      {/* Resource info */}
      <button
        type="button"
        onClick={handleClick}
        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
              {resource.name}
            </h3>
            <p className={`text-gray-500 ${compact ? 'text-xs mt-0.5' : 'text-sm mt-1'}`}>
              {resource.description}
            </p>
          </div>
          <ExternalLink className={`ml-2 flex-shrink-0 text-gray-400 ${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
        </div>
      </button>

      {/* Quick action buttons */}
      <div className={`flex flex-wrap gap-2 ${compact ? 'mt-2' : 'mt-3'}`}>
        {resource.phone && <PhoneButton phone={resource.phone} />}
        {resource.text && <TextButton text={resource.text} />}
        {resource.chatUrl && <ChatButton chatUrl={resource.chatUrl} />}
      </div>
    </div>
  )
}

/**
 * Crisis Resource Suggestions Component
 *
 * Displays crisis resources filtered by category with quick-access buttons
 * for phone, text, and chat contact methods.
 */
export function CrisisResourceSuggestions({
  category,
  resourceDomains,
  maxResources = 3,
  onResourceClick,
  compact = false,
}: CrisisResourceSuggestionsProps) {
  // Get resources based on domains or category
  let resources: CrisisResourceInfo[]

  if (resourceDomains && resourceDomains.length > 0) {
    resources = resourceDomains.map(getResourceInfo)
  } else if (category) {
    resources = getResourcesForCategoryUI(category)
  } else {
    // Default to general help resources
    resources = getResourcesForCategoryUI('help')
  }

  // Limit to max resources
  resources = resources.slice(0, maxResources)

  // Ensure we always have at least the 988 Lifeline
  if (resources.length === 0) {
    resources = [CRISIS_RESOURCE_DATABASE['988lifeline.org']]
  }

  return (
    <div
      role="region"
      aria-label="Crisis resources"
      className={`space-y-${compact ? '2' : '3'}`}
    >
      {resources.map((resource) => (
        <ResourceCard
          key={resource.domain}
          resource={resource}
          onResourceClick={onResourceClick}
          compact={compact}
        />
      ))}
    </div>
  )
}
