# Story 39.3: Temporary Caregiver Access

## Status: done

## Story

As a **parent**,
I want **to grant temporary access to caregivers**,
So that **babysitters have access only when needed**.

## Acceptance Criteria

1. **AC1: Start and End Time Configuration**
   - Given caregiver needs temporary access (FR4, FR5)
   - When setting up temporary access
   - Then start and end datetime are configurable
   - And minimum duration is 1 hour
   - And maximum duration is 7 days
   - And timezone is handled correctly

2. **AC2: Access Presets**
   - Given parent is granting temporary access
   - When selecting access duration
   - Then "Today only" preset available (now until midnight)
   - And "This weekend" preset available (Friday 5pm to Sunday 10pm)
   - And "Custom" option for specific start/end times
   - And presets adjust to user's timezone

3. **AC3: Automatic Access Expiry**
   - Given temporary access has been granted
   - When end time is reached
   - Then access automatically expires
   - And caregiver can no longer view status
   - And expiry is logged in audit trail

4. **AC4: Caregiver Notifications**
   - Given temporary access is granted
   - When access window starts
   - Then caregiver is notified: "Your access to [Family] has started"
   - And when access ends, caregiver notified: "Your access to [Family] has ended"
   - And notifications include access duration remaining

5. **AC5: Early Revocation**
   - Given parent wants to end temporary access early
   - When parent revokes access
   - Then access is revoked immediately
   - And caregiver is notified of early revocation
   - And revocation is logged with reason (if provided)

6. **AC6: Temporary Access Logging**
   - Given any temporary access action
   - When action occurs
   - Then all temporary access logged: grant, start, end, revoke
   - And logs include: who, what, when, duration
   - And logs visible in parent dashboard

## Tasks / Subtasks

### Task 1: Create Temporary Access Schema (AC: #1, #2)

Add temporary access schema to shared contracts.

**Files:**

- `packages/shared/src/contracts/index.ts` (modify)
- `packages/shared/src/contracts/caregiver.test.ts` (modify)

**Implementation:**

- Add temporaryAccessGrantSchema with fields:
  - id: string
  - caregiverUid: string
  - grantedByUid: string
  - startAt: date
  - endAt: date
  - preset: enum ['today_only', 'this_weekend', 'custom']
  - timezone: string (IANA)
  - status: enum ['pending', 'active', 'expired', 'revoked']
  - revokedAt: date (optional)
  - revokedByUid: string (optional)
  - revokedReason: string (optional)
  - createdAt: date
- Add ACCESS_PRESETS constant with duration calculations
- Add helper functions: isAccessActive, calculatePresetDates

**Tests:** ~15 tests for schema validation and helpers

### Task 2: Create Grant Temporary Access Cloud Function (AC: #1, #2, #3, #6)

Cloud function to grant temporary access to a caregiver.

**Files:**

- `apps/functions/src/callable/grantTemporaryAccess.ts` (new)
- `apps/functions/src/callable/grantTemporaryAccess.test.ts` (new)

**Implementation:**

- grantTemporaryAccess({ familyId, caregiverUid, preset, startAt?, endAt?, timezone })
- Validate caller is guardian of family
- Validate caregiver exists in family
- Calculate dates based on preset or use custom dates
- Validate duration constraints (1 hour to 7 days)
- Create temporaryAccessGrant document in family subcollection
- Create audit log entry
- Schedule notification for access start (if future)
- Return grant details

**Tests:** ~20 tests including validation and preset calculations

### Task 3: Create Revoke Temporary Access Cloud Function (AC: #5, #6)

Cloud function to revoke temporary access early.

**Files:**

- `apps/functions/src/callable/revokeTemporaryAccess.ts` (new)
- `apps/functions/src/callable/revokeTemporaryAccess.test.ts` (new)

**Implementation:**

- revokeTemporaryAccess({ familyId, grantId, reason? })
- Validate caller is guardian of family
- Validate grant exists and is active
- Update grant status to 'revoked'
- Set revokedAt, revokedByUid, revokedReason
- Trigger immediate caregiver notification
- Create audit log entry
- Return updated grant

**Tests:** ~15 tests including auth and validation

### Task 4: Create Access Expiry Scheduled Function (AC: #3, #4)

Scheduled function to expire access and send notifications.

**Files:**

- `apps/functions/src/scheduled/processTemporaryAccessExpiry.ts` (new)
- `apps/functions/src/scheduled/processTemporaryAccessExpiry.test.ts` (new)

**Implementation:**

- Run every 5 minutes via Cloud Scheduler
- Query for active grants where endAt <= now
- For each expired grant:
  - Update status to 'expired'
  - Send caregiver notification
  - Create audit log entry
- Also query for pending grants where startAt <= now
  - Update status to 'active'
  - Send caregiver notification
  - Create audit log entry

**Tests:** ~12 tests for expiry logic

### Task 5: Create TemporaryAccessGrantForm Component (AC: #1, #2)

UI component for granting temporary access.

**Files:**

