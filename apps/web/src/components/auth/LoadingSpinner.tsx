import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  /** Screen reader text for the loading state */
  srText?: string
}

/**
 * Accessible loading spinner component
 *
 * Features:
 * - Animated spinning indicator
 * - Screen reader announcement via sr-only text
 * - Customizable size via className
 */
export function LoadingSpinner({
  className,
  srText = 'Loading...',
}: LoadingSpinnerProps) {
  return (
    <div role="status" aria-live="polite">
      <svg
        className={cn('animate-spin', className)}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{srText}</span>
    </div>
  )
}
