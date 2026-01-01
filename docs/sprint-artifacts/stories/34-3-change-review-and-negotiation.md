# Story 34.3: Change Review and Negotiation

Status: done

Epic: 34 - Agreement Changes & Proposals
Priority: High

## Story

As **a parent or child**,
I want **to review and respond to proposals**,
So that **we can negotiate agreement changes**.

## Acceptance Criteria

1. **AC1: Full Diff View**
   - Given proposal is pending
   - When reviewer opens proposal
   - Then full diff shown: what changes, what stays same
   - And side-by-side comparison clearly visible
   - And color-coded additions (green) and removals (red)
   - And unchanged sections collapsed by default
   - And proposal reason displayed prominently

2. **AC2: Response Options**
   - Given reviewer is viewing proposal
   - When ready to respond
   - Then options shown: "Accept", "Decline", "Counter-propose"
   - And button states clearly indicate current selection
   - And confirmation dialog before final submission
   - And mobile-friendly action buttons

3. **AC3: Counter-Proposal Flow**
   - Given reviewer selects "Counter-propose"
   - When creating counter
   - Then counter-propose allows modification before accepting
   - And reviewer can edit proposed values
   - And reviewer can add/remove sections from proposal
   - And original proposal values shown for reference
   - And counter-proposal saved with link to original

4. **AC4: Comments/Discussion**
   - Given reviewer is responding
   - When adding feedback
   - Then comments can be added: "I'd agree to 1 hour, not 2"
   - And comment is required for decline/counter (encouraged for accept)
   - And positive framing suggestions shown
   - And character limit: 500 characters

5. **AC5: Negotiation History**
   - Given proposal has responses
   - When viewing negotiation
   - Then negotiation history visible to both parties
   - And timeline view shows all proposals and responses
   - And each response shows who responded and when
   - And comments displayed in context

6. **AC6: Multiple Rounds**
   - Given counter-proposal was made
   - When original proposer reviews counter
   - Then multiple rounds of counter-proposals supported
   - And round number displayed (e.g., "Round 2 of negotiation")
   - And "Back to original" option to reference initial proposal
   - And negotiation can continue until accept or decline

## Technical Notes

### CRITICAL: Reuse Story 34-1 and 34-2 Infrastructure

Stories 34-1 and 34-2 created extensive infrastructure that MUST be reused:

**Already Complete - DO NOT RECREATE:**

- `packages/shared/src/contracts/index.ts` - Contains:
  - `agreementProposalSchema` with status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'counter-proposed'
  - `proposalChangeSchema` for individual changes
  - `proposalResponseSchema` for accept/decline/counter responses
  - `proposalResponseActionSchema`: 'accept' | 'decline' | 'counter'
- `apps/web/src/hooks/useAgreementProposal.ts` - Create/manage proposals
- `apps/web/src/hooks/usePendingProposals.ts` - List pending proposals
- `apps/web/src/components/shared/AgreementDiffView.tsx` - Reusable diff component
- `apps/web/src/services/agreementProposalService.ts` - Notification services
- `packages/firebase-rules/firestore.rules` - Security rules for proposals

**Components to Create for Story 34-3:**

- `apps/web/src/components/shared/ProposalReviewScreen.tsx` - Main review screen
- `apps/web/src/components/shared/ProposalResponseForm.tsx` - Accept/decline/counter form
- `apps/web/src/components/shared/NegotiationHistory.tsx` - Timeline of negotiations
- `apps/web/src/components/shared/CounterProposalEditor.tsx` - Edit counter-proposal

**Hook Extensions Needed:**

- `apps/web/src/hooks/useProposalResponse.ts` - Handle accept/decline/counter actions

### Key Files to Create/Modify

**Web App - Hooks (NEW):**

```
apps/web/src/hooks/
  useProposalResponse.ts           # Accept, decline, counter-propose actions
  useProposalResponse.test.ts      # Hook tests
  useNegotiationHistory.ts         # Fetch proposal + responses chain
  useNegotiationHistory.test.ts    # Hook tests
```

**Web App - Components (NEW):**

```
apps/web/src/components/shared/
  ProposalReviewScreen.tsx         # Main review screen (shared parent/child)
  ProposalReviewScreen.test.tsx    # Review screen tests
  ProposalResponseForm.tsx         # Response action form
  ProposalResponseForm.test.tsx    # Form tests
  NegotiationHistory.tsx           # Timeline view of negotiation rounds
  NegotiationHistory.test.tsx      # History tests
  CounterProposalEditor.tsx        # Editor for counter-proposals
  CounterProposalEditor.test.tsx   # Editor tests
```

**Services (EXTEND):**

```
apps/web/src/services/
  agreementProposalService.ts      # Add response notification functions
  agreementProposalService.test.ts # Add response tests
```

**Firestore Security Rules (EXTEND):**

```
packages/firebase-rules/firestore.rules  # Add response subcollection rules
```

