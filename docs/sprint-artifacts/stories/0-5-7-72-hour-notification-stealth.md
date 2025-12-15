# Story 0.5.7: 72-Hour Notification Stealth

**Status:** done

---

## Story

As **the system**,
I want **notifications that would reveal an escape action to be suppressed for 72 hours**,
So that **victims have time to reach physical safety**.

---

## Acceptance Criteria

### AC1: Notification Stealth Queue Creation
**Given** an escape action (sever parent, unenroll device, disable location) has been executed
**When** the system activates stealth mode for affected family members
**Then** a stealth queue configuration is created for the family/target users
**And** the queue specifies which notification types to suppress

### AC2: Notification Interception
**Given** stealth mode is active for a family/user
**When** the system would normally generate a notification to the abuser
**Then** the notification is captured and held in a sealed stealth queue
**And** the notification is NOT delivered via FCM, email, or in-app

### AC3: 72-Hour Suppression Window
**Given** a notification has been captured in the stealth queue
**When** the 72-hour window has NOT elapsed
**Then** the notification remains suppressed and undelivered
**And** no indication of pending notifications is shown to the abuser

### AC4: Post-72-Hour Deletion
**Given** a notification is held in the stealth queue
**When** the 72-hour suppression window expires
**Then** the escape-related notifications are permanently deleted
**And** deletion occurs via scheduled Cloud Function (not client-triggered)
**And** deletion is logged to sealed admin audit only

### AC5: Critical Safety Notification Exemption
**Given** stealth mode is active
**When** a critical safety notification is generated (crisis resource access, mandatory reports, legal compliance)
**Then** the notification is NOT suppressed and delivers normally
**And** the exemption is logged to sealed audit for compliance

### AC6: Non-Escaped Family Member Continuity
**Given** stealth mode is active for specific users in a family
**When** non-escaped family members (e.g., children, other parents) trigger notifications
**Then** their notifications continue to deliver normally
**And** stealth mode does NOT affect their notification flow

### AC7: Stealth Queue Invisibility
**Given** stealth mode is active
**When** the abuser queries any family data, audit trails, or notification history
**Then** the stealth queue is NOT visible
**And** no "pending notifications" indicator appears
**And** no suspicious gaps appear in notification history

### AC8: Admin Activation Interface
**Given** a support agent is processing an escape request
**When** they execute escape actions (sever, unenroll, disable location)
**Then** stealth mode is automatically activated for the specified targets
**And** an explicit "Activate Notification Stealth" option is available if needed separately

### AC9: Sealed Admin Audit
**Given** stealth mode is activated, extended, or notifications are deleted
**When** the action is logged
**Then** the log entry is in sealed admin audit only
**And** log includes: agent ID, family ID, affected user IDs, safety request ID, action type, timestamp
**And** audit entry is NOT visible in any family-accessible query

---

## Tasks / Subtasks

### Task 1: Create Stealth Queue Data Model (AC: #1, #7)
- [ ] 1.1 Define `stealthQueue` collection schema with Zod
- [ ] 1.2 Structure: { familyId, targetUserIds[], activatedAt, expiresAt, safetyRequestId, activatedBy, sealed }
- [ ] 1.3 Define `stealthNotifications` subcollection for held notifications
- [ ] 1.4 Mark collection with `sealed: true` for query filtering
- [ ] 1.5 Ensure stealth queue is excluded from all family-accessible queries

### Task 2: Create Stealth Mode Activation Function (AC: #1, #8, #9)
- [ ] 2.1 Create callable function `activateNotificationStealth` in `apps/functions/src/callable/`
- [ ] 2.2 Accept input: requestId, familyId, targetUserIds[], reason, durationHours (default 72)
- [ ] 2.3 Validate caller has safety-team role (via custom claims)
- [ ] 2.4 Validate safety request exists and is verified
- [ ] 2.5 Create stealth queue document with 72-hour expiration
- [ ] 2.6 Log to adminAuditLog with sealed=true flag
- [ ] 2.7 **CRITICAL**: Do NOT notify anyone about stealth activation
- [ ] 2.8 Return success with stealth queue ID

