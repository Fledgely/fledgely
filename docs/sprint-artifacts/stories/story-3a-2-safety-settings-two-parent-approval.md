# Story 3A.2: Safety Settings Two-Parent Approval

Status: in-progress

## Story

As a **parent in shared custody**,
I want **safety-related setting changes to require both parents' approval**,
So that **one parent cannot unilaterally weaken protections**.

## Acceptance Criteria

1. **Given** a shared custody family with two parent guardians **When** either parent attempts to change safety-related settings (monitoring intervals, retention periods, age restrictions) **Then** the change is proposed, not immediately applied
2. **Given** a safety setting change is proposed **When** the proposal is created **Then** other parent receives notification of proposed change
3. **Given** a safety setting proposal exists **When** the non-proposing parent views the proposal **Then** proposed change shows what will change and current vs proposed values
4. **Given** a safety setting proposal is pending **When** other parent reviews the proposal **Then** other parent must approve within 72 hours or change expires
5. **Given** a safety setting proposal **When** the other parent declines **Then** proposing parent receives decline notification with optional message
6. **Given** a declined safety setting proposal **When** the proposing parent wants to retry **Then** declined changes can be re-proposed after 7 days
7. **Given** a shared custody family **When** a parent proposes an emergency safety increase (more restrictive) **Then** it takes effect immediately, subject to 48-hour review by other parent

## Tasks / Subtasks

- [x] Task 1: Create safety settings proposal schema and types (AC: 1, 3)
  - [x] 1.1: Create `safetySettingsProposal.schema.ts` in packages/contracts with proposal types
  - [x] 1.2: Define `SafetySettingType` enum (monitoring_interval, retention_period, age_restriction, etc.)
  - [x] 1.3: Add `SafetySettingsProposal` type with proposer, current values, proposed values, status
  - [x] 1.4: Add `ProposalStatus` enum (pending, approved, declined, expired, auto_applied)
  - [x] 1.5: Add `SafetySettingsProposalFirestore` type with Timestamp conversions
  - [x] 1.6: Export new types from contracts/index.ts
  - [x] 1.7: Write comprehensive schema tests following data-symmetry.schema.test.ts pattern (121 tests)

- [x] Task 2: Implement safety settings proposal Cloud Functions (AC: 1, 4, 5, 6, 7)
  - [x] 2.1: Create `proposeSafetySettingChange` Cloud Function to create proposals
  - [x] 2.2: Create `respondToSafetyProposal` Cloud Function for approve/decline
  - [x] 2.3: Implement 72-hour expiry logic with scheduled function
  - [x] 2.4: Implement 7-day re-proposal cooldown check
  - [x] 2.5: Implement emergency safety increase auto-apply with 48-hour review flag
  - [x] 2.6: Add rate limiting following logDataView.ts pattern (max 10 proposals/hour)
  - [x] 2.7: Write unit tests for all functions (44 tests)

- [x] Task 3: Add Firestore Security Rules for proposals subcollection (AC: 1, 3)
  - [x] 3.1: Create `children/{childId}/safetySettingsProposals/{proposalId}` subcollection rules
  - [x] 3.2: Allow guardians to read proposals for their children
  - [x] 3.3: Allow guardians to create proposals (validation via Cloud Function)
  - [x] 3.4: Restrict update to Cloud Functions only (status transitions)
  - [x] 3.5: Ensure immutable audit trail (no delete)

- [ ] Task 4: Implement notification integration (AC: 2, 5) [DEFERRED - depends on notification system]
  - [ ] 4.1: Add Firestore trigger on proposal creation to notify non-proposing parent
  - [ ] 4.2: Add notification on proposal approval/decline
  - [ ] 4.3: Add notification on proposal expiry
  - [ ] 4.4: Store notification in user's notifications subcollection

- [x] Task 5: Create proposal review utilities (AC: 3, 4, 6)
  - [x] 5.1: Create `formatProposalDiff` function showing current vs proposed values
  - [x] 5.2: Create `canRespondToProposal` helper checking 72-hour window
  - [x] 5.3: Create `canRepropose` helper checking 7-day cooldown
  - [x] 5.4: Create `isEmergencySafetyIncrease` helper for auto-apply detection
  - [x] 5.5: Write unit tests for all utilities (included in 121 schema tests)

- [x] Task 6: Add scheduled function for proposal expiry (AC: 4)
  - [x] 6.1: Create `expireStaleProposals` scheduled Cloud Function
  - [x] 6.2: Run every hour to check for 72-hour expired proposals
  - [x] 6.3: Update expired proposals to 'expired' status
  - [ ] 6.4: Notify both parents on expiry [DEFERRED - depends on Task 4]

- [x] Task 7: Handle emergency safety increases (AC: 7)
  - [x] 7.1: Define which safety changes are "more restrictive" (shorter intervals, longer retention)
  - [x] 7.2: Implement auto-apply flag for emergency increases
  - [x] 7.3: Create 48-hour review workflow for auto-applied changes (disputeSafetyProposal)
  - [x] 7.4: If disputed within 48 hours, revert to original settings pending full approval

## Dev Notes

### Architecture Patterns

