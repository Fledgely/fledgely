# Story 33.6: Work Mode Verification

Status: done

Epic: 33 - Focus Mode & Work Mode
Priority: Medium

## Story

As **the system**,
I want **to verify work mode is used appropriately**,
So that **it's not abused to bypass monitoring**.

## Acceptance Criteria

1. **AC1: Work Hours Tracking**
   - Given work mode sessions have occurred
   - When viewing work mode analytics
   - Then weekly work hours displayed: "Jake worked 6 hours this week"
   - And daily breakdown available
   - And comparison to previous week shown
   - And total sessions tracked per week

2. **AC2: Anomaly Detection - Excessive Hours**
   - Given typical work hours are established (based on schedule or 3-week history)
   - When work mode exceeds typical hours by 50%+ in a week
   - Then anomaly flag created with category 'work-mode-anomaly'
   - And flag includes: excess hours, typical baseline, deviation percentage
   - And severity set to 'low' (trust-based approach)
   - And flag allows parent review without automatic blocking

3. **AC3: Outside Scheduled Hours Notification**
   - Given work mode has configured schedules
   - When work mode is manually activated outside scheduled hours
   - Then parent notification created: "Jake started work mode outside scheduled hours"
   - And notification is informational only (no blocking)
   - And child is NOT notified about parent notification
   - And notification logged in audit trail

4. **AC4: Parent Check-In Request**
   - Given work mode session is active or recently ended
   - When parent wants to check in about work
   - Then parent can send friendly check-in: "How was work today?"
   - And pre-written templates available (non-interrogative tone)
   - And child receives check-in notification
   - And child can optionally respond (not required)
   - And check-in logged in audit trail

5. **AC5: Trust-Based Approach**
   - Given work mode verification is active
   - When any anomaly or notification occurs
   - Then NO automatic blocking of work mode
   - And NO punitive actions taken
   - And framing is supportive: "Just checking in" not "Caught you"
   - And child's independence respected (teen employment is positive)

6. **AC6: Bilateral Transparency**
   - Given work mode analytics exist
   - When child views their dashboard
   - Then child sees exact same analytics as parent
   - And child knows what triggers parent notifications
   - And no hidden surveillance (child knows rules)

## Technical Notes

### Architecture Patterns

- Follows focus mode analytics pattern from Story 33.5
- Uses existing flag system for anomaly detection (Epic 21-22)
- Uses existing audit trail pattern (Epic 27)
- Leverages work mode state from Story 33.3
- Client-side anomaly computation (no Cloud Functions needed)

### Data Model

```typescript
// Work mode weekly analytics (computed from sessions)
interface WorkModeWeeklyAnalytics {
  childId: string
  familyId: string
  // Weekly summary
  weeklySessionCount: number
  weeklyTotalHours: number // Total work hours this week
  weeklyAverageSessionHours: number
  // Comparison to previous week
  hoursChange: number // positive = more, negative = less
  sessionCountChange: number
  // Comparison to baseline (3-week average)
  typicalWeeklyHours: number
  deviationFromTypical: number // percentage
  isAnomalous: boolean // true if deviation > 50%
  // Session breakdown
  scheduledSessions: number
  manualSessions: number
  outsideScheduledHours: number // count of manual sessions outside schedule
  // Metadata
  weekStartDate: string // YYYY-MM-DD
  weekEndDate: string // YYYY-MM-DD
  computedAt: number
}

// Work mode daily summary
interface WorkModeDailySummary {
  childId: string
  familyId: string
  date: string // YYYY-MM-DD
  sessionCount: number
  totalHours: number
  scheduledHours: number
  manualHours: number
  sessions: WorkModeSessionSummary[]
  updatedAt: number
}

// Session summary for analytics
interface WorkModeSessionSummary {
  sessionId: string
  startedAt: number
  endedAt: number | null
  durationMinutes: number
  activationType: 'scheduled' | 'manual'
  scheduleId: string | null
  scheduleName: string | null
  wasOutsideSchedule: boolean
}

// Parent check-in request
interface WorkModeCheckIn {
  id: string
  familyId: string
  childId: string
  parentId: string
  parentName: string
  message: string
  sentAt: number
  readAt: number | null
  response: string | null
  respondedAt: number | null
}
```

### Key Files to Create/Modify

