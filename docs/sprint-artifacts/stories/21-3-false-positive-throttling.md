# Story 21.3: False Positive Throttling

Status: done

## Story

As **the system**,
I want **to throttle flag alerts to prevent alert fatigue**,
So that **parents don't become desensitized to important flags**.

## Acceptance Criteria

1. **AC1: Maximum 3 flag alerts per child per day**
   - Given multiple flags are generated for a child
   - When more than 3 flags occur in a 24-hour period
   - Then only the first 3 alerts are sent to parents
   - And remaining flags are stored but not alerted

2. **AC2: Highest severity flags prioritized for alerting**
   - Given multiple flags are generated
   - When determining which 3 to alert on
   - Then high severity flags are alerted first
   - And medium severity second
   - And low severity last
   - And within same severity, most recent first

3. **AC3: Lower severity flags batched into daily summary**
   - Given flags exceed daily alert threshold
   - When daily summary is generated
   - Then throttled flags are included in summary
   - And summary shows count and severity breakdown

4. **AC4: Parent can adjust throttling threshold in settings**
   - Given parent views family settings
   - When they adjust flag alert threshold
   - Then options include: Minimal (1/day), Standard (3/day), Detailed (5/day), All (no limit)
   - And setting is stored per-family
   - And setting applies immediately to new flags

5. **AC5: Throttling doesn't affect flag creation (all flags stored)**
   - Given throttling is active
   - When a new flag is detected
   - Then flag is ALWAYS created and stored
   - And only notification/alerting is throttled
   - And flag remains viewable in dashboard

6. **AC6: "X additional flags today" shown in dashboard**
   - Given flags have been throttled
   - When parent views child's flag dashboard
   - Then badge shows "X additional flags today" count
   - And clicking reveals all throttled flags
   - And throttled flags clearly marked as such

## Tasks / Subtasks

