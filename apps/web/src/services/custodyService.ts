'use client'

import { doc, serverTimestamp, runTransaction, type Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  createCustodyDeclarationInputSchema,
  requiresSharedCustodySafeguards,
  getCustodyErrorMessage,
  type CustodyDeclaration,
  type CreateCustodyDeclarationInput,
} from '@fledgely/contracts'

/**
 * Custody Service - Firestore operations for custody declaration management
 *
 * Follows project guidelines:
 * - Direct Firestore SDK (no abstractions)
 * - Types from Zod schemas
 * - Server timestamps for reliability
 * - Transaction-based operations for atomic updates
 * - History preservation for audit trail
 *
 * Story 2.3: Custody Arrangement Declaration
 */

/** Collection name for child documents */
const CHILDREN_COLLECTION = 'children'

/**
 * Error messages at 6th-grade reading level (NFR65)
 */
const ERROR_MESSAGES: Record<string, string> = {
  'child-not-found': 'We could not find this child. Please try again.',
  'permission-denied': 'You do not have permission to change custody settings.',
  'not-a-guardian': 'Only guardians can declare custody arrangements.',
  'custody-already-declared': 'Custody has already been declared. Use update instead.',
  'no-custody-to-update': 'No custody declaration exists yet. Please declare custody first.',
  unavailable: 'Connection problem. Please check your internet and try again.',
  'network-request-failed': 'Could not connect. Please check your internet.',
  default: 'Something went wrong. Please try again.',
}

/**
 * Custom error class for custody service errors
 */
export class CustodyServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'CustodyServiceError'
  }
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof CustodyServiceError) {
    return ERROR_MESSAGES[error.code] || getCustodyErrorMessage(error.code) || ERROR_MESSAGES.default
  }
  if (error instanceof Error) {
    // Check for Firebase error codes
    const errorCode = (error as { code?: string }).code
    if (errorCode && ERROR_MESSAGES[errorCode]) {
      return ERROR_MESSAGES[errorCode]
    }
    // Check error message for known patterns
    for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
      if (error.message.includes(key)) {
        return message
      }
    }
  }
  return ERROR_MESSAGES.default
}

/**
 * Declare custody arrangement for a child
 *
 * Creates initial custody declaration. Only allowed by guardians with full permissions.
 * Use updateCustody() if child already has a custody declaration.
 *
 * Returns optimistic data immediately after transaction commit to avoid
 * race conditions with serverTimestamp() resolution.
 *
 * @param childId - ID of the child to declare custody for
 * @param input - Custody declaration input data
 * @param userId - Firebase Auth uid of the user declaring custody
 * @returns Created custody declaration
 * @throws CustodyServiceError if user lacks permission or child not found
 */
export async function declareCustody(
  childId: string,
  input: CreateCustodyDeclarationInput,
  userId: string
): Promise<CustodyDeclaration> {
  try {
    // Validate input
    const validatedInput = createCustodyDeclarationInputSchema.parse(input)

    const childRef = doc(db, CHILDREN_COLLECTION, childId)

    // Capture timestamp before transaction for optimistic return
    const now = new Date()

    await runTransaction(db, async (transaction) => {
      const childDoc = await transaction.get(childRef)

      if (!childDoc.exists()) {
        throw new CustodyServiceError('child-not-found', 'Child not found')
      }

      const childData = childDoc.data()

      // Verify user is guardian with full permissions
      const guardians = childData.guardians as Array<{ uid: string; permissions: string }>
      const userGuardian = guardians.find((g) => g.uid === userId)

      if (!userGuardian) {
        throw new CustodyServiceError('not-a-guardian', 'User is not a guardian for this child')
      }

      if (userGuardian.permissions !== 'full') {
        throw new CustodyServiceError(
          'permission-denied',
          'User does not have permission to declare custody'
        )
      }

      // Check if custody already declared (should use updateCustody instead)
      if (childData.custodyDeclaration) {
        throw new CustodyServiceError(
          'custody-already-declared',
          'Custody has already been declared'
        )
      }

      // Create custody declaration
      const declaration = {
        type: validatedInput.type,
        notes: validatedInput.notes || null,
        declaredBy: userId,
        declaredAt: serverTimestamp(),
      }

      // Set shared custody safeguards flag based on custody type
      const needsSafeguards = requiresSharedCustodySafeguards(validatedInput.type)

      transaction.update(childRef, {
        custodyDeclaration: declaration,
        requiresSharedCustodySafeguards: needsSafeguards,
      })
    })

    // Return optimistic data immediately after transaction commits
    return {
      type: validatedInput.type,
      notes: validatedInput.notes || null,
      declaredBy: userId,
      declaredAt: now,
    }
  } catch (error) {
    if (error instanceof CustodyServiceError) {
      const message = getErrorMessage(error)
      console.error('[custodyService.declareCustody]', error)
      throw new Error(message)
    }
    const message = getErrorMessage(error)
    console.error('[custodyService.declareCustody]', error)
    throw new Error(message)
  }
}

