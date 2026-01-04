/**
 * Reverse Mode Callable Functions - Story 52.2, 52.3
 *
 * Callable functions for managing reverse mode activation/deactivation.
 *
 * Story 52.2:
 * AC1: Check if child is 16+ for reverse mode visibility
 * AC2: Activation requires understanding confirmation
 * AC3: Mode switch - child controls what's shared
 * AC4: Parent notification on activation
 * AC5: Can be deactivated anytime
 * AC6: Mode changes logged (NFR42)
 *
 * Story 52.3:
 * AC1: Daily screen time summary sharing
 * AC2: Category-based sharing
 * AC3: Time limit status sharing
 * AC5: Granular controls
 * AC6: Real-time parent view update
 * AC7: Settings persistence
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  canActivateReverseMode,
  canActivateWithSettings,
  isReverseModeActiveStatus,
  getReverseModeStatus,
  createActivationSettings,
  createDeactivationSettings,
  createActivationEvent,
  createDeactivationEvent,
  validateConfirmationAcknowledged,
  getParentReverseModeActivatedMessage,
  getParentReverseModeDeactivatedMessage,
  SUPPORTING_INDEPENDENCE_LINK,
  calculateParentVisibility,
  validateSharingPreferences,
  generateSharingPreview,
  type ReverseModeSettings,
  type ReverseModeChangeEvent,
  type ReverseModeShareingPreferences,
  type ChildActivityData,
  type ScreenTimeData,
} from '@fledgely/shared'

const db = getFirestore()

/**
 * Helper to convert Firestore Timestamp or Date to Date.
 */
function toDate(value: Date | Timestamp | undefined | null): Date | null {
  if (!value) return null
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return value
  // Handle plain object with toDate method (Firestore Timestamp from data)
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate()
  }
  return null
}

/**
 * Helper to find child and verify access.
 */
async function findChildWithAccess(
  childId: string,
  authUid: string
): Promise<{
  childData: FirebaseFirestore.DocumentData
  familyId: string
  familyData: FirebaseFirestore.DocumentData
  childRef: FirebaseFirestore.DocumentReference
}> {
  const familiesSnapshot = await db
    .collection('families')
    .where('memberIds', 'array-contains', authUid)
    .get()

  for (const familyDoc of familiesSnapshot.docs) {
    const childDoc = await db
      .collection('families')
      .doc(familyDoc.id)
      .collection('children')
      .doc(childId)
      .get()

    if (childDoc.exists) {
      return {
        childData: childDoc.data()!,
        familyId: familyDoc.id,
        familyData: familyDoc.data()!,
        childRef: childDoc.ref,
      }
    }
  }

  throw new HttpsError('not-found', 'Child not found or access denied')
}

/**
 * Log a reverse mode change event for audit purposes (NFR42).
 */
async function logReverseModeChangeEvent(
  familyId: string,
  event: ReverseModeChangeEvent
): Promise<void> {
  await db
    .collection('families')
    .doc(familyId)
    .collection('auditLogs')
    .doc(event.id)
    .set({
      ...event,
      timestamp: FieldValue.serverTimestamp(),
      eventType: 'reverse_mode_change',
    })
}

/**
 * Send notification to all parents in family about reverse mode change.
 */
async function notifyParents(
  familyId: string,
  familyData: FirebaseFirestore.DocumentData,
  childName: string,
  isActivation: boolean
): Promise<void> {
  const parentIds = familyData.parentIds || []
  const message = isActivation
    ? getParentReverseModeActivatedMessage(childName)
    : getParentReverseModeDeactivatedMessage(childName)

  const notificationsRef = db.collection('families').doc(familyId).collection('notifications')

  for (const parentId of parentIds) {
    await notificationsRef.add({
      recipientId: parentId,
      type: isActivation ? 'reverse_mode_activated' : 'reverse_mode_deactivated',
      title: 'Reverse Mode Update',
      message,
      resourceLink: SUPPORTING_INDEPENDENCE_LINK,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
      childId: null, // Will be set by caller
    })
  }
}

/**
 * Get reverse mode status for a child.
 */
