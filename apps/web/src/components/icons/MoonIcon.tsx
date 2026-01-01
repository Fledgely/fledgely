/**
 * Moon Icon Component
 * Used for Family Offline Time feature (Story 32.1)
 */

interface MoonIconProps {
  size?: number
  color?: string
  strokeWidth?: number
}

export function MoonIcon({ size = 24, color = '#6366f1', strokeWidth = 2 }: MoonIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export default MoonIcon