### Task 3: Create Notification Interception Logic (AC: #2, #5, #6)
- [ ] 3.1 Create utility function `shouldInterceptNotification(userId, familyId, notificationType)`
- [ ] 3.2 Check if stealth mode active for user/family
- [ ] 3.3 Define exemption list for critical safety notifications
- [ ] 3.4 Exemptions: `crisis-resource-access`, `mandatory-report`, `legal-compliance`, `account-security`
- [ ] 3.5 Route intercepted notifications to `stealthNotifications` subcollection
- [ ] 3.6 Route non-intercepted notifications to normal delivery
- [ ] 3.7 Log exemptions to sealed audit for compliance documentation

### Task 4: Create Notification Capture Function (AC: #2, #3)
- [ ] 4.1 Create function `captureStealthNotification` to store intercepted notifications
- [ ] 4.2 Store full notification payload (type, content, targetUserId, familyId, originalTimestamp)
- [ ] 4.3 Mark captured notifications with `status: 'held'`
- [ ] 4.4 **CRITICAL**: Do NOT include notification in any pending counts
- [ ] 4.5 **CRITICAL**: Do NOT create any delivery records

### Task 5: Create 72-Hour Expiration Cleanup Function (AC: #4, #9)
- [ ] 5.1 Create scheduled function `cleanupExpiredStealthQueues` (runs every hour)
- [ ] 5.2 Query for stealth queues where `expiresAt < now()`
- [ ] 5.3 Delete all notifications in expired stealth queues
- [ ] 5.4 Delete the stealth queue document itself
- [ ] 5.5 Log cleanup to sealed admin audit with counts
- [ ] 5.6 **CRITICAL**: Use batch operations with chunking (500 limit)

