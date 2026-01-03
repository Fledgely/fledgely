/**
 * Cloud Functions for managing location-specific rules.
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD) - verify caller is guardian & location features enabled
 * 4. Business logic via batch write (LAST)
 *
 * Story 40.2: Location-Specific Rule Configuration
 * - AC2: Per-Location Time Limits
 * - AC3: Per-Location Category Rules (education-only mode default for school)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { verifyAuth } from '../shared/auth'
import { setLocationRuleInputSchema, deleteLocationRuleInputSchema } from '@fledgely/shared'

// Response types
interface SetLocationRuleResponse {
  success: boolean
  ruleId: string
  message: string
  isNew: boolean
}

interface DeleteLocationRuleResponse {
  success: boolean
  message: string
}

/**
 * Helper to verify guardian has permission to manage location rules.
 * Checks that:
 * 1. Family exists
 * 2. Caller is a guardian
 * 3. Location features are enabled
 */
async function verifyGuardianAndLocationEnabled(
  familyId: string,
  uid: string,
  db: FirebaseFirestore.Firestore
): Promise<FirebaseFirestore.DocumentSnapshot> {
  const familyRef = db.collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()!

  // Verify caller is a guardian
  const guardianUids = familyData.guardianUids || []
  if (!guardianUids.includes(uid)) {
    throw new HttpsError('permission-denied', 'Only family guardians can manage location rules')
  }

  // Verify location features are enabled
  if (!familyData.locationFeaturesEnabled) {
    throw new HttpsError(
      'failed-precondition',
      'Location features must be enabled before creating location rules'
    )
  }

  return familyDoc
}

/**
 * Set (create or update) a location-specific rule.
 *
 * Story 40.2: AC2, AC3
 * - Creates or updates rule for a child at a specific zone
 * - Defaults education-only mode to true for school zones
 */
export const setLocationRule = onCall<
  Parameters<typeof setLocationRuleInputSchema.parse>[0],
  Promise<SetLocationRuleResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = setLocationRuleInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
    throw new HttpsError('invalid-argument', `Invalid input: ${errorMessage}`)
  }
  const { familyId, zoneId, childId, dailyTimeLimitMinutes, categoryOverrides, educationOnlyMode } =
    parseResult.data

  const db = getFirestore()

  // 3. Permission (THIRD)
  await verifyGuardianAndLocationEnabled(familyId, user.uid, db)

  // Verify zone exists and get its type
  const zoneRef = db.collection('families').doc(familyId).collection('locationZones').doc(zoneId)
  const zoneDoc = await zoneRef.get()

  if (!zoneDoc.exists) {
    throw new HttpsError('not-found', 'Location zone not found')
  }

  const zoneData = zoneDoc.data()!
  const zoneType = zoneData.type as string

  // Verify child exists in family
  const familyRef = db.collection('families').doc(familyId)
  const familyDoc = await familyRef.get()
  const familyData = familyDoc.data()!
  const childIds = familyData.childIds || []

  if (!childIds.includes(childId)) {
    throw new HttpsError('not-found', 'Child not found in family')
  }

  // 4. Business logic (LAST)
  const batch = db.batch()

  // Check if rule already exists for this zone+child combination
  const existingRulesQuery = await db
    .collection('families')
    .doc(familyId)
    .collection('locationRules')
    .where('zoneId', '==', zoneId)
    .where('childId', '==', childId)
    .limit(1)
    .get()

  const now = new Date()
  let ruleRef: FirebaseFirestore.DocumentReference
  let isNew = true

  if (!existingRulesQuery.empty) {
    // Update existing rule
    ruleRef = existingRulesQuery.docs[0].ref
    isNew = false

    const updateData: Record<string, unknown> = {
      updatedAt: now,
    }

    if (dailyTimeLimitMinutes !== undefined) {
      updateData.dailyTimeLimitMinutes = dailyTimeLimitMinutes
    }
    if (categoryOverrides !== undefined) {
      updateData.categoryOverrides = categoryOverrides
    }
    if (educationOnlyMode !== undefined) {
      updateData.educationOnlyMode = educationOnlyMode
    }

    batch.update(ruleRef, updateData)
  } else {
    // Create new rule
    ruleRef = db.collection('families').doc(familyId).collection('locationRules').doc()

    // Default education-only mode to true for school zones (AC3)
    const defaultEducationOnlyMode = zoneType === 'school'

    batch.set(ruleRef, {
      id: ruleRef.id,
      zoneId,
      familyId,
      childId,
      dailyTimeLimitMinutes: dailyTimeLimitMinutes ?? null,
      categoryOverrides: categoryOverrides ?? {},
      educationOnlyMode: educationOnlyMode ?? defaultEducationOnlyMode,
      createdAt: now,
      updatedAt: now,
    })
  }

  // Create audit log entry
  const auditRef = db.collection('families').doc(familyId).collection('auditLog').doc()
  batch.set(auditRef, {
    id: auditRef.id,
    action: isNew ? 'location_rule_created' : 'location_rule_updated',
    performedByUid: user.uid,
    targetRuleId: ruleRef.id,
    targetZoneId: zoneId,
    targetChildId: childId,
    details: {
      dailyTimeLimitMinutes,
      educationOnlyMode,
      hasCategoryOverrides: Object.keys(categoryOverrides ?? {}).length > 0,
    },
    createdAt: FieldValue.serverTimestamp(),
  })

  await batch.commit()

  return {
    success: true,
    ruleId: ruleRef.id,
    message: isNew ? 'Location rule created successfully' : 'Location rule updated successfully',
    isNew,
  }
})

/**
 * Delete a location-specific rule.
 *
 * Story 40.2: AC2, AC3
 * - Removes rule, reverting to default settings for the zone
 */
export const deleteLocationRule = onCall<
  Parameters<typeof deleteLocationRuleInputSchema.parse>[0],
  Promise<DeleteLocationRuleResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = deleteLocationRuleInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
    throw new HttpsError('invalid-argument', `Invalid input: ${errorMessage}`)
  }
  const { familyId, ruleId } = parseResult.data

  const db = getFirestore()

  // 3. Permission (THIRD)
  await verifyGuardianAndLocationEnabled(familyId, user.uid, db)

  // Verify rule exists
  const ruleRef = db.collection('families').doc(familyId).collection('locationRules').doc(ruleId)
  const ruleDoc = await ruleRef.get()

  if (!ruleDoc.exists) {
    throw new HttpsError('not-found', 'Location rule not found')
  }

  const ruleData = ruleDoc.data()!

  // 4. Business logic (LAST)
  const batch = db.batch()

  // Delete rule document
  batch.delete(ruleRef)

  // Create audit log entry
  const auditRef = db.collection('families').doc(familyId).collection('auditLog').doc()
  batch.set(auditRef, {
    id: auditRef.id,
    action: 'location_rule_deleted',
    performedByUid: user.uid,
    targetRuleId: ruleId,
    targetZoneId: ruleData.zoneId,
    targetChildId: ruleData.childId,
    createdAt: FieldValue.serverTimestamp(),
  })

  await batch.commit()

  return {
    success: true,
    message: 'Location rule deleted successfully',
  }
})
