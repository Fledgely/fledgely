# Story 3A.3: Agreement Changes Two-Parent Approval

## Status: done

## Story

As a **parent in shared custody**,
I want **family agreement changes to require both parents' approval**,
So that **agreements reflect joint parenting decisions**.

## Acceptance Criteria

1. **AC1: Pending Co-Parent State**
   - Given a shared custody family with an active agreement
   - When either parent proposes agreement changes
   - Then changes enter pending state requiring other parent approval
   - And status shows "awaiting co-parent approval"

2. **AC2: Child Cannot Sign Until Both Parents Approve**
   - Given a proposal is pending co-parent approval
   - When child attempts to view or respond
   - Then child sees proposal is "waiting for both parents"
   - And child cannot accept/decline until co-parent approves

3. **AC3: Pending Changes Visibility**
   - Given a proposal pending co-parent approval
   - When any family member views the proposal
   - Then pending changes are visible to all family members
   - And current approval status is clearly shown

4. **AC4: Co-Parent Response Options**
   - Given a proposal awaits co-parent approval
   - When other parent reviews the proposal
   - Then they can approve, decline, or propose modifications
   - And modifications restart the approval process (new proposal)

5. **AC5: Proposal Expiration**
   - Given a proposal pending co-parent approval
   - When 14 days pass without approval
   - Then proposal expires automatically
   - And proposing parent is notified of expiration

6. **AC6: Original Agreement Remains Active**
   - Given a proposal is in any pending state
   - When viewing current agreement status
   - Then original agreement remains active
   - And new version only activates after all parties sign

## Tasks / Subtasks

### Task 1: Extend Agreement Proposal Schema (AC: #1, #2, #3) [x]

Add co-parent approval fields to existing agreementProposalSchema.

**Files:**

- `packages/shared/src/contracts/index.ts` (modify)
- `packages/shared/src/contracts/agreementProposal.test.ts` (modify)

**Implementation:**

- Add coParentApprovalRequired: boolean to agreementProposalSchema
- Add coParentApprovalStatus: 'pending' | 'approved' | 'declined' | null
- Add coParentApprovedByUid: string | null
- Add coParentApprovedAt: number | null
- Add coParentDeclineReason: string | null
- Add expiresAt: number | null (for 14-day expiration)
- Update proposalStatusSchema to include 'pending_coparent_approval' status

**Tests:** ~10 tests for schema validation

### Task 2: Create Co-Parent Approval Service (AC: #1, #4, #5) [x]

Create service for co-parent approval workflow.

**Files:**

- `apps/web/src/services/coParentProposalApprovalService.ts` (new)
- `apps/web/src/services/coParentProposalApprovalService.test.ts` (new)

**Implementation:**

- Implement requiresCoParentApproval(familyId, childId) - checks custody type
- Implement approveAsCoParent(proposalId, approverUid) - marks approved
- Implement declineAsCoParent(proposalId, declineReason) - marks declined
- Implement proposeModification(proposalId, modifiedChanges) - creates new proposal
- Implement checkProposalExpiration(proposalId) - 14-day timeout
- Implement getCoParentApprovalStatus(proposalId) - returns current status
- Use existing custodyArrangementSchema to determine if shared custody

**Tests:** ~25 tests for service functions

### Task 3: Add Firestore Security Rules (AC: #1, #4) [x]

Update security rules for co-parent approval workflow.

**Files:**

- `packages/firebase-rules/firestore.rules` (modify)
- `packages/firebase-rules/__tests__/coParentProposalApproval.rules.test.ts` (new)

**Implementation:**

- Add rule: Only OTHER parent can approve/decline co-parent approval
- Add rule: Proposer cannot self-approve their own proposal
- Add rule: Child cannot modify co-parent approval fields
- Add helper: isOtherGuardian() - checks if user is family guardian but not proposer
- Reuse patterns from Story 3A.2 (SafetySettingProposalCard)

**Tests:** ~8 security rule tests

### Task 4: Create Co-Parent Approval UI (AC: #3, #4) [x]

Create component for co-parent to review and respond to proposals.

**Files:**

- `apps/web/src/components/parent/CoParentProposalApprovalCard.tsx` (new)
- `apps/web/src/components/parent/CoParentProposalApprovalCard.test.tsx` (new)
- `apps/web/src/components/parent/index.ts` (modify)

**Implementation:**

- Show proposal details with changes comparison
- Approve button with confirmation
- Decline button with optional reason field
- Modify button that navigates to proposal editor with changes pre-filled
- Expiration countdown display (days remaining)
- Clear status indicators (awaiting, approved, declined)
- 44px minimum touch targets (NFR49)
- Keyboard accessible (NFR43)

**Tests:** ~20 tests for component states and interactions

### Task 5: Update Existing Proposal UI for Co-Parent Status (AC: #2, #3) [x]

Update ProposalStatusCard and ChildProposalStatusCard to show co-parent approval status.

**Files:**

