# Story 3A.4: Safety Rule 48-Hour Cooling Period

Status: complete

## Story

As a **child in shared custody**,
I want **safety rule changes to have a cooling period**,
So that **I'm protected from impulsive rule changes during parental conflict**.

## Acceptance Criteria

1. **Given** two parents have approved a safety rule change **When** the change would reduce protections (less monitoring, longer screen time, etc.) **Then** change enters 48-hour cooling period before taking effect
2. **Given** a safety rule change enters cooling period **When** the cooling period starts **Then** child and both parents are notified of pending change
3. **Given** a safety rule change is in cooling period **When** the child views the settings **Then** child can see countdown to when change takes effect
4. **Given** a safety rule change is in cooling period **When** either parent reviews the change **Then** either parent can cancel during cooling period (returns to previous setting)
5. **Given** a safety rule change is proposed **When** the change increases protections (more monitoring, less screen time) **Then** protection increases take effect immediately (no cooling period)
6. **Given** a safety rule change is in cooling period **When** both parents request immediate effect **Then** cooling period cannot be bypassed, even with both parents requesting immediate effect

## Tasks / Subtasks

- [x] Task 1: Extend safety settings proposal schema for cooling period (AC: 1, 3)
  - [x] 1.1: Add `coolingPeriod` object to `SafetySettingsProposal` schema with `startsAt`, `endsAt`, `cancelledBy`, `cancelledAt`
  - [x] 1.2: Add `CoolingPeriodStatus` enum: `pending_cooling`, `cooling_in_progress`, `cooling_cancelled`, `cooling_completed`
  - [x] 1.3: Add `COOLING_PERIOD_MS` constant (48 hours = 172800000ms) to `PROPOSAL_TIME_LIMITS`
  - [x] 1.4: Update `ProposalStatus` enum to include `pending_cooling`, `cooling_in_progress`
  - [x] 1.5: Export new types from contracts/index.ts
  - [x] 1.6: Write schema tests for cooling period types (target: 30+ tests) ✓ 62 tests added

- [x] Task 2: Implement cooling period detection logic (AC: 1, 5)
  - [x] 2.1: Create `requiresCoolingPeriod` helper function that determines if approved change reduces protections
  - [x] 2.2: Define protection reduction rules for each `SafetySettingType`:
    - `monitoring_interval` INCREASED (less frequent) = reduces protection
    - `retention_period` DECREASED (kept shorter) = reduces protection
    - `age_restriction` LOWERED (less filtering) = reduces protection
    - `screen_time_daily` INCREASED (more time allowed) = reduces protection
    - `screen_time_per_app` INCREASED = reduces protection
    - `bedtime_start` DELAYED (later bedtime) = reduces protection
    - `bedtime_end` ADVANCED (earlier wakeup allowed) = reduces protection
    - `crisis_allowlist` changes = never reduces protection (additions are protective)
  - [x] 2.3: Write comprehensive tests for protection reduction detection (target: 20+ tests covering all setting types)

- [x] Task 3: Modify respondToSafetyProposal to trigger cooling period (AC: 1, 5)
  - [x] 3.1: After approval, check if `requiresCoolingPeriod(proposal)` returns true
  - [x] 3.2: If cooling required: set status to `cooling_in_progress`, calculate `coolingEndsAt` (now + 48h)
  - [x] 3.3: If no cooling required (protection increase): set status to `approved`, apply change immediately
  - [x] 3.4: Store original value for potential reversion if cancelled
  - [x] 3.5: Update unit tests for approval with cooling period flow

- [x] Task 4: Create cooling period cancellation Cloud Function (AC: 4)
  - [x] 4.1: Create `cancelCoolingPeriod` callable Cloud Function
  - [x] 4.2: Verify caller is guardian of the child
  - [x] 4.3: Verify proposal is in `cooling_in_progress` status
  - [x] 4.4: Update proposal: set `coolingPeriod.cancelledBy`, `coolingPeriod.cancelledAt`, status to `cooling_cancelled`
  - [x] 4.5: Change does NOT take effect - original settings remain
  - [x] 4.6: Add App Check enforcement following existing patterns
  - [x] 4.7: Write unit tests (target: 15+ tests) ✓ 19 tests added

- [x] Task 5: Create cooling period completion scheduled function (AC: 1)
  - [x] 5.1: Create `completeCoolingPeriods` scheduled Cloud Function (runs every 15 minutes)
  - [x] 5.2: Query proposals with `status = 'cooling_in_progress'` and `coolingPeriod.endsAt <= now`
  - [x] 5.3: For each expired cooling period: update status to `cooling_completed`, apply the safety setting change
  - [x] 5.4: Log completion in audit trail
  - [x] 5.5: Write unit tests (target: 10+ tests) ✓ 10 tests added

- [x] Task 6: Add cooling period countdown utilities (AC: 3)
  - [x] 6.1: Create `getCoolingPeriodTimeRemaining` helper (returns milliseconds remaining)
  - [x] 6.2: Create `formatCoolingPeriodCountdown` helper (returns human-readable "X hours, Y minutes")
  - [x] 6.3: Create `isCoolingPeriodActive` helper (checks if within cooling window)
  - [x] 6.4: Write unit tests for utilities (target: 15+ tests)

- [x] Task 7: Add Firestore Security Rules for cooling period fields
  - [x] 7.1: Update `safetySettingsProposals` rules to allow read of coolingPeriod fields by all guardians
  - [x] 7.2: Ensure coolingPeriod updates only via Cloud Functions (no direct client writes)

