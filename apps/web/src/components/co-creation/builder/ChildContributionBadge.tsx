'use client'

/**
 * Display variants for the badge
 */
export type BadgeVariant = 'inline' | 'block'

/**
 * Props for the ChildContributionBadge component
 */
export interface ChildContributionBadgeProps {
  /** Name of the child contributor */
  contributorName: string
  /** URL of the child's avatar */
  avatarUrl?: string
  /** Whether this contribution is protected from editing */
  isProtected?: boolean
  /** Display variant */
  variant?: BadgeVariant
  /** Whether to use compact styling */
  compact?: boolean
  /** Click handler (makes badge interactive) */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * ChildContributionBadge Component
 *
 * Story 5.3: Child Contribution Capture - Task 6
 *
 * Visual badge indicating a contribution was made by a child.
 * Features:
 * - Shows child's name/avatar
 * - Optional protected state indicator
 * - Child-friendly pink/purple styling
 * - Compact and expanded variants
 * - Full accessibility support
 *
 * @example
 * ```tsx
 * <ChildContributionBadge
 *   contributorName="Alex"
 *   isProtected={true}
 *   avatarUrl="/alex-avatar.jpg"
 * />
 * ```
 */
export function ChildContributionBadge({
  contributorName,
  avatarUrl,
  isProtected = false,
  variant = 'inline',
  compact = false,
  onClick,
  className = '',
  'data-testid': dataTestId,
}: ChildContributionBadgeProps) {
  const isClickable = !!onClick
  const initials = getInitials(contributorName)

  const ariaLabel = isProtected
    ? `${contributorName} added this (protected from editing)`
    : `${contributorName} added this`

  const tooltipText = isProtected
    ? `${contributorName}'s idea - protected from changes`
    : `${contributorName} added this`

  const Component = isClickable ? 'button' : 'div'

  return (
    <Component
      type={isClickable ? 'button' : undefined}
      onClick={onClick}
      aria-label={ariaLabel}
      title={tooltipText}
      className={`
        ${variant === 'inline' ? 'inline-flex flex-row' : 'flex flex-col'}
        items-center gap-2 px-3 py-1.5 rounded-full
        bg-pink-100 dark:bg-pink-900/50
        text-pink-800 dark:text-pink-200
        child-badge
        ${compact ? 'text-xs compact' : 'text-sm'}
        ${isClickable ? 'cursor-pointer hover:bg-pink-200 dark:hover:bg-pink-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400' : ''}
        ${className}
      `}
      data-testid={dataTestId ?? 'child-contribution-badge'}
    >
      {/* Child icon */}
      <span
        className="flex items-center justify-center w-5 h-5 text-xs"
        data-testid="child-icon"
        aria-hidden="true"
      >
        👶
      </span>

      {/* Avatar or initials */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="w-5 h-5 rounded-full object-cover"
          data-testid="contributor-avatar"
        />
      ) : (
        <span
          className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-200 dark:bg-pink-800 text-pink-700 dark:text-pink-300 text-xs font-medium"
          data-testid="contributor-initials"
          aria-hidden="true"
        >
          {initials}
        </span>
      )}

      {/* Contributor name and label */}
      <span className="font-medium">
        {contributorName}
        <span className="font-normal opacity-75"> added this</span>
      </span>

      {/* Protected indicator */}
      {isProtected && (
        <span
          className="flex items-center gap-1 ml-1"
          data-testid="protected-indicator"
        >
          <span
            className="text-xs opacity-75"
            data-testid="lock-icon"
            aria-hidden="true"
          >
            🔒
          </span>
        </span>
      )}
    </Component>
  )
}

export default ChildContributionBadge
