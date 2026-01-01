# Story 34.1: Parent-Initiated Agreement Change

Status: done

Epic: 34 - Agreement Changes & Proposals
Priority: High

## Story

As **a parent**,
I want **to propose changes to our family agreement**,
So that **rules can evolve as my child grows**.

## Acceptance Criteria

1. **AC1: Section Selection**
   - Given parent wants to change agreement
   - When initiating change proposal
   - Then parent can select which section to modify
   - And all current agreement sections displayed
   - And multiple sections can be selected at once
   - And sections include: time limits, app restrictions, monitoring settings

2. **AC2: Diff View**
   - Given parent is editing a section
   - When making changes
   - Then changes shown in diff view (old vs new)
   - And additions highlighted in green
   - And removals highlighted in red
   - And unchanged content clearly visible
   - And preview available before submission

3. **AC3: Change Reason**
   - Given parent is creating proposal
   - When adding change details
   - Then reason for change can be added (optional but encouraged)
   - And example prompts shown: "You've been responsible with gaming"
   - And positive framing encouraged in UI hints
   - And reason visible to child when reviewing

4. **AC4: Send Proposal**
   - Given proposal is ready
   - When parent submits proposal
   - Then proposal saved to Firestore with 'pending' status
   - And proposal includes: sections changed, old values, new values, reason
   - And proposal versioned for history tracking
   - And timestamp recorded

5. **AC5: Child Notification**
   - Given proposal is submitted
   - When child should be notified
   - Then child receives notification: "Mom proposed a change to your agreement"
   - And notification includes proposal summary
   - And notification links to review screen
   - And in-app notification created
   - And push notification sent (if enabled)

6. **AC6: Pending State**
   - Given proposal is submitted
   - When viewing agreement status
   - Then change is NOT active until child accepts
   - And parent sees: "Waiting for [Child] to review"
   - And current agreement remains in effect
   - And proposal can be withdrawn before acceptance

## Technical Notes

### Architecture Patterns

- Extends existing agreement infrastructure from Epic 5-6
- Uses Firestore collection: `families/{familyId}/agreementProposals`
- Real-time sync via `onSnapshot` pattern
- Follows notification patterns from Story 19C.5 (`agreementChangeService.ts`)

### Data Model

```typescript
// Agreement change proposal
interface AgreementProposal {
  id: string
  familyId: string
  childId: string
  agreementId: string // Current active agreement being modified
  proposedBy: 'parent' | 'child'
  proposerId: string
  proposerName: string

  // Changes
  changes: ProposalChange[]
  reason: string | null

  // Status
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'counter-proposed'

  // Timestamps
  createdAt: number
  updatedAt: number
  respondedAt: number | null

  // Versioning
  version: number // For optimistic locking
  proposalNumber: number // Sequential within family
}

interface ProposalChange {
  sectionId: string
  sectionName: string
  fieldPath: string // e.g., 'timeLimits.weekday.gaming'
  oldValue: unknown
  newValue: unknown
  changeType: 'add' | 'modify' | 'remove'
}

// Proposal response (for future stories 34-3, 34-4)
interface ProposalResponse {
  id: string
  proposalId: string
  responderId: string
  responderName: string
  action: 'accept' | 'decline' | 'counter'
  comment: string | null
  counterChanges: ProposalChange[] | null // For counter-proposals
  createdAt: number
}
```

### Key Files to Create/Modify

**Shared Package:**

- `packages/shared/src/contracts/agreementProposal.ts` - Proposal schemas (create new file)
- `packages/shared/src/contracts/agreementProposal.test.ts` - Schema tests
- `packages/shared/src/contracts/index.ts` - Export new schemas
- `packages/shared/src/index.ts` - Export new types

**Web App - Hooks:**

- `apps/web/src/hooks/useAgreementProposal.ts` - Create/manage proposals
- `apps/web/src/hooks/useAgreementProposal.test.ts` - Hook tests
- `apps/web/src/hooks/usePendingProposals.ts` - List pending proposals
- `apps/web/src/hooks/usePendingProposals.test.ts` - Hook tests

**Web App - Components:**

- `apps/web/src/components/parent/AgreementProposalWizard.tsx` - Multi-step proposal creator
- `apps/web/src/components/parent/AgreementProposalWizard.test.tsx` - Wizard tests
- `apps/web/src/components/parent/AgreementSectionSelector.tsx` - Section selection UI
- `apps/web/src/components/parent/AgreementSectionSelector.test.tsx` - Selector tests
- `apps/web/src/components/shared/AgreementDiffView.tsx` - Diff visualization
- `apps/web/src/components/shared/AgreementDiffView.test.tsx` - Diff tests
- `apps/web/src/components/parent/ProposalStatusCard.tsx` - Show pending status

**Services:**

- `apps/web/src/services/agreementProposalService.ts` - Proposal CRUD operations
- `apps/web/src/services/agreementProposalService.test.ts` - Service tests

### Existing Patterns to Follow

- Agreement infrastructure: `packages/shared/src/contracts/activeAgreement.test.ts`
- Change request pattern: `apps/web/src/services/agreementChangeService.ts`
- Notification pattern: `apps/web/src/services/agreementChangeService.ts:createParentNotification`
- Hook patterns: `apps/web/src/hooks/useFocusMode.ts`, `apps/web/src/hooks/useWorkMode.ts`
- Wizard pattern: Review existing multi-step forms in codebase

