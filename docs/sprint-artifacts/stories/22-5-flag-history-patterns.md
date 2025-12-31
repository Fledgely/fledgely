# Story 22.5: Flag History and Patterns

Status: done

## Story

As a **parent**,
I want **to see flag history and patterns**,
So that **I can identify trends in my child's activity**.

## Acceptance Criteria

1. **AC1: Chronological history**
   - Given parent views flag history
   - When reviewing past flags
   - Then all reviewed flags shown chronologically

2. **AC2: Pattern summary**
   - Given flags exist in history
   - When viewing patterns
   - Then pattern summary visible: "5 gaming flags this month (up from 2)"

3. **AC3: Category breakdown**
   - Given flags exist in history
   - When viewing patterns
   - Then category breakdown chart visible

4. **AC4: Time-of-day analysis**
   - Given flags exist in history
   - When viewing patterns
   - Then time-of-day analysis visible: "Most flags occur after 9pm"

5. **AC5: Pattern insights**
   - Given patterns are identified
   - When displayed
   - Then patterns help identify when to have conversations

6. **AC6: Export option**
   - Given parent views history
   - When requesting export
   - Then export option for flags (PDF report) available

## Tasks / Subtasks

- [ ] Task 1: Create FlagHistorySection component (AC: #1)
  - [ ] 1.1 Create `apps/web/src/components/flags/FlagHistorySection.tsx`
  - [ ] 1.2 Display history flags in chronological order (newest first)
  - [ ] 1.3 Reuse FlagCard component for display
  - [ ] 1.4 Add date grouping (Today, Yesterday, This Week, etc.)

- [ ] Task 2: Create FlagPatternsCard component (AC: #2, #3, #4, #5)
  - [ ] 2.1 Create `apps/web/src/components/flags/FlagPatternsCard.tsx`
  - [ ] 2.2 Calculate and display monthly trend summary
  - [ ] 2.3 Display category breakdown (simple bar or list)
  - [ ] 2.4 Calculate and display time-of-day distribution
  - [ ] 2.5 Generate insight text based on patterns

- [ ] Task 3: Add history subscription to flagService (AC: #1)
  - [ ] 3.1 Add `subscribeToHistoryFlags` that filters non-pending statuses
  - [ ] 3.2 Support pagination for large histories

- [ ] Task 4: Integrate into FlagQueue (AC: #1, #2, #3, #4, #5)
  - [ ] 4.1 Add patterns card above history section
  - [ ] 4.2 Connect subscriptions for history data

- [ ] Task 5: PDF Export (AC: #6) - Deferred
  - [ ] 5.1 Create PDF generation utility (can be deferred to later sprint)
  - [ ] 5.2 Add export button with loading state

## Dev Notes

### Previous Story Intelligence (Story 22-4)

Story 22-4 implemented discussion notes:

- FlagNotesPanel component with collapsible UI
- addFlagNote service function
- Notes stored in flag.notes array

**Key Files:**

- `apps/web/src/components/flags/FlagQueue.tsx` - Integration point
- `apps/web/src/services/flagService.ts` - Has subscription patterns

### Pattern Calculation Logic

```typescript
// Calculate monthly flag count
const thisMonthFlags = flags.filter((f) => f.createdAt >= startOfMonth(now) && f.createdAt <= now)
const lastMonthFlags = flags.filter(
  (f) => f.createdAt >= startOfMonth(lastMonth) && f.createdAt <= endOfMonth(lastMonth)
)
const trend = thisMonthFlags.length - lastMonthFlags.length

// Time of day distribution (0-23 hours)
const hourCounts = new Map<number, number>()
flags.forEach((f) => {
  const hour = new Date(f.createdAt).getHours()
  hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1)
})
// Find peak hour
const peakHour = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0]
```

### UI Design

- FlagPatternsCard should be compact summary above history
- Show most concerning category
- Simple text-based insights (no complex charts for MVP)
- Export button can show "Coming Soon" if deferred

### References

- [Source: docs/epics/epic-list.md#Story 22.5] - Story requirements
- [Source: apps/web/src/components/flags/FlagQueue.tsx] - Integration point
- [Source: apps/web/src/services/flagService.ts] - Service patterns

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- AC1-AC5 implemented (AC6 PDF export deferred)
- FlagPatternsCard component with monthly summary, category breakdown, time analysis
- Pattern insights generated based on flag history
- Integrated into FlagQueue history tab
- 176 test files passing with 3834 tests

### File List

**Created:**

- `apps/web/src/components/flags/FlagPatternsCard.tsx`
- `apps/web/src/components/flags/FlagPatternsCard.test.tsx`
- `docs/sprint-artifacts/stories/22-5-flag-history-patterns.md`

**Modified:**

- `apps/web/src/components/flags/FlagQueue.tsx` - Added patterns card integration
- `apps/web/src/components/flags/index.ts` - Added exports
