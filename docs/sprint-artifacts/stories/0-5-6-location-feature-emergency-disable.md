# Story 0.5.6: Location Feature Emergency Disable

**Status:** done

---

## Story

As a **support agent**,
I want **to instantly disable all location-revealing features for escaped accounts/devices**,
So that **victims cannot be tracked through fledgely after escape**.

---

## Acceptance Criteria

### AC1: Location Feature Disable Activation
**Given** a support agent is processing an escape request
**When** they activate location feature disable
**Then** all location-related features are disabled immediately for affected accounts
**And** the operation is executed via a secure admin Cloud Function

### AC2: FR139 Location-Based Rules Disable
**Given** location feature disable is activated
**When** the disable command is processed
**Then** FR139 (location-based rules) is disabled immediately for affected accounts
**And** no location-based rule processing occurs for affected users

### AC3: FR145 Location-Based Work Mode Disable
**Given** location feature disable is activated
**When** the disable command is processed
**Then** FR145 (location-based work mode) is disabled immediately
**And** work mode no longer responds to location triggers

### AC4: FR160 New Location Alerts Disable
**Given** location feature disable is activated
**When** the disable command is processed
**Then** FR160 (new location alerts) is disabled immediately
**And** no location change notifications are generated for affected users

### AC5: Pending Location Notification Deletion
**Given** location feature disable is activated
**When** there are pending location-related notifications in the queue
**Then** all pending location notifications for affected accounts are deleted
**And** notifications are NOT delivered to any party

### AC6: Device Location Collection Stop
**Given** location feature disable is activated
**When** the disable command reaches devices
**Then** location data collection stops on affected devices within 60 seconds
**And** devices receive disable command via deviceCommands collection

### AC7: Historical Location Data Redaction
**Given** location feature disable is activated
**When** the disable completes
**Then** historical location data is redacted from family-visible logs
**And** location history entries are marked as sealed/redacted
**And** redaction is NOT visible as "deleted" (appears as if never existed)

### AC8: Silent Operation
**Given** a support agent executes location feature disable
**When** the operation completes
**Then** no notification is sent about the disable to any family member
**And** no email, push notification, or in-app message is triggered
**And** no family audit trail entry is created

### AC9: Sealed Admin Audit
**Given** a location feature disable action is executed
**When** the operation is logged
**Then** the disable action is logged in sealed admin audit only
**And** log includes: agent ID, family ID, affected user IDs, safety request ID, timestamp
**And** audit entry is NOT visible in any family-accessible query

---

## Tasks / Subtasks

### Task 1: Create Location Feature Disable Cloud Function (AC: #1, #8, #9)
- [x] 1.1 Create callable function `disableLocationFeatures` in `apps/functions/src/callable/`
- [x] 1.2 Accept input: requestId, familyId, targetUserId(s), reason
- [x] 1.3 Validate caller has safety-team role (via custom claims)
- [x] 1.4 Validate safety request exists and is verified
- [x] 1.5 Validate target users belong to specified family
- [x] 1.6 Create `locationFeatureDisable` document in family/user settings
- [x] 1.7 Log to adminAuditLog with sealed=true flag
- [x] 1.8 **CRITICAL**: Do NOT trigger any notifications
- [x] 1.9 **CRITICAL**: Do NOT log to family audit trail
- [x] 1.10 Return success with confirmation

### Task 2: Create Location Settings Data Model (AC: #2, #3, #4)
- [x] 2.1 Define location feature flags schema with Zod
- [x] 2.2 Create structure for: { locationRulesEnabled, locationWorkModeEnabled, locationAlertsEnabled }
- [x] 2.3 Add `disabledBySafetyRequest` field to track safety override
- [x] 2.4 Add `disabledAt`, `disabledBy` fields for audit
- [x] 2.5 Ensure disabled state cannot be re-enabled by family (requires support)

### Task 3: Implement Pending Notification Deletion (AC: #5)
- [x] 3.1 Query notificationQueue for location-related notifications for affected users
- [x] 3.2 Delete matching pending notifications in batch
- [x] 3.3 Log deleted notification count to sealed audit (no content)
- [x] 3.4 Ensure no race condition with notification delivery

### Task 4: Create Device Location Disable Command (AC: #6)
- [x] 4.1 Add 'disable-location' command type to DeviceCommandType enum
- [x] 4.2 Create location disable command in `deviceCommands` collection
- [x] 4.3 Queue command for all devices associated with affected users
- [x] 4.4 Set command TTL (7 days like unenrollment)
- [x] 4.5 Mark commands as sealed

