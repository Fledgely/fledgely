# Story 13.5: Emergency Unlock Audit Trail

Status: done

## Story

As a **parent**,
I want **to see a record of emergency unlocks in the activity log**,
So that **I can have a conversation with my child about the unlock**.

## Acceptance Criteria

1. **AC1: Unlock Event Sync**
   - Given emergency unlock occurs on device
   - When device reconnects to network
   - Then unlock event is synced to Firestore audit log
   - And event includes: deviceId, timestamp, unlockType

2. **AC2: Security - No Code in Logs**
   - Given unlock event is synced
   - When event is written to audit log
   - Then event does NOT include the actual code used
   - And no code values are ever transmitted

3. **AC3: Lockout Event Sync**
   - Given lockout is triggered on device
   - When device reconnects to network
   - Then lockout event is synced to audit log
   - And event includes: deviceId, timestamp, attemptCount, lockoutDuration

4. **AC4: Parent Notification (Future)**
   - Given unlock/lockout event is synced
   - When event appears in dashboard
   - Then parent sees notification badge
   - And notification prompts conversation

5. **AC5: Queue Processing**
   - Given device has queued events
   - When network becomes available
   - Then all queued events are processed
   - And queue is cleared after successful sync

6. **AC6: Audit Log Display**
   - Given parent views activity log
   - When emergency unlock events exist
   - Then events display distinctly from normal activity
   - And show device name, date, time

## Tasks / Subtasks

- [x] Task 1: Queue Processing on Background (AC: #1, #3, #5)
  - [x] 1.1 Add checkAndSyncEventQueues function to background.ts
  - [x] 1.2 Process unlockEventQueue on connectivity restored
  - [x] 1.3 Process lockoutEventQueue on connectivity restored
  - [x] 1.4 Clear queue after successful sync

- [x] Task 2: Firestore Audit Log Integration (AC: #1, #2, #3)
  - [x] 2.1 Define auditLogs collection structure
  - [x] 2.2 Sync unlock events to /families/{familyId}/auditLogs
  - [x] 2.3 Sync lockout events to auditLogs
  - [x] 2.4 Verify no code values in synced events

- [x] Task 3: Connectivity Monitoring (AC: #5)
  - [x] 3.1 Add online/offline detection in background
  - [x] 3.2 Trigger queue sync when online detected
  - [x] 3.3 Handle sync failures gracefully

- [x] Task 4: Unit Tests
  - [x] 4.1 Test queue processing logic
  - [x] 4.2 Test event structure validation
  - [x] 4.3 Test connectivity detection

## Dev Notes

### Implementation Strategy

The unlock and lockout events are already queued in chrome.storage.local (from Stories 13.3 and 13.4). This story adds the sync mechanism to push those events to Firestore when the device comes back online.

### Key Requirements

- **FR90:** Offline OTP device unlock with audit trail
- **NFR42:** Security - no codes in logs
- **NFR87:** 72-hour offline operation

### Technical Details

#### Firestore Audit Log Structure

```typescript
// /families/{familyId}/auditLogs/{eventId}
interface AuditLogEntry {
  type: 'emergency_unlock' | 'lockout_triggered' | 'emergency_code_viewed'
  deviceId: string
  timestamp: Timestamp
  metadata: {
    unlockType?: 'totp'
    attemptCount?: number
    lockoutDuration?: number
  }
  // Note: NO code values ever stored
}
```

#### Queue Sync Function

```typescript
async function checkAndSyncEventQueues(): Promise<void> {
  if (!navigator.onLine) return

  // Process unlock events
  const unlockEvents = await getQueue('unlockEventQueue')
  for (const event of unlockEvents) {
    await syncEventToFirestore(event)
  }
  await clearQueue('unlockEventQueue')

  // Process lockout events
  const lockoutEvents = await getQueue('lockoutEventQueue')
  for (const event of lockoutEvents) {
    await syncEventToFirestore(event)
  }
  await clearQueue('lockoutEventQueue')
}
```

### Project Structure Notes

- Enhance: `apps/extension/src/background.ts` - add sync logic
- Storage keys: `unlockEventQueue`, `lockoutEventQueue`

### References

- [Source: docs/epics/epic-list.md#Story-13.5]
- [Pattern: apps/extension/src/emergency-unlock.ts - event queuing]
- [Pattern: apps/web/src/services/deviceService.ts - logEmergencyCodeView]

### Previous Story Intelligence

From Story 13.3:

- unlockEventQueue stores emergency_unlock events
- Events include: type, deviceId, timestamp, unlockType

From Story 13.4:

- lockoutEventQueue stores lockout_triggered events
- Events include: type, deviceId, timestamp, lockoutDuration, attemptCount

### Security Considerations

1. **No codes in transit**: Events never include actual TOTP codes
2. **Minimal metadata**: Only essential info for audit purposes
3. **Secure sync**: Uses authenticated Firebase connection
