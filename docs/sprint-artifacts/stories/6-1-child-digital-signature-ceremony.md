# Story 6.1: Child Digital Signature Ceremony

Status: ready-for-review

## Story

As a **child**,
I want **to sign the agreement in a meaningful ceremony**,
So that **my consent feels real and respected, not just a checkbox**.

## Acceptance Criteria

1. **Given** an agreement is ready for signing (previewed and approved) **When** child initiates their signature **Then** system displays child-appropriate signing ceremony screen
2. **Given** a child is on the signing ceremony screen **When** they complete the signature step **Then** child must enter their name (typed) or draw signature (touch)
3. **Given** a child is signing **When** completing the ceremony **Then** child must check "I understand and agree" checkbox
4. **Given** a child is signing **When** viewing key commitments **Then** system reads aloud key commitments before signature (accessibility)
5. **Given** a child completes signing **When** signature is submitted **Then** signature timestamp is recorded in agreement document
6. **Given** a child completes signing **When** signature is confirmed **Then** celebratory animation/feedback confirms signing ("You signed!")
7. **Given** a child attempts to sign **When** parent has not signed first **Then** child cannot sign before parent (prevents coercion pressure)

## Tasks / Subtasks

- [x] Task 1: Create Digital Signature Schema Extensions (AC: 2, 5)
  - [x] 1.1: Add `signatureSchema` to `@fledgely/contracts` for signature data
  - [x] 1.2: Add `signatureTypeSchema` enum: 'typed' | 'drawn'
  - [x] 1.3: Create `Signature` type with: id, type, value (name or base64 image), signedBy, signedAt
  - [x] 1.4: Add `agreementSignatureSchema` for recording signatures on agreements
  - [x] 1.5: Add `signatureOrderSchema` enum: 'parent_first' | 'child_first' (defaults to parent_first)
  - [x] 1.6: Add signature validation (name must be 2+ chars, drawn must be non-empty)
  - [x] 1.7: Write schema validation tests (58 tests passing)

- [x] Task 2: Create Signature Pad Component (AC: 2)
  - [x] 2.1: Create `SignaturePad.tsx` component using canvas API
  - [x] 2.2: Support both typed (text input) and drawn (touch/mouse) modes
  - [x] 2.3: Add clear button to reset signature
  - [x] 2.4: Support touch devices for drawing signatures
  - [x] 2.5: Make component accessible (NFR42) - keyboard fallback for drawing
  - [x] 2.6: Add mode toggle between typed and drawn
  - [x] 2.7: Export signature as base64 for drawn, string for typed
  - [x] 2.8: Write component tests (27 tests passing)

- [x] Task 3: Create Signing Ceremony Screen (AC: 1, 3)
  - [x] 3.1: Create `ChildSigningCeremony.tsx` page/component
  - [x] 3.2: Display child-friendly ceremony introduction with encouraging messaging
  - [x] 3.3: Show agreement summary (key commitments) before signing
  - [x] 3.4: Include "I understand and agree" checkbox (required)
  - [x] 3.5: Integrate SignaturePad component
  - [x] 3.6: Add submit button (disabled until checkbox checked and signature provided)
  - [x] 3.7: Use 6th-grade reading level for all text (NFR65)
  - [x] 3.8: Write component tests (22 tests passing)

- [x] Task 4: Create Key Commitments Read-Aloud Feature (AC: 4)
  - [x] 4.1: Create `KeyCommitmentsReadAloud.tsx` component
  - [x] 4.2: Use Web Speech API for text-to-speech
  - [x] 4.3: Display commitments with numbered list
  - [x] 4.4: Add play/pause/stop controls for read-aloud
  - [x] 4.5: Highlight current commitment being read
  - [x] 4.6: Provide visual alternative for users who prefer reading
  - [x] 4.7: Make accessible with ARIA live regions (NFR42)
  - [x] 4.8: Write component tests (15 tests passing)

- [x] Task 5: Create Celebratory Feedback Component (AC: 6)
  - [x] 5.1: Create `SigningCelebration.tsx` component
  - [x] 5.2: Add confetti animation using CSS animations
  - [x] 5.3: Display "You signed!" message with celebratory styling
  - [x] 5.4: Add screen reader announcement for celebration (NFR47)
  - [x] 5.5: Include encouraging message about next steps
  - [x] 5.6: Provide non-animated fallback for reduced-motion preference
  - [x] 5.7: Write component tests (14 tests passing)

- [x] Task 6: Implement Parent-First Signing Enforcement (AC: 7)
  - [x] 6.1: Create `useSigningOrder.ts` hook to check signing eligibility
  - [x] 6.2: Query agreement status for existing parent signature
  - [x] 6.3: If parent hasn't signed, show "Waiting for parent" message
  - [x] 6.4: Explain why child signs second (prevents coercion)
  - [x] 6.5: Display friendly explanation using child-appropriate language
  - [x] 6.6: Auto-refresh when parent signature is detected
  - [x] 6.7: Write hook tests (12 tests passing)