### Firestore Structure

```
families/{familyId}/
  activeAgreements/{agreementId}/   # Existing - current agreement
    terms, status, signatures, etc.

  agreementProposals/               # New collection
    {proposalId}/
      changes, status, reason, etc.

      responses/                    # Subcollection for future stories
        {responseId}/
          action, comment, etc.
```

### UI/UX Requirements

- Wizard-style multi-step flow: 1) Select sections → 2) Make changes → 3) Add reason → 4) Review & submit
- Diff view should be intuitive with clear color coding
- Positive framing in all messaging
- Mobile-friendly design
- Accessible (WCAG 2.1 AA compliance)

### Security Considerations

- Only parents can create parent-initiated proposals
- Proposals scoped to family via Firestore security rules
- Child can only view proposals for their own agreements
- Audit trail for all proposal actions

## Dependencies

- Epic 5-6: Agreement Creation & Activation (provides base agreement infrastructure)
- Story 19C.5: Agreement change request pattern (provides notification template)

## Tasks / Subtasks

- [x] Task 1: Create agreement proposal schemas (AC: #1, #2, #4)
  - [x] 1.1 Add AgreementProposal schema to @fledgely/shared
  - [x] 1.2 Add ProposalChange schema
  - [x] 1.3 Add ProposalResponse schema (for future stories)
  - [x] 1.4 Add proposal status enum
  - [x] 1.5 Add unit tests for schemas (39 tests passing)

- [x] Task 2: Create agreement proposal hook (AC: #4, #6)
  - [x] 2.1 Create `useAgreementProposal` hook
  - [x] 2.2 Implement createProposal function
  - [x] 2.3 Implement withdrawProposal function
  - [x] 2.4 Add real-time status sync
  - [x] 2.5 Add unit tests for hook (13 tests passing)

- [x] Task 3: Create pending proposals hook (AC: #6)
  - [x] 3.1 Create `usePendingProposals` hook
  - [x] 3.2 Query proposals with status='pending' for family
  - [x] 3.3 Real-time subscription for updates
  - [x] 3.4 Add unit tests for hook (10 tests passing)

- [x] Task 4: Create section selector component (AC: #1)
  - [x] 4.1 Create `AgreementSectionSelector` component
  - [x] 4.2 Display all current agreement sections
  - [x] 4.3 Allow multi-select with checkboxes
  - [x] 4.4 Add component tests (10 tests passing)

- [x] Task 5: Create diff view component (AC: #2)
  - [x] 5.1 Create `AgreementDiffView` component
  - [x] 5.2 Implement side-by-side or inline diff display
  - [x] 5.3 Color-code additions (green) and removals (red)
  - [x] 5.4 Handle complex nested objects
  - [x] 5.5 Add component tests (13 tests passing)

- [x] Task 6: Create proposal wizard (AC: #1, #2, #3, #4)
  - [x] 6.1 Create `AgreementProposalWizard` component
  - [x] 6.2 Implement step 1: Section selection
  - [x] 6.3 Implement step 2: Edit changes with diff preview
  - [x] 6.4 Implement step 3: Add reason (with positive prompts)
  - [x] 6.5 Implement step 4: Review and submit
  - [x] 6.6 Add component tests (17 tests passing)

- [x] Task 7: Implement child notification (AC: #5)
  - [x] 7.1 Extend notification service for proposal notifications
  - [x] 7.2 Create in-app notification document
  - [x] 7.3 Trigger push notification (if enabled)
  - [x] 7.4 Include proposal summary in notification
  - [x] 7.5 Add service tests (7 tests passing)

- [x] Task 8: Create proposal status card (AC: #6)
  - [x] 8.1 Create `ProposalStatusCard` component
  - [x] 8.2 Show "Waiting for [Child] to review" status
  - [x] 8.3 Add withdraw button
  - [x] 8.4 Show proposal summary
  - [x] 8.5 Add component tests (9 tests passing)

## Dev Notes

### Project Structure Notes

- Proposal schemas should be in a new dedicated file for clean separation
- Wizard component should be composable with reusable step components
- Diff view component should be generic and reusable for Story 34-2 (child proposals)

### Previous Story Intelligence

From Epic 33 learnings:

- Use client-side computation where possible to reduce Cloud Function costs
- Follow positive, supportive framing patterns established in focus/work mode
- Bilateral transparency patterns work well for parent/child shared views
- Comprehensive test coverage prevents regressions

From agreementChangeService.ts patterns:

- Use `serverTimestamp()` for all timestamps
- Log to `familyActivity` collection for audit trail
- Separate notification creation from main operation

### Testing Standards

- Unit tests for all Zod schemas
- Hook tests with mocked Firestore data
- Component tests with React Testing Library
- Test wizard navigation flow
- Test diff view with various data structures
- Test notification creation

### References

- [Source: docs/epics/epic-list.md#story-341-parent-initiated-agreement-change]
- [Source: apps/web/src/services/agreementChangeService.ts] - Notification pattern
- [Source: packages/shared/src/contracts/activeAgreement.test.ts] - Agreement schema pattern
- [Source: apps/web/src/hooks/useAgreementMode.ts] - Agreement mode hook pattern

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

### File List

(Files to be created during implementation)