### Data Model (Existing)

The `ProposalResponse` interface already exists in @fledgely/shared:

```typescript
// Already defined in contracts/index.ts
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

**Firestore Structure:**

```
families/{familyId}/
  agreementProposals/{proposalId}/
    ...proposal data

    responses/                      # Subcollection for responses
      {responseId}/
        responderId
        responderName
        action: 'accept' | 'decline' | 'counter'
        comment
        counterChanges
        createdAt
```

**Counter-Proposal Chain:**

When a counter-proposal is created:

1. Original proposal status → 'counter-proposed'
2. New proposal created with `parentProposalId` reference
3. Changes from counter become the new proposal
4. Chain can continue with multiple rounds

### UI/UX Requirements

**ProposalReviewScreen Layout:**

1. **Header**: Proposal title, proposer name, date
2. **Diff Section**: Reuse `AgreementDiffView` component
3. **Reason Section**: Display proposer's reason prominently
4. **Negotiation History**: Collapsible timeline (if previous rounds)
5. **Response Actions**: Accept, Decline, Counter buttons
6. **Comment Input**: Text area for response comments

**Response Flow:**

- **Accept**: Comment optional → Confirm dialog → Update proposal status
- **Decline**: Comment required → Confirm dialog → Update proposal status
- **Counter**: Opens CounterProposalEditor → Edit values → Add comment → Submit

**Child-Specific Adaptations:**

- Use child-friendly language from CHILD_PROPOSAL_MESSAGES
- Encouraging prompts when child responds
- Simpler counter-proposal UI for children
- Age-appropriate examples in comments

**Parent-Specific Adaptations:**

- Use standard AGREEMENT_PROPOSAL_MESSAGES
- More detailed diff view options
- Ability to see original agreement context

### Notification Pattern

When response is submitted:

```typescript
// Accept: Notify proposer
'[Responder] accepted your proposal! Changes are now active.'

// Decline: Notify proposer
'[Responder] declined your proposal.'

// Counter: Notify proposer
'[Responder] made a counter-proposal. Please review.'
```

### Security Considerations

**Firestore Rules for Responses:**

```javascript
// In agreementProposals/{proposalId}/responses subcollection
match /responses/{responseId} {
  // Read: Both parties can read responses
  allow read: if isProposalGuardian() || isChildInProposalFamily();

  // Create: Only the non-proposer can respond
  // Parent proposal → Child responds
  // Child proposal → Parent responds
  allow create: if
    (resource.data.proposedBy == 'parent' && isChildInProposalFamily()) ||
    (resource.data.proposedBy == 'child' && isProposalGuardian());
}
```

## Dependencies

- Story 34-1: Parent-Initiated Agreement Change (DONE - provides proposal infrastructure)
- Story 34-2: Child-Initiated Agreement Change (DONE - provides child components)
- Epic 5-6: Agreement Creation & Activation (provides base agreement infrastructure)

## Tasks / Subtasks

- [x] Task 1: Create useProposalResponse hook (AC: #2, #3, #4) - 18 tests
  - [x] 1.1 Create `useProposalResponse` hook with accept/decline/counter actions
  - [x] 1.2 Implement acceptProposal function (updates status to 'accepted')
  - [x] 1.3 Implement declineProposal function (updates status to 'declined')
  - [x] 1.4 Implement createCounterProposal function
  - [x] 1.5 Save response to responses subcollection
  - [x] 1.6 Add unit tests for hook

- [x] Task 2: Create useNegotiationHistory hook (AC: #5, #6) - 16 tests
  - [x] 2.1 Create `useNegotiationHistory` hook
  - [x] 2.2 Fetch proposal chain (original + counter-proposals)
  - [x] 2.3 Fetch all responses for the chain
  - [x] 2.4 Build timeline data structure
  - [x] 2.5 Add real-time subscription
  - [x] 2.6 Add unit tests for hook

- [x] Task 3: Create ProposalReviewScreen component (AC: #1) - 18 tests
  - [x] 3.1 Create `ProposalReviewScreen` component
  - [x] 3.2 Display proposal header (title, proposer, date)
  - [x] 3.3 Integrate AgreementDiffView for changes
  - [x] 3.4 Display proposer's reason prominently
  - [x] 3.5 Add component tests

- [x] Task 4: Create ProposalResponseForm component (AC: #2, #4) - 20 tests
  - [x] 4.1 Create `ProposalResponseForm` component
  - [x] 4.2 Implement Accept/Decline/Counter buttons
  - [x] 4.3 Add comment textarea with character limit
  - [x] 4.4 Add confirmation dialogs
  - [x] 4.5 Validate required comment for decline/counter
  - [x] 4.6 Add component tests

- [x] Task 5: Create CounterProposalEditor component (AC: #3) - 22 tests
  - [x] 5.1 Create `CounterProposalEditor` component
  - [x] 5.2 Pre-populate with proposed values
  - [x] 5.3 Allow editing of proposed values
  - [x] 5.4 Show original values for reference
  - [x] 5.5 Support add/remove sections
  - [x] 5.6 Add component tests

- [x] Task 6: Create NegotiationHistory component (AC: #5, #6) - 20 tests
  - [x] 6.1 Create `NegotiationHistory` component
  - [x] 6.2 Timeline view of all rounds
  - [x] 6.3 Show who responded and when
  - [x] 6.4 Display comments in context
  - [x] 6.5 Show round numbers (e.g., "Round 2")
  - [x] 6.6 Add component tests

- [x] Task 7: Extend notification service (AC: #2) - 22 tests (total)
  - [x] 7.1 Add notifyProposerOfResponse function
  - [x] 7.2 Create accept notification
  - [x] 7.3 Create decline notification
  - [x] 7.4 Create counter-proposal notification
  - [x] 7.5 Add service tests

- [x] Task 8: Update Firestore security rules (Security)
  - [x] 8.1 Add responses subcollection rules
  - [x] 8.2 Ensure only non-proposer can respond
  - [x] 8.3 Add read permissions for both parties

## Dev Notes

### Previous Story Intelligence (Story 34-1 and 34-2)

**Patterns Established:**

- Wizard-style multi-step flow works well for complex forms
- AgreementDiffView is generic and reusable
- useAgreementProposal hook provides createProposal/withdrawProposal
- usePendingProposals hook lists pending proposals
- AGREEMENT_PROPOSAL_MESSAGES and CHILD_PROPOSAL_MESSAGES for UI text
- Firestore security rules pattern for family-scoped data

**Code to Reuse:**

```typescript
// Reuse AgreementDiffView for displaying changes
import { AgreementDiffView } from '../shared/AgreementDiffView'

