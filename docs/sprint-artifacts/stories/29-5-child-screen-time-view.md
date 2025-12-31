# Story 29.5: Child Screen Time View

Status: Done

## Story

As **a child**,
I want **to see my own screen time**,
So that **I can self-regulate my usage**.

## Acceptance Criteria

1. **AC1: Today's total time shown**
   - Given child has screen time data
   - When child views their dashboard
   - Then today's total time shown (same data parent sees)

2. **AC2: Friendly visualization**
   - Given screen time data exists
   - When viewing screen time
   - Then friendly visualization displayed (bar chart, category breakdown)

3. **AC3: Child-appropriate language**
   - Given screen time displayed
   - When viewing the interface
   - Then language is appropriate: "You've used 2 hours today"

4. **AC4: Comparison to limits**
   - Given time limits may be set
   - When viewing screen time
   - Then comparison to limits shown: "1 hour left for gaming"

5. **AC5: Historical view**
   - Given historical data exists
   - When viewing screen time
   - Then historical view available: "This week vs last week"

6. **AC6: Encourages self-awareness**
   - Given screen time displayed
   - When viewing the interface
   - Then design encourages self-awareness without shame

## Tasks / Subtasks

- [x] Task 1: Create ChildScreenTimeCard component (AC: #1, #3, #6)
  - [x] 1.1 Create child-friendly card with sky blue theme
  - [x] 1.2 Use "You've used X today" language
  - [x] 1.3 Add positive framing and encouragement
  - [x] 1.4 Add loading and empty states

- [x] Task 2: Create ChildScreenTimeCategoryView component (AC: #2, #4)
  - [x] 2.1 Display category breakdown with child-friendly labels
  - [x] 2.2 Show remaining time per category if limits set
  - [x] 2.3 Use visual progress indicators

- [x] Task 3: Create ChildScreenTimeWeeklyView component (AC: #5)
  - [x] 3.1 Display weekly chart with this week data
  - [x] 3.2 Show comparison message to last week
  - [x] 3.3 Use child-friendly week summary

- [x] Task 4: Integrate into child dashboard (AC: #1-6)
  - [x] 4.1 Add ChildScreenTimeCard to child dashboard page
  - [x] 4.2 Place below welcome card, above screenshot gallery
  - [x] 4.3 Use useChildScreenTime hook for data

- [x] Task 5: Create tests (AC: #1-6)
  - [x] 5.1 Unit tests for ChildScreenTimeCard
  - [x] 5.2 Unit tests for category view
  - [x] 5.3 Unit tests for weekly view
  - [x] 5.4 Verify child-friendly language in tests

## Dev Notes

### Architecture Pattern

Follow existing child dashboard component patterns:

- Components in `apps/web/src/components/child/`
- Use sky blue theme (matching ChildActivitySummary)
- Use existing `useChildScreenTime` hook from Story 29-4
- Follow ChildActivitySummary pattern for styling and language

### Component Structure

```
ChildScreenTimeCard (main container)
├── Today's total with encouragement message
├── ChildScreenTimeCategoryView
│   └── Category rows with remaining time
├── ChildScreenTimeWeeklyView
│   └── Weekly chart with week comparison
└── Help link
```

### Child-Friendly Language Guidelines

- Use "You" statements: "You've used 2 hours today"
- Positive framing: "Great job keeping balance!" not "You're over your limit"
- Remaining time positive: "1 hour left for gaming"
- Historical neutral: "About the same as last week"
- 6th grade reading level

### Color Theme

Use sky blue colors (consistent with child dashboard):

- Primary: #0ea5e9 (sky-500)
- Background: #f0f9ff (sky-50)
- Text dark: #0c4a6e (sky-900)
- Text light: #0369a1 (sky-700)
- Border: #e0f2fe (sky-100)

### References

- [Source: docs/epics/epic-list.md#story-295] - Story requirements
- [Source: apps/web/src/hooks/useChildScreenTime.ts] - Screen time hook
- [Source: apps/web/src/components/child/ChildActivitySummary.tsx] - Styling pattern
- [Source: apps/web/src/app/child/dashboard/page.tsx] - Integration point

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- All 6 acceptance criteria implemented
- Created ChildScreenTimeCard component with sky blue theme
- Child-friendly language at 6th grade reading level ("You've used X today")
- Category breakdown with remaining time if limits set
- Weekly chart with stacked categories and week comparison
- Encouragement messages without shaming
- WCAG 2.1 AA compliant colors (4.5:1+ contrast ratios)
- Accessible weekly chart with table semantics and ARIA labels
- Week comparison uses concrete time durations (not percentages) for better child understanding
- 35 unit tests (all pass)
- Build passes, lint passes (only pre-existing warnings)
- Integrated into child dashboard below health check-ins

### File List

**New Files:**

- `apps/web/src/components/child/ChildScreenTimeCard.tsx` - Child screen time card with today's total, categories, weekly chart
- `apps/web/src/components/child/ChildScreenTimeCard.test.tsx` - 35 unit tests

**Modified Files:**

- `apps/web/src/app/child/dashboard/page.tsx` - Added ChildScreenTimeCard import and integration
- `docs/sprint-artifacts/stories/29-5-child-screen-time-view.md` - Story file