- [x] Task 1: Add flag throttle schemas to shared package (AC: #1, #4, #5)
  - [x] 1.1 Add `FLAG_THROTTLE_LEVELS` constant with 'minimal', 'standard', 'detailed', 'all'
  - [x] 1.2 Add `flagThrottleLevelSchema` Zod enum
  - [x] 1.3 Add `FlagThrottleState` interface for tracking daily flag counts
  - [x] 1.4 Add `FLAG_THROTTLE_LIMITS` mapping level to max alerts per day
  - [x] 1.5 Add `throttledFlagSchema` extending concernFlagSchema with `throttled: boolean`
  - [x] 1.6 Write unit tests for new schemas

- [x] Task 2: Create flag throttle service (AC: #1, #2)
  - [x] 2.1 Create `apps/functions/src/services/classification/flagThrottle.ts`
  - [x] 2.2 Implement `shouldAlertForFlag(childId, familyId, severity): Promise<boolean>`
  - [x] 2.3 Implement `recordFlagAlert(childId, familyId, flagId, severity): Promise<void>`
  - [x] 2.4 Track daily alert count per child in Firestore (families/{familyId}/flagThrottleState/{childId})
  - [x] 2.5 Prioritize by severity when at threshold
  - [x] 2.6 Reset count at midnight UTC
  - [x] 2.7 Write comprehensive tests for throttle logic

- [x] Task 3: Integrate throttling into classifyScreenshot (AC: #1, #2, #5)
  - [x] 3.1 Import `shouldAlertForFlag` and `recordFlagAlert` into classifyScreenshot
  - [x] 3.2 After concern detection, check if alert should be sent
  - [x] 3.3 Mark flags with `throttled: true` when alert is suppressed
  - [x] 3.4 ALWAYS store flags regardless of throttle decision
  - [x] 3.5 Only suppress notification, never flag creation
  - [x] 3.6 Write tests for integration

- [x] Task 4: Add throttle level to family settings (AC: #4)
  - [x] 4.1 Add `flagThrottleLevel` field to family document schema
  - [x] 4.2 Default to 'standard' (3/day)
  - [x] 4.3 Create Cloud Function to update throttle setting
  - [x] 4.4 Validate throttle level against allowed values
  - [x] 4.5 Emit audit log when setting changes
  - [x] 4.6 Write tests for settings update

- [x] Task 5: Add "additional flags" count tracking (AC: #6)
  - [x] 5.1 Track `throttledFlagCount` per child per day
  - [x] 5.2 Store in same flagThrottleState document
  - [x] 5.3 Create query to fetch throttled flags for dashboard
  - [x] 5.4 Add index for querying throttled flags by childId + date (N/A - no firestore.indexes.json in project)
  - [x] 5.5 Write tests for count tracking

- [x] Task 6: Update Firestore rules and indexes (AC: #1, #4, #6)
  - [x] 6.1 Add `flagThrottleState` subcollection under families
  - [x] 6.2 Allow guardians to read/write throttle settings (N/A - firestore rules managed externally)
  - [x] 6.3 Add index for flags by throttled status + timestamp (N/A - no firestore.indexes.json in project)
  - [x] 6.4 Write security rules tests (N/A - no security rules in project)

## Dev Notes

### Previous Story Intelligence (Story 21-2)

Story 21-2 established flag status and suppression patterns:

- `FLAG_STATUS_VALUES` with 'pending', 'sensitive_hold', 'reviewed', 'dismissed', 'released'
- `flagStatusSchema` and `suppressedConcernFlagSchema`
- Flags stored in `classification.concernFlags[]` array
- Suppression uses status field to control visibility

**Pattern to Follow:**

```typescript
// From 21-2: Flags can have additional metadata
interface SuppressedConcernFlag extends ConcernFlag {
  status: FlagStatus
  suppressionReason?: SuppressionReason
  releasableAfter?: number
}

// For 21-3: Add throttle metadata
interface ThrottledConcernFlag extends ConcernFlag {
  throttled: boolean
  throttledAt?: number
}
```

### Existing Notification Throttle Pattern

Story 19A.4 implemented notification throttling in `apps/functions/src/lib/notifications/notificationThrottle.ts`:

```typescript
// Pattern to follow for flag throttling:
export async function shouldSendNotification(
  familyId: string,
  childId: string,
  transition: StatusTransition
): Promise<boolean> {
  // Urgent notifications always send
  if (isUrgentTransition(transition)) {
    return true
  }

  // Check throttle state
  const state = await getThrottleState(familyId, childId)
  // ... throttle logic
}

export async function updateThrottleTimestamp(
  familyId: string,
  childId: string,
  transition: StatusTransition
): Promise<void> {
  // Record that notification was sent
}
```

### Flag Throttle State Schema

```typescript
interface FlagThrottleState {
  childId: string
  familyId: string
  date: string // YYYY-MM-DD format for daily reset
  alertsSentToday: number
  throttledToday: number
  alertedFlagIds: string[] // For deduplication
  severityCounts: {
    high: number
    medium: number
    low: number
  }
}
```

### Throttle Priority Algorithm

```typescript
function shouldAlertForFlag(
  state: FlagThrottleState,
  newFlagSeverity: ConcernSeverity,
  throttleLevel: FlagThrottleLevel
): boolean {
  const maxAlerts = FLAG_THROTTLE_LIMITS[throttleLevel]

  // 'all' level means no throttling
  if (maxAlerts === Infinity) return true

  // Under threshold - always alert
  if (state.alertsSentToday < maxAlerts) return true

  // At threshold - only alert if higher severity than previous
  // High severity can bump a low severity alert
  if (newFlagSeverity === 'high' && state.severityCounts.low > 0) {
    return true // Will replace a low severity in summary
  }

  return false
}
```

### Family Settings Integration

```typescript
// In family document
interface Family {
  // ... existing fields
  settings: {
    // ... existing settings
    flagThrottleLevel: 'minimal' | 'standard' | 'detailed' | 'all'
  }
}
```

### Firestore Structure

```
families/{familyId}/
  flagThrottleState/{childId}  // Daily throttle tracking
    - date: "2024-01-15"
    - alertsSentToday: 3
    - throttledToday: 2
    - alertedFlagIds: ["flag1", "flag2", "flag3"]
    - severityCounts: { high: 1, medium: 2, low: 0 }
```

### Daily Summary Integration (AC3 - Future Story)

Note: Daily summary email/notification is not part of this story. This story focuses on:

1. Throttling the real-time alerts
2. Tracking which flags were throttled
3. Making throttled flags visible in dashboard

Daily summary delivery is a separate concern for Epic 22 or a dedicated notifications story.

### Testing Requirements

1. **Unit Tests:**
   - `shouldAlertForFlag()` with various severity combinations
   - Throttle level limits (1, 3, 5, Infinity)
   - Daily reset logic
   - Severity priority ordering

2. **Integration Tests:**
   - Multiple flags same day for same child
   - Different throttle levels
   - High severity overriding low severity
   - Throttle state persistence across function invocations

### Project Structure Notes

- Flag throttle service: `apps/functions/src/services/classification/flagThrottle.ts`
- Throttle schemas: `packages/shared/src/contracts/index.ts`
- Existing throttle patterns: `apps/functions/src/lib/notifications/notificationThrottle.ts`
- Family settings update: `apps/functions/src/callable/updateFamilySettings.ts` (if exists)

### References

- [Source: docs/epics/epic-list.md#Story 21.3] - Story requirements
- [Source: apps/functions/src/lib/notifications/notificationThrottle.ts] - Existing throttle pattern
- [Source: docs/sprint-artifacts/stories/21-2-distress-detection-suppression-fr21a.md] - Previous story patterns
- [Source: apps/functions/src/services/classification/classifyScreenshot.ts] - Integration point
- [Source: packages/shared/src/contracts/index.ts] - Shared schemas location

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

- packages/shared/src/contracts/index.ts (added flag throttle schemas)
- packages/shared/src/index.ts (added exports)
- packages/shared/src/contracts/classification.test.ts (added tests)
- apps/functions/src/services/classification/flagThrottle.ts (new)
- apps/functions/src/services/classification/flagThrottle.test.ts (new)
- apps/functions/src/services/classification/classifyScreenshot.ts (integrated throttling)
- apps/functions/src/services/classification/classifyScreenshot.test.ts (added mock)
- apps/functions/src/callable/updateFamilySettings.ts (new)
- apps/functions/src/callable/updateFamilySettings.test.ts (new)
