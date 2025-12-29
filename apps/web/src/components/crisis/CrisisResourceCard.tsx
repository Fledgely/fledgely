/**
 * CrisisResourceCard Component
 *
 * Story 7.3: Child Allowlist Visibility - AC2, AC3
 *
 * Displays a single crisis resource with:
 * - Resource name
 * - Description (what it helps with)
 * - "Always Private" badge
 * - Phone and text options when available
 * - Clickable link opening in new tab
 *
 * Requirements:
 * - NFR65: 6th-grade reading level (descriptions from shared package)
 * - NFR42: WCAG 2.1 AA compliance
 * - NFR49: 44px+ touch targets
 */

import type { CrisisResource } from '@fledgely/shared'

/**
 * Validates that a domain is safe for use in href.
 * Protects against injection attacks and malformed domains.
 */
function isValidDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') return false

  // Check for dangerous protocols or patterns
  const dangerousPatterns = /^(javascript|data|file|vbscript|about):/i
  const invalidChars = /[<>"'`\s]/

  if (dangerousPatterns.test(domain) || invalidChars.test(domain)) {
    return false
  }

  // Validate domain format (basic DNS name validation)
  // Allow alphanumeric, hyphens, dots, and TLDs
  const domainPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i
  return domainPattern.test(domain)
}

/**
 * Sanitizes and validates a phone number for use in tel: href.
 * Returns null if phone number is invalid.
 */
function sanitizePhoneNumber(phone: string): string | null {
  if (!phone || typeof phone !== 'string') return null

  // Extract only digits
  const digits = phone.replace(/[^\d]/g, '')

  // Validate reasonable phone number length (3-15 digits for various formats)
  // 3 for emergency numbers like 988, 911
  // 15 for international numbers
  if (digits.length < 3 || digits.length > 15) {
    return null
  }

  return digits
}

interface CrisisResourceCardProps {
  /** The crisis resource to display */
  resource: CrisisResource
  /** Optional additional CSS class name */
  className?: string
}

const styles = {
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '8px',
  },
  name: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
    lineHeight: 1.3,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#dcfce7',
    color: '#065f46', // Darker green for WCAG 2.1 AA contrast (4.5:1+)
    fontSize: '12px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '9999px',
    whiteSpace: 'nowrap' as const,
  },
  lockIcon: {
    width: '12px',
    height: '12px',
  },
  description: {
    fontSize: '15px',
    color: '#4b5563',
    margin: '0 0 12px 0',
    lineHeight: 1.5,
  },
  contactInfo: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '12px',
    marginBottom: '12px',
  },
  contactLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    minHeight: '44px',
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '8px',
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  contactLinkHover: {
    backgroundColor: '#e5e7eb',
  },
  contactLinkFocus: {
    outline: '2px solid #4F46E5',
    outlineOffset: '2px',
  },
  textInfo: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    minHeight: '44px',
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '8px',
  },
  visitLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    minHeight: '44px',
    padding: '10px 20px',
    backgroundColor: '#4F46E5',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 500,
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'background-color 0.2s',
  },
  visitLinkHover: {
    backgroundColor: '#4338ca',
  },
  visitLinkFocus: {
    outline: '2px solid #4F46E5',
    outlineOffset: '2px',
  },
  icon: {
    width: '16px',
    height: '16px',
  },
}

/** Lock icon for "Always Private" badge */
function LockIcon() {
  return (
    <svg style={styles.lockIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/** Phone icon */
function PhoneIcon() {
  return (
    <svg style={styles.icon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
    </svg>
  )
}

/** Message/text icon */
function TextIcon() {
  return (
    <svg style={styles.icon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/** External link icon */
function ExternalLinkIcon() {
  return (
    <svg style={styles.icon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
    </svg>
  )
}

/**
 * CrisisResourceCard - Displays a single crisis resource for children.
 *
 * Features:
 * - Shows resource name and description
 * - "Always Private" badge with lock icon
 * - Phone number link (when available)
 * - Text option display (when available)
 * - Website link opening in new tab
 * - Accessible with ARIA labels
 * - 44px+ touch targets for all interactive elements
 */
export function CrisisResourceCard({ resource, className }: CrisisResourceCardProps) {
  const cardClassName = className ? `crisis-resource-card ${className}` : 'crisis-resource-card'

  return (
    <article
      className={cardClassName}
      style={styles.card}
      aria-labelledby={`resource-${resource.id}`}
    >
      <div style={styles.header}>
        <h3 id={`resource-${resource.id}`} style={styles.name}>
          {resource.name}
        </h3>
        <span style={styles.badge} aria-label="This resource is always private">
          <LockIcon />
          Always Private
        </span>
      </div>

      <p style={styles.description}>{resource.description}</p>

      {(resource.phone || resource.text) && (
        <div style={styles.contactInfo} role="group" aria-label="Contact options">
          {resource.phone &&
            (() => {
              const sanitizedPhone = sanitizePhoneNumber(resource.phone)
              if (!sanitizedPhone) return null

              return (
                <a
                  href={`tel:${sanitizedPhone}`}
                  style={styles.contactLink}
                  aria-label={`Call ${resource.name} at ${resource.phone}`}
                >
                  <PhoneIcon />
                  Call: {resource.phone}
                </a>
              )
            })()}
          {resource.text && (
            <span style={styles.textInfo} aria-label={`Text option: ${resource.text}`}>
              <TextIcon />
              {resource.text}
            </span>
          )}
        </div>
      )}

      {isValidDomain(resource.domain) ? (
        <a
          href={`https://${resource.domain}`}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.visitLink}
          aria-label={`Visit ${resource.name} website (opens in new tab)`}
        >
          <ExternalLinkIcon />
          Visit Website
        </a>
      ) : (
        <span
          style={{ ...styles.visitLink, opacity: 0.5, cursor: 'not-allowed' }}
          aria-label="Website unavailable"
        >
          <ExternalLinkIcon />
          Website Unavailable
        </span>
      )}
    </article>
  )
}

export default CrisisResourceCard
