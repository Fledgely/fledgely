/**
 * Protected Resources Page
 *
 * Story 7.3: Child Allowlist Visibility - Task 1.1
 *
 * Displays the full list of crisis resources that are always private.
 * This page is accessible to children without parent notification.
 *
 * Per INV-001 and AC 5: Viewing this page does NOT trigger any
 * parent notification, analytics event, or activity log entry.
 *
 * Accessibility Features (WCAG 2.1 AA):
 * - NFR42: WCAG 2.1 AA compliance
 * - NFR65: Child-appropriate language throughout
 * - 4.5:1 color contrast ratio
 * - Visible focus indicators
 * - Keyboard accessible
 * - Screen reader optimized
 */

import { ProtectedResourcesList } from '@/components/safety/ProtectedResourcesList'

export const metadata = {
  title: 'Protected Resources | Fledgely',
  description: 'Resources that are always private - your parents will never see visits to these sites.',
}

export default function ProtectedResourcesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col p-4 sm:p-6">
        <div className="mx-auto w-full max-w-3xl">
          <ProtectedResourcesList />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="container text-center text-xs text-muted-foreground">
          <p>
            This page is always private. We will never tell your parents you visited here.
          </p>
        </div>
      </footer>
    </div>
  )
}
