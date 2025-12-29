# Story 12.3: Device-to-Device Enrollment Approval

Status: done

## Story

As a **parent with existing family device**,
I want **to approve new device enrollment from my phone/computer**,
So that **I can verify the enrollment is legitimate**.

## Acceptance Criteria

1. **AC1: Enrollment Request Submission**
   - Given a new device scans enrollment QR code (from Story 12.2)
   - When QR validation succeeds
   - Then extension sends enrollment approval request to server
   - And request includes: familyId, token, deviceInfo (type, platform)
   - And request is stored in Firestore for processing

2. **AC2: Parent Notification**
   - Given enrollment request is submitted
   - When request is stored in Firestore
   - Then notification is sent to existing family devices
   - And dashboard shows pending enrollment alert
   - And notification includes: device type, timestamp

3. **AC3: Approval Interface**
   - Given parent views pending enrollment request
   - When they access the dashboard
   - Then approval interface shows: device type, location (if available), timestamp
   - And parent can click "Approve" to allow enrollment
   - And parent can click "Reject" to deny enrollment

4. **AC4: Approval Expiry**
   - Given an approval request is pending
   - When 10 minutes passes without response
   - Then request automatically expires
   - And extension shows "Approval timed out" message
   - And user can scan QR code again to retry

5. **AC5: Rejection Handling**
   - Given parent clicks "Reject" on enrollment request
   - When rejection is processed
   - Then extension receives rejection notification
   - And extension clears pending enrollment state
   - And shows "Enrollment rejected - contact family admin" message
   - And user can scan new QR code to retry

6. **AC6: Approval Success**
   - Given parent clicks "Approve" on enrollment request
   - When approval is processed
   - Then extension receives approval notification
   - And proceeds to device registration (Story 12.4)
   - And pending enrollment state transitions to 'enrolled'

## Tasks / Subtasks

