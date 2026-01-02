# Story 3A.5: Screenshot Viewing Rate Alert

## Status: done

## Story

As a **co-parent**,
I want **to be alerted if my co-parent views screenshots excessively**,
So that **I'm aware of potential monitoring weaponization during custody disputes**.

## Acceptance Criteria

1. **AC1: Rate Detection Threshold**
   - Given a shared custody family with screenshots captured
   - When one parent views more than 50 screenshots within one hour
   - Then the rate threshold is detected
   - And rate threshold (50/hour) is NOT user-configurable (prevents gaming)

2. **AC2: Parent Alert Notification**
   - Given the viewing rate threshold is exceeded
   - When the alert is triggered
   - Then the other parent (NOT the viewer) receives an alert notification
   - And the child is NOT notified (prevent triangulation)
   - And alert shows count and timeframe but NOT which screenshots were viewed

3. **AC3: Non-Blocking Alert**
   - Given the viewing rate alert is triggered
   - When the viewer continues accessing screenshots
   - Then viewing is NOT blocked (informational only)
   - And no action is required from either parent
   - And the viewing parent can continue without interruption

4. **AC4: Audit Trail Logging**
   - Given any screenshot viewing that triggers rate alert
   - When the alert is created
   - Then the viewing rate is logged in admin audit trail
   - And log includes: viewerUid, familyId, viewCount, timeframeStart, timeframeEnd
   - And this is logged separately from normal screenshot view audits

5. **AC5: No Child Notification**
   - Given any viewing rate alert scenario
   - When alerts are sent
   - Then the child NEVER receives a notification about excessive viewing
   - And this protects against parental conflict triangulation

## Tasks / Subtasks

### Task 1: Create Screenshot Viewing Rate Tracker (AC: #1, #4)

Track screenshot viewing rates per parent within rolling hour window.

**Files:**

- `apps/web/src/services/screenshotViewingRateService.ts` (new)
- `apps/web/src/services/screenshotViewingRateService.test.ts` (new)

**Implementation:**

- Implement trackScreenshotView(familyId, viewerUid, childId) - called on each screenshot view
- Implement getViewingRate(familyId, viewerUid, hourWindow) - returns count in window
- Implement checkThresholdExceeded(familyId, viewerUid) - returns { exceeded: boolean, count: number }
- Store view timestamps in sessionStorage or memory for client-side rate tracking
- Threshold: 50 screenshots per 60 minutes (hardcoded, not configurable)

**Tests:** ~12 tests for rate tracking logic

### Task 2: Create Screenshot Viewing Rate Alert Service (AC: #2, #3, #5)

Service to send alerts when rate threshold is exceeded.

**Files:**

- `apps/functions/src/callable/sendViewingRateAlert.ts` (new)
- `apps/functions/src/callable/sendViewingRateAlert.test.ts` (new)

**Implementation:**

- Callable function: sendViewingRateAlert({ familyId, viewerUid, viewCount, timeframeMinutes })
- Validate viewer is a guardian of the family
- Get other guardians in family (excluding viewer)
- Send notification to other guardians ONLY (not child, not viewer)
- Include generic message: "A family member viewed {count} screenshots in the last hour"
- No screenshot IDs, no child names, no specific details
- Return success regardless of viewing continuation (non-blocking)

**Tests:** ~10 tests for alert service

### Task 3: Add Rate Alert Schema to Contracts (AC: #1, #4)

Add schema for viewing rate alert data.

**Files:**

- `packages/shared/src/contracts/index.ts` (modify)
- `packages/shared/src/contracts/viewingRateAlert.test.ts` (new)

**Implementation:**

- Add viewingRateAlertSchema with fields:
  - id: string
  - familyId: string
  - viewerUid: string
  - viewCount: number
  - thresholdExceeded: boolean
  - timeframeStart: Date
  - timeframeEnd: Date
  - alertSentAt: Date | null
  - notifiedGuardianUids: string[]
- Add VIEWING_RATE_CONFIG constant with threshold: 50, windowMinutes: 60
- Add 'viewing_rate_exceeded' to AdminAuditAction

