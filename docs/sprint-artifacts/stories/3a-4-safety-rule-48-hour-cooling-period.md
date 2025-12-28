# Story 3A.4: Safety Rule 48-Hour Cooling Period

Status: done

## Story

As a **child in shared custody**,
I want **safety rule changes to have a cooling period**,
So that **I'm protected from impulsive rule changes during parental conflict**.

## Acceptance Criteria

1. **AC1: Cooling Period for Protection Reductions**
   - Given two parents have approved a safety rule change (status: approved)
   - When the change would reduce protections (less monitoring, longer screen time, etc.)
   - Then the change enters 48-hour cooling period before taking effect
   - And change status transitions to "cooling_period"
   - And effectiveAt timestamp is set to 48 hours from approval

2. **AC2: Notification of Pending Change**
   - Given a safety setting change enters cooling period
   - When the cooling period starts
   - Then child and both parents are notified of pending change
   - And notification includes what setting is changing and when it takes effect
   - And child can see countdown to when change takes effect (console.log placeholder for Story 41)

3. **AC3: Cooling Period Cancellation**
   - Given a safety setting change is in cooling period
   - When either parent requests to cancel
   - Then the change is cancelled (status: cancelled)
   - And original setting is preserved
   - And all family members are notified of cancellation

4. **AC4: Immediate Effect for Protection Increases**
   - Given a safety setting change is more restrictive (emergency increase)
   - When the change is approved
   - Then no cooling period is applied
   - And the change takes effect immediately (already implemented in Story 3A.2)

5. **AC5: Non-Bypassable Cooling Period**
   - Given a safety setting change is in cooling period
   - When both parents request immediate effect
   - Then the request is rejected
   - And cooling period cannot be bypassed for any reason
   - And system explains protection rationale

6. **AC6: Automatic Activation After Cooling**
   - Given a safety setting change has completed cooling period
   - When 48 hours have passed since approval
   - Then the change automatically takes effect (status: activated)
   - And all family members are notified of activation

## Tasks / Subtasks

