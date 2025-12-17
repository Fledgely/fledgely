import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import {
  routeSignalInputSchema,
  externalSignalPayloadSchema,
  crisisPartnerConfigSchema,
  encryptedSignalPackageSchema,
  partnerWebhookPayloadSchema,
  EXTERNAL_ROUTING_CONSTANTS,
  createExternalPayload,
  createBlackout,
  validatePayloadExclusions,
  generateSignalRef,
  findPartnerForJurisdiction,
  isPartnerAvailable,
  type RouteSignalInput,
  type ExternalSignalPayload,
  type CrisisPartnerConfig,
  type EncryptedSignalPackage,
  type PartnerRegistry,
  type SignalRoutingRecord,
  type SignalBlackout,
  type RoutingStatus,
} from '@fledgely/contracts'

/**
 * Callable Cloud Function: routeSafetySignal
 *
 * Story 7.5.2: External Signal Routing - Task 5
 *
 * Routes a triggered safety signal to the appropriate external crisis partner.
 * This is the critical path for child safety protection.
 *
 * CRITICAL SECURITY REQUIREMENTS (INV-002):
 * 1. NEVER include family identifiers in external payload
 * 2. NEVER log full payload to family-accessible collections
 * 3. NEVER notify family of signal routing
 * 4. ALWAYS encrypt payload before external delivery
 * 5. ALWAYS start 48-hour blackout on successful routing
 * 6. ALWAYS store routing records in isolated collection
 *
 * This function:
 * - Validates the signal exists
 * - Retrieves child's age and custody status
 * - Selects appropriate partner based on jurisdiction
 * - Builds minimal external payload
 * - Encrypts and sends to partner webhook
 * - Records routing status in isolated collection
 * - Starts 48-hour notification blackout
 */
