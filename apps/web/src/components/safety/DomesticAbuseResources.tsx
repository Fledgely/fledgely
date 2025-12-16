'use client'

import { Phone, MessageSquare, ExternalLink } from 'lucide-react'

/**
 * Props for the DomesticAbuseResources component
 */
export interface DomesticAbuseResourcesProps {
  /** Additional class names */
  className?: string
  /** Whether to show compact version */
  compact?: boolean
}

/**
 * DomesticAbuseResources Component
 *
 * Displays domestic abuse support resources after self-removal.
 * These resources may be the last touchpoint before someone exits the app.
 *
 * Resources shown:
 * - National Domestic Violence Hotline: 1-800-799-7233
 * - Text START to 88788
 * - thehotline.org
 *
 * Story 2.8: Unilateral Self-Removal (Survivor Escape)
 *
 * Accessibility:
 * - Semantic HTML with proper link roles
 * - High contrast colors
 * - Touch targets >= 44x44px (NFR49)
 * - 6th-grade reading level (NFR65)
 */
export function DomesticAbuseResources({
  className = '',
  compact = false,
}: DomesticAbuseResourcesProps) {
  if (compact) {
    return (
      <div
        className={`rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950 ${className}`}
        role="complementary"
        aria-label="Support resources"
      >
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Need help?{' '}
          <a
            href="tel:1-800-799-7233"
            className="min-h-[44px] min-w-[44px] font-semibold underline inline-flex items-center"
          >
            1-800-799-7233
          </a>{' '}
          or{' '}
          <a
            href="https://www.thehotline.org"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] min-w-[44px] font-semibold underline inline-flex items-center"
          >
            thehotline.org
          </a>
        </p>
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950 ${className}`}
      role="complementary"
      aria-label="Support resources"
    >
      <h3 className="font-semibold text-blue-900 dark:text-blue-100">
        Support Resources
      </h3>
      <p className="mt-2 text-sm text-blue-800 dark:text-blue-200">
        If you are in an unsafe situation, help is available:
      </p>

      <ul className="mt-3 space-y-3">
        <li>
          <a
            href="tel:1-800-799-7233"
            className="flex min-h-[44px] items-center gap-2 rounded-md p-2 text-sm text-blue-800 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-200 dark:hover:bg-blue-900"
          >
            <Phone className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span>
              <strong>National Domestic Violence Hotline:</strong>
              <br />
              1-800-799-7233
            </span>
          </a>
        </li>
        <li>
          <a
            href="sms:88788?body=START"
            className="flex min-h-[44px] items-center gap-2 rounded-md p-2 text-sm text-blue-800 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-200 dark:hover:bg-blue-900"
          >
            <MessageSquare className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span>
              <strong>Text for help:</strong>
              <br />
              Text START to 88788
            </span>
          </a>
        </li>
        <li>
          <a
            href="https://www.thehotline.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[44px] items-center gap-2 rounded-md p-2 text-sm text-blue-800 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-200 dark:hover:bg-blue-900"
          >
            <ExternalLink className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span>
              <strong>Online chat:</strong>
              <br />
              thehotline.org
            </span>
          </a>
        </li>
      </ul>

      <p className="mt-4 text-xs text-blue-700 dark:text-blue-300">
        Your safety matters. These resources are confidential. You can also reach our support team
        using the Safety Contact feature.
      </p>
    </div>
  )
}