- [x] Task 1: Enrollment Request Data Model (AC: #1)
  - [x] 1.1 Create `EnrollmentRequest` interface in extension
  - [x] 1.2 Create `enrollmentRequests` subcollection under families
  - [x] 1.3 Define request document structure: familyId, token, deviceInfo, status, createdAt, expiresAt
  - [x] 1.4 Add Firestore security rules for enrollment requests

- [x] Task 2: Extension Request Submission (AC: #1)
  - [x] 2.1 Create `submitEnrollmentRequest()` function in extension
  - [x] 2.2 Gather device info (userAgent, platform, browser)
  - [x] 2.3 Call Cloud Function to create enrollment request
  - [x] 2.4 Handle submission errors (network, auth, validation)
  - [x] 2.5 Update popup UI to show "Waiting for approval" state

- [x] Task 3: Cloud Function for Request Processing (AC: #1, #2)
  - [x] 3.1 Create `submitEnrollmentRequest` callable function
  - [x] 3.2 Validate enrollment token against Firestore
  - [x] 3.3 Create enrollment request document with 10-minute expiry
  - [x] 3.4 Return request ID for extension to listen on

- [x] Task 4: Dashboard Approval UI (AC: #2, #3)
  - [x] 4.1 Create `EnrollmentApprovalModal` component
  - [x] 4.2 Add real-time listener for pending enrollment requests
  - [x] 4.3 Display device type, timestamp, and action buttons
  - [x] 4.4 Show pending enrollment badge/notification on dashboard
  - [x] 4.5 Add approve/reject button handlers

- [x] Task 5: Approval/Rejection Processing (AC: #5, #6)
  - [x] 5.1 Create `approveEnrollment` callable function
  - [x] 5.2 Create `rejectEnrollment` callable function
  - [x] 5.3 Update request document status on action
  - [x] 5.4 Mark enrollment token as used on approval

- [x] Task 6: Extension Approval Listening (AC: #4, #5, #6)
  - [x] 6.1 Create Firestore listener for request status changes
  - [x] 6.2 Handle 'approved' status - proceed to registration
  - [x] 6.3 Handle 'rejected' status - show message, clear state
  - [x] 6.4 Handle 'expired' status - show timeout message
  - [x] 6.5 Implement polling fallback for offline-first reliability

- [x] Task 7: Request Expiry Automation (AC: #4)
  - [x] 7.1 Create scheduled Cloud Function for expiring old requests
  - [x] 7.2 Set request expiresAt to createdAt + 10 minutes
  - [x] 7.3 Query and expire requests past their expiresAt
  - [x] 7.4 Run every 1 minute to ensure timely expiry

- [x] Task 8: Unit Tests
  - [x] 8.1 Test enrollment request submission
  - [x] 8.2 Test approval flow
  - [x] 8.3 Test rejection flow
  - [x] 8.4 Test expiry handling
  - [x] 8.5 Test security rules for enrollment requests

## Dev Notes

### Implementation Strategy

This story implements the device-to-device approval flow, connecting the extension QR scanning (Story 12.2) to the Firestore enrollment system (Story 12.1). The flow ensures secure enrollment by requiring existing family member approval.

The enrollment approval flow:

1. Extension scans QR → validates payload (Story 12.2)
2. Extension calls Cloud Function with pending enrollment data
3. Cloud Function validates token, creates enrollment request document
4. Dashboard shows pending approval notification to parents
5. Parent approves/rejects via dashboard
6. Extension listens for status change and proceeds accordingly

### Key Requirements

- **FR7:** Device enrollment
- **FR11:** QR code-based enrollment
- **FR12:** Family-device association
- **NFR42:** Security - approval flow prevents unauthorized enrollment

### Technical Details

#### Enrollment Request Document Structure

```typescript
interface EnrollmentRequest {
  id: string // Document ID
  familyId: string // Family being enrolled into
  token: string // Enrollment token from QR code
  deviceInfo: {
    type: 'chromebook'
    platform: string // e.g., 'Chrome OS', 'Windows', 'macOS'
    userAgent: string // Browser user agent
  }
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  createdAt: Timestamp
  expiresAt: Timestamp // createdAt + 10 minutes
  approvedBy?: string // UID of approving parent
  approvedAt?: Timestamp
  rejectedBy?: string
  rejectedAt?: string
}
```

#### Firestore Path

```
/families/{familyId}/enrollmentRequests/{requestId}
```

#### Cloud Functions Needed

```typescript
// Submit enrollment request from extension
export const submitEnrollmentRequest = functions.https.onCall(async (data, context) => {
  // Validate token exists and is active
  // Create enrollment request document
  // Return request ID for client listening
})

// Approve enrollment from dashboard
export const approveEnrollment = functions.https.onCall(async (data, context) => {
  // Verify caller is family parent
  // Update request status to 'approved'
  // Mark enrollment token as used
})

// Reject enrollment from dashboard
export const rejectEnrollment = functions.https.onCall(async (data, context) => {
  // Verify caller is family parent
  // Update request status to 'rejected'
})

// Scheduled function for request expiry
export const expireEnrollmentRequests = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async () => {
    // Query requests past expiresAt with status 'pending'
    // Update status to 'expired'
  })
```

#### Extension State Changes

```typescript
// Update pending enrollment with request tracking
interface EnrollmentPending {
  familyId: string
  token: string
  scannedAt: number
  requestId?: string // Added after submission
  requestStatus?: 'pending' | 'approved' | 'rejected' | 'expired'
}
```

#### Security Rules for Enrollment Requests

```javascript
// Firestore rules for enrollmentRequests
match /families/{familyId}/enrollmentRequests/{requestId} {
  // Only authenticated users can read
  allow read: if request.auth != null;

  // Only Cloud Functions can write (service account)
  allow write: if false;
}
```

### Project Structure Notes

- Cloud Functions: `apps/functions/src/enrollment/`
- Extension listener: `apps/extension/src/enrollment-listener.ts`
- Dashboard component: `apps/web/src/components/devices/EnrollmentApprovalModal.tsx`
- Use existing popup state patterns from Story 12.2
- Follow existing Cloud Function patterns from `apps/functions/src/`

### References

- [Source: docs/epics/epic-list.md#Story-12.3]
- [Pattern: apps/extension/src/popup.ts - state management]
- [Pattern: apps/extension/src/background.ts - message handlers]
- [Pattern: apps/web/src/services/enrollmentService.ts - token management]
- [Dependency: Story 12.2 - Extension QR scanning provides pending enrollment]
- [Dependency: Story 12.1 - Token validation via enrollmentService]

### Previous Story Intelligence

From Story 12.2:

- `EnrollmentPending` interface stores scanned QR data
- Popup shows "Pending Enrollment" state after successful scan
- Background message handlers: SET_PENDING_ENROLLMENT, GET_ENROLLMENT_STATE
- Extension already transitions to pending state after QR validation

From Story 12.1:

- Tokens stored in `/families/{familyId}/enrollmentTokens`
- Token validation via `validateEnrollmentToken()` function
- `markTokenAsUsed()` function marks token after successful enrollment

### Git Intelligence

Recent commits show:

- Story 12.2 complete - Extension QR scanning with pending state
- Story 12.1 complete - Token generation and validation
- Cloud Functions structure exists in apps/functions/

## Dev Agent Record

### Context Reference

Story 12.2 completed - Extension stores pending enrollment after QR scan

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Cloud Functions implemented with proper auth/validation/permission/business logic pattern
- Extension uses polling approach for status updates (more reliable than Firestore listeners in MV3)
- Dashboard uses real-time Firestore listener for instant notification of new requests
- 10-minute expiry implemented via both expiresAt field and scheduled cleanup function
- Token is marked as "used" only on approval, allowing retry on rejection/expiry

### Code Review Fixes Applied

- Added missing `getEnrollmentRequestStatus` HTTP endpoint for extension polling
- Fixed scalability issue in `expireEnrollmentRequests` - now uses collection group query with batching
- Added 404 error handling in polling to stop on deleted requests
- Replaced console.log with structured logger for Cloud Functions
- Made FUNCTIONS_BASE_URL configurable for testing

### File List

- `apps/functions/src/callable/enrollment.ts` - Cloud Functions for enrollment approval
- `apps/functions/src/callable/enrollment.test.ts` - Unit tests for Cloud Functions
- `apps/functions/src/index.ts` - Export new enrollment functions
- `apps/extension/src/enrollment-service.ts` - Extension enrollment API
- `apps/extension/src/enrollment-service.test.ts` - Unit tests for enrollment service
- `apps/extension/src/popup.ts` - Integrated enrollment submission and polling
- `apps/extension/src/background.ts` - Extended enrollment state with request tracking
- `apps/web/src/components/devices/EnrollmentApprovalModal.tsx` - Dashboard approval UI
- `apps/web/src/hooks/useEnrollmentRequests.ts` - Real-time Firestore listener hook
- `apps/web/src/components/devices/index.ts` - Export new components
- `apps/web/src/lib/firebase.ts` - Added getFunctionsInstance export