### Task 5: Implement Historical Location Data Redaction (AC: #7)
- [x] 5.1 Query location history for affected users
- [x] 5.2 Redact location data fields (set to null or "[redacted]")
- [x] 5.3 Mark entries with `sealed: true` flag
- [x] 5.4 Preserve non-location fields for audit continuity
- [x] 5.5 **CRITICAL**: Do NOT create visible gaps in timestamps

### Task 6: Add Location Disable UI to Admin Dashboard (AC: #1)
- [x] 6.1 Add "Disable Location Features" button to SafetyRequestDetail page
- [x] 6.2 Create LocationDisableDialog component (follow SeverParentDialog pattern)
- [x] 6.3 Add family/user selection interface
- [x] 6.4 Add confirmation dialog with safety warnings
- [x] 6.5 Add reason input field (20 char minimum)
- [x] 6.6 Display success confirmation after disable
- [x] 6.7 Disable button if request not verified

### Task 7: Write Tests (All AC)
- [x] 7.1 Unit tests for input validation
- [x] 7.2 Integration tests for disableLocationFeatures function
- [x] 7.3 Test location settings update
- [x] 7.4 Test pending notification deletion
- [x] 7.5 Test device command creation
- [x] 7.6 Test historical data redaction
- [x] 7.7 Test that NO notifications are sent
- [x] 7.8 Test that NO family audit trail entries created
- [x] 7.9 Security tests: verify non-safety-team access denied
- [x] 7.10 Test sealed audit entry creation

---

## Dev Notes

### Critical Safety Requirements
This is a **life-safety feature**. Implementation errors could enable tracking of escaped abuse victims OR reveal that escape actions occurred. Key invariants:

1. **NEVER** notify any family member about location disable
2. **NEVER** log to family audit trail
3. **NEVER** show "Location features were disabled by admin" or similar revealing message
4. **ALWAYS** require safety-team verification before disabling
5. **ALWAYS** queue commands for offline devices
6. **ALWAYS** seal the audit entry for compliance access only
7. **ALWAYS** redact historical data without creating visible gaps
8. **ENSURE** pending notifications are deleted before they can be delivered

### Architecture Patterns

**Location Settings Model:**
```typescript
// Firestore path: /families/{familyId}/settings/location
// OR /users/{userId}/settings/location (per-user override)
interface LocationSettings {
  locationRulesEnabled: boolean         // FR139
  locationWorkModeEnabled: boolean      // FR145
  locationAlertsEnabled: boolean        // FR160
  // Safety override fields (added by this story)
  disabledBySafetyRequest?: boolean     // If true, locked from re-enable
  safetyDisabledAt?: Timestamp
  safetyDisabledBy?: string             // Admin agent ID
  safetyRequestId?: string              // Reference to safety request
}
```

**Location Disable Cloud Function Input:**
```typescript
const disableLocationFeaturesInputSchema = z.object({
  requestId: z.string().min(1),
  familyId: z.string().min(1),
  targetUserIds: z.array(z.string().min(1)).min(1),
  reason: z.string().min(20).max(5000),
})
```

**Device Command for Location Disable:**
```typescript
// /deviceCommands/{commandId}
interface LocationDisableCommand {
  deviceId: string
  command: 'disable-location'
  issuedAt: Timestamp
  executedAt?: Timestamp
  expiresAt: Timestamp          // TTL: issuedAt + 7 days
  source: 'safety-request'
  safetyRequestId: string
  sealed: true
}
```

**Location History Redaction:**
```typescript
// Before redaction
{
  childId: "child123",
  timestamp: Timestamp,
  location: { lat: 37.7749, lng: -122.4194 },
  locationName: "School",
  event: "arrived"
}

// After redaction
{
  childId: "child123",
  timestamp: Timestamp,      // Preserved for continuity
  location: null,            // Redacted
  locationName: null,        // Redacted
  event: null,               // Redacted
  sealed: true               // Marks as sealed
}
```

**Sealed Admin Audit Entry:**
```typescript
// /adminAuditLog/{entryId}
interface SealedAuditEntry {
  action: 'location-features-disable'
  resourceType: 'location-settings'
  resourceId: string            // familyId
  performedBy: string           // Agent UID
  affectedUserIds: string[]
  familyId: string
  safetyRequestId: string
  reason: string
  deletedNotificationCount?: number
  redactedHistoryCount?: number
  timestamp: FieldValue
  sealed: true
  integrityHash: string
}
```

### Naming Conventions
- Function: `disableLocationFeatures` (camelCase)
- UI Component: `LocationDisableDialog.tsx` (PascalCase)
- Audit action: `location-features-disable` (kebab-case)
- Command type: `disable-location` (kebab-case)
- Collection: `locationSettings` or nested under existing settings

