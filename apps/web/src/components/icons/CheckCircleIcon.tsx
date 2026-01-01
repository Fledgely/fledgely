/**
 * Check Circle Icon Component
 * Used for compliance stats (Story 32.4)
 */

interface CheckCircleIconProps {
  size?: number
  color?: string
  strokeWidth?: number
}

export function CheckCircleIcon({
  size = 24,
  color = '#22c55e',
  strokeWidth = 2,
}: CheckCircleIconProps) {
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
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

export default CheckCircleIcon
