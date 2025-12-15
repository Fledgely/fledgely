# Story 0.5.5: Remote Device Unenrollment

**Status:** done

---

## Story

As a **support agent**,
I want **to remotely unenroll specific devices from monitoring without notification**,
So that **escaped devices immediately stop reporting to the family**.

---

## Acceptance Criteria

### AC1: Device Unenrollment Command
**Given** a support agent is processing an escape request
**When** they request silent unenrollment of specified device(s)
**Then** online devices receive unenrollment command within 60 seconds
**And** the command is executed via a secure admin Cloud Function

### AC2: Immediate Capture Cessation
**Given** a device receives the unenrollment command
**When** the command is processed
**Then** the device stops capturing and uploading immediately upon receipt
**And** no further screenshots or activity data is collected

### AC3: Local Data Deletion
**Given** a device is being unenrolled
**When** the unenrollment command is processed
**Then** the device deletes local cached screenshots and queue
**And** any pending uploads are cancelled and removed
**And** local enrollment credentials are cleared

### AC4: Offline Device Queueing
**Given** a device is offline when unenrollment is requested
**When** the device next connects to the network
**Then** the device receives the queued unenrollment command
**And** executes all unenrollment steps as if received in real-time

### AC5: Silent Unenrollment Operation
**Given** a support agent executes device unenrollment
**When** the operation completes
**Then** no notification is sent about unenrollment to any family member
**And** no email, push notification, or in-app message is triggered
**And** no family audit trail entry is created

### AC6: Device Status Update
**Given** a device has been unenrolled
**When** the unenrollment completes
**Then** device monitoring indicator changes to "not monitored"
**And** child sees "Device no longer monitored" (neutral message)
**And** device status in family dashboard shows inactive/removed

### AC7: Sealed Admin Audit
**Given** a device unenrollment action is executed
**When** the operation is logged
**Then** the unenrollment action is logged in sealed admin audit only
**And** log includes: agent ID, device ID, family ID, safety request ID, timestamp
**And** audit entry is NOT visible in any family-accessible query

---

## Tasks / Subtasks

### Task 1: Create Device Unenrollment Cloud Function (AC: #1, #5, #7)
- [x] 1.1 Create callable function `unenrollDevice` in `apps/functions/src/callable/`
- [x] 1.2 Accept input: requestId, deviceId, familyId, childId, reason
- [x] 1.3 Validate caller has safety-team role (via custom claims)
- [x] 1.4 Validate safety request exists and is verified
- [x] 1.5 Validate device belongs to specified family/child
- [x] 1.6 Set device status to `unenrolled` with unenrollment timestamp
- [x] 1.7 Create unenrollment command in `deviceCommands` collection
- [x] 1.8 Log to adminAuditLog with sealed=true flag
- [x] 1.9 **CRITICAL**: Do NOT trigger any notifications
- [x] 1.10 **CRITICAL**: Do NOT log to family audit trail
- [x] 1.11 Return success with device confirmation

### Task 2: Create Device Commands Data Model (AC: #1, #4)
- [x] 2.1 Define `deviceCommands` collection schema with Zod
- [x] 2.2 Create command structure: { deviceId, command: 'unenroll', issuedAt, executedAt?, source }
- [x] 2.3 Add TTL field for automatic command expiration (7 days)
- [x] 2.4 Create query pattern for device to fetch pending commands
- [x] 2.5 Index for efficient device-based queries

### Task 3: Update Device Data Model (AC: #6)
- [x] 3.1 Add `unenrolledAt` and `unenrolledBy` fields to device schema
- [x] 3.2 Add `unenrollmentReason` field (sealed - not visible to family)
- [x] 3.3 Add `status` enum: 'active' | 'offline' | 'unenrolled'
- [x] 3.4 Ensure unenrolled devices cannot re-enroll without explicit re-enrollment flow

### Task 4: Implement Bulk Unenrollment Support (AC: #1)
- [x] 4.1 Create `unenrollDevices` function for multiple devices
- [x] 4.2 Accept array of deviceIds with same safety request
- [x] 4.3 Execute unenrollments in batch (Firestore batch write)
- [x] 4.4 Return status for each device (success/failure)
- [x] 4.5 Log single sealed audit entry for bulk operation

