/**
 * Family Code Service - Story 19B.1
 *
 * Validates family codes and retrieves children for child login.
 *
 * Task 1.3: Implement family code + child name authentication
 */

import { collection, getDocs, query, where } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'

/**
 * Child info for login selection
 */
export interface ChildForLogin {
  id: string
  name: string
}

/**
 * Family info for child login
 */
export interface FamilyForLogin {
  id: string
  name: string
  children: ChildForLogin[]
}

/**
 * Family code format: 6-character alphanumeric
 * For MVP, family code = last 6 characters of familyId (case-insensitive)
 */
export function generateFamilyCodeFromId(familyId: string): string {
  // Use last 6 characters of the family ID as the code
  return familyId.slice(-6).toUpperCase()
}

/**
 * Validate a family code and return family + children if valid.
 *
 * @param familyCode - 6-character family code entered by child
 * @returns FamilyForLogin if valid, null if invalid
 *
 * SECURITY TODO (Code Review H2):
 * Current implementation does a full table scan of all families for MVP simplicity.
 * For production, this should be refactored to:
 * 1. Store the family code as an indexed field on the family document
 * 2. Query directly: where('familyCode', '==', normalizedCode)
 * 3. This prevents O(n) reads and timing attacks that expose family count
 *
 * SECURITY TODO (Code Review M3):
 * Add rate limiting to prevent brute-force enumeration of 6-char family codes.
 * Consider: IP-based rate limiting via Cloud Function, CAPTCHA after failed attempts,
 * or exponential backoff on the client.
 */
export async function validateFamilyCode(familyCode: string): Promise<FamilyForLogin | null> {
  const normalizedCode = familyCode.trim().toUpperCase()

  if (normalizedCode.length !== 6) {
    return null
  }

  const db = getFirestoreDb()

  // Query families to find one matching this code
  // For MVP, we search by checking if familyId ends with this code
  // In production, we'd store the code explicitly on the family document
  const familiesRef = collection(db, 'families')
  const familiesSnapshot = await getDocs(familiesRef)

  // Find matching family using for...of for proper type narrowing
  let familyId: string | null = null
  let familyName: string | null = null

  for (const doc of familiesSnapshot.docs) {
    const generatedCode = generateFamilyCodeFromId(doc.id)
    if (generatedCode === normalizedCode) {
      const data = doc.data()
      familyId = doc.id
      familyName = data.name || 'Your Family'
      break
    }
  }

  if (!familyId || !familyName) {
    return null
  }

  // Get children for this family
  const childrenRef = collection(db, 'children')
  const childrenQuery = query(childrenRef, where('familyId', '==', familyId))
  const childrenSnapshot = await getDocs(childrenQuery)

  const children: ChildForLogin[] = []
  for (const doc of childrenSnapshot.docs) {
    const data = doc.data()
    children.push({
      id: doc.id,
      name: data.name || 'Unknown',
    })
  }

  return {
    id: familyId,
    name: familyName,
    children,
  }
}
