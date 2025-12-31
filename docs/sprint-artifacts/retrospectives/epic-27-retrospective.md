# Epic 27 Retrospective: Bidirectional Transparency - Audit Log

**Date:** 2025-12-31
**Epic:** 27 - Bidirectional Transparency - Audit Log
**Team:** Bob (SM), Developer, QA

## Epic Summary

Epic 27 delivered a comprehensive bidirectional transparency system for family data access auditing. The epic implements FR32, FR53, and NFR58 requirements, providing both parents and children visibility into who accessed what data and when. Key features include real-time audit capture with dead-letter queue reliability, parent and child audit log views, asymmetric viewing pattern detection to prevent monitoring weaponization, audit export with forensic watermarking, and real-time access notifications.

## Stories Completed

| Story | Title                                | Status | Key Deliverables                                      |
| ----- | ------------------------------------ | ------ | ----------------------------------------------------- |
| 27.1  | Audit Event Capture                  | Done   | Comprehensive audit service, retry logic, DLQ         |
| 27.2  | Parent Audit Log View                | Done   | Chronological display, filters, pagination            |
| 27.3  | Child Audit Log View                 | Done   | Child-friendly language, "Mom/Dad" actor names        |
| 27.4  | Asymmetric Viewing Pattern Detection | Done   | Weekly analysis, 10x threshold, non-accusatory alerts |
| 27.5  | Audit Log Search and Export          | Done   | CSV/text export, forensic watermarking                |
| 27.6  | Real-Time Access Notifications       | Done   | Preferences, quiet hours, daily digest                |

## What Went Well

### 1. Robust Audit Infrastructure

- Created comprehensive `AuditEvent` schema with 20+ resource types
- Implemented dead-letter queue pattern for reliable writes (exponential backoff: 1s, 2s, 4s)
- Scheduled retry processor ensures no audit events are lost
- Input validation with Zod prevents bad data from entering the system

### 2. Code Reuse and Layered Architecture

- Story 27.2-27.6 all built on the 27.1 foundation
- Shared contracts in `@fledgely/shared` ensured type safety across apps
- Services layer cleanly separated from HTTP endpoints
- Pattern analysis service reused audit query infrastructure

### 3. Child-Friendly Design (NFR42 Compliance)

- Child audit view uses relationship-based names ("Mom viewed your screenshot")
- Non-surveillance language throughout ("Who's Seen My Data" vs "Access Logs")
- Friendly empty states ("No one viewed your data this week")

### 4. Privacy-Preserving Features

- IP addresses hashed before storage (first 16 chars of SHA-256)
- Quiet hours respect user preferences for notification timing
- Watermarking enables forensic traceability without exposing other users' data

### 5. Non-Accusatory Monitoring Alerts

- Asymmetric pattern detection (FR27B) uses neutral messaging
- "Your co-parent has been checking in more frequently" - informational, not judgmental
- 2-week setup period exclusion prevents false positives for new families

## What Could Be Improved

### 1. Dashboard Navigation Link

- Story 27.2 Task 7 (dashboard navigation) was not completed
- **Action:** Add "Access History" link to dashboard sidebar in future iteration

### 2. Sprint Status Synchronization

- Sprint status file showed 27-3 through 27-6 as not done despite completion
- **Action:** Ensure sprint-status.yaml updates immediately after story completion

### 3. FCM Push Notifications

- Story 27.6 has TODO for actual FCM push notification sending
- Currently logs that notification would be sent
- **Action:** Implement FCM integration when notification infrastructure is prioritized

### 4. PDF Export

- Story 27.5 supports CSV and text export but not PDF
- **Action:** Add PDF generation if formatted reports are requested by users

## Patterns to Carry Forward

### Dead-Letter Queue Pattern

```typescript
const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [1000, 2000, 4000]

for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
  try {
    await db.collection('auditEvents').doc(eventId).set(event)
    return eventId
  } catch (error) {
    if (attempt < MAX_RETRIES - 1) {
      await sleep(RETRY_DELAYS_MS[attempt])
    } else {
      await writeToDeadLetter(event, errorMessage, MAX_RETRIES)
    }
  }
}
```