- `packages/shared/src/contracts/workModeAnalytics.ts` - Analytics schemas
- `apps/web/src/hooks/useWorkModeAnalytics.ts` - Analytics computation hook
- `apps/web/src/hooks/useWorkModeAnalytics.test.ts` - Hook tests
- `apps/web/src/components/parent/WorkModeAnalyticsCard.tsx` - Parent dashboard card
- `apps/web/src/components/parent/WorkModeAnalyticsCard.test.tsx` - Card tests
- `apps/web/src/components/parent/WorkModeCheckIn.tsx` - Check-in feature
- `apps/web/src/components/parent/WorkModeCheckIn.test.tsx` - Check-in tests
- `apps/web/src/components/child/ChildWorkModeCard.tsx` - Child dashboard card (bilateral)
- `apps/web/src/components/child/ChildWorkModeCard.test.tsx` - Child card tests
- `apps/web/src/services/workModeService.ts` - Work mode operations service
- `packages/shared/src/contracts/index.ts` - Export new schemas

### Existing Patterns to Follow

- Focus mode analytics: `apps/web/src/hooks/useFocusModeAnalytics.ts`
- Work mode hook: `apps/web/src/hooks/useWorkMode.ts`
- Flag service: `apps/web/src/services/flagService.ts`
- Audit trail: Epic 27 patterns
- Screen time analytics: `apps/web/src/hooks/useChildScreenTime.ts`

### Firestore Structure

```
families/{familyId}/
  workMode/{childId}/                    # Existing - current state
    isActive, currentSession, etc.

  workModeHistory/{childId}/             # New - session history
    sessions/
      {sessionId}/
        startedAt, endedAt, duration, activationType, etc.

  workModeDailySummary/{childId}/        # New - daily aggregates
    days/
      {date YYYY-MM-DD}/
        sessionCount, totalHours, sessions[], etc.

  workModeCheckIns/{childId}/            # New - parent check-ins
    {checkInId}/
      message, sentAt, response, etc.

children/{childId}/
  flags/
    {flagId}/                            # Anomaly flags
      category: 'work-mode-anomaly'
      severity: 'low'
      etc.
```

### UI/UX Requirements

- Trust-based, supportive framing throughout
- No punitive or accusatory language
- Check-in templates with friendly tone:
  - "How was work today?"
  - "Hope your shift went well!"
  - "Anything interesting at work?"
- Child sees when notifications are sent (transparency)
- Anomaly alerts are informational, not blocking
- Respects teen's growing independence

### Security Considerations

- Parent check-ins visible to child (bilateral transparency)
- Child knows what triggers notifications
- No hidden surveillance or metrics
- Audit trail captures all interactions
- Data scoped to family via Firestore security rules

## Dependencies

- Story 33-3: Work Mode for Employed Teens (base infrastructure)
- Story 33-5: Focus Mode Analytics (analytics pattern reference)
- Epic 21-22: Flag system (anomaly detection)
- Epic 27: Audit trail (transparency)

## Tasks / Subtasks

