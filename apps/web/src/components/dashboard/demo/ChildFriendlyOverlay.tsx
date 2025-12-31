'use client'

/**
 * ChildFriendlyOverlay Component - Story 8.5.6
 *
 * Wrapper component that displays child-friendly explanations
 * alongside demo content when in child explanation mode.
 *
 * Acceptance Criteria:
 * - AC1: Child-friendly explanations appear alongside sample data
 * - AC5: Language is at 6th-grade reading level
 */

import { BilateralTransparencyCallout } from './BilateralTransparencyCallout'
import { CrisisResourcesPreview } from './CrisisResourcesPreview'
import { AgreementCoCreationHighlight } from './AgreementCoCreationHighlight'

export interface ChildFriendlyOverlayProps {
  /** The demo content to display */
  children: React.ReactNode
  /** Which section is being explained */
  section: 'screenshots' | 'time-tracking' | 'flags' | 'general'
  /** Callback to exit child explanation mode */
  onExitChildMode: () => void
}

/**
 * ChildFriendlyOverlay - Adds child-friendly context to demo sections
 *
 * Displays appropriate callouts based on which demo section is being viewed:
 * - screenshots: Shows bilateral transparency callout
 * - time-tracking: Shows agreement co-creation highlight
 * - flags: Shows both bilateral transparency and crisis resources
 * - general: Shows all callouts
 */
export function ChildFriendlyOverlay({
  children,
  section,
  onExitChildMode,
}: ChildFriendlyOverlayProps) {
  const containerStyles: React.CSSProperties = {
    position: 'relative',
    backgroundColor: '#faf5ff', // Demo lavender
    border: '3px solid #a78bfa', // Brighter purple for child mode
    borderRadius: '12px',
    padding: '16px',
  }

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px dashed #c4b5fd',
  }

  const titleStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#6d28d9', // Purple-700
  }

  const exitButtonStyles: React.CSSProperties = {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    color: '#6d28d9',
    border: '1px solid #c4b5fd',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  }

  const calloutsContainerStyles: React.CSSProperties = {
    marginBottom: '16px',
  }

  const contentStyles: React.CSSProperties = {
    // Content wrapper
  }

  // Determine which callouts to show based on section
  const showBilateralTransparency =
    section === 'screenshots' || section === 'flags' || section === 'general'
  const showCrisisResources = section === 'flags' || section === 'general'
  const showAgreementCoCreation = section === 'time-tracking' || section === 'general'

  return (
    <div data-testid="child-friendly-overlay" style={containerStyles}>
      {/* Child Mode Header */}
      <div style={headerStyles}>
        <h3 style={titleStyles} data-testid="child-mode-title">
          <span aria-hidden="true">👨‍👧</span>
          <span>Explaining to Your Child</span>
        </h3>
        <button
          type="button"
          onClick={onExitChildMode}
          style={exitButtonStyles}
          data-testid="exit-child-mode-button"
        >
          <span aria-hidden="true">✕</span>
          <span>Exit Child Mode</span>
        </button>
      </div>

      {/* Contextual Callouts */}
      <div style={calloutsContainerStyles} data-testid="callouts-container">
        {showBilateralTransparency && <BilateralTransparencyCallout compact />}
        {showCrisisResources && <CrisisResourcesPreview compact />}
        {showAgreementCoCreation && <AgreementCoCreationHighlight compact />}
      </div>

      {/* Demo Content */}
      <div style={contentStyles} data-testid="demo-content-wrapper">
        {children}
      </div>
    </div>
  )
}