- [x] Task 7: Create Signature Recording Service (AC: 5)
  - [x] 7.1: Create `signatureService.ts` for signature operations
  - [x] 7.2: Implement `recordChildSignature(agreementId, signature)` function
  - [x] 7.3: Store signature with timestamp in Firestore
  - [x] 7.4: Update agreement status to reflect child signature
  - [x] 7.5: Create contribution record for signature action (audit log)
  - [x] 7.6: Emit event for parent notification (via audit log)
  - [x] 7.7: Write service tests (13 tests passing)

- [x] Task 8: Integrate Signing into Agreement Flow (AC: 1-7)
  - [x] 8.1: Add route for child signing ceremony `/agreements/sign/child/[sessionId]`
  - [x] 8.2: Add navigation from agreement preview to signing ceremony
  - [x] 8.3: Validate agreement status before allowing signing (via useSigningOrder)
  - [x] 8.4: Handle signing completion and navigation to celebration
  - [x] 8.5: Update dashboard to show "Pending child signature" status (via waiting state)
  - [x] 8.6: Write integration tests (11 tests passing)

- [x] Task 9: Accessibility and Polish (AC: 1-7)
  - [x] 9.1: Ensure all touch targets are 44x44px minimum (NFR49)
  - [x] 9.2: Add ARIA labels for all ceremony elements (NFR42)
  - [x] 9.3: Verify screen reader announcements for state changes (NFR47)
  - [x] 9.4: Test keyboard navigation through entire ceremony flow (NFR43)
  - [x] 9.5: Verify color contrast for all text and UI elements (NFR45)
  - [x] 9.6: Ensure all text is at 6th-grade reading level (NFR65)
  - [x] 9.7: Write accessibility tests (17 tests passing)

## Dev Notes

### Previous Story Intelligence (Epic 5)

**Story 5.5** created Agreement Preview & Summary:
```typescript
// apps/web/src/components/co-creation/summary/
// AgreementSummary.tsx - Displays full agreement preview
// Use as reference for showing key commitments in ceremony
```

**Story 5.7** added version history and signatures foundation:
```typescript
// packages/contracts/src/co-creation-session.schema.ts
// Contains session and contribution schemas that can be extended
```

**Epic 5 Component Patterns:**
- Location: `apps/web/src/components/co-creation/`
- Test location: `apps/web/src/components/co-creation/__tests__/`
- Hook location: `apps/web/src/hooks/`

### Key FRs for Epic 6

- **FR19:** Child can provide digital signature to accept the agreement
- **FR20:** Parent can provide digital signature to accept the agreement
- **FR21:** Agreement becomes active only when both parties sign
- **FR26:** Device becomes inoperable under fledgely management without child consent

### Signing Order Decision

**Parent signs FIRST** to prevent coercion:
- Child sees parent has already committed
- Reduces pressure on child to sign something parent hasn't agreed to
- Creates truly collaborative signing experience
- Child knows parent is equally bound by the agreement

### Schema Extensions Required

```typescript
// packages/contracts/src/signature.schema.ts - CREATE NEW FILE

import { z } from 'zod'

/**
 * Types of digital signatures (AC #2)
 */
export const signatureTypeSchema = z.enum([
  'typed',    // User typed their name
  'drawn',    // User drew signature with touch/mouse
])

export type SignatureType = z.infer<typeof signatureTypeSchema>

/**
 * Digital signature data
 */
export const signatureSchema = z.object({
  /** Unique signature ID (UUID) */
  id: z.string().uuid('Signature ID must be a valid UUID'),

  /** Type of signature input */
  type: signatureTypeSchema,

  /** Signature value - name string for typed, base64 PNG for drawn */
  value: z.string().min(1, 'Signature value is required'),

  /** Who signed: 'parent' | 'child' */
  signedBy: z.enum(['parent', 'child']),

  /** When signature was created (ISO 8601 datetime) */
  signedAt: z.string().datetime('Invalid datetime format'),

  /** IP address hash for audit (not stored raw for privacy) */
  ipHash: z.string().optional(),
})

export type Signature = z.infer<typeof signatureSchema>

/**
 * Agreement signature record
 */
export const agreementSignatureSchema = z.object({
  /** Agreement this signature belongs to */
  agreementId: z.string().uuid(),

  /** The actual signature data */
  signature: signatureSchema,

  /** "I understand and agree" checkbox was checked */
  consentCheckboxChecked: z.boolean(),

  /** Key commitments were reviewed (read or listened to) */
  commitmentsReviewed: z.boolean(),
})

export type AgreementSignature = z.infer<typeof agreementSignatureSchema>

/**
 * Signature order enforcement
 */
export const SIGNATURE_ORDER = {
  /** Parent must sign first to prevent coercion pressure on child */
  parentFirst: true,
} as const

/**
 * Validation constants
 */
export const SIGNATURE_VALIDATION = {
  minTypedNameLength: 2,
  maxTypedNameLength: 100,
  minDrawnDataLength: 100, // Base64 for reasonable signature size
} as const
```

### Component Patterns