**Tests:** ~8 tests for schema validation

### Task 4: Integrate Rate Tracking with Screenshot Viewer (AC: #1, #2, #3)

Hook rate tracking into the screenshot viewing UI.

**Files:**

- `apps/web/src/hooks/useScreenshotViewingRate.ts` (new)
- `apps/web/src/hooks/useScreenshotViewingRate.test.ts` (new)

**Implementation:**

- Create useScreenshotViewingRate hook
- Track each screenshot view with timestamp
- Check threshold after each view
- If threshold exceeded and not already alerted in current session:
  - Call sendViewingRateAlert Cloud Function
  - Mark alert as sent for session (prevent spam)
- Memoize rate checking to avoid excessive calculations

**Tests:** ~10 tests for hook behavior

### Task 5: Add Admin Audit Logging for Rate Alerts (AC: #4)

Log rate alerts to admin audit trail.

**Files:**

- `apps/functions/src/utils/adminAudit.ts` (modify)
- `apps/functions/src/callable/sendViewingRateAlert.ts` (modify)

**Implementation:**

- Add 'viewing_rate_exceeded' to AdminAuditAction enum
- Add 'viewing_rate_alert' to AdminAuditResourceType enum
- Log alert to admin audit with metadata:
  - viewerUid
  - familyId
  - viewCount
  - thresholdValue (50)
  - windowMinutes (60)
  - timeframeStart
  - timeframeEnd
- Flag as potential weaponization signal for admin review

**Tests:** Covered by Task 2 tests

### Task 6: Create Alert Notification Component (AC: #2, #5)

Toast/banner for co-parent to see the alert.

**Files:**

- `apps/web/src/components/parent/ViewingRateAlertBanner.tsx` (new)
- `apps/web/src/components/parent/ViewingRateAlertBanner.test.tsx` (new)

**Implementation:**

- Dismissible banner shown to co-parent
- Message: "A family member has viewed {count} screenshots in the last hour"
- Informational tone, no accusatory language
- Link to "Learn more about monitoring patterns" (placeholder)
- 44px minimum touch targets (NFR49)
- Auto-dismiss after 30 seconds or on user action

**Tests:** ~8 tests for component

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via Zod schemas
- **Schema Source:** @fledgely/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)
- **Rate Tracking:** Client-side with session storage + server-side validation

### Architecture Compliance

From project_context.md:

- "All types from Zod Only" - use viewingRateAlertSchema from contracts
- "Firebase SDK Direct" - use `doc()`, `setDoc()` directly
- "Functions Delegate to Services" - callable function delegates to notification service

### Rate Tracking Strategy

```
Client-Side (sessionStorage):
- Store array of { timestamp, screenshotId } for current session
- On each screenshot view, add entry
- Filter to last 60 minutes
- If count > 50 and not already alerted this session:
  - Call sendViewingRateAlert
  - Set alertSentThisSession = true

Server-Side (Cloud Function):
- Validate caller is guardian
- Get family guardians
- Filter to other guardians (not caller)
- Send notification to each
- Log to admin audit
```

### Notification Message Content

The alert should be neutral and informational:

```
Subject: Monitoring Activity Alert

A family member has viewed many screenshots recently.

In the last hour: {viewCount} screenshots viewed

This is an informational alert. No action is required.

If you have concerns about monitoring patterns, you can
review the family audit log or contact support.
```

### Key Constraints

1. **50 screenshots/hour** - This threshold is hardcoded, not configurable
2. **Child never notified** - Prevents triangulation in custody disputes
3. **Non-blocking** - Viewer can continue without interruption
4. **No screenshot details** - Alert doesn't reveal which screenshots were viewed
5. **Session-scoped** - Only one alert per session to prevent spam

### File Structure

