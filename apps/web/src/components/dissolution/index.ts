/**
 * Dissolution Components
 *
 * Story 2.7: Family Dissolution Initiation
 * Story 2.8: Unilateral Self-Removal (Survivor Escape)
 *
 * Components for managing family dissolution:
 * - DissolutionInitiateDialog: Multi-step dialog to start dissolution
 * - DissolutionStatusBanner: Shows current dissolution status
 * - DissolutionAcknowledgeDialog: For co-guardians to acknowledge
 * - DissolutionCancelDialog: To cancel an active dissolution
 * - SelfRemovalDialog: Multi-step dialog for self-removal (survivor escape)
 */

export { DissolutionInitiateDialog } from './DissolutionInitiateDialog'
export type { DissolutionInitiateDialogProps } from './DissolutionInitiateDialog'

export { DissolutionStatusBanner } from './DissolutionStatusBanner'
export type { DissolutionStatusBannerProps } from './DissolutionStatusBanner'

export { DissolutionAcknowledgeDialog } from './DissolutionAcknowledgeDialog'
export type { DissolutionAcknowledgeDialogProps } from './DissolutionAcknowledgeDialog'

export { DissolutionCancelDialog } from './DissolutionCancelDialog'
export type { DissolutionCancelDialogProps } from './DissolutionCancelDialog'

export { SelfRemovalDialog } from './SelfRemovalDialog'
export type { SelfRemovalDialogProps } from './SelfRemovalDialog'
