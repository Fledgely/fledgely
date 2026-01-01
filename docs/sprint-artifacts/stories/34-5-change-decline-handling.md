# Story 34.5: Change Decline Handling

Status: done

Epic: 34 - Agreement Changes & Proposals
Priority: High

## Story

As **a parent or child**,
I want **to decline proposals respectfully**,
So that **we can disagree without conflict**.

## Acceptance Criteria

1. **AC1: Decline Reason Required**
   - Given proposal received
   - When declining
   - Then decline reason required: "Not ready for this change yet"
   - And predefined respectful reasons available
   - And custom reason input allowed
   - And reason must be at least 10 characters if custom

2. **AC2: Respectful Language**
   - Given user is declining
   - When viewing decline UI
   - Then language is respectful, not punitive
   - And positive framing used: "Not ready yet" vs "Rejected"
   - And suggestions for future dialogue shown
   - And encouraging tone maintained

3. **AC3: Decline Notification**
   - Given proposal is declined
   - When notifying proposer
   - Then decline notification sent to proposer
   - And notification includes decline reason
   - And notification language is supportive
   - And notification suggests: "You can propose again later"

4. **AC4: 7-Day Cooldown for Same Change**
   - Given proposal was declined
   - When proposer tries to submit same change
   - Then 7-day cooldown enforced for same change
   - And "same change" means identical section + field
   - And cooldown displayed to proposer
   - And different changes allowed immediately

5. **AC5: Proposer Can Try Again**
   - Given proposal was declined
   - When proposer views declined proposal
   - Then "Try Again Later" message shown
   - And proposer informed about 7-day cooldown
   - And option to modify proposal and resubmit
   - And no limit on total proposals (just cooldown for same)

6. **AC6: Declined Doesn't Mean Forever**
   - Given decline has occurred
   - When both parties view status
   - Then messaging emphasizes: "This opens conversation"
   - And suggestions for alternative approaches
   - And family communication resources linked
   - And positive framing: "Not now" vs "Never"

## Technical Notes

### CRITICAL: Reuse Stories 34-1, 34-2, 34-3, 34-4 Infrastructure

The decline flow already exists from Story 34-3. This story EXTENDS it with:

**Already Complete - DO NOT RECREATE:**

- `packages/shared/src/contracts/index.ts` - Contains:
  - `agreementProposalSchema` with status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'counter-proposed' | 'activated'
  - `proposalChangeSchema` for individual changes
  - `proposalResponseSchema` for accept/decline/counter responses
- `apps/web/src/hooks/useProposalResponse.ts` - Has declineProposal function
- `apps/web/src/components/shared/ProposalResponseForm.tsx` - Has decline UI
- `apps/web/src/services/agreementProposalService.ts` - Has notification services
- `packages/firebase-rules/firestore.rules` - Security rules for proposals

**Components to Create for Story 34-5:**

- `apps/web/src/components/shared/DeclineReasonSelector.tsx` - Respectful decline reasons
- `apps/web/src/components/shared/DeclinedProposalView.tsx` - View after decline
- `apps/web/src/components/shared/CooldownNotice.tsx` - 7-day cooldown display
- `apps/web/src/hooks/useProposalCooldown.ts` - Cooldown checking logic
- `apps/web/src/services/declineHandlingService.ts` - Decline messaging and cooldown service

### Key Files to Create/Modify

**Web App - Hooks (NEW):**

```
apps/web/src/hooks/
  useProposalCooldown.ts           # Check 7-day cooldown for same changes
  useProposalCooldown.test.ts      # Hook tests
```

**Web App - Components (NEW):**

```
apps/web/src/components/shared/
  DeclineReasonSelector.tsx        # Predefined respectful decline reasons
  DeclineReasonSelector.test.tsx   # Component tests
  DeclinedProposalView.tsx         # View after decline with "try again" messaging
  DeclinedProposalView.test.tsx    # Component tests
  CooldownNotice.tsx               # 7-day cooldown display
  CooldownNotice.test.tsx          # Component tests
```

**Services (NEW):**

```
apps/web/src/services/
  declineHandlingService.ts        # Decline messaging and cooldown logic
  declineHandlingService.test.ts   # Service tests
```

**Shared Package (EXTEND):**

```
packages/shared/src/contracts/index.ts  # Add DECLINE_REASONS constant
```

### Data Model Extensions

**Cooldown Tracking:**

The cooldown is derived from existing data - no new schema needed:

- Check `agreementProposals` collection for declined proposals
- Filter by: same familyId, same childId, same sectionId+fieldPath, status='declined', declinedAt within 7 days

