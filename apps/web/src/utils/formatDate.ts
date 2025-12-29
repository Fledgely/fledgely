/**
 * Date formatting utilities.
 *
 * Story 6.3: Agreement Activation
 * Extracted to avoid duplication across components.
 */

/**
 * Format date to short format (no weekday).
 *
 * @example
 * formatDateShort(new Date('2024-01-15')) // "January 15, 2024"
 */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format date to full format (with weekday).
 *
 * @example
 * formatDateFull(new Date('2024-01-15')) // "Monday, January 15, 2024"
 */
export function formatDateFull(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
