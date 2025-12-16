/**
 * Resource Card Component
 *
 * Story 7.3: Child Allowlist Visibility - Task 3.1
 *
 * Displays a single crisis resource with clickable link,
 * contact methods, and "Always Private" badge.
 */

import { ExternalLink, Phone, MessageCircle, Globe } from 'lucide-react'
import type { CrisisUrlEntry, ContactMethod } from '@fledgely/shared'

interface ResourceCardProps {
  resource: CrisisUrlEntry
  className?: string
}

/**
 * Maps contact methods to their icons and labels
 */
const contactMethodConfig: Record<
  ContactMethod,
  { icon: typeof Phone; label: string }
> = {
  phone: { icon: Phone, label: 'Call' },
  text: { icon: MessageCircle, label: 'Text' },
  chat: { icon: MessageCircle, label: 'Chat' },
  web: { icon: Globe, label: 'Website' },
}

/**
 * ResourceCard displays a single crisis resource
 *
 * Features:
 * - Clickable link to resource (target="_blank")
 * - Contact method icons
 * - "Always Private" badge
 * - Phone/text numbers when available
 */
export function ResourceCard({ resource, className = '' }: ResourceCardProps) {
  const resourceUrl = `https://${resource.domain}`

  return (
    <article
      className={`rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50 ${className}`}
      aria-labelledby={`resource-${resource.id}-name`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          {/* Resource name and link */}
          <div className="flex items-center gap-2">
            <a
              href={resourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              id={`resource-${resource.id}-name`}
              className="text-lg font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-describedby={`resource-${resource.id}-desc`}
            >
              {resource.name}
              <ExternalLink
                className="ml-1 inline-block h-4 w-4"
                aria-hidden="true"
              />
              <span className="sr-only">(opens in new window)</span>
            </a>
          </div>

          {/* Description */}
          <p
            id={`resource-${resource.id}-desc`}
            className="text-sm text-muted-foreground"
          >
            {resource.description}
          </p>

          {/* Contact methods */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {resource.contactMethods.map((method) => {
              const config = contactMethodConfig[method]
              const Icon = config.icon
              return (
                <span
                  key={method}
                  className="flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <Icon className="h-3 w-3" aria-hidden="true" />
                  <span>{config.label}</span>
                </span>
              )
            })}

            {/* Phone number */}
            {resource.phoneNumber && (
              <a
                href={`tel:${resource.phoneNumber.replace(/\D/g, '')}`}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                aria-label={`Call ${resource.name} at ${resource.phoneNumber}`}
              >
                <Phone className="h-3 w-3" aria-hidden="true" />
                <span>{resource.phoneNumber}</span>
              </a>
            )}

            {/* Text number */}
            {resource.textNumber && (
              <a
                href={`sms:${resource.textNumber}`}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                aria-label={`Text ${resource.name} at ${resource.textNumber}`}
              >
                <MessageCircle className="h-3 w-3" aria-hidden="true" />
                <span>Text {resource.textNumber}</span>
              </a>
            )}
          </div>
        </div>

        {/* Always Private badge */}
        <div
          className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
          aria-label="This resource is always private"
        >
          Always Private
        </div>
      </div>
    </article>
  )
}
