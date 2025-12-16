# Story 3A.3: Agreement Changes Two-Parent Approval

Status: complete

## Story

As a **parent in shared custody**,
I want **family agreement changes to require both parents' approval**,
So that **agreements reflect joint parenting decisions**.

## Acceptance Criteria

1. **Given** a shared custody family with an active agreement **When** either parent proposes agreement changes **Then** changes enter pending state requiring other parent approval
2. **Given** a pending agreement change proposal **When** the proposal exists **Then** child cannot sign until both parents have approved
3. **Given** an agreement change proposal **When** it is created **Then** pending changes are visible to all family members
4. **Given** a pending agreement change proposal **When** the non-proposing parent reviews it **Then** other parent can approve, decline, or propose modifications
5. **Given** an agreement change proposal **When** the non-proposing parent proposes modifications **Then** modifications restart the approval process
6. **Given** a pending agreement change proposal **When** 14 days pass without approval **Then** changes expire
7. **Given** an approved agreement change **When** both parents have approved **Then** original agreement remains active until new version is signed by all parties (parents + child)

## Tasks / Subtasks

- [x] Task 1: Create agreement change proposal schema and types (AC: 1, 3, 4)
  - [x] 1.1: Create `agreement-change-proposal.schema.ts` in packages/contracts with proposal types
  - [x] 1.2: Define `AgreementChangeType` enum (terms, rules, schedule, permissions, etc.)
  - [x] 1.3: Add `AgreementChangeProposal` type with proposer, original values, proposed values, status
  - [x] 1.4: Add `AgreementChangeProposalStatus` enum (pending, approved, declined, expired, modified, awaiting_signatures)
  - [x] 1.5: Add `AgreementChangeProposalFirestore` type with Timestamp conversions
  - [x] 1.6: Define `AGREEMENT_PROPOSAL_TIME_LIMITS` constants (14-day expiry, 7-day re-proposal cooldown)
  - [x] 1.7: Export new types from contracts/index.ts
  - [x] 1.8: Write comprehensive schema tests following safety-settings-proposal.schema.test.ts pattern (target: 100+ tests)

- [x] Task 2: Implement agreement change proposal Cloud Functions (AC: 1, 4, 5, 6)
  - [x] 2.1: Create `proposeAgreementChange` Cloud Function to create proposals with diff tracking
  - [x] 2.2: Create `respondToAgreementProposal` Cloud Function for approve/decline/modify
  - [x] 2.3: Implement 14-day expiry logic with scheduled function
  - [x] 2.4: Implement modification flow that creates new proposal linked to original
  - [x] 2.5: Add App Check enforcement following proposeSafetySettingChange.ts pattern
  - [x] 2.6: Add rate limiting (max 10 proposals/hour per user)
  - [x] 2.7: Write unit tests for all functions (target: 30+ tests)

- [x] Task 3: Implement signature collection workflow (AC: 2, 7)
  - [x] 3.1: Create `signAgreementChange` Cloud Function for signature collection
  - [x] 3.2: Track parent signatures separately from child signature
  - [x] 3.3: Implement "original remains active" logic until all signatures collected
  - [x] 3.4: Auto-finalize agreement change when all signatures collected
  - [x] 3.5: Add signature deadline tracking (30 days from approval)
  - [x] 3.6: Write unit tests for signature workflow (target: 20+ tests)

- [x] Task 4: Add Firestore Security Rules for proposals subcollection (AC: 3)
  - [x] 4.1: Create `children/{childId}/agreementChangeProposals/{proposalId}` subcollection rules
  - [x] 4.2: Allow ALL guardians (not just full permissions) to read proposals (transparency)
  - [x] 4.3: Allow guardians to create proposals (validation via Cloud Function)
  - [x] 4.4: Restrict update to Cloud Functions only (status transitions)
  - [x] 4.5: Ensure immutable audit trail (no delete)

- [x] Task 5: Add Firestore indexes for efficient queries
  - [x] 5.1: Add compound index for status + createdAt queries
  - [x] 5.2: Add compound index for proposedBy + status queries
  - [x] 5.3: Add collection group index for expiry scheduled function

