/**
 * Custody service for Firestore operations.
 *
 * Handles custody arrangement declarations stored in /children/{childId}.
 * Uses Firebase SDK directly per Unbreakable Rule #2.
 * Validates data with Zod schemas from @fledgely/shared/contracts.
 */

import { doc, updateDoc, serverTimestamp, FirestoreError } from 'firebase/firestore'
import {
  custodyArrangementSchema,
  type CustodyType,
  type CustodyArrangement,
  type ChildProfile,
} from '@fledgely/shared/contracts'
import { getFirestoreDb } from '../lib/firebase'

// NOTE: Custody timestamp conversion is handled by childService.ts
// when loading child profiles. This service focuses on custody writes only.

/**
 * Declare custody arrangement for a child.
 *
 * @param childId - The child document ID
 * @param guardianUid - The UID of the guardian making the declaration
 * @param type - The custody type (sole, shared, or complex)
 * @param explanation - Optional explanation (required for 'complex' type)
 * @throws If update fails, Firestore error, or data is invalid
 */
export async function declareCustody(
  childId: string,
  guardianUid: string,
  type: CustodyType,
  explanation?: string | null
): Promise<void> {
  // Build custody data for validation
  const custodyData = {
    type,
    explanation: type === 'complex' ? explanation?.trim() || null : null,
    declaredBy: guardianUid,
    declaredAt: new Date(), // Use Date for validation
    updatedAt: null,
    updatedBy: null,
  }

  // Validate with Zod before writing (Unbreakable Rule #1)
  const validatedCustody = custodyArrangementSchema.parse(custodyData)

  try {
    const db = getFirestoreDb()
    const childRef = doc(db, 'children', childId)

    await updateDoc(childRef, {
      custody: {
        type: validatedCustody.type,
        explanation: validatedCustody.explanation,
        declaredBy: validatedCustody.declaredBy,
        declaredAt: serverTimestamp(),
        updatedAt: null,
        updatedBy: null,
      },
      updatedAt: serverTimestamp(),
    })
  } catch (err) {
    if (err instanceof FirestoreError) {
      console.error(
        `Firestore error declaring custody for child ${childId}:`,
        err.code,
        err.message
      )
      throw new Error(`Failed to declare custody: ${err.message}`)
    }
    throw err
  }
}

/**
 * Update an existing custody arrangement.
 *
 * @param childId - The child document ID
 * @param guardianUid - The UID of the guardian updating the declaration
 * @param type - The new custody type
 * @param explanation - Optional explanation (required for 'complex' type)
 * @throws If update fails or Firestore error
 */
export async function updateCustody(
  childId: string,
  guardianUid: string,
  type: CustodyType,
  explanation?: string | null
): Promise<void> {
  // Validate the updated custody type and explanation
  // We only validate the fields being updated
  if (type === 'complex' && (!explanation || !explanation.trim())) {
    throw new Error('Explanation is required for complex custody arrangements')
  }

  try {
    const db = getFirestoreDb()
    const childRef = doc(db, 'children', childId)

    await updateDoc(childRef, {
      'custody.type': type,
      'custody.explanation': type === 'complex' ? explanation?.trim() || null : null,
      'custody.updatedAt': serverTimestamp(),
      'custody.updatedBy': guardianUid,
      updatedAt: serverTimestamp(),
    })
  } catch (err) {
    if (err instanceof FirestoreError) {
      console.error(`Firestore error updating custody for child ${childId}:`, err.code, err.message)
      throw new Error(`Failed to update custody: ${err.message}`)
    }
    throw err
  }
}

/**
 * Check if a child has a custody declaration.
 *
 * @param child - The child profile to check
 * @returns true if custody is declared
 */
export function hasCustodyDeclaration(child: ChildProfile): boolean {
  return child.custody !== null && child.custody !== undefined
}

/**
 * Get the custody arrangement from a child profile.
 *
 * @param child - The child profile
 * @returns The custody arrangement, or null if not declared
 */
export function getCustody(child: ChildProfile): CustodyArrangement | null {
  return child.custody ?? null
}

/**
 * Get a display-friendly label for a custody type.
 *
 * @param type - The custody type
 * @returns Human-readable label
 */
export function getCustodyTypeLabel(type: CustodyType): string {
  switch (type) {
    case 'sole':
      return 'Sole Custody'
    case 'shared':
      return 'Shared Custody'
    case 'complex':
      return 'Complex Arrangement'
  }
}

/**
 * Get a description for a custody type.
 *
 * @param type - The custody type
 * @returns Description text
 */
export function getCustodyTypeDescription(type: CustodyType): string {
  switch (type) {
    case 'sole':
      return 'One parent has full custody of the child.'
    case 'shared':
      return 'Both parents share custody. Additional safeguards will apply.'
    case 'complex':
      return 'Blended family or other arrangement. Please provide details below.'
  }
}

/**
 * Validate custody arrangement data.
 *
 * Note: Timestamp conversion for custody is handled by childService.ts
 * when loading child profiles. This function validates already-converted data.
 *
 * @param data - Custody data (with Dates, not Timestamps)
 * @returns Validated custody arrangement
 * @throws If validation fails
 */
export function validateCustody(data: Record<string, unknown>): CustodyArrangement {
  return custodyArrangementSchema.parse(data)
}