### Project Structure Notes

**Files to Create:**
```
apps/functions/src/callable/disableLocationFeatures.ts       # Cloud Function
apps/functions/src/callable/disableLocationFeatures.test.ts  # Tests
apps/web/src/components/admin/LocationDisableDialog.tsx      # UI component
```

**Files to Modify:**
```
apps/functions/src/index.ts                          # Export new function
apps/functions/src/callable/unenrollDevice.ts        # Add 'disable-location' to DeviceCommandType
apps/web/src/app/(admin)/safety-requests/[id]/page.tsx  # Add location disable button
apps/web/src/lib/admin-api.ts                        # Add disableLocationFeatures API call
```

### Previous Story Intelligence (Story 0.5.5)

**Patterns Established:**
- Safety-team role REQUIRED (admin alone NOT sufficient)
- Zod schema validation with 20-char minimum reason
- Sealed admin audit logging with integrity hash
- No family audit trail entries
- No notifications of any kind
- Sanitized error logging (errorId, no sensitive data)
- UI with multi-step confirmation dialog
- DeviceCommandType enum with 'unenroll' command
- Device command queueing for offline devices
- Batch writes for atomic operations

**Code to Reuse:**
- `unenrollDevice.ts` - Pattern for admin callable function, DeviceCommandType
- `UnenrollDeviceDialog.tsx` - Pattern for confirmation dialog
- Sealed audit logging pattern with integrity hash
- Error handling with errorId generation
- Device command creation pattern

### Feature References

**FR139 - Location-Based Rules:**
Family agreement rules that change based on child's physical location (home vs school vs other parent's house).

**FR145 - Location-Based Work Mode:**
Automatic work/focus mode activation when child arrives at designated work locations.

**FR160 - New Location Alerts:**
Notifications sent to parents when child arrives at/leaves designated locations.

### Testing Standards

**Required Tests:**
1. Schema validation for disable input (unit)
2. Cloud Function disables correctly (integration)
3. Location settings updated (integration)
4. Pending notifications deleted (integration)
5. Device commands created (integration)
6. Historical data redacted (integration)
7. No notification triggered (integration - critical)
8. No family audit entry (integration - critical)
9. Sealed admin audit created (integration)
10. UI confirmation dialog works (E2E - if time permits)

**Adversarial Tests:**
1. Non-safety-team cannot execute disable
2. Cannot disable for non-existent family
3. Cannot disable for users not in specified family
4. Cannot disable without verified safety request
5. Cannot re-enable after safety disable (from family side)

---

### References

- [Source: docs/epics/epic-list.md#Story-0.5.6] - Original story requirements
- [Source: docs/sprint-artifacts/stories/0-5-5-remote-device-unenrollment.md] - Previous story patterns
- [Source: docs/architecture/project-context-analysis.md#SA4] - Insider threat mitigations
- [Source: docs/architecture/project-context-analysis.md#PR5] - Adversarial family protections
- [Source: docs/epics/epic-list.md#Story-40.3] - Fleeing mode context (Epic 40)
- [Source: docs/project_context.md] - Cloud Functions template patterns

---

## Dev Agent Record

### Context Reference
- Story context: docs/sprint-artifacts/stories/0-5-6-location-feature-emergency-disable.md
- Previous stories: 0.5.1, 0.5.2, 0.5.3, 0.5.4, 0.5.5

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- All 177 tests passing including 46 new disableLocationFeatures tests
- Functions build successful
- Web app compilation successful (Next.js)

### Completion Notes List
- This is Story 6 of 9 in Epic 0.5 (Safe Account Escape)
- Builds on patterns from Stories 0.5.4 and 0.5.5
- Extends DeviceCommandType with 'disable-location' command
- Location history redaction ensures no forensic trail
- Related to Epic 40 Fleeing Mode but admin-initiated (not family-initiated)

### File List
**Created:**
- `apps/functions/src/callable/disableLocationFeatures.ts` - Main Cloud Function
- `apps/functions/src/callable/disableLocationFeatures.test.ts` - Unit tests (46 tests)
- `apps/web/src/components/admin/LocationDisableDialog.tsx` - UI dialog component

**Modified:**
- `apps/functions/src/index.ts` - Export new function
- `apps/functions/src/callable/unenrollDevice.ts` - Added 'disable-location' to DeviceCommandType
- `apps/web/src/lib/admin-api.ts` - Added disableLocationFeatures API wrapper
- `apps/web/src/app/(admin)/safety-requests/[id]/page.tsx` - Added Location Disable button and dialog
