# Story 18.6: View Rate Limiting

Status: done

## Story

As **the system**,
I want **to detect abnormal screenshot viewing patterns**,
So that **potential abuse is flagged (FR3A-X: Angry Divorce defense)**.

## Acceptance Criteria

1. **AC1: Rate Threshold Detection**
   - Given user is viewing screenshots
   - When viewing rate exceeds threshold (50/hour)
   - Then rate limit exceeded event is triggered
   - And rate is calculated per viewer per child

2. **AC2: Alert Generation for Other Guardians**
   - Given rate threshold is exceeded
   - When alert is triggered
   - Then all OTHER guardians in family are notified
   - And alert message: "High screenshot activity detected"
   - And alert includes: viewer name, count, time period

3. **AC3: Non-Blocking Transparency**
   - Given rate threshold is exceeded
   - When user continues viewing
   - Then viewing is NOT blocked
   - And transparency is prioritized over restriction

4. **AC4: Configurable Threshold Per Family**
   - Given family exists
   - When rate limit is evaluated
   - Then family-specific threshold is used if configured
   - And default threshold is 50 views per hour if not configured

5. **AC5: Rate Window Sliding Calculation**
   - Given user has view history
   - When rate is calculated
   - Then sliding 1-hour window is used
   - And stale view records are cleaned up (older than 1 hour)

6. **AC6: Alert Deduplication**
   - Given rate threshold was already exceeded in current window
   - When threshold continues to be exceeded
   - Then duplicate alerts are NOT sent
   - And new alert only sent after window resets

## Tasks / Subtasks

