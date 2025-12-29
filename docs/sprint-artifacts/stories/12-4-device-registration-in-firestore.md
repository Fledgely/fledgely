# Story 12.4: Device Registration in Firestore

Status: done

## Story

As **the system**,
I want **to register the enrolled device in Firestore**,
So that **the device is part of the family's device list**.

## Acceptance Criteria

1. **AC1: Device Document Creation**
   - Given enrollment is approved
   - When registration completes
   - Then device document created in `/families/{familyId}/devices`

2. **AC2: Device Document Data**
   - Given device document is created
   - When document is stored
   - Then document includes: deviceId, type (chromebook), enrolledAt, enrolledBy
   - And device is associated with specific child (or unassigned initially)

3. **AC3: Device Credentials**
   - Given device is registered
   - When registration completes
   - Then extension receives device credentials for API authentication

4. **AC4: Credential Storage**
   - Given extension receives credentials
   - When credentials are received
   - Then extension stores credentials securely in chrome.storage.local

5. **AC5: Dashboard Refresh**
   - Given device is registered
   - When registration completes
   - Then enrollment success triggers dashboard device list refresh

## Tasks / Subtasks

- [x] Task 1: Device Registration Cloud Function (AC: #1, #2, #3)
  - [x] 1.1 Create `registerDevice` callable function
  - [x] 1.2 Verify enrollment request is approved
  - [x] 1.3 Generate unique deviceId
  - [x] 1.4 Create device document in `/families/{familyId}/devices`
  - [x] 1.5 Store: deviceId, type, enrolledAt, enrolledBy, childId (null initially)
  - [x] 1.6 Generate device API credentials (Firebase custom token or similar)
  - [x] 1.7 Return deviceId and credentials to extension

- [x] Task 2: Extension Registration Handler (AC: #3, #4)
  - [x] 2.1 Modify popup.ts to detect approval status change
  - [x] 2.2 Call registerDevice Cloud Function on approval
  - [x] 2.3 Store deviceId in chrome.storage.local
  - [x] 2.4 Store credentials in chrome.storage.local
  - [x] 2.5 Update enrollment state to 'enrolled'

- [x] Task 3: Background State Updates (AC: #4)
  - [x] 3.1 Add deviceId to ExtensionState interface
  - [x] 3.2 Add credentials to ExtensionState interface
  - [x] 3.3 Update state on registration completion
  - [x] 3.4 Persist state changes to chrome.storage.local

- [x] Task 4: Dashboard Device List (AC: #5)
  - [x] 4.1 Create useDevices hook with real-time Firestore listener
  - [x] 4.2 Display devices in dashboard Devices section
  - [x] 4.3 Show device type, enrolled date, assigned child
  - [x] 4.4 Add empty state for no devices

- [x] Task 5: Unit Tests
  - [x] 5.1 Test registerDevice Cloud Function
  - [x] 5.2 Test device document creation
  - [x] 5.3 Test credential generation
  - [x] 5.4 Test extension registration flow

## Dev Notes

### Implementation Strategy

This story completes the enrollment flow by registering the device in Firestore after approval. The device credentials enable authenticated API calls from the extension.

The flow:

1. Extension polling detects approval (from Story 12.3)
2. Extension calls registerDevice Cloud Function
3. Cloud Function creates device document
4. Cloud Function generates device credentials
5. Extension stores credentials locally
6. Dashboard sees new device via real-time listener

### Key Requirements

- **FR7:** Device enrollment
- **FR12:** Family-device association
- **NFR42:** Security - credentials stored securely

### Technical Details

#### Device Document Schema

```
/families/{familyId}/devices/{deviceId}
{
  deviceId: string           // Auto-generated unique ID
  type: 'chromebook' | 'android'
  enrolledAt: Timestamp
  enrolledBy: string         // UID of approving parent
  childId: string | null     // Initially null, assigned in Story 12.5
  name: string               // Device name (e.g., "Emma's Chromebook")
  lastSeen: Timestamp        // Updated on each sync
  status: 'active' | 'offline' | 'unenrolled'
  metadata: {
    platform: string
    userAgent: string
    enrollmentRequestId: string
  }
}
```

#### Extension State Updates

```typescript
interface ExtensionState {
  // ... existing fields
  deviceId: string | null // New: registered device ID
  deviceCredentials: {
    // New: API credentials
    token: string
    expiresAt: number
  } | null
}
```

### Project Structure Notes

- Follow Cloud Functions pattern from Story 12.3
- Follow extension state pattern from background.ts
- Use real-time Firestore listener pattern from useEnrollmentRequests.ts

### References

- [Source: docs/epics/epic-list.md#Story-12.4]
- [Pattern: apps/functions/src/callable/enrollment.ts]
- [Pattern: apps/extension/src/background.ts]
- [Pattern: apps/web/src/hooks/useEnrollmentRequests.ts]

### Previous Story Intelligence

From Story 12.3:

- Enrollment approval Cloud Functions implemented
- Extension polling for status changes
- getEnrollmentRequestStatus endpoint available
- Real-time Firestore listeners for dashboard

## Dev Agent Record

### Context Reference

Story 12.3 completed - Enrollment approval workflow functional

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None

### Completion Notes List

- Created registerDevice HTTP endpoint in Cloud Functions with CORS support
- Added Device interface matching Firestore document schema
- Extended enrollment-service.ts with registerDevice client function
- Updated popup.ts to call registerDevice after approval detection
- Added ENROLLMENT_COMPLETE message handler in background.ts
- Extended ExtensionState with deviceId field
- Created useDevices hook with real-time Firestore listener
- Created DevicesList component for dashboard display
- Updated dashboard to show enrolled devices
- Added 20 unit tests (8 extension + 12 functions)
- All 136 extension tests pass
- All 90 functions tests pass
- Build successful

### File List

- apps/functions/src/callable/enrollment.ts (modified - added registerDevice, Device interface)
- apps/functions/src/index.ts (modified - export registerDevice)
- apps/functions/src/callable/enrollment.test.ts (modified - added 12 tests)
- apps/extension/src/enrollment-service.ts (modified - added registerDevice function)
- apps/extension/src/enrollment-service.test.ts (modified - added 8 tests)
- apps/extension/src/popup.ts (modified - register device on approval)
- apps/extension/src/background.ts (modified - ENROLLMENT_COMPLETE handler, deviceId state)
- apps/web/src/hooks/useDevices.ts (new - real-time Firestore listener)
- apps/web/src/components/devices/DevicesList.tsx (new - device list display)
- apps/web/src/components/devices/index.ts (modified - export DevicesList)
- apps/web/src/app/dashboard/page.tsx (modified - use DevicesList)