**Decline Reason Enhancement:**

```typescript
// Add to shared/contracts
export const DECLINE_REASONS = [
  { id: 'not-ready', label: "I'm not ready for this change yet" },
  { id: 'need-discussion', label: "Let's discuss this together first" },
  { id: 'too-soon', label: "It's too soon since our last change" },
  { id: 'need-more-info', label: 'I need more information' },
  { id: 'prefer-different', label: "I'd prefer a different approach" },
  { id: 'custom', label: 'Other reason...' },
] as const

export type DeclineReasonId = (typeof DECLINE_REASONS)[number]['id']
```

### UI/UX Requirements

**DeclineReasonSelector Layout:**

1. **Header**: "Why are you declining?" (supportive tone)
2. **Predefined Reasons**: Radio buttons with respectful options
3. **Custom Input**: Text area for "Other reason..."
4. **Character Count**: Minimum 10 chars for custom
5. **Encouragement**: "A thoughtful response helps continue the conversation"

**DeclinedProposalView Layout:**

1. **Status Badge**: "Proposal Declined" (neutral, not red)
2. **Reason Display**: Show the decline reason
3. **Messaging**: "This isn't the end of the conversation"
4. **Next Steps**:
   - "Wait 7 days before proposing the same change"
   - "Consider discussing in person"
   - "Try a different approach"
5. **Action**: "Modify and Propose Again" button (respects cooldown)

**CooldownNotice Layout:**

1. **Icon**: Clock or calendar icon
2. **Message**: "Similar proposal declined X days ago"
3. **Countdown**: "You can propose again in Y days"
4. **Alternative**: "You can propose different changes now"

### Notification Patterns

```typescript
// Decline notification to proposer (AC3)
DECLINE_NOTIFICATION = {
  title: 'Proposal Response',
  body: "[Responder] isn't ready for this change yet.",
  supportive: 'You can discuss this together or propose something different.',
}

// Respectful decline reasons (AC1, AC2)
DECLINE_MESSAGES = {
  header: 'Why are you declining?',
  subheader: 'A thoughtful response helps continue the conversation',
  predefined: [
    "I'm not ready for this change yet",
    "Let's discuss this together first",
    // ... etc
  ],
  customPrompt: 'Share your thoughts (optional):',
}

// After decline messaging (AC5, AC6)
AFTER_DECLINE_MESSAGES = {
  proposer: {
    title: 'Proposal Declined',
    body: "This isn't the end of the conversation.",
    suggestions: [
      'Wait a few days and try a modified proposal',
      'Discuss in person to understand concerns',
      'Consider a smaller step toward your goal',
    ],
  },
  responder: {
    title: 'You Declined the Proposal',
    body: 'Thank you for your thoughtful response.',
    next: 'Consider discussing this with [Proposer] to find common ground.',
  },
}
```

### Cooldown Logic (AC4)

```typescript
interface CooldownCheck {
  isOnCooldown: boolean
  daysRemaining: number
  cooldownEndDate: Date | null
  declinedProposalId: string | null
}

/**
 * Check if a similar proposal was declined within 7 days.
 * "Similar" = same sectionId AND same fieldPath
 */
async function checkProposalCooldown(
  familyId: string,
  childId: string,
  sectionId: string,
  fieldPath: string
): Promise<CooldownCheck> {
  // Query declined proposals for this family/child
  // Filter: sectionId matches, fieldPath matches
  // Check: declined within last 7 days
  // Return cooldown status
}
```

### Security Considerations

No new security rules needed - existing proposal rules handle decline status updates.

Cooldown is advisory (client-side enforcement) for MVP - server-side validation can be added via Cloud Functions later if abuse is detected.

## Dependencies

- Story 34-1: Parent-Initiated Agreement Change (DONE - provides proposal infrastructure)
- Story 34-2: Child-Initiated Agreement Change (DONE - provides child components)
- Story 34-3: Change Review and Negotiation (DONE - provides decline function)
- Story 34-4: Dual-Signature Change Activation (DONE - provides activation flow)

## Tasks / Subtasks