- `apps/web/src/components/caregiver/TemporaryAccessGrantForm.tsx` (new)
- `apps/web/src/components/caregiver/TemporaryAccessGrantForm.test.tsx` (new)

**Implementation:**

- Preset buttons: "Today Only", "This Weekend", "Custom"
- Custom mode shows date/time pickers for start and end
- Show duration in human-readable format: "3 hours", "2 days"
- Timezone display and handling
- Submit calls grantTemporaryAccess
- Success/error feedback
- 44px minimum touch targets (NFR49)

**Tests:** ~18 tests for component states and presets

### Task 6: Create TemporaryAccessList Component (AC: #5, #6)

UI component for viewing and managing active temporary access.

**Files:**

- `apps/web/src/components/caregiver/TemporaryAccessList.tsx` (new)
- `apps/web/src/components/caregiver/TemporaryAccessList.test.tsx` (new)

**Implementation:**

- List of all temporary access grants (active, pending, expired, revoked)
- Each item shows: caregiver name, start/end times, status, duration remaining
- "Revoke" button for active/pending grants
- Revocation confirmation modal with optional reason
- Filter by status (all, active, expired)
- Empty state messaging

**Tests:** ~15 tests for list states and revocation

### Task 7: Integrate with CaregiverManagementPage (AC: #1)

Add temporary access management to caregiver page.

**Files:**

- `apps/web/src/components/caregiver/CaregiverManagementPage.tsx` (modify)
- `apps/web/src/components/caregiver/CaregiverManagementPage.test.tsx` (modify)

**Implementation:**

- Add "Grant Access" button to each caregiver card
- Opens TemporaryAccessGrantForm modal
- Show active temporary access indicator on caregiver cards
- Add "Temporary Access" section below caregiver list
- Shows TemporaryAccessList component

**Tests:** ~8 additional tests

### Task 8: Update Caregiver Access Check Hook (AC: #3)

Extend useAccessWindowCheck to include temporary access.

**Files:**

- `apps/web/src/hooks/useAccessWindowCheck.ts` (modify)
- `apps/web/src/hooks/useAccessWindowCheck.test.ts` (modify)

**Implementation:**

- Check for active temporary access grants
- Temporary access overrides (grants access even outside regular windows)
- Return source of access: 'window' | 'temporary' | 'none'
- Include grant end time when access is temporary
- Real-time updates via Firestore listener

**Tests:** ~10 additional tests

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via Zod schemas
- **Schema Source:** @fledgely/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)

### Architecture Compliance

From existing Epic 19D and 39 patterns:

- "All types from Zod Only" - extend existing caregiver schemas
- "Firebase SDK Direct" - use `doc()`, `getDoc()`, `collection()` directly
- "Functions Delegate to Services" - Cloud Functions for business logic

### Existing Infrastructure to Leverage

**From Story 19D.4 (Access Window Enforcement):**

- `useAccessWindowCheck.ts` - MODIFY to include temporary access
- `AccessWindowEditor.tsx` - Reference for time picker patterns
- `accessWindowSchema` - Reference for timezone handling

**From Story 39.2 (Permission Configuration):**

- `caregiverAuditService.ts` - Use for logging temporary access actions
- `CaregiverManagementPage.tsx` - MODIFY to add temporary access UI

### Temporary Access Schema

```typescript
export const temporaryAccessPresetSchema = z.enum(['today_only', 'this_weekend', 'custom'])
export type TemporaryAccessPreset = z.infer<typeof temporaryAccessPresetSchema>

export const temporaryAccessStatusSchema = z.enum(['pending', 'active', 'expired', 'revoked'])
export type TemporaryAccessStatus = z.infer<typeof temporaryAccessStatusSchema>

export const temporaryAccessGrantSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  caregiverUid: z.string(),
  grantedByUid: z.string(),
  startAt: z.date(),
  endAt: z.date(),
  preset: temporaryAccessPresetSchema,
  timezone: z.string(), // IANA timezone
  status: temporaryAccessStatusSchema,
  revokedAt: z.date().optional(),
  revokedByUid: z.string().optional(),
  revokedReason: z.string().max(200).optional(),
  createdAt: z.date(),
})
export type TemporaryAccessGrant = z.infer<typeof temporaryAccessGrantSchema>

// Duration constraints
export const MIN_TEMP_ACCESS_DURATION_HOURS = 1
export const MAX_TEMP_ACCESS_DURATION_DAYS = 7
```

### Preset Calculations

```typescript
function calculatePresetDates(
  preset: TemporaryAccessPreset,
  timezone: string,
  customStart?: Date,
  customEnd?: Date
): { startAt: Date; endAt: Date } {
  const now = new Date()

  switch (preset) {
    case 'today_only':
      // Now until midnight in user's timezone
      return {
        startAt: now,
        endAt: endOfDayInTimezone(now, timezone),
      }
    case 'this_weekend':
      // Friday 5pm to Sunday 10pm in user's timezone
      const friday = getNextFriday(now, timezone)
      return {
        startAt: setTimeInTimezone(friday, '17:00', timezone),
        endAt: setTimeInTimezone(addDays(friday, 2), '22:00', timezone),
      }
    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom preset requires start and end dates')
      }
      return { startAt: customStart, endAt: customEnd }
  }
}
```