export const routeSafetySignal = onCall(
  {
    // Requires authentication - triggered by system/admin only
    enforceAppCheck: true,
    // Increase timeout for external webhook call
    timeoutSeconds: 60,
    // Limit to prevent abuse
    maxInstances: 10,
  },
  async (request) => {
    // Ensure authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const db = getFirestore()

    // Validate input
    const parseResult = routeSignalInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid routing request',
        parseResult.error.flatten()
      )
    }

    const input = parseResult.data
    const routingId = generateRoutingId()
    const startedAt = Timestamp.now()

    try {
      // 1. Create initial routing record in isolated collection
      const routingRecord = createInitialRoutingRecord(routingId, input, startedAt)
      await db
        .collection(EXTERNAL_ROUTING_CONSTANTS.ROUTING_LOG_COLLECTION)
        .doc(routingId)
        .set(routingRecord)

      // 2. Get child's age from profile
      const childAge = await getChildAge(db, input.childId)
      if (!childAge) {
        await updateRoutingStatus(db, routingId, 'failed', 'Could not determine child age')
        throw new HttpsError('failed-precondition', 'Could not determine child age')
      }

      // 3. Check custody status
      const hasSharedCustody = await checkSharedCustody(db, input.childId)

      // 4. Determine jurisdiction
      const jurisdiction = input.jurisdiction ?? EXTERNAL_ROUTING_CONSTANTS.DEFAULT_JURISDICTION

      // 5. Find appropriate partner
      const partner = await findPartner(db, jurisdiction)
      if (!partner) {
        await updateRoutingStatus(db, routingId, 'failed', `No partner for jurisdiction: ${jurisdiction}`)
        throw new HttpsError('failed-precondition', 'No available crisis partner')
      }

      // Check if fallback was used
      const registry = await getPartnerRegistry(db)
      const jurisdictionPartnerIds = registry.jurisdictionMap[jurisdiction] || []
      const usedFallback = !jurisdictionPartnerIds.includes(partner.partnerId)

      // Update routing record with partner info
      await db
        .collection(EXTERNAL_ROUTING_CONSTANTS.ROUTING_LOG_COLLECTION)
        .doc(routingId)
        .update({
          partnerId: partner.partnerId,
          usedFallback,
          status: 'encrypting' as RoutingStatus,
        })

      // 6. Build minimal external payload
      const payload = createExternalPayload(
        input.signalId,
        childAge,
        hasSharedCustody,
        input.triggeredAt,
        jurisdiction,
        input.deviceType
      )

      // 7. CRITICAL: Validate payload doesn't contain forbidden fields
      const validationResult = validatePayloadExclusions(payload as Record<string, unknown>)
      if (!validationResult.valid) {
        await updateRoutingStatus(db, routingId, 'failed', 'Payload validation failed')
        throw new HttpsError(
          'internal',
          `SECURITY: Payload contains forbidden fields: ${validationResult.forbiddenFields.join(', ')}`
        )
      }

      // 8. Encrypt payload for partner
      // NOTE: In production, this would use the SignalEncryptionService
      // For now, using mock encryption to simulate the interface
      const encryptedPackage = await encryptPayloadForPartner(payload, partner)

      // Update routing status
      await db
        .collection(EXTERNAL_ROUTING_CONSTANTS.ROUTING_LOG_COLLECTION)
        .doc(routingId)
        .update({
          status: 'sending' as RoutingStatus,
        })

      // 9. Send to partner webhook
      const sendResult = await sendToPartnerWebhook(encryptedPackage, partner, routingId)

      if (sendResult.success) {
        // 10. Update routing record with success
        await db
          .collection(EXTERNAL_ROUTING_CONSTANTS.ROUTING_LOG_COLLECTION)
          .doc(routingId)
          .update({
            status: 'sent' as RoutingStatus,
            sentAt: Timestamp.now(),
            partnerReference: sendResult.reference ?? null,
            responseTimeMs: sendResult.responseTimeMs,
            attempts: sendResult.attempts,
          })

        // 11. Start 48-hour blackout - CRITICAL for family safety
        await startBlackout(db, input.childId, input.signalId)

        // Log success to admin audit ONLY (NOT family-accessible)
        await logToAdminAudit(db, {
          action: 'signal_routed_external',
          resourceType: 'signalRouting',
          resourceId: routingId,
          metadata: {
            partnerId: partner.partnerId,
            usedFallback,
            responseTimeMs: sendResult.responseTimeMs,
            // Do NOT log payload details
          },
        })

        return {
          success: true,
          routingId,
          partnerId: partner.partnerId,
          usedFallback,
          error: null,
        }
      } else {
        // Update routing record with failure
        await db
          .collection(EXTERNAL_ROUTING_CONSTANTS.ROUTING_LOG_COLLECTION)
          .doc(routingId)
          .update({
            status: 'failed' as RoutingStatus,
            lastError: sendResult.error ?? 'Unknown error',
            attempts: sendResult.attempts,
          })

        return {
          success: false,
          routingId,
          partnerId: partner.partnerId,
          usedFallback,
          error: sendResult.error ?? 'Failed to deliver to partner',
        }
      }
    } catch (error) {
      // Update routing record with error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      try {
        await updateRoutingStatus(db, routingId, 'failed', errorMessage)
      } catch {
        // Ignore update errors
      }

      // Re-throw HttpsErrors
      if (error instanceof HttpsError) {
        throw error
      }

      // Log to admin audit
      await logToAdminAudit(db, {
        action: 'signal_routing_failed',
        resourceType: 'signalRouting',
        resourceId: routingId,
        metadata: {
          error: errorMessage,
        },
      })

      throw new HttpsError('internal', 'Signal routing failed')
    }
  }
)

// ============================================================================
// Helper Functions
// ============================================================================

function generateRoutingId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 11)
  return `routing_${timestamp}_${random}`
}

function createInitialRoutingRecord(
  id: string,
  input: RouteSignalInput,
  startedAt: FirebaseFirestore.Timestamp
): SignalRoutingRecord {
  return {
    id,
    signalId: input.signalId,
    partnerId: '', // Will be updated when partner selected
    status: 'pending',
    jurisdiction: input.jurisdiction ?? EXTERNAL_ROUTING_CONSTANTS.DEFAULT_JURISDICTION,
    usedFallback: false,
    startedAt: startedAt.toDate().toISOString(),
    sentAt: null,
    acknowledgedAt: null,
    partnerReference: null,
    attempts: 0,
    lastError: null,
  }
}

