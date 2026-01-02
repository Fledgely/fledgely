/**
 * CrisisAllowlistView Component
 *
 * Story 7.3: Child Allowlist Visibility - AC1, AC5, AC6, AC7
 * Story 7.5.1: Hidden Safety Signal Access - AC1 (signal documentation)
 *
 * Main view displaying all crisis resources organized by category for children.
 *
 * Features:
 * - Secret Help Button instructions (Story 7.5.1)
 * - Prominent privacy message header
 * - Resources grouped by category
 * - Category headers with icons
 * - Accessible without parent notification
 * - Keyboard navigation support
 * - Skip-to-content link
 *
 * Requirements:
 * - NFR65: 6th-grade reading level
 * - NFR42: WCAG 2.1 AA compliance
 * - NFR49: 44px+ touch targets
 * - FR63: Child can view the complete crisis allowlist
 */

import { getResourcesByCategory, type CrisisResourceCategory } from '@fledgely/shared'
import { CrisisResourceCard } from './CrisisResourceCard'

interface CrisisAllowlistViewProps {
  /** Optional additional CSS class name */
  className?: string
}

/**
 * Category display configuration.
 * Ordered by criticality (most critical first).
 * Child-friendly names at 6th-grade reading level.
 */
const CATEGORY_CONFIG: Array<{
  category: CrisisResourceCategory
  friendlyName: string
  icon: string
  description: string
}> = [
  {
    category: 'suicide_prevention',
    friendlyName: 'Feeling Really Low',
    icon: '💙',
    description: 'Help when life feels too hard or you have thoughts of hurting yourself.',
  },
  {
    category: 'crisis_general',
    friendlyName: 'Need to Talk to Someone',
    icon: '💬',
    description: 'Someone to talk to when you are going through a hard time.',
  },
  {
    category: 'domestic_violence',
    friendlyName: "Home Isn't Safe",
    icon: '🏠',
    description: 'Help if someone at home is hurting you or making you feel unsafe.',
  },
  {
    category: 'child_abuse',
    friendlyName: 'Being Hurt by Adults',
    icon: '🛡️',
    description: 'Help if an adult is hurting you or doing things that feel wrong.',
  },
  {
    category: 'sexual_assault',
    friendlyName: 'Someone Hurt Me',
    icon: '💜',
    description: 'Help if someone touched you in a way that was not okay.',
  },
  {
    category: 'lgbtq_support',
    friendlyName: 'LGBTQ+ Support',
    icon: '🌈',
    description: 'Help for LGBTQ+ young people who need support or someone to talk to.',
  },
  {
    category: 'eating_disorder',
    friendlyName: 'Food & Body Stuff',
    icon: '💚',
    description: 'Help with eating, food, or how you feel about your body.',
  },
  {
    category: 'mental_health',
    friendlyName: 'Mental Health Support',
    icon: '🧠',
    description: 'Help with anxiety, depression, or other mental health challenges.',
  },
  {
    category: 'substance_abuse',
    friendlyName: 'Drugs & Alcohol Help',
    icon: '🤝',
    description: 'Help if you or someone you know is struggling with drugs or alcohol.',
  },
]

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  skipLink: {
    position: 'absolute' as const,
    left: '-9999px',
    top: 'auto',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
  },
  skipLinkFocus: {
    position: 'static' as const,
    width: 'auto',
    height: 'auto',
    padding: '12px 24px',
    backgroundColor: '#4F46E5',
    color: '#ffffff',
    textDecoration: 'none',
    borderRadius: '8px',
    display: 'inline-block',
    marginBottom: '16px',
  },
  // Secret Help Button Section - Story 7.5.1
  secretHelpBanner: {
    backgroundColor: '#fce7f3', // Light pink - reassuring
    border: '2px solid #ec4899',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  secretHelpIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  secretHelpTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#9d174d', // Dark pink for WCAG 2.1 AA contrast
    margin: '0 0 12px 0',
  },
  secretHelpInstructions: {
    fontSize: '16px',
    color: '#831843', // Dark pink for WCAG 2.1 AA contrast
    margin: '0 0 16px 0',
    lineHeight: 1.6,
  },
  secretHelpStep: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#fdf2f8',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  secretHelpStepNumber: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#ec4899',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '14px',
    flexShrink: 0,
  },
  secretHelpStepText: {
    fontSize: '15px',
    color: '#831843',
    fontWeight: 500,
    textAlign: 'left' as const,
  },
  secretHelpOr: {
    fontSize: '14px',
    color: '#9d174d',
    margin: '8px 0',
    fontStyle: 'italic' as const,
  },
  secretHelpReassurance: {
    fontSize: '15px',
    color: '#831843',
    fontWeight: 600,
    margin: '16px 0 0 0',
    padding: '12px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #f9a8d4',
  },
  privacyBanner: {
    backgroundColor: '#dcfce7',
    border: '2px solid #22c55e',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '32px',
    textAlign: 'center' as const,
  },
  privacyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  privacyTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#065f46', // Darker green for WCAG 2.1 AA contrast (4.5:1+)
    margin: '0 0 8px 0',
  },
  privacyMessage: {
    fontSize: '16px',
    color: '#047857', // Darker green for WCAG 2.1 AA contrast (4.5:1+)
    margin: 0,
    lineHeight: 1.5,
  },
  mainContent: {
    outline: 'none',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1f2937',
    margin: '0 0 8px 0',
    textAlign: 'center' as const,
  },
  pageSubtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: '0 0 32px 0',
    textAlign: 'center' as const,
  },
  categorySection: {
    marginBottom: '32px',
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '2px solid #e5e7eb',
  },
  categoryIcon: {
    fontSize: '24px',
    lineHeight: 1,
  },
  categoryName: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#374151',
    margin: 0,
  },
  categoryDescription: {
    fontSize: '14px',
    color: '#4b5563', // Darker gray for WCAG 2.1 AA contrast (4.5:1+)
    margin: '0 0 16px 0',
    paddingLeft: '36px',
  },
  resourceList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  resourceItem: {
    marginBottom: '12px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    backgroundColor: '#fef3c7',
    border: '2px solid #f59e0b',
    borderRadius: '12px',
  },
  emptyStateTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#92400e',
    marginBottom: '12px',
  },
  emptyStateText: {
    fontSize: '16px',
    color: '#78350f',
    marginBottom: '16px',
  },
  emergencyList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    textAlign: 'left' as const,
    maxWidth: '400px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  emergencyItem: {
    marginBottom: '12px',
    fontSize: '16px',
    color: '#78350f',
  },
  emergencyNumber: {
    fontWeight: 700,
    color: '#92400e',
  },
}

