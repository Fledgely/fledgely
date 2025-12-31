/**
 * Time formatting utilities.
 *
 * Story 4.4: Quick Start Wizard
 * Extracted to avoid duplication across components.
 */

/**
 * Format minutes to human-readable time string.
 *
 * @example
 * formatMinutes(45) // "45 minutes"
 * formatMinutes(60) // "1 hour"
 * formatMinutes(90) // "1h 30m"
 * formatMinutes(120) // "2 hours"
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`
  }
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Format 24-hour time string to 12-hour format.
 *
 * @example
 * formatTime24to12("21:00") // "9:00 PM"
 * formatTime24to12("00:30") // "12:30 AM"
 */
export function formatTime24to12(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

/**
 * Format timestamp to relative time string.
 *
 * Story 8.5.4: Sample Flag & Alert Examples
 * Extracted from demo components to avoid duplication.
 *
 * @example
 * formatRelativeTime(Date.now() - 30000) // "Just now"
 * formatRelativeTime(Date.now() - 15 * 60 * 1000) // "15 minutes ago"
 * formatRelativeTime(Date.now() - 2 * 60 * 60 * 1000) // "2 hours ago"
 * formatRelativeTime(Date.now() - 3 * 24 * 60 * 60 * 1000) // "3 days ago"
 */
export function formatRelativeTime(timestamp: number | Date): string {
  const now = Date.now()
  const timestampMs = typeof timestamp === 'number' ? timestamp : timestamp.getTime()
  const diffMs = now - timestampMs
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) {
    return 'Just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  } else {
    return new Date(timestampMs).toLocaleDateString()
  }
}
