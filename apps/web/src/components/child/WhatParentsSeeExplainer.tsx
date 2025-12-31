'use client'

/**
 * WhatParentsSeeExplainer Component - Story 19B.5
 *
 * Explains to children what their parents can and cannot see.
 * Uses child-friendly language at 6th-grade reading level.
 *
 * AC: #1 - Explainer access from dashboard
 * AC: #2 - What parents CAN see
 * AC: #3 - What parents CANNOT see
 * AC: #4 - Age-appropriate language
 * AC: #5 - Link to family agreement
 * AC: #6 - "Talk to your parents" prompt
 */

import { useEffect, useCallback, useState, useRef } from 'react'

/**
 * Props for WhatParentsSeeExplainer
 */
export interface WhatParentsSeeExplainerProps {
  isOpen: boolean
  onClose: () => void
  onViewAgreement?: () => void
}

/**
 * Explainer item structure
 */
interface ExplainerItem {
  icon: string
  title: string
  description: string
}

/**
 * Items that parents CAN see
 */
const PARENTS_CAN_SEE: ExplainerItem[] = [
  {
    icon: '📸',
    title: 'Screenshots',
    description: 'Pictures of what was on your screen',
  },
  {
    icon: '⏰',
    title: 'When',
    description: 'The date and time each picture was taken',
  },
  {
    icon: '🌐',
    title: 'Websites & Apps',
    description: 'Which sites and apps you visited',
  },
  {
    icon: '💻',
    title: 'Device',
    description: 'Which computer or tablet you used',
  },
]

/**
 * Items that parents CANNOT see
 */
const PARENTS_CANNOT_SEE: ExplainerItem[] = [
  {
    icon: '💬',
    title: 'Message Content',
    description: 'What your private messages say inside',
  },
  {
    icon: '🔑',
    title: 'Passwords',
    description: 'Any passwords you type in',
  },
  {
    icon: '💭',
    title: 'Your Thoughts',
    description: "What you're thinking or feeling",
  },
]

/**
 * Conversation starter suggestions
 */
const CONVERSATION_STARTERS = [
  '"I noticed you can see my screenshots. Can we talk about that?"',
  '"I want to understand our agreement better."',
  '"Is there a way to have more privacy for some things?"',
]

/**
 * Styles using sky blue theme for child dashboard
 */
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
  },
  modal: {
    position: 'relative' as const,
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 4px 24px rgba(14, 165, 233, 0.2)',
  },
  header: {
    position: 'sticky' as const,
    top: 0,
    backgroundColor: '#0ea5e9', // sky-500
    padding: '20px 24px',
    borderRadius: '20px 20px 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  titleIcon: {
    fontSize: '1.5rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#ffffff',
    margin: 0,
  },
  closeButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    fontSize: '1.25rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
  },
  closeButtonFocus: {
    outline: '2px solid #ffffff',
    outlineOffset: '2px',
  },
  content: {
    padding: '24px',
  },
  intro: {
    fontSize: '0.9375rem',
    color: '#0c4a6e', // sky-900
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionLast: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    margin: '0 0 12px 0',
  },
  sectionTitleCan: {
    color: '#16a34a', // green-600
  },
  sectionTitleCannot: {
    color: '#64748b', // slate-500
  },
  itemList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    borderRadius: '12px',
  },
  itemCan: {
    backgroundColor: '#f0fdf4', // green-50
    border: '1px solid #bbf7d0', // green-200
  },
  itemCannot: {
    backgroundColor: '#f8fafc', // slate-50
    border: '1px solid #e2e8f0', // slate-200
  },
  itemIcon: {
    fontSize: '1.25rem',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    margin: 0,
  },
  itemTitleCan: {
    color: '#166534', // green-800
  },
  itemTitleCannot: {
    color: '#475569', // slate-600
  },
  itemDescription: {
    fontSize: '0.8125rem',
    margin: '4px 0 0 0',
  },
  itemDescriptionCan: {
    color: '#15803d', // green-700
  },
  itemDescriptionCannot: {
    color: '#64748b', // slate-500
  },
  divider: {
    height: '1px',
    backgroundColor: '#e0f2fe', // sky-100
    margin: '24px 0',
  },
  talkSection: {
    backgroundColor: '#f0f9ff', // sky-50
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #bae6fd', // sky-200
  },
  talkTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#0c4a6e', // sky-900
    margin: '0 0 8px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  talkIntro: {
    fontSize: '0.875rem',
    color: '#0369a1', // sky-700
    margin: '0 0 12px 0',
    lineHeight: 1.5,
  },
  conversationList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  conversationItem: {
    fontSize: '0.8125rem',
    color: '#0c4a6e', // sky-900
    backgroundColor: '#ffffff',
    padding: '10px 14px',
    borderRadius: '8px',
    fontStyle: 'italic',
    lineHeight: 1.4,
  },
  agreementLink: {
    display: 'block',
    textAlign: 'center' as const,
    marginTop: '20px',
    padding: '14px 20px',
    backgroundColor: '#e0f2fe', // sky-100
    borderRadius: '12px',
    color: '#0369a1', // sky-700
    textDecoration: 'none',
    fontSize: '0.9375rem',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    width: '100%',
    outline: 'none',
  },
  agreementLinkFocus: {
    outline: '2px solid #0ea5e9', // sky-500
    outlineOffset: '2px',
  },
}