- [x] Task 1: Create Rate Limit Service (AC: #1, #5)
  - [x] 1.1 Create `apps/functions/src/lib/rate-limit/screenshot-view-rate.ts`
  - [x] 1.2 Implement sliding window rate calculation using screenshotViews subcollection
  - [x] 1.3 Query views within last hour: `where('viewerId', '==', uid).where('timestamp', '>', nowMinusHour)`
  - [x] 1.4 Return view count and whether threshold exceeded

- [x] Task 2: Create Rate Limit Check Function (AC: #1, #4)
  - [x] 2.1 Create `apps/functions/src/lib/rate-limit/index.ts` barrel export
  - [x] 2.2 Accept viewerId, childId, familyId parameters
  - [x] 2.3 Fetch family document to get custom threshold (if any)
  - [x] 2.4 Default threshold: 50 views per 3600000ms (1 hour)
  - [x] 2.5 Return `{ exceeded: boolean, count: number, threshold: number, resetTime: number }`

- [x] Task 3: Create Alert Service (AC: #2, #6)
  - [x] 3.1 Create `apps/functions/src/lib/alerts/screenshot-rate-alert.ts`
  - [x] 3.2 Create Firestore collection: `families/{familyId}/alerts/{alertId}`
  - [x] 3.3 Alert schema: `{ type: 'screenshot_rate', viewerId, viewerName, childId, count, threshold, createdAt, dismissed: boolean }`
  - [x] 3.4 Query for existing undismissed alert of same type/viewer/child within window
  - [x] 3.5 If exists, skip creation (deduplication)
  - [x] 3.6 If new, create alert document

- [x] Task 4: Get Other Guardians (AC: #2)
  - [x] 4.1 From family document, get all memberIds
  - [x] 4.2 Filter out the current viewerId
  - [x] 4.3 Return list of other guardian UIDs for notification

- [x] Task 5: Integrate Rate Limit into View Endpoint (AC: #1, #2, #3)
  - [x] 5.1 Modify `apps/functions/src/http/screenshots/view.ts`
  - [x] 5.2 After successful view audit log, call rate limit check
  - [x] 5.3 If threshold exceeded AND not already alerted:
    - [x] 5.3.1 Create alert for other guardians
    - [x] 5.3.2 Log rate limit event (no PII)
  - [x] 5.4 Continue serving image regardless (non-blocking per AC3)

- [x] Task 6: Add Family Threshold Configuration (AC: #4)
  - [x] 6.1 Add `screenshotViewRateLimit` field to family document schema
  - [x] 6.2 Type: `{ threshold: number, windowMs: number }` (optional)
  - [x] 6.3 If not set, use defaults: `{ threshold: 50, windowMs: 3600000 }`

- [x] Task 7: Add Firestore Index (AC: #1, #5)
  - [x] 7.1 Update `firestore.indexes.json`
  - [x] 7.2 Add composite index: `children/{childId}/screenshotViews` on (viewerId, timestamp) - already exists
  - [x] 7.3 Add index for alerts query: `families/{familyId}/alerts` on (type, viewerId, childId, dismissed)

- [x] Task 8: Unit Tests (AC: #1-6)
  - [x] 8.1 Test rate calculation returns correct count
  - [x] 8.2 Test threshold detection (under/at/over)
  - [x] 8.3 Test custom family threshold override
  - [x] 8.4 Test alert creation with correct fields
  - [x] 8.5 Test alert deduplication (no duplicate alerts)
  - [x] 8.6 Test other guardians filtering
  - [x] 8.7 Test view endpoint continues serving after rate limit
  - [x] 8.8 Minimum 25 tests for rate limiting functionality (29 tests added)

## Dev Notes

### Implementation Strategy

This story adds rate limiting detection to the screenshot view endpoint created in Story 18.5. Key design decisions:

1. **Non-Blocking Detection**: Rate limiting is purely observational - viewing is never blocked. The goal is transparency and abuse detection, not restriction.

2. **Sliding Window**: Use sliding 1-hour window rather than fixed time buckets for more accurate rate calculation.

3. **Per-Viewer-Per-Child**: Rate limits are scoped to each viewer-child pair, not global per viewer. A parent viewing one child heavily doesn't affect their ability to view another child.

4. **Alert-Based Notification**: Use Firestore alerts collection rather than push notifications for MVP. UI can poll/subscribe to alerts collection.

### Technical Approach: Sliding Window

```typescript
// Rate calculation approach
async function getViewRateForWindow(
  childId: string,
  viewerId: string,
  windowMs: number = 3600000 // 1 hour
): Promise<{ count: number; oldestTimestamp: number | null }> {
  const db = getFirestore()
  const cutoff = Date.now() - windowMs

  const viewsSnapshot = await db
    .collection('children')
    .doc(childId)
    .collection('screenshotViews')
    .where('viewerId', '==', viewerId)
    .where('timestamp', '>', cutoff)
    .get()

  return {
    count: viewsSnapshot.size,
    oldestTimestamp:
      viewsSnapshot.docs.length > 0
        ? Math.min(...viewsSnapshot.docs.map((d) => d.data().timestamp))
        : null,
  }
}
```

### Alert Document Schema

```typescript
interface ScreenshotRateAlert {
  alertId: string
  type: 'screenshot_rate'
  familyId: string
  childId: string
  viewerId: string
  viewerEmail: string | null // For display, from auth
  count: number // Views in window
  threshold: number // Threshold that was exceeded
  windowMs: number // Window size (default 3600000)
  createdAt: number // Timestamp
  dismissed: boolean // Whether any guardian dismissed it
  dismissedBy?: string // Who dismissed it
  dismissedAt?: number // When dismissed
}
```

### Integration with Existing View Endpoint

The rate limit check integrates AFTER the successful view audit log:

```typescript
// In view.ts, after audit log creation:

// Check rate limit (non-blocking)
const rateResult = await checkViewRateLimit(viewerId, childId, familyId)
if (rateResult.exceeded) {
  // Check if alert already exists for this window
  const existingAlert = await getActiveRateLimitAlert(familyId, viewerId, childId)
  if (!existingAlert) {
    // Create alert for other guardians
    await createRateLimitAlert({
      familyId,
      childId,
      viewerId,
      viewerEmail,
      count: rateResult.count,
      threshold: rateResult.threshold,
    })

    logger.info('Rate limit exceeded, alert created', {
      viewerId,
      childId,
      count: rateResult.count,
      threshold: rateResult.threshold,
    })
  }
}

// Continue serving image regardless of rate limit
res.status(200).send(watermarkedBuffer)
```

### Key Requirements

- **FR3A-X:** Angry Divorce defense - detect potential abuse patterns
- **NFR25:** Privacy - don't expose viewer details beyond family
- Maintain non-blocking UX while providing transparency

### Project Structure Notes

**Files to Create:**

- `apps/functions/src/lib/rate-limit/screenshot-view-rate.ts` - Rate calculation
- `apps/functions/src/lib/rate-limit/index.ts` - Barrel export
- `apps/functions/src/lib/alerts/screenshot-rate-alert.ts` - Alert service
- `apps/functions/src/lib/alerts/index.ts` - Barrel export
- `apps/functions/src/lib/rate-limit/screenshot-view-rate.test.ts` - Rate tests
- `apps/functions/src/lib/alerts/screenshot-rate-alert.test.ts` - Alert tests

**Files to Modify:**

- `apps/functions/src/http/screenshots/view.ts` - Integrate rate limit check
- `apps/functions/src/http/screenshots/view.test.ts` - Add rate limit tests
- `firestore.indexes.json` - Add composite indexes

### References

- [Source: docs/epics/epic-list.md#Story-18.6]
- [Pattern: apps/functions/src/http/screenshots/view.ts - View endpoint from 18.5]
- [Architecture: docs/architecture/implementation-patterns-consistency-rules.md]
- [Previous: Story 18.5 - Forensic Watermarking (screenshotViews collection)]

### Previous Story Intelligence

From Story 18.5:

- Screenshot views logged at `children/{childId}/screenshotViews/{viewId}`
- View record includes: viewerId, viewerEmail, timestamp, screenshotId, childId
- Firestore index already exists for viewerId+timestamp queries
- Family membership check pattern established in view.ts
- Sharp and watermark libraries already added

**Key Learnings from 18.5:**

- Extract shared PRNG to utility (done for watermark)
- Add comprehensive audit fields (IP, email, userAgent)
- Keep tests focused - mock external dependencies
- Code review catches documentation inconsistencies

### Git Intelligence

Recent commits show pattern:

- HTTP functions in `apps/functions/src/http/`
- Lib utilities in `apps/functions/src/lib/`
- Tests co-located with source files
- Firestore indexes in `firestore.indexes.json`

### Security Considerations

1. **Alert Visibility**: Alerts visible only to family members (security rules)
2. **No Viewer Blocking**: Rate limiting never blocks viewing - transparency over restriction
3. **PII in Alerts**: viewerEmail stored for display but sanitized in logs
4. **Alert Cleanup**: Dismissed alerts should be retained for audit, not deleted

### Technical Constraints & Decisions

1. **Query Performance**: Composite index on (viewerId, timestamp) required for efficient window queries

2. **Alert Deduplication**: Query before insert rather than database constraints - simpler for Firestore

3. **Threshold Storage**: Store in family document rather than separate collection - simpler schema

4. **Window Calculation**: Client timestamp (Date.now()) rather than server timestamp - acceptable for rate limiting use case

5. **No Push Notifications**: MVP uses polling/subscription to alerts collection. Push notifications deferred.

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None

### Completion Notes List

1. **Sliding Window Rate Calculation**: Implemented using Firestore queries with timestamp comparison against Date.now() - windowMs cutoff.

2. **Per-Viewer-Per-Child Scoping**: Rate limits calculated independently for each viewer/child pair. A parent viewing child A heavily doesn't affect their rate for child B.

3. **Non-Blocking Integration**: Rate limit check runs AFTER the audit log is written so the current view is counted, but never blocks image serving per AC3.

4. **Alert Deduplication**: Queries for existing undismissed alert of same type/viewer/child within window before creating new alert.

5. **Family Configurable Threshold**: Families can override default 50/hour threshold via `screenshotViewRateLimit` field on family document.

6. **Alert Schema Extended**: Includes windowMs field for proper reset time calculation and email for display purposes.

7. **getOtherGuardians Utility**: Filters viewer from family memberIds for targeted notification.

8. **Composite Alert Index**: Added index for efficient alert deduplication queries on (type, viewerId, childId, dismissed, createdAt).

### File List

**Files Created:**

- `apps/functions/src/lib/rate-limit/screenshot-view-rate.ts` - Rate calculation service
- `apps/functions/src/lib/rate-limit/index.ts` - Barrel export
- `apps/functions/src/lib/rate-limit/screenshot-view-rate.test.ts` - 16 unit tests
- `apps/functions/src/lib/alerts/screenshot-rate-alert.ts` - Alert service
- `apps/functions/src/lib/alerts/index.ts` - Barrel export
- `apps/functions/src/lib/alerts/screenshot-rate-alert.test.ts` - 13 unit tests

**Files Modified:**

- `apps/functions/src/http/screenshots/view.ts` - Integrated rate limit check
- `firestore.indexes.json` - Added alerts composite index