### Task 6: Integrate with Existing Escape Functions (AC: #8)
- [ ] 6.1 Modify `severParentAccess` to auto-activate stealth mode
- [ ] 6.2 Modify `unenrollDevice` to auto-activate stealth mode
- [ ] 6.3 Modify `disableLocationFeatures` to auto-activate stealth mode
- [ ] 6.4 Add stealth activation to safety request workflow
- [ ] 6.5 Ensure idempotent activation (don't duplicate if already active)

### Task 7: Add Manual Stealth Control UI (AC: #8)
- [ ] 7.1 Add "Activate Notification Stealth" button to SafetyRequestDetail page
- [ ] 7.2 Create StealthModeDialog component (follow LocationDisableDialog pattern)
- [ ] 7.3 Add family/user selection interface
- [ ] 7.4 Add duration input (default 72 hours, max 168 hours/7 days)
- [ ] 7.5 Add confirmation dialog with safety warnings
- [ ] 7.6 Display stealth status in safety request detail

### Task 8: Write Tests (All AC)
- [ ] 8.1 Unit tests for stealth queue schema validation
- [ ] 8.2 Integration tests for activateNotificationStealth function
- [ ] 8.3 Integration tests for notification interception logic
- [ ] 8.4 Test critical safety notification exemptions
- [ ] 8.5 Test non-escaped family member continuity
- [ ] 8.6 Test 72-hour expiration and cleanup
- [ ] 8.7 Test that NO notifications are delivered during stealth
- [ ] 8.8 Test stealth queue invisibility from family queries
- [ ] 8.9 Security tests: verify non-safety-team access denied
- [ ] 8.10 Test sealed audit entry creation

---

## Dev Notes

### Critical Safety Requirements
This is a **life-safety feature**. Implementation errors could reveal escape actions to abusers OR prevent victims from getting critical safety resources. Key invariants:

1. **NEVER** deliver intercepted notifications to abuser
2. **NEVER** show stealth queue existence to any family member
3. **NEVER** create pending notification indicators for intercepted notifications
4. **ALWAYS** exempt critical safety notifications (crisis resources, mandatory reports)
5. **ALWAYS** delete held notifications after 72 hours (don't deliver late)
6. **ALWAYS** seal the audit entries for compliance access only
7. **ALWAYS** continue normal operation for non-escaped family members
8. **ENSURE** no suspicious gaps in notification history

### Architecture Patterns

**Stealth Queue Schema:**
```typescript
// Firestore path: /stealthQueues/{queueId}
interface StealthQueue {
  queueId: string
  familyId: string
  targetUserIds: string[]           // Users whose notifications are intercepted
  notificationTypesToSuppress: string[]  // e.g., ['device-unenrolled', 'location-disabled', 'member-removed']
  activatedAt: Timestamp
  expiresAt: Timestamp              // activatedAt + 72 hours
  safetyRequestId: string
  activatedBy: string               // Admin agent ID
  sealed: true
}
```

**Stealth Notification Entry:**
```typescript
// Firestore path: /stealthQueues/{queueId}/notifications/{notificationId}
interface StealthNotification {
  originalNotificationType: string
  originalTargetUserId: string      // The abuser who would have received this
  originalFamilyId: string
  originalPayload: {
    title: string
    body: string
    data: Record<string, string>
  }
  originalTimestamp: Timestamp      // When notification would have been sent
  capturedAt: Timestamp
  status: 'held' | 'deleted'
  sealed: true
}
```

**Critical Safety Notification Exemptions:**
```typescript
const STEALTH_EXEMPT_NOTIFICATION_TYPES = [
  'crisis-resource-access',        // Access to crisis hotlines/resources
  'mandatory-report',              // Required legal reporting
  'legal-compliance',              // Court orders, subpoenas
  'account-security',              // Password changes, suspicious login
  'child-safety-flag',             // Child "I feel unsafe" flag
  'law-enforcement-request',       // Police requests
] as const
```

**Notification Interception Flow:**
```typescript
async function processNotification(notification: PendingNotification) {
  // Step 1: Check if stealth mode active for this recipient
  const stealthQueue = await getActiveStealthQueue(
    notification.targetUserId,
    notification.familyId
  )

  if (!stealthQueue) {
    // No stealth - deliver normally
    return deliverNotification(notification)
  }

  // Step 2: Check if notification type is exempt
  if (STEALTH_EXEMPT_NOTIFICATION_TYPES.includes(notification.type)) {
    // Log exemption and deliver normally
    await logStealthExemption(notification, stealthQueue.queueId)
    return deliverNotification(notification)
  }

  // Step 3: Check if this user is a target of stealth
  if (!stealthQueue.targetUserIds.includes(notification.targetUserId)) {
    // User not targeted - deliver normally
    return deliverNotification(notification)
  }

  // Step 4: Intercept and hold
  await captureStealthNotification(stealthQueue.queueId, notification)
  // DO NOT deliver, DO NOT create delivery record
}
```

**Activate Stealth Function Input:**
```typescript
const activateNotificationStealthInputSchema = z.object({
  requestId: z.string().min(1),
  familyId: z.string().min(1),
  targetUserIds: z.array(z.string().min(1)).min(1),
  reason: z.string().min(20).max(5000),
  durationHours: z.number().min(24).max(168).default(72),  // 1-7 days
  notificationTypes: z.array(z.string()).optional(),  // If not specified, suppress all escape-related
})
```

**Sealed Admin Audit Entry:**
```typescript
// /adminAuditLog/{entryId}
interface StealthAuditEntry {
  action: 'notification-stealth-activate' | 'notification-stealth-exempt' | 'notification-stealth-cleanup'
  resourceType: 'stealth-queue'
  resourceId: string              // stealthQueueId
  performedBy: string             // Agent UID or 'system' for scheduled cleanup
  familyId: string
  targetUserIds?: string[]
  safetyRequestId?: string
  reason?: string
  capturedNotificationCount?: number
  deletedNotificationCount?: number
  exemptedNotificationType?: string
  timestamp: FieldValue
  sealed: true
  integrityHash: string
}
```

### Naming Conventions
- Function: `activateNotificationStealth` (camelCase)
- Scheduled Function: `cleanupExpiredStealthQueues` (camelCase)
- Utility: `shouldInterceptNotification` (camelCase)
- Collection: `stealthQueues` (camelCase plural)
- UI Component: `StealthModeDialog.tsx` (PascalCase)
- Audit action: `notification-stealth-activate` (kebab-case)

### Project Structure Notes

**Files to Create:**
```
apps/functions/src/callable/activateNotificationStealth.ts       # Cloud Function
apps/functions/src/callable/activateNotificationStealth.test.ts  # Tests
apps/functions/src/scheduled/cleanupExpiredStealthQueues.ts      # Scheduled cleanup
apps/functions/src/scheduled/cleanupExpiredStealthQueues.test.ts # Tests
apps/functions/src/utils/notificationStealth.ts                  # Interception utilities
apps/functions/src/utils/notificationStealth.test.ts             # Utility tests
apps/web/src/components/admin/StealthModeDialog.tsx              # UI component
```

**Files to Modify:**
```
apps/functions/src/index.ts                          # Export new functions
apps/functions/src/callable/severParentAccess.ts     # Add auto stealth activation
apps/functions/src/callable/unenrollDevice.ts        # Add auto stealth activation
apps/functions/src/callable/disableLocationFeatures.ts  # Add auto stealth activation
apps/web/src/app/(admin)/safety-requests/[id]/page.tsx  # Add stealth mode button/status
apps/web/src/lib/admin-api.ts                        # Add activateNotificationStealth API call
```

### Previous Story Intelligence (Story 0.5.6)

**Patterns Established:**
- Safety-team role REQUIRED (admin alone NOT sufficient)
- Zod schema validation with 20-char minimum reason
- Sealed admin audit logging with integrity hash
- No family audit trail entries
- No notifications of any kind
- Sanitized error logging (errorId, no sensitive data)
- UI with multi-step confirmation dialog
- Batch chunking for Firestore 500-operation limit
- Race condition prevention (commit critical operations immediately)

**Code to Reuse:**
- `disableLocationFeatures.ts` - Pattern for admin callable function, batch chunking
- `LocationDisableDialog.tsx` - Pattern for confirmation dialog
- Sealed audit logging pattern with integrity hash
- Error handling with errorId generation
- `chunkArray` utility function

### Notification Types to Suppress
Based on escape actions from Stories 0.5.4, 0.5.5, 0.5.6:

**Device-Related:**
- `device-unenrolled`
- `device-offline-extended`
- `device-location-disabled`

**Parent/Family-Related:**
- `member-removed`
- `member-access-changed`
- `family-membership-updated`

**Location-Related:**
- `location-rules-disabled`
- `location-work-mode-disabled`
- `location-alerts-disabled`
- `location-history-redacted`

### Testing Standards

**Required Tests:**
1. Schema validation for stealth activation input (unit)
2. Cloud Function activates stealth correctly (integration)
3. Notification interception works (integration)
4. Critical notifications NOT suppressed (integration - critical)
5. Non-escaped members not affected (integration - critical)
6. 72-hour cleanup deletes held notifications (integration)
7. No notification delivered during stealth (integration - critical)
8. Stealth queue invisible from family queries (integration)
9. Sealed admin audit created (integration)
10. Auto-activation from escape functions (integration)

**Adversarial Tests:**
1. Non-safety-team cannot activate stealth
2. Cannot query stealth queue as family member
3. Cannot extend stealth beyond 7 days without re-authorization
4. Stealth does not block critical safety notifications
5. Stealth cleanup handles large queues (batch limits)

---

### References

- [Source: docs/epics/epic-list.md#Story-0.5.7] - Original story requirements
- [Source: docs/sprint-artifacts/stories/0-5-6-location-feature-emergency-disable.md] - Previous story patterns
- [Source: docs/architecture/project-context-analysis.md#SA4] - Insider threat mitigations
- [Source: docs/architecture/project-context-analysis.md#PR5] - Adversarial family protections
- [Source: docs/architecture/project-context-analysis.md#ADR-005] - Notifications via Firestore triggers + FCM
- [Source: docs/project_context.md] - Cloud Functions template patterns

---

## Dev Agent Record

### Context Reference
- Story context: docs/sprint-artifacts/stories/0-5-7-72-hour-notification-stealth.md
- Previous stories: 0.5.1, 0.5.2, 0.5.3, 0.5.4, 0.5.5, 0.5.6

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
(To be filled during implementation)

### Completion Notes List
- This is Story 7 of 9 in Epic 0.5 (Safe Account Escape)
- Builds on patterns from Stories 0.5.4, 0.5.5, 0.5.6
- Introduces scheduled function pattern (cleanupExpiredStealthQueues)
- Creates new utility module for notification interception
- Auto-integrates with existing escape functions

### File List
**To Create:**
- `apps/functions/src/callable/activateNotificationStealth.ts`
- `apps/functions/src/callable/activateNotificationStealth.test.ts`
- `apps/functions/src/scheduled/cleanupExpiredStealthQueues.ts`
- `apps/functions/src/scheduled/cleanupExpiredStealthQueues.test.ts`
- `apps/functions/src/utils/notificationStealth.ts`
- `apps/functions/src/utils/notificationStealth.test.ts`
- `apps/web/src/components/admin/StealthModeDialog.tsx`

**To Modify:**
- `apps/functions/src/index.ts`
- `apps/functions/src/callable/severParentAccess.ts`
- `apps/functions/src/callable/unenrollDevice.ts`
- `apps/functions/src/callable/disableLocationFeatures.ts`
- `apps/web/src/app/(admin)/safety-requests/[id]/page.tsx`
- `apps/web/src/lib/admin-api.ts`
