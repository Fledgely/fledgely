/**
 * Safety Signal Created Trigger - Story 7.5.2 Task 3
 *
 * Firestore trigger that fires when a new safety signal is created.
 * Routes the signal to external crisis partners.
 *
 * AC1: Signal routes to external crisis partnership (NOT fledgely support)
 * AC4: Signal is encrypted in transit
 * AC5: No family notification for 48 hours
 *
 * CRITICAL SAFETY: Signals go to EXTERNAL crisis partners only.
 * Family members NEVER see signal data.
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as logger from 'firebase-functions/logger'
import { calculateChildAge, type FamilyStructure } from '@fledgely/shared'

// ============================================
// Types
// ============================================

/**
 * Safety signal data from Firestore.
 */
export interface SafetySignalData {
  id: string
  childId: string
  familyId: string
  triggeredAt: Date
  status: 'queued' | 'pending' | 'sent' | 'delivered' | 'acknowledged'
  triggerMethod: 'logo_tap' | 'keyboard_shortcut' | 'swipe_pattern'
  platform: 'web' | 'chrome_extension' | 'android'
  deviceId: string | null
  offlineQueued: boolean
  deliveredAt: Date | null
}

/**
 * Child profile data for routing context.
 * CRITICAL: NO parent contact info, screenshots, or activity data.
 */
export interface ChildProfileData {
  birthDate: Date
  familyStructure: FamilyStructure
}

/**
 * Family data for routing.
 * CRITICAL: Only jurisdiction, NO parent contact info.
 */
export interface FamilyData {
  jurisdiction: string
}

/**
 * Context for routing a signal.
 * This is the ONLY data sent to crisis partners.
 */
export interface SignalRoutingContext {
  signalId: string
  childId: string
  familyId: string
  childAge: number
  familyStructure: FamilyStructure
  jurisdiction: string
  platform: 'web' | 'chrome_extension' | 'android'
  triggerMethod: 'logo_tap' | 'keyboard_shortcut' | 'swipe_pattern'
  deviceId: string | null
  signalTimestamp: Date
}

/**
 * Validation result for signal.
 */
export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Result of processing a signal.
 */
export interface ProcessingResult {
  success: boolean
  routingId?: string
  skipped?: boolean
  error?: string
}

/**
 * Dependencies for signal processing (for testability).
 */
