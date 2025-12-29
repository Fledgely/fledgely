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
