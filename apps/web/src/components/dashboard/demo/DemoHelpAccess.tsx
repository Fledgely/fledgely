'use client'

/**
 * DemoHelpAccess Component - Story 8.5.5
 *
 * Provides demo mode access from help/settings sections.
 * Shows when demo has been archived (real child added).
 * Allows parents to revisit demo for reference.
 *
 * Acceptance Criteria:
 * - AC5: Demo Re-access - parent can re-access demo from help section if needed
 */

import { DemoArchivedBanner } from './DemoArchivedBanner'

export interface DemoHelpAccessProps {
  /** Whether demo has been archived */
  demoArchived: boolean
  /** Callback to reactivate demo mode */
  onReactivateDemo: () => Promise<void>
  /** Whether reactivation is in progress */
  reactivating?: boolean
}

/**
 * DemoHelpAccess - Wrapper for demo access in help/settings sections
 *
 * This component conditionally renders the DemoArchivedBanner based on
 * whether the demo has been archived. It's designed to be integrated
 * into help or settings pages.
 *
 * Usage:
 * ```tsx
 * import { useDemo } from '../hooks/useDemo'
 *
 * function HelpPage() {
 *   const { demoArchived, reactivateDemo, archiving } = useDemo(familyId, hasRealChildren)
 *
 *   return (
 *     <div>
 *       <h1>Help</h1>
 *       <DemoHelpAccess
 *         demoArchived={demoArchived}
 *         onReactivateDemo={reactivateDemo}
 *         reactivating={archiving}
 *       />
 *       {/ * rest of help content * /}
 *     </div>
 *   )
 * }
 * ```
 */
export function DemoHelpAccess({
  demoArchived,
  onReactivateDemo,
  reactivating = false,
}: DemoHelpAccessProps) {
  // Only show when demo has been archived
  if (!demoArchived) {
    return null
  }

  return (
    <div data-testid="demo-help-access">
      <DemoArchivedBanner onReactivateDemo={onReactivateDemo} reactivating={reactivating} />
    </div>
  )
}
