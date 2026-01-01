# Story 34.4: Dual-Signature Change Activation

Status: done

Epic: 34 - Agreement Changes & Proposals
Priority: High

## Story

As **the system**,
I want **changes to require both signatures**,
So that **agreement changes are truly consensual**.

## Acceptance Criteria

1. **AC1: Proposer Confirmation After Acceptance**
   - Given proposal has been accepted by recipient
   - When recipient accepts proposal
   - Then proposer receives notification to confirm final acceptance
   - And proposer sees: "Your proposal was accepted! Confirm to activate changes"
   - And proposer can review the accepted changes
   - And proposer has "Confirm & Activate" and "Cancel" options

2. **AC2: Dual Digital Signatures**
   - Given both parties agree to changes
   - When proposer confirms
   - Then both digital signatures recorded
   - And proposer signature timestamp recorded
   - And recipient signature timestamp recorded
   - And signature chain stored for audit
   - And signatures cannot be altered after recording

3. **AC3: Agreement Version Update**
   - Given dual signatures confirmed
   - When activating changes
   - Then new agreement version created
   - And version number incremented (e.g., v2 -> v3)
   - And changes applied atomically
   - And previous version preserved for history
   - And active agreement pointer updated

4. **AC4: Immediate Activation**
   - Given agreement version updated
   - When changes become active
   - Then change effective immediately (NFR5 - 60-second sync)
   - And all devices sync new agreement
   - And real-time update via Firestore onSnapshot
   - And monitoring/limits reflect new values

5. **AC5: Both Parties Notification**
   - Given agreement activated
   - When both parties need notification
   - Then proposer notified: "Agreement updated successfully!"
   - And recipient notified: "Agreement updated! New rules are now active"
   - And in-app notifications created for both
   - And push notifications sent (if enabled)

6. **AC6: History Logging**
   - Given agreement updated
   - When logging change
   - Then change logged in agreement history
   - And history entry includes: old values, new values, reason
   - And history entry includes: both signatures with timestamps
   - And history entry includes: proposal ID reference
   - And history visible to both parties

## Technical Notes

### CRITICAL: Reuse Story 34-1, 34-2, 34-3 Infrastructure

Stories 34-1, 34-2, and 34-3 created extensive infrastructure that MUST be reused:

**Already Complete - DO NOT RECREATE:**

- `packages/shared/src/contracts/index.ts` - Contains:
  - `agreementProposalSchema` with status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'counter-proposed'
  - `proposalChangeSchema` for individual changes
  - `proposalResponseSchema` for accept/decline/counter responses
- `apps/web/src/hooks/useAgreementProposal.ts` - Create/manage proposals
- `apps/web/src/hooks/usePendingProposals.ts` - List pending proposals
- `apps/web/src/hooks/useProposalResponse.ts` - Accept/decline/counter actions
- `apps/web/src/hooks/useNegotiationHistory.ts` - Negotiation timeline
- `apps/web/src/components/shared/AgreementDiffView.tsx` - Reusable diff component
- `apps/web/src/components/shared/ProposalReviewScreen.tsx` - Review screen
- `apps/web/src/services/agreementProposalService.ts` - Notification services
- `packages/firebase-rules/firestore.rules` - Security rules for proposals/responses

**Components to Create for Story 34-4:**

- `apps/web/src/components/shared/ProposerConfirmationScreen.tsx` - Proposer's final confirmation UI
- `apps/web/src/components/shared/AgreementActivationSuccess.tsx` - Success celebration screen
- `apps/web/src/hooks/useAgreementActivation.ts` - Handle dual-signature and activation

**Service Extensions Needed:**

- `apps/web/src/services/agreementActivationService.ts` - Agreement version update and activation

### Key Files to Create/Modify

**Web App - Hooks (NEW):**

```
apps/web/src/hooks/
  useAgreementActivation.ts          # Dual-signature confirmation and activation
  useAgreementActivation.test.ts     # Hook tests
```

**Web App - Components (NEW):**