export const getReverseModeStatusCallable = onCall({ enforceAppCheck: false }, async (request) => {
  const { childId } = request.data as { childId: string }

  if (!childId) {
    throw new HttpsError('invalid-argument', 'Child ID is required')
  }

  const auth = request.auth
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  const { childData, familyId } = await findChildWithAccess(childId, auth.uid)

  // Get birthdate for eligibility check
  if (!childData.birthdate) {
    throw new HttpsError('failed-precondition', 'Child birthdate not set')
  }

  const birthdate = childData.birthdate.toDate()
  const isEligible = canActivateReverseMode(birthdate)
  const settings = childData.reverseModeSettings as ReverseModeSettings | undefined
  const status = getReverseModeStatus(settings)
  const isActive = isReverseModeActiveStatus(settings)
  const canActivate = canActivateWithSettings(birthdate, settings)

  return {
    status,
    isActive,
    isEligible,
    canActivate,
    activatedAt: toDate(settings?.activatedAt),
    deactivatedAt: toDate(settings?.deactivatedAt),
    sharingPreferences: settings?.sharingPreferences || null,
    familyId,
  }
})

/**
 * Activate reverse mode for a child.
 * AC2: Requires confirmation acknowledgment
 * AC3: Sets default sharing to nothing
 * AC4: Notifies parents
 * AC6: Logs audit event
 */