**ADR-004: Agreement Versioning - Full History**
- Proposals pattern established for agreements: `/children/{childId}/agreement/proposals/{proposalId}`
- Safety settings proposals should follow same pattern
[Source: docs/archive/architecture.md#ADR-004]

**PR5: Adversarial Family Protections - Full Scope**
- Safety rule 48-hour cooling period mentioned for Epic 3A
- Anti-weaponization: no unilateral weakening of protections
[Source: docs/archive/architecture.md#Architectural-Risk-Preventions]

**ADR-001: Child-Centric with Guardian Links**
- Children are root entity with their own guardians
- Safety settings are per-child, not per-family
- Proposals stored under child document
[Source: docs/archive/architecture.md#ADR-001]

**S5: Adversarial Protections - Full Scope**
- All adversarial family protections in scope
- Custody immutability, separation flow, cooling periods
- Core to product mission
[Source: docs/archive/architecture.md#S5]

### Existing Implementation Context

The codebase already has:
1. **Data symmetry enforcement** (Story 3A.1) - patterns for dual-guardian approval
2. **Dissolution acknowledgment pattern** (`packages/contracts/src/dissolution.schema.ts`) - similar dual-consent workflow
3. **Guardian-based access control** in firestore.rules with `isChildGuardian()` helper
4. **`requiresSharedCustodySafeguards`** field on child profiles for toggling dual-approval
5. **Rate limiting pattern** in `logDataView.ts` with count queries
6. **Notification subcollections** in families collection

### Key Files to Create

**New files:**
- `packages/contracts/src/safety-settings-proposal.schema.ts` - Proposal types and validation
- `packages/contracts/src/safety-settings-proposal.schema.test.ts` - Comprehensive tests
- `apps/functions/src/callable/proposeSafetySettingChange.ts` - Create proposal function
- `apps/functions/src/callable/proposeSafetySettingChange.test.ts` - Function tests
- `apps/functions/src/callable/respondToSafetyProposal.ts` - Approve/decline function
- `apps/functions/src/callable/respondToSafetyProposal.test.ts` - Function tests
- `apps/functions/src/scheduled/expireStaleProposals.ts` - Scheduled expiry function

**Modified files:**
- `packages/contracts/src/index.ts` - Export new types
- `packages/firebase-rules/firestore.rules` - Add safetySettingsProposals subcollection rules
- `apps/functions/src/index.ts` - Export new functions

### Safety Setting Types

The following settings require dual-approval when changed in shared custody families:
1. **Monitoring interval** - How often screenshots are captured
2. **Retention period** - How long screenshots are kept
3. **Age restrictions** - Content filtering based on age category
4. **Screen time limits** - Daily/per-app time limits
5. **Bedtime enforcement** - Device lockout schedules
6. **Crisis allowlist additions** - Adding to protected sites list (emergency only)

### Emergency Safety Increase Logic

A change is considered an "emergency safety increase" (more restrictive) when:
- Monitoring interval is **decreased** (more frequent)
- Retention period is **increased** (kept longer)
- Age restriction is **raised** (more filtering)
- Screen time limit is **decreased** (less time allowed)

These take effect immediately but can be disputed within 48 hours.

### Proposal Status Flow

```
proposed → pending → approved → applied
                  → declined → cooldown (7 days) → can re-propose
                  → expired (72 hours)

(emergency) proposed → auto_applied → 48h_review → confirmed
                                                → disputed → reverted → pending
```

### Testing Standards

- All schemas must have comprehensive Zod validation tests (target: 50+ tests)
- Follow `data-symmetry.schema.test.ts` pattern for test organization
- Cloud Functions require unit tests with mocked Firestore
- Test edge cases: concurrent proposals, rapid status changes, timing edge cases
- Rate limiting tests: verify max 10 proposals/hour limit

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
- Follows existing patterns from Story 3A.1 for schema organization
- Uses same audit log pattern established in dissolution.schema.ts for approval workflows

### References

- [Source: docs/archive/prd.md#Vision] - "Consent-based design" and "equal access"
- [Source: docs/archive/architecture.md#ADR-001] - Child-centric data model
- [Source: docs/archive/architecture.md#ADR-004] - Proposal workflow pattern
- [Source: docs/archive/architecture.md#PR5] - Adversarial family protections
- [Source: docs/archive/architecture.md#S5] - Full adversarial protections in scope
- [Source: docs/epics/epic-list.md#Story-3A.2] - Original acceptance criteria
- [Source: packages/contracts/src/dissolution.schema.ts] - Dual-consent workflow pattern
- [Source: packages/contracts/src/data-symmetry.schema.ts] - Story 3A.1 patterns
- [Source: apps/functions/src/callable/logDataView.ts] - Rate limiting pattern

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

### File List

**New Files Created:**
- `packages/contracts/src/safety-settings-proposal.schema.ts` - Proposal types, validation, and utilities
- `packages/contracts/src/safety-settings-proposal.schema.test.ts` - 121 comprehensive schema tests
- `apps/functions/src/callable/proposeSafetySettingChange.ts` - Create proposal Cloud Function
- `apps/functions/src/callable/proposeSafetySettingChange.test.ts` - 16 function tests
- `apps/functions/src/callable/respondToSafetyProposal.ts` - Approve/decline/dispute Cloud Functions
- `apps/functions/src/callable/respondToSafetyProposal.test.ts` - 28 function tests
- `apps/functions/src/scheduled/expireStaleProposals.ts` - Hourly scheduled expiry function
- `apps/functions/src/scheduled/expireStaleProposals.test.ts` - Expiry function tests

**Modified Files:**
- `packages/contracts/src/index.ts` - Export new types and functions
- `apps/functions/src/index.ts` - Export new Cloud Functions
- `packages/firebase-rules/firestore.rules` - Add safetySettingsProposals subcollection rules
- `packages/firebase-rules/firestore.indexes.json` - Add compound indexes for proposals queries
- `docs/sprint-artifacts/sprint-status.yaml` - Update story status