// Reuse existing messages
import { AGREEMENT_PROPOSAL_MESSAGES, CHILD_PROPOSAL_MESSAGES } from '@fledgely/shared'

// Reuse pending proposals hook for checking existing proposals
import { usePendingProposals } from '../../hooks/usePendingProposals'
```

**Git Recent Commits (Story 34-2):**

```
06ec84e7 feat(web,shared): implement child-initiated agreement changes (story 34-2)
0c65c802 feat(web,shared): implement parent-initiated agreement changes (story 34-1)
```

### Project Structure Notes

- Shared components go in `apps/web/src/components/shared/` since both parent and child use them
- Hooks for responses are new and should follow patterns from useAgreementProposal
- The ProposalResponse subcollection pattern follows Firestore best practices

### Testing Standards

- Unit tests for all hooks with mocked Firestore
- Component tests with React Testing Library
- Test accept/decline/counter flows
- Test negotiation history with multiple rounds
- Test notification creation
- Mock AGREEMENT_PROPOSAL_MESSAGES and CHILD_PROPOSAL_MESSAGES

### References

- [Source: docs/epics/epic-list.md#story-343-change-review-and-negotiation]
- [Source: apps/web/src/hooks/useAgreementProposal.ts] - Proposal hook pattern
- [Source: apps/web/src/components/shared/AgreementDiffView.tsx] - Diff view component
- [Source: apps/web/src/services/agreementProposalService.ts] - Notification pattern
- [Source: packages/shared/src/contracts/index.ts] - ProposalResponse schema

## Dev Agent Record

### Context Reference

Previous story (34-2) implementation commit: 06ec84e7

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

### File List

**New Files:**

- apps/web/src/hooks/useProposalResponse.ts - Hook for accept/decline/counter actions
- apps/web/src/hooks/useProposalResponse.test.ts - Hook tests (18 tests)
- apps/web/src/hooks/useNegotiationHistory.ts - Hook for negotiation timeline
- apps/web/src/hooks/useNegotiationHistory.test.ts - Hook tests (16 tests)
- apps/web/src/components/shared/ProposalReviewScreen.tsx - Main review screen
- apps/web/src/components/shared/ProposalReviewScreen.test.tsx - Component tests (18 tests)
- apps/web/src/components/shared/ProposalResponseForm.tsx - Response form component
- apps/web/src/components/shared/ProposalResponseForm.test.tsx - Component tests (21 tests)
- apps/web/src/components/shared/CounterProposalEditor.tsx - Counter-proposal editor
- apps/web/src/components/shared/CounterProposalEditor.test.tsx - Component tests (22 tests)
- apps/web/src/components/shared/NegotiationHistory.tsx - Timeline view component
- apps/web/src/components/shared/NegotiationHistory.test.tsx - Component tests (20 tests)

**Modified Files:**

- apps/web/src/services/agreementProposalService.ts - Added notifyProposerOfResponse, logProposalResponse
- apps/web/src/services/agreementProposalService.test.ts - Added response notification tests (22 tests total)
- packages/firebase-rules/firestore.rules - Added responses subcollection rules, responder status update rules
