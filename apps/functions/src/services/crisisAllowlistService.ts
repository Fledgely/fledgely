/**
 * Crisis Allowlist Service
 *
 * Story 7.4: Emergency Allowlist Push
 *
 * Business logic for crisis allowlist management including:
 * - Fetching current allowlist (from Firestore or bundled defaults)
 * - Emergency push updates
 * - Audit trail logging
 *
 * FR61: System maintains a public crisis allowlist
 * NFR28: Crisis allowlist cached locally; functions without cloud connectivity
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  CrisisAllowlistDoc,
  EmergencyPushInput,
  EmergencyPushResponse,
  AllowlistAuditEntry,
  GetAllowlistResponse,
  incrementVersion,
  CRISIS_RESOURCES,
  CRISIS_ALLOWLIST_VERSION,
  CrisisResource,
} from '@fledgely/shared'

// Firestore collection paths
const CONFIG_COLLECTION = 'config'
const ALLOWLIST_DOC_ID = 'crisisAllowlist'
const AUDIT_COLLECTION = 'audit'
const AUDIT_SUBCOLLECTION = 'crisisAllowlistChanges'

/**
 * Get the current crisis allowlist
 *
 * Returns the allowlist from Firestore if available,
 * otherwise falls back to bundled defaults.
 *
 * AC1: API Endpoint for Allowlist Distribution
 * AC7: Dynamic Fetch (No App Update)
 *
 * @returns Current allowlist with version and resources
 */
export async function getCurrentAllowlist(): Promise<GetAllowlistResponse> {
  try {
    const db = getFirestore()
    const docRef = db.collection(CONFIG_COLLECTION).doc(ALLOWLIST_DOC_ID)
    const doc = await docRef.get()

    if (doc.exists) {
      const data = doc.data() as CrisisAllowlistDoc
      logger.info('Returning Firestore allowlist', {
        version: data.version,
        resourceCount: data.resources.length,
      })

      return {
        version: data.version,
        lastUpdated: new Date(data.lastUpdated).toISOString(),
        resources: data.resources,
      }
    }

    // Fall back to bundled defaults
    logger.info('Returning bundled allowlist defaults', {
      version: CRISIS_ALLOWLIST_VERSION,
      resourceCount: CRISIS_RESOURCES.length,
    })

    return {
      version: CRISIS_ALLOWLIST_VERSION,
      lastUpdated: new Date().toISOString(),
      resources: CRISIS_RESOURCES,
    }
  } catch (error) {
    // On any error, return bundled defaults (fail-safe)
    logger.error('Error fetching allowlist, returning bundled defaults', { error })

    return {
      version: CRISIS_ALLOWLIST_VERSION,
      lastUpdated: new Date().toISOString(),
      resources: CRISIS_RESOURCES,
    }
  }
}

/**
 * Push an emergency allowlist update
 *
 * Adds a new crisis resource to the allowlist immediately.
 * Requires admin permissions (verified by caller).
 *
 * AC2: Emergency Push Trigger
 * AC6: Audit Trail
 *
 * @param input - Emergency push input with resource and reason
 * @param operatorId - Admin UID making the change
 * @returns Push result with new version
 */
export async function pushEmergencyUpdate(
  input: EmergencyPushInput,
  operatorId: string
): Promise<EmergencyPushResponse> {
  const db = getFirestore()
  const docRef = db.collection(CONFIG_COLLECTION).doc(ALLOWLIST_DOC_ID)

  try {
    // Use transaction for atomic read-modify-write
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef)
      let currentData: CrisisAllowlistDoc

      if (doc.exists) {
        currentData = doc.data() as CrisisAllowlistDoc
      } else {
        // Initialize from bundled defaults
        currentData = {
          version: CRISIS_ALLOWLIST_VERSION,
          lastUpdated: Date.now(),
          resources: CRISIS_RESOURCES,
        }
      }

      // Check if resource already exists
      const existingResource = currentData.resources.find(
        (r: CrisisResource) => r.id === input.resource.id
      )
      if (existingResource) {
        logger.warn('Resource already exists in allowlist', {
          resourceId: input.resource.id,
          operatorId,
        })
        return {
          success: false,
          newVersion: currentData.version,
          timestamp: Date.now(),
          message: `Resource '${input.resource.id}' already exists in allowlist`,
        }
      }

      // Increment version
      const newVersion = incrementVersion(currentData.version)
      const timestamp = Date.now()

      // Update allowlist
      const newData: CrisisAllowlistDoc = {
        version: newVersion,
        lastUpdated: timestamp,
        resources: [...currentData.resources, input.resource],
        updatedBy: operatorId,
        isEmergencyPush: true,
      }

      transaction.set(docRef, newData)

      return {
        success: true,
        newVersion,
        timestamp,
        resourceName: input.resource.name,
      }
    })

    // If duplicate found, return early
    if (!result.success) {
      return result as EmergencyPushResponse
    }

    // Log audit entry (outside transaction - non-critical)
    await logAuditEntry({
      timestamp: result.timestamp,
      version: result.newVersion,
      operatorId,
      reason: input.reason,
      resourcesAdded: [input.resource.id],
      resourcesRemoved: [],
      isEmergencyPush: true,
    })

    logger.info('Emergency allowlist update pushed', {
      newVersion: result.newVersion,
      resourceId: input.resource.id,
      operatorId,
      reason: input.reason,
    })

    return {
      success: true,
      newVersion: result.newVersion,
      timestamp: result.timestamp,
      message: `Resource '${result.resourceName}' added to allowlist (v${result.newVersion})`,
    }
  } catch (error) {
    logger.error('Failed to push emergency update', { error, operatorId })
    throw error
  }
}

