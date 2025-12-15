'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import {
  declareCustody as declareCustodyService,
  updateCustody as updateCustodyService,
  declareOrUpdateCustody as declareOrUpdateCustodyService,
  getCustodyDeclaration,
} from '@/services/custodyService'
import type {
  CustodyDeclaration,
  CreateCustodyDeclarationInput,
  ChildProfile,
} from '@fledgely/contracts'
import { hasCustodyDeclaration as hasCustodyDeclarationHelper } from '@fledgely/contracts'

/**
 * Hook return type for useCustody
 */
export interface UseCustodyReturn {
  /** Current custody declaration or null if not declared */
  custody: CustodyDeclaration | null
  /** Whether custody operations are loading */
  loading: boolean
  /** Error state if custody operations fail */
  error: Error | null
  /** Whether custody has been declared */
  hasCustody: boolean
  /** Declare custody for a child (initial declaration) */
  declareCustody: (
    childId: string,
    input: CreateCustodyDeclarationInput
  ) => Promise<CustodyDeclaration>
  /** Update custody for a child (preserves history) */
  updateCustody: (
    childId: string,
    input: CreateCustodyDeclarationInput
  ) => Promise<CustodyDeclaration>
  /** Declare or update custody (convenience method) */
  declareOrUpdateCustody: (
    childId: string,
    input: CreateCustodyDeclarationInput
  ) => Promise<CustodyDeclaration>
  /** Clear error state */
  clearError: () => void
  /** Fetch custody declaration for a child */
  fetchCustody: (childId: string) => Promise<CustodyDeclaration | null>
  /** Set custody from external source (e.g., from child data) */
  setCustodyFromChild: (child: ChildProfile) => void
}

/**
 * useCustody Hook - Manages custody declaration state
 *
 * Provides functions for declaring and updating custody arrangements.
 * Includes idempotency guards to prevent duplicate submissions.
 *
 * @example
 * ```tsx
 * const { custody, hasCustody, loading, declareCustody } = useCustody()
 *
 * if (!hasCustody) {
 *   return <CustodyDeclarationForm onSubmit={(data) => declareCustody(childId, data)} />
 * }
 * return <CustodyDisplay custody={custody} />
 * ```
 */
export function useCustody(): UseCustodyReturn {
  const { user: authUser } = useAuthContext()

  const [custody, setCustody] = useState<CustodyDeclaration | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Track mounted state to prevent memory leaks
  const mountedRef = useRef(true)

  /**
   * Idempotency guard - prevents duplicate custody operations from double-clicks
   * This is CRITICAL to prevent duplicate declarations if user double-clicks submit
   */
  const isSubmittingRef = useRef(false)

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    if (mountedRef.current) {
      setError(null)
    }
  }, [])

  /**
   * Fetch custody declaration for a child
   */
  const fetchCustody = useCallback(async (childId: string): Promise<CustodyDeclaration | null> => {
    if (mountedRef.current) {
      setLoading(true)
      setError(null)
    }

    try {
      const declaration = await getCustodyDeclaration(childId)

      if (mountedRef.current) {
        setCustody(declaration)
      }

      return declaration
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load custody declaration')

      if (mountedRef.current) {
        setError(error)
      }

      return null
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  /**
   * Set custody from a child profile (avoids extra fetch)
   */
  const setCustodyFromChild = useCallback((child: ChildProfile) => {
    if (mountedRef.current) {
      setCustody(child.custodyDeclaration || null)
    }
  }, [])

  /**
   * Declare custody for a child (initial declaration)
   * Includes idempotency guard to prevent duplicate submissions
   */
  const declareCustody = useCallback(
    async (
      childId: string,
      input: CreateCustodyDeclarationInput
    ): Promise<CustodyDeclaration> => {
      if (!authUser) {
        throw new Error('You need to be signed in to declare custody')
      }

      // Idempotency guard - prevent duplicate submissions from double-clicks
      if (isSubmittingRef.current) {
        throw new Error('Custody is already being declared. Please wait.')
      }

      isSubmittingRef.current = true

      if (mountedRef.current) {
        setLoading(true)
        setError(null)
      }

      try {
        const declaration = await declareCustodyService(childId, input, authUser.uid)

        if (mountedRef.current) {
          // Optimistic update - set the new custody
          setCustody(declaration)
        }

        return declaration
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Could not declare custody')

        if (mountedRef.current) {
          setError(error)
        }

        throw error
      } finally {
        isSubmittingRef.current = false
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    },
    [authUser]
  )

  /**
   * Update custody for a child (preserves history)
   * Includes idempotency guard to prevent duplicate submissions
   */
  const updateCustody = useCallback(
    async (
      childId: string,
      input: CreateCustodyDeclarationInput
    ): Promise<CustodyDeclaration> => {
      if (!authUser) {
        throw new Error('You need to be signed in to update custody')
      }

      // Idempotency guard - prevent duplicate submissions from double-clicks
      if (isSubmittingRef.current) {
        throw new Error('Custody is already being updated. Please wait.')
      }

      isSubmittingRef.current = true

      if (mountedRef.current) {
        setLoading(true)
        setError(null)
      }

      try {
        const declaration = await updateCustodyService(childId, input, authUser.uid)

        if (mountedRef.current) {
          // Optimistic update - set the updated custody
          setCustody(declaration)
        }

        return declaration
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Could not update custody')

        if (mountedRef.current) {
          setError(error)
        }

        throw error
      } finally {
        isSubmittingRef.current = false
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    },
    [authUser]
  )

  /**
   * Declare or update custody for a child
   * Convenience method that handles both new declarations and updates
   * Includes idempotency guard to prevent duplicate submissions
   */
  const declareOrUpdateCustody = useCallback(
    async (
      childId: string,
      input: CreateCustodyDeclarationInput
    ): Promise<CustodyDeclaration> => {
      if (!authUser) {
        throw new Error('You need to be signed in to set custody')
      }

      // Idempotency guard - prevent duplicate submissions from double-clicks
      if (isSubmittingRef.current) {
        throw new Error('Custody operation is already in progress. Please wait.')
      }

      isSubmittingRef.current = true

      if (mountedRef.current) {
        setLoading(true)
        setError(null)
      }

      try {
        const declaration = await declareOrUpdateCustodyService(childId, input, authUser.uid)

        if (mountedRef.current) {
          // Optimistic update - set the custody
          setCustody(declaration)
        }

        return declaration
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Could not set custody')

        if (mountedRef.current) {
          setError(error)
        }

        throw error
      } finally {
        isSubmittingRef.current = false
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    },
    [authUser]
  )

  return {
    custody,
    loading,
    error,
    hasCustody: custody !== null,
    declareCustody,
    updateCustody,
    declareOrUpdateCustody,
    clearError,
    fetchCustody,
    setCustodyFromChild,
  }
}

/**
 * Check if a child has custody declared
 * Helper that uses the contract function
 */
export { hasCustodyDeclarationHelper as hasCustodyDeclaration }
