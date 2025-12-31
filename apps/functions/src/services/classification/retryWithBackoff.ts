/**
 * Retry with Exponential Backoff Utility
 *
 * Story 20.1: Classification Service Architecture - AC6
 *
 * Provides retry logic with exponential backoff for classification operations.
 */

import { CLASSIFICATION_CONFIG, calculateBackoffDelay } from '@fledgely/shared'
import * as logger from 'firebase-functions/logger'

/**
 * Options for retry with backoff.
 */
export interface RetryOptions {
  /** Maximum number of retries (default: 3) */
  maxRetries?: number
  /** Base delay in milliseconds (default: 1000) */
  baseDelayMs?: number
  /** Function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean
  /** Context for logging */
  context?: string
}

/**
 * Default function to determine if an error is retryable.
 *
 * Retries on:
 * - Network errors
 * - Rate limit errors (429)
 * - Server errors (5xx)
 * - Timeout errors
 *
 * Does NOT retry on:
 * - Client errors (4xx except 429)
 * - Authentication errors
 * - Invalid input errors
 */
function defaultIsRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Retryable conditions
    if (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('rate limit') ||
      message.includes('503') ||
      message.includes('502') ||
      message.includes('504') ||
      message.includes('429') ||
      message.includes('unavailable') ||
      message.includes('connection')
    ) {
      return true
    }

    // Non-retryable conditions
    if (
      message.includes('invalid') ||
      message.includes('authentication') ||
      message.includes('permission') ||
      message.includes('not found') ||
      message.includes('400') ||
      message.includes('401') ||
      message.includes('403')
    ) {
      return false
    }
  }

  // Default to retryable for unknown errors
  return true
}

/**
 * Execute a function with exponential backoff retry logic.
 *
 * Story 20.1: Classification Service Architecture - AC6
 *
 * @param fn - Async function to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to function result
 * @throws Last error if all retries exhausted
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = CLASSIFICATION_CONFIG.MAX_RETRIES,
    isRetryable = defaultIsRetryable,
    context = 'operation',
  } = options

  let lastError: unknown
  let attempt = 0

  while (attempt <= maxRetries) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      const errorMessage = error instanceof Error ? error.message : String(error)

      if (attempt >= maxRetries || !isRetryable(error)) {
        logger.error(`${context} failed after ${attempt + 1} attempts`, {
          error: errorMessage,
          attempt: attempt + 1,
          maxRetries,
          retryable: isRetryable(error),
        })
        throw error
      }

      const delay = calculateBackoffDelay(attempt)

      logger.warn(`${context} failed, retrying in ${delay}ms`, {
        error: errorMessage,
        attempt: attempt + 1,
        nextRetryIn: delay,
      })

      // Wait for backoff delay
      await new Promise((resolve) => setTimeout(resolve, delay))
      attempt++
    }
  }

  // Should not reach here, but TypeScript needs it
  throw lastError
}

/**
 * Sleep utility for testing and delays.
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