- `apps/web/src/components/parent/ProposalStatusCard.tsx` (modify)
- `apps/web/src/components/parent/ProposalStatusCard.test.tsx` (modify)
- `apps/web/src/components/child/ChildProposalStatusCard.tsx` (modify)
- `apps/web/src/components/child/ChildProposalStatusCard.test.tsx` (modify)

**Implementation:**

- Add co-parent approval status indicator to parent view
- Show "Awaiting [CoParentName]'s approval" status
- Child view shows "Waiting for both parents" when pending co-parent
- Disable accept/decline buttons for child until co-parent approved
- Add visual badge showing approval workflow stage

**Tests:** ~12 additional tests

### Task 6: Integrate Co-Parent Check in Proposal Creation (AC: #1, #6) [x]

Modify proposal creation flow to detect shared custody and require co-parent approval.

**Files:**

- `apps/web/src/hooks/useAgreementProposal.ts` (modify)
- `apps/web/src/hooks/useAgreementProposal.test.ts` (modify)

**Implementation:**

- On proposal creation, check if child has shared custody
- If shared custody, set coParentApprovalRequired = true
- Set initial coParentApprovalStatus = 'pending'
- Set expiresAt = createdAt + 14 days
- Send notification to other parent via existing notification system

**Tests:** ~8 additional tests

### Task 7: Add Notification for Co-Parent (AC: #1, #4, #5) [x]

Extend notification system for co-parent approval workflow.

**Files:**

- `apps/web/src/services/agreementProposalService.ts` (modify)
- `apps/web/src/services/agreementProposalService.test.ts` (modify)

**Implementation:**

- Add createCoParentNotification function
- Notify co-parent when proposal needs their approval
- Notify proposer when co-parent approves/declines
- Notify proposer when proposal expires
- Include proposal summary in notification

**Tests:** ~6 additional tests

### Task 8: Dashboard Integration (AC: #3) [x]

Show pending co-parent approvals on parent dashboard.

**Files:**

- `apps/web/src/app/dashboard/page.tsx` (modify)

**Implementation:**

- Add section for "Proposals Awaiting Your Approval"
- Use CoParentProposalApprovalCard for each pending proposal
- Position above regular proposals
- Show count badge if multiple pending

**Tests:** Covered by component tests

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via Zod schemas
- **Schema Source:** @fledgely/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)
- **Existing Collection:** /agreementProposals/{proposalId} - extend schema

### Architecture Compliance

From project_context.md:

- "All types from Zod Only" - extend agreementProposalSchema with Zod fields
- "Firebase SDK Direct" - use `doc()`, `updateDoc()`, `getDoc()` directly
- "Functions Delegate to Services" - service layer for co-parent approval logic

### Existing Infrastructure to Leverage

From **Epic 34** (Agreement Changes):

- `agreementProposalSchema` in packages/shared/src/contracts/index.ts
- `ProposalStatusCard` in apps/web/src/components/parent/
- `ChildProposalStatusCard` in apps/web/src/components/child/
- `useAgreementProposal` hook for proposal creation
- `usePendingProposals` hook for fetching proposals
- `agreementProposalService` for notifications

From **Story 3A.2** (Safety Settings Two-Parent Approval):

- `SafetySettingProposalCard` - UI pattern for co-parent approval cards
- `safetySettingService` - approval workflow pattern
- Firestore security rules pattern with isOtherGuardian helper
- 7-day cooldown pattern (not needed here, but pattern exists)

### Custody Detection

Use existing custody infrastructure:

```typescript
// Check if child has shared custody requiring co-parent approval
import { custodyArrangementSchema } from '@fledgely/shared'

async function requiresCoParentApproval(childId: string): Promise<boolean> {
  const childDoc = await getDoc(doc(db, 'children', childId))
  const custody = childDoc.data()?.custodyArrangement
  return custody?.type === 'shared'
}
```

### Extended Proposal Status Flow

```
1. Parent creates proposal
   └─ If sole custody: status = 'pending' (child can respond)
   └─ If shared custody: status = 'pending_coparent_approval'

2. Co-parent receives notification
   └─ Approve: coParentApprovalStatus = 'approved', status = 'pending'
   └─ Decline: coParentApprovalStatus = 'declined', status = 'declined'
   └─ Modify: Creates new proposal (original withdrawn)

3. After co-parent approval:
   └─ Child receives notification
   └─ Child can accept/decline/counter

4. Expiration (14 days):
   └─ Auto-decline if no co-parent response
```

### Schema Extension

```typescript
// Extend agreementProposalSchema
export const agreementProposalSchema = z.object({
  // ... existing fields ...

  // Co-parent approval fields (Story 3A.3)
  coParentApprovalRequired: z.boolean().default(false),
  coParentApprovalStatus: z.enum(['pending', 'approved', 'declined']).nullable().default(null),
  coParentApprovedByUid: z.string().nullable().default(null),
  coParentApprovedAt: z.number().nullable().default(null),
  coParentDeclineReason: z.string().nullable().default(null),
  expiresAt: z.number().nullable().default(null), // 14 days from creation
})
```

### Proposal Status Values

Update proposalStatusSchema:

```typescript
export const proposalStatusSchema = z.enum([
  'pending', // Existing: Awaiting response
  'pending_coparent_approval', // NEW: Awaiting other parent approval
  'accepted', // Existing: Accepted by recipient
  'declined', // Existing: Declined by recipient
  'withdrawn', // Existing: Withdrawn by proposer
  'counter-proposed', // Existing: Counter-proposal made
  'activated', // Existing: Both parties confirmed
  'expired', // NEW: 14-day timeout
])
```

### Previous Story Intelligence

From **Story 3A.2** completion:

- SafetySettingProposalCard provides pattern for approval UI
- Security rules use isOtherGuardian helper to prevent self-approval
- Emergency increase pattern (immediate apply with review) not needed here
- 44px touch targets required per NFR49
- All elements must be keyboard accessible per NFR43

From **Epic 34** (Agreement Changes):

- useAgreementProposal hook creates proposals
- usePendingProposals hook fetches pending proposals
- ProposalStatusCard shows proposal status to proposer
- ChildProposalStatusCard shows proposal to child
- Notification patterns exist in agreementProposalService

### File Structure

```
packages/shared/src/contracts/
└── index.ts                    # UPDATE - Extend agreementProposalSchema

apps/web/src/
├── services/
│   ├── coParentProposalApprovalService.ts     # NEW
│   ├── coParentProposalApprovalService.test.ts # NEW
│   └── agreementProposalService.ts            # UPDATE - Add co-parent notifications
├── components/
│   ├── parent/
│   │   ├── CoParentProposalApprovalCard.tsx   # NEW
│   │   ├── CoParentProposalApprovalCard.test.tsx # NEW
│   │   └── ProposalStatusCard.tsx             # UPDATE
│   └── child/
│       └── ChildProposalStatusCard.tsx        # UPDATE
├── hooks/
│   └── useAgreementProposal.ts                # UPDATE
└── app/
    └── dashboard/
        └── page.tsx                           # UPDATE

packages/firebase-rules/
├── firestore.rules                            # UPDATE
└── __tests__/
    └── coParentProposalApproval.rules.test.ts # NEW
```

### Testing Requirements

- Unit test schema extensions for co-parent approval fields
- Unit test requiresCoParentApproval function with custody check
- Unit test approveAsCoParent function
- Unit test declineAsCoParent function
- Unit test 14-day expiration logic
- Security rules tests: proposer cannot self-approve
- Security rules tests: child cannot modify co-parent fields
- Component tests: CoParentProposalApprovalCard states
- Component tests: Updated ProposalStatusCard with co-parent status
- Component tests: Child cannot respond until co-parent approves
- Integration test: Full approval workflow

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR46: Visible focus indicators
- NFR49: 44x44px minimum touch target

### References

- [Source: docs/epics/epic-list.md#Story-3A.3]
- [Source: docs/epics/epic-list.md#Epic-3A]
- [Source: docs/sprint-artifacts/stories/3a-2-safety-settings-two-parent-approval.md]
- [Source: docs/sprint-artifacts/stories/34-1-parent-initiated-agreement-change.md]
- [Source: packages/shared/src/contracts/index.ts#agreementProposalSchema]
- [Source: apps/web/src/components/parent/ProposalStatusCard.tsx]
- [Source: apps/web/src/components/child/ChildProposalStatusCard.tsx]
- [Source: apps/web/src/hooks/useAgreementProposal.ts]

## Dev Agent Record

### Context Reference

- Epic: 3A (Shared Custody Safeguards)
- Story Key: 3a-3-agreement-changes-two-parent-approval
- Dependencies: Story 3A.2 (two-parent approval patterns), Epic 34 (agreement changes)

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

- packages/shared/src/contracts/index.ts (modified - extended agreementProposalSchema)
- packages/shared/src/contracts/agreementProposal.test.ts (modified - schema tests)
- apps/web/src/services/coParentProposalApprovalService.ts (new - approval workflow service)
- apps/web/src/services/coParentProposalApprovalService.test.ts (new - 30 tests)
- apps/web/src/services/agreementProposalService.ts (modified - co-parent notifications)
- apps/web/src/components/parent/CoParentProposalApprovalCard.tsx (new - approval UI)
- apps/web/src/components/parent/CoParentProposalApprovalCard.test.tsx (new - 44 tests)
- apps/web/src/components/parent/ProposalStatusCard.tsx (modified - co-parent status)
- apps/web/src/components/parent/ProposalStatusCard.test.tsx (modified - additional tests)
- apps/web/src/components/child/ChildProposalStatusCard.tsx (modified - child cannot respond)
- apps/web/src/components/child/ChildProposalStatusCard.test.tsx (modified - additional tests)
- apps/web/src/components/parent/index.ts (new - barrel export)
- apps/web/src/hooks/useAgreementProposal.ts (modified - co-parent check)
- apps/web/src/hooks/useAgreementProposal.test.ts (modified - additional tests)
- packages/firebase-rules/firestore.rules (modified - co-parent approval rules)
- packages/firebase-rules/**tests**/coParentProposalApproval.rules.test.ts (new - security rule tests)
- apps/web/src/app/dashboard/page.tsx (modified - co-parent approvals section)