/**
 * Update custody arrangement for a child
 *
 * Updates existing custody declaration and preserves previous declaration in history.
 * Only allowed by guardians with full permissions.
 *
 * Returns optimistic data immediately after transaction commit to avoid
 * race conditions with serverTimestamp() resolution.
 *
 * @param childId - ID of the child to update custody for
 * @param input - Custody declaration input data
 * @param userId - Firebase Auth uid of the user updating custody
 * @returns Updated custody declaration
 * @throws CustodyServiceError if user lacks permission or no existing declaration
 */
export async function updateCustody(
  childId: string,
  input: CreateCustodyDeclarationInput,
  userId: string
): Promise<CustodyDeclaration> {
  try {
    // Validate input
    const validatedInput = createCustodyDeclarationInputSchema.parse(input)

    const childRef = doc(db, CHILDREN_COLLECTION, childId)

    // Capture timestamp before transaction for optimistic return
    const now = new Date()

    await runTransaction(db, async (transaction) => {
      const childDoc = await transaction.get(childRef)

      if (!childDoc.exists()) {
        throw new CustodyServiceError('child-not-found', 'Child not found')
      }

      const childData = childDoc.data()

      // Verify user is guardian with full permissions
      const guardians = childData.guardians as Array<{ uid: string; permissions: string }>
      const userGuardian = guardians.find((g) => g.uid === userId)

      if (!userGuardian) {
        throw new CustodyServiceError('not-a-guardian', 'User is not a guardian for this child')
      }

      if (userGuardian.permissions !== 'full') {
        throw new CustodyServiceError(
          'permission-denied',
          'User does not have permission to update custody'
        )
      }

      // Check that there's an existing custody declaration to update
      const previousDeclaration = childData.custodyDeclaration
      if (!previousDeclaration) {
        throw new CustodyServiceError('no-custody-to-update', 'No custody declaration exists')
      }

      // Preserve previous declaration in history
      const history = (childData.custodyHistory || []) as Array<unknown>
      history.push({
        previousDeclaration,
        changedAt: serverTimestamp(),
        changedBy: userId,
      })

      // Create new custody declaration
      const declaration = {
        type: validatedInput.type,
        notes: validatedInput.notes || null,
        declaredBy: userId,
        declaredAt: serverTimestamp(),
      }

      // Set shared custody safeguards flag based on new custody type
      const needsSafeguards = requiresSharedCustodySafeguards(validatedInput.type)

      transaction.update(childRef, {
        custodyDeclaration: declaration,
        custodyHistory: history,
        requiresSharedCustodySafeguards: needsSafeguards,
      })
    })

    // Return optimistic data immediately after transaction commits
    return {
      type: validatedInput.type,
      notes: validatedInput.notes || null,
      declaredBy: userId,
      declaredAt: now,
    }
  } catch (error) {
    if (error instanceof CustodyServiceError) {
      const message = getErrorMessage(error)
      console.error('[custodyService.updateCustody]', error)
      throw new Error(message)
    }
    const message = getErrorMessage(error)
    console.error('[custodyService.updateCustody]', error)
    throw new Error(message)
  }
}

