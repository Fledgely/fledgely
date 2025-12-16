'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import {
  createCoParentInvitation,
  getExistingPendingInvitation,
  revokeInvitation as revokeInvitationService,
  sendInvitationEmail as sendInvitationEmailService,
  getInvitationEmailInfo,
  type CreateInvitationResult,
  type ExistingInvitationResult,
  type SendEmailResult,
} from '@/services/invitationService'
import {
  getInvitationErrorMessage,
  getEmailErrorMessage,
  isEmailRateLimited,
  type Invitation,
  type InvitationExpiryDays,
} from '@fledgely/contracts'

/**
 * Email info tracking state
 */
export interface EmailInfo {
  /** Masked email address (e.g., "ja***@example.com") */
  emailSentTo: string | null
  /** When the email was last sent */
  emailSentAt: Date | null
  /** Number of emails sent in the current hour */
  emailSendCount: number
}

/**
 * Hook return type for useInvitation
 */
export interface UseInvitationReturn {
  /** Created invitation with token (only available once after creation) */
  invitation: CreateInvitationResult | null
  /** Existing pending invitation if one exists */
  existingInvitation: Invitation | null
  /** Whether an operation is in progress */
  loading: boolean
  /** Whether checking for existing invitation */
  checkingExisting: boolean
  /** Error state if invitation operations fail */
  error: string | null
  /** Create a new co-parent invitation */
  createInvitation: (familyId: string, expiryDays?: InvitationExpiryDays) => Promise<CreateInvitationResult>
  /** Check for existing pending invitation */
  checkExistingInvitation: (familyId: string) => Promise<ExistingInvitationResult>
  /** Revoke an existing invitation */
  revokeInvitation: (invitationId: string) => Promise<void>
  /** Clear error state */
  clearError: () => void
  /** Reset invitation state (clear created invitation) */
  resetInvitation: () => void

  // Story 3.2: Email delivery
  /** Whether email is being sent */
  emailSending: boolean
  /** Whether email was successfully sent */
  emailSent: boolean
  /** Email-specific error */
  emailError: string | null
  /** Email tracking info (masked address, send count, last sent time) */
  emailInfo: EmailInfo | null
  /** Send invitation email */
  sendEmail: (invitationId: string, email: string, invitationLink: string) => Promise<SendEmailResult>
  /** Clear email state for a new email attempt */
  clearEmailState: () => void
  /** Check if email can be sent (not rate limited) */
  canSendEmail: () => boolean
}

/**
 * useInvitation Hook - Manages co-parent invitation state
 *
 * Story 3.1: Co-Parent Invitation Generation
 * Story 3.2: Invitation Delivery (Email)
 *
 * Provides:
 * - createInvitation: Create a new invitation (returns token once)
 * - checkExistingInvitation: Check if pending invitation exists
 * - revokeInvitation: Cancel a pending invitation
 * - sendEmail: Send invitation via email (Story 3.2)
 * - Idempotency guards to prevent double-click issues
 * - Rate limiting for email sends (max 3/hour)
 *
 * SECURITY NOTE: The invitation token is ONLY available in the
 * CreateInvitationResult immediately after creation. It is NOT
 * stored in Firestore (only the hash is stored).
 *
 * @example
 * ```tsx
 * const {
 *   invitation,
 *   existingInvitation,
 *   loading,
 *   error,
 *   createInvitation,
 *   checkExistingInvitation,
 *   // Story 3.2: Email
 *   emailSending,
 *   emailSent,
 *   emailError,
 *   sendEmail,
 *   canSendEmail,
 * } = useInvitation()
 *
 * // Check for existing invitation on mount
 * useEffect(() => {
 *   if (familyId) {
 *     checkExistingInvitation(familyId)
 *   }
 * }, [familyId, checkExistingInvitation])
 *
 * // Create new invitation
 * const handleCreate = async () => {
 *   const result = await createInvitation(familyId, '7')
 *   // result.invitationLink contains the sharable link
 * }
 *
 * // Send invitation via email (Story 3.2)
 * const handleSendEmail = async (email: string) => {
 *   if (invitation && canSendEmail()) {
 *     await sendEmail(invitation.invitation.id, email, invitation.invitationLink)
 *   }
 * }
 * ```
 */
