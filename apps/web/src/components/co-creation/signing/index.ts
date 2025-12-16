/**
 * Signing Components
 *
 * Story 6.1: Child Digital Signature Ceremony
 * Story 6.2: Parent Digital Signature
 *
 * Components for the digital signature ceremony flow:
 * - SignaturePad: Typed and drawn signature input
 * - ChildSigningCeremony: Full child signing ceremony screen
 * - ParentSigningCeremony: Full parent signing ceremony screen
 * - ParentSigningComplete: Parent signing completion screen
 * - KeyCommitmentsReadAloud: Text-to-speech for accessibility
 * - SigningCelebration: Post-signing celebration feedback
 */

export { SignaturePad } from './SignaturePad'
export type { SignaturePadProps } from './SignaturePad'

export { ChildSigningCeremony } from './ChildSigningCeremony'
export type { ChildSigningCeremonyProps } from './ChildSigningCeremony'

export { ParentSigningCeremony } from './ParentSigningCeremony'
export type { ParentSigningCeremonyProps } from './ParentSigningCeremony'

export { ParentSigningComplete } from './ParentSigningComplete'
export type { ParentSigningCompleteProps } from './ParentSigningComplete'

export { KeyCommitmentsReadAloud } from './KeyCommitmentsReadAloud'
export type { KeyCommitmentsReadAloudProps } from './KeyCommitmentsReadAloud'

export { SigningCelebration } from './SigningCelebration'
export type { SigningCelebrationProps } from './SigningCelebration'
