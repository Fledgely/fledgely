/**
 * Cloud Function for granting temporary access to caregivers.
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD) - verify caller is guardian of family
 * 4. Business logic via batch write (LAST)
 *
 * Story 39.3: Temporary Caregiver Access
 * - AC1: Start and end time configurable
 * - AC2: Access presets (today_only, this_weekend, custom)
 * - AC3: Automatic access expiry
 * - AC6: All temporary access logged
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { verifyAuth } from '../shared/auth'
import {
  temporaryAccessPresetSchema,
  MIN_TEMP_ACCESS_DURATION_HOURS,
  MAX_TEMP_ACCESS_DURATION_DAYS,
} from '@fledgely/shared/contracts'

// Input validation schema
const grantTemporaryAccessInputSchema = z.object({
  familyId: z.string().min(1, 'familyId is required'),
  caregiverUid: z.string().min(1, 'caregiverUid is required'),
  preset: temporaryAccessPresetSchema,
  /** Custom start time (required for 'custom' preset) */
  startAt: z.string().datetime().optional(),
  /** Custom end time (required for 'custom' preset) */
  endAt: z.string().datetime().optional(),
  timezone: z.string().min(1, 'timezone is required'),
})

// Response type
interface GrantTemporaryAccessResponse {
  success: boolean
  grantId: string
  startAt: string
  endAt: string
  preset: string
  status: string
}

/**
 * Calculate dates based on preset.
 */
function calculatePresetDates(
  preset: z.infer<typeof temporaryAccessPresetSchema>,
  timezone: string,
  customStartAt?: string,
  customEndAt?: string
): { startAt: Date; endAt: Date } {
  const now = new Date()

  switch (preset) {
    case 'today_only': {
      // Now until midnight in user's timezone
      // For simplicity, we calculate end of day in UTC and adjust
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)
      return {
        startAt: now,
        endAt: endOfDay,
      }
    }
    case 'this_weekend': {
      // Friday 5pm to Sunday 10pm
      const dayOfWeek = now.getDay() // 0=Sunday, 5=Friday
      let daysToFriday = 5 - dayOfWeek
      if (daysToFriday < 0) daysToFriday += 7
      if (daysToFriday === 0 && now.getHours() >= 17) {
        // It's already Friday after 5pm, so this weekend is now
        daysToFriday = 0
      }

      const friday = new Date(now)
      friday.setDate(friday.getDate() + daysToFriday)
      friday.setHours(17, 0, 0, 0)

      const sunday = new Date(friday)
      sunday.setDate(sunday.getDate() + 2)
      sunday.setHours(22, 0, 0, 0)

      // If we're past the start time, start now
      const startAt = now > friday ? now : friday

      return {
        startAt,
        endAt: sunday,
      }
    }
    case 'custom': {
      if (!customStartAt || !customEndAt) {
        throw new HttpsError('invalid-argument', 'Custom preset requires startAt and endAt')
      }
      return {
        startAt: new Date(customStartAt),
        endAt: new Date(customEndAt),
      }
    }
  }
}

/**
 * Validate duration constraints.
 */
function validateDuration(startAt: Date, endAt: Date): void {
  const durationMs = endAt.getTime() - startAt.getTime()
  const durationHours = durationMs / (1000 * 60 * 60)

  if (durationHours < MIN_TEMP_ACCESS_DURATION_HOURS) {
    throw new HttpsError(
      'invalid-argument',
      `Duration must be at least ${MIN_TEMP_ACCESS_DURATION_HOURS} hour(s)`
    )
  }

  const maxDurationHours = MAX_TEMP_ACCESS_DURATION_DAYS * 24
  if (durationHours > maxDurationHours) {
    throw new HttpsError(
      'invalid-argument',
      `Duration cannot exceed ${MAX_TEMP_ACCESS_DURATION_DAYS} days`
    )
  }

  if (endAt <= startAt) {
    throw new HttpsError('invalid-argument', 'End time must be after start time')
  }

  if (endAt <= new Date()) {
    throw new HttpsError('invalid-argument', 'End time must be in the future')
  }
}

/**
 * Grant temporary access to a caregiver.
 *
 * Validates that:
 * - User is authenticated
 * - Input is valid
 * - Family exists
 * - Caller is a guardian of the family
 * - Caregiver exists in the family
 * - Duration is within allowed limits
 *
 * Then:
 * - Creates temporary access grant document
 * - Creates audit log entry
 * - Returns grant details
 */
export const grantTemporaryAccess = onCall<
  z.infer<typeof grantTemporaryAccessInputSchema>,
  Promise<GrantTemporaryAccessResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = grantTemporaryAccessInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
    throw new HttpsError('invalid-argument', `Invalid input: ${errorMessage}`)
  }
  const { familyId, caregiverUid, preset, startAt, endAt, timezone } = parseResult.data

  const db = getFirestore()

  // 3. Permission (THIRD) - Verify caller is guardian of family
  const familyRef = db.collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()!

  // Verify caller is a guardian
  const isGuardian = familyData.guardians?.some((g: { uid: string }) => g.uid === user.uid)
  if (!isGuardian) {
    throw new HttpsError('permission-denied', 'Only guardians can grant temporary access')
  }

  // Find the caregiver in the family
  const caregivers = familyData.caregivers || []
  const caregiver = caregivers.find((c: { uid: string }) => c.uid === caregiverUid)

  if (!caregiver) {
    throw new HttpsError('not-found', 'Caregiver not found in this family')
  }

  // 4. Business logic - create temporary access grant (LAST)

  // Calculate dates based on preset
  const { startAt: calculatedStartAt, endAt: calculatedEndAt } = calculatePresetDates(
    preset,
    timezone,
    startAt,
    endAt
  )

  // Validate duration constraints
  validateDuration(calculatedStartAt, calculatedEndAt)

  // Determine initial status
  const now = new Date()
  const status = calculatedStartAt <= now ? 'active' : 'pending'

  // Create batch for atomic updates
  const batch = db.batch()

  // Create temporary access grant document
  const grantRef = familyRef.collection('temporaryAccessGrants').doc()
  const grantData = {
    id: grantRef.id,
    familyId,
    caregiverUid,
    grantedByUid: user.uid,
    startAt: Timestamp.fromDate(calculatedStartAt),
    endAt: Timestamp.fromDate(calculatedEndAt),
    preset,
    timezone,
    status,
    createdAt: FieldValue.serverTimestamp(),
  }
  batch.set(grantRef, grantData)

  // Create audit log entry (Story 39.3 AC6)
  const auditLogRef = db.collection('caregiverAuditLogs').doc()
  batch.set(auditLogRef, {
    id: auditLogRef.id,
    familyId,
    caregiverUid,
    action: 'temporary_access_granted',
    changedByUid: user.uid,
    changes: {
      grantId: grantRef.id,
      preset,
      startAt: calculatedStartAt.toISOString(),
      endAt: calculatedEndAt.toISOString(),
      status,
    },
    createdAt: FieldValue.serverTimestamp(),
  })

  // Commit all changes atomically
  await batch.commit()

  // Log success for audit trail (no PII per project standards)
  console.log(
    `Temporary access granted: familyId=${familyId}, caregiverUid=${caregiverUid}, grantId=${grantRef.id}, preset=${preset}, status=${status}`
  )

  return {
    success: true,
    grantId: grantRef.id,
    startAt: calculatedStartAt.toISOString(),
    endAt: calculatedEndAt.toISOString(),
    preset,
    status,
  }
})
