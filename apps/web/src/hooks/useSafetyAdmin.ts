/**
 * Hook for Safety Admin Dashboard operations.
 *
 * Story 0.5.3: Support Agent Escape Dashboard
 *
 * Provides access to admin-only safety ticket operations.
 * Requires safety-team custom claim.
 */

'use client'

import { useState, useCallback } from 'react'
import { httpsCallable, HttpsCallableResult } from 'firebase/functions'
import { getFirebaseFunctions } from '../lib/firebase'

/**
 * Safety ticket summary for list view.
 */
export interface SafetyTicketSummary {
  id: string
  messagePreview: string
  urgency: 'when_you_can' | 'soon' | 'urgent'
  status: string
  createdAt: string | null
  userEmail: string | null
  hasDocuments: boolean
  documentCount: number
}

/**
 * Internal note structure.
 */
export interface InternalNote {
  id: string
  agentId: string
  agentEmail: string | null
  content: string
  createdAt: string
}

/**
 * Identity verification status.
 */
export interface VerificationStatus {
  phoneVerified: boolean
  phoneVerifiedAt: string | null
  phoneVerifiedBy: string | null
  idDocumentVerified: boolean
  idDocumentVerifiedAt: string | null
  idDocumentVerifiedBy: string | null
  accountMatchVerified: boolean
  accountMatchVerifiedAt: string | null
  accountMatchVerifiedBy: string | null
  securityQuestionsVerified: boolean
  securityQuestionsVerifiedAt: string | null
  securityQuestionsVerifiedBy: string | null
}

/**
 * Document metadata.
 */
export interface DocumentMetadata {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  uploadedAt: string | null
}

/**
 * Ticket history entry.
 */
export interface TicketHistoryEntry {
  action: string
  agentId: string
  agentEmail: string | null
  timestamp: string | null
  details: string | null
}

/**
 * Full ticket detail.
 */
export interface SafetyTicketDetail {
  id: string
  message: string
  urgency: 'when_you_can' | 'soon' | 'urgent'
  status: string
  createdAt: string | null
  userEmail: string | null
  userId: string | null
  safeContactInfo: {
    phone: string | null
    email: string | null
    preferredMethod: string | null
    safeTimeToContact: string | null
  } | null
  documents: DocumentMetadata[]
  internalNotes: InternalNote[]
  verification: VerificationStatus
  history: TicketHistoryEntry[]
  assignedTo: string | null
  escalatedAt: string | null
  escalatedTo: string | null
  resolvedAt: string | null
  resolvedBy: string | null
}

/**
 * Verification field names.
 */
export type VerificationField =
  | 'phoneVerified'
  | 'idDocumentVerified'
  | 'accountMatchVerified'
  | 'securityQuestionsVerified'

/**
 * Hook return type.
 */
export interface UseSafetyAdminReturn {
  // State
  loading: boolean
  error: string | null

  // Ticket list operations
  getTickets: (options?: {
    status?: 'pending' | 'in_progress' | 'resolved' | 'escalated' | 'all'
    limit?: number
    startAfter?: string
  }) => Promise<{
    tickets: SafetyTicketSummary[]
    hasMore: boolean
    nextCursor: string | null
  } | null>

  // Ticket detail operations
  getTicketDetail: (ticketId: string) => Promise<SafetyTicketDetail | null>

  // Document operations
  getDocumentUrl: (documentId: string) => Promise<{
    signedUrl: string
    filename: string
    mimeType: string
    expiresAt: string
  } | null>

  // Update operations
  updateTicketStatus: (
    ticketId: string,
    status: 'pending' | 'in_progress' | 'resolved'
  ) => Promise<boolean>
  addInternalNote: (ticketId: string, note: string) => Promise<boolean>
  updateVerification: (
    ticketId: string,
    field: VerificationField,
    value: boolean
  ) => Promise<boolean>
  escalateTicket: (
    ticketId: string,
    urgency: 'normal' | 'high' | 'critical',
    reason?: string
  ) => Promise<boolean>

