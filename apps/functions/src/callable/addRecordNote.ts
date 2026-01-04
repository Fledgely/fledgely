/**
 * Add Record Note - Callable
 *
 * Story 51.8: Right to Rectification - AC2, AC3
 *
 * Allows users to add contextual notes to historical records
 * without altering the original data (preserving integrity).
 */

import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  NotableRecordType,
  RECTIFICATION_CONFIG,
  type AddRecordNoteInput,
  type AddRecordNoteResponse,
  type RecordNote,
  type NotableRecordTypeValue,
} from '@fledgely/shared'

/**
 * Valid record types that can have notes added.
 */
const VALID_RECORD_TYPES: NotableRecordTypeValue[] = [
  NotableRecordType.SCREENSHOT,
  NotableRecordType.FLAG,
  NotableRecordType.LOCATION_EVENT,
  NotableRecordType.CHECK_IN,
  NotableRecordType.AI_DESCRIPTION,
]

/**
 * Collection names for each record type.
 */
const RECORD_COLLECTIONS: Record<NotableRecordTypeValue, string> = {
  [NotableRecordType.SCREENSHOT]: 'screenshots',
  [NotableRecordType.FLAG]: 'flags',
  [NotableRecordType.LOCATION_EVENT]: 'locationEvents',
  [NotableRecordType.CHECK_IN]: 'checkIns',
  [NotableRecordType.AI_DESCRIPTION]: 'aiDescriptions',
}

export const addRecordNote = onCall<AddRecordNoteInput, Promise<AddRecordNoteResponse>>(
  { maxInstances: 20 },
  async (request: CallableRequest<AddRecordNoteInput>): Promise<AddRecordNoteResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const uid = request.auth.uid
    const db = getFirestore()
    const { recordType, recordId, content, isDispute } = request.data

    // Validate record type
    if (!VALID_RECORD_TYPES.includes(recordType)) {
      throw new HttpsError('invalid-argument', `Invalid record type: ${recordType}`)
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Note content cannot be empty')
    }

    if (content.length > RECTIFICATION_CONFIG.MAX_NOTE_LENGTH) {
      throw new HttpsError(
        'invalid-argument',
        `Note exceeds maximum length of ${RECTIFICATION_CONFIG.MAX_NOTE_LENGTH} characters`
      )
    }

    try {
      // Get user info for note attribution
      const userDoc = await db.collection('users').doc(uid).get()
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found')
      }

      const userData = userDoc.data()
      const familyId = userData?.familyId
      const userName = userData?.displayName || userData?.email || 'Unknown User'

      // Verify the record exists
      const collectionName = RECORD_COLLECTIONS[recordType]
      const recordRef = db.collection(collectionName).doc(recordId)
      const recordDoc = await recordRef.get()

      if (!recordDoc.exists) {
        throw new HttpsError('not-found', `Record not found: ${recordId}`)
      }

      // Verify user has access to this record (same family)
      const recordData = recordDoc.data()
      if (recordData?.familyId && recordData.familyId !== familyId) {
        throw new HttpsError('permission-denied', 'You do not have access to this record')
      }

      // Generate note ID
      const noteId = generateNoteId()

      // Create note
      const note: RecordNote = {
        noteId,
        recordType,
        recordId,
        content: content.trim(),
        addedBy: uid,
        addedByName: userName,
        addedAt: Date.now(),
        isDispute: isDispute ?? false,
      }

      // Add note to subcollection
      const noteRef = recordRef.collection(RECTIFICATION_CONFIG.NOTES_SUBCOLLECTION).doc(noteId)
      await noteRef.set(note)

      // If this is a dispute, also log it
      if (isDispute) {
        logger.info('Record disputed via note', {
          uid,
          recordType,
          recordId,
          noteId,
        })
      }

      logger.info('Record note added', {
        uid,
        recordType,
        recordId,
        noteId,
        isDispute: isDispute ?? false,
      })

      return {
        success: true,
        noteId,
        message: isDispute ? 'Dispute note added successfully' : 'Note added successfully',
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      logger.error('Failed to add record note', {
        uid,
        recordType,
        recordId,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      throw new HttpsError('internal', 'Failed to add note')
    }
  }
)

/**
 * Generate a unique note ID.
 */
function generateNoteId(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `NOTE-${dateStr}-${randomPart}`
}
