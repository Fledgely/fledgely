/**
 * Safety Page Layout - Metadata Configuration
 *
 * Story 0.5.1: Secure Safety Contact Channel - AC7
 *
 * CRITICAL SAFETY DESIGN:
 * - Uses neutral page title ("Contact Support")
 * - No alarming words in meta tags
 * - Browser history will show neutral text
 * - Screen readers announce neutral title
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Support | Fledgely',
  description: 'Get in touch with our support team.',
  // Prevent indexing - this page should not appear in search results
  robots: {
    index: false,
    follow: false,
  },
}

export default function SafetyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
