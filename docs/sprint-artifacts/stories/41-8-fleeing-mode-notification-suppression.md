# Story 41.8: Fleeing Mode Notification Suppression

## Status: done

## Story

As **the system**,
I want **to suppress certain notifications during fleeing mode**,
So that **location-based alerts don't enable stalking**.

## Acceptance Criteria

1. **AC1: Location Notification Suppression**
   - Given fleeing mode is activated
   - When location-related events occur
   - Then NO notifications about: location changes, geofence exits/entries
   - And suppression is automatic and immediate

2. **AC2: Location Feature Pause Suppression**
   - Given fleeing mode is activated
   - When location features are paused
   - Then NO notifications about: location feature being paused
   - And parents cannot see location has been disabled

3. **AC3: Regular Notifications Continue**
   - Given fleeing mode is activated
   - When non-location events occur
   - Then regular notifications continue: flags, time limits, sync
   - And no indication that location is suppressed

4. **AC4: 72-Hour Expiry Notification**
   - Given fleeing mode was activated 72 hours ago
   - When fleeing mode expires
   - Then neutral notification "Location features paused"
   - And no location history revealed
   - And no indication of fleeing mode activation

5. **AC5: Safety Audit Logging**
   - Given notifications are suppressed
   - When location events occur
   - Then suppression is logged for safety audit
   - And logs are NOT visible to family
   - And logs are accessible to safety/support team

## Tasks / Subtasks

### Task 1: Add Fleeing Mode Check to Location Trigger (AC: #1)

Add fleeing mode suppression to location update trigger.

**Files:**

- `apps/functions/src/triggers/onLocationUpdate.ts` (modify)
- `apps/functions/src/triggers/onLocationUpdate.test.ts` (new/modify)

**Implementation:**

- Import `isInFleeingMode` from loginNotification.ts
- At start of trigger, check `isInFleeingMode(familyId)`
- If fleeing mode active:
  - Skip ALL location notification creation
  - Log suppression to safety audit (see Task 3)
  - Mark transition as processed (prevent retry)
- Regular location data still stored for safety (just no notifications)

### Task 2: Suppress Location Pause Notifications (AC: #2)

Ensure no notification is sent when location is paused during fleeing mode.

**Files:**

- `apps/functions/src/lib/notifications/fleeingModeSuppressions.ts` (new)
- `apps/functions/src/lib/notifications/fleeingModeSuppressions.test.ts` (new)

**Implementation:**

- Create `shouldSuppressNotification(familyId, notificationType)`:
  - Check if fleeing mode active
  - For location-related types, return true to suppress
  - For other types, return false (allow through)
- Location-related notification types to suppress:
  - `location_transition`
  - `geofence_entry`
  - `geofence_exit`
  - `location_paused`
  - `location_disabled`

### Task 3: Create Safety Audit Logging (AC: #5)

Create separate audit log for suppressed notifications.

**Files:**

- `apps/functions/src/lib/safety/fleeingModeAudit.ts` (new)
- `apps/functions/src/lib/safety/fleeingModeAudit.test.ts` (new)

**Implementation:**

- `logFleeingModeSuppression(params)`:
  - `familyId`: Family ID
  - `notificationType`: Type that was suppressed
  - `eventData`: Details of the suppressed event
  - `suppressedAt`: Timestamp
- Store at: `safetyAudit/{familyId}/fleeingModeLogs/{logId}`
  - NOT visible in family's audit trail
  - Accessible only to safety/support functions
- Include Firestore rules to prevent family access

### Task 4: Create 72-Hour Expiry Notification (AC: #4)

Create scheduled function for fleeing mode expiry.

**Files:**

- `apps/functions/src/scheduled/fleeingModeExpiry.ts` (new)
- `apps/functions/src/scheduled/fleeingModeExpiry.test.ts` (new)

**Implementation:**

- Scheduled function runs hourly
- Query families where `fleeingModeActivatedAt` is 72+ hours ago
- For expired fleeing mode:
  - Send neutral notification: "Location features paused - tap to review"
  - Clear `fleeingModeActivatedAt` timestamp
  - Log expiry to safety audit
- Notification wording reveals nothing about:
  - Who activated fleeing mode
  - Why location was paused
  - Child's location during 72 hours

### Task 5: Update Exports and Register Functions (AC: all)

**Files:**

- `apps/functions/src/lib/notifications/index.ts` - add exports
- `apps/functions/src/lib/safety/index.ts` (new) - create with exports
- `apps/functions/src/index.ts` - register scheduled function

## Dev Notes

### Architecture Patterns (from Story 41-5)

- `isInFleeingMode(familyId)` already exists in `loginNotification.ts`
- 72-hour duration defined as `FLEEING_MODE_DURATION_MS`
- Fleeing mode stored as `families/{familyId}/fleeingModeActivatedAt`

### Sprint Status Note

"Mostly covered in 41-5" - Story 41-5 already:

- Implemented `isInFleeingMode()` function
- Suppresses location in login notifications
- Defines 72-hour fleeing mode duration

What remains for 41-8:

- Suppress location_transition notifications in onLocationUpdate
- Create dedicated safety audit logging (separate from family audit)
- Create 72-hour expiry notification with neutral wording

### Security Considerations

- Safety audit logs MUST be separate from family audit trail
- No Firestore rules allowing family members to read safety logs
- Neutral wording in expiry notification prevents revealing fleeing mode was used
- Location data still captured during fleeing mode (for safety investigation if needed)

### Notification Types to Suppress

```typescript
const FLEEING_MODE_SUPPRESSED_TYPES = [
  'location_transition',
  'geofence_entry',
  'geofence_exit',
  'location_paused',
  'location_disabled',
  'location_zone_change',
] as const
```

### Neutral Expiry Notification Wording

```typescript
const EXPIRY_NOTIFICATION = {
  title: 'Location Settings',
  body: 'Location features paused - tap to review settings',
  // No mention of: fleeing mode, safety, 72 hours, activation
}
```

### Firestore Security Rules

```javascript
// Safety audit - NOT accessible to families
match /safetyAudit/{familyId}/fleeingModeLogs/{logId} {
  allow read, write: if false; // Only Cloud Functions access
}
```

### References

- [Source: docs/epics/epic-list.md#story-418-fleeing-mode-notification-suppression]
- [Source: apps/functions/src/lib/notifications/loginNotification.ts] - isInFleeingMode
- [Source: apps/functions/src/triggers/onLocationUpdate.ts] - Location trigger
- [Source: Story 40.3: Fleeing Mode Safe Escape] - Fleeing mode foundation

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- apps/functions/src/lib/safety/fleeingModeAudit.ts (new)
- apps/functions/src/lib/safety/fleeingModeAudit.test.ts (new)
- apps/functions/src/lib/safety/index.ts (new)
- apps/functions/src/lib/notifications/fleeingModeSuppressions.ts (new)
- apps/functions/src/lib/notifications/fleeingModeSuppressions.test.ts (new)
- apps/functions/src/lib/notifications/index.ts (modified)
- apps/functions/src/triggers/onLocationUpdate.ts (modified)
- apps/functions/src/scheduled/sendSafeEscapeNotifications.ts (modified)
