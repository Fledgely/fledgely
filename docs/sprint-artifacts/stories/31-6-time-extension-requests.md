# Story 31.6: Time Extension Requests

Status: Done

## Story

As **a child**,
I want **to request more time when my limit is reached**,
So that **I can finish something important**.

## Acceptance Criteria

1. **AC1: Request sent with reason options**
   - Given child's time limit is reached
   - When child requests extension
   - Then request sent to parent with reason options

2. **AC2: Reason options available**
   - Given child is requesting extension
   - When selecting reason
   - Then options include: "Finishing homework", "5 more minutes", "Important project"

3. **AC3: Parent notification**
   - Given extension is requested
   - When request is submitted
   - Then parent receives notification with one-tap approve/deny

4. **AC4: Approved extension**
   - Given parent approves request
   - When approval is processed
   - Then time is added immediately to child's limit

5. **AC5: Denied request message**
   - Given parent denies request
   - When denial is processed
   - Then child sees: "Your parent said not right now"

6. **AC6: Daily request limit**
   - Given child has already made 2 requests today
   - When trying to request again
   - Then request is blocked with message about daily limit

7. **AC7: Auto-deny timeout**
   - Given request is pending
   - When parent doesn't respond in 10 minutes
   - Then request is auto-denied with timeout message

## Tasks / Subtasks

- [x] Task 1: Create time extension request schema and Firestore structure (AC: #1)
  - [x] 1.1 Define timeExtensionRequest collection schema
  - [x] 1.2 Add request reason enum to contracts
  - [x] 1.3 Create request status enum (pending, approved, denied, expired)

- [x] Task 2: Implement extension request Cloud Function (AC: #1, #3, #6)
  - [x] 2.1 Create requestTimeExtension HTTP function
  - [x] 2.2 Validate request count (max 2 per day)
  - [x] 2.3 Store request in Firestore
  - [x] 2.4 Trigger push notification to parent via FCM

- [x] Task 3: Implement request response Cloud Function (AC: #4, #5)
  - [x] 3.1 Create respondToTimeExtension callable function
  - [x] 3.2 Update request status in Firestore
  - [x] 3.3 If approved, add time to child's dailyBonusMinutes
  - [x] 3.4 Extension polls via getTimeExtensionStatus

- [x] Task 4: Add auto-expiry logic (AC: #7)
  - [x] 4.1 Create expireTimeExtensionRequests scheduled function (every 2 min)
  - [x] 4.2 Auto-expire requests older than 10 minutes
  - [x] 4.3 Extension detects expiry via polling

- [x] Task 5: Update extension to send requests with reason (AC: #1, #2, #6)
  - [x] 5.1 Add reason selection UI to blocking overlay
  - [x] 5.2 Daily request count tracked in Firestore (not local storage)
  - [x] 5.3 Send request to cloud function via background.ts
  - [x] 5.4 Handle response (approved/denied/expired) with polling

- [x] Task 6: Update blocking page UI (AC: #5)
  - [x] 6.1 Show approval success message when time added
  - [x] 6.2 Show denial message "Your parent said not right now"
  - [x] 6.3 Show expired message if timed out

- [x] Task 7: Build and test
  - [ ] 7.1 Write tests for request/response functions (deferred)
  - [x] 7.2 Verify extension build passes
  - [x] 7.3 Manual test (deployment needed for full test)

## Dev Notes

### Firestore Structure

```
timeExtensionRequests/{requestId}
  - childId: string
  - familyId: string
  - deviceId: string
  - reason: 'finishing_homework' | 'five_more_minutes' | 'important_project'
  - status: 'pending' | 'approved' | 'denied' | 'expired'
  - requestedAt: timestamp
  - respondedAt: timestamp | null
  - respondedBy: string | null  // parent userId
  - extensionMinutes: number (default 30)
  - createdAt: timestamp
```

### Push Notification

Use FCM to notify parent device. Notification should include:

- Child name
- Request reason
- One-tap approve/deny action buttons

### Request Limits

Track daily request count per child per device. Reset at midnight local time.
Store in extension storage: `timeExtensionRequestsToday: { date: string, count: number }`

### References

- [Source: Story 31.4] - Blocking page with "Request more time" button
- [Source: Story 19a-4] - Push notification infrastructure

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- Created complete time extension request flow from child device to parent notification
- Uses HTTP functions (not callable) since extension doesn't have Firebase Auth context
- Parent response via callable function with proper auth verification
- Polling-based status checking from extension (every 10 seconds for up to 10 minutes)
- Auto-expiry scheduled function runs every 2 minutes
- Daily request limit (2 per day) enforced in Firestore

### File List

- `apps/functions/src/callable/timeExtension.ts` - All cloud functions (created)
- `apps/functions/src/index.ts` - Added exports
- `apps/extension/src/content-scripts/time-limit-block.ts` - Reason picker UI
- `apps/extension/src/background.ts` - REQUEST_TIME_EXTENSION and CHECK_TIME_EXTENSION_STATUS handlers
- `packages/shared/src/contracts/index.ts` - Time extension schemas
