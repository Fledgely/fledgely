# Story 6.2: Parent Digital Signature

Status: done

## Story

As a **parent**,
I want **to sign the agreement after my child**,
So that **my commitment is visible and we're both bound equally**.

## Acceptance Criteria

1. **AC1: Child Signature Prerequisite**
   - Given agreement signing flow
   - When parent attempts to sign
   - Then parent can only sign after child has signed (FR19)
   - And system displays "Waiting for child's signature" if child hasn't signed

2. **AC2: Transparency Display**
   - Given child has signed the agreement
   - When parent initiates their signature
   - Then system shows what child agreed to
   - And child's signature/name is visible
   - And child's signature timestamp is displayed

3. **AC3: Signature Input**
   - Given parent is on signing screen
   - When completing signature
   - Then parent can enter their name (typed) or draw signature
   - And both methods are equally valid
   - And typed signature requires minimum 2 characters

4. **AC4: Parent Commitments Acknowledgment**
   - Given parent is signing
   - When reviewing the agreement
   - Then parent must acknowledge their commitments (not just child's)
   - And parent-specific rules are highlighted
   - And "I commit to these terms" checkbox is required

5. **AC5: Shared Custody Support**
   - Given family has shared custody declaration
   - When agreement requires signatures
   - Then BOTH parents must sign (Epic 3A dependency)
   - And second parent sees first parent's signature
   - And system tracks which parents have signed

6. **AC6: Signature Recording**
   - Given parent completes signature
   - When signature is submitted
   - Then signature timestamp is recorded
   - And signature data (type, name/drawing) is stored
   - And parent's UID is associated with signature

7. **AC7: Signing Completion**
   - Given all required signatures are collected
   - When final parent signature is submitted
   - Then system cannot proceed without all required signatures
   - And agreement is ready for activation
   - And parent signature completes the signing ceremony

## Tasks / Subtasks

- [x] Task 1: Create ParentSigningCeremony Component (AC: #1, #2)
  - [x] 1.1 Create ParentSigningCeremony component shell
  - [x] 1.2 Implement child signature prerequisite check
  - [x] 1.3 Display child's signature/agreement details
  - [x] 1.4 Show waiting state if child hasn't signed

- [x] Task 2: Parent Commitments Display (AC: #4)
  - [x] 2.1 Implement parent commitments section (inline in ParentSigningCeremony)
  - [x] 2.2 Highlight parent-specific rules with indigo styling
  - [x] 2.3 Display "Your commitments" section
  - [x] 2.4 Use appropriate reading level

- [x] Task 3: Reuse Signature Components (AC: #3)
  - [x] 3.1 Integrate TypedSignature for parent
  - [x] 3.2 Integrate DrawnSignature for parent
  - [x] 3.3 Create parent-specific consent checkbox

- [x] Task 4: Shared Custody Support (AC: #5)
  - [x] 4.1 Check custody arrangement for requiresBothParents
  - [x] 4.2 Track which parents have signed
  - [x] 4.3 Display other parent's signature if exists
  - [x] 4.4 Show waiting state for second parent

- [x] Task 5: Signature Submission (AC: #6)
  - [x] 5.1 Create submitParentSignature handler (handleSubmit)
  - [x] 5.2 Record signature timestamp (via onSign callback)
  - [x] 5.3 Associate parent UID with signature (via parentUid prop)
  - [x] 5.4 Update signing status (via onSign callback)

- [x] Task 6: Signing Completion Logic (AC: #7)
  - [x] 6.1 Check all required signatures collected (isSigningComplete)
  - [x] 6.2 Update agreement to ready for activation (via status check)
  - [x] 6.3 Trigger completion celebration (SignatureConfirmation)
  - [x] 6.4 Prevent further signing after complete

- [x] Task 7: Unit Tests (AC: All)
  - [x] 7.1 Test ParentSigningCeremony component (36 tests)
  - [x] 7.2 Test parent commitments inline display
  - [x] 7.3 Test shared custody flow
  - [x] 7.4 Test signing prerequisite enforcement
  - [x] 7.5 Test completion logic

## Dev Notes

### Implementation Strategy

This story extends the signing infrastructure from Story 6.1 to support parent signatures. The ParentSigningCeremony component reuses TypedSignature, DrawnSignature, ConsentCheckbox, and SignatureConfirmation from Story 6.1.

### Key Requirements

- **Child-First Signing (FR19):** Parent MUST sign AFTER child
- **Shared Custody (Epic 3A):** Both parents sign if custody is shared
- **Transparency:** Parent sees what child agreed to
- **Equal Commitment:** Parent acknowledges their own commitments

### Technical Approach

1. **Component Structure**:

```
ParentSigningCeremony
├── WaitingForChildSignature (if child hasn't signed)
├── ChildSignatureSummary (show what child agreed to)
├── ParentCommitmentsSummary (parent-specific rules)
├── SignatureInput (reuse TypedSignature/DrawnSignature)
│   ├── TypedSignature
│   └── DrawnSignature
├── ConsentCheckbox (parent version)
├── SignButton (submit signature)
└── SignatureConfirmation (on success)
```

2. **Shared Custody Flow**:
   - Check `requiresBothParents` from signingState
   - First parent signs → status = 'parent_signed' (waiting for second)
   - Second parent signs → status = 'complete'
   - Display other parent's signature details

3. **Helper Functions to Extend**:
   - `canParentSign()` - Already exists in contracts
   - `isSigningComplete()` - New: check if all required signatures collected
   - `getSigningProgress()` - New: return progress for UI

### NFR References

- NFR42: WCAG 2.1 AA compliance
- NFR45: 4.5:1 color contrast ratio
- NFR46: Visible focus indicators
- NFR47: Screen reader announcements

### Project Structure Notes

- Components: `apps/web/src/components/signing/`
- Tests: `apps/web/src/components/signing/__tests__/`
- Shared types: `packages/shared/src/contracts/`

### References

- [Source: docs/epics/epic-list.md - Story 6.2]
- [Source: docs/prd/functional-requirements.md - FR19, FR20, FR21]
- [Source: Story 6.1 - Reusable components]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- `apps/web/src/components/signing/ParentSigningCeremony.tsx` - Main parent signing ceremony component
- `apps/web/src/components/signing/__tests__/ParentSigningCeremony.test.tsx` - Unit tests (36 tests)
- `apps/web/src/components/signing/index.ts` - Added ParentSigningCeremony export
- `packages/shared/src/contracts/index.ts` - Added hasParentSigned, isSigningComplete, getSigningProgress helpers

## Change Log

| Date       | Change                                                       |
| ---------- | ------------------------------------------------------------ |
| 2025-12-29 | Story created                                                |
| 2025-12-29 | Implementation complete - all ACs satisfied                  |
| 2025-12-29 | Code review fixes: accessibility, other-parent display logic |