### Lazy Firestore Initialization

```typescript
let db: Firestore | null = null
function getDb(): Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

// Enables testing with mocks
export function _resetDbForTesting(): void {
  db = null
}
```

### Non-Blocking Audit Logging

```typescript
// For UI flows where audit logging shouldn't block user experience
processAuditEventForNotifications(event).catch((error) => {
  logger.warn('Failed to process notifications', { eventId, error })
})
```

### Notification Preferences with Defaults

```typescript
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  accessNotificationsEnabled: false, // Off by default (AC3)
  accessDigestEnabled: false,
  quietHoursStart: null,
  quietHoursEnd: null,
  notifyOnChildDataAccess: false,
  notifyOnOwnDataAccess: false,
}
```

## Metrics

| Metric                   | Value      |
| ------------------------ | ---------- |
| Stories Completed        | 6/6 (100%) |
| New Services Created     | 5          |
| HTTP Endpoints Added     | 6          |
| Scheduled Functions      | 3          |
| Shared Types Added       | 8          |
| Code Review Issues Fixed | 12+        |

## Architecture Highlights

### New Service Layer

```
apps/functions/src/
├── services/
│   ├── audit/
│   │   ├── auditEventService.ts      # Core capture with retry
│   │   ├── auditQueryService.ts      # Query helpers
│   │   ├── auditExportService.ts     # CSV/text generation
│   │   └── childAuditQueryService.ts # Child-specific queries
│   ├── patterns/
│   │   ├── patternAnalysisService.ts # Asymmetry detection
│   │   └── patternAlertService.ts    # Alert generation
│   └── notifications/
│       └── accessNotificationService.ts # Real-time notifications
├── scheduled/
│   ├── processAuditFailures.ts       # DLQ retry
│   ├── analyzeViewingPatterns.ts     # Weekly analysis
│   └── sendAccessDigests.ts          # Daily digest
```

### UI Components

```
apps/web/src/
├── app/dashboard/
│   └── audit/page.tsx                # Parent audit view
├── components/
│   ├── audit/
│   │   ├── AuditEventList.tsx
│   │   ├── AuditEventRow.tsx
│   │   ├── AuditLogFilters.tsx
│   │   └── AuditExportButton.tsx
│   ├── child/
│   │   ├── ChildAuditSection.tsx     # Child dashboard section
│   │   └── ChildAuditEventRow.tsx
│   └── dashboard/
│       └── AsymmetryAlertBanner.tsx
```

## NFR Compliance

| NFR   | Requirement                          | Implementation                        |
| ----- | ------------------------------------ | ------------------------------------- |
| NFR42 | Child-readable language              | Friendly messages, relationship names |
| NFR58 | 2-year append-only retention         | Firestore rules deny update/delete    |
| NFR82 | Screenshot view logging with IP      | IP hashed, full context captured      |
| FR27B | Asymmetric viewing pattern detection | Weekly analysis with 10x threshold    |
| FR32  | All screenshot access in audit trail | Comprehensive audit event capture     |
| FR53  | Parent access to audit log           | Full chronological view with filters  |

## Action Items for Next Epic

1. **Add dashboard navigation** - Complete Task 7.1/7.2 from Story 27.2
2. **Implement FCM push** - Replace TODO in accessNotificationService with real FCM
3. **Add PDF export** - Extend export service with formatted PDF generation
4. **Sync sprint status** - Update status file immediately after each story

## Team Notes

Epic 27 establishes bidirectional transparency as a core principle of Fledgely. Both parents and children can now see exactly who viewed their data, when, and from what device. The asymmetric viewing pattern detection provides an important safety mechanism to identify potential monitoring abuse while maintaining non-accusatory, informational messaging.

The dead-letter queue pattern ensures audit reliability - no access event is silently lost. The notification system respects user preferences with quiet hours and digest options, defaulting to off as specified.

The child-facing components use friendly, non-surveillance language that builds trust. Children see "Mom viewed your screenshot from Saturday" rather than technical audit entries.

---

_Retrospective completed: 2025-12-31_