  // Clear error
  clearError: () => void
}

/**
 * Hook for safety admin dashboard operations.
 */
export function useSafetyAdmin(): UseSafetyAdminReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  /**
   * Get list of safety tickets.
   */
  const getTickets = useCallback(
    async (
      options: {
        status?: 'pending' | 'in_progress' | 'resolved' | 'escalated' | 'all'
        limit?: number
        startAfter?: string
      } = {}
    ) => {
      setLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const fn = httpsCallable<
          typeof options,
          {
            tickets: SafetyTicketSummary[]
            hasMore: boolean
            nextCursor: string | null
          }
        >(functions, 'getSafetyTickets')

        const result: HttpsCallableResult<{
          tickets: SafetyTicketSummary[]
          hasMore: boolean
          nextCursor: string | null
        }> = await fn(options)
        return result.data
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load tickets'
        setError(message)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  /**
   * Get ticket detail.
   */
  const getTicketDetail = useCallback(async (ticketId: string) => {
    setLoading(true)
    setError(null)

    try {
      const functions = getFirebaseFunctions()
      const fn = httpsCallable<{ ticketId: string }, { ticket: SafetyTicketDetail }>(
        functions,
        'getSafetyTicketDetail'
      )

      const result = await fn({ ticketId })
      return result.data.ticket
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load ticket'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Get document signed URL.
   */
  const getDocumentUrl = useCallback(async (documentId: string) => {
    setLoading(true)
    setError(null)

    try {
      const functions = getFirebaseFunctions()
      const fn = httpsCallable<
        { documentId: string },
        {
          signedUrl: string
          filename: string
          mimeType: string
          expiresAt: string
        }
      >(functions, 'getSafetyDocument')

      const result = await fn({ documentId })
      return result.data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get document'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Update ticket status.
   */
  const updateTicketStatus = useCallback(
    async (ticketId: string, status: 'pending' | 'in_progress' | 'resolved') => {
      setLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const fn = httpsCallable<
          { ticketId: string; status: string },
          { success: boolean; ticketId: string }
        >(functions, 'updateSafetyTicket')

        await fn({ ticketId, status })
        return true
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update status'
        setError(message)
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  /**
   * Add internal note.
   */
  const addInternalNote = useCallback(async (ticketId: string, note: string) => {
    setLoading(true)
    setError(null)

    try {
      const functions = getFirebaseFunctions()
      const fn = httpsCallable<
        { ticketId: string; internalNote: string },
        { success: boolean; ticketId: string }
      >(functions, 'updateSafetyTicket')

      await fn({ ticketId, internalNote: note })
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add note'
      setError(message)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Update verification status.
   */
  const updateVerification = useCallback(
    async (ticketId: string, field: VerificationField, value: boolean) => {
      setLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const fn = httpsCallable<
          { ticketId: string; verification: { field: string; value: boolean } },
          { success: boolean; ticketId: string }
        >(functions, 'updateSafetyTicket')

        await fn({ ticketId, verification: { field, value } })
        return true
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update verification'
        setError(message)
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  /**
   * Escalate ticket.
   */
  const escalateTicket = useCallback(
    async (ticketId: string, urgency: 'normal' | 'high' | 'critical', reason?: string) => {
      setLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const fn = httpsCallable<
          { ticketId: string; escalation: { urgency: string; reason?: string } },
          { success: boolean; ticketId: string }
        >(functions, 'updateSafetyTicket')

        await fn({ ticketId, escalation: { urgency, reason } })
        return true
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to escalate ticket'
        setError(message)
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    loading,
    error,
    getTickets,
    getTicketDetail,
    getDocumentUrl,
    updateTicketStatus,
    addInternalNote,
    updateVerification,
    escalateTicket,
    clearError,
  }
}