- [ ] Task 1: Add decline reason constants (AC: #1, #2)
  - [ ] 1.1 Add DECLINE_REASONS constant to shared/contracts/index.ts
  - [ ] 1.2 Add DeclineReasonId type
  - [ ] 1.3 Add DECLINE_MESSAGES for UI text
  - [ ] 1.4 Add AFTER_DECLINE_MESSAGES for post-decline UI
  - [ ] 1.5 Add tests for new constants

- [ ] Task 2: Create useProposalCooldown hook (AC: #4)
  - [ ] 2.1 Create `useProposalCooldown` hook
  - [ ] 2.2 Query declined proposals for cooldown check
  - [ ] 2.3 Calculate days remaining in cooldown
  - [ ] 2.4 Return cooldown status
  - [ ] 2.5 Add unit tests for hook

- [ ] Task 3: Create declineHandlingService (AC: #3, #5)
  - [ ] 3.1 Create `declineHandlingService.ts`
  - [ ] 3.2 Add sendDeclineNotification function with supportive language
  - [ ] 3.3 Add getSuggestionsAfterDecline function
  - [ ] 3.4 Add formatCooldownMessage function
  - [ ] 3.5 Add service tests

- [ ] Task 4: Create DeclineReasonSelector component (AC: #1, #2)
  - [ ] 4.1 Create `DeclineReasonSelector` component
  - [ ] 4.2 Display predefined respectful reasons
  - [ ] 4.3 Add custom reason input with validation
  - [ ] 4.4 Ensure positive framing throughout
  - [ ] 4.5 Add component tests

- [ ] Task 5: Create DeclinedProposalView component (AC: #5, #6)
  - [ ] 5.1 Create `DeclinedProposalView` component
  - [ ] 5.2 Display decline reason
  - [ ] 5.3 Show "try again" messaging
  - [ ] 5.4 Display suggestions for next steps
  - [ ] 5.5 Add "Modify and Propose Again" button
  - [ ] 5.6 Add component tests

- [ ] Task 6: Create CooldownNotice component (AC: #4)
  - [ ] 6.1 Create `CooldownNotice` component
  - [ ] 6.2 Display cooldown countdown
  - [ ] 6.3 Show when cooldown expires
  - [ ] 6.4 Suggest alternative actions
  - [ ] 6.5 Add component tests

- [ ] Task 7: Integration and notifications (AC: #3)
  - [ ] 7.1 Update decline notification to use supportive language
  - [ ] 7.2 Integrate DeclineReasonSelector into ProposalResponseForm
  - [ ] 7.3 Add cooldown check to proposal creation flow
  - [ ] 7.4 Add integration tests

## Dev Notes

### Previous Story Intelligence (Stories 34-1, 34-2, 34-3, 34-4)

**Patterns Established:**

- Wizard-style multi-step flow works well for complex forms
- AgreementDiffView is generic and reusable
- useProposalResponse hook provides accept/decline/counter
- AGREEMENT_PROPOSAL_MESSAGES and CHILD_PROPOSAL_MESSAGES for UI text
- Firestore security rules pattern for family-scoped data
- Notification patterns via agreementProposalService

**Code to Reuse:**

```typescript
// Extend existing response flow
import { useProposalResponse } from '../../hooks/useProposalResponse'

// Reuse existing messages patterns
import { AGREEMENT_PROPOSAL_MESSAGES, CHILD_PROPOSAL_MESSAGES } from '@fledgely/shared'

// Reuse notification patterns
import { notifyProposerOfResponse } from '../../services/agreementProposalService'
```

**Git Recent Commits:**

```
55bbfcc3 feat(web,shared): implement dual-signature change activation (story 34-4)
ac6636ca feat(web): implement change review and negotiation (story 34-3)
06ec84e7 feat(web,shared): implement child-initiated agreement changes (story 34-2)
0c65c802 feat(web,shared): implement parent-initiated agreement changes (story 34-1)
```

### Project Structure Notes

- Shared components go in `apps/web/src/components/shared/`
- Hooks follow patterns from useProposalResponse
- Constants go in shared package for cross-app usage
- Services handle notification and business logic

### Testing Standards

- Unit tests for all hooks with mocked Firestore
- Component tests with React Testing Library
- Test cooldown calculation edge cases (7 days exactly, 6.5 days, etc.)
- Test respectful messaging appears correctly
- Test notification content
- Mock DECLINE_REASONS and messages

### References

- [Source: docs/epics/epic-list.md#story-345-change-decline-handling]
- [Source: apps/web/src/hooks/useProposalResponse.ts] - Decline hook pattern
- [Source: apps/web/src/components/shared/ProposalResponseForm.tsx] - Response form
- [Source: apps/web/src/services/agreementProposalService.ts] - Notification pattern
- [Source: packages/shared/src/contracts/index.ts] - Proposal schemas

## Dev Agent Record

### Context Reference

Previous story (34-4) implementation commit: 55bbfcc3

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

### File List