### Firestore Collection Structure

```
families/{familyId}/temporaryAccessGrants/{grantId}
├── caregiverUid: "uid_grandma"
├── grantedByUid: "uid_parent"
├── startAt: Timestamp
├── endAt: Timestamp
├── preset: "this_weekend"
├── timezone: "America/New_York"
├── status: "active"
├── createdAt: Timestamp
```

### Caregiver Access Check Logic

```typescript
function checkCaregiverAccess(
  caregiver: FamilyCaregiver,
  temporaryGrants: TemporaryAccessGrant[],
  timezone: string
): { hasAccess: boolean; source: 'window' | 'temporary' | 'none'; expiresAt?: Date } {
  // Check for active temporary grant first (overrides windows)
  const activeGrant = temporaryGrants.find(
    (g) =>
      g.caregiverUid === caregiver.uid &&
      g.status === 'active' &&
      new Date() >= g.startAt &&
      new Date() <= g.endAt
  )

  if (activeGrant) {
    return { hasAccess: true, source: 'temporary', expiresAt: activeGrant.endAt }
  }

  // Fall back to regular access windows
  if (isInAccessWindow(caregiver.accessWindows, timezone)) {
    return { hasAccess: true, source: 'window' }
  }

  return { hasAccess: false, source: 'none' }
}
```

### Audit Log Actions

```typescript
type TemporaryAccessAuditAction =
  | 'temporary_access_granted'
  | 'temporary_access_started'
  | 'temporary_access_expired'
  | 'temporary_access_revoked'

// Example audit entry
{
  action: 'temporary_access_granted',
  familyId: 'family_123',
  caregiverUid: 'uid_grandma',
  changedByUid: 'uid_parent',
  changes: {
    preset: 'this_weekend',
    startAt: '2026-01-04T17:00:00Z',
    endAt: '2026-01-06T22:00:00Z',
  },
  createdAt: serverTimestamp(),
}
```

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR49: 44x44px minimum touch target
- NFR62: Caregiver access audit logging (within 5 minutes)

### References

- [Source: docs/epics/epic-list.md#Story-39.3]
- [Source: docs/epics/epic-list.md#Epic-39]
- [Source: Story 19D.4 for access window patterns]
- [Source: Story 39.2 for permission/audit patterns]

## Dev Agent Record

### Context Reference

- Epic: 39 (Caregiver Full Features)
- Story Key: 39-3-temporary-caregiver-access
- Dependencies: Story 39.1 (Caregiver Account Creation) - COMPLETE, Story 39.2 (Caregiver Permission Configuration) - COMPLETE

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- All 8 tasks implemented and tested
- Schema created in `packages/shared/src/contracts/temporaryAccess.ts`
- Cloud Functions: grantTemporaryAccess (35 tests), revokeTemporaryAccess (21 tests), processTemporaryAccessExpiry (34 tests)
- Web Components: TemporaryAccessGrantForm (31 tests), TemporaryAccessList (36 tests)
- CaregiverManagementPage integration (23 tests)
- useAccessWindowCheck hook extended with temporary access support (33 tests)
- Total: 213+ tests passing for Story 39.3

### File List

- `packages/shared/src/contracts/temporaryAccess.ts` (new)
- `apps/functions/src/callable/grantTemporaryAccess.ts` (new)
- `apps/functions/src/callable/grantTemporaryAccess.test.ts` (new)
- `apps/functions/src/callable/revokeTemporaryAccess.ts` (new)
- `apps/functions/src/callable/revokeTemporaryAccess.test.ts` (new)
- `apps/functions/src/scheduled/processTemporaryAccessExpiry.ts` (new)
- `apps/functions/src/scheduled/processTemporaryAccessExpiry.test.ts` (new)
- `apps/functions/src/scheduled/index.ts` (modified)
- `apps/functions/src/index.ts` (modified)
- `apps/web/src/components/caregiver/TemporaryAccessGrantForm.tsx` (new)
- `apps/web/src/components/caregiver/TemporaryAccessGrantForm.test.tsx` (new)
- `apps/web/src/components/caregiver/TemporaryAccessList.tsx` (new)
- `apps/web/src/components/caregiver/TemporaryAccessList.test.tsx` (new)
- `apps/web/src/components/caregiver/CaregiverManagementPage.tsx` (modified)
- `apps/web/src/components/caregiver/CaregiverManagementPage.test.tsx` (modified)
- `apps/web/src/hooks/useAccessWindowCheck.ts` (modified)
- `apps/web/src/hooks/useAccessWindowCheck.test.ts` (modified)

## Change Log

| Date       | Change                                |
| ---------- | ------------------------------------- |
| 2026-01-03 | Story created (ready-for-dev)         |
| 2026-01-03 | Story completed with all 8 tasks done |