- [x] Task 1: Update Safety Setting Schema (AC: #1, #6)
  - [x] 1.1 Add 'cooling_period' and 'activated' and 'cancelled' to settingChangeStatusSchema
  - [x] 1.2 Add effectiveAt: z.date().nullable() to safetySettingChangeSchema
  - [x] 1.3 Add cancelledByUid: z.string().nullable() for tracking who cancelled
  - [x] 1.4 Update tests for new schema values

- [x] Task 2: Add Cooling Period Logic to Service (AC: #1, #4)
  - [x] 2.1 Modify approveSafetySettingChange to check if protection reduction
  - [x] 2.2 For reductions: set status to 'cooling_period', set effectiveAt to now + 48h
  - [x] 2.3 For increases: set status to 'approved' (immediate effect - existing behavior)
  - [x] 2.4 Create isProtectionReduction helper (inverse of isEmergencySafetyIncrease)
  - [x] 2.5 Add unit tests for cooling period transition

- [x] Task 3: Create Cancel During Cooling Function (AC: #3)
  - [x] 3.1 Create cancelSafetySettingChange function
  - [x] 3.2 Validate change is in 'cooling_period' status
  - [x] 3.3 Allow any family guardian to cancel (not just OTHER guardian)
  - [x] 3.4 Set status to 'cancelled', set cancelledByUid
  - [x] 3.5 Add unit tests for cancellation

- [x] Task 4: Implement Bypass Prevention (AC: #5)
  - [x] 4.1 Security rules prevent direct status change to 'activated' during cooling
  - [x] 4.2 No "expedite" or "force activate" function available
  - [x] 4.3 Add test case confirming bypass is impossible

- [x] Task 5: Update UI Components (AC: #2, #3)
  - [x] 5.1 Update SafetySettingProposalCard to show cooling period countdown
  - [x] 5.2 Add "Cancel Change" button during cooling period
  - [x] 5.3 Show different styling for cooling_period status
  - [x] 5.4 Add notification placeholder (console.log for Story 41)
  - [x] 5.5 Update component tests

- [x] Task 6: Update Firestore Security Rules (AC: #1, #3)
  - [x] 6.1 Allow status transition: pending_approval → cooling_period (by OTHER guardian)
  - [x] 6.2 Allow status transition: cooling_period → cancelled (by ANY guardian)
  - [x] 6.3 Prevent direct transition to 'activated' (only via scheduled function or client check)
  - [x] 6.4 Preserve effectiveAt immutability during cooling period

- [x] Task 7: Create Unit Tests (AC: All)
  - [x] 7.1 Test cooling period applies to protection reductions
  - [x] 7.2 Test no cooling period for protection increases
  - [x] 7.3 Test cancellation workflow
  - [x] 7.4 Test bypass prevention
  - [x] 7.5 Test countdown timer calculation
  - [x] 7.6 Test 48-hour immutability

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via Zod schemas
- **Schema Source:** @fledgely/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)
- **Extends:** /safetySettingChanges/{changeId} collection from Story 3A.2

### Architecture Compliance

From project_context.md:

- "All types from Zod Only" - extend existing safetySettingChangeSchema
- "Firebase SDK Direct" - use `updateDoc()` directly
- "Functions Delegate to Services" - service layer for business logic

### Cooling Period Flow

```
User proposes reduction → OTHER guardian approves
                                    ↓
                        isProtectionReduction()?
                                    ↓
                    YES: status = 'cooling_period'
                         effectiveAt = now + 48h
                                    ↓
                    NO: status = 'approved' (immediate)
                                    ↓
                [48 hours pass with option to cancel]
                                    ↓
                         status = 'activated'
```

### Protection Reduction Detection

A setting change is a "protection reduction" (less restrictive) if:

| Setting             | Less Restrictive (needs cooling) | More Restrictive (immediate) |
| ------------------- | -------------------------------- | ---------------------------- |
| monitoring_interval | Longer interval                  | Shorter interval             |
| retention_period    | Longer retention                 | Shorter retention            |
| time_limits         | More time allowed                | Less time allowed            |
| age_restrictions    | Lower age                        | Higher age                   |

**Note:** This is the INVERSE of isEmergencySafetyIncrease from Story 3A.2.

### Schema Updates Required

```typescript
// Update settingChangeStatusSchema
export const settingChangeStatusSchema = z.enum([
  'pending_approval',
  'approved',
  'declined',
  'expired',
  'cooling_period', // NEW: 48h waiting period for protection reductions
  'activated', // NEW: Change has taken effect after cooling
  'cancelled', // NEW: Cancelled during cooling period
])

// Update safetySettingChangeSchema
export const safetySettingChangeSchema = z.object({
  // ... existing fields ...
  effectiveAt: z.date().nullable(), // NEW: When change takes effect
  cancelledByUid: z.string().nullable(), // NEW: Who cancelled (if applicable)
})
```

### Security Rules Updates

```javascript
// In safetySettingChanges rules - extend existing update rule
allow update: if isOtherGuardian() &&
  resource.data.status == 'pending_approval' &&
  request.resource.data.status in ['approved', 'declined', 'cooling_period'] &&
  // ... existing immutability rules ...;

// NEW: Allow any guardian to cancel during cooling period
allow update: if isFamilyGuardian() &&
  resource.data.status == 'cooling_period' &&
  request.resource.data.status == 'cancelled' &&
  // Preserve original proposal data
  request.resource.data.familyId == resource.data.familyId &&
  request.resource.data.settingType == resource.data.settingType;
```

### Previous Story Intelligence (Story 3A.2)

From Story 3A.2 completion:

- safetySettingService.ts already has isEmergencySafetyIncrease helper
- approveSafetySettingChange sets status to 'approved'
- Firestore rules prevent self-approval via isOtherGuardian()
- SafetySettingProposalCard shows countdown and handles approval/decline
- Tests mock Firebase modules with vi.mock()

**Key Patterns to Reuse:**

- Extend existing settingChangeStatusSchema with new values
- Add new service function following existing pattern
- Update component to handle new statuses
- Extend security rules with additional allow clauses

### Library/Framework Requirements

| Dependency | Version | Purpose                          |
| ---------- | ------- | -------------------------------- |
| firebase   | ^10.x   | Firebase SDK (already installed) |
| zod        | ^3.x    | Schema validation                |

### File Structure Requirements

```
packages/shared/src/contracts/
└── index.ts                    # UPDATE - Add new status values and fields

apps/web/src/
├── services/
│   ├── safetySettingService.ts     # UPDATE - Add cooling period logic
│   └── safetySettingService.test.ts # UPDATE - Add cooling period tests
├── components/
│   ├── SafetySettingProposalCard.tsx # UPDATE - Show cooling period UI
│   └── SafetySettingProposalCard.test.tsx # UPDATE - Add cooling period tests

packages/firebase-rules/
└── firestore.rules            # UPDATE - Add cooling period rules
```

### Testing Requirements

- Unit test settingChangeStatusSchema with new values
- Unit test cooling period activation for protection reductions
- Unit test immediate effect for protection increases
- Unit test cancellation during cooling period
- Unit test bypass prevention (no expedite function exists)
- Unit test 48-hour countdown calculation
- Component tests for cooling period UI states
- Security rules tests: any guardian can cancel

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR46: Visible focus indicators
- NFR49: 44x44px minimum touch target

### References

- [Source: docs/epics/epic-list.md#Story-3A.4]
- [Source: docs/epics/epic-list.md#Epic-3A]
- [Source: docs/project_context.md#The-5-Unbreakable-Rules]
- [Source: docs/sprint-artifacts/stories/3a-2-safety-settings-two-parent-approval.md]

## Dev Agent Record

### Context Reference

- Epic: 3A (Shared Custody Safeguards)
- Sprint: 2 (Feature Development)
- Story Key: 3a-4-safety-rule-48-hour-cooling-period
- Depends On: Story 3A.2 (completed - safety settings approval workflow)

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None

### Completion Notes List

- Implemented 48-hour cooling period for protection reductions
- Schema extended with cooling_period, activated, cancelled statuses
- Added effectiveAt and cancelledByUid fields to safetySettingChangeSchema
- Created isProtectionReduction helper function
- Updated approveSafetySettingChange to apply cooling period for protection reductions
- Created cancelSafetySettingChange function for cooling period cancellation
- Updated SafetySettingProposalCard UI with cooling period countdown and cancel button
- Updated Firestore security rules for cooling period state transitions
- 238 tests passing (210 web + 28 shared)
- Build passing

### File List

- packages/shared/src/contracts/index.ts - Updated schema with new statuses and fields
- packages/shared/src/contracts/safetySettingChange.test.ts - Updated tests for new schema
- apps/web/src/services/safetySettingService.ts - Added cooling period logic
- apps/web/src/services/safetySettingService.test.ts - Added cooling period tests
- apps/web/src/components/SafetySettingProposalCard.tsx - Updated UI for cooling period
- apps/web/src/components/SafetySettingProposalCard.test.tsx - Added component tests
- packages/firebase-rules/firestore.rules - Added cooling period rules

## Change Log

| Date       | Change                        |
| ---------- | ----------------------------- |
| 2025-12-28 | Story created (ready-for-dev) |
| 2025-12-28 | Story completed (done)        |