- [x] Task 1: Create work mode analytics schemas (AC: #1, #2, #6)
  - [x] 1.1 Add WorkModeWeeklyAnalytics schema to @fledgely/shared
  - [x] 1.2 Add WorkModeDailySummary schema
  - [x] 1.3 Add WorkModeSessionSummary schema
  - [x] 1.4 Add WorkModeCheckIn schema
  - [x] 1.5 Add analytics messages (trust-based framing)
  - [x] 1.6 Add unit tests for schemas

- [x] Task 2: Create work mode analytics hook (AC: #1, #2, #6)
  - [x] 2.1 Create `useWorkModeAnalytics` hook
  - [x] 2.2 Implement weekly hours calculation
  - [x] 2.3 Implement anomaly detection (50%+ deviation)
  - [x] 2.4 Implement outside-schedule tracking
  - [x] 2.5 Add real-time Firestore sync
  - [x] 2.6 Add unit tests for hook

- [x] Task 3: Create session history tracking (AC: #1, #2, #3)
  - [x] 3.1 Update useWorkMode to save session to history on end
  - [x] 3.2 Create daily summary aggregation logic
  - [x] 3.3 Track outside-schedule manual activations
  - [x] 3.4 Add tests for history tracking

- [x] Task 4: Implement anomaly detection and notifications (AC: #2, #3, #5)
  - [x] 4.1 Create anomaly flag creation service
  - [x] 4.2 Create outside-schedule notification service
  - [x] 4.3 Use existing flag schema with 'work-mode-anomaly' category
  - [x] 4.4 Set severity to 'low' (trust-based)
  - [x] 4.5 Add tests for anomaly detection

- [x] Task 5: Create parent check-in feature (AC: #4, #5)
  - [x] 5.1 Create WorkModeCheckIn component
  - [x] 5.2 Add friendly check-in templates
  - [x] 5.3 Create check-in service functions
  - [x] 5.4 Add child notification for check-ins
  - [x] 5.5 Add tests for check-in feature

- [x] Task 6: Create parent analytics card (AC: #1, #2, #3, #4, #5)
  - [x] 6.1 Create WorkModeAnalyticsCard component
  - [x] 6.2 Add weekly hours display
  - [x] 6.3 Add anomaly indicator (non-punitive)
  - [x] 6.4 Add check-in action button
  - [x] 6.5 Add component tests

- [x] Task 7: Create child analytics card (AC: #5, #6)
  - [x] 7.1 Create ChildWorkModeCard component
  - [x] 7.2 Reuse same analytics hook as parent
  - [x] 7.3 Show notification transparency
  - [x] 7.4 Ensure identical data display to parent
  - [x] 7.5 Add component tests

- [ ] Task 8: Integrate with dashboards (AC: #6) - Deferred to dashboard story
  - [ ] 8.1 Add analytics card to parent dashboard
  - [ ] 8.2 Add analytics card to child dashboard
  - [ ] 8.3 Verify bilateral transparency
        Note: Components are ready, dashboard integration deferred to dashboard-specific story

## Dev Notes

### Project Structure Notes

- Analytics hook follows useFocusModeAnalytics pattern exactly
- Anomaly detection uses existing flag system (Epic 21-22)
- Check-in feature uses separate collection for clean separation
- Schemas added to shared package contracts

### Trust-Based Framing Examples

```typescript
// Good examples (USE THESE)
'Jake worked 6 hours this week - nice job!'
'Work hours are higher than usual this week. Just checking in!'
'How was work today?'
'Hope your shift went well!'

// Bad examples (DO NOT USE)
'Jake exceeded allowed work hours'
'Work mode abuse detected'
'Jake is using work mode suspiciously'
'Why were you working so much?'
```

### Anomaly Detection Logic

```typescript
// Baseline: 3-week rolling average of weekly hours
// Threshold: 50% above baseline triggers anomaly
// Severity: Always 'low' (informational only)
// Action: Creates flag for parent review, NO blocking

function isAnomalous(currentHours: number, typicalHours: number): boolean {
  if (typicalHours === 0) return false // No baseline yet
  const deviation = (currentHours - typicalHours) / typicalHours
  return deviation > 0.5 // 50% above typical
}
```

### Testing Standards

- Unit tests for all Zod schemas
- Hook tests with mocked Firestore data
- Component tests with React Testing Library
- Test anomaly detection thresholds
- Test outside-schedule detection
- Test check-in flow end-to-end

### References

- [Source: docs/epics/epic-list.md#story-336-work-mode-verification]
- [Source: apps/web/src/hooks/useFocusModeAnalytics.ts] - Analytics hook pattern
- [Source: apps/web/src/hooks/useWorkMode.ts] - Work mode hook
- [Source: apps/web/src/services/flagService.ts] - Flag service pattern
- [Source: packages/shared/src/contracts/index.ts] - WorkModeSession schema

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- All schemas added to @fledgely/shared with trust-based messaging
- 54 schema tests passing, 19 hook tests passing
- Session history tracking integrated into useWorkMode hook
- Parent check-in feature with friendly templates
- Analytics cards for both parent and child (bilateral transparency)
- Dashboard integration deferred to dashboard-specific story

### File List

- packages/shared/src/contracts/index.ts (modified - work mode analytics schemas)
- packages/shared/src/contracts/workModeAnalytics.test.ts (new - schema tests)
- packages/shared/src/index.ts (modified - exports)
- apps/web/src/hooks/useWorkModeAnalytics.ts (new - analytics hook)
- apps/web/src/hooks/useWorkModeAnalytics.test.ts (new - hook tests)
- apps/web/src/hooks/useWorkMode.ts (modified - session history tracking)
- apps/web/src/hooks/useWorkMode.test.ts (modified - mock service)
- apps/web/src/services/workModeService.ts (new - service functions)
- apps/web/src/services/workModeService.test.ts (new - service tests)
- apps/web/src/components/parent/WorkModeCheckIn.tsx (new - check-in component)
- apps/web/src/components/parent/WorkModeCheckIn.test.tsx (new - check-in tests)
- apps/web/src/components/parent/WorkModeAnalyticsCard.tsx (new - parent analytics card)
- apps/web/src/components/parent/WorkModeAnalyticsCard.test.tsx (new - card tests)
- apps/web/src/components/child/ChildWorkModeCard.tsx (new - child analytics card)
- apps/web/src/components/child/ChildWorkModeCard.test.tsx (new - child card tests)