/**
 * WhatParentsSeeExplainer - Explains what parents can and cannot see
 *
 * Uses child-friendly language at 6th-grade reading level.
 */
export function WhatParentsSeeExplainer({
  isOpen,
  onClose,
  onViewAgreement,
}: WhatParentsSeeExplainerProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [closeButtonFocused, setCloseButtonFocused] = useState(false)
  const [agreementLinkFocused, setAgreementLinkFocused] = useState(false)

  // Handle escape key to close modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  // Set up keyboard listener and focus trap
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Focus the modal when opened
      modalRef.current?.focus()
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  // Handle overlay click to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      style={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="explainer-title"
      data-testid="what-parents-see-explainer"
    >
      <div ref={modalRef} style={styles.modal} tabIndex={-1} data-testid="explainer-modal">
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleSection}>
            <span style={styles.titleIcon} aria-hidden="true">
              👀
            </span>
            <h2 id="explainer-title" style={styles.title}>
              What Your Parents Can See
            </h2>
          </div>
          <button
            style={{
              ...styles.closeButton,
              ...(closeButtonFocused ? styles.closeButtonFocus : {}),
            }}
            onClick={onClose}
            onFocus={() => setCloseButtonFocused(true)}
            onBlur={() => setCloseButtonFocused(false)}
            aria-label="Close"
            data-testid="close-button"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Introduction */}
          <p style={styles.intro} data-testid="intro-text">
            When you agreed to use this device, you and your parents made a deal. Here&apos;s what
            they can see as part of that deal.
          </p>

          {/* What Parents CAN See */}
          <div style={styles.section} data-testid="can-see-section">
            <h3 style={{ ...styles.sectionTitle, ...styles.sectionTitleCan }}>
              ✓ Your parents CAN see...
            </h3>
            <div style={styles.itemList}>
              {PARENTS_CAN_SEE.map((item) => (
                <div
                  key={item.title}
                  style={{ ...styles.item, ...styles.itemCan }}
                  data-testid={`can-see-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <span style={styles.itemIcon} aria-hidden="true">
                    {item.icon}
                  </span>
                  <div style={styles.itemContent}>
                    <p style={{ ...styles.itemTitle, ...styles.itemTitleCan }}>{item.title}</p>
                    <p
                      style={{
                        ...styles.itemDescription,
                        ...styles.itemDescriptionCan,
                      }}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.divider} />

          {/* What Parents CANNOT See */}
          <div style={styles.section} data-testid="cannot-see-section">
            <h3 style={{ ...styles.sectionTitle, ...styles.sectionTitleCannot }}>
              🔒 Your parents CANNOT see...
            </h3>
            <div style={styles.itemList}>
              {PARENTS_CANNOT_SEE.map((item) => (
                <div
                  key={item.title}
                  style={{ ...styles.item, ...styles.itemCannot }}
                  data-testid={`cannot-see-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <span style={styles.itemIcon} aria-hidden="true">
                    {item.icon}
                  </span>
                  <div style={styles.itemContent}>
                    <p style={{ ...styles.itemTitle, ...styles.itemTitleCannot }}>{item.title}</p>
                    <p
                      style={{
                        ...styles.itemDescription,
                        ...styles.itemDescriptionCannot,
                      }}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.divider} />

          {/* Talk to Your Parents Section */}
          <div style={{ ...styles.section, ...styles.sectionLast }} data-testid="talk-section">
            <div style={styles.talkSection}>
              <h3 style={styles.talkTitle}>
                <span aria-hidden="true">💬</span>
                Have Questions?
              </h3>
              <p style={styles.talkIntro}>
                It&apos;s okay to talk to your parents about this! You could say:
              </p>
              <div style={styles.conversationList}>
                {CONVERSATION_STARTERS.map((starter, index) => (
                  <div
                    key={index}
                    style={styles.conversationItem}
                    data-testid={`conversation-starter-${index}`}
                  >
                    {starter}
                  </div>
                ))}
              </div>
            </div>

            {/* Agreement Link */}
            {onViewAgreement && (
              <button
                style={{
                  ...styles.agreementLink,
                  ...(agreementLinkFocused ? styles.agreementLinkFocus : {}),
                }}
                onClick={onViewAgreement}
                onFocus={() => setAgreementLinkFocused(true)}
                onBlur={() => setAgreementLinkFocused(false)}
                data-testid="view-agreement-link"
              >
                📄 View My Agreement
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
