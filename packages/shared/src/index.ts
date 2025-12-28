/**
 * @fledgely/shared
 *
 * Shared utilities, contracts, and constants for the Fledgely application.
 */

// Explicit named exports per architecture guidelines (no wildcard re-exports)
export { placeholderSchema, type Placeholder } from './contracts'
export { ERROR_CODES, QUERY_STALE_TIMES, type ErrorCode } from './constants'
