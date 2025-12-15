import { z } from 'zod'
import {
  safetyDocumentSchema,
  retentionPolicySchema,
  DEFAULT_RETENTION_YEARS,
} from './safety-document.schema'

/**
 * Safety Contact Request Schema
 *
 * CRITICAL: This is a life-safety feature for victims escaping abuse.
 * Data from this schema MUST NEVER be:
 * - Logged to family audit trail
 * - Shared with family members
 * - Exposed through family-accessible queries
 */

/**
 * Submission source identifier
 * - login-page: From the login screen footer link
 * - settings: From the buried settings page option
 */
export const safetyRequestSourceSchema = z.enum(['login-page', 'settings'])

export type SafetyRequestSource = z.infer<typeof safetyRequestSourceSchema>

/**
 * Safety request status for support queue management
 */
export const safetyRequestStatusSchema = z.enum([
  'pending',
  'in-progress',
  'resolved',
])

export type SafetyRequestStatus = z.infer<typeof safetyRequestStatusSchema>

/**
 * Input schema for submitting a new safety contact request
 */
export const safetyRequestInputSchema = z.object({
  /** Required message describing the situation */
  message: z
    .string()
    .min(1, 'Message is required')
    .max(5000, 'Message must be less than 5000 characters'),

  /** Optional safe email address to contact the person */
  safeEmail: z
    .string()
    .email('Please enter a valid email address')
    .optional()
    .or(z.literal('')),

  /** Optional safe phone number to contact the person */
  safePhone: z
    .string()
    .regex(/^[+\d\s\-().]*$/, 'Please enter a valid phone number')
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .or(z.literal('')),

  /** Where the form was accessed from */
  source: safetyRequestSourceSchema,
})

export type SafetyRequestInput = z.infer<typeof safetyRequestInputSchema>

/**
 * Full safety request document schema (stored in Firestore)
 */
export const safetyRequestSchema = z.object({
  /** Required message describing the situation */
  message: z.string(),

  /** Optional safe email address */
  safeEmail: z.string().optional(),

  /** Optional safe phone number */
  safePhone: z.string().optional(),

  /** User ID if authenticated, undefined if anonymous */
  submittedBy: z.string().optional(),

  /** Timestamp of submission */
  submittedAt: z.date(),

  /** Where the form was accessed from */
  source: safetyRequestSourceSchema,

  /** Current status in support queue */
  status: safetyRequestStatusSchema,

  /** Assigned support agent user ID */
  assignedTo: z.string().optional(),

  /** Internal notes from support team (never exposed to family) */
  adminNotes: z.array(z.string()).optional(),

  /**
   * Uploaded documents array (Story 0.5.2)
   * Documents are stored in isolated Firebase Storage path
   */
  documents: z.array(safetyDocumentSchema).default([]),

  /**
   * Document retention policy for legal compliance (Story 0.5.2)
   * Default: 7 years retention
   */
  retentionPolicy: retentionPolicySchema.optional(),
})

// Re-export document-related constants and helpers for convenience
export { DEFAULT_RETENTION_YEARS }

export type SafetyRequest = z.infer<typeof safetyRequestSchema>

/**
 * Response schema for safety request submission
 * Intentionally minimal to avoid revealing information
 * Includes requestId for document attachment (Story 0.5.2)
 */
export const safetyRequestResponseSchema = z.object({
  /** Whether submission was successful */
  success: z.boolean(),

  /** Request ID for attaching documents (Story 0.5.2) */
  requestId: z.string().optional(),
})

export type SafetyRequestResponse = z.infer<typeof safetyRequestResponseSchema>