export const activateReverseModeCallable = onCall({ enforceAppCheck: false }, async (request) => {
  const { childId, confirmationAcknowledged } = request.data as {
    childId: string
    confirmationAcknowledged: boolean
  }

  if (!childId) {
    throw new HttpsError('invalid-argument', 'Child ID is required')
  }

  const auth = request.auth
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  // Verify confirmation was acknowledged (AC2)
  const confirmationValidation = validateConfirmationAcknowledged(confirmationAcknowledged)
  if (!confirmationValidation.valid) {
    throw new HttpsError('failed-precondition', confirmationValidation.error!)
  }

  const { childData, familyId, familyData, childRef } = await findChildWithAccess(childId, auth.uid)

  // Verify child has birthdate
  if (!childData.birthdate) {
    throw new HttpsError('failed-precondition', 'Child birthdate not set')
  }

  const birthdate = childData.birthdate.toDate()
  const currentSettings = childData.reverseModeSettings as ReverseModeSettings | undefined

  // Verify child is 16+ and not already active (AC1)
  if (!canActivateWithSettings(birthdate, currentSettings)) {
    if (!canActivateReverseMode(birthdate)) {
      throw new HttpsError(
        'failed-precondition',
        'Reverse Mode is only available for children 16 years or older'
      )
    }
    throw new HttpsError('failed-precondition', 'Reverse Mode is already active')
  }

  // Create activation settings with default nothing shared (AC3)
  const activationSettings = createActivationSettings(childId)

  // Update child document with new reverse mode settings
  await childRef.update({
    reverseModeSettings: {
      ...activationSettings,
      activatedAt: FieldValue.serverTimestamp(),
    },
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Log audit event (AC6)
  const previousStatus = getReverseModeStatus(currentSettings)
  const auditEvent = createActivationEvent(
    childId,
    familyId,
    previousStatus,
    request.rawRequest?.ip,
    request.rawRequest?.headers?.['user-agent'] as string | undefined
  )
  await logReverseModeChangeEvent(familyId, auditEvent)

  // Notify parents (AC4)
  const childName = childData.name || childData.displayName || 'Your teen'
  await notifyParents(familyId, familyData, childName, true)

  return {
    success: true,
    status: 'active',
    activatedAt: new Date(),
    sharingPreferences: activationSettings.sharingPreferences,
  }
})

/**
 * Deactivate reverse mode for a child.
 * AC5: Can be deactivated anytime
 * AC6: Logs audit event
 */
export const deactivateReverseModeCallable = onCall({ enforceAppCheck: false }, async (request) => {
  const { childId } = request.data as { childId: string }

  if (!childId) {
    throw new HttpsError('invalid-argument', 'Child ID is required')
  }

  const auth = request.auth
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  const { childData, familyId, familyData, childRef } = await findChildWithAccess(childId, auth.uid)

  const currentSettings = childData.reverseModeSettings as ReverseModeSettings | undefined

  // Verify reverse mode is currently active
  if (!isReverseModeActiveStatus(currentSettings)) {
    throw new HttpsError('failed-precondition', 'Reverse Mode is not currently active')
  }

  // Create deactivation settings (preserves activation history)
  const deactivationSettings = createDeactivationSettings(currentSettings!)

  // Update child document with deactivated reverse mode settings
  await childRef.update({
    reverseModeSettings: {
      ...deactivationSettings,
      deactivatedAt: FieldValue.serverTimestamp(),
    },
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Log audit event (AC6)
  const auditEvent = createDeactivationEvent(
    childId,
    familyId,
    request.rawRequest?.ip,
    request.rawRequest?.headers?.['user-agent'] as string | undefined
  )
  await logReverseModeChangeEvent(familyId, auditEvent)

  // Notify parents
  const childName = childData.name || childData.displayName || 'Your teen'
  await notifyParents(familyId, familyData, childName, false)

  return {
    success: true,
    status: 'off',
    deactivatedAt: new Date(),
  }
})

/**
 * Update sharing preferences while in reverse mode.
 * Story 52.3: Enhanced with granular controls.
 *
 * AC5: Granular controls - what, when, how much
 * AC6: Real-time update - parents see only what teen chooses
 * AC7: Settings persistence - previous selections preserved
 */
export const updateReverseModeSharing = onCall({ enforceAppCheck: false }, async (request) => {
  const { childId, sharingPreferences } = request.data as {
    childId: string
    sharingPreferences: Partial<ReverseModeShareingPreferences>
  }

  if (!childId) {
    throw new HttpsError('invalid-argument', 'Child ID is required')
  }

  if (!sharingPreferences || typeof sharingPreferences !== 'object') {
    throw new HttpsError('invalid-argument', 'Sharing preferences are required')
  }

  const auth = request.auth
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  const { childData, childRef } = await findChildWithAccess(childId, auth.uid)

  const currentSettings = childData.reverseModeSettings as ReverseModeSettings | undefined

  // Verify reverse mode is active
  if (!isReverseModeActiveStatus(currentSettings)) {
    throw new HttpsError('failed-precondition', 'Reverse Mode must be active to update sharing')
  }

  // Merge new preferences with existing ones (AC7: Settings persistence)
  const currentPrefs = currentSettings!.sharingPreferences || {}
  const updatedPreferences: ReverseModeShareingPreferences = {
    screenTime: sharingPreferences.screenTime ?? currentPrefs.screenTime ?? false,
    screenTimeDetail:
      sharingPreferences.screenTimeDetail ?? currentPrefs.screenTimeDetail ?? 'none',
    flags: sharingPreferences.flags ?? currentPrefs.flags ?? false,
    screenshots: sharingPreferences.screenshots ?? currentPrefs.screenshots ?? false,
    location: sharingPreferences.location ?? currentPrefs.location ?? false,
    timeLimitStatus: sharingPreferences.timeLimitStatus ?? currentPrefs.timeLimitStatus ?? false,
    sharedCategories: sharingPreferences.sharedCategories ?? currentPrefs.sharedCategories ?? [],
  }

  // Validate the preferences
  const validation = validateSharingPreferences(updatedPreferences)
  if (!validation.valid) {
    throw new HttpsError('invalid-argument', validation.errors.join(', '))
  }

  // Update child document (AC6: Real-time update)
  await childRef.update({
    'reverseModeSettings.sharingPreferences': updatedPreferences,
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Generate preview for response (AC5: Preview of what parents see)
  const preview = generateSharingPreview(updatedPreferences)

  return {
    success: true,
    sharingPreferences: updatedPreferences,
    preview,
  }
})

/**
 * Get the sharing preview for current preferences.
 * AC5: Preview of what parents will see.
 */
export const getSharingPreviewCallable = onCall({ enforceAppCheck: false }, async (request) => {
  const { childId } = request.data as { childId: string }

  if (!childId) {
    throw new HttpsError('invalid-argument', 'Child ID is required')
  }

  const auth = request.auth
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  const { childData } = await findChildWithAccess(childId, auth.uid)
  const currentSettings = childData.reverseModeSettings as ReverseModeSettings | undefined

  // If reverse mode is not active, return null preview
  if (!isReverseModeActiveStatus(currentSettings)) {
    return {
      reverseModeActive: false,
      preview: null,
    }
  }

  const preview = generateSharingPreview(currentSettings?.sharingPreferences)

  return {
    reverseModeActive: true,
    preview,
    sharingPreferences: currentSettings?.sharingPreferences || null,
  }
})

/**
 * Get parent-visible data for a child.
 * Story 52.3 Task 3: Returns filtered data based on sharing preferences.
 *
 * AC1: Daily screen time summary only (if configured)
 * AC2: Category-based filtering
 * AC3: Time limit status if enabled
 * AC4: "No data shared" when nothing shared
 * AC6: Real-time filtered view
 */
export const getParentVisibleDataCallable = onCall({ enforceAppCheck: false }, async (request) => {
  const { childId } = request.data as { childId: string }

  if (!childId) {
    throw new HttpsError('invalid-argument', 'Child ID is required')
  }

  const auth = request.auth
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  const { childData, familyId, familyData } = await findChildWithAccess(childId, auth.uid)

  // Verify the requester is a parent
  const parentIds = familyData.parentIds || []
  if (!parentIds.includes(auth.uid)) {
    throw new HttpsError('permission-denied', 'Only parents can view child data')
  }

  const currentSettings = childData.reverseModeSettings as ReverseModeSettings | undefined

  // Fetch the child's activity data
  const activityData = await fetchChildActivityData(familyId, childId)

  // Calculate what parents can see based on reverse mode settings
  const visibleData = calculateParentVisibility(
    activityData,
    currentSettings?.sharingPreferences,
    currentSettings
  )

  return {
    childId,
    reverseModeActive: isReverseModeActiveStatus(currentSettings),
    ...visibleData,
  }
})

/**
 * Helper to fetch child activity data for parent visibility calculation.
 */
async function fetchChildActivityData(
  familyId: string,
  childId: string
): Promise<ChildActivityData> {
  // Fetch screen time data
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const screenTimeDoc = await db
    .collection('families')
    .doc(familyId)
    .collection('children')
    .doc(childId)
    .collection('screenTime')
    .where('date', '>=', todayStart)
    .orderBy('date', 'desc')
    .limit(1)
    .get()

  let screenTime: ScreenTimeData = {
    totalMinutes: 0,
    categoryBreakdown: {},
    appBreakdown: {},
    isApproachingLimit: false,
    isLimitReached: false,
  }

  if (!screenTimeDoc.empty) {
    const data = screenTimeDoc.docs[0].data()
    screenTime = {
      totalMinutes: data.totalMinutes || 0,
      categoryBreakdown: data.categoryBreakdown || {},
      appBreakdown: data.appBreakdown || {},
      isApproachingLimit: data.isApproachingLimit || false,
      isLimitReached: data.isLimitReached || false,
      dailyLimit: data.dailyLimit,
    }
  }

  // Fetch recent flags
  const flagsSnapshot = await db
    .collection('families')
    .doc(familyId)
    .collection('children')
    .doc(childId)
    .collection('flags')
    .where('createdAt', '>=', todayStart)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get()

  const flags = flagsSnapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      category: data.category || 'unknown',
      type: data.type || 'unknown',
      timestamp: data.createdAt?.toDate() || new Date(),
      description: data.description || '',
    }
  })

  // Fetch recent screenshots
  const screenshotsSnapshot = await db
    .collection('families')
    .doc(familyId)
    .collection('children')
    .doc(childId)
    .collection('screenshots')
    .where('createdAt', '>=', todayStart)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get()

  const screenshots = screenshotsSnapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      timestamp: data.createdAt?.toDate() || new Date(),
      appName: data.appName || 'Unknown',
      url: data.url || '',
    }
  })

  // Fetch last location
  const locationDoc = await db
    .collection('families')
    .doc(familyId)
    .collection('children')
    .doc(childId)
    .collection('locations')
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get()

  let location = {}
  if (!locationDoc.empty) {
    const data = locationDoc.docs[0].data()
    location = {
      lastLocation: {
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp?.toDate() || new Date(),
      },
    }
  }

  return {
    screenTime,
    flags,
    screenshots,
    location,
  }
}