```
apps/web/src/components/shared/
  ProposerConfirmationScreen.tsx     # Proposer's confirmation UI
  ProposerConfirmationScreen.test.tsx # Component tests
  AgreementActivationSuccess.tsx     # Success/celebration screen
  AgreementActivationSuccess.test.tsx # Component tests
```

**Services (NEW):**

```
apps/web/src/services/
  agreementActivationService.ts      # Agreement version creation and activation
  agreementActivationService.test.ts # Service tests
```

**Firestore Security Rules (EXTEND):**

```
packages/firebase-rules/firestore.rules  # Add agreement version creation rules
```

### Data Model Extensions

**Agreement Version History (extends existing agreement model):**

```typescript
// Agreement version for history tracking
interface AgreementVersion {
  id: string
  agreementId: string
  familyId: string
  childId: string
  versionNumber: number

  // Content at this version
  content: AgreementContent

  // Change tracking
  changedFromVersion: number | null
  proposalId: string | null // Link to proposal that created this version

  // Dual signatures
  signatures: {
    proposer: SignatureRecord
    recipient: SignatureRecord
  }

  // Timestamps
  createdAt: number
  activatedAt: number
}

interface SignatureRecord {
  userId: string
  userName: string
  role: 'parent' | 'child'
  signedAt: number
  action: 'proposed' | 'accepted' | 'confirmed'
}
```

**Extended Proposal Status:**

```typescript
// Add 'awaiting-confirmation' status between 'accepted' and final activation
type ProposalStatus =
  | 'pending'
  | 'accepted' // Recipient accepted, awaiting proposer confirmation
  | 'activated' // Both confirmed, changes applied
  | 'declined'
  | 'withdrawn'
  | 'counter-proposed'
```

**Firestore Structure:**

```
families/{familyId}/
  agreements/{agreementId}/
    ...current agreement data
    currentVersion: number

    versions/{versionId}/         # NEW: Version history subcollection
      versionNumber
      content
      proposalId
      signatures
      createdAt
      activatedAt

  agreementProposals/{proposalId}/
    ...existing proposal data
    status: 'pending' | 'accepted' | 'activated' | ...

    responses/{responseId}/
      ...existing response data
```

### Activation Flow

1. **Recipient Accepts (Story 34-3):**
   - Proposal status → 'accepted'
   - Notification sent to proposer
   - Response saved with 'accept' action

2. **Proposer Confirms (Story 34-4 - THIS STORY):**
   - Proposer reviews accepted proposal
   - Proposer clicks "Confirm & Activate"
   - Proposer signature recorded
   - Proposal status → 'activated'
   - New agreement version created
   - Agreement updated atomically
   - Both parties notified

3. **Agreement Updated:**
   - Active agreement content updated
   - Version number incremented
   - History entry created with dual signatures
   - All devices sync via onSnapshot

### UI/UX Requirements

**ProposerConfirmationScreen Layout:**

1. **Header**: "Your proposal was accepted!"
2. **Recipient Info**: "[Child] accepted your proposed changes"
3. **Changes Summary**: Reuse `AgreementDiffView` component
4. **Recipient Comment**: Display if provided
5. **Action Buttons**: "Confirm & Activate" (primary), "Cancel" (secondary)
6. **Confirmation Dialog**: "Activate these changes? This will update the agreement immediately."

**AgreementActivationSuccess Layout:**

1. **Celebration**: Success animation/icon
2. **Message**: "Agreement Updated!"
3. **Summary**: Brief list of what changed
4. **Both Signatures**: Show both party names and timestamps
5. **Action**: "View Updated Agreement" button

### Notification Patterns

```typescript
// Proposer notification after recipient accepts
'[Child] accepted your proposal! Confirm to activate changes.'

// Proposer notification after activation
'Agreement updated successfully! New rules are now active.'

// Recipient notification after activation
'Agreement updated! [Change summary] is now active.'
```

### Security Considerations

**Firestore Rules for Agreement Versions:**

