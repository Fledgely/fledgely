# Story 6.1: Child Digital Signature Ceremony

Status: done

## Story

As a **child**,
I want **to sign the agreement in a meaningful ceremony**,
So that **my consent feels real and respected, not just a checkbox**.

## Acceptance Criteria

1. **AC1: Ceremony Screen Display**
   - Given an agreement is ready for signing (previewed and approved)
   - When child initiates their signature
   - Then system displays child-appropriate signing ceremony screen
   - And the screen uses 6th-grade reading level (NFR65)

2. **AC2: Signature Input Options**
   - Given child is on the signing ceremony screen
   - When they complete their signature
   - Then child can enter their name (typed) for accessibility
   - Or child can draw signature (touch/mouse) for engagement
   - And both methods are equally valid

3. **AC3: Consent Acknowledgment**
   - Given child is signing the agreement
   - When completing the ceremony
   - Then child must check "I understand and agree" checkbox
   - And key commitments are displayed before signature

4. **AC4: Accessibility - Read Aloud**
   - Given child is using assistive technology
   - When viewing key commitments
   - Then screen reader announces commitments clearly
   - And focus management guides through ceremony steps

5. **AC5: Signature Recording**
   - Given child completes their signature
   - When signature is submitted
   - Then signature timestamp is recorded in agreement
   - And signature data (type, name/drawing) is stored

6. **AC6: Celebratory Feedback**
   - Given child has successfully signed
   - When signature is confirmed
   - Then celebratory animation/feedback confirms signing
   - And message displays "You signed!" or similar encouragement

7. **AC7: Parent-First Requirement Prevention**
   - Given agreement signing flow
   - When child attempts to sign
   - Then child cannot sign if parent has already signed (prevents coercion)
   - And system enforces child-first signing order (FR19)

## Tasks / Subtasks