### Task 5: Add Device Unenrollment UI to Admin Dashboard (AC: #1)
- [x] 5.1 Add "Unenroll Devices" button to SafetyRequestDetail page
- [x] 5.2 Create device selection interface (list devices for family/child)
- [x] 5.3 Add confirmation dialog with safety warnings
- [x] 5.4 Add reason input field
- [x] 5.5 Display success confirmation after unenrollment
- [x] 5.6 Disable button if request not verified

### Task 6: Implement Sealed Audit Logging (AC: #7)
- [x] 6.1 Reuse `sealed` boolean field pattern from Story 0.5.4
- [x] 6.2 Add device-specific audit fields: deviceId, deviceType, childId
- [x] 6.3 Add timestamp hash for integrity verification (SHA-256)

### Task 7: Write Tests (All AC)
- [x] 7.1 Unit tests for input validation
- [x] 7.2 Integration tests for unenrollDevice function
- [x] 7.3 Test device command creation for online devices
- [x] 7.4 Test device command queueing for offline devices
- [x] 7.5 Test bulk unenrollment
- [x] 7.6 Test that NO notifications are sent
- [x] 7.7 Test that NO family audit trail entries created
- [x] 7.8 Security tests: verify non-safety-team access denied
- [x] 7.9 Test sealed audit entry creation
- [x] 7.10 Test device status transitions

---

## Dev Notes

### Critical Safety Requirements
This is a **life-safety feature**. Implementation errors could endanger abuse victims OR leave monitoring active on escaped devices. Key invariants:

1. **NEVER** notify any family member about unenrollment
2. **NEVER** log to family audit trail
3. **NEVER** show "Device was removed by admin" or similar revealing message
4. **ALWAYS** require safety-team verification before unenrolling
5. **ALWAYS** queue commands for offline devices
6. **ALWAYS** seal the audit entry for compliance access only
7. **ENSURE** complete local data deletion on device

### Architecture Patterns

**Device Data Model (for unenrollment):**
```typescript
// Firestore path: /devices/{deviceId}
interface Device {
  id: string
  familyId: string
  childId: string
  platform: 'chromebook' | 'android' | 'ios' | 'windows' | 'macos'
  enrolledAt: Timestamp
  lastSeen: Timestamp
  status: 'active' | 'offline' | 'unenrolled'
  // Unenrollment fields (added by this story)
  unenrolledAt?: Timestamp      // When unenrolled
  unenrolledBy?: string         // Admin agent ID who unenrolled
  unenrollmentSource?: 'safety-request' | 'user-request'
  // Note: unenrollmentReason stored in sealed audit only
}
```

**Device Command Model:**
```typescript
// Firestore path: /deviceCommands/{commandId}
interface DeviceCommand {
  id: string
  deviceId: string
  command: 'unenroll' | 'sync-config' | 'clear-cache'
  issuedAt: Timestamp
  executedAt?: Timestamp
  expiresAt: Timestamp          // TTL: issuedAt + 7 days
  source: 'safety-request' | 'admin' | 'system'
  safetyRequestId?: string      // If from safety request
  sealed: boolean               // If true, not visible in standard queries
}
```

**Unenrollment Cloud Function Input:**
```typescript
const unenrollDeviceInputSchema = z.object({
  requestId: z.string().min(1),
  deviceId: z.string().min(1),
  familyId: z.string().min(1),
  childId: z.string().min(1),
  reason: z.string().min(20).max(5000),
})
```

**Sealed Admin Audit Entry:**
```typescript
// /adminAuditLog/{entryId}
interface SealedAuditEntry {
  id: string
  action: 'device-unenrollment'
  resourceType: 'device'
  resourceId: string            // deviceId
  performedBy: string           // Agent UID
  affectedChildId: string
  familyId: string
  safetyRequestId: string
  reason: string
  deviceType: string            // platform
  timestamp: FieldValue
  sealed: true
  integrityHash: string
}
```

### Naming Conventions
- Function: `unenrollDevice`, `unenrollDevices` (camelCase)
- UI Component: `UnenrollDeviceDialog.tsx` (PascalCase)
- Audit action: `device-unenrollment` (kebab-case)
- Field: `unenrolledAt`, `unenrolledBy` (camelCase)
- Collection: `deviceCommands` (camelCase)

