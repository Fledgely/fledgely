/**
 * Annotation Service - Story 23.2
 *
 * Handles child annotation submission for flagged content.
 * Features:
 * - Submit annotation with pre-set option and optional explanation
 * - Skip annotation (child chooses not to explain)
 * - Update flag document with annotation data
 * - Update childNotificationStatus appropriately
 */

import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  type AnnotationOption,
  type FlagDocument,
  MAX_ANNOTATION_EXPLANATION_LENGTH,
  ANNOTATION_OPTION_VALUES,
} from '@fledgely/shared'

/**
 * Parameters for submitting an annotation
 */
export interface SubmitAnnotationParams {
  /** Flag ID to annotate */
  flagId: string
  /** Child ID submitting the annotation */
  childId: string
  /** Selected annotation option */
  annotation: AnnotationOption
  /** Optional free-text explanation */
  explanation?: string
}

/**
 * Result of annotation submission
 */
export interface AnnotationResult {
  success: boolean
  error?: string
  annotatedAt?: number
}

/**
 * Validate that the annotation option is allowed
 */
export function isValidAnnotationOption(option: string): option is AnnotationOption {
  return ANNOTATION_OPTION_VALUES.includes(option as AnnotationOption)
}

/**
 * Validate and sanitize explanation text
 */
export function sanitizeExplanation(explanation: string | undefined): string | undefined {
  if (!explanation || explanation.trim().length === 0) {
    return undefined
  }

  const trimmed = explanation.trim()

  // Truncate if too long
  if (trimmed.length > MAX_ANNOTATION_EXPLANATION_LENGTH) {
    return trimmed.slice(0, MAX_ANNOTATION_EXPLANATION_LENGTH)
  }

  return trimmed
}

/**
 * Get a flag document by ID
 */
export async function getFlagForAnnotation(
  childId: string,
  flagId: string
): Promise<FlagDocument | null> {
  const flagRef = doc(db, 'children', childId, 'flags', flagId)
  const flagSnap = await getDoc(flagRef)

  if (!flagSnap.exists()) {
    return null
  }

  return flagSnap.data() as FlagDocument
}

/**
 * Verify child can annotate this flag
 * - Flag must exist
 * - Flag must belong to the child
 * - Flag must be in 'notified' status (waiting for annotation)
 */
export async function canChildAnnotate(
  childId: string,
  flagId: string
): Promise<{ canAnnotate: boolean; reason?: string; flag?: FlagDocument }> {
  const flag = await getFlagForAnnotation(childId, flagId)

  if (!flag) {
    return { canAnnotate: false, reason: 'Flag not found' }
  }

  if (flag.childId !== childId) {
    return { canAnnotate: false, reason: 'Flag does not belong to this child' }
  }

  if (flag.childNotificationStatus !== 'notified') {
    return {
      canAnnotate: false,
      reason: `Flag is not awaiting annotation (status: ${flag.childNotificationStatus})`,
    }
  }

  return { canAnnotate: true, flag }
}

/**
 * Submit an annotation for a flagged content
 *
 * AC4: Submit annotation
 * - Annotation saved to flag document
 * - Flag status updated to reflect annotation
 */
export async function submitAnnotation(params: SubmitAnnotationParams): Promise<AnnotationResult> {
  const { flagId, childId, annotation, explanation } = params

  // Validate annotation option
  if (!isValidAnnotationOption(annotation)) {
    return { success: false, error: `Invalid annotation option: ${annotation}` }
  }

  // Verify child can annotate
  const { canAnnotate, reason } = await canChildAnnotate(childId, flagId)
  if (!canAnnotate) {
    return { success: false, error: reason }
  }

  // Sanitize explanation
  const sanitizedExplanation = sanitizeExplanation(explanation)

  const annotatedAt = Date.now()

  try {
    const flagRef = doc(db, 'children', childId, 'flags', flagId)

    await updateDoc(flagRef, {
      childAnnotation: annotation,
      ...(sanitizedExplanation && { childExplanation: sanitizedExplanation }),
      annotatedAt,
      childNotificationStatus: 'annotated',
    })

    return { success: true, annotatedAt }
  } catch (error) {
    console.error('Failed to submit annotation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit annotation',
    }
  }
}

/**
 * Skip annotation for a flagged content
 *
 * AC5: Skip option
 * - Marks flag as "skipped annotation"
 * - Timer continues (parent will see "Child skipped")
 */
export async function skipAnnotation(childId: string, flagId: string): Promise<AnnotationResult> {
  // Verify child can annotate (skip is a form of annotation)
  const { canAnnotate, reason } = await canChildAnnotate(childId, flagId)
  if (!canAnnotate) {
    return { success: false, error: reason }
  }

  const annotatedAt = Date.now()

  try {
    const flagRef = doc(db, 'children', childId, 'flags', flagId)

    await updateDoc(flagRef, {
      childAnnotation: 'skipped',
      annotatedAt,
      // Note: childNotificationStatus stays as 'notified' or updates to 'skipped'
      // Per AC5: "timer continues" - so we don't mark as fully annotated
      childNotificationStatus: 'skipped',
    })

    return { success: true, annotatedAt }
  } catch (error) {
    console.error('Failed to skip annotation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to skip annotation',
    }
  }
}

/**
 * Check if annotation window has expired
 */
export function hasAnnotationWindowExpired(annotationDeadline: number | undefined): boolean {
  if (!annotationDeadline) return true
  return Date.now() > annotationDeadline
}

/**
 * Get remaining time for annotation in milliseconds
 */
export function getAnnotationRemainingTime(annotationDeadline: number | undefined): number {
  if (!annotationDeadline) return 0
  const remaining = annotationDeadline - Date.now()
  return Math.max(0, remaining)
}
