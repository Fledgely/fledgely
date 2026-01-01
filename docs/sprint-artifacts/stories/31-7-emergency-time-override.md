# Story 31.7: Time Limit Override for Emergencies

Status: Done

## Story

As **a parent**,
I want **an emergency override for time limits**,
So that **my child can use devices when truly needed**.

## Acceptance Criteria

1. **AC1: Parent can grant temporary unlimited access**
   - Given child needs device access after limit
   - When parent initiates override
   - Then parent can grant temporary unlimited access

2. **AC2: Override duration options**
   - Given parent is granting override
   - When selecting duration
   - Then options include: 30m, 1h, 2h, "Rest of day"

3. **AC3: Override reason logging**
   - Given parent grants override
   - When override is processed
   - Then reason logged: "School emergency", "Travel", "Other"

4. **AC4: Child sees override message**
   - Given override is granted
   - When child's device receives override
   - Then child sees: "[Parent] gave you extra time today"

5. **AC5: Override in audit log**
   - Given override is granted
   - When viewing audit log
   - Then override is visible with reason and duration

6. **AC6: Next day unaffected**
   - Given override was granted today
   - When next day begins
   - Then normal limits resume without carry-over

## Tasks / Subtasks

- [x] Task 1: Create override schemas and Firestore structure
  - [x] 1.1 Define override reason enum in contracts
  - [x] 1.2 Define override duration options
  - [x] 1.3 Create override document schema

- [x] Task 2: Implement override Cloud Function (AC: #1, #2, #3, #5)
  - [x] 2.1 Create grantTimeOverride callable function
  - [x] 2.2 Validate parent is guardian
  - [x] 2.3 Store override in Firestore
  - [x] 2.4 Log override to audit trail

- [x] Task 3: Update extension to check for overrides (AC: #1, #4)
  - [x] 3.1 Check override status during enforcement
  - [x] 3.2 Skip blocking if active override exists
  - [x] 3.3 Show "[Parent] gave you extra time today" message

- [x] Task 4: Implement override expiry (AC: #2, #6)
  - [x] 4.1 Calculate expiry based on duration
  - [x] 4.2 Handle "Rest of day" expiry at midnight
  - [x] 4.3 Scheduled function to expire overrides

- [x] Task 5: Build and test
  - [x] 5.1 Verify extension build passes
  - [x] 5.2 Test override flow end-to-end

## Dev Notes

### Firestore Structure

```
families/{familyId}/timeOverrides/{overrideId}
  - childId: string
  - grantedBy: string (parent userId)
  - grantedByName: string (parent display name for child message)
  - reason: 'school_emergency' | 'travel' | 'other'
  - duration: '30m' | '1h' | '2h' | 'rest_of_day'
  - grantedAt: timestamp
  - expiresAt: timestamp
  - active: boolean
```

### Override Duration Calculation

- 30m: expiresAt = grantedAt + 30 minutes
- 1h: expiresAt = grantedAt + 60 minutes
- 2h: expiresAt = grantedAt + 120 minutes
- rest_of_day: expiresAt = midnight local time

### Extension Integration

Check for active override in `checkEnforcementStatus()`:

1. Query `timeOverrides` for active override where expiresAt > now
2. If found, return { enforced: false, overrideActive: true, overrideByName }
3. Show message in content script if override is active

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

1. Created timeOverride.ts with grantTimeOverride, checkTimeOverride, revokeTimeOverride, expireTimeOverrides
2. Added Firestore security rules for timeOverrides subcollection
3. Added Firestore indexes for timeOverrides collection group queries
4. Updated time-limit-warnings.ts with checkForActiveOverride and checkEnforcementWithOverride functions
5. Updated background.ts to use override-aware enforcement checking
6. Updated time-limit-block.ts content script to show override notification

### File List

- apps/functions/src/callable/timeOverride.ts (created)
- apps/functions/src/index.ts (modified - exports)
- packages/firebase-rules/firestore.rules (modified - security rules)
- firestore.indexes.json (modified - indexes)
- apps/extension/src/time-limit-warnings.ts (modified - override check)
- apps/extension/src/background.ts (modified - message handlers)
- apps/extension/src/content-scripts/time-limit-block.ts (modified - override notification)