export interface SignalProcessingDeps {
  getChildProfile: (childId: string) => Promise<ChildProfileData>
  getFamilyData: (familyId: string) => Promise<FamilyData>
  queueRouting: (
    context: SignalRoutingContext
  ) => Promise<{ success: boolean; routingId?: string; error?: string }>
  updateSignalStatus: (signalId: string, status: string) => Promise<void>
  startBlackout: (signalId: string, hours: number) => Promise<void>
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate that a signal is ready for routing.
 *
 * @param signal - Signal data to validate
 * @returns Validation result
 */
export function validateSignalForRouting(signal: SafetySignalData): ValidationResult {
  if (!signal.childId) {
    return { valid: false, error: 'Missing required field: childId' }
  }

  if (!signal.familyId) {
    return { valid: false, error: 'Missing required field: familyId' }
  }

  if (!signal.triggeredAt) {
    return { valid: false, error: 'Missing required field: triggeredAt' }
  }

  // Only route signals in queued or pending status
  if (
    signal.status === 'sent' ||
    signal.status === 'delivered' ||
    signal.status === 'acknowledged'
  ) {
    return { valid: false, error: 'Signal already routed or acknowledged' }
  }

  return { valid: true }
}

// ============================================
// Context Building Functions
// ============================================

/**
 * Build routing context from signal and profile data.
 *
 * AC2: Signal includes appropriate metadata.
 * AC3: Signal EXCLUDES sensitive data.
 *
 * CRITICAL: This function ensures NO parent info, screenshots, or activity data
 * is included in the routing context.
 *
 * @param signal - Safety signal data
 * @param childProfile - Child profile (birth date, family structure)
 * @param familyData - Family data (jurisdiction only)
 * @returns Routing context with ONLY safe data
 */
export function buildSignalRoutingContext(
  signal: SafetySignalData,
  childProfile: ChildProfileData,
  familyData: FamilyData
): SignalRoutingContext {
  // Calculate child age from birth date (NOT included in payload)
  const childAge = calculateChildAge(childProfile.birthDate)

  // Build context with ONLY safe data
  // CRITICAL: NO parent contact info, screenshots, activity data, or browsing history
  return {
    signalId: signal.id,
    childId: signal.childId,
    familyId: signal.familyId,
    childAge,
    familyStructure: childProfile.familyStructure,
    jurisdiction: familyData.jurisdiction,
    platform: signal.platform,
    triggerMethod: signal.triggerMethod,
    deviceId: signal.deviceId,
    signalTimestamp: signal.triggeredAt,
  }
}

// ============================================
// Main Processing Function
// ============================================

/**
 * Process a newly created safety signal.
 *
 * AC1: Route to external crisis partnership.
 * AC4: Encryption handled by webhook layer.
 * AC5: Start 48-hour blackout period.
 *
 * @param signal - Safety signal data
 * @param deps - Dependencies for processing
 * @returns Processing result
 */
export async function processSafetySignalCreated(
  signal: SafetySignalData,
  deps: SignalProcessingDeps
): Promise<ProcessingResult> {
  // 1. Validate signal
  const validation = validateSignalForRouting(signal)
  if (!validation.valid) {
    logger.warn('Signal validation failed', {
      signalId: signal.id,
      error: validation.error,
    })
    return { success: false, skipped: true, error: validation.error }
  }

  try {
    // 2. Get child profile (for age calculation)
    const childProfile = await deps.getChildProfile(signal.childId)

    // 3. Get family data (for jurisdiction)
    const familyData = await deps.getFamilyData(signal.familyId)

    // 4. Build routing context (NO sensitive data)
    const context = buildSignalRoutingContext(signal, childProfile, familyData)

    // 5. Queue for routing
    const routingResult = await deps.queueRouting(context)

    if (!routingResult.success) {
      logger.error('Failed to queue signal for routing', {
        signalId: signal.id,
        error: routingResult.error,
      })
      return { success: false, error: routingResult.error }
    }

    // 6. Update signal status to 'sent'
    await deps.updateSignalStatus(signal.id, 'sent')

    // 7. Start 48-hour blackout period (AC5)
    await deps.startBlackout(signal.id, 48)

    logger.info('Safety signal processed successfully', {
      signalId: signal.id,
      routingId: routingResult.routingId,
      jurisdiction: context.jurisdiction,
    })

    return { success: true, routingId: routingResult.routingId }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Error processing safety signal', {
      signalId: signal.id,
      error: errorMessage,
    })
    return { success: false, error: errorMessage }
  }
}

// ============================================
// Firestore Trigger
// ============================================

/**
 * Firestore trigger for new safety signal documents.
 *
 * Triggers on: safetySignals/{signalId}
 *
 * CRITICAL: This collection is NEVER accessible to family members.
 * Security rules prevent all family access.
 */
export const onSafetySignalCreated = onDocumentCreated(
  {
    document: 'safetySignals/{signalId}',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const snapshot = event.data
    if (!snapshot) {
      logger.warn('onSafetySignalCreated: No data in event')
      return
    }

    const { signalId } = event.params
    const data = snapshot.data() as SafetySignalData
    data.id = signalId // Add ID from params

    logger.info('Safety signal created, processing for routing', {
      signalId,
      childId: data.childId,
    })

    // In production, these would use Firestore Admin SDK
    const deps: SignalProcessingDeps = {
      getChildProfile: async (childId: string) => {
        // TODO: Implement actual Firestore fetch
        // const doc = await admin.firestore().doc(`children/${childId}`).get()
        // return doc.data() as ChildProfileData
        logger.info('Fetching child profile', { childId })
        throw new Error('Not implemented - requires Firestore setup')
      },
      getFamilyData: async (familyId: string) => {
        // TODO: Implement actual Firestore fetch
        // const doc = await admin.firestore().doc(`families/${familyId}`).get()
        // return doc.data() as FamilyData
        logger.info('Fetching family data', { familyId })
        throw new Error('Not implemented - requires Firestore setup')
      },
      queueRouting: async (_context: SignalRoutingContext) => {
        // TODO: Implement routing queue (Task 4)
        // This will queue the signal for webhook delivery
        logger.info('Queueing signal for routing')
        return { success: true, routingId: `route_${Date.now()}` }
      },
      updateSignalStatus: async (id: string, status: string) => {
        // TODO: Implement actual Firestore update
        // await admin.firestore().doc(`safetySignals/${id}`).update({ status })
        logger.info('Updating signal status', { id, status })
      },
      startBlackout: async (id: string, hours: number) => {
        // TODO: Implement blackout (Task 6)
        logger.info('Starting blackout period', { id, hours })
      },
    }

    await processSafetySignalCreated(data, deps)
  }
)