/**
 * Declare or update custody in one operation
 *
 * Convenience function that declares custody if none exists, or updates if it does.
 * This is useful for forms that don't know whether this is a new declaration or update.
 *
 * @param childId - ID of the child
 * @param input - Custody declaration input data
 * @param userId - Firebase Auth uid of the user
 * @returns Custody declaration
 */
export async function declareOrUpdateCustody(
  childId: string,
  input: CreateCustodyDeclarationInput,
  userId: string
): Promise<CustodyDeclaration> {
  try {
    // Validate input
    const validatedInput = createCustodyDeclarationInputSchema.parse(input)

    const childRef = doc(db, CHILDREN_COLLECTION, childId)

    // Capture timestamp before transaction for optimistic return
    const now = new Date()

    await runTransaction(db, async (transaction) => {
      const childDoc = await transaction.get(childRef)

      if (!childDoc.exists()) {
        throw new CustodyServiceError('child-not-found', 'Child not found')
      }

      const childData = childDoc.data()

      // Verify user is guardian with full permissions
      const guardians = childData.guardians as Array<{ uid: string; permissions: string }>
      const userGuardian = guardians.find((g) => g.uid === userId)

      if (!userGuardian) {
        throw new CustodyServiceError('not-a-guardian', 'User is not a guardian for this child')
      }

      if (userGuardian.permissions !== 'full') {
        throw new CustodyServiceError(
          'permission-denied',
          'User does not have permission to declare custody'
        )
      }

      const previousDeclaration = childData.custodyDeclaration
      const history = (childData.custodyHistory || []) as Array<unknown>

      // If there's a previous declaration, preserve it in history
      if (previousDeclaration) {
        history.push({
          previousDeclaration,
          changedAt: serverTimestamp(),
          changedBy: userId,
        })
      }

      // Create new custody declaration
      const declaration = {
        type: validatedInput.type,
        notes: validatedInput.notes || null,
        declaredBy: userId,
        declaredAt: serverTimestamp(),
      }

      // Set shared custody safeguards flag based on custody type
      const needsSafeguards = requiresSharedCustodySafeguards(validatedInput.type)

      transaction.update(childRef, {
        custodyDeclaration: declaration,
        custodyHistory: history,
        requiresSharedCustodySafeguards: needsSafeguards,
      })
    })

    // Return optimistic data immediately after transaction commits
    return {
      type: validatedInput.type,
      notes: validatedInput.notes || null,
      declaredBy: userId,
      declaredAt: now,
    }
  } catch (error) {
    if (error instanceof CustodyServiceError) {
      const message = getErrorMessage(error)
      console.error('[custodyService.declareOrUpdateCustody]', error)
      throw new Error(message)
    }
    const message = getErrorMessage(error)
    console.error('[custodyService.declareOrUpdateCustody]', error)
    throw new Error(message)
  }
}

/**
 * Get custody declaration for a child
 *
 * @param childId - ID of the child
 * @returns Custody declaration or null if not declared
 */
export async function getCustodyDeclaration(
  childId: string
): Promise<CustodyDeclaration | null> {
  try {
    const childRef = doc(db, CHILDREN_COLLECTION, childId)
    const { getDoc } = await import('firebase/firestore')
    const snapshot = await getDoc(childRef)

    if (!snapshot.exists()) {
      throw new CustodyServiceError('child-not-found', 'Child not found')
    }

    const childData = snapshot.data()
    const custodyDeclaration = childData.custodyDeclaration

    if (!custodyDeclaration) {
      return null
    }

    // Convert Firestore Timestamp to Date
    return {
      type: custodyDeclaration.type,
      notes: custodyDeclaration.notes || null,
      declaredBy: custodyDeclaration.declaredBy,
      declaredAt: (custodyDeclaration.declaredAt as Timestamp)?.toDate() || new Date(),
    }
  } catch (error) {
    if (error instanceof CustodyServiceError) {
      const message = getErrorMessage(error)
      console.error('[custodyService.getCustodyDeclaration]', error)
      throw new Error(message)
    }
    const message = getErrorMessage(error)
    console.error('[custodyService.getCustodyDeclaration]', error)
    throw new Error(message)
  }
}