```javascript
// In agreements/{agreementId}/versions subcollection
match /versions/{versionId} {
  // Read: Both parties can read versions
  allow read: if isAgreementGuardian() || isAgreementChild();

  // Create: Only system can create versions (through proposal activation)
  // This should be triggered by updateDoc on proposal status
  allow create: if isAgreementGuardian() || isAgreementChild();

  // Update/Delete: Never - versions are immutable for audit
  allow update, delete: if false;
}
```

**Proposal Activation Rules:**

```javascript
// Only proposer can activate their accepted proposal
allow update: if
  resource.data.proposerId == request.auth.uid &&
  resource.data.status == 'accepted' &&
  request.resource.data.status == 'activated' &&
  // Preserve immutable fields
  request.resource.data.familyId == resource.data.familyId &&
  request.resource.data.proposedBy == resource.data.proposedBy;
```

## Dependencies

- Story 34-1: Parent-Initiated Agreement Change (DONE - provides proposal infrastructure)
- Story 34-2: Child-Initiated Agreement Change (DONE - provides child components)
- Story 34-3: Change Review and Negotiation (DONE - provides accept/decline/counter flow)
- Epic 5-6: Agreement Creation & Activation (provides base agreement infrastructure)

## Tasks / Subtasks

- [x] Task 1: Extend proposal status and schemas (AC: #1, #2) - 17 tests ✓
  - [x] 1.1 Add 'activated' status to proposal schema in contracts/index.ts
  - [x] 1.2 Add SignatureRecord interface (signatureRecordSchema, signatureRoleSchema, signatureActionSchema)
  - [x] 1.3 Add ActivatedAgreementVersion schema (activatedAgreementVersionSchema, dualSignaturesSchema)
  - [x] 1.4 Add schema validation tests (agreementActivation.test.ts)

- [x] Task 2: Create useAgreementActivation hook (AC: #1, #2, #3, #4) - 20 tests ✓
  - [x] 2.1 Create `useAgreementActivation` hook
  - [x] 2.2 Implement confirmActivation function (records proposer signature)
  - [x] 2.3 Implement createAgreementVersion function (with dual signatures)
  - [x] 2.4 Update active agreement with new values (atomic transaction)
  - [x] 2.5 Update proposal status to 'activated'
  - [x] 2.6 Add unit tests for hook (useAgreementActivation.test.ts)

- [x] Task 3: Create agreementActivationService (AC: #3, #5, #6) - 24 tests ✓
  - [x] 3.1 Create `agreementActivationService.ts`
  - [x] 3.2 Implement notifyBothPartiesOfActivation function
  - [x] 3.3 Implement logAgreementActivation function (for history)
  - [x] 3.4 Implement createVersionHistoryEntry function
  - [x] 3.5 Add service tests (agreementActivationService.test.ts)

- [x] Task 4: Create ProposerConfirmationScreen component (AC: #1, #2) - 17 tests ✓
  - [x] 4.1 Create `ProposerConfirmationScreen` component
  - [x] 4.2 Display acceptance info and recipient comment
  - [x] 4.3 Integrate AgreementDiffView for changes
  - [x] 4.4 Add "Confirm & Activate" button with confirmation dialog
  - [x] 4.5 Add component tests (ProposerConfirmationScreen.test.tsx)

- [x] Task 5: Create AgreementActivationSuccess component (AC: #5) - 13 tests ✓
  - [x] 5.1 Create `AgreementActivationSuccess` component
  - [x] 5.2 Display celebration UI
  - [x] 5.3 Show both signatures with timestamps
  - [x] 5.4 Show change summary
  - [x] 5.5 Add component tests (AgreementActivationSuccess.test.tsx)

- [x] Task 6: Update Firestore security rules (Security) ✓
  - [x] 6.1 Add versions subcollection rules (read: both, create: guardian, no update/delete)
  - [x] 6.2 Add proposal activation rules (only proposer can activate accepted proposal)
  - [x] 6.3 Ensure versions are immutable after creation (update: false, delete: false)

- [x] Task 7: Integration testing (AC: #4) ✓
  - [x] 7.1 Test end-to-end activation flow (covered by hook tests with mocked transaction)
  - [x] 7.2 Test real-time sync of updated agreement (covered by hook/service tests)
  - [x] 7.3 Test notification delivery (covered by service tests)

## Dev Notes

### Previous Story Intelligence (Stories 34-1, 34-2, 34-3)

**Patterns Established:**

- Wizard-style multi-step flow works well for complex forms
- AgreementDiffView is generic and reusable
- useAgreementProposal hook provides createProposal/withdrawProposal
- useProposalResponse hook provides accept/decline/counter actions
- usePendingProposals hook lists pending proposals
- useNegotiationHistory hook provides timeline data
- AGREEMENT_PROPOSAL_MESSAGES and CHILD_PROPOSAL_MESSAGES for UI text
- Firestore security rules pattern for family-scoped data
- Notification patterns via agreementProposalService

**Code to Reuse:**

```typescript
// Reuse AgreementDiffView for displaying changes
import { AgreementDiffView } from '../shared/AgreementDiffView'

// Reuse existing hooks
import { useProposalResponse } from '../../hooks/useProposalResponse'
import { useNegotiationHistory } from '../../hooks/useNegotiationHistory'

// Reuse notification patterns
import { notifyProposerOfResponse } from '../../services/agreementProposalService'
```

**Git Recent Commits:**

```
ac6636ca feat(web): implement change review and negotiation (story 34-3)
06ec84e7 feat(web,shared): implement child-initiated agreement changes (story 34-2)
0c65c802 feat(web,shared): implement parent-initiated agreement changes (story 34-1)
```

### Project Structure Notes

- Shared components go in `apps/web/src/components/shared/` since both parent and child use them
- Hooks follow patterns from useProposalResponse
- The AgreementVersion subcollection pattern follows Firestore best practices
- Services handle notification and activity logging

### Testing Standards

- Unit tests for all hooks with mocked Firestore
- Component tests with React Testing Library
- Test activation flow with dual signatures
- Test agreement version creation
- Test notification creation for both parties
- Test security rules for version immutability

### References

- [Source: docs/epics/epic-list.md#story-344-dual-signature-change-activation]
- [Source: apps/web/src/hooks/useProposalResponse.ts] - Response hook pattern
- [Source: apps/web/src/hooks/useAgreementProposal.ts] - Proposal hook pattern
- [Source: apps/web/src/components/shared/AgreementDiffView.tsx] - Diff view component
- [Source: apps/web/src/services/agreementProposalService.ts] - Notification pattern
- [Source: packages/shared/src/contracts/index.ts] - Proposal schemas

## Dev Agent Record

### Context Reference

Previous story (34-3) implementation commit: ac6636ca

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- All 91 tests pass (17 shared + 74 web)
- Dual-signature workflow implemented with atomic transactions
- Agreement versions stored in immutable subcollection
- Security rules enforce proposer-only activation
- Code review fix: Added proposerRole parameter to support child-initiated proposals (Story 34-2)

### File List

**Shared Package:**

- packages/shared/src/contracts/index.ts (modified - added activated status, signature/version schemas)
- packages/shared/src/contracts/agreementActivation.test.ts (new - 17 tests)

**Web App - Hooks:**

- apps/web/src/hooks/useAgreementActivation.ts (new)
- apps/web/src/hooks/useAgreementActivation.test.ts (new - 20 tests)

**Web App - Services:**

- apps/web/src/services/agreementActivationService.ts (new)
- apps/web/src/services/agreementActivationService.test.ts (new - 24 tests)

**Web App - Components:**

- apps/web/src/components/shared/ProposerConfirmationScreen.tsx (new)
- apps/web/src/components/shared/ProposerConfirmationScreen.test.tsx (new - 17 tests)
- apps/web/src/components/shared/AgreementActivationSuccess.tsx (new)
- apps/web/src/components/shared/AgreementActivationSuccess.test.tsx (new - 13 tests)

**Firestore Rules:**

- packages/firebase-rules/firestore.rules (modified - added versions subcollection, activation rules)
