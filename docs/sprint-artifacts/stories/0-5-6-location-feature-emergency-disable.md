# Story 0.5.6: Location Feature Emergency Disable

Status: done

## Story

As a **support agent**,
I want **to instantly disable all location-revealing features for escaped accounts/devices**,
So that **victims cannot be tracked through fledgely after escape**.

## Acceptance Criteria

1. **AC1: Location-based rules disable (FR139)**
   - Given a support agent is processing an escape request
   - When they activate location feature disable
   - Then FR139 (location-based rule variations) is disabled immediately for affected accounts
   - And any location-based rule configurations are marked inactive
   - And location rules no longer apply during device polling

2. **AC2: Location-based work mode disable (FR145)**
   - Given location feature disable is activated
   - When the system checks work mode triggers
   - Then FR145 (location-based work mode) is disabled for affected accounts
   - And automatic location-triggered work mode no longer activates
   - And existing active work mode sessions continue (don't reveal the disable)

3. **AC3: New location alerts disable (FR160)**
   - Given location feature disable is activated
   - When the system would normally send location alerts
   - Then FR160 (new location alerts) is disabled for affected accounts
   - And no future location-based alerts are generated
   - And pending location alerts are silently discarded

4. **AC4: Pending location notifications deleted**
   - Given location feature disable is activated
   - When there are pending location-related notifications in queue
   - Then all pending location notifications are immediately deleted (not delivered)
   - And deletion is logged to admin audit only (not family audit)
   - And no notification about the deletion is sent

5. **AC5: Device location collection stops**
   - Given location feature disable is activated
   - When devices next poll for configuration
   - Then location data collection stops on affected devices within 60 seconds
   - And devices stop reporting location data to the family
   - And local location cache on devices is cleared

6. **AC6: Historical location data redaction**
   - Given location feature disable is activated
   - When the abuser views family activity logs or reports
   - Then historical location data is redacted from family-visible logs
   - And redacted data is preserved in sealed compliance storage
   - And redaction is invisible (no gaps, no "redacted" markers)

7. **AC7: No notification of disable**
   - Given location feature disable is activated
   - When the operation completes
   - Then NO notification is sent about the location feature disable
   - And NO family audit log entry reveals the disable
   - And admin audit captures full action details

8. **AC8: Integration with safety dashboard**
   - Given a support agent is viewing a safety ticket
   - When identity verification threshold is met (minimum 2 of 4 checks)
   - Then they can activate location feature disable from the ticket detail view
   - And the action is available alongside device unenrollment and parent severing
   - And confirmation is required before executing

## Tasks / Subtasks

- [x] Task 1: Create disableLocationFeaturesForSafety callable function (AC: #1-7)
  - [x] 1.1 Create `apps/functions/src/callable/admin/disableLocationFeaturesForSafety.ts`
  - [x] 1.2 Require safety-team role via `requireSafetyTeamRole`
  - [x] 1.3 Validate input: ticketId, familyId (required), userId (optional for device-only disable)
  - [x] 1.4 Verify ticket exists and has minimum 2 of 4 identity verification checks
  - [x] 1.5 Update family document: set `safetyLocationDisabled: true`, `safetyLocationDisabledAt`, `safetyTicketId`
  - [x] 1.6 Update affected user documents if userId provided: set user-level location disable flags
  - [x] 1.7 Delete pending location-related notifications from notification queue
  - [x] 1.8 Mark historical location data for redaction (set `locationDataRedacted: true` on relevant logs)
  - [x] 1.9 Log action to adminAuditLogs with full context
  - [x] 1.10 NO family audit log entry (CRITICAL)
  - [x] 1.11 NO notification to any party (CRITICAL)
  - [x] 1.12 Update ticket with internal note about location features disabled

- [x] Task 2: Add location disable schemas to shared contracts (AC: #1, #8)
  - [x] 2.1 Add `disableLocationFeaturesForSafetyInputSchema` to `packages/shared/src/contracts/index.ts`
  - [x] 2.2 Define fields: ticketId, familyId, userId (optional)
  - [x] 2.3 Add response type with success, message, featuresDisabledCount, notificationsDeleted

- [x] Task 3: Create SafetyLocationDisableSection component (AC: #8)
  - [x] 3.1 Create `apps/web/src/components/admin/SafetyLocationDisableSection.tsx`
  - [x] 3.2 Display current location feature status for family
  - [x] 3.3 Show list of location features that will be disabled
  - [x] 3.4 Show warning about irreversible action
  - [x] 3.5 Require confirmation before executing
  - [x] 3.6 Show success state after disable

- [x] Task 4: Create useDisableLocationFeatures hook (AC: #8)
  - [x] 4.1 Create `apps/web/src/hooks/useDisableLocationFeatures.ts`
  - [x] 4.2 Call disableLocationFeaturesForSafety callable function
  - [x] 4.3 Handle loading and error states
  - [x] 4.4 Return success state for UI updates

- [x] Task 5: Integrate into SafetyTicketDetail page (AC: #8)
  - [x] 5.1 Modify `apps/web/src/app/admin/safety/[ticketId]/page.tsx`
  - [x] 5.2 Add SafetyLocationDisableSection below device unenrollment section
  - [x] 5.3 Only show when identity verification threshold met (minimum 2 of 4)
  - [x] 5.4 Update UI after successful disable

- [x] Task 6: Add adminAudit action type (AC: #7)
  - [x] 6.1 Add 'disable_location_features_for_safety' to AdminAuditAction type in `apps/functions/src/utils/adminAudit.ts`
  - [x] 6.2 Add 'location_settings' to AdminAuditResourceType if needed

- [x] Task 7: Add unit tests (AC: #1-8)
  - [x] 7.1 Test disableLocationFeaturesForSafety requires safety-team role
  - [x] 7.2 Test disableLocationFeaturesForSafety validates input
  - [x] 7.3 Test disableLocationFeaturesForSafety requires minimum 2 verification checks
  - [x] 7.4 Test disableLocationFeaturesForSafety sets safetyLocationDisabled flag
  - [x] 7.5 Test disableLocationFeaturesForSafety deletes pending notifications
  - [x] 7.6 Test disableLocationFeaturesForSafety marks data for redaction
  - [x] 7.7 Test disableLocationFeaturesForSafety creates adminAuditLog entry
  - [x] 7.8 Test disableLocationFeaturesForSafety does NOT create family audit log
  - [x] 7.9 Test SafetyLocationDisableSection renders feature list
  - [x] 7.10 Test SafetyLocationDisableSection shows confirmation
  - [x] 7.11 Test useDisableLocationFeatures handles success/error
  - [x] 7.12 Minimum 15 tests required (76 total tests added)

## Dev Notes

### Implementation Strategy

This story implements the capability to instantly disable all location-revealing features for escaped accounts/devices. Since location features (FR139, FR145, FR160) are not yet implemented (planned for Epic 40), this story creates the **infrastructure and flags** that will be checked when those features are implemented.

**Key Design:**

1. **Flag-Based Disable**: Set `safetyLocationDisabled: true` on family/user documents. Future location feature implementations MUST check this flag before collecting/sharing location data.

2. **Forward Compatibility**: The callable function sets flags that don't exist yet in the data model. When Epic 40 implements location features, those implementations must respect these safety flags.

3. **Notification Deletion**: Delete any pending notifications that might be location-related. Since notification system is not yet fully implemented, this will be a no-op initially but establishes the pattern.

4. **Data Redaction Pattern**: Mark historical data for redaction by setting flags. The redaction itself happens at read-time (when logs are queried).

**CRITICAL SAFETY REQUIREMENTS:**

1. **No Notification Leakage**: NO emails, push notifications, SMS, or in-app notifications
2. **No Audit Trail Leakage**: Family audit logs must NOT contain any reference to location disable
3. **Forward Protection**: Flags must be checked by ALL future location feature implementations
4. **Immediate Effect**: Disable takes effect immediately for any implemented features

### Data Model Design

**Family Document Additions:**

```typescript
{
  // Existing family fields...

  // Story 0.5.6: Location safety disable
  safetyLocationDisabled: boolean, // true = all location features disabled
  safetyLocationDisabledAt: Timestamp | null,
  safetyLocationDisabledBy: string | null, // agentId
  safetyLocationTicketId: string | null, // links to safety ticket
}
```

**User Document Additions (for user-specific disable):**

```typescript
{
  // Existing user fields...

  // Story 0.5.6: Location safety disable
  safetyLocationDisabled: boolean,
  safetyLocationDisabledAt: Timestamp | null,
}
```

### Dependencies

**Story Dependencies:**

- Story 0.5.3: Support Agent Escape Dashboard (provides identity verification checklist, safety-team role)
- Story 0.5.4: Parent Access Severing (pattern for admin callable functions)
- Story 0.5.5: Remote Device Unenrollment (pattern for batch operations, integration point)

**Future Dependencies (this story prepares for):**

- Epic 40: Advanced Shared Custody & Location Features (FR139, FR145, FR160)
- Story 40.1: Location-based rule opt-in
- Story 40.2: Location-specific rule configuration
- Story 40.5: Location privacy controls

### Existing Code to Leverage

**From Story 0.5.3:**

- `apps/functions/src/utils/safetyTeamAuth.ts` - Role verification helper
- `apps/functions/src/utils/adminAudit.ts` - Admin audit logging
- `apps/web/src/app/admin/safety/[ticketId]/page.tsx` - Ticket detail page to extend

**From Story 0.5.4:**

- Pattern for admin callable functions requiring safety-team role
- Pattern for NO notification and NO family audit logging
- Pattern for verification threshold checking (minimum 2 of 4)

**From Story 0.5.5:**

- Pattern for batch operations in safety callable functions
- Pattern for updating ticket with internal notes
- SafetyDeviceUnenrollSection component pattern for UI

### Callable Function Pattern

```typescript
// apps/functions/src/callable/admin/disableLocationFeaturesForSafety.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { requireSafetyTeamRole } from '../../utils/safetyTeamAuth'
import { logAdminAction } from '../../utils/adminAudit'

const MINIMUM_VERIFICATION_COUNT = 2

const disableLocationFeaturesForSafetyInputSchema = z.object({
  ticketId: z.string().min(1),
  familyId: z.string().min(1),
  userId: z.string().min(1).optional(), // Optional: for user-specific disable
})

export const disableLocationFeaturesForSafety = onCall({ cors: true }, async (request) => {
  // 1. Verify safety-team role
  const context = await requireSafetyTeamRole(request, 'disable_location_features_for_safety')

  // 2. Validate input
  const parseResult = disableLocationFeaturesForSafetyInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid parameters')
  }
  const { ticketId, familyId, userId } = parseResult.data

  // 3. Verify ticket and verification threshold
  // ... similar to severParentAccess

  // 4. Update family document with safety location disable flag
  const familyRef = db.collection('families').doc(familyId)
  await familyRef.update({
    safetyLocationDisabled: true,
    safetyLocationDisabledAt: FieldValue.serverTimestamp(),
    safetyLocationDisabledBy: context.agentId,
    safetyLocationTicketId: ticketId,
  })

  // 5. If userId provided, also update user document
  if (userId) {
    const userRef = db.collection('users').doc(userId)
    await userRef.update({
      safetyLocationDisabled: true,
      safetyLocationDisabledAt: FieldValue.serverTimestamp(),
    })
  }

  // 6. Delete pending location-related notifications (future-proof)
  // Note: notification queue not yet implemented, this is a no-op initially
  const notificationsDeleted = 0 // Will be implemented when notification system exists

  // 7. Log to admin audit ONLY
  await logAdminAction({ ... })

  // CRITICAL: NO notification
  // CRITICAL: NO family audit log

  // 8. Update ticket with internal note
  await ticketRef.update({
    internalNotes: FieldValue.arrayUnion({
      id: `note_location_disable_${Date.now()}`,
      agentId: context.agentId,
      content: 'Location features disabled for family',
      createdAt: new Date(),
    }),
    history: FieldValue.arrayUnion({
      action: 'location_features_disabled',
      agentId: context.agentId,
      timestamp: FieldValue.serverTimestamp(),
    }),
  })

  return {
    success: true,
    message: 'Location features disabled successfully',
    featuresDisabledCount: 3, // FR139, FR145, FR160
    notificationsDeleted,
  }
})
```

### Security Considerations

1. **Role Verification**: Every callable checks safety-team claim
2. **Verification Threshold**: Requires minimum 2 of 4 identity checks
3. **Audit Completeness**: Admin audit captures full context
4. **No Cross-Contamination**: Family audit remains untouched
5. **Forward Protection**: Flags checked by future location implementations

### Testing Requirements

**Unit Tests (minimum 15):**

1. disableLocationFeaturesForSafety validates input schema
2. disableLocationFeaturesForSafety requires safety-team role
3. disableLocationFeaturesForSafety requires minimum 2 verification checks
4. disableLocationFeaturesForSafety sets safetyLocationDisabled flag on family
5. disableLocationFeaturesForSafety sets safetyLocationDisabledAt timestamp
6. disableLocationFeaturesForSafety sets safetyLocationTicketId
7. disableLocationFeaturesForSafety updates user document if userId provided
8. disableLocationFeaturesForSafety creates adminAuditLog entry
9. disableLocationFeaturesForSafety does NOT create family auditLog (code review)
10. disableLocationFeaturesForSafety does NOT send notification (code review)
11. disableLocationFeaturesForSafety adds internal note to ticket
12. SafetyLocationDisableSection renders feature list
13. SafetyLocationDisableSection requires confirmation
14. SafetyLocationDisableSection shows success state
15. useDisableLocationFeatures handles success/error

### Project Structure Notes

**Files to Create:**

- `apps/functions/src/callable/admin/disableLocationFeaturesForSafety.ts` - Main callable function
- `apps/functions/src/callable/admin/disableLocationFeaturesForSafety.test.ts` - Function tests
- `apps/web/src/components/admin/SafetyLocationDisableSection.tsx` - UI component
- `apps/web/src/components/admin/SafetyLocationDisableSection.test.tsx` - Component tests
- `apps/web/src/hooks/useDisableLocationFeatures.ts` - Hook for callable
- `apps/web/src/hooks/useDisableLocationFeatures.test.ts` - Hook tests

**Files to Modify:**

- `packages/shared/src/contracts/index.ts` - Add location disable schemas
- `apps/functions/src/utils/adminAudit.ts` - Add action type
- `apps/functions/src/index.ts` - Export new callable function
- `apps/web/src/app/admin/safety/[ticketId]/page.tsx` - Add location disable section

### Edge Cases

1. **Location features not yet implemented**: Function still sets flags (forward compatibility)
2. **Family already has location disabled**: Return idempotent success
3. **User not in family**: Validate user belongs to family before updating
4. **No pending notifications**: Return success with notificationsDeleted: 0
5. **Network error during update**: Transaction should rollback
6. **Verification incomplete**: Block disable until threshold met

### References

- [Source: docs/epics/epic-list.md#Story-0.5.6 - Location Feature Emergency Disable acceptance criteria]
- [Source: docs/prd/functional-requirements.md - FR139, FR145, FR160 definitions]
- [Source: Story 0.5.4 - Parent Access Severing patterns for admin callables]
- [Source: Story 0.5.5 - Remote Device Unenrollment patterns for safety dashboard integration]
- [Source: Epic 40 - Future location features that must respect safety disable flags]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - No debug issues encountered during implementation.

### Completion Notes List

1. **Forward Compatibility Design**: Since location features (FR139, FR145, FR160) are not yet implemented (Epic 40), this story creates infrastructure flags that future implementations MUST check.

2. **Auto-load Family Data**: Added useEffect to auto-load family data when verification threshold is met, enabling location disable section to work immediately without requiring "Sever Parent Access" to be clicked first.

3. **Date Consistency Fix**: Normalized date handling in callable function to use consistent `new Date()` for array entries.

4. **Critical Safety Requirements**:
   - NO notification to any party ✅
   - NO family audit log entry ✅
   - Admin audit logging only ✅

5. **76 Unit Tests Added**: Comprehensive test coverage for callable function, component, and hook.

### File List

**New Files:**

- `apps/functions/src/callable/admin/disableLocationFeaturesForSafety.ts` - Main callable function
- `apps/functions/src/callable/admin/disableLocationFeaturesForSafety.test.ts` - Function tests (43 tests)
- `apps/web/src/components/admin/SafetyLocationDisableSection.tsx` - UI component
- `apps/web/src/components/admin/SafetyLocationDisableSection.test.tsx` - Component tests (25 tests)
- `apps/web/src/hooks/useDisableLocationFeatures.ts` - Hook for callable
- `apps/web/src/hooks/useDisableLocationFeatures.test.ts` - Hook tests (8 tests)

**Modified Files:**

- `packages/shared/src/contracts/index.ts` - Added disableLocationFeaturesForSafetyInputSchema, disableLocationFeaturesForSafetyResponseSchema
- `apps/functions/src/utils/adminAudit.ts` - Added 'disable_location_features_for_safety' action type, 'location_settings' resource type
- `apps/functions/src/index.ts` - Export new callable function
- `apps/web/src/app/admin/safety/[ticketId]/page.tsx` - Added SafetyLocationDisableSection import and integration, auto-load family data