/**
 * CrisisAllowlistView - Main view for children to see all protected crisis resources.
 *
 * This view is accessible without parent knowledge (AC5).
 * No notifications are generated when this view is accessed.
 *
 * Features:
 * - Prominent "Always Private" message (AC6)
 * - Resources organized by category (AC1)
 * - Keyboard navigation with skip-to-content link (AC7)
 * - ARIA landmarks for screen readers
 */
export function CrisisAllowlistView({ className }: CrisisAllowlistViewProps) {
  const containerClassName = className
    ? `crisis-allowlist-view ${className}`
    : 'crisis-allowlist-view'

  // Filter categories that have at least one resource
  const categoriesWithResources = CATEGORY_CONFIG.filter((config) => {
    const resources = getResourcesByCategory(config.category)
    return resources.length > 0
  })

  return (
    <div className={containerClassName} style={styles.container}>
      {/* Skip-to-content link for keyboard users */}
      <a
        href="#crisis-resources-main"
        className="skip-link"
        style={styles.skipLink}
        onFocus={(e) => {
          Object.assign(e.currentTarget.style, styles.skipLinkFocus)
        }}
        onBlur={(e) => {
          Object.assign(e.currentTarget.style, styles.skipLink)
        }}
      >
        Skip to resources
      </a>

      {/* Secret Help Button Section - Story 7.5.1 AC1 */}
      <div
        style={styles.secretHelpBanner}
        role="region"
        aria-labelledby="secret-help-title"
        data-testid="secret-help-section"
      >
        <div style={styles.secretHelpIcon} aria-hidden="true">
          🆘
        </div>
        <h2 id="secret-help-title" style={styles.secretHelpTitle}>
          Secret Help Button
        </h2>
        <p style={styles.secretHelpInstructions}>
          If you need help but someone is watching your screen, use this secret way to ask for help:
        </p>

        <div style={styles.secretHelpStep}>
          <span style={styles.secretHelpStepNumber} aria-hidden="true">
            1
          </span>
          <span style={styles.secretHelpStepText}>
            Tap the Fledgely logo 5 times quickly to send a silent help signal
          </span>
        </div>

        <p style={styles.secretHelpOr}>— or —</p>

        <div style={styles.secretHelpStep}>
          <span style={styles.secretHelpStepNumber} aria-hidden="true">
            2
          </span>
          <span style={styles.secretHelpStepText}>Press Ctrl+Shift+H on your keyboard</span>
        </div>

        <p style={styles.secretHelpReassurance}>
          No one will see that you did this. Help will reach out to you.
        </p>
      </div>

      {/* Privacy Banner - AC6 */}
      <div style={styles.privacyBanner} role="region" aria-labelledby="privacy-banner-title">
        <div style={styles.privacyIcon} aria-hidden="true">
          🔒
        </div>
        <h2 id="privacy-banner-title" style={styles.privacyTitle}>
          These sites are ALWAYS private
        </h2>
        <p style={styles.privacyMessage}>
          Your parents will NEVER see that you visited these websites.
          <br />
          It is safe to get help here.
        </p>
      </div>

      {/* Main Content Area */}
      <main
        id="crisis-resources-main"
        style={styles.mainContent}
        tabIndex={-1}
        aria-label="Crisis resources"
      >
        <h2 style={styles.pageTitle}>Safe Places to Get Help</h2>
        <p style={styles.pageSubtitle}>
          These are trusted websites and hotlines where you can get help for free.
        </p>

        {categoriesWithResources.length === 0 ? (
          <div style={styles.emptyState} role="alert">
            <h3 style={styles.emptyStateTitle}>Resources temporarily unavailable</h3>
            <p style={styles.emptyStateText}>
              If you need help right now, please call one of these numbers:
            </p>
            <ul style={styles.emergencyList}>
              <li style={styles.emergencyItem}>
                <span style={styles.emergencyNumber}>988</span> - Suicide & Crisis Lifeline (call or
                text)
              </li>
              <li style={styles.emergencyItem}>
                <span style={styles.emergencyNumber}>911</span> - Emergency services
              </li>
              <li style={styles.emergencyItem}>
                <span style={styles.emergencyNumber}>1-800-422-4453</span> - Childhelp National
                Child Abuse Hotline
              </li>
            </ul>
          </div>
        ) : (
          categoriesWithResources.map((config) => {
            const resources = getResourcesByCategory(config.category)
            return (
              <section
                key={config.category}
                style={styles.categorySection}
                aria-labelledby={`category-${config.category}`}
              >
                <div style={styles.categoryHeader}>
                  <span style={styles.categoryIcon} aria-hidden="true">
                    {config.icon}
                  </span>
                  <h3 id={`category-${config.category}`} style={styles.categoryName}>
                    {config.friendlyName}
                  </h3>
                </div>
                <p style={styles.categoryDescription}>{config.description}</p>

                <ul style={styles.resourceList} aria-label={`${config.friendlyName} resources`}>
                  {resources.map((resource) => (
                    <li key={resource.id} style={styles.resourceItem}>
                      <CrisisResourceCard resource={resource} />
                    </li>
                  ))}
                </ul>
              </section>
            )
          })
        )}
      </main>
    </div>
  )
}

export default CrisisAllowlistView