```
packages/shared/src/contracts/
├── index.ts                              # UPDATE: add viewingRateAlertSchema
└── viewingRateAlert.test.ts              # NEW

apps/web/src/
├── services/
│   ├── screenshotViewingRateService.ts   # NEW
│   └── screenshotViewingRateService.test.ts # NEW
├── hooks/
│   ├── useScreenshotViewingRate.ts       # NEW
│   └── useScreenshotViewingRate.test.ts  # NEW
└── components/
    └── parent/
        ├── ViewingRateAlertBanner.tsx    # NEW
        └── ViewingRateAlertBanner.test.tsx # NEW

apps/functions/src/
├── callable/
│   ├── sendViewingRateAlert.ts           # NEW
│   └── sendViewingRateAlert.test.ts      # NEW
└── utils/
    └── adminAudit.ts                     # UPDATE
```

### Testing Requirements

- Unit test rate tracking with various view counts
- Unit test threshold detection at boundary (49, 50, 51)
- Unit test rolling window (views older than 60 min ignored)
- Unit test alert only sent once per session
- Unit test notification goes to other guardians only
- Unit test child is never notified
- Unit test admin audit logging
- Component test for dismissible banner

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR49: 44x44px minimum touch target
- NFR14: Family data isolation

### References

- [Source: docs/epics/epic-list.md#Story-3A.5]
- [Source: docs/epics/epic-list.md#Epic-3A]
- [Source: apps/functions/src/services/notifications/accessNotificationService.ts]
- [Source: packages/shared/src/contracts/index.ts#auditResourceTypeSchema]

## Dev Agent Record

### Context Reference

- Epic: 3A (Shared Custody Safeguards)
- Story Key: 3a-5-screenshot-viewing-rate-alert
- Dependencies: Story 27.1 (Audit Event Capture), Story 27.6 (Real-Time Access Notifications)

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

1. Created screenshotViewingRateService with functions:
   - trackScreenshotView() - records view timestamp to sessionStorage
   - getViewingRate() - returns count in 60-minute window
   - checkThresholdExceeded() - checks if >50 views in window
   - sendViewingRateAlert() - calls Cloud Function
   - hasAlertBeenSentThisSession() / markAlertSentThisSession() - session tracking

2. Created sendViewingRateAlert Cloud Function:
   - Validates caller is guardian of family
   - Prevents spoofing (caller must be viewer)
   - Sends notifications to OTHER guardians only (never child, never viewer)
   - Logs to admin audit for potential weaponization detection

3. Created useScreenshotViewingRate hook:
   - recordView() - tracks view and checks threshold
   - Automatically sends alert when threshold exceeded
   - Non-blocking error handling (AC3)

4. Created ViewingRateAlertBanner component:
   - Neutral "family member" language (no identity reveal)
   - Shows count and timeframe, NOT which screenshots (AC2)
   - Dismissible with auto-dismiss option
   - 44px touch targets (NFR49)

5. Updated adminAudit.ts:
   - Added 'viewing_rate_exceeded' action type
   - Added 'viewing_rate_alert' resource type

6. All 67 tests pass:
   - 21 service tests
   - 14 hook tests
   - 19 component tests
   - 13 Cloud Function tests

### File List

- apps/web/src/services/screenshotViewingRateService.ts (new)
- apps/web/src/services/screenshotViewingRateService.test.ts (new - 21 tests)
- apps/web/src/hooks/useScreenshotViewingRate.ts (new)
- apps/web/src/hooks/useScreenshotViewingRate.test.ts (new - 14 tests)
- apps/web/src/components/parent/ViewingRateAlertBanner.tsx (new)
- apps/web/src/components/parent/ViewingRateAlertBanner.test.tsx (new - 19 tests)
- apps/web/src/components/parent/index.ts (modified - added export)
- apps/functions/src/callable/sendViewingRateAlert.ts (new)
- apps/functions/src/callable/sendViewingRateAlert.test.ts (new - 13 tests)
- apps/functions/src/utils/adminAudit.ts (modified - added action/resource types)
- apps/functions/src/index.ts (modified - added export)

## Change Log

| Date       | Change                             |
| ---------- | ---------------------------------- |
| 2026-01-02 | Story created (ready-for-dev)      |
| 2026-01-02 | Implementation complete (67 tests) |
