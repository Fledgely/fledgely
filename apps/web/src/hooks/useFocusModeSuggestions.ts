/**
 * useFocusModeSuggestions Hook - Story 33.2 (AC4)
 *
 * Manages child app suggestions for focus mode.
 * Children can request apps to be allowed during focus mode.
 * Parents can approve or deny suggestions.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  query,
  orderBy,
  where,
  arrayUnion,
} from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { FocusModeAppSuggestion, AppSuggestionStatus } from '@fledgely/shared'

interface UseFocusModeSuggestionsOptions {
  childId: string | null
  familyId: string | null
  userUid: string | null
  /** Whether the current user is a parent (can approve/deny) or child (can submit) */
  isParent: boolean
}

interface UseFocusModeSuggestionsReturn {
  suggestions: FocusModeAppSuggestion[]
  pendingSuggestions: FocusModeAppSuggestion[]
  loading: boolean
  error: string | null
  // Child actions
  submitSuggestion: (pattern: string, name: string, reason?: string) => Promise<void>
  // Parent actions
  approveSuggestion: (suggestionId: string) => Promise<void>
  denySuggestion: (suggestionId: string, reason?: string) => Promise<void>
}

export function useFocusModeSuggestions({
  childId,
  familyId,
  userUid,
  isParent,
}: UseFocusModeSuggestionsOptions): UseFocusModeSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<FocusModeAppSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to suggestions
  useEffect(() => {
    if (!childId || !familyId) {
      setLoading(false)
      return
    }

    const suggestionsRef = collection(
      getFirestoreDb(),
      'families',
      familyId,
      'focusModeConfig',
      childId,
      'suggestions'
    )
    const suggestionsQuery = query(suggestionsRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      suggestionsQuery,
      (snapshot) => {
        const suggestionList: FocusModeAppSuggestion[] = []
        snapshot.forEach((doc) => {
          suggestionList.push(doc.data() as FocusModeAppSuggestion)
        })
        setSuggestions(suggestionList)
        setLoading(false)
      },
      (err) => {
        console.error('[useFocusModeSuggestions] Error:', err)
        setError('Failed to load suggestions')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [childId, familyId])

  // Submit a new suggestion (child action)
  const submitSuggestion = useCallback(
    async (pattern: string, name: string, reason?: string) => {
      if (!childId || !familyId || !userUid || isParent) return

      const suggestionsRef = collection(
        getFirestoreDb(),
        'families',
        familyId,
        'focusModeConfig',
        childId,
        'suggestions'
      )
      const now = Date.now()
      const suggestionId = `suggestion-${now}-${Math.random().toString(36).substr(2, 9)}`

      const suggestion: FocusModeAppSuggestion = {
        id: suggestionId,
        childId,
        familyId,
        pattern,
        name,
        reason: reason || null,
        status: 'pending',
        respondedByUid: null,
        respondedAt: null,
        denialReason: null,
        createdAt: now,
        updatedAt: now,
      }

      await addDoc(suggestionsRef, suggestion)
    },
    [childId, familyId, userUid, isParent]
  )

  // Approve a suggestion (parent action)
  const approveSuggestion = useCallback(
    async (suggestionId: string) => {
      if (!childId || !familyId || !userUid || !isParent) return

      // Find the suggestion doc
      const suggestionsRef = collection(
        getFirestoreDb(),
        'families',
        familyId,
        'focusModeConfig',
        childId,
        'suggestions'
      )
      const suggestionQuery = query(suggestionsRef, where('id', '==', suggestionId))

      // Update suggestion status
      const snapshot = await new Promise<{ id: string; data: FocusModeAppSuggestion }[]>(
        (resolve) => {
          const unsubscribe = onSnapshot(
            suggestionQuery,
            (snap) => {
              unsubscribe()
              const docs: { id: string; data: FocusModeAppSuggestion }[] = []
              snap.forEach((d) => docs.push({ id: d.id, data: d.data() as FocusModeAppSuggestion }))
              resolve(docs)
            },
            () => resolve([])
          )
        }
      )

      if (snapshot.length === 0) return

      const suggestionDoc = snapshot[0]
      const suggestionRef = doc(
        getFirestoreDb(),
        'families',
        familyId,
        'focusModeConfig',
        childId,
        'suggestions',
        suggestionDoc.id
      )

      const now = Date.now()
      await updateDoc(suggestionRef, {
        status: 'approved' as AppSuggestionStatus,
        respondedByUid: userUid,
        respondedAt: now,
        updatedAt: now,
      })

      // Also add to allow list
      const configRef = doc(getFirestoreDb(), 'families', familyId, 'focusModeConfig', childId)

      await updateDoc(configRef, {
        customAllowList: arrayUnion({
          pattern: suggestionDoc.data.pattern,
          name: suggestionDoc.data.name,
          isWildcard: suggestionDoc.data.pattern.startsWith('*.'),
          addedAt: now,
          addedByUid: userUid,
        }),
        updatedAt: now,
      })
    },
    [childId, familyId, userUid, isParent]
  )

  // Deny a suggestion (parent action)
  const denySuggestion = useCallback(
    async (suggestionId: string, reason?: string) => {
      if (!childId || !familyId || !userUid || !isParent) return

      // Find the suggestion doc
      const suggestionsRef = collection(
        getFirestoreDb(),
        'families',
        familyId,
        'focusModeConfig',
        childId,
        'suggestions'
      )
      const suggestionQuery = query(suggestionsRef, where('id', '==', suggestionId))

      const snapshot = await new Promise<{ id: string }[]>((resolve) => {
        const unsubscribe = onSnapshot(
          suggestionQuery,
          (snap) => {
            unsubscribe()
            const docs: { id: string }[] = []
            snap.forEach((d) => docs.push({ id: d.id }))
            resolve(docs)
          },
          () => resolve([])
        )
      })

      if (snapshot.length === 0) return

      const suggestionDoc = snapshot[0]
      const suggestionRef = doc(
        getFirestoreDb(),
        'families',
        familyId,
        'focusModeConfig',
        childId,
        'suggestions',
        suggestionDoc.id
      )

      const now = Date.now()
      await updateDoc(suggestionRef, {
        status: 'denied' as AppSuggestionStatus,
        respondedByUid: userUid,
        respondedAt: now,
        denialReason: reason || null,
        updatedAt: now,
      })
    },
    [childId, familyId, userUid, isParent]
  )

  // Filter pending suggestions
  const pendingSuggestions = suggestions.filter((s) => s.status === 'pending')

  return {
    suggestions,
    pendingSuggestions,
    loading,
    error,
    submitSuggestion,
    approveSuggestion,
    denySuggestion,
  }
}
