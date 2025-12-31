/**
 * useChildAgreement Hook - Story 19C.1
 *
 * Fetches the active agreement for a child from Firestore.
 * Uses real-time listener for updates.
 *
 * Task 1: Create useChildAgreement hook (AC: #1, #2)
 * - 1.1 Create hook that fetches active agreement for child
 * - 1.2 Query `/activeAgreements` where childId matches and status='active'
 * - 1.3 Use onSnapshot for real-time sync
 * - 1.4 Add unit tests for the hook
 */

import { useState, useEffect } from 'react'
import { collection, query, where, limit, onSnapshot, Timestamp } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { TermCategory } from '@fledgely/shared/contracts'

/**
 * Term display data - simplified from full AgreementTerm for child view
 */
export interface AgreementTermDisplay {
  id: string
  text: string
  category: TermCategory
  party: 'parent' | 'child'
  explanation: string | null
  isDefault: boolean
}

/**
 * Signature display data for the agreement view
 */
export interface SignatureDisplay {
  party: 'child' | 'parent'
  name: string
  signedAt: Date
}

/**
 * Child agreement data with parsed fields for display
 */
export interface ChildAgreement {
  id: string
  familyId: string
  childId: string
  version: string
  terms: AgreementTermDisplay[]
  activatedAt: Date
  signatures: SignatureDisplay[]
  /** Monitoring settings extracted from terms */
  monitoring: {
    screenshotsEnabled: boolean
    captureFrequency: string | null
    retentionPeriod: string | null
  }
}

/**
 * Hook options
 */
interface UseChildAgreementOptions {
  childId: string | null
  familyId: string | null
  enabled?: boolean
}

/**
 * Hook result
 */
interface UseChildAgreementResult {
  agreement: ChildAgreement | null
  loading: boolean
  error: string | null
}

/**
 * Convert Firestore timestamp to Date
 */
function toDate(timestamp: unknown): Date {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate()
  }
  if (timestamp instanceof Date) {
    return timestamp
  }
  // Handle mock Timestamp objects with toDate method
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
    const tsObj = timestamp as { toDate: () => Date }
    return tsObj.toDate()
  }
  if (typeof timestamp === 'number') {
    return new Date(timestamp)
  }
  return new Date()
}

/**
 * Extract monitoring settings from terms
 */
function extractMonitoringSettings(terms: AgreementTermDisplay[]): ChildAgreement['monitoring'] {
  const monitoringTerms = terms.filter((t) => t.category === 'monitoring')

  // Look for screenshot-related terms
  const screenshotTerm = monitoringTerms.find(
    (t) => t.text.toLowerCase().includes('screenshot') || t.text.toLowerCase().includes('picture')
  )

  // Look for frequency mentions (e.g., "every 5 minutes")
  let captureFrequency: string | null = null
  const frequencyMatch = monitoringTerms
    .map((t) => t.text)
    .join(' ')
    .match(/every\s+(\d+)\s+(minute|hour|second)s?/i)
  if (frequencyMatch) {
    captureFrequency = `Every ${frequencyMatch[1]} ${frequencyMatch[2]}${frequencyMatch[1] !== '1' ? 's' : ''}`
  }

  // Look for retention mentions (e.g., "30 days")
  let retentionPeriod: string | null = null
  const retentionMatch = monitoringTerms
    .map((t) => t.text)
    .join(' ')
    .match(/(\d+)\s+(day|week|month)s?/i)
  if (retentionMatch) {
    retentionPeriod = `${retentionMatch[1]} ${retentionMatch[2]}${retentionMatch[1] !== '1' ? 's' : ''}`
  }

  return {
    screenshotsEnabled: !!screenshotTerm,
    captureFrequency,
    retentionPeriod,
  }
}

/**
 * Parse term category from Firestore data
 */
function parseCategory(category: unknown): TermCategory {
  const validCategories: TermCategory[] = ['time', 'apps', 'monitoring', 'rewards', 'general']
  if (typeof category === 'string' && validCategories.includes(category as TermCategory)) {
    return category as TermCategory
  }
  return 'general'
}

/**
 * Hook to fetch active agreement for a child
 */
export function useChildAgreement({
  childId,
  familyId,
  enabled = true,
}: UseChildAgreementOptions): UseChildAgreementResult {
  const [agreement, setAgreement] = useState<ChildAgreement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!childId || !familyId || !enabled) {
      setAgreement(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const db = getFirestoreDb()
    const agreementsRef = collection(db, 'activeAgreements')

    // Query for active agreement for this child in this family
    const agreementQuery = query(
      agreementsRef,
      where('familyId', '==', familyId),
      where('childId', '==', childId),
      where('status', '==', 'active'),
      limit(1)
    )

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      agreementQuery,
      (snapshot) => {
        try {
          if (snapshot.empty) {
            setAgreement(null)
            setLoading(false)
            return
          }

          const doc = snapshot.docs[0]
          const data = doc.data()

          // Parse terms from Firestore
          const terms: AgreementTermDisplay[] = Array.isArray(data.terms)
            ? data.terms.map(
                (t: {
                  id?: string
                  text?: string
                  category?: unknown
                  party?: string
                  explanation?: string
                  isDefault?: boolean
                }) => ({
                  id: t.id || '',
                  text: t.text || '',
                  category: parseCategory(t.category),
                  party: t.party === 'child' ? 'child' : 'parent',
                  explanation: t.explanation || null,
                  isDefault: t.isDefault || false,
                })
              )
            : []

          // Build signatures array
          const signatures: SignatureDisplay[] = []

          // Add child signature if present
          if (data.childSignature) {
            signatures.push({
              party: 'child',
              name: data.childSignature.name || data.childSignature.signerName || 'Child',
              signedAt: toDate(data.childSignature.signedAt),
            })
          }

          // Add parent signatures
          if (Array.isArray(data.parentSignatures)) {
            for (const sig of data.parentSignatures) {
              signatures.push({
                party: 'parent',
                name: sig.name || sig.signerName || 'Parent',
                signedAt: toDate(sig.signedAt),
              })
            }
          }

          // Sort signatures by date (earliest first)
          signatures.sort((a, b) => a.signedAt.getTime() - b.signedAt.getTime())

          const childAgreement: ChildAgreement = {
            id: doc.id,
            familyId: data.familyId || familyId,
            childId: data.childId || childId,
            version: data.version || 'v1.0',
            terms,
            activatedAt: toDate(data.activatedAt),
            signatures,
            monitoring: extractMonitoringSettings(terms),
          }

          setAgreement(childAgreement)
          setError(null)
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error parsing agreement:', err)
          }
          setError('Failed to load your agreement')
        }
        setLoading(false)
      },
      (err) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error listening to agreement:', err)
        }
        setError('Failed to load your agreement')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [childId, familyId, enabled])

  return {
    agreement,
    loading,
    error,
  }
}
