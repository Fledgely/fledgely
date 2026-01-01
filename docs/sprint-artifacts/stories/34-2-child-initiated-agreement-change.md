# Story 34.2: Child-Initiated Agreement Change

Status: done

Epic: 34 - Agreement Changes & Proposals
Priority: High

## Story

As **a child**,
I want **to propose changes to our agreement**,
So that **I have a voice in my own monitoring**.

## Acceptance Criteria

1. **AC1: Child Section Selection**
   - Given child wants to propose a change (FR121)
   - When creating proposal
   - Then child selects what they want to change
   - And all current agreement sections displayed
   - And sections are shown with child-friendly language
   - And selected sections highlighted

2. **AC2: Child Reason Input**
   - Given child is editing a section
   - When making changes
   - Then child provides reason: "I need more gaming time on weekends"
   - And age-appropriate example prompts shown
   - And positive, constructive framing encouraged
   - And reason is required (not optional like parent)

3. **AC3: Proposal Submission**
   - Given proposal is ready
   - When child submits proposal
   - Then proposal saved to Firestore with 'pending' status
   - And proposedBy = 'child' in proposal record
   - And proposal includes: sections changed, old values, new values, reason
   - And timestamp recorded

4. **AC4: Parent Notification**
   - Given proposal is submitted
   - When parent should be notified
   - Then parent notified: "Emma proposed a change to the agreement"
   - And notification includes proposal summary
   - And notification links to review screen
   - And all guardians in family receive notification

5. **AC5: Child Status View**
   - Given proposal is submitted
   - When child views proposal status
   - Then child sees proposal status: "Waiting for mom to review"
   - And child can see their submitted changes
   - And child can withdraw proposal before parent responds
   - And empowers child voice in family rules

## Technical Notes

### CRITICAL: Reuse Story 34-1 Infrastructure

Story 34-1 created extensive infrastructure that MUST be reused:

**Already Complete - DO NOT RECREATE:**

- `packages/shared/src/contracts/agreementProposal.ts` - Schema supports `proposedBy: 'child'`
- `apps/web/src/hooks/useAgreementProposal.ts` - Works for both parent and child
- `apps/web/src/hooks/usePendingProposals.ts` - Already queries all pending proposals
- `apps/web/src/components/shared/AgreementDiffView.tsx` - Reusable diff component
- `packages/firebase-rules/firestore.rules` - Security rules exist (may need child permission)

**Components to Create for Child:**

- `apps/web/src/components/child/ChildAgreementProposalWizard.tsx` - Child version of wizard
- `apps/web/src/components/child/ChildProposalStatusCard.tsx` - Shows child's proposal status

### Key Files to Create/Modify

**Child Components (NEW):**

```
apps/web/src/components/child/
  ChildAgreementProposalWizard.tsx        # Child-focused proposal wizard
  ChildAgreementProposalWizard.test.tsx   # Wizard tests
  ChildProposalStatusCard.tsx             # Status card for child view
  ChildProposalStatusCard.test.tsx        # Status tests
```

**Reused from Story 34-1:**

```
apps/web/src/components/shared/AgreementDiffView.tsx        # REUSE
apps/web/src/components/parent/AgreementSectionSelector.tsx # REUSE (or create child version)
apps/web/src/hooks/useAgreementProposal.ts                  # REUSE - pass proposedBy: 'child'
apps/web/src/hooks/usePendingProposals.ts                   # REUSE
apps/web/src/services/agreementProposalService.ts           # EXTEND for parent notification
```

**Firestore Security Rules Update:**

```
packages/firebase-rules/firestore.rules  # Add child create permissions for proposals
```

### Data Model (Already Exists)

The `AgreementProposal` interface from Story 34-1 already supports child:

```typescript
interface AgreementProposal {
  proposedBy: 'parent' | 'child' // Already supports 'child'
  proposerId: string // Will be child's userId
  proposerName: string // Child's name
  // ... rest of interface unchanged
}
```

### UI/UX Requirements

**Child-Specific Adaptations:**

- Use child-friendly language throughout
- Simpler, more visual section selection
- Required reason field (teaches constructive communication)
- Encouraging prompts: "Tell your parents why this change would help you"
- Celebratory feedback on submission: "Great job speaking up!"

**Wizard Steps:**

1. Select sections to modify (same as parent, child-friendly labels)
2. Make changes (same diff view)
3. Add reason (REQUIRED, with example prompts)
4. Review & submit

**Example Reason Prompts (age-appropriate):**

- "I've been responsible with my screen time lately"
- "I need more gaming time for playing with friends"
- "I think this rule is too strict for my age"
- "I want to try having more freedom"

### Security Considerations

**Firestore Rules Update Needed:**

```javascript
// In agreementProposals rules, add child create permission:
allow create: if isChildInFamily() &&
  request.resource.data.familyId == familyId &&
  request.resource.data.proposerId == request.auth.uid &&
  request.resource.data.proposedBy == 'child' &&
  request.resource.data.status == 'pending';
```

**Child Permissions:**

- Child can only create proposals for their own agreement
- Child can only withdraw their own proposals
- Child cannot view other children's proposals

### Notification Pattern

Follow Story 34-1 notification pattern but notify parents instead:

```typescript
// In agreementProposalService.ts
export async function notifyParentsOfChildProposal(familyId: string, proposal: AgreementProposal) {
  // Get all guardian UIDs from family document
  // Create notification for each guardian
  // Message: "[Child] proposed a change to the agreement"
}
```

## Dependencies

- Story 34-1: Parent-Initiated Agreement Change (DONE - provides all infrastructure)
- Epic 5-6: Agreement Creation & Activation (provides base agreement infrastructure)

## Tasks / Subtasks

- [x] Task 1: Update Firestore security rules for child proposals (AC: #3)
  - [x] 1.1 Add child create permission for agreementProposals
  - [x] 1.2 Add child withdraw permission for own proposals
  - [x] 1.3 Verify child cannot access other children's proposals

- [x] Task 2: Create child proposal wizard component (AC: #1, #2, #3)
  - [x] 2.1 Create `ChildAgreementProposalWizard.tsx`
  - [x] 2.2 Implement step 1: Child-friendly section selection
  - [x] 2.3 Implement step 2: Edit changes with diff preview (reuse AgreementDiffView)
  - [x] 2.4 Implement step 3: Required reason with age-appropriate prompts
  - [x] 2.5 Implement step 4: Review and submit
  - [x] 2.6 Add celebratory feedback on submission
  - [x] 2.7 Add unit tests (23 tests passing)

- [x] Task 3: Create child proposal status card (AC: #5)
  - [x] 3.1 Create `ChildProposalStatusCard.tsx`
  - [x] 3.2 Show "Waiting for [Parent] to review" status
  - [x] 3.3 Add withdraw button
  - [x] 3.4 Show proposal summary
  - [x] 3.5 Add unit tests (10 tests passing)

- [x] Task 4: Implement parent notification (AC: #4)
  - [x] 4.1 Extend agreementProposalService for parent notification
  - [x] 4.2 Get all guardian UIDs from family document
  - [x] 4.3 Create in-app notification for each guardian
  - [x] 4.4 Include proposal summary in notification
  - [x] 4.5 Add service tests (7 new tests, 14 total)

- [x] Task 5: Update shared constants for child messages (AC: #2)
  - [x] 5.1 Add CHILD_PROPOSAL_MESSAGES to @fledgely/shared
  - [x] 5.2 Include age-appropriate reason prompts
  - [x] 5.3 Include success/celebration messages
  - [x] 5.4 Add unit tests

## Dev Notes

### Previous Story Intelligence (Story 34-1)

**Patterns Established:**

- Wizard-style multi-step flow works well
- AgreementDiffView is generic and reusable
- useAgreementProposal hook already accepts `proposedBy` parameter
- Firestore security rules pattern for proposals
- AGREEMENT_PROPOSAL_MESSAGES constant for UI text

**Code to Reuse:**

```typescript
// In ChildAgreementProposalWizard, call existing hook:
const { createProposal, withdrawProposal } = useAgreementProposal({
  familyId,
  childId,
  agreementId,
  proposerId: userId, // Child's userId
  proposerName: childName,
  proposedBy: 'child', // Only difference from parent
})
```

**Test Patterns:**

- Mock Firestore with vi.mock('firebase/firestore')
- Mock @fledgely/shared for constants
- Use waitFor for async state updates
- Test wizard navigation flow

### Project Structure Notes

- Child components go in `apps/web/src/components/child/`
- Shared components (AgreementDiffView) already in `apps/web/src/components/shared/`
- Follow existing child component patterns in 19C stories

### Testing Standards

- Unit tests for all new components
- Reuse test patterns from Story 34-1
- Test child-specific flows (required reason, celebratory feedback)
- Test parent notification creation
- Test security rules for child permissions

### References

- [Source: docs/epics/epic-list.md#story-342-child-initiated-agreement-change]
- [Source: apps/web/src/components/parent/AgreementProposalWizard.tsx] - Pattern to follow
- [Source: apps/web/src/hooks/useAgreementProposal.ts] - Reuse with proposedBy: 'child'
- [Source: apps/web/src/services/agreementProposalService.ts] - Extend for parent notification
- [Source: packages/firebase-rules/firestore.rules] - Add child permissions

## Dev Agent Record

### Context Reference

Previous story (34-1) implementation commit: 0c65c802

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- Updated Firestore security rules with child create/withdraw permissions for proposals
- Created ChildAgreementProposalWizard with child-friendly language and required reason
- Created ChildProposalStatusCard with encouraging message and withdraw button
- Extended agreementProposalService with createParentNotifications function
- Added CHILD_PROPOSAL_MESSAGES to @fledgely/shared with age-appropriate prompts
- All 47 Story 34-2 tests passing

### File List

- packages/firebase-rules/firestore.rules (modified)
- packages/shared/src/contracts/index.ts (modified - added CHILD_PROPOSAL_MESSAGES)
- apps/web/src/components/child/ChildAgreementProposalWizard.tsx (created)
- apps/web/src/components/child/ChildAgreementProposalWizard.test.tsx (created)
- apps/web/src/components/child/ChildProposalStatusCard.tsx (created)
- apps/web/src/components/child/ChildProposalStatusCard.test.tsx (created)
- apps/web/src/services/agreementProposalService.ts (modified)
- apps/web/src/services/agreementProposalService.test.ts (modified)
- docs/sprint-artifacts/stories/34-2-child-initiated-agreement-change.md (created)
