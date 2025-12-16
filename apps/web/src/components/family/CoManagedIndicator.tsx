'use client'

import { cn } from '@/lib/utils'

/**
 * CoManagedIndicator - Displays co-management status for families with multiple guardians
 *
 * Story 3.4: Equal Access Verification - AC4: Co-Managed Indicator Display
 *
 * Requirements:
 * - Shows "Co-managed with [name]" for single co-parent
 * - Shows "Co-managed with [name1] and [name2]" for two co-parents
 * - Shows "Co-managed with [name1], [name2] and [name3]" for 3+ co-parents
 * - Styled as secondary/subtle UI element (text-muted-foreground)
 * - Meets color contrast requirements (NFR45)
 * - Includes aria-label for screen readers
 *
 * @param otherGuardianNames - Array of other guardians' display names (excluding current user)
 * @param isLoading - Whether guardian names are still loading
 * @param className - Optional additional CSS classes
 */

interface CoManagedIndicatorProps {
  /** Display names of other guardians (not the current user) */
  otherGuardianNames: string[]
  /** Whether the guardian data is still loading */
  isLoading: boolean
  /** Optional additional CSS classes */
  className?: string
}

/**
 * Format guardian names into a readable string
 * - 1 name: "Jane Smith"
 * - 2 names: "Jane Smith and Bob Johnson"
 * - 3+ names: "Jane Smith, Bob Johnson and Alice Williams"
 */
function formatGuardianNames(names: string[]): string {
  // Use fallback for empty names
  const sanitizedNames = names.map(name => name.trim() || 'Co-parent')

  if (sanitizedNames.length === 0) return ''
  if (sanitizedNames.length === 1) return sanitizedNames[0]
  if (sanitizedNames.length === 2) {
    return `${sanitizedNames[0]} and ${sanitizedNames[1]}`
  }

  // 3+ names: join with commas, last with "and"
  const allButLast = sanitizedNames.slice(0, -1).join(', ')
  const last = sanitizedNames[sanitizedNames.length - 1]
  return `${allButLast} and ${last}`
}

export function CoManagedIndicator({
  otherGuardianNames,
  isLoading,
  className,
}: CoManagedIndicatorProps) {
  // Don't render if no other guardians
  if (otherGuardianNames.length === 0 && !isLoading) {
    return null
  }

  // Loading skeleton - aria-label provides context for screen readers
  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading co-parent information"
        className={cn('h-4 w-32 animate-pulse rounded bg-muted', className)}
      />
    )
  }

  const formattedNames = formatGuardianNames(otherGuardianNames)
  const displayText = `Co-managed with ${formattedNames}`

  return (
    <p
      className={cn('text-sm text-muted-foreground', className)}
      aria-label={displayText}
    >
      {displayText}
    </p>
  )
}

export type { CoManagedIndicatorProps }