### Project Structure Notes

**Files to Create:**
```
apps/functions/src/callable/unenrollDevice.ts       # Cloud Function
apps/functions/src/callable/unenrollDevice.test.ts  # Tests
apps/web/src/components/admin/UnenrollDeviceDialog.tsx  # UI component
```

**Files to Modify:**
```
apps/functions/src/index.ts                          # Export new function
apps/web/src/app/(admin)/safety-requests/[id]/page.tsx  # Add unenroll button
apps/web/src/lib/admin-api.ts                        # Add unenroll API call
```

### Previous Story Intelligence (Story 0.5.4)

**Patterns Established:**
- Safety-team role REQUIRED (admin alone NOT sufficient)
- Zod schema validation with 20-char minimum reason
- Sealed admin audit logging with integrity hash
- No family audit trail entries
- No notifications of any kind
- Sanitized error logging (errorId, no sensitive data)
- UI with multi-step confirmation dialog
- Truncated IDs in success messages

**Code to Reuse:**
- `severParentAccess.ts` - Pattern for admin callable function
- `SeverParentDialog.tsx` - Pattern for confirmation dialog
- Sealed audit logging pattern
- Error handling with errorId generation

### Device Command Polling (Client-Side Note)
The actual device agents (Chromebook extension, Android app) will need to:
1. Poll `/deviceCommands` filtered by deviceId
2. Execute `unenroll` command when received
3. Delete local data
4. Clear enrollment credentials
5. Show "Device no longer monitored" message
6. Mark command as executed

**Note:** Client-side implementation is out of scope for this story but the command structure must support it.

### Testing Standards

**Required Tests:**
1. Schema validation for unenroll input (unit)
2. Cloud Function unenrolls correctly (integration)
3. Device command created (integration)
4. Bulk unenrollment works (integration)
5. No notification triggered (integration - critical)
6. No family audit entry (integration - critical)
7. Sealed admin audit created (integration)
8. Device status updated to unenrolled (integration)
9. UI confirmation dialog works (E2E - if time permits)

**Adversarial Tests:**
1. Non-safety-team cannot execute unenrollment
2. Cannot unenroll non-existent device
3. Cannot unenroll device not in specified family
4. Cannot unenroll without verified safety request
5. Cannot unenroll already-unenrolled device

---

### References

- [Source: docs/epics/epic-list.md#Story-0.5.5] - Original story requirements
- [Source: docs/sprint-artifacts/stories/0-5-4-parent-access-severing.md] - Previous story patterns
- [Source: docs/architecture/project-context-analysis.md#SA4] - Insider threat mitigations
- [Source: docs/architecture/project-context-analysis.md] - Device data model context
- [Source: docs/project_context.md] - Cloud Functions template patterns

---

## Dev Agent Record

### Context Reference
- Story context: docs/sprint-artifacts/stories/0-5-5-remote-device-unenrollment.md
- Previous stories: 0.5.1, 0.5.2, 0.5.3, 0.5.4

### Agent Model Used
{{agent_model_name_version}}

### Debug Log References
<!-- Will be populated during implementation -->

### Completion Notes List
- This is Story 5 of 9 in Epic 0.5 (Safe Account Escape)
- Builds on patterns from Story 0.5.4 (Parent Access Severing)
- Device command model enables future device management features
- Client-side polling implementation deferred to device agent epics
- Bulk unenrollment enables efficient multi-device escape scenarios

### File List
**Created:**
- `apps/functions/src/callable/unenrollDevice.ts` - Cloud Function for device unenrollment
- `apps/functions/src/callable/unenrollDevice.test.ts` - Comprehensive tests (31 tests)
- `apps/web/src/components/admin/UnenrollDeviceDialog.tsx` - UI dialog component

**Modified:**
- `apps/functions/src/index.ts` - Added exports for unenrollDevice, unenrollDevices
- `apps/web/src/lib/admin-api.ts` - Added API functions and types
- `apps/web/src/app/(admin)/safety-requests/[id]/page.tsx` - Added unenrollment UI section
- `docs/sprint-artifacts/sprint-status.yaml` - Updated story status to in-progress