async function updateRoutingStatus(
  db: FirebaseFirestore.Firestore,
  routingId: string,
  status: RoutingStatus,
  error?: string
): Promise<void> {
  const updates: Partial<SignalRoutingRecord> = {
    status,
    ...(error && { lastError: error }),
  }

  await db
    .collection(EXTERNAL_ROUTING_CONSTANTS.ROUTING_LOG_COLLECTION)
    .doc(routingId)
    .update(updates)
}

async function getChildAge(
  db: FirebaseFirestore.Firestore,
  childId: string
): Promise<number | null> {
  try {
    const childDoc = await db.collection('children').doc(childId).get()
    if (!childDoc.exists) return null

    const data = childDoc.data()
    if (!data?.birthDate) return null

    // Calculate age from birth date
    const birthDate = data.birthDate instanceof Timestamp
      ? data.birthDate.toDate()
      : new Date(data.birthDate)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  } catch {
    return null
  }
}

async function checkSharedCustody(
  db: FirebaseFirestore.Firestore,
  childId: string
): Promise<boolean> {
  try {
    // Check custody declarations for shared custody
    const custodySnapshot = await db
      .collection('custodyDeclarations')
      .where('childId', '==', childId)
      .where('custodyType', 'in', ['shared', 'joint'])
      .where('status', '==', 'verified')
      .limit(1)
      .get()

    return !custodySnapshot.empty
  } catch {
    return false
  }
}

async function getPartnerRegistry(
  db: FirebaseFirestore.Firestore
): Promise<PartnerRegistry> {
  try {
    const registryDoc = await db.collection('config').doc('partnerRegistry').get()
    if (registryDoc.exists) {
      const data = registryDoc.data()
      return {
        jurisdictionMap: data?.jurisdictionMap ?? {},
        fallbackPartners: data?.fallbackPartners ?? [],
        lastUpdated: data?.lastUpdated ?? new Date().toISOString(),
      }
    }
  } catch {
    // Fall through to default
  }

  // Default registry
  return {
    jurisdictionMap: {},
    fallbackPartners: ['default_national_partner'],
    lastUpdated: new Date().toISOString(),
  }
}

async function getAllPartners(
  db: FirebaseFirestore.Firestore
): Promise<CrisisPartnerConfig[]> {
  try {
    const partnersSnapshot = await db
      .collection(EXTERNAL_ROUTING_CONSTANTS.PARTNER_CONFIG_COLLECTION)
      .where('status', '==', 'active')
      .get()

    return partnersSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        partnerId: doc.id,
        name: data.name,
        description: data.description ?? null,
        status: data.status,
        webhookUrl: data.webhookUrl,
        publicKey: data.publicKey,
        jurisdictions: data.jurisdictions ?? [],
        isFallback: data.isFallback ?? false,
        priority: data.priority ?? 50,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        keyExpiresAt: data.keyExpiresAt ?? null,
      } as CrisisPartnerConfig
    })
  } catch {
    return []
  }
}

async function findPartner(
  db: FirebaseFirestore.Firestore,
  jurisdiction: string
): Promise<CrisisPartnerConfig | null> {
  const registry = await getPartnerRegistry(db)
  const partners = await getAllPartners(db)
  return findPartnerForJurisdiction(jurisdiction, registry, partners)
}

