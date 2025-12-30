/**
 * Consent HTTP Endpoints
 *
 * Story 6.5: Device Consent Gate
 * Story 6.6: Consent Withdrawal Handling
 *
 * Exports consent-related HTTP endpoints for device consent verification
 * and consent withdrawal management.
 */

export { checkConsentStatus } from './checkStatus'
export { initiateConsentWithdrawal } from './initiateWithdrawal'
export { checkWithdrawalStatus } from './checkWithdrawalStatus'
export { cancelConsentWithdrawal } from './cancelWithdrawal'
