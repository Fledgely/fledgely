# Story 32.4: Parent Compliance Tracking

Status: done

## Story

As **a child**,
I want **to see if my parents follow offline time too**,
So that **I know the rules are fair**.

## Acceptance Criteria

1. **AC1: Parent Compliance Logging**
   - Given parent has enrolled devices
   - When offline time period ends
   - Then compliance logged: "Mom was offline for family time"
   - And compliance status stored in Firestore

2. **AC2: Child Compliance Dashboard**
   - Given child views their dashboard
   - When checking family offline time status
   - Then child can see parent compliance: "Mom was offline"
   - And non-compliance noted: "Dad used phone during offline time"
   - And displayed in child-friendly, non-shaming manner

3. **AC3: Parent Self-View**
   - Given parent views offline time settings
   - When viewing their own compliance
   - Then parents see their own compliance stats
   - And shows compliance percentage over time
   - And displayed with encouragement, not shame

4. **AC4: Transparency Without Shaming**
   - Given compliance data is displayed
   - When shown to any family member
   - Then language is factual, not judgmental
   - And focuses on shared accountability
   - And builds trust through transparency

5. **AC5: Real-Time Activity Detection**
   - Given parent device is enrolled
   - When parent uses device during offline time
   - Then activity detected (browser usage/navigation)
   - And compliance status updated to "active during offline time"

## Tasks / Subtasks

- [x] Task 1: Create compliance data model and storage (AC: #1)
  - [x] 1.1 Add `ParentComplianceRecord` schema to @fledgely/shared
  - [x] 1.2 Create Firestore collection for compliance records
  - [x] 1.3 Define security rules for compliance data (child can read parent compliance)

- [x] Task 2: Implement extension compliance tracking (AC: #1, #5)
  - [x] 2.1 Track parent device activity during offline windows
  - [x] 2.2 Log compliance/non-compliance events to Firestore
  - [x] 2.3 Add compliance status to offline-schedule-enforcement.ts

- [x] Task 3: Create child compliance view component (AC: #2, #4)
  - [x] 3.1 Create `ParentComplianceCard.tsx` for child dashboard
  - [x] 3.2 Display parent compliance status for recent offline periods
  - [x] 3.3 Use child-friendly, non-shaming language
  - [x] 3.4 Add to child dashboard layout

- [x] Task 4: Create parent self-view component (AC: #3, #4)
  - [x] 4.1 Create `MyComplianceStats.tsx` for parent dashboard
  - [x] 4.2 Show compliance percentage over time
  - [x] 4.3 Display with encouraging messaging
  - [x] 4.4 Add to parent offline time settings

- [x] Task 5: Create hooks for compliance data (AC: #1-4)
  - [x] 5.1 Create `useParentCompliance.ts` hook
  - [x] 5.2 Real-time subscription to compliance data
  - [x] 5.3 Support both child and parent views

## Dev Notes

### Architecture Pattern

Compliance tracking extends the offline-schedule-enforcement module:

```typescript
// packages/shared/src/schemas/parent-compliance.ts

export const parentComplianceRecordSchema = z.object({
  familyId: z.string(),
  parentUid: z.string(),
  deviceId: z.string(),
  offlineWindowStart: z.number(), // epoch ms
  offlineWindowEnd: z.number(), // epoch ms
  wasCompliant: z.boolean(),
  activityEvents: z
    .array(
      z.object({
        timestamp: z.number(),
        type: z.enum(['navigation', 'browser_active']),
      })
    )
    .default([]),
  createdAt: z.number(),
})

export type ParentComplianceRecord = z.infer<typeof parentComplianceRecordSchema>
```

### Extension Activity Detection

Track parent device activity during offline windows:

```typescript
// apps/extension/src/offline-schedule-enforcement.ts

export async function trackParentActivity(): Promise<void> {
  const isParent = await isParentDevice()
  if (!isParent) return

  const state = await getOfflineScheduleState()
  if (!state.isInOfflineWindow) return

  // Log activity event
  await logParentActivityEvent({
    timestamp: Date.now(),
    type: 'browser_active',
  })
}

// Called from background script on tab navigation
export async function onTabNavigation(tabId: number, url: string): Promise<void> {
  const isParent = await isParentDevice()
  if (!isParent) return

  const state = await getOfflineScheduleState()
  if (!state.isInOfflineWindow) return

  await logParentActivityEvent({
    timestamp: Date.now(),
    type: 'navigation',
  })
}
```

### Child Compliance View

```typescript
// apps/web/src/components/child/ParentComplianceCard.tsx

/**
 * Shows child how parents followed offline time
 *
 * Language choices (FR60 - no shaming):
 * - Compliant: "Mom was offline for family time"
 * - Non-compliant: "Dad used the phone during offline time"
 * - Not: "Dad broke the rules" or "Dad failed"
 */
```

### Firestore Security Rules

```javascript
// Children can read their family's parent compliance records
match /families/{familyId}/parentCompliance/{complianceId} {
  allow read: if request.auth != null &&
    exists(/databases/$(database)/documents/families/$(familyId)/children/$(request.auth.uid));
  allow read: if isParentInFamily(familyId);
  allow write: if isParentInFamily(familyId);
}
```

### NFR Compliance

- **NFR42**: WCAG 2.1 AA - accessible compliance displays
- **FR60**: Parent compliance tracking without shaming

### References

- [Source: docs/epics/epic-list.md#story-324] - Story requirements
- [Source: Story 32-2] - Parent Device Enrollment
- [Source: Story 32-3] - Offline Time Enforcement
- [Source: apps/extension/src/offline-schedule-enforcement.ts] - Enforcement module

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

- packages/shared/src/contracts/index.ts - Added compliance schemas and messages
- packages/shared/src/contracts/parentCompliance.test.ts - New test file (16 tests)
- packages/shared/src/index.ts - Added compliance exports
- packages/firebase-rules/firestore.rules - Added parentCompliance security rules
- apps/extension/src/offline-schedule-enforcement.ts - Added compliance tracking functions
- apps/extension/src/background.ts - Added compliance tracking integration
- apps/web/src/hooks/useParentCompliance.ts - New hook for compliance data
- apps/web/src/hooks/useParentCompliance.test.ts - New test file (11 tests)
- apps/web/src/components/child/ParentComplianceCard.tsx - New child view component
- apps/web/src/components/child/ParentComplianceCard.test.tsx - New test file (11 tests)
- apps/web/src/components/settings/MyComplianceStats.tsx - New parent self-view component
- apps/web/src/components/settings/MyComplianceStats.test.tsx - New test file (13 tests)
- apps/web/src/components/icons/CheckCircleIcon.tsx - New icon component
- apps/web/src/components/icons/UsersIcon.tsx - New icon component
- apps/web/src/app/child/dashboard/page.tsx - Integrated ParentComplianceCard
- apps/web/src/app/dashboard/settings/time-limits/page.tsx - Integrated MyComplianceStats