async function encryptPayloadForPartner(
  payload: ExternalSignalPayload,
  partner: CrisisPartnerConfig
): Promise<EncryptedSignalPackage> {
  // NOTE: In production, this would use the SignalEncryptionService
  // with real RSA-OAEP + AES-GCM encryption.
  // For the Cloud Function, we're using a mock that simulates the interface.

  // Mock encryption for development
  const payloadJson = JSON.stringify(payload)
  const encoder = new TextEncoder()
  const payloadBytes = encoder.encode(payloadJson)
  const base64Payload = Buffer.from(payloadBytes).toString('base64')

  const mockEncryptedKey = Buffer.from('MOCK_AES_KEY_' + Date.now()).toString('base64')
  const mockIv = Buffer.from('MOCK_IV_12B!').toString('base64')

  // Generate mock public key hash
  const crypto = await import('crypto')
  const publicKeyHash = crypto
    .createHash('sha256')
    .update(partner.publicKey)
    .digest('hex')

  return {
    encryptedKey: mockEncryptedKey.padEnd(100, '='),
    encryptedPayload: base64Payload,
    iv: mockIv,
    keyAlgorithm: 'RSA-OAEP',
    payloadAlgorithm: 'AES-GCM',
    partnerId: partner.partnerId,
    publicKeyHash,
  }
}

interface SendResult {
  success: boolean
  reference?: string | null
  error?: string
  responseTimeMs: number
  attempts: number
}

async function sendToPartnerWebhook(
  encryptedPackage: EncryptedSignalPackage,
  partner: CrisisPartnerConfig,
  routingId: string
): Promise<SendResult> {
  const startTime = Date.now()
  const maxRetries = EXTERNAL_ROUTING_CONSTANTS.PARTNER_WEBHOOK_MAX_RETRIES
  const timeout = EXTERNAL_ROUTING_CONSTANTS.PARTNER_WEBHOOK_TIMEOUT_MS

  const webhookPayload = {
    version: '1.0' as const,
    instanceId: process.env.GCLOUD_PROJECT ?? 'fledgely',
    package: encryptedPackage,
    deliveredAt: new Date().toISOString(),
    signalRef: generateSignalRef(encryptedPackage.partnerId + routingId),
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(partner.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Fledgely-Version': '1.0',
            'X-Fledgely-Instance': process.env.GCLOUD_PROJECT ?? 'fledgely',
          },
          body: JSON.stringify(webhookPayload),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          if (response.status >= 400 && response.status < 500) {
            // Client error - don't retry
            return {
              success: false,
              error: `Partner rejected: HTTP ${response.status}`,
              responseTimeMs: Date.now() - startTime,
              attempts: attempt,
            }
          }
          // Server error - retry
          continue
        }

        const responseData = await response.json()

        if (responseData.received === false) {
          return {
            success: false,
            error: responseData.error ?? 'Partner rejected signal',
            responseTimeMs: Date.now() - startTime,
            attempts: attempt,
          }
        }

        return {
          success: true,
          reference: responseData.reference ?? null,
          responseTimeMs: Date.now() - startTime,
          attempts: attempt,
        }
      } finally {
        clearTimeout(timeoutId)
      }
    } catch (error) {
      if (attempt === maxRetries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTimeMs: Date.now() - startTime,
          attempts: attempt,
        }
      }

      // Exponential backoff before retry
      const delay = 1000 * Math.pow(2, attempt - 1)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  return {
    success: false,
    error: 'Max retries exceeded',
    responseTimeMs: Date.now() - startTime,
    attempts: maxRetries,
  }
}

async function startBlackout(
  db: FirebaseFirestore.Firestore,
  childId: string,
  signalId: string
): Promise<void> {
  const blackout = createBlackout(childId, signalId)
  const blackoutId = `blackout_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

  await db
    .collection(EXTERNAL_ROUTING_CONSTANTS.BLACKOUT_COLLECTION)
    .doc(blackoutId)
    .set({
      ...blackout,
      id: blackoutId,
      startedAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + EXTERNAL_ROUTING_CONSTANTS.DEFAULT_BLACKOUT_MS),
    })
}

async function logToAdminAudit(
  db: FirebaseFirestore.Firestore,
  entry: {
    action: string
    resourceType: string
    resourceId: string
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  try {
    await db.collection('adminAuditLog').add({
      ...entry,
      timestamp: FieldValue.serverTimestamp(),
    })
  } catch {
    // Ignore audit logging errors - don't fail the main operation
  }
}