export function useInvitation(): UseInvitationReturn {
  const { user: authUser } = useAuthContext()

  const [invitation, setInvitation] = useState<CreateInvitationResult | null>(null)
  const [existingInvitation, setExistingInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingExisting, setCheckingExisting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Story 3.2: Email state
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailInfo, setEmailInfo] = useState<EmailInfo | null>(null)

  // Track mounted state to prevent memory leaks
  const mountedRef = useRef(true)

  // Cleanup: Set mountedRef to false on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Idempotency guard - prevent double-click
  const creatingRef = useRef(false)

  // Story 3.2: Idempotency guard for email sending
  const sendingEmailRef = useRef(false)

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    if (mountedRef.current) {
      setError(null)
    }
  }, [])

  /**
   * Reset invitation state (clear created invitation)
   */
  const resetInvitation = useCallback(() => {
    if (mountedRef.current) {
      setInvitation(null)
      setError(null)
    }
  }, [])

  /**
   * Check for existing pending invitation
   */
  const checkExistingInvitation = useCallback(
    async (familyId: string): Promise<ExistingInvitationResult> => {
      if (!authUser) {
        return { exists: false, invitation: null }
      }

      if (mountedRef.current) {
        setCheckingExisting(true)
        setError(null)
      }

      try {
        const result = await getExistingPendingInvitation(familyId)

        if (mountedRef.current) {
          setExistingInvitation(result.invitation)
        }

        return result
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? getInvitationErrorMessage((err as { code?: string }).code || 'default')
            : getInvitationErrorMessage('default')

        if (mountedRef.current) {
          setError(errorMessage)
        }

        return { exists: false, invitation: null }
      } finally {
        if (mountedRef.current) {
          setCheckingExisting(false)
        }
      }
    },
    [authUser]
  )

  /**
   * Create a new co-parent invitation
   *
   * Returns the invitation with the unhashed token.
   * The token is ONLY available once - it is not stored.
   */
  const createInvitation = useCallback(
    async (
      familyId: string,
      expiryDays: InvitationExpiryDays = '7'
    ): Promise<CreateInvitationResult> => {
      if (!authUser) {
        throw new Error('Must be logged in to create an invitation')
      }

      // Idempotency guard - prevent double-click
      if (creatingRef.current) {
        throw new Error('Invitation creation already in progress')
      }

      creatingRef.current = true

      if (mountedRef.current) {
        setLoading(true)
        setError(null)
      }

      try {
        const result = await createCoParentInvitation(
          { familyId, expiryDays },
          authUser.uid
        )

        if (mountedRef.current) {
          setInvitation(result)
          // Clear existing invitation since we just created a new one
          setExistingInvitation(result.invitation)
        }

        return result
      } catch (err) {
        const errorCode =
          err instanceof Error
            ? (err as { code?: string }).code || 'default'
            : 'default'
        const errorMessage = getInvitationErrorMessage(errorCode)

        if (mountedRef.current) {
          setError(errorMessage)
        }

        throw new Error(errorMessage)
      } finally {
        creatingRef.current = false

        if (mountedRef.current) {
          setLoading(false)
        }
      }
    },
    [authUser]
  )

  /**
   * Revoke an existing invitation
   */
  const revokeInvitation = useCallback(
    async (invitationId: string): Promise<void> => {
      if (!authUser) {
        throw new Error('Must be logged in to revoke an invitation')
      }

      if (mountedRef.current) {
        setLoading(true)
        setError(null)
      }

      try {
        await revokeInvitationService(invitationId, authUser.uid)

        if (mountedRef.current) {
          // Clear both invitation states
          setInvitation(null)
          setExistingInvitation(null)
        }
      } catch (err) {
        const errorCode =
          err instanceof Error
            ? (err as { code?: string }).code || 'default'
            : 'default'
        const errorMessage = getInvitationErrorMessage(errorCode)

        if (mountedRef.current) {
          setError(errorMessage)
        }

        throw new Error(errorMessage)
      } finally {
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    },
    [authUser]
  )

  // ============================================================================
  // Story 3.2: Email Delivery Functions
  // ============================================================================

  /**
   * Clear email state for a new email attempt
   */
  const clearEmailState = useCallback(() => {
    if (mountedRef.current) {
      setEmailSending(false)
      setEmailSent(false)
      setEmailError(null)
    }
  }, [])

  /**
   * Check if email can be sent (not rate limited)
   */
  const canSendEmail = useCallback((): boolean => {
    if (!emailInfo) return true

    return !isEmailRateLimited(emailInfo.emailSendCount, emailInfo.emailSentAt)
  }, [emailInfo])

  /**
   * Fetch email info for an invitation
   */
  const fetchEmailInfo = useCallback(async (invitationId: string) => {
    try {
      const info = await getInvitationEmailInfo(invitationId)
      if (info && mountedRef.current) {
        setEmailInfo({
          emailSentTo: info.emailSentTo,
          emailSentAt: info.emailSentAt,
          emailSendCount: info.emailSendCount,
        })
      }
    } catch {
      // Silently fail - email info is optional
    }
  }, [])

  /**
   * Send invitation via email
   *
   * Story 3.2: Invitation Delivery
   *
   * @param invitationId - The invitation document ID
   * @param email - Recipient email address
   * @param invitationLink - The full invitation link URL
   * @returns SendEmailResult with success status
   */
  const sendEmail = useCallback(
    async (
      invitationId: string,
      email: string,
      invitationLink: string
    ): Promise<SendEmailResult> => {
      if (!authUser) {
        const errorMessage = getEmailErrorMessage('not-authorized')
        if (mountedRef.current) {
          setEmailError(errorMessage)
        }
        return { success: false, errorCode: 'not-authorized' }
      }

      // Idempotency guard - prevent double-click
      if (sendingEmailRef.current) {
        return { success: false, errorCode: 'rate-limited' }
      }

      // Check rate limiting
      if (!canSendEmail()) {
        const errorMessage = getEmailErrorMessage('rate-limited')
        if (mountedRef.current) {
          setEmailError(errorMessage)
        }
        return { success: false, errorCode: 'rate-limited' }
      }

      sendingEmailRef.current = true

      if (mountedRef.current) {
        setEmailSending(true)
        setEmailSent(false)
        setEmailError(null)
      }

      try {
        const result = await sendInvitationEmailService(
          invitationId,
          email,
          authUser.uid,
          invitationLink
        )

        if (mountedRef.current) {
          if (result.success) {
            setEmailSent(true)
            // Update email info with new masked email
            if (result.maskedEmail) {
              setEmailInfo((prev) => ({
                emailSentTo: result.maskedEmail || null,
                emailSentAt: new Date(),
                emailSendCount: (prev?.emailSendCount ?? 0) + 1,
              }))
            }
          } else {
            const errorMessage = getEmailErrorMessage(result.errorCode || 'email-send-failed')
            setEmailError(errorMessage)
          }
        }

        return result
      } catch (err) {
        const errorCode =
          err instanceof Error
            ? (err as { code?: string }).code || 'email-send-failed'
            : 'email-send-failed'
        const errorMessage = getEmailErrorMessage(errorCode)

        if (mountedRef.current) {
          setEmailError(errorMessage)
        }

        return { success: false, errorCode: 'email-send-failed' }
      } finally {
        sendingEmailRef.current = false

        if (mountedRef.current) {
          setEmailSending(false)
        }
      }
    },
    [authUser, canSendEmail]
  )

  // Fetch email info when invitation changes
  useEffect(() => {
    if (invitation?.invitation.id) {
      fetchEmailInfo(invitation.invitation.id)
    } else if (existingInvitation?.id) {
      fetchEmailInfo(existingInvitation.id)
    }
  }, [invitation?.invitation.id, existingInvitation?.id, fetchEmailInfo])

  return {
    invitation,
    existingInvitation,
    loading,
    checkingExisting,
    error,
    createInvitation,
    checkExistingInvitation,
    revokeInvitation,
    clearError,
    resetInvitation,

    // Story 3.2: Email delivery
    emailSending,
    emailSent,
    emailError,
    emailInfo,
    sendEmail,
    clearEmailState,
    canSendEmail,
  }
}