- [x] Task 1: Create Signature Schema Types (AC: #5)
  - [x] 1.1 Add signatureSchema to shared contracts
  - [x] 1.2 Add agreementSigningSchema for signing state
  - [x] 1.3 Add signatureMethodSchema (typed vs drawn)
  - [x] 1.4 Export all new types

- [x] Task 2: Create Signing Ceremony Component (AC: #1)
  - [x] 2.1 Create ChildSigningCeremony component shell
  - [x] 2.2 Display child-friendly ceremony screen
  - [x] 2.3 Show key commitments from agreement
  - [x] 2.4 Use 6th-grade reading level text

- [x] Task 3: Signature Input Components (AC: #2)
  - [x] 3.1 Create TypedSignature component (text input)
  - [x] 3.2 Create DrawnSignature component (canvas)
  - [x] 3.3 Create SignatureToggle to switch between modes
  - [x] 3.4 Ensure touch/mouse drawing works

- [x] Task 4: Consent Acknowledgment (AC: #3)
  - [x] 4.1 Create ConsentCheckbox component
  - [x] 4.2 Display key commitments summary
  - [x] 4.3 Require checkbox before submit
  - [x] 4.4 Child-friendly consent language

- [x] Task 5: Accessibility Features (AC: #4)
  - [x] 5.1 Add ARIA labels and live regions
  - [x] 5.2 Implement focus management through steps
  - [x] 5.3 Screen reader announcements for each step
  - [x] 5.4 44px+ touch targets throughout

- [x] Task 6: Celebration & Confirmation (AC: #6)
  - [x] 6.1 Create SignatureConfirmation component
  - [x] 6.2 Add celebratory animation (confetti/stars)
  - [x] 6.3 Display success message
  - [x] 6.4 Accessible celebration (not animation-only)

- [x] Task 7: Signing Order Enforcement (AC: #7)
  - [x] 7.1 Check parent signature status before allowing child
  - [x] 7.2 Display "waiting for parent" if parent signed first
  - [x] 7.3 Enforce child-first signing flow

- [x] Task 8: Unit Tests (AC: All)
  - [x] 8.1 Test ChildSigningCeremony component (27 tests)
  - [x] 8.2 Test TypedSignature component (16 tests)
  - [x] 8.3 Test DrawnSignature component (18 tests)
  - [x] 8.4 Test ConsentCheckbox component (17 tests)
  - [x] 8.5 Test SignatureConfirmation component (16 tests)
  - [x] 8.6 Test signing order enforcement

## Dev Notes

### Implementation Strategy

This story implements the child's signing ceremony for family agreements. The ceremony should feel meaningful and engaging for children while maintaining accessibility and legal validity.

### Key Requirements

- **Child-First Signing (FR19):** Child MUST sign before parent to prevent coercion
- **Meaningful Ceremony:** Not just a checkbox - make signing feel special
- **Accessibility (NFR42):** Full keyboard/screen reader support
- **Reading Level (NFR65):** All text at 6th-grade level max

### Technical Approach

1. **Signature Schema** - Add to `@fledgely/shared/contracts`:
   - `signatureMethodSchema`: 'typed' | 'drawn'
   - `signatureSchema`: id, method, name/imageData, timestamp, party
   - `signingStatusSchema`: 'pending' | 'child_signed' | 'parent_signed' | 'complete'

2. **Components Structure**:

```
ChildSigningCeremony
├── CeremonyHeader (title, progress indicator)
├── CommitmentsSummary (key terms child is agreeing to)
├── SignatureInput
│   ├── SignatureToggle (typed vs drawn)
│   ├── TypedSignature (input field)
│   └── DrawnSignature (canvas)
├── ConsentCheckbox ("I understand and agree")
├── SignButton (submit signature)
└── SignatureConfirmation (celebration on success)
```

3. **Signing Flow**:
   - Check if parent has already signed → block if yes
   - Display commitments summary
   - Collect signature (typed or drawn)
   - Require consent checkbox
   - Submit and record timestamp
   - Show celebration

### Drawn Signature Canvas

Use HTML5 Canvas for drawn signatures:

- Touch and mouse event handling
- Clear button to reset
- Save as base64 data URL
- Accessible with "Sign by drawing" label

### Celebration Animation

Simple, child-friendly celebration:

- CSS keyframe animation for confetti/stars
- Accessible announcement via aria-live
- Optional reduced-motion support

### NFR References

- NFR42: WCAG 2.1 AA compliance
- NFR45: 4.5:1 color contrast ratio
- NFR46: Visible focus indicators
- NFR47: Screen reader announcements
- NFR65: 6th-grade reading level

### Project Structure Notes

- Components: `apps/web/src/components/signing/`
- Tests: `apps/web/src/components/signing/__tests__/`
- Shared types: `packages/shared/src/contracts/`

### References

- [Source: docs/epics/epic-list.md - Story 6.1]
- [Source: docs/prd/functional-requirements.md - FR19, FR20, FR21]
- [Source: docs/prd/non-functional-requirements.md - NFR42, NFR47, NFR65]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

- packages/shared/src/contracts/index.ts (modified - added signature schemas)
- apps/web/src/components/signing/ChildSigningCeremony.tsx (new)
- apps/web/src/components/signing/TypedSignature.tsx (new)
- apps/web/src/components/signing/DrawnSignature.tsx (new)
- apps/web/src/components/signing/ConsentCheckbox.tsx (new)
- apps/web/src/components/signing/SignatureConfirmation.tsx (new)
- apps/web/src/components/signing/index.ts (new)
- apps/web/src/components/signing/**tests**/ChildSigningCeremony.test.tsx (new)
- apps/web/src/components/signing/**tests**/TypedSignature.test.tsx (new)
- apps/web/src/components/signing/**tests**/DrawnSignature.test.tsx (new)
- apps/web/src/components/signing/**tests**/ConsentCheckbox.test.tsx (new)
- apps/web/src/components/signing/**tests**/SignatureConfirmation.test.tsx (new)
- apps/web/src/app/layout.tsx (modified - added CSS animations)

## Test Results

- 95 new tests added (1487 total passing)
- All lint checks pass (warnings only)
- Build succeeds

## Code Review Fixes

- Fixed TypedSignature controlled component pattern (value prop sync)
- Fixed DrawnSignature canvas coordinate scaling for responsive layouts
- Fixed DrawnSignature canvas initialization (runs once, not on every color change)
- Added accessible step labels to progress indicator (aria-label)
- Fixed SignatureConfirmation SSR hydration issue (replaced Math.random with stable values)
- Added named constants for canvas dimensions (DEFAULT_CANVAS_WIDTH/HEIGHT)

## Change Log

| Date       | Change                          |
| ---------- | ------------------------------- |
| 2025-12-29 | Story created                   |
| 2025-12-29 | Implementation complete (AC1-7) |
| 2025-12-29 | Code review fixes applied       |
