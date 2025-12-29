# Story 13.4: Brute Force Protection

Status: done

## Story

As **the system**,
I want **to prevent brute force attacks on emergency codes**,
So that **the unlock mechanism can't be easily bypassed**.

## Acceptance Criteria

1. **AC1: Three Failed Attempts - First Lockout**
   - Given emergency code entry is attempted
   - When 3 invalid codes are entered
   - Then 5-minute lockout is triggered
   - And code entry is disabled

2. **AC2: Six Failed Attempts - Extended Lockout**
   - Given user returns after first lockout
   - When 3 more invalid codes are entered (6 total)
   - Then 30-minute lockout is triggered

3. **AC3: Ten Failed Attempts - Maximum Lockout**
   - Given user returns after second lockout
   - When 4 more invalid codes are entered (10 total)
   - Then 24-hour lockout is triggered

4. **AC4: Lockout Persistence**
   - Given lockout is active
   - When app/browser restarts
   - Then lockout state persists
   - And timer continues from where it left off

5. **AC5: Lockout Timer Display**
   - Given lockout is active
   - When viewing emergency unlock page
   - Then countdown timer shows remaining lockout time
   - And timer updates in real-time

6. **AC6: Successful Unlock Resets Counter**
   - Given user has failed attempts
   - When valid code is entered
   - Then failure counter resets to 0

7. **AC7: Lockout Event Queuing**
   - Given lockout is triggered
   - When device is offline
   - Then lockout event is queued for parent notification
   - And event syncs when online

## Tasks / Subtasks

- [x] Task 1: Tiered Lockout Logic (AC: #1, #2, #3)
  - [x] 1.1 Implement getLockoutDuration(attemptCount) function
  - [x] 1.2 Apply 5-minute lockout at 3 attempts
  - [x] 1.3 Apply 30-minute lockout at 6 attempts
  - [x] 1.4 Apply 24-hour lockout at 10 attempts
  - [x] 1.5 Add unit tests for lockout thresholds

- [x] Task 2: Lockout Persistence (AC: #4)
  - [x] 2.1 Store lockout end timestamp in chrome.storage.local
  - [x] 2.2 Store attempt count persistently
  - [x] 2.3 Load and validate lockout state on page load
  - [x] 2.4 Handle expired lockouts correctly

- [x] Task 3: Lockout Timer Display (AC: #5)
  - [x] 3.1 Update lockout view with real-time countdown
  - [x] 3.2 Format timer as MM:SS or HH:MM:SS for long lockouts
  - [x] 3.3 Auto-refresh page when lockout expires

- [x] Task 4: Counter Reset on Success (AC: #6)
  - [x] 4.1 Clear attempt counter on successful unlock
  - [x] 4.2 Clear lockout state on successful unlock
  - [x] 4.3 Test reset behavior

- [x] Task 5: Lockout Event Queuing (AC: #7)
  - [x] 5.1 Create lockout_triggered event type
  - [x] 5.2 Queue event with: deviceId, timestamp, lockoutDuration, attemptCount
  - [x] 5.3 Queue persisted for sync when online
  - [x] 5.4 Background notified for parent notification

- [x] Task 6: Unit Tests (AC: #1-7)
  - [x] 6.1 Test tiered lockout thresholds
  - [x] 6.2 Test timer format (MM:SS and HH:MM:SS)
  - [x] 6.3 Test counter reset
  - [x] 6.4 Test lockout event structure

## Dev Notes

### Implementation Strategy

Story 13.3 added basic attempt tracking (3 attempts, 5-minute lockout). This story expands to a tiered system with escalating lockouts.

### Key Requirements

- **FR90:** Offline OTP device unlock (with protection)
- **NFR42:** Security - brute force prevention
- **NFR87:** 72-hour offline operation

### Technical Details

#### Tiered Lockout Thresholds

```typescript
function getLockoutDuration(attemptCount: number): number {
  if (attemptCount >= 10) return 24 * 60 * 60 * 1000 // 24 hours
  if (attemptCount >= 6) return 30 * 60 * 1000 // 30 minutes
  if (attemptCount >= 3) return 5 * 60 * 1000 // 5 minutes
  return 0 // No lockout
}
```

#### Storage Structure

```typescript
interface LockoutState {
  attemptCount: number
  lastAttempt: number
  lockoutEnd: number | null
}
```

#### Lockout Event Structure

```typescript
interface LockoutEvent {
  type: 'lockout_triggered'
  deviceId: string
  timestamp: number
  lockoutDuration: number // in ms
  attemptCount: number
}
```

### Project Structure Notes

- Enhance: `apps/extension/src/emergency-unlock.ts`
- Update constants and lockout logic
- All changes are within the extension

### References

- [Source: docs/epics/epic-list.md#Story-13.4]
- [Pattern: apps/extension/src/emergency-unlock.ts - existing attempt tracking]

### Previous Story Intelligence

From Story 13.3:

- Basic attempt tracking with 3 attempt threshold
- 5-minute lockout implemented
- Lockout state stored in chrome.storage.local
- LOCKOUT_STORAGE_KEY and ATTEMPTS_STORAGE_KEY defined

### Security Considerations

1. **Escalating lockouts**: Each tier makes brute force exponentially harder
2. **Persistence**: Lockouts survive app restart
3. **Event queuing**: Parents notified of suspicious activity