**Signature Pad Component:**
```typescript
// apps/web/src/components/signing/SignaturePad.tsx

interface SignaturePadProps {
  mode: 'typed' | 'drawn'
  onModeChange: (mode: 'typed' | 'drawn') => void
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  childName: string // Pre-populate for typed mode
}

export function SignaturePad({
  mode,
  onModeChange,
  value,
  onChange,
  disabled,
  childName,
}: SignaturePadProps) {
  // Mode toggle buttons
  // Typed: text input with child's name
  // Drawn: canvas with touch/mouse drawing
  // Clear button
  // Accessible for keyboard users
}
```

**Signing Ceremony Screen:**
```typescript
// apps/web/src/components/signing/ChildSigningCeremony.tsx

interface ChildSigningCeremonyProps {
  agreementId: string
  agreement: Agreement
  childName: string
  onComplete: (signature: AgreementSignature) => void
}

export function ChildSigningCeremony({
  agreementId,
  agreement,
  childName,
  onComplete,
}: ChildSigningCeremonyProps) {
  // Step 1: Introduction with encouraging message
  // Step 2: Key commitments review with read-aloud option
  // Step 3: "I understand and agree" checkbox
  // Step 4: Signature pad (typed or drawn)
  // Step 5: Submit button
  // All text at 6th-grade reading level
}
```

**Read-Aloud Component:**
```typescript
// apps/web/src/components/signing/KeyCommitmentsReadAloud.tsx

interface KeyCommitmentsReadAloudProps {
  commitments: string[]
  onComplete: () => void
}

export function KeyCommitmentsReadAloud({
  commitments,
  onComplete,
}: KeyCommitmentsReadAloudProps) {
  // Use Web Speech API: window.speechSynthesis
  // Play/pause/stop controls
  // Visual highlighting of current item
  // Progress indicator
  // Fallback for browsers without speech support
}
```

### Firestore Structure

```
/families/{familyId}/agreements/{agreementId}
  - ... existing fields ...
  - signatures: {
      parent: AgreementSignature | null,
      child: AgreementSignature | null,
    }
  - signingStatus: 'pending' | 'parent_signed' | 'child_signed' | 'complete'
  - activatedAt: Timestamp (set when both sign)

/families/{familyId}/agreements/{agreementId}/audit-log/{logId}
  - action: 'parent_signed' | 'child_signed' | 'agreement_activated'
  - performedBy: string (userId)
  - timestamp: Timestamp
  - metadata: { signatureType, ipHash }
```

### NFR Compliance Checklist

- [ ] NFR42: All ceremony elements screen reader accessible
- [ ] NFR43: Full keyboard navigation through ceremony flow
- [ ] NFR45: Color contrast 4.5:1 for all text
- [ ] NFR47: Screen reader announcements for state changes and celebration
- [ ] NFR49: All touch targets 44x44px minimum
- [ ] NFR65: All child-facing text at 6th-grade reading level

### Testing Standards

**Unit tests for:**
- Signature schema validation
- Signature type detection (typed vs drawn)
- Consent checkbox validation
- Parent-first signing order enforcement

**Component tests for:**
- SignaturePad mode toggle
- SignaturePad clear functionality
- ChildSigningCeremony flow steps
- KeyCommitmentsReadAloud playback
- SigningCelebration animation/fallback

**Integration tests for:**
- Complete signing ceremony flow
- Parent-must-sign-first enforcement
- Signature recording to Firestore
- Dashboard status updates

**Accessibility tests for:**
- Keyboard navigation through ceremony
- Screen reader announcements
- Reduced motion preference handling
- Speech synthesis fallback

### Git Intelligence

Recent commits show pattern for Epic 5 and 6 stories:
```
feat(Story 5.7): Draft Saving & Version History - complete implementation
feat(epic-5): complete Story 5.5 - Agreement Preview & Summary
feat(Story 5.4): Negotiation & Discussion Support - complete implementation
```

Follow this pattern: `feat(Story 6.1): Child Digital Signature Ceremony - complete implementation`

### Dependencies

- Epic 5 agreement creation flow must be complete (DONE)
- Story 5.5 Agreement Preview (DONE) - used for key commitments display
- No external dependencies for signature pad (use canvas API)
- Web Speech API for read-aloud (native browser support)
- canvas-confetti or similar for celebration (npm package)

### Child-Friendly Language Examples

**Introduction:**
"It's time to sign your family agreement! This is a big moment - you're making a promise to your family."

**I understand and agree:**
"I have read the agreement and I understand what I'm agreeing to."

**Waiting for parent:**
"Your parent needs to sign first. This shows you that they're making the same promise you are!"

**Celebration:**
"You did it! You signed your family agreement. This is a big step for your family!"

### References

- [Source: docs/epics/epic-list.md#Story-6.1] - Original acceptance criteria
- [Source: packages/contracts/src/co-creation-session.schema.ts] - Session schemas
- [Source: apps/web/src/components/co-creation/summary/] - Agreement summary components
- [Source: docs/project_context.md] - Implementation patterns (Zod types, direct Firebase SDK)
- [Source: docs/sprint-artifacts/stories/5-7-draft-saving-version-history.md] - Previous story patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

<!-- Debug log references will be added during implementation -->

### Completion Notes List

<!-- Notes will be added during implementation -->

### File List

<!-- Created/modified files will be listed after implementation -->