- [x] Task 6: Create proposal workflow utilities (AC: 4, 5, 6)
  - [x] 6.1: Create `formatAgreementDiff` function showing original vs proposed values
  - [x] 6.2: Create `canRespondToAgreementProposal` helper checking 14-day window
  - [x] 6.3: Create `canRepropose` helper checking 7-day cooldown after decline
  - [x] 6.4: Create `calculateProposalExpiry` helper (14 days from creation)
  - [x] 6.5: Create `isModification` helper to detect if proposal modifies another
  - [x] 6.6: Write unit tests for all utilities (target: 40+ tests)

- [x] Task 7: Add scheduled function for proposal expiry (AC: 6)
  - [x] 7.1: Create `expireStaleAgreementProposals` scheduled Cloud Function
  - [x] 7.2: Run every hour to check for 14-day expired proposals
  - [x] 7.3: Update expired proposals to 'expired' status
  - [x] 7.4: [DEFERRED] Notify both parents on expiry (depends on notification system)

## Dev Notes

### Architecture Patterns

**ADR-004: Agreement Versioning - Full History**
- Agreements use proposal workflow: `/children/{childId}/agreement/proposals/{proposalId}`
- This story creates the dual-approval layer on top of existing agreement system
- Original agreement remains active until new version fully signed
[Source: docs/archive/architecture.md#ADR-004]

**PR5: Adversarial Family Protections - Full Scope**
- Prevents one parent from unilaterally changing agreements
- Both parents must agree before child can sign
- Anti-weaponization: modifications restart approval (prevents gaming)
[Source: docs/archive/architecture.md#Architectural-Risk-Preventions]

**ADR-001: Child-Centric with Guardian Links**
- Agreement proposals stored under child document
- Proposal references both original agreement and proposed changes
- Guardian permissions determine who can propose vs sign
[Source: docs/archive/architecture.md#ADR-001]

**Story 3A.2 Patterns (Safety Settings Approval)**
- Follow same proposal schema structure
- Use same time limit constants pattern
- Same rate limiting approach (10/hour)
- Same Cloud Function patterns with App Check
[Source: packages/contracts/src/safety-settings-proposal.schema.ts]

### Existing Implementation Context

The codebase already has:
1. **Safety settings proposal pattern** (Story 3A.2) - reusable dual-approval workflow
2. **Data symmetry enforcement** (Story 3A.1) - both parents see identical data
3. **Dissolution acknowledgment pattern** (`dissolution.schema.ts`) - similar dual-consent
4. **Guardian-based access control** in firestore.rules with `isChildGuardian()` helper
5. **`requiresSharedCustodySafeguards`** field on custody for toggling dual-approval
6. **Rate limiting pattern** in `logDataView.ts` with count queries

### Key Differences from Story 3A.2

| Aspect | Story 3A.2 (Safety Settings) | Story 3A.3 (Agreement Changes) |
|--------|------------------------------|-------------------------------|
| Expiry Window | 72 hours | 14 days |
| Re-proposal Cooldown | 7 days | 7 days |
| Emergency Auto-Apply | Yes (more restrictive) | No (always requires approval) |
| Dispute Window | 48 hours | N/A |
| After Approval | Applied immediately | Requires all signatures |
| Modification Flow | Re-propose from scratch | Links to original proposal |

### Key Files to Create

**New files:**
- `packages/contracts/src/agreement-change-proposal.schema.ts` - Proposal types and validation
- `packages/contracts/src/agreement-change-proposal.schema.test.ts` - Comprehensive tests
- `apps/functions/src/callable/proposeAgreementChange.ts` - Create proposal function
- `apps/functions/src/callable/proposeAgreementChange.test.ts` - Function tests
- `apps/functions/src/callable/respondToAgreementProposal.ts` - Approve/decline/modify function
- `apps/functions/src/callable/respondToAgreementProposal.test.ts` - Function tests
- `apps/functions/src/callable/signApprovedAgreementChange.ts` - Signature collection
- `apps/functions/src/callable/signApprovedAgreementChange.test.ts` - Signature tests
- `apps/functions/src/scheduled/expireStaleAgreementProposals.ts` - Scheduled expiry function
- `apps/functions/src/scheduled/expireStaleAgreementProposals.test.ts` - Expiry tests

**Modified files:**
- `packages/contracts/src/index.ts` - Export new types
- `packages/firebase-rules/firestore.rules` - Add agreementChangeProposals subcollection rules
- `packages/firebase-rules/firestore.indexes.json` - Add compound indexes
- `apps/functions/src/index.ts` - Export new functions

### Agreement Change Types

The following agreement changes require dual-approval:
1. **terms** - General terms and conditions text changes
2. **monitoring_rules** - What monitoring occurs and when
3. **screen_time** - Screen time limits and schedules
4. **bedtime_schedule** - Bedtime/device lockout times
5. **app_restrictions** - Allowed/blocked app lists
6. **content_filters** - Age restrictions and content filtering
7. **consequences** - What happens on violations
8. **rewards** - Incentives for compliance

### Proposal Status Flow

```
proposed → pending → approved → awaiting_signatures → active
                  → declined → cooldown (7 days) → can re-propose
                  → modified → new proposal created → pending
                  → expired (14 days)

After approval:
awaiting_signatures → parent1_signed → parent2_signed → child_signed → active
```

### Signature Collection

After both parents approve:
1. Proposal status changes to `awaiting_signatures`
2. Each parent must sign the proposed changes
3. Child must sign last (cannot sign before both parents)
4. Original agreement remains active throughout
5. Once all signed, new agreement version activates
6. Old agreement moves to history

### Testing Standards

- All schemas must have comprehensive Zod validation tests (target: 100+ tests)
- Follow `safety-settings-proposal.schema.test.ts` pattern for test organization
- Cloud Functions require unit tests with mocked Firestore
- Test edge cases: concurrent proposals, rapid status changes, timing edge cases
- Rate limiting tests: verify max 10 proposals/hour limit
- Signature order tests: child cannot sign before both parents

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
- Follows existing patterns from Story 3A.2 for schema organization
- Uses same audit log pattern for approval workflows
- Proposals stored in child subcollection (not family) per ADR-001

### References

- [Source: docs/archive/prd.md#Vision] - "Consent-based design" and "equal access"
- [Source: docs/archive/architecture.md#ADR-001] - Child-centric data model
- [Source: docs/archive/architecture.md#ADR-004] - Agreement versioning pattern
- [Source: docs/archive/architecture.md#PR5] - Adversarial family protections
- [Source: docs/epics/epic-list.md#Story-3A.3] - Original acceptance criteria
- [Source: packages/contracts/src/safety-settings-proposal.schema.ts] - Story 3A.2 patterns
- [Source: packages/contracts/src/dissolution.schema.ts] - Dual-consent workflow pattern
- [Source: packages/contracts/src/data-symmetry.schema.ts] - Story 3A.1 patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

**Created Files:**
- `packages/contracts/src/agreement-change-proposal.schema.ts` - Schema types, validation, helper functions
- `packages/contracts/src/agreement-change-proposal.schema.test.ts` - 161 comprehensive schema tests
- `apps/functions/src/callable/proposeAgreementChange.ts` - Create proposal Cloud Function
- `apps/functions/src/callable/proposeAgreementChange.test.ts` - Proposal function tests
- `apps/functions/src/callable/respondToAgreementProposal.ts` - Approve/decline Cloud Function
- `apps/functions/src/callable/respondToAgreementProposal.test.ts` - Response function tests
- `apps/functions/src/callable/signAgreementChange.ts` - Signature collection Cloud Function
- `apps/functions/src/callable/signAgreementChange.test.ts` - Signature function tests
- `apps/functions/src/scheduled/expireStaleAgreementProposals.ts` - Scheduled expiry function
- `apps/functions/src/scheduled/expireStaleAgreementProposals.test.ts` - Expiry function tests

**Modified Files:**
- `packages/contracts/src/index.ts` - Export new types and functions
- `packages/firebase-rules/firestore.rules` - Added agreementChangeProposals subcollection rules
- `packages/firebase-rules/firestore.indexes.json` - Added compound indexes for efficient queries
- `apps/functions/src/index.ts` - Export new Cloud Functions

**Test Results:**
- Contracts: 995 tests passing (including 161 agreement-change-proposal tests)
- Functions: 610 tests passing
- Total: 1,605 tests passing