- [x] Task 8: Add Firestore indexes for cooling period queries
  - [x] 8.1: Add compound index for `status` + `coolingPeriod.endsAt` queries (scheduled function)

- [ ] Task 9: Implement notifications for cooling period (AC: 2) [DEFERRED if notification system not ready]
  - [ ] 9.1: Trigger notification to child when cooling period starts
  - [ ] 9.2: Trigger notification to both parents when cooling period starts
  - [ ] 9.3: Trigger notification when cooling period is cancelled

## Dev Notes

### Architecture Patterns

**PR5: Adversarial Family Protections - Full Scope**
- Safety rule 48-hour cooling period is explicitly mentioned for Epic 3A
- Cooling period prevents impulsive rule changes during parental conflict
- Protects child from weaponization of settings changes
[Source: docs/archive/architecture.md#Architectural-Risk-Preventions]

**ADR-001: Child-Centric with Guardian Links**
- Cooling period is a child protection mechanism
- Both parents AND child should be able to see countdown
- Settings stored under child document
[Source: docs/archive/architecture.md#ADR-001]

**S5: Adversarial Protections - Full Scope**
- Core to product mission - all adversarial family protections in scope
- Cooling periods specifically mentioned alongside custody immutability
[Source: docs/archive/architecture.md#S5]

### Existing Implementation Context

The codebase already has:
1. **Safety settings proposal schema** (Story 3A.2) - `packages/contracts/src/safety-settings-proposal.schema.ts`
   - `SafetySettingsProposal` type with status workflow
   - `proposalStatusSchema` enum to extend
   - `PROPOSAL_TIME_LIMITS` constants to add 48-hour cooling period
   - `isEmergencyIncrease` boolean for protection increases (opposite logic needed)
2. **respondToSafetyProposal Cloud Function** - `apps/functions/src/callable/respondToSafetyProposal.ts`
   - Already handles approve/decline workflow
   - Need to add cooling period trigger after approval
3. **expireStaleProposals scheduled function** - can reference for cooling completion pattern
4. **Firestore rules for safetySettingsProposals** - already in place, need to extend

### Key Difference from Emergency Increases (Story 3A.2)

| Aspect | Story 3A.2 Emergency Increase | Story 3A.4 Cooling Period |
|--------|------------------------------|--------------------------|
| Direction | Protection INCREASE | Protection DECREASE |
| Timing | Takes effect IMMEDIATELY | 48-hour delay before effect |
| Review | 48-hour dispute window AFTER | 48-hour cancel window BEFORE |
| Default | Applied unless disputed | NOT applied unless cooling completes |
| Cancel | Dispute reverts | Cancel prevents application |

### Protection Direction Logic

**CRITICAL: Do NOT confuse with `isEmergencyIncrease` logic from Story 3A.2**

- Story 3A.2's `isEmergencyIncrease` = TRUE when change is MORE restrictive (auto-apply)
- Story 3A.4's `requiresCoolingPeriod` = TRUE when change is LESS restrictive (delay apply)

They are OPPOSITE directions:
- `isEmergencyIncrease === true` → No cooling period needed (protection UP)
- `isEmergencyIncrease === false` → Cooling period required (protection DOWN)

### Key Files to Modify

**Modified files:**
- `packages/contracts/src/safety-settings-proposal.schema.ts` - Add cooling period types
- `packages/contracts/src/safety-settings-proposal.schema.test.ts` - Add cooling period tests
- `packages/contracts/src/index.ts` - Export new types
- `apps/functions/src/callable/respondToSafetyProposal.ts` - Trigger cooling period on approval
- `apps/functions/src/callable/respondToSafetyProposal.test.ts` - Test cooling trigger
- `packages/firebase-rules/firestore.rules` - Update safetySettingsProposals rules
- `packages/firebase-rules/firestore.indexes.json` - Add compound indexes

**New files:**
- `apps/functions/src/callable/cancelCoolingPeriod.ts` - Cancel cooling period function
- `apps/functions/src/callable/cancelCoolingPeriod.test.ts` - Function tests
- `apps/functions/src/scheduled/completeCoolingPeriods.ts` - Scheduled completion function
- `apps/functions/src/scheduled/completeCoolingPeriods.test.ts` - Completion tests

### Cooling Period Status Flow

```
approved (protection decrease detected)
    ↓
cooling_in_progress (48-hour countdown starts)
    ↓
[either parent cancels] → cooling_cancelled (original settings remain)
    ↓
[48 hours pass] → cooling_completed (new settings applied)
```

### Testing Standards

- All schemas must have comprehensive Zod validation tests (target: 30+ tests for cooling)
- Follow existing `safety-settings-proposal.schema.test.ts` pattern
- Test edge cases: concurrent cancellations, boundary timing, all setting types
- Cloud Functions require unit tests with mocked Firestore
- Protection direction detection tests MUST cover all 8 setting types

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
- Extends existing Story 3A.2 implementation rather than creating new schema
- Reuses existing Firestore subcollection structure
- Same rate limiting patterns apply

### References

- [Source: docs/epics/epic-list.md#Story-3A.4] - Original acceptance criteria
- [Source: docs/archive/architecture.md#PR5] - Adversarial family protections
- [Source: docs/archive/architecture.md#S5] - Full adversarial protections in scope
- [Source: packages/contracts/src/safety-settings-proposal.schema.ts] - Story 3A.2 schema to extend
- [Source: apps/functions/src/callable/respondToSafetyProposal.ts] - Approval function to modify
- [Source: docs/sprint-artifacts/stories/story-3a-2-safety-settings-two-parent-approval.md] - Previous story patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