/**
 * Log an audit entry for allowlist changes
 *
 * AC6: Audit Trail
 *
 * @param entry - Audit entry to log
 */
export async function logAuditEntry(entry: AllowlistAuditEntry): Promise<void> {
  try {
    const db = getFirestore()
    const auditRef = db.collection(AUDIT_COLLECTION).doc(AUDIT_SUBCOLLECTION)

    // Use a subcollection for individual changes
    await auditRef.collection('entries').add({
      ...entry,
      createdAt: FieldValue.serverTimestamp(),
    })

    logger.info('Audit entry logged', {
      version: entry.version,
      operatorId: entry.operatorId,
      isEmergencyPush: entry.isEmergencyPush,
    })
  } catch (error) {
    // Log error but don't fail the main operation
    logger.error('Failed to log audit entry', { error, entry })
  }
}

/**
 * Initialize the allowlist in Firestore from bundled defaults
 *
 * Called on first access or for seeding.
 *
 * @param operatorId - Optional operator ID for audit
 * @returns Whether initialization was needed
 */
export async function initializeAllowlist(operatorId?: string): Promise<boolean> {
  const db = getFirestore()
  const docRef = db.collection(CONFIG_COLLECTION).doc(ALLOWLIST_DOC_ID)

  try {
    const doc = await docRef.get()

    if (doc.exists) {
      logger.info('Allowlist already initialized')
      return false
    }

    const timestamp = Date.now()
    const initialData: CrisisAllowlistDoc = {
      version: CRISIS_ALLOWLIST_VERSION,
      lastUpdated: timestamp,
      resources: CRISIS_RESOURCES,
      updatedBy: operatorId || 'system',
      isEmergencyPush: false,
    }

    await docRef.set(initialData)

    // Log audit entry for initialization
    if (operatorId) {
      await logAuditEntry({
        timestamp,
        version: CRISIS_ALLOWLIST_VERSION,
        operatorId,
        reason: 'Initial allowlist seeding from bundled defaults',
        resourcesAdded: CRISIS_RESOURCES.map((r: CrisisResource) => r.id),
        resourcesRemoved: [],
        isEmergencyPush: false,
      })
    }

    logger.info('Allowlist initialized from bundled defaults', {
      version: CRISIS_ALLOWLIST_VERSION,
      resourceCount: CRISIS_RESOURCES.length,
    })

    return true
  } catch (error) {
    logger.error('Failed to initialize allowlist', { error })
    throw error
  }
}

/**
 * Remove a resource from the allowlist
 *
 * Used for emergency removal of incorrect entries.
 *
 * @param resourceId - ID of resource to remove
 * @param reason - Reason for removal
 * @param operatorId - Admin UID making the change
 * @returns Removal result
 */
export async function removeResource(
  resourceId: string,
  reason: string,
  operatorId: string
): Promise<EmergencyPushResponse> {
  const db = getFirestore()
  const docRef = db.collection(CONFIG_COLLECTION).doc(ALLOWLIST_DOC_ID)

  try {
    // Use transaction for atomic read-modify-write
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef)

      if (!doc.exists) {
        return {
          success: false,
          newVersion: '0.0.0',
          timestamp: Date.now(),
          message: 'Allowlist not initialized',
        }
      }

      const currentData = doc.data() as CrisisAllowlistDoc
      const resourceIndex = currentData.resources.findIndex(
        (r: CrisisResource) => r.id === resourceId
      )

      if (resourceIndex === -1) {
        return {
          success: false,
          newVersion: currentData.version,
          timestamp: Date.now(),
          message: `Resource '${resourceId}' not found in allowlist`,
        }
      }

      // Remove resource
      const newResources = currentData.resources.filter((r: CrisisResource) => r.id !== resourceId)
      const newVersion = incrementVersion(currentData.version)
      const timestamp = Date.now()

      const newData: CrisisAllowlistDoc = {
        version: newVersion,
        lastUpdated: timestamp,
        resources: newResources,
        updatedBy: operatorId,
        isEmergencyPush: true,
      }

      transaction.set(docRef, newData)

      return {
        success: true,
        newVersion,
        timestamp,
      }
    })

    // If not found or not initialized, return early
    if (!result.success) {
      return result as EmergencyPushResponse
    }

    // Log audit entry (outside transaction - non-critical)
    await logAuditEntry({
      timestamp: result.timestamp,
      version: result.newVersion,
      operatorId,
      reason,
      resourcesAdded: [],
      resourcesRemoved: [resourceId],
      isEmergencyPush: true,
    })

    logger.info('Resource removed from allowlist', {
      newVersion: result.newVersion,
      resourceId,
      operatorId,
      reason,
    })

    return {
      success: true,
      newVersion: result.newVersion,
      timestamp: result.timestamp,
      message: `Resource '${resourceId}' removed from allowlist (v${result.newVersion})`,
    }
  } catch (error) {
    logger.error('Failed to remove resource', { error, resourceId, operatorId })
    throw error
  }
}
